#!/bin/bash

_on_exit() {
    local exit_code=$?

    if [[ "$exit_code" -ne 0 ]]; then
        echo "Script exited with error code: $exit_code" >&2
    fi
    exit "$exit_code"
}

set_env_var() {
    local name="$1"
    local value="$2"

    if [[ -z "$name" ]]; then
        echo "Error: Environment variable name cannot be empty." >&2
        return 1
    fi

    echo "$name=$value" >>"$GITHUB_ENV"
}
