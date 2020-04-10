#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
repo="$( cd "$( dirname "$0" )" && pwd )"

function main {
  docker ps > /dev/null 2>&1 || { echo >&2 "Running 'docker ps' failed. Is docker daemon running? Aborting."; exit 1; }

  docker run -it --rm -p 5432:5432 \
    -e POSTGRES_HOST_AUTH_METHOD=trust \
    -e POSTGRES_DB=demodex \
    -e POSTGRES_USER=demodex \
    -e POSTGRES_PASSWORD=demodex \
    postgres:12-alpine
}

main "$@"
