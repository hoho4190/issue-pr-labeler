#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly SCRIPT_DIR

bash "${SCRIPT_DIR}/run-super-linter.sh" shell
