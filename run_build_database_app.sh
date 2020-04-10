#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
repo="$( cd "$( dirname "$0" )" && pwd )"

function main {
  cd "$repo/server"

  export DATABASE_HOSTNAME="localhost"
  export DATABASE_PORT="5432"
  export DATABASE_NAME="demodex"
  export DATABASE_USERNAME="demodex"
  export DATABASE_PASSWORD="demodex"
  ./sbt "runMain com.example.foobar.app.BuildDatabaseApp"
}

main "$@"
