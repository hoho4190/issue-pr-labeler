# Issue PR Labeler

<!-- LANGUAGE_SWITCH_START -->

[English](/docs/next/README.md) | 한국어

<!-- LANGUAGE_SWITCH_END -->

[![GitHub Release](https://img.shields.io/github/v/release/hoho4190/issue-pr-labeler)](https://github.com/hoho4190/issue-pr-labeler/releases/latest)
[![GitHub License](https://img.shields.io/github/license/hoho4190/issue-pr-labeler?color=informational)](https://github.com/hoho4190/issue-pr-labeler?tab=MIT-1-ov-file)
[![🏗️ Build](https://github.com/hoho4190/issue-pr-labeler/actions/workflows/build.yml/badge.svg)](https://github.com/hoho4190/issue-pr-labeler/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/hoho4190/issue-pr-labeler/branch/main/graph/badge.svg?token=CWCCAKBJQY)](https://codecov.io/gh/hoho4190/issue-pr-labeler)

> ⭐️ Support the project by giving it a star!

<br>

이 GitHub Action은 이슈와 PR의 메타데이터를 기준으로 레이블을 자동으로 추가하거나 제거합니다.

다음 조건을 조합해 간단한 레이블링 규칙을 만들 수 있습니다.

- 제목(`title`)
- 본문(`body`)
- 이벤트 실행자(`actor`)
- 작성자(`author`)
- 대상 브랜치(`base-branch`)
- 소스 브랜치(`head-branch`)
- 드래프트 상태(`draft`)
- 변경 라인 수(`changed-lines`)
- 변경 파일(`changed-files`)
- 커밋 메시지 전체(`commit-messages`)
- 커밋 메시지 제목(`commit-message-subjects`)
- 커밋 메시지 본문(`commit-message-bodies`)

`issues`, `pull_request`, `pull_request_target` 이벤트를 지원하며, 설정 파일은 기본적으로 `.github/labeler-config.yml`을
사용합니다.

<br>

## Quick Start

워크플로우 파일 예시:

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

- `config-file-path`는 선택 입력이며, 기본값은 `labeler-config.yml`입니다.
- 다른 파일명을 쓰고 싶다면 `.github/` 아래에 파일을 두고 `config-file-path` 입력값으로 지정하면 됩니다.
  - `config-file-path`에는 `.github/`를 포함하지 마세요.

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
        # 제목이 `[bug]`로 시작하고, 본문에 `error` 키워드가 포함되며, `wip` 키워드는 포함되지 않음
        - operator: all
          conditions:
            - title: /^\[bug\]/i
            - body: /\berror\b/i
            - body: /\bwip\b/i
              negate: true
  pr:
    - label: large-change
      matches:
        # 변경 라인 수가 200 이상이고 드래프트가 아님
        - operator: all
          conditions:
            - changed-lines: '>=200'
            - draft: false

    - label: documentation
      skipIfBot: true
      matches:
        # `docs` 디렉터리 또는 `README.md` 파일이 변경됨
        - operator: any
          conditions:
            - changed-files: 'docs/**/*.md'
            - changed-files: 'README.md'
        # 제목에 `docs` 키워드가 포함됨
        - operator: any
          skipIfBot: false
          conditions:
            - title: /\bdocs?\b/i
```

- `pull_request_target` 이벤트도 `rules.pr`에 설정합니다.

> [!NOTE]
>
> 자세한 설정 형식, 값 타입, 검증 규칙, 추가 예시는 [Configuration Guide](/docs/next/configuration-guide.ko.md)를
> 참고하세요.

<br>

## How Rules Are Written

- `rules.issue`는 `issues` 이벤트에 사용합니다.
- `rules.pr`는 `pull_request`, `pull_request_target` 이벤트에 사용합니다.
- 하나의 `rule`은 하나의 레이블을 대상으로 합니다.
- 하나의 `match`는 `operator: any` 또는 `operator: all`로 조건들을 묶습니다.
- 각 `condition`에는 속성 키를 하나만 두고, `negate: true`로 결과를 반전할 수 있습니다.

<br>

## Common Options

> [!NOTE]
>
> 각 옵션의 기본값과 동작 방식은 [Configuration Guide - 3. settings](/docs/next/configuration-guide.ko.md#3-settings)를
> 참고하세요.

| 옵션                    | 허용 값                   | 기본값   | 설명                                                             |
| ----------------------- | ------------------------- | -------- | ---------------------------------------------------------------- |
| `skipIfBot`             | `true`, `false`           | `false`  | 봇이 발생시킨 이벤트이면 평가를 건너뜁니다.                      |
| `removeUnmatchedLabels` | `true`, `false`           | `false`  | 평가된 매치가 모두 실패했을 때 기존 레이블을 제거할 수 있습니다. |
| `onMissingLabel`        | `create`, `skip`, `error` | `create` | 저장소에 없는 레이블을 어떻게 처리할지 정합니다.                 |
| `dryRun`                | `true`, `false`           | `false`  | 실제 추가/제거 API를 호출하지 않고 시뮬레이션합니다.             |

> [!IMPORTANT]
>
> `skipIfBot`은 `settings` -> `rule` -> `match` 순서로 상속/오버라이드됩니다.

<br>

## Supported Conditions

> [!NOTE]
>
> 지원 속성, 허용 값 타입, `negate` 사용법, 추가 예시는
> [Configuration Guide - 5. conditions](/docs/next/configuration-guide.ko.md#5-conditions)를 참고하세요.

| 속성                      | 이슈 | PR  | 허용 값 타입(우선순위)   |
| ------------------------- | ---- | --- | ------------------------ |
| `title`                   | O    | O   | `regex`                  |
| `body`                    | O    | O   | `regex`                  |
| `actor`                   | O    | O   | `regex`, `string`        |
| `author`                  | O    | O   | `regex`, `string`        |
| `base-branch`             | X    | O   | `regex`, `string`        |
| `head-branch`             | X    | O   | `regex`, `string`        |
| `draft`                   | X    | O   | `boolean`                |
| `changed-lines`           | X    | O   | `numeric-comparison`     |
| `changed-files`           | X    | O   | `glob-pattern`, `string` |
| `commit-messages`         | X    | O   | `regex`                  |
| `commit-message-subjects` | X    | O   | `regex`                  |
| `commit-message-bodies`   | X    | O   | `regex`                  |

- `author`는 이슈/PR의 작성자이고, `actor`는 해당 이벤트를 발생시킨 주체입니다.
- `changed-lines` 비교 대상은 PR의 **총 변경 줄 수(추가 + 삭제)** 입니다.
- `regex`: `/pattern/flags` 형식으로 작성합니다.
- `glob-pattern`: `src/**/*.ts`, `**/*.md` 같은 **glob 패턴 문자열**로 작성합니다.
- `numeric-comparison`: `>=200`, `==0`, `!= 3` 같은 **비교식 문자열**로 작성합니다.

> [!IMPORTANT]
>
> 허용 값 타입이 여러 개인 속성은 표에 적힌 순서대로 파싱됩니다.
>
> 예를 들어, `author`는 `regex` -> `string` 순서로 해석됩니다.
>
> - `author: /octo.*/`로 작성하면 정규 표현식으로 평가됩니다.
> - `author: octocat`로 작성하면 문자열 정확 일치로 평가됩니다.

<br>

## Acknowledgments

이 프로젝트는 다음 프로젝트들에서 아이디어를 얻고 참고했습니다.

- [actions/typescript-action](https://github.com/actions/typescript-action)
- [actions/labeler](https://github.com/actions/labeler)
- [srvaroa/labeler](https://github.com/srvaroa/labeler)
