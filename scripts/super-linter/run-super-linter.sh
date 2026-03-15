#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly SCRIPT_DIR ROOT_DIR
readonly ENV_PATH="${ROOT_DIR}/.github/.super-linter.env"

readonly RUN_TYPE="${1:-lint-all}"

if [[ -z "${SUPER_LINTER_TAG:-}" ]]; then
    echo "SUPER_LINTER_TAG environment variable is required (e.g., slim-v8.5.0)."
    exit 1
fi

readonly IMAGE="ghcr.io/super-linter/super-linter:${SUPER_LINTER_TAG}"
readonly CONTAINER_WORKDIR='/workspace/lint'

readonly IGNORE_GITIGNORED_FILES_VALUE='true'
readonly RUN_LOCAL_VALUE='true'

readonly DOCKER_COMMON_OPTIONS=(
    --platform linux/amd64
    --env-file "$ENV_PATH"
    -e "GITHUB_WORKSPACE=${CONTAINER_WORKDIR}"
    -e "IGNORE_GITIGNORED_FILES=${IGNORE_GITIGNORED_FILES_VALUE}"
    -e "RUN_LOCAL=${RUN_LOCAL_VALUE}"
    -v "${ROOT_DIR}:${CONTAINER_WORKDIR}"
    -w "${CONTAINER_WORKDIR}"
    --rm
)

case "$RUN_TYPE" in
    shell)
        docker run \
            "${DOCKER_COMMON_OPTIONS[@]}" \
            -e 'VALIDATE_ALL_CODEBASE=true' \
            -e 'USE_FIND_ALGORITHM=true' \
            -e 'DEFAULT_BRANCH=' \
            -it \
            --entrypoint bash \
            "$IMAGE"
        ;;
    lint-all)
        docker run \
            "${DOCKER_COMMON_OPTIONS[@]}" \
            -e 'VALIDATE_ALL_CODEBASE=true' \
            -e 'USE_FIND_ALGORITHM=true' \
            -e 'DEFAULT_BRANCH=' \
            "$IMAGE"
        ;;
    lint-changed)
        docker run \
            "${DOCKER_COMMON_OPTIONS[@]}" \
            -e 'VALIDATE_ALL_CODEBASE=false' \
            -e 'USE_FIND_ALGORITHM=false' \
            -e 'DEFAULT_BRANCH=main' \
            "$IMAGE"
        ;;
    *)
        echo "Unknown run type: $RUN_TYPE"
        echo 'Supported run types: lint-all, lint-changed, shell'
        exit 1
        ;;
esac
