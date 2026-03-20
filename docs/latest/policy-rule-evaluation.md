# Rule Evaluation Policy

English | [한국어](/docs/latest/policy-rule-evaluation.ko.md)

The evaluation step evaluates the configured rules (`Rule`) and determines whether each label should be added, removed,
or kept.

- A condition (`Condition`) is evaluated and returns `true`/`false`.
  - It checks whether the condition is satisfied and determines the result with the `negate` option.
- A match (`Match`) is evaluated and returns `pass`/`fail`/`skip`.
  - It determines whether to evaluate or skip the match with the `skipIfBot` option.
  - It determines whether the match succeeds or fails from the condition evaluation results and the operator
    (`any`/`all`).
- A rule (`Rule`) is evaluated and returns `add`/`remove`/`keep`.
  - It determines the result from the match evaluation results and the `removeUnmatchedLabels` option.

## Short-Circuit Evaluation

- Within a match, conditions are short-circuited according to `operator: any/all`.
- Within a rule, if one match passes, the remaining matches do not need to be evaluated.

## `skipIfBot` Option Policy

> [!NOTE]
>
> See [`skipIfBot`](/docs/latest/configuration-guide.md#31-skipifbot).

## `removeUnmatchedLabels` Option Policy

> [!NOTE]
>
> See [`removeUnmatchedLabels`](/docs/latest/configuration-guide.md#32-removeunmatchedlabels).

## Cases by Rule Result

### `add`

- When at least one match is `pass`, regardless of the `removeUnmatchedLabels` option

### `remove`

- When `removeUnmatchedLabels: true`, at least one evaluated (non-skip) match exists, and all of them are `fail`

### `keep`

- When all matches are `skip`, regardless of the `removeUnmatchedLabels` option
- When `removeUnmatchedLabels: false` and the matches are `fail` or `skip` (that is, there is no `pass` match)
