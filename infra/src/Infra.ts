import * as cdk from "@aws-cdk/core"
import * as route53 from "@aws-cdk/aws-route53"
import * as route53targets from "@aws-cdk/aws-route53-targets"
import * as ec2 from "@aws-cdk/aws-ec2"
import * as ecs from "@aws-cdk/aws-ecs"
import * as ecr from "@aws-cdk/aws-ecr"
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2"
import * as iam from "@aws-cdk/aws-iam"
import * as s3 from "@aws-cdk/aws-s3"
import * as logs from "@aws-cdk/aws-logs"
import * as cloudfront from "@aws-cdk/aws-cloudfront"
import * as certificatemanager from "@aws-cdk/aws-certificatemanager"
import * as rds from "@aws-cdk/aws-rds"
import * as secretsmanager from "@aws-cdk/aws-secretsmanager"

type Environment = "dev" | "prod"

type EnvironmentConfig<T> = {
  readonly [K in Environment]: T
}

const ENV = validateEnvironment(requireEnv("ENV"))
const TAG = requireEnv("TAG")

const CLOUDFRONT_CERTIFICATE_REGION = "us-east-1"

const domainName: EnvironmentConfig<string> = {
  prod: "demodex.rce.fi",
  dev: "dev-demodex.rce.fi"
}

const vpcCidr: EnvironmentConfig<string> = {
  prod: "10.0.0.0/16",
  dev: "10.1.0.0/16"
}

async function main() {
  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }

  const app = new cdk.App()
  const {hostedZone} = new HostedZoneStack(app, "HostedZone", { env })
  const {vpc} = new VpcStack(app, "VPC", { env })
  const {repository, bucket, originAccessIdentity} = new AppBaseInfraStack(app, "AppBaseInfra", { env })
  new AppInfraStack(app, "AppInfra", { vpc, env, hostedZone, repository, bucket, originAccessIdentity })
  app.synth()
}

class HostedZoneStack extends cdk.Stack {
  readonly hostedZone: route53.HostedZone

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    this.hostedZone = new route53.PublicHostedZone(this, "HostedZone", {
      zoneName: domainName[ENV]
    })
  }
}

class VpcStack extends cdk.Stack {
  readonly vpc: ec2.Vpc

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    this.vpc = new ec2.Vpc(this, "VPC", {
      cidr: vpcCidr[ENV]
    })
  }
}

class AppBaseInfraStack extends cdk.Stack {
  readonly repository: ecr.Repository
  readonly bucket: s3.Bucket
  readonly originAccessIdentity: cloudfront.OriginAccessIdentity

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    this.repository = new ecr.Repository(this, "Repoisotry", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      repositoryName: "server",
    })

    this.repository.addLifecycleRule({ maxImageCount: 5 })

    this.bucket = new s3.Bucket(this, "Bucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      bucketName: "demodex-assets-" + ENV,
    })

    this.originAccessIdentity = new cloudfront.OriginAccessIdentity(this, "OriginAccessIdentity")

    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [this.originAccessIdentity.grantPrincipal],
      actions: ["s3:GetObject"],
      resources: [this.bucket.arnForObjects("*")],
    }))
  }
}

interface AppInfraProps extends cdk.StackProps {
  vpc: ec2.Vpc
  hostedZone: route53.HostedZone
  repository: ecr.Repository
  bucket: s3.Bucket
  originAccessIdentity: cloudfront.OriginAccessIdentity
}

class AppInfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: AppInfraProps) {
    super(scope, id, props)

    const {hostedZone, bucket, originAccessIdentity} = props

    const database = this.database(props)
    const backendDnsRecord = this.backendService(props, database)

    const certificate = new certificatemanager.DnsValidatedCertificate(this, "Certificate", {
      hostedZone,
      domainName: domainName[ENV],
      region: CLOUDFRONT_CERTIFICATE_REGION,
    })

