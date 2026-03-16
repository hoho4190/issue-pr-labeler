#!/bin/bash

set -euo pipefail

source ".github/scripts/utils/cmn-util.sh"
source ".github/scripts/utils/git-util.sh"
trap '_on_exit' EXIT

readonly DEFAULT_BRANCH="main"
readonly DIST_DIR="dist"
readonly COMMIT_MESSAGE="chore: sync dist files after build"

validate_inputs() {
    if [[ -z "${BRANCH_NAME:-}" ]]; then
        echo "Error: BRANCH_NAME environment variable is not set" >&2
        exit 1
    fi

    if [[ "$BRANCH_NAME" == "$DEFAULT_BRANCH" ]]; then
        echo "Error: Branch '$DEFAULT_BRANCH' is not allowed" >&2
        exit 1
    fi
}

validate_checkout() {
    local current_branch
    current_branch=$(git branch --show-current)

    if [[ -z "$current_branch" ]]; then
        echo "Error: Expected a named branch checkout, but HEAD is detached" >&2
        exit 1
    fi

    if [[ "$current_branch" != "$BRANCH_NAME" ]]; then
        echo "Error: Checked out branch '$current_branch' does not match BRANCH_NAME '$BRANCH_NAME'" >&2
        exit 1
    fi
}

sync_dist() {
    if [[ ! -d "$DIST_DIR" ]]; then
        echo "Error: Dist directory not found: $DIST_DIR" >&2
        exit 1
    fi

    git_config "" ""
    git_commit "$COMMIT_MESSAGE" "$DIST_DIR"
    git_push "$BRANCH_NAME"
}

echo "BRANCH_NAME=${BRANCH_NAME:-}"

validate_inputs
validate_checkout
sync_dist
