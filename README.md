# Issue PR Labeler

![GitHub release (latest by date)](https://img.shields.io/github/v/release/hoho4190/issue-pr-labeler)
![GitHub](https://img.shields.io/github/license/hoho4190/issue-pr-labeler?color=informational)
[![build-test](https://github.com/hoho4190/issue-pr-labeler/actions/workflows/test.yml/badge.svg)](https://github.com/hoho4190/issue-pr-labeler/actions/workflows/test.yml)
[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fhoho4190%2Fissue-pr-labeler&count_bg=%2333CA56&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://github.com/hoho4190/issue-pr-labeler)

## About

Automatically add labels by filtering titles and content when **issues** and **pull requests** are **opened**.

<br>

## Usage

### YAML configuration

Create `.github/labeler-config.yml` file.

```yaml
# example
filters:
  - label: enhancement
    regexs:
      - /feat/i
      - /refactor/
    events: [issues, pull_request]
    targets: [title, comment]
  - label: bug
    regexs:
      - /\bfix\b|bug/
    targets: [title]
  - label: documentation
    regexs:
      - /docs/
    events: [pull_request]
  - label: chore
    regexs:
      - /chore/
```

#### `label`

- Required
- Value: label name to be added

#### `regexs`

- Required
- Values: List of regular expressions to filter
- Syntax: `/pattern/modifier(s)`
  - `pattern` must be written between `/` and `/`
  - `modifier` Item is optional
  - `modifier` values: `i`, `m`, `u`, `g`, `y`
- ex) `/bug/`, `/bug/im`, `/\bFeat\b/i`

> see: https://www.w3schools.com/jsref/jsref_obj_regexp.asp

#### `events`

- Optional (if not used, all values apply)
- Values: `issues`, `pull_request`
- Filtering is triggered when the event is opened

#### `targets`

- Optional (if not used, all values apply)
- Values: `title`, `comment`
- Target to filter

### Workflow

```yaml
name: Issue PR Labeler

on:
  issues:
    types:
      - opened
  pull_request:
    types:
      - opened

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
```

- available events: issues, pull_request
- available types: opened

> If it is not an available event and type, the workflow will display a warning message, but the result of the workflow is not 'Failure' status. The result is a `Success` status.

#### Customize the config file name

```yaml
- name: Run Issue PR Labeler
  uses: hoho4190/issue-pr-labeler@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    config-file-name: custom-labeler-config.yml # <- this line
```

If you want to customize the name of the configuration file, add the value of `config-file-name` to `with`.

If `config-file-name` is not used, the default value is `labeler-config.yml`.

<br>

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