    const distribution = new cloudfront.CloudFrontWebDistribution(this, "Distribution", {
      aliasConfiguration: {
        names: [domainName[ENV]],
        acmCertRef: certificate.certificateArn,
      },
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity,
          },
          behaviors: [
            {
              pathPattern: "/",
              minTtl: cdk.Duration.minutes(0),
              defaultTtl: cdk.Duration.minutes(0),
              maxTtl: cdk.Duration.minutes(0),
            },
            {
              isDefaultBehavior: true,
              allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
              cachedMethods: cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
              minTtl: cdk.Duration.hours(1),
              defaultTtl: cdk.Duration.hours(1),
              maxTtl: cdk.Duration.hours(24),
            }
          ],
        },
        {
          customOriginSource: {
            domainName: backendDnsRecord.domainName,
            originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          },
          behaviors: [{
            pathPattern: "/api/*",
            allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
            cachedMethods: cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
            forwardedValues: {
              queryString: true,
              headers: [],
            },
            minTtl: cdk.Duration.minutes(0),
            defaultTtl: cdk.Duration.minutes(0),
            maxTtl: cdk.Duration.minutes(0),
          }],
        }
      ]
    })

    new route53.ARecord(this, "CloudFrontDnsRecord", {
      zone: hostedZone,
      recordName: domainName[ENV],
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(distribution)
      ),
    })
  }

  database({ hostedZone, vpc }: AppInfraProps) {
    const password = new secretsmanager.Secret(this, "DatabasePassword", {
      secretName: "DatabasePassword",
      generateSecretString: {
        excludeCharacters: `/@" `,
      }
    })

    const instance = new rds.DatabaseInstance(this, "DatabaseInstance", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      vpc,
      iamAuthentication: true,
      vpcPlacement: { subnetType: ec2.SubnetType.PUBLIC },
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      masterUsername: "demodex",
      masterUserPassword: password.secretValue,
    })

    instance.connections.allowDefaultPortFrom(
      ec2.Peer.ipv4("84.250.251.115/32"),
      "Allow developer access"
    )

    new route53.CnameRecord(this, "DatabaseDnsRecord", {
      zone: hostedZone,
      recordName: `db.${domainName}`,
      domainName: instance.dbInstanceEndpointAddress,
    })

    return { instance, password }
  }

  backendService(
    { hostedZone, vpc, repository }: AppInfraProps,
    db: { instance: rds.DatabaseInstance, password: secretsmanager.Secret }
  ) {
    const cluster = new ecs.Cluster(this, "Cluster", { vpc })

    const logGroup = new logs.LogGroup(this, "BackendLogGroup", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      logGroupName: "backend",
      retention: logs.RetentionDays.INFINITE,
    })

    const taskDefinition = new ecs.FargateTaskDefinition(this, "BackendTaskDefinition", {
      cpu: 256,
      memoryLimitMiB: 512,
    })

    const container = taskDefinition.addContainer("BackendContainer", {
      image: ecs.ContainerImage.fromEcrRepository(repository, TAG),
      essential: true,
      logging: ecs.LogDriver.awsLogs({ logGroup, streamPrefix: "backend" }),
      environment: {
        DATABASE_HOSTNAME: db.instance.instanceEndpoint.hostname,
        // Does not work for whatever reason
        //DATABASE_PORT: db.instance.instanceEndpoint.port.toString(),
        DATABASE_PORT: "5432",
        DATABASE_USERNAME: "demodex",
        DATABASE_NAME: "postgres", // Use "demodex" when the database is created
      },
      secrets: {
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(db.password),
      }
    })
    container.addPortMappings({
      containerPort: 8080,
      hostPort: 8080,
    })

    const service = new ecs.FargateService(this, "BackendService", {
      cluster,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      platformVersion: ecs.FargatePlatformVersion.VERSION1_3,
      taskDefinition,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      desiredCount: 1,
      // https://aws.amazon.com/premiumsupport/knowledge-center/ecs-pull-container-error/
      // If you're launching a task in a public subnet, choose ENABLED for
      // Auto-assign public IP when you launch the task. This allows your
      // task to have outbound network access to pull an image.
      assignPublicIp: true,
    })

    db.instance.connections.allowDefaultPortFrom(service, "Allow application access")

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "LoadBalancer", {
      vpc,
      internetFacing: true,
    })

    const loadBalancerDomain = `backend.${domainName[ENV]}`

    const listenerCertificate = new certificatemanager.DnsValidatedCertificate(this, "ListenerCertificate", {
      hostedZone,
      domainName: loadBalancerDomain,
    })

    const listener = loadBalancer.addListener("Listener", { port: 443 })
    listener.addCertificates("ListenerCertificates", [
      elbv2.ListenerCertificate.fromCertificateManager(listenerCertificate)
    ])
    listener.addTargets("Backend", {
      port: 8080,
      targets: [service],
      healthCheck: {
        interval: cdk.Duration.seconds(30),
        protocol: elbv2.Protocol.HTTP,
        path: "/api/foo",
        healthyHttpCodes: "200",
        port: "8080",
        timeout: cdk.Duration.seconds(10),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
      }
    })

    return new route53.CnameRecord(this, "LoadBalancerDnsRecord", {
      zone: hostedZone,
      recordName: loadBalancerDomain,
      domainName: loadBalancer.loadBalancerDnsName,
    })
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw Error(`FATAL !process.env["${name}"]`)
  }
  return value
}

function validateEnvironment(env: string): Environment {
  switch (env) {
    case "dev":
    case "prod":
      return env
    default:
      throw Error(`Invalid environment ${env}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
