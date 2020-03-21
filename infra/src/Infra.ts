import * as cdk from "@aws-cdk/core"
import {RemovalPolicy} from "@aws-cdk/core"
import * as route53 from "@aws-cdk/aws-route53"
import * as route53targets from "@aws-cdk/aws-route53-targets"
import * as ec2 from "@aws-cdk/aws-ec2"
import * as ecr from "@aws-cdk/aws-ecr"
import * as iam from "@aws-cdk/aws-iam"
import * as s3 from "@aws-cdk/aws-s3"
import * as cloudfront from "@aws-cdk/aws-cloudfront"
import * as certificatemanager from "@aws-cdk/aws-certificatemanager"

const ENV = requireEnv("ENV")
const CLOUDFFRONT_CERtIFICATE_REGION = "us-east-1"

const domainName = "demodex.rce.fi"

async function main() {
  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }

  const app = new cdk.App()
  const {hostedZone} = new HostedZoneStack(app, "HostedZone", { env })
  const {vpc} = new VpcStack(app, "VPC", { env })
  const {repository, bucket, originAccessIdentity} = new AppBaseInfraStack(app, "AppBaseInfra", { env })
  new AppInfraStack(app, "AppInfra", { env, hostedZone, bucket, originAccessIdentity })
  app.synth()
}

class HostedZoneStack extends cdk.Stack {
  readonly hostedZone: route53.HostedZone

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    this.hostedZone = new route53.PublicHostedZone(this, "HostedZone", {
      zoneName: domainName
    })
  }
}

class VpcStack extends cdk.Stack {
  readonly vpc: ec2.IVpc

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    this.vpc = new ec2.Vpc(this, "VPC", {
      subnetConfiguration: [
        { name: "Public", subnetType: ec2.SubnetType.PUBLIC },
      ]
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
      removalPolicy: RemovalPolicy.DESTROY,
      repositoryName: "server",
    })

    this.repository.addLifecycleRule({ maxImageCount: 5 })

    this.bucket = new s3.Bucket(this, "Bucket", {
      removalPolicy: RemovalPolicy.DESTROY,
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
  hostedZone: route53.HostedZone
  bucket: s3.Bucket
  originAccessIdentity: cloudfront.OriginAccessIdentity
}

class AppInfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: AppInfraProps) {
    super(scope, id, props)

    const {hostedZone, bucket, originAccessIdentity} = props

    const certificate = new certificatemanager.DnsValidatedCertificate(this, "Certificate", {
      hostedZone,
      domainName,
      region: CLOUDFFRONT_CERtIFICATE_REGION,
    })


    const distribution = new cloudfront.CloudFrontWebDistribution(this, "Distribution", {
      aliasConfiguration: {
        names: [domainName],
        acmCertRef: certificate.certificateArn,
      },
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity,
          },
          behaviors: [{
            isDefaultBehavior: true,
            allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
            cachedMethods: cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
          }],
        }
      ]
    })

    new route53.ARecord(this, "CloudFrontDnsRecord", {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(distribution)
      ),
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

main().catch(err => {
  console.error(err)
  process.exit(1)
})