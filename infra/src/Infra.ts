import * as cdk from "@aws-cdk/core"
import {RemovalPolicy} from "@aws-cdk/core"
import * as route53 from "@aws-cdk/aws-route53"
import * as ec2 from "@aws-cdk/aws-ec2"
import * as ecr from "@aws-cdk/aws-ecr"
import * as s3 from "@aws-cdk/aws-s3"

async function main() {
  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }

  const app = new cdk.App()
  const {zone} = new HostedZoneStack(app, "HostedZone", { env })
  const {vpc} = new VpcStack(app, "VPC", { env })
  const {repository, bucket} = new AppBaseInfraStack(app, "AppBaseInfra", { env})
  app.synth()
}

class HostedZoneStack extends cdk.Stack {
  readonly zone: route53.IHostedZone

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    this.zone = new route53.PublicHostedZone(this, "HostedZone", {
      zoneName: "demodex.rce.fi"
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

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    this.repository = new ecr.Repository(this, "Repoisotry", {
      removalPolicy: RemovalPolicy.DESTROY,
      repositoryName: "server",
    })

    this.repository.addLifecycleRule({ maxImageCount: 5 })

    this.bucket = new s3.Bucket(this, "Bucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      bucketName: "demodex-assets-prod",
    })
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})