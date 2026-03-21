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
readonly DOCS_LATEST_DIR="docs/latest"
readonly DOCS_NEXT_DIR="docs/next"
readonly ROOT_README_FILE="README.md"

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

replace_language_switch_block() {
    local file="$1"
    local language_switch_text="$2"

    local start_marker="<!-- LANGUAGE_SWITCH_START -->"
    local end_marker="<!-- LANGUAGE_SWITCH_END -->"
    local start_count
    local end_count
    local tmp_file

    if [[ ! -f "$file" ]]; then
        echo "Error: Language switch target file not found: $file" >&2
        exit 1
    fi

    start_count=$(grep -Fxc "$start_marker" "$file" || true)
    end_count=$(grep -Fxc "$end_marker" "$file" || true)

    if [[ "$start_count" -ne 1 || "$end_count" -ne 1 ]]; then
        echo "Error: Expected exactly one LANGUAGE_SWITCH block in $file" >&2
        exit 1
    fi

    tmp_file=$(mktemp)

    awk \
        -v start_marker="$start_marker" \
        -v end_marker="$end_marker" \
        -v language_switch_text="$language_switch_text" '
        $0 == start_marker {
            print
            print ""
            print language_switch_text
            print ""
            in_block = 1
            replaced = 1
            next
        }
        $0 == end_marker {
            if (!in_block) {
                print "Error: LANGUAGE_SWITCH_END appeared before LANGUAGE_SWITCH_START in " FILENAME > "/dev/stderr"
                exit 1
            }
            in_block = 0
            print
            next
        }
        !in_block { print }
        END {
            if (in_block) {
                print "Error: LANGUAGE_SWITCH block was not closed in " FILENAME > "/dev/stderr"
                exit 1
            }
            if (!replaced) {
                print "Error: LANGUAGE_SWITCH block was not replaced in " FILENAME > "/dev/stderr"
                exit 1
            }
        }
    ' "$file" > "$tmp_file"

    mv "$tmp_file" "$file"
}

format_promoted_markdown_files() {
    local markdown_files=("$ROOT_README_FILE")

    while IFS= read -r -d '' file; do
        markdown_files+=("$file")
    done < <(find "$DOCS_LATEST_DIR" -type f -name '*.md' -print0)

    npx prettier --write "${markdown_files[@]}"
}

promote_docs() {
    echo "Promote docs"

    if [[ ! -d "$DOCS_NEXT_DIR" ]]; then
        echo "Error: Next docs directory not found: $DOCS_NEXT_DIR" >&2
        exit 1
    fi

    rm -rf "$DOCS_LATEST_DIR"
    cp -R "$DOCS_NEXT_DIR" "$DOCS_LATEST_DIR"

    while IFS= read -r -d '' file; do
        sed -i 's#/docs/next/#/docs/latest/#g' "$file"
    done < <(find "$DOCS_LATEST_DIR" -type f -name '*.md' -print0)

    if [[ ! -f "$DOCS_LATEST_DIR/README.md" ]]; then
        echo "Error: Promoted stable README not found: $DOCS_LATEST_DIR/README.md" >&2
        exit 1
    fi

    mv "$DOCS_LATEST_DIR/README.md" "$ROOT_README_FILE"

    replace_language_switch_block "$ROOT_README_FILE" "English | [한국어](/docs/latest/README.ko.md)"
    replace_language_switch_block "$DOCS_LATEST_DIR/README.ko.md" "[English](/README.md) | 한국어"

    format_promoted_markdown_files

    git_commit "release: promote next docs to latest" "$DOCS_LATEST_DIR" "$ROOT_README_FILE"
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
promote_docs
update_dist
git_push "$BRANCH_NAME"
