#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
repo="$( cd "$( dirname "$0" )" && pwd )"

function main {
  export AWS_PROFILE="demodex-prod"
  export AWS_REGION="eu-west-1"
  export AWS_DEFAULT_REGION="$AWS_REGION"

  deploy_base_infra
}

function deploy_base_infra {
  cd "$repo/infra"
  npm install
  deploy_stacks HostedZone VPC AppBaseInfra
}

function deploy_stacks {
  npx cdk --profile "$AWS_PROFILE" deploy --app "npx ts-node src/Infra.ts" "$@"
}

main "$@"
