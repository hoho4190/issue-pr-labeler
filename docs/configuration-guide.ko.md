# 설정 파일 가이드

[English](/docs/configuration-guide.md) | 한국어

이 문서는 설정 파일의 구조와 작성 방법을 설명합니다. 설정 파일은 `.github` 디렉터리에 위치합니다.

<br>

## 목차

- [1. 빠른 시작](#1-빠른-시작)
- [2. 최상위 구조](#2-최상위-구조)
- [3. settings](#3-settings)
  - [3.1 skipIfBot](#31-skipifbot)
  - [3.2 removeUnmatchedLabels](#32-removeunmatchedlabels)
  - [3.3 onMissingLabel](#33-onmissinglabel)
  - [3.4 dryRun](#34-dryrun)
- [4. rules](#4-rules)
  - [4.1 이벤트 키](#41-이벤트-키)
  - [4.2 규칙 구조](#42-규칙-구조)
  - [4.3 매치 구조](#43-매치-구조)
- [5. conditions](#5-conditions)
  - [5.1 이벤트별 지원 속성](#51-이벤트별-지원-속성)
  - [5.2 속성](#52-속성)
  - [5.3 값 타입](#53-값-타입)
  - [5.4 negate 옵션](#54-negate-옵션)
  - [5.5 값 타입 파싱 우선순위](#55-값-타입-파싱-우선순위)
- [6. 설정 검증에서 에러가 발생하는 경우](#6-설정-검증에서-에러가-발생하는-경우)
- [7. 실전 예시](#7-실전-예시)
  - [7.1 봇이 발생시킨 이벤트만 선택적으로 허용](#71-봇이-발생시킨-이벤트만-선택적으로-허용)
  - [7.2 특정 문자열을 제외하는 negate 조건](#72-특정-문자열을-제외하는-negate-조건)
  - [7.3 `changed-files`에서 `glob-pattern`과 `string` 혼합](#73-changed-files에서-glob-pattern과-string-혼합)
  - [7.4 `author`에서 `regex`와 `string` 혼합](#74-author에서-regex와-string-혼합)
- [8. 자주 하는 실수](#8-자주-하는-실수)

<br>

## 1. 빠른 시작

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

> [!NOTE]
>
> - `pull_request_target` 이벤트도 `rules.pr`에 설정합니다.
> - 규칙, 매치, 조건이 어떻게 평가되는지 알고 싶다면 [규칙 평가 정책](/docs/policy-rule-evaluation.ko.md) 문서를
>   참고하시기 바랍니다.

<br>

## 2. 최상위 구조

```yaml
settings: {}
rules:
  issue: []
  pr: []
```

- 루트 키는 `settings`, `rules`만 허용됩니다.
- 설정 파일이 비어 있거나(`null`) `settings`/`rules`가 누락되면 기본값이 자동 주입됩니다.
- `rules.issue`, `rules.pr`는 `null`이거나 미지정이어도 빈 배열(`[]`)로 처리됩니다.

<br>

## 3. settings

| 옵션                    | 허용 값                   | 기본값   | 설명                                                             |
| ----------------------- | ------------------------- | -------- | ---------------------------------------------------------------- |
| `skipIfBot`             | `true`, `false`           | `false`  | 봇이 발생시킨 이벤트이면 평가를 건너뜁니다.                      |
| `removeUnmatchedLabels` | `true`, `false`           | `false`  | 평가된 매치가 모두 실패했을 때 기존 레이블을 제거할 수 있습니다. |
| `onMissingLabel`        | `create`, `skip`, `error` | `create` | 저장소에 없는 레이블을 어떻게 처리할지 정합니다.                 |
| `dryRun`                | `true`, `false`           | `false`  | 실제 추가/제거 API를 호출하지 않고 시뮬레이션합니다.             |

### 3.1 skipIfBot

매치 평가에 사용되는 옵션입니다.

봇이 발생시킨 이벤트일 때 매치 평가를 건너뛸지 결정합니다. `true`이면 건너뜁니다.

- 이 옵션은 `settings`, 각 규칙, 각 매치마다 세분화해 설정할 수 있습니다.
- 값을 지정하지 않으면 상위 설정을 상속받습니다.
  - `settings.skipIfBot` (전역)
  - `rule.skipIfBot` (전역 설정 재정의)
  - `match.skipIfBot` (규칙 설정 재정의)

예시:

```yaml
settings:
  skipIfBot: true # 기본적으로 모든 매치에서 봇이 발생시킨 이벤트이면 평가를 건너뜀

rules:
  pr:
    - label: release-review
      skipIfBot: false # 이 규칙의 매치들은 봇이 발생시킨 이벤트여도 평가를 진행함
      matches:
        - operator: any
          skipIfBot: true # 이 매치만은 봇이 발생시킨 이벤트이면 평가를 건너뜀
          conditions:
            - title: /release/i
```

### 3.2 removeUnmatchedLabels

규칙 평가에 사용되는 옵션입니다.

평가된(non-skip) 매치가 모두 실패했을 때 레이블을 제거할지 결정합니다. `true`이면 평가 결과가 아래와 같을 때 이슈/PR에
추가되어 있는 레이블을 제거합니다.

- `skip` 상태가 아닌 매치가 1개 이상이며 모두 `fail`이면 레이블을 제거합니다.
- (즉, `pass`가 하나라도 있거나 모두 `skip`일 경우 레이블을 제거하지 않습니다.)

> [!NOTE]
>
> - 각 매치는 `pass` | `fail` | `skip` 중 하나의 상태를 가집니다.

### 3.3 onMissingLabel

레이블 추가/제거에 사용되는 옵션입니다.

저장소에 없는 레이블을 이슈/PR에 추가하거나 제거하려고 할 때의 처리 방식을 정합니다.

- `create`
  - 저장소에 없는 레이블을 이슈/PR에 추가하려고 할 때 저장소에 레이블을 만든 뒤 추가합니다.
- `skip`
  - 저장소에 없는 레이블을 이슈/PR에 추가하거나 제거하려고 할 때 작업을 건너뜁니다.
- `error`
  - 설정 파일에 선언된 레이블을 미리 검사하고, 저장소에 없는 레이블이 있으면 즉시 종료합니다.
  - 이렇게 미리 실패 처리하여 레이블 추가/제거 작업이 실행되지 않도록 합니다.
  - ⚠️ 이 검사는 현재 트리거된 이벤트(`issue` 또는 `pr`)에 설정된 레이블만이 아니라 설정 파일
    전체(`rules.issue + rules.pr`)를 기준으로 수행합니다.

### 3.4 dryRun

레이블 추가/제거에 사용되는 옵션입니다.

`true`일 경우 레이블 추가/제거 API를 호출하지 않고 시뮬레이션합니다.

- 레이블 추가/제거 API는 호출하지 않지만 컨텍스트 수집/평가에 필요한 조회 API는 호출됩니다.
- 액션 출력(output)의 `labels` 필드에서 각 항목의 `simulatedByDryRun` 필드로 시뮬레이션 여부를 확인할 수 있습니다.
- 요약(summary)에서는 레이블 이름에 붙는 괄호 표기로 시뮬레이션 여부를 확인할 수 있습니다.

<br>

## 4. rules

### 4.1 이벤트 키

- `rules.issue`: GitHub `issues` 이벤트
- `rules.pr`: GitHub `pull_request`, `pull_request_target` 이벤트

### 4.2 규칙 구조

이벤트별 레이블 규칙을 정의합니다.

```yaml
rules:
  issue:
    - label: bug
      skipIfBot: false # 선택 사항
      matches:
        - operator: any
          conditions:
            - title: /bug/i
```

| 키          | 타입      | 필수   | 설명                        |
| ----------- | --------- | ------ | --------------------------- |
| `label`     | `string`  | 예     | 대상 레이블 이름            |
| `skipIfBot` | `boolean` | 아니오 | `settings.skipIfBot` 재정의 |
| `matches`   | `Match[]` | 예     | 최소 1개 이상의 매치 목록   |

제약:

- 같은 이벤트 버킷(`rules.issue` 또는 `rules.pr`) 안에서 `label`은 앞뒤 공백을 제거하고 소문자로 바꾼 기준으로 중복되면
  에러가 발생합니다.
  - 예시: `bug`, `BUG`, `" bug"`, `"bug "`, `" bug "`는 모두 동일한 레이블로 간주되어 중복 에러가 발생합니다.
- `label`은 공백만 있는 문자열을 허용하지 않습니다.
- `matches`는 빈 배열을 허용하지 않습니다.

### 4.3 매치 구조

```yaml
matches:
  - operator: all
    skipIfBot: true # 선택 사항
    conditions:
      - body: /release note/i
```

| 키           | 타입           | 필수   | 설명                      |
| ------------ | -------------- | ------ | ------------------------- |
| `operator`   | `any` \| `all` | 예     | 조건 결합 방식            |
| `skipIfBot`  | `boolean`      | 아니오 | `rule.skipIfBot` 재정의   |
| `conditions` | `Condition[]`  | 예     | 최소 1개 이상의 조건 목록 |

평가 규칙:

- `any`: 조건 중 하나라도 참이면 **pass**
- `all`: 조건 중 하나라도 거짓이면 **fail**
- 조건은 단락 평가(short-circuit)됩니다.
- `conditions`는 빈 배열을 허용하지 않습니다.

<br>

## 5. conditions

조건 객체는 `negate`를 제외하고 **속성 키를 정확히 하나만** 가져야 합니다. 속성마다 허용되는 값 타입이 정해져 있습니다.

올바른 예시:

```yaml
conditions:
  - title: /bug/i
  - body: /wip/i
    negate: true
```

잘못된 예시:

```yaml
conditions:
  - title: /bug/i
    body: /error/i # 속성이 2개라서 에러 발생
```

### 5.1 이벤트별 지원 속성

| 속성            | 이슈 | PR  | 허용 값 타입(우선순위)   |
| --------------- | ---- | --- | ------------------------ |
| `title`         | O    | O   | `regex`                  |
| `body`          | O    | O   | `regex`                  |
| `author`        | O    | O   | `regex`, `string`        |
| `base-branch`   | X    | O   | `regex`, `string`        |
| `head-branch`   | X    | O   | `regex`, `string`        |
| `draft`         | X    | O   | `boolean`                |
| `changed-lines` | X    | O   | `numeric-comparison`     |
| `changed-files` | X    | O   | `glob-pattern`, `string` |

### 5.2 속성

#### title

- 이슈/PR 제목(`issue.title`, `pullRequest.title`)을 대상으로 검사합니다.

#### body

- 이슈/PR 본문(`issue.body`, `pullRequest.body`)을 대상으로 검사합니다.
- 본문이 비어 있으면, 본문 값은 빈 문자열(`''`)로 처리한 뒤 평가합니다.

#### author

- 이슈/PR 작성자 로그인 이름(`issue.author.login`, `pullRequest.author.login`)을 대상으로 검사합니다.

#### base-branch

- PR의 대상(base) 브랜치 이름(`pullRequest.baseRefName`)을 검사합니다.

#### head-branch

- PR의 소스(head) 브랜치 이름(`pullRequest.headRefName`)을 검사합니다.

#### draft

- PR이 드래프트 상태인지(`pullRequest.isDraft`)를 검사합니다.

#### changed-lines

- PR 총 변경 줄 수(`pullRequest.additions + pullRequest.deletions`)를 기준으로 검사합니다.
- 즉, PR에서 추가된 줄 수와 삭제된 줄 수를 합한 값입니다.

#### changed-files

- PR 변경 파일 경로 목록을 기준으로 검사합니다.
- 각 파일 경로를 하나씩 검사하며, 하나라도 일치하면 조건은 참이 됩니다.

### 5.3 값 타입

#### regex

- 형식: `/pattern/flags` 문자열
- 예시: `/bug/i`, `/^release\//`

#### string

- 완전 일치 비교(`===`)입니다.
- 정규식처럼 해석되지 않습니다.

#### boolean

- `true` 또는 `false`

#### glob-pattern

- `is-glob`가 glob 패턴으로 인식한 문자열만 `glob-pattern`으로 처리합니다.
- 예시: `src/**/*.ts`, `**/*.md`

#### numeric-comparison

- 형식: `연산자 + 정수` (연산자 뒤 공백은 선택 사항)
- 연산자: `>`, `>=`, `<`, `<=`, `==`, `!=`
- 예시: `'>10'`, `'>= 200'`, `'==0'`, `'!= 3'`
- 정수만 허용합니다. 음수와 소수는 지원하지 않습니다.

### 5.4 negate 옵션

- 모든 조건에 `negate`를 추가할 수 있습니다.
- `negate: true`를 추가하면 조건 결과가 반전됩니다.

### 5.5 값 타입 파싱 우선순위

허용 값 타입이 2개 이상일 경우, [이벤트별 지원 속성](#51-이벤트별-지원-속성) 표에 명시된 순서대로 우선순위가 적용됩니다.

예를 들어, `author`는 `regex` -> `string` 순서로 해석됩니다.

- `author: /octo.*/`로 작성하면 정규 표현식으로 평가됩니다.
- `author: octocat`로 작성하면 문자열 정확 일치로 평가됩니다.

예를 들어, `changed-files`는 `glob-pattern` -> `string` 순서로 해석됩니다.

- `changed-files: 'src/**/*.ts'`로 작성하면 glob 패턴으로 평가됩니다.
- `changed-files: 'README.md'`로 작성하면 문자열 정확 일치로 평가됩니다.

<br>

## 6. 설정 검증에서 에러가 발생하는 경우

아래는 파싱 단계에서 실패하는 대표적인 경우입니다.

- 루트에 허용되지 않은 키 추가
- `settings`, `rules`, 각 규칙, 각 매치, 각 조건에 허용되지 않은 키 추가
- 지원되지 않는 이벤트 키 사용
- 같은 이벤트 버킷 내 중복 레이블
- 잘못된 `onMissingLabel` 값 사용
- 지원되지 않는 조건 속성 사용
- 조건 속성을 0개 또는 2개 이상 작성
- `matches`를 빈 배열로 작성
- `conditions`를 빈 배열로 작성
- 조건 값 형식이 해당 속성의 허용 타입과 맞지 않음

<br>

## 7. 실전 예시

### 7.1 봇이 발생시킨 이벤트만 선택적으로 허용

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

### 7.2 특정 문자열을 제외하는 negate 조건

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

### 7.3 `changed-files`에서 `glob-pattern`과 `string` 혼합

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

### 7.4 `author`에서 `regex`와 `string` 혼합

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

## 8. 자주 하는 실수

- 하나의 조건에 속성 2개 이상 작성
- `regex` 조건을 일반 문자열로 작성하거나 `/pattern/flags` 형식을 지키지 않음
- `numeric-comparison` 조건에 잘못된 비교식을 사용함(소수/음수, 잘못된 연산자 등)
