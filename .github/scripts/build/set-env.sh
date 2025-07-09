#!/bin/bash

set -euo pipefail

source ".github/scripts/utils/cmn-util.sh"
trap '_on_exit' EXIT

# =======================================================================

is_release_branch_merge=false
release_branch=""
release_tag=""
release_version=""

# =======================================================================

set_release_var() {
    if [[ $GITHUB_EVENT_NAME == 'push' && $GITHUB_REF_NAME == "main" ]]; then
        local merged_branch
        merged_branch=$(
            gh api \
                -H "Accept: application/vnd.github+json" \
                -H "X-GitHub-Api-Version: 2022-11-28" \
                "/repos/$GITHUB_REPOSITORY/commits/$GITHUB_SHA/pulls" \
                -q '.[0].head.ref'
        )

        echo "Merged branch: $merged_branch"

        if [[ $merged_branch == "release/v"* ]]; then
            is_release_branch_merge=true
            release_branch="$merged_branch"
            release_tag=$(sed 's/release\///' <<<"$merged_branch")
            release_version=$(sed 's/release\/v//' <<<"$merged_branch")
        fi
    fi
}

set_env() {
    set_env_var "IS_RELEASE_BRANCH_MERGE" "$is_release_branch_merge"
    set_env_var "RELEASE_BRANCH" "$release_branch"
    set_env_var "RELEASE_TAG" "$release_tag"
    set_env_var "RELEASE_VERSION" "$release_version"

    echo "Environment variables set:"
    echo "  IS_RELEASE_BRANCH_MERGE=$is_release_branch_merge"
    echo "  RELEASE_BRANCH=$release_branch"
    echo "  RELEASE_TAG=$release_tag"
    echo "  RELEASE_VERSION=$release_version"
}

set_release_var
set_env
