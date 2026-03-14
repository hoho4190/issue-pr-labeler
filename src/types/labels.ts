export interface Label {
  /** Label name used for actual API calls, output, and creation. */
  name: string

  /** Lowercased name used for comparison and deduplication. */
  norm: string
}

export interface RepositoryLabelDiff {
  /** All labels that exist in the repository. */
  all: Label[]

  /** Labels defined in the config but missing from the repository. */
  missing: Label[]
}

export interface LabelEvaluationResult {
  toAdd: string[]
  toRemove: string[]
  toKeep: string[]
}

export enum LabelAction {
  Add = 'Add',
  Remove = 'Remove',
  None = 'None'
}

export enum LabelActionResult {
  Success = 'Success',
  Failed = 'Failed',

  /** Tried to add/remove, but skipped due to policy or current state. */
  Skipped = 'Skipped',

  /** Does nothing because it is not a target for add/remove. */
  Noop = 'Noop'
}

export enum LabelActionReason {
  // == Policy-related
  // Added after being created because the label did not exist in the repository
  // and the onMissingLabel=create policy was applied.
  MissingLabelCreatePolicy = 'missing_label_create_policy',
  // Skipped because the label did not exist in the repository
  // and the onMissingLabel=skip policy was applied.
  MissingLabelSkipPolicy = 'missing_label_skip_policy',

  // == State-related
  // Not executed because the label was already present on the issue or pull request
  // during a label add operation.
  AlreadyPresent = 'already_present',
  // Not executed because the label was already absent from the issue or pull request
  // during a label remove operation.
  AlreadyAbsent = 'already_absent',

  // == Error-related
  // 404 error.
  // For example, when attempting to remove a label that does not exist in the repository
  // or a label that is not attached to the issue or pull request.
  Http404NotFound = 'http_404_not_found',
  // 422 error (validation error).
  // For example, when attempting to add an empty label
  // or add/remove a repository label with extra surrounding whitespace.
  Http422ValidationFailed = 'http_422_validation_failed',
  // Other general API errors.
  ApiError = 'api_error'

  // == Note
  // If both MissingLabelSkipPolicy and AlreadyAbsent are possible,
  // MissingLabelSkipPolicy takes precedence.
}

export interface LabelOperationResult extends Label {
  action: LabelAction
  result: LabelActionResult
  reason?: LabelActionReason
  simulatedByDryRun: boolean
}
