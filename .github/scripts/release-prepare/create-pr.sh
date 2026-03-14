#!/bin/bash

set -euo pipefail

source ".github/scripts/utils/cmn-util.sh"
trap '_on_exit' EXIT

# =======================================================================

readonly TEMPLATE_FILE=".github/PULL_REQUEST_TEMPLATE/release-branch.md"
readonly RELEASE_TAG="${BRANCH_NAME#release/}"

# =======================================================================

# 정식 릴리스만 조회(접미사 없는 정식 태그 'vX.Y.Z'만 필터링)
get_latest_release_tag() {
    set +e
    gh release list --exclude-drafts --exclude-pre-releases --limit 20 \
        | awk '{print $1}' \
        | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
        | sort -V \
        | tail -n1
    set -e
}

# 릴리스 타입을 판별하는 함수
determine_release_type() {
    local current_tag="$1"
    local latest_tag="${2:-v0.0.0}"

    if [[ -z "$current_tag" ]]; then
        echo "ERROR: Input required: current_tag" >&2
        exit 1
    fi

    # current_tag가 latest_tag보다 낮거나 같으면 에러를 발생시키고 종료
    highest_version=$(printf '%s\n' "$current_tag" "$latest_tag" | sort -V | tail -n1)
    if [[ "$highest_version" != "$current_tag" || "$current_tag" == "$latest_tag" ]]; then
        echo "ERROR: New release($current_tag) is not greater than latest($latest_tag)" >&2
        exit 1
    fi

    # 버전을 major.minor.patch로 분리
    IFS='.' read -r current_major current_minor _ <<< "${current_tag#v}"
    IFS='.' read -r latest_major latest_minor _ <<< "${latest_tag#v}"

    # 릴리스 타입 판별
    if [[ "$current_major" -gt "$latest_major" ]]; then
        echo "major"
    elif [[ "$current_minor" -gt "$latest_minor" ]]; then
        echo "minor"
    else
        echo "patch"
    fi
}

# PR 템플릿 body 얻기
get_template_body() {
    if [[ ! -f "$TEMPLATE_FILE" ]]; then
        echo "ERROR: PR template file not found: $TEMPLATE_FILE" >&2
        exit 1
    fi

    sed "s/{{RELEASE_TAG}}/${RELEASE_TAG}/g" "$TEMPLATE_FILE"
}

# Release 타입(major, minor, patch)으로 레이블 얻기
get_release_type_label() {
    local release_type="$1"

    if [[ -z "$release_type" ]]; then
        echo "ERROR: Input required: release_type" >&2
        exit 1
    fi

    case "$RELEASE_TYPE" in
        "major")
            echo "release: 💥 major"
            ;;
        "minor")
            echo "release: ✨ minor"
            ;;
        "patch")
            echo "release: 🛠️ patch"
            ;;
        *)
            echo "ERROR: Invalid release_type: $release_type" >&2
            exit 1
            ;;
    esac
}

echo "BRANCH_NAME=$BRANCH_NAME"
echo "RELEASE_TAG=$RELEASE_TAG"

# 이전 릴리스 조회
LATEST_TAG=$(get_latest_release_tag)
echo "Latest Official Release: $LATEST_TAG"

# major, minor, patch 중 어떤 업데이트인지 판별
RELEASE_TYPE=$(determine_release_type "$RELEASE_TAG" "$LATEST_TAG")
echo "Release type: $RELEASE_TYPE ($RELEASE_TAG > $LATEST_TAG)"

# PR 템플릿 body
TEMPLATE_BODY=$(get_template_body)

# PR 템플릿 생성
gh pr create \
    --base "main" \
    --head "$BRANCH_NAME" \
    --title "release: ${RELEASE_TAG}" \
    --body "$TEMPLATE_BODY" \
    --label "type: 🚀 release" \
    --label "$(get_release_type_label "$RELEASE_TYPE")"
