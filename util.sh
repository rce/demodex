#!/usr/bin/env bash

function use_node_version {
  local node_version="$1"
  export NVM_DIR="${NVM_DIR:-$HOME/.cache/nvm}"
  source "$repo/nvm.sh"
  nvm use "$node_version" || nvm install "$node_version"
}

function use_python_version {
  local python_version="$1"
  if ! which pyenv > /dev/null; then echo "pyenv is required, aborting"; exit 1; fi
  eval "$(pyenv init -)"
  pyenv install --skip-existing "$python_version"
  pyenv local "$python_version"
}

function use_pipenv_virtualenv {
  local pipenv_root="$1"
  pushd "$pipenv_root"
  python -m pip install pipenv
  python -m pipenv install --dev
  set +o nounset
  source "$(python -m pipenv --venv)/bin/activate"
  set -o nounset
  popd
}
