# Issue PR Labeler

![GitHub release (latest by date)](https://img.shields.io/github/v/release/hoho4190/issue-pr-labeler)
![GitHub](https://img.shields.io/github/license/hoho4190/issue-pr-labeler?color=informational)
[![npm Build](https://github.com/hoho4190/issue-pr-labeler/actions/workflows/npm-build.yml/badge.svg)](https://github.com/hoho4190/issue-pr-labeler/actions/workflows/npm-build.yml)
[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fhoho4190%2Fissue-pr-labeler&count_bg=%2333CA56&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://github.com/hoho4190/issue-pr-labeler)
[![codecov](https://codecov.io/gh/hoho4190/issue-pr-labeler/branch/main/graph/badge.svg?token=CWCCAKBJQY)](https://codecov.io/gh/hoho4190/issue-pr-labeler)

## About

Automatically add labels by filtering the title and comment of **issues** and **pull requests**.

<br>

## Usage

### YAML configuration

Create `.github/labeler-config.yml` file.

```yaml
# example
filters:
  - label: feat
    regexs:
      - /\bfeat\b/
      - /feature/i
    events: [issues, pull_request]
    targets: [title, comment]
  - label: bug
    regexs:
      - /fix|bug/
    targets: [title]
  - label: documentation
    regexs:
      - /docs/
    events: [pull_request]
  - label: chore
    regexs:
      - /\bchore(\(.*\))?:/i
```

#### Properties

| Key       | Type           | Value                       | Description                                                                               |
| --------- | -------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `label`   | `String`       | label name                  | - Required<br>- Label name to be added                                                    |
| `regexs`  | `List<String>` | regular expression          | - Required<br>- List of regular expressions to filter<br>- Syntax: `/pattern/modifier(s)` |
| `events`  | `List<Event>`  | `issues`<br> `pull_request` | - Optional<br>- List of events to filter<br>- Default: `[issues, pull_request]`           |
| `targets` | `List<Target>` | `title`<br> `comment`       | - Optional<br>- List of target to filter<br>- Default: `[title, comment]`                 |

> `regexs` property
>
> Syntax: `/pattern/modifier(s)`
>
> - `pattern` must be written between `/` and `/`
> - `modifier` is optional
> - `modifier` values: `i`, `m`, `u`, `y`
>
> ex) `/bug/`, `/bug/im`, `/\bFeat\b/i`
>
> References:
>
> - https://www.w3schools.com/jsref/jsref_obj_regexp.asp
> - https://regex101.com

<br>

### Workflow

```yaml
# example
name: Issue PR Labeler

on:
  issues:
    types:
      - opened
      - edited
  pull_request: # or pull_request_target
    types:
      - opened
      - reopened

jobs:
  main:
    runs-on: ubuntu-latest

    permissions:
      contents: read       # required to read configuration yml file
      issues: write        # required to add labels to issues
      pull-requests: write # required to add labels to pull requests

    steps:
      - name: Run Issue PR Labeler
        uses: hoho4190/issue-pr-labeler@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
#          disable-bot: true
#          config-file-name: labeler-config.yml
```

- Available events: `issues`, `pull_request`, `pull_request_target`
- Use the `pull_request_target` event to allow Labeler to work even when you open a pull request from a forked repository to an upstream repository.

> If it is not an available event, the workflow will display a warning message, but will result in a `Success` status. Not a `Failure` state.

#### Input

| Key                | Type      | Description                                                                                                                                |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `token`            | `String`  | - Required<br>- Use `${{ secrets.GITHUB_TOKEN }}`                                                                                          |
| `disable-bot`      | `Boolean` | - Optional<br> - Whether to forbid filtering on issues and pull requests created by bots.<br>- Default: `true`                             |
| `config-file-name` | `String`  | - Optional<br> - Configuration file(`yaml`) name.<br>- This file should be located in `.github` path. <br> - Default: `labeler-config.yml` |

<br>

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
