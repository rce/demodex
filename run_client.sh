#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
repo="$( cd "$( dirname "$0" )" && pwd )"

function main {
  cd "$repo/client"
  npm install
  npx webpack-dev-server --env local
}

main "$@"
