#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
repo="$( cd "$( dirname "$0" )" && pwd )"
source "$repo/util.sh"

function main {
  use_node_version "12"

  cd "$repo/client"
  npm install
  npx webpack-dev-server --env local
}

main "$@"
