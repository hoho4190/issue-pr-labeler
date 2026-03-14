#!/bin/bash

set -euo pipefail

source ".github/scripts/utils/cmn-util.sh"
source ".github/scripts/utils/git-util.sh"
trap '_on_exit' EXIT

# =======================================================================

if [[ -z "${BRANCH_NAME:-}" ]]; then
    echo "Error: BRANCH_NAME environment variable is not set" >&2
    exit 1
fi

readonly RELEASE_VERSION=${BRANCH_NAME#release/v}

# =======================================================================

update_app_version() {
    echo "Update App version"

    local package_json_file="package.json"
    local package_lock_json_file="package-lock.json"

    jq --arg version "$RELEASE_VERSION" '.version = $version' "$package_json_file" > "${package_json_file}.tmp" \
        && mv "${package_json_file}.tmp" "$package_json_file"

    npm install --package-lock-only
    npx prettier --write "$package_json_file" "$package_lock_json_file"

    git_commit "release: update package versions to ${RELEASE_VERSION}" "$package_json_file" "$package_lock_json_file"
}

update_dist() {
    echo "Update dist"

    npm run build:ci

    git_commit "release: update dist files after build"
}

echo "BRANCH_NAME=$BRANCH_NAME"
echo "RELEASE_VERSION=$RELEASE_VERSION"

git_config "" ""
update_app_version
update_dist
git_push "$BRANCH_NAME"
