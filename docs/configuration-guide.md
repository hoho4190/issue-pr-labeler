# Configuration Guide

This document explains the structure of the configuration file and how to write it. The configuration file is located in
the `.github` directory.

<br>

## Table of Contents

- [1. Quick Start](#1-quick-start)
- [2. Top-Level Structure](#2-top-level-structure)
- [3. settings](#3-settings)
  - [3.1 skipIfBot](#31-skipifbot)
  - [3.2 removeUnmatchedLabels](#32-removeunmatchedlabels)
  - [3.3 onMissingLabel](#33-onmissinglabel)
  - [3.4 dryRun](#34-dryrun)
- [4. rules](#4-rules)
  - [4.1 Event Keys](#41-event-keys)
  - [4.2 Rule Structure](#42-rule-structure)
  - [4.3 Match Structure](#43-match-structure)
- [5. conditions](#5-conditions)
  - [5.1 Supported Properties by Event](#51-supported-properties-by-event)
  - [5.2 Properties](#52-properties)
  - [5.3 Value Types](#53-value-types)
  - [5.4 `negate` Option](#54-negate-option)
  - [5.5 Value Type Parsing Precedence](#55-value-type-parsing-precedence)
- [6. When Configuration Validation Fails](#6-when-configuration-validation-fails)
- [7. Practical Examples](#7-practical-examples)
  - [7.1 Selectively Allow Only Bot-Triggered Events](#71-selectively-allow-only-bot-triggered-events)
  - [7.2 `negate` Condition for Excluding a Specific String](#72-negate-condition-for-excluding-a-specific-string)
  - [7.3 Mixing `glob-pattern` and `string` in `changed-files`](#73-mixing-glob-pattern-and-string-in-changed-files)
  - [7.4 Mixing `regex` and `string` in `author`](#74-mixing-regex-and-string-in-author)
- [8. Common Mistakes](#8-common-mistakes)

<br>

## 1. Quick Start

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

> [!NOTE]
>
> - Configure the `pull_request_target` event under `rules.pr` as well.
> - If you want to understand how rules, matches, and conditions are evaluated, see
>   [Rule Evaluation Policy](/docs/dev/policy-rule-evaluation.md).

<br>

## 2. Top-Level Structure

```yaml
settings: {}
rules:
  issue: []
  pr: []
```

- Only the root keys `settings` and `rules` are allowed.
- If the configuration file is empty (`null`) or `settings`/`rules` is missing, default values are injected
  automatically.
- `rules.issue` and `rules.pr` are treated as empty arrays (`[]`) even when they are `null` or not specified.

<br>

## 3. settings

| Option                  | Allowed values            | Default  | Description                                                    |
| ----------------------- | ------------------------- | -------- | -------------------------------------------------------------- |
| `skipIfBot`             | `true`, `false`           | `false`  | Skips evaluation when the event was triggered by a bot.        |
| `removeUnmatchedLabels` | `true`, `false`           | `false`  | Can remove an existing label when all evaluated matches fail.  |
| `onMissingLabel`        | `create`, `skip`, `error` | `create` | Determines how to handle labels that do not exist in the repo. |
| `dryRun`                | `true`, `false`           | `false`  | Simulates the run without calling the actual add/remove APIs.  |

### 3.1 skipIfBot

This option is used during match evaluation.

It determines whether to skip match evaluation when the event was triggered by a bot. If `true`, evaluation is skipped.

- This option can be configured at `settings`, each rule, and each match.
- If a value is not specified, it inherits the parent setting.
  - `settings.skipIfBot` (global)
  - `rule.skipIfBot` (overrides the global setting)
  - `match.skipIfBot` (overrides the rule setting)

Example:

```yaml
settings:
  skipIfBot: true # Skip evaluation by default for bot-triggered events in all matches

rules:
  pr:
    - label: release-review
      skipIfBot: false # Matches in this rule are still evaluated for bot-triggered events
      matches:
        - operator: any
          skipIfBot: true # Only this match is skipped for bot-triggered events
          conditions:
            - title: /release/i
```

### 3.2 removeUnmatchedLabels

This option is used during rule evaluation.

It determines whether to remove the label when all evaluated (non-skip) matches fail. If `true`, it removes the label
already attached to the issue or PR when the evaluation result is as follows.

- If there is at least one match that is not `skip` and all of them are `fail`, the label is removed.
- In other words, the label is not removed if there is at least one `pass`, or if all matches are `skip`.

> [!NOTE]
>
> - Each match has one of the states `pass` | `fail` | `skip`.

### 3.3 onMissingLabel

This option is used when adding or removing labels.

It determines how to handle labels that do not exist in the repository when the action tries to add or remove them from
an issue or PR.

- `create`
  - If the action tries to add a label that does not exist in the repository, it creates the label in the repository
    first and then adds it.
- `skip`
  - If the action tries to add or remove a label that does not exist in the repository, it skips the operation.
- `error`
  - It pre-checks the labels declared in the configuration file and exits immediately if any label does not exist in the
    repository.
  - This fails early so that label add/remove operations do not run.
  - ⚠️ This check is performed against the entire configuration file (`rules.issue + rules.pr`), not only the labels
    configured for the currently triggered event (`issue` or `pr`).

### 3.4 dryRun

This option is used when adding or removing labels.

When `true`, the action simulates label add/remove behavior without calling the label add/remove APIs.

- It does not call the label add/remove APIs, but it still calls the read APIs required to collect context and evaluate
  rules.
- In the action output `labels`, you can check whether each item was simulated through its `simulatedByDryRun` field.
- In the summary, you can check whether it was simulated through the parenthesized notation attached to the label name.

<br>

## 4. rules

### 4.1 Event Keys

- `rules.issue`: GitHub `issues` event
- `rules.pr`: GitHub `pull_request`, `pull_request_target` events

### 4.2 Rule Structure

Defines label rules for each event.

```yaml
rules:
  issue:
    - label: bug
      skipIfBot: false # optional
      matches:
        - operator: any
          conditions:
            - title: /bug/i
```

| Key         | Type      | Required | Description                    |
| ----------- | --------- | -------- | ------------------------------ |
| `label`     | `string`  | Yes      | Target label name              |
| `skipIfBot` | `boolean` | No       | Overrides `settings.skipIfBot` |
| `matches`   | `Match[]` | Yes      | List of one or more matches    |

Constraints:

- Within the same event bucket (`rules.issue` or `rules.pr`), a duplicate `label` causes an error after trimming
  leading/trailing whitespace and converting to lowercase.
  - Example: `bug`, `BUG`, `" bug"`, `"bug "`, and `" bug "` are all treated as the same label and cause a
    duplicate-label error.
- `label` cannot be a string made of whitespace only.
- `matches` cannot be an empty array.

### 4.3 Match Structure

```yaml
matches:
  - operator: all
    skipIfBot: true # optional
    conditions:
      - body: /release note/i
```

| Key          | Type           | Required | Description                    |
| ------------ | -------------- | -------- | ------------------------------ |
| `operator`   | `any` \| `all` | Yes      | How conditions are combined    |
| `skipIfBot`  | `boolean`      | No       | Overrides `rule.skipIfBot`     |
| `conditions` | `Condition[]`  | Yes      | List of one or more conditions |

Evaluation rules:

- `any`: **pass** when at least one condition is true
- `all`: **fail** when at least one condition is false
- Conditions are short-circuited.
- `conditions` cannot be an empty array.

<br>

## 5. conditions

A condition object must have **exactly one property key**, excluding `negate`. Each property defines which value types
are allowed.

Correct example:

```yaml
conditions:
  - title: /bug/i
  - body: /wip/i
    negate: true
```

Incorrect example:

```yaml
conditions:
  - title: /bug/i
    body: /error/i # Error because there are two property keys
```

### 5.1 Supported Properties by Event

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

### 5.2 Properties

#### title

- Checks the issue/PR title (`issue.title`, `pullRequest.title`).

#### body

- Checks the issue/PR body (`issue.body`, `pullRequest.body`).
- If the body is empty, it is evaluated after treating the body value as an empty string (`''`).

#### author

- Checks the issue/PR author's login (`issue.author.login`, `pullRequest.author.login`).

#### base-branch

- Checks the PR's base branch name (`pullRequest.baseRefName`).

#### head-branch

- Checks the PR's head branch name (`pullRequest.headRefName`).

#### draft

- Checks whether the PR is in draft state (`pullRequest.isDraft`).

#### changed-lines

- Checks against the PR's total changed lines (`pullRequest.additions + pullRequest.deletions`).
- In other words, it uses the sum of added lines and deleted lines in the PR.

#### changed-files

- Checks against the list of changed file paths in the PR.
- Each file path is checked one by one, and the condition becomes true if any one of them matches.

### 5.3 Value Types

#### regex

- Format: `/pattern/flags` string
- Examples: `/bug/i`, `/^release\//`

#### string

- Uses exact match comparison (`===`).
- It is not interpreted like a regular expression.

#### boolean

- `true` or `false`

#### glob-pattern

- Only strings recognized by `is-glob` as glob patterns are treated as `glob-pattern`.
- Examples: `src/**/*.ts`, `**/*.md`

#### numeric-comparison

- Format: `operator + integer` (whitespace after the operator is optional)
- Operators: `>`, `>=`, `<`, `<=`, `==`, `!=`
- Examples: `'>10'`, `'>= 200'`, `'==0'`, `'!= 3'`
- Only integers are allowed. Negative numbers and decimals are not supported.

### 5.4 `negate` Option

- You can add `negate` to every condition.
- Adding `negate: true` inverts the condition result.

### 5.5 Value Type Parsing Precedence

When a property allows two or more value types, precedence is applied in the order shown in the
[Supported Properties by Event](#51-supported-properties-by-event) table.

For example, `author` is interpreted in the order `regex` -> `string`.

- `author: /octo.*/` is evaluated as a regular expression.
- `author: octocat` is evaluated as an exact string match.

For example, `changed-files` is interpreted in the order `glob-pattern` -> `string`.

- `changed-files: 'src/**/*.ts'` is evaluated as a glob pattern.
- `changed-files: 'README.md'` is evaluated as an exact string match.

<br>

## 6. When Configuration Validation Fails

Below are common cases that fail during parsing.

- Adding an unsupported key at the root
- Adding an unsupported key to `settings`, `rules`, each rule, each match, or each condition
- Using an unsupported event key
- Duplicate labels within the same event bucket
- Using an invalid `onMissingLabel` value
- Using an unsupported condition property
- Writing zero condition properties or two or more condition properties
- Writing `matches` as an empty array
- Writing `conditions` as an empty array
- Using a condition value format that does not match any allowed type for that property

<br>

## 7. Practical Examples

### 7.1 Selectively Allow Only Bot-Triggered Events

```yaml
settings:
  skipIfBot: true

rules:
  pr:
    - label: auto-merge-candidate
      skipIfBot: false
      matches:
        - operator: all
          conditions:
            - head-branch: /^release\//
```

### 7.2 `negate` Condition for Excluding a Specific String

```yaml
rules:
  issue:
    - label: ready
      matches:
        - operator: all
          conditions:
            - title: /ready/i
            - body: /wip/i
              negate: true
```

### 7.3 Mixing `glob-pattern` and `string` in `changed-files`

```yaml
rules:
  pr:
    - label: docs
      matches:
        - operator: any
          conditions:
            - changed-files: 'docs/**/*.md'
            - changed-files: 'README.md'
```

### 7.4 Mixing `regex` and `string` in `author`

```yaml
rules:
  issue:
    - label: triage-bot
      matches:
        - operator: any
          conditions:
            - author: /.*\[bot\]/
            - author: 'octocat'
```

<br>

## 8. Common Mistakes

- Writing two or more properties in a single condition
- Writing a `regex` condition as a normal string, or not following the `/pattern/flags` format
- Using an invalid comparison expression for `numeric-comparison`, such as decimal values, negative values, or invalid
  operators
