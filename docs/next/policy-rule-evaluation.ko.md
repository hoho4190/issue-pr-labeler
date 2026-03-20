# 규칙 평가 정책

[English](/docs/next/policy-rule-evaluation.md) | 한국어

평가 단계는 설정 파일에 작성된 규칙(`Rule`)들을 평가하여 레이블을 추가해야 할지, 제거해야 할지, 유지해야 할지를
결정한다.

- 조건(`Condition`)은 평가되어 `true`/`false`를 리턴한다.
  - 해당 조건이 만족하는지 아닌지 검사하고 `negate` 옵션을 참고하여 결정한다.
- 매치(`Match`)는 평가되어 `pass`/`fail`/`skip`를 리턴한다.
  - `skipIfBot` 옵션으로 매치를 평가할지 스킵할지를 결정한다.
  - 조건들의 평가 결과와 연산자(`any`/`all`)로 매치가 성공했는지 실패했는지 결정한다.
- 규칙(`Rule`)은 평가되어 `add`/`remove`/`keep`를 리턴한다.
  - 매치들의 평가 결과와 `removeUnmatchedLabels` 옵션을 참고하여 결정한다.

## 단축 평가

- 매치에서는 `operator: any/all`에 따라 조건들을 단축 평가한다.
- 규칙에서는 매치 중 하나가 통과하면 나머지 매치들은 평가를 안 해도 된다.

## `skipIfBot` 옵션 정책

> [!NOTE]
>
> [`skipIfBot`](/docs/next/configuration-guide.ko.md#31-skipifbot) 참고

## `removeUnmatchedLabels` 옵션 정책

> [!NOTE]
>
> [`removeUnmatchedLabels`](/docs/next/configuration-guide.ko.md#32-removeunmatchedlabels) 참고

## 규칙 결과별 경우의 수

### `add`

- `removeUnmatchedLabels` 옵션에 상관 없이 매치 중 하나라도 `pass`된 경우

### `remove`

- `removeUnmatchedLabels: true`이고 평가된(non-skip) 매치가 최소 1개 존재하며, 그들이 모두 `fail`일 경우

### `keep`

- `removeUnmatchedLabels` 옵션에 상관 없이 모든 매치들이 `skip`인 경우
- `removeUnmatchedLabels: false`이고 매치들이 `fail` 또는 `skip`인 경우(== `pass`된 매치가 없는 경우)
