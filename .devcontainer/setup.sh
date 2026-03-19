#!/bin/bash

set -euo pipefail

PLATFORM=$(uname -m)
readonly PLATFORM
readonly GIT_HOOKS_PATH='.githooks'

# 1. Validate required environment variables
if [[ -z "${SUPER_LINTER_TAG:-}" ]]; then
    echo 'SUPER_LINTER_TAG is required.'
    exit 1
fi

# 2. Load nvm
export NVM_DIR="/usr/local/share/nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    \. "$NVM_DIR/nvm.sh" || true
fi

# 3. Install and activate the Node version specified in .nvmrc
if [ -f .nvmrc ]; then
    nvm install
    nvm use
fi

# 4. Enable Corepack and install the latest npm 11.x version
sudo corepack enable npm
corepack prepare npm@11 --activate

# 5. Check versions
echo "==================================================="
echo "npm version: $(npm --version)"
echo "node version: $(node --version)"

echo "Platform detected: $PLATFORM"
echo "super-linter tag: $SUPER_LINTER_TAG"
echo "==================================================="

# 6. Configure the repository Git hooks path
if git rev-parse --show-toplevel > /dev/null 2>&1; then
    git config --local core.hooksPath "$GIT_HOOKS_PATH"
    chmod +x "${GIT_HOOKS_PATH}/pre-push"
    echo "git hooks path: $(git config --local core.hooksPath)"
fi

# 7. Download the super-linter image
docker pull \
    --platform linux/amd64 \
    "ghcr.io/super-linter/super-linter:$SUPER_LINTER_TAG"
