#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
repo="$( cd "$( dirname "$0" )" && pwd )"

function main {
  export ENV="prod"
  export TAG="$(git rev-parse HEAD)"

  export AWS_PROFILE="demodex-prod"
  export AWS_REGION="eu-west-1"
  export AWS_DEFAULT_REGION="$AWS_REGION"

  build_client
  build_server

  cd "$repo/infra"
  npm ci
  deploy_base_infra
  deploy_client_assets
  upload_server_image
  deploy_app_infra
}

function deploy_base_infra {
  cd "$repo/infra"
  deploy_stacks HostedZone VPC AppBaseInfra
}

function deploy_app_infra {
  cd "$repo/infra"
  deploy_stacks AppInfra
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

function deploy_stacks {
  npx cdk --profile "$AWS_PROFILE" deploy --app "npx ts-node src/Infra.ts" "$@"
}

main "$@"
