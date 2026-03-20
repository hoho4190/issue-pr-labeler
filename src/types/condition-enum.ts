/**
 * Available value tag types for conditions
 */
export enum ConditionValueTagType {
  Boolean = 'boolean', // boolean value
  String = 'string', // plain string
  Regex = 'regex', // regular expression
  GlobPattern = 'glob-pattern', // glob pattern
  NumericComparison = 'numeric-comparison' // numeric comparison (e.g., >=1000)
}

/**
 * Available property types for conditions
 */
export enum ConditionPropertyType {
  Title = 'title',
  Body = 'body',
  Actor = 'actor',
  Author = 'author',
  BaseBranch = 'base-branch',
  HeadBranch = 'head-branch',
  IsDraft = 'draft',
  ChangedLines = 'changed-lines',
  ChangedFiles = 'changed-files',
  CommitMessages = 'commit-messages',
  CommitMessageSubjects = 'commit-message-subjects',
  CommitMessageBodies = 'commit-message-bodies'
}
