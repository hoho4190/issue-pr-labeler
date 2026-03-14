#!/bin/bash

set -euo pipefail

PLATFORM=$(uname -m)
readonly PLATFORM
readonly GIT_HOOKS_PATH='.githooks'

# 1. 필수 환경 변수 검증
if [[ -z "${SUPER_LINTER_TAG:-}" ]]; then
    echo 'SUPER_LINTER_TAG is required.'
    exit 1
fi

# 2. nvm 로드
export NVM_DIR="/usr/local/share/nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    \. "$NVM_DIR/nvm.sh" || true
fi

# 3. .nvmrc 기준으로 Node 버전 설치 및 활성화
if [ -f .nvmrc ]; then
    nvm install
    nvm use
fi

# 4. Corepack 활성화 & 최신 npm 11.x 버전 설치
sudo corepack enable npm
corepack prepare npm@11 --activate

# 5. 버전 확인
echo "==================================================="
echo "npm version: $(npm --version)"
echo "node version: $(node --version)"

echo "Platform detected: $PLATFORM"
echo "super-linter tag: $SUPER_LINTER_TAG"
echo "==================================================="

# 6. 저장소 git hook 경로 설정
if git rev-parse --show-toplevel > /dev/null 2>&1; then
    git config --local core.hooksPath "$GIT_HOOKS_PATH"
    chmod +x "${GIT_HOOKS_PATH}/pre-push"
    echo "git hooks path: $(git config --local core.hooksPath)"
fi

# 7. super-linter 이미지 다운로드
docker pull \
    --platform linux/amd64 \
    "ghcr.io/super-linter/super-linter:$SUPER_LINTER_TAG"
