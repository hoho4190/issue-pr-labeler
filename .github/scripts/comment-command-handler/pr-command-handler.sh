#!/bin/bash

set -euo pipefail

source ".github/scripts/utils/cmn-util.sh"
source ".github/scripts/utils/git-util.sh"
trap '_on_exit' EXIT

update_dist() {
    echo "Update dist"

    npm ci
    npm run build:ci

    git_config "" ""
    git_commit "build: update dist/" "dist"
    git_push "$HEAD_REF"
}

case "$COMMAND" in
    "/update-dist")
        update_dist
        ;;
    *)
        echo "Unknown command: $COMMAND"
        exit 1
        ;;
esac
