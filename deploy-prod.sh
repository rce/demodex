#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
repo="$( cd "$( dirname "$0" )" && pwd )"
source "$repo/util.sh"

function main {
  use_node_version "12"
  use_python_version "3.8.2"
  use_pipenv_virtualenv "$repo"

  export ENV="prod"
  export TAG="$(git rev-parse HEAD)"

  setup_aws

  build_client
  build_server

  cd "$repo/infra"
  npm ci
  npx cdk --profile "$AWS_PROFILE" bootstrap
  deploy_base_infra
  deploy_client_assets
  upload_server_image
  deploy_app_infra
}

function deploy_base_infra {
  cd "$repo/infra"
  deploy_stack HostedZone
  deploy_stack VPC
  deploy_stack AppBaseInfra
}

function deploy_app_infra {
  cd "$repo/infra"
  deploy_stack AppInfra
}

function deploy_client_assets {
  cd "$repo/client/dist"
  aws s3 sync . "s3://demodex-assets-$ENV/"
}

function upload_server_image {
  cd "$repo/server"

  local ecr_uri="$(aws ecr describe-repositories --repository-names server --output text --query repositories[0].repositoryUri)"
  docker tag "demodex:$TAG" "$ecr_uri:$TAG"

  $(aws ecr get-login --no-include-email)
  docker push "$ecr_uri:$TAG"
}

function build_client {
  cd "$repo/client"
  npm ci
  npx webpack --env prod
}

function build_server {
  cd "$repo/server"
  ./sbt ";clean;assembly"
  cp "$repo/server/target/scala-2.13/demodex.jar" demodex.jar
  docker build -t "demodex:$TAG" .
}

function deploy_stack {
  npx cdk --profile "$AWS_PROFILE" deploy --exclusively --app "npx ts-node src/Infra.ts" "$@"
}


function setup_aws {
  export AWS_CONFIG_FILE="$repo/aws_config"
  export AWS_PROFILE="demodex-$ENV"
  export AWS_REGION="eu-west-1"
  export AWS_DEFAULT_REGION="$AWS_REGION"

  aws sts get-caller-identity
}

main "$@"
