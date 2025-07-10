#!/bin/bash

set -euo pipefail

source ".github/scripts/utils/cmn-util.sh"
trap '_on_exit' EXIT

# =======================================================================

readonly RELEASE_VERSION=${BRANCH_NAME#release/v}

# =======================================================================

git_config() {
    echo "Configuring Git author: $GIT_AUTHOR_NAME <$GIT_AUTHOR_EMAIL>"

    git config --local user.name "$GIT_AUTHOR_NAME"
    git config --local user.email "$GIT_AUTHOR_EMAIL"
}

git_commit() {
    local message="$1"
    shift

    local targets=("$@")

    if [[ -z "$message" ]]; then
        echo "Error: Commit message is required." >&2
        exit 1
    fi

    if [[ ${#targets[@]} -eq 0 ]]; then
        echo "Staging all changes (git add -A)"
        git add -A
    else
        echo "Staging specific targets: ${targets[*]}"
        for target in "${targets[@]}"; do
            if [[ ! -e "$target" ]]; then
                echo "Error: Target '$target' does not exist." >&2
                exit 1
            fi
            git add "$target"
        done
    fi

    if git diff --staged --quiet; then
        echo "No changes to commit."
    else
        git commit -m "$message"
    fi
}

git_push() {
    echo "Pushing to origin: $BRANCH_NAME"

    git push origin "$BRANCH_NAME"
}

get_tags() {
    gh release list --exclude-drafts --json tagName | jq \
        --arg d "v$RELEASE_VERSION" \
        '. += [{ "tagName": $d }] 
        | map(.tagName) 
        | .[]' |
        sort -V -r |
        jq -s .
}

update_issue_templates() {
    echo "Update Issue Templates"

    local update_dir=".github/ISSUE_TEMPLATE"

    if [[ ! -d "$update_dir" ]]; then
        echo "Error: $update_dir is not a directory." >&2
        exit 1
    fi

    local tags
    tags=$(get_tags)

    local update_file
    for update_file in "$update_dir"/*; do
        if [[ -f "$update_file" ]]; then

            # version id가 존재하는지 확인
            if yq -e '.body[] | select(.id == "version")' "$update_file" >/dev/null 2>&1; then
                tags="$tags" yq -iP \
                    '(.body[] | select(.id == "version") | .attributes.options) = env(tags)' \
                    "$update_file"
            fi
        fi
    done

    git_commit "release: update version to ${RELEASE_VERSION} in issue templates" "$update_dir"
}

update_app_version() {
    echo "Update App version"

    local package_json_file="package.json"
    local package_lock_json_file="package-lock.json"

    jq --arg version "$RELEASE_VERSION" '.version = $version' "$package_json_file" >"${package_json_file}.tmp" &&
        mv "${package_json_file}.tmp" "$package_json_file"

    npm install

    git_commit "release: update package versions to ${RELEASE_VERSION}" "$package_json_file" "$package_lock_json_file"
}

update_dist() {
    echo "Update dist"

    npm run build

    git_commit "release: update dist files after build"
}

echo "BRANCH_NAME=$BRANCH_NAME"
echo "RELEASE_VERSION=$RELEASE_VERSION"

git_config
update_issue_templates
update_app_version
update_dist
git_push
