#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
repo="$( cd "$( dirname "$0" )" && pwd )"

function main {
  export ENV="prod"

  export AWS_PROFILE="demodex-prod"
  export AWS_REGION="eu-west-1"
  export AWS_DEFAULT_REGION="$AWS_REGION"

  build_client

  deploy_base_infra
  deploy_client_assets
}

function deploy_base_infra {
  cd "$repo/infra"
  npm install
  deploy_stacks HostedZone VPC AppBaseInfra
}

function deploy_client_assets {
  cd "$repo/client/dist"
  aws s3 sync . "s3://demodex-assets-$ENV/"
}

function build_client {
  cd "$repo/client"
  npm ci
  npx webpack --env prod
}

function deploy_stacks {
  npx cdk --profile "$AWS_PROFILE" deploy --app "npx ts-node src/Infra.ts" "$@"
}

main "$@"
