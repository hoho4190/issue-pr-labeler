#!/bin/bash

git_config() {
    local user_name="${1:-github-actions[bot]}"
    local user_email="${2:-41898282+github-actions[bot]@users.noreply.github.com}"

    echo "Configuring Git author: $user_name <$user_email>"

    git config --local user.name "$user_name"
    git config --local user.email "$user_email"
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

git_with_auth() {
    if [[ -n "${GIT_PUSH_TOKEN:-}" ]]; then
        local auth_header
        auth_header=$(printf 'AUTHORIZATION: basic %s' "$(printf 'x-access-token:%s' "$GIT_PUSH_TOKEN" | base64 | tr -d '\n')")
        git -c credential.helper= -c "http.extraheader=${auth_header}" "$@"
    else
        git "$@"
    fi
}

git_push() {
    local branch_name="$1"

    # 브랜치 이름이 없으면 에러 처리
    if [[ -z "$branch_name" ]]; then
        echo "Error: Branch name is required"
        echo "Usage: git_push <branch_name>"
        return 1
    fi

    echo "Checking for changes to push on branch: $branch_name"

    # 원격에 브랜치가 있는지 확인 (ls-remote 명령)
    if git_with_auth ls-remote --exit-code --heads origin "$branch_name" > /dev/null 2>&1; then
        # 원격 브랜치가 존재하므로 최신 상태로 fetch
        git_with_auth fetch origin "$branch_name"

        # 원격 브랜치와 비교해서 로컬에 푸시할 커밋이 있는지 확인
        local_commits=$(git rev-list --count origin/"$branch_name"..HEAD)
        if [[ "$local_commits" -gt 0 ]]; then
            echo "Found $local_commits commit(s) to push to origin: $branch_name"
            git_with_auth push origin "$branch_name"
        else
            echo "Nothing to push. Branch '$branch_name' is up to date with remote."
        fi
    else
        # 원격에 브랜치가 없으므로 무조건 push
        echo "Remote branch '$branch_name' does not exist. Pushing new branch..."
        git_with_auth push origin "$branch_name"
    fi
}
