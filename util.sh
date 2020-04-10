#!/usr/bin/env bash

function use_node_version {
  local node_version="$1"
  cd "$repo/client"
  export NVM_DIR="${NVM_DIR:-$HOME/.cache/nvm}"
  source "$repo/nvm.sh"
  nvm use "$node_version" || nvm install "$node_version"
}
