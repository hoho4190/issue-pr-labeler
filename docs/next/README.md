# Issue PR Labeler

English | [한국어](/docs/next/README.ko.md)

[![GitHub Release](https://img.shields.io/github/v/release/hoho4190/issue-pr-labeler)](https://github.com/hoho4190/issue-pr-labeler/releases/latest)
[![GitHub License](https://img.shields.io/github/license/hoho4190/issue-pr-labeler?color=informational)](https://github.com/hoho4190/issue-pr-labeler?tab=MIT-1-ov-file)
[![🏗️ Build](https://github.com/hoho4190/issue-pr-labeler/actions/workflows/build.yml/badge.svg)](https://github.com/hoho4190/issue-pr-labeler/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/hoho4190/issue-pr-labeler/branch/main/graph/badge.svg?token=CWCCAKBJQY)](https://codecov.io/gh/hoho4190/issue-pr-labeler)

> ⭐️ Support the project by giving it a star!

<br>

This GitHub Action automatically adds or removes labels based on issue and PR metadata.

You can combine the following conditions to build simple labeling rules.

- Title (`title`)
- Body (`body`)
- Author (`author`)
- Base branch (`base-branch`)
- Head branch (`head-branch`)
- Draft state (`draft`)
- Changed lines (`changed-lines`)
- Changed files (`changed-files`)

It supports the `issues`, `pull_request`, and `pull_request_target` events, and uses `.github/labeler-config.yml` by
default.

<br>

## Quick Start

Workflow file example:

```yaml
name: Issue PR Labeler

on:
  issues:
    types:
      - opened
      - edited
      - reopened
      # - ...
  pull_request: # or pull_request_target
    types:
      - opened
      - edited
      - reopened
      - synchronize
      - ready_for_review
      - converted_to_draft
      # - ...

jobs:
  label:
    runs-on: ubuntu-slim

    permissions:
      contents: read # required to read configuration yml file
      issues: write # required to add labels to issues
      pull-requests: write # required to add labels to pull requests

    steps:
      - uses: hoho4190/issue-pr-labeler@v3 # use a release tag instead of @main
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          # config-file-path: labeler-config.yml # -> .github/labeler-config.yml
```

- `config-file-path` is optional, and its default value is `labeler-config.yml`.
- If you want to use a different file name, place the file under `.github/` and set it through `config-file-path`.
  - Do not include `.github/` in `config-file-path`.

<br>

## Configuration File

```yaml
settings:
  skipIfBot: false
  removeUnmatchedLabels: false
  onMissingLabel: create
  dryRun: false

rules:
  issue:
    - label: bug
      matches:
        # The title starts with `[bug]`, the body contains the `error` keyword,
        # and the `wip` keyword is not included
        - operator: all
          conditions:
            - title: /^\[bug\]/i
            - body: /\berror\b/i
            - body: /\bwip\b/i
              negate: true
  pr:
    - label: large-change
      matches:
        # The changed line count is 200 or more and the PR is not a draft
        - operator: all
          conditions:
            - changed-lines: '>=200'
            - draft: false

    - label: documentation
      skipIfBot: true
      matches:
        # The `docs` directory or the `README.md` file changed
        - operator: any
          conditions:
            - changed-files: 'docs/**/*.md'
            - changed-files: 'README.md'
        # The title contains the `docs` keyword
        - operator: any
          skipIfBot: false
          conditions:
            - title: /\bdocs?\b/i
```

- Configure the `pull_request_target` event under `rules.pr` as well.

> [!NOTE]
>
> For detailed configuration format, value types, validation rules, and more examples, see the
> [Configuration Guide](/docs/next/configuration-guide.md).

<br>

## How Rules Are Written

- `rules.issue` is used for the `issues` event.
- `rules.pr` is used for the `pull_request` and `pull_request_target` events.
- One `rule` targets one label.
- One `match` groups conditions with `operator: any` or `operator: all`.
- Each `condition` can have only one property key, and you can invert the result with `negate: true`.

<br>

## Common Options

> [!NOTE]
>
> For each option's default value and behavior, see
> [Configuration Guide - 3. settings](/docs/next/configuration-guide.md#3-settings).

| Option                  | Allowed values            | Default  | Description                                                    |
| ----------------------- | ------------------------- | -------- | -------------------------------------------------------------- |
| `skipIfBot`             | `true`, `false`           | `false`  | Skips evaluation when the event was triggered by a bot.        |
| `removeUnmatchedLabels` | `true`, `false`           | `false`  | Can remove an existing label when all evaluated matches fail.  |
| `onMissingLabel`        | `create`, `skip`, `error` | `create` | Determines how to handle labels that do not exist in the repo. |
| `dryRun`                | `true`, `false`           | `false`  | Simulates the run without calling the actual add/remove APIs.  |

> [!IMPORTANT]
>
> `skipIfBot` is inherited and overridden in the order `settings` -> `rule` -> `match`.

<br>

## Supported Conditions

> [!NOTE]
>
> For supported properties, allowed value types, how to use `negate`, and more examples, see
> [Configuration Guide - 5. conditions](/docs/next/configuration-guide.md#5-conditions).

| Property        | Issue | PR  | Allowed value types (in precedence order) |
| --------------- | ----- | --- | ----------------------------------------- |
| `title`         | O     | O   | `regex`                                   |
| `body`          | O     | O   | `regex`                                   |
| `author`        | O     | O   | `regex`, `string`                         |
| `base-branch`   | X     | O   | `regex`, `string`                         |
| `head-branch`   | X     | O   | `regex`, `string`                         |
| `draft`         | X     | O   | `boolean`                                 |
| `changed-lines` | X     | O   | `numeric-comparison`                      |
| `changed-files` | X     | O   | `glob-pattern`, `string`                  |

- `changed-lines` compares the PR's **total changed lines (additions + deletions)**.
- `regex`: write it in the `/pattern/flags` format.
- `glob-pattern`: write it as a **glob pattern string** such as `src/**/*.ts` or `**/*.md`.
- `numeric-comparison`: write it as a **comparison expression string** such as `>=200`, `==0`, or `!= 3`.

> [!IMPORTANT]
>
> Properties with multiple allowed value types are parsed in the order shown in the table.
>
> For example, `author` is interpreted in the order `regex` -> `string`.
>
> - `author: /octo.*/` is evaluated as a regular expression.
> - `author: octocat` is evaluated as an exact string match.

<br>

## Acknowledgments

This project was inspired by and references the following projects.

- [actions/typescript-action](https://github.com/actions/typescript-action)
- [actions/labeler](https://github.com/actions/labeler)
- [srvaroa/labeler](https://github.com/srvaroa/labeler)
