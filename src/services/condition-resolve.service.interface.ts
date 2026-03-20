import type { Immutable } from '../types/common.js'
import type { PullRequestContext } from '../types/context.js'

export interface IConditionResolveService {
  resolveChangedFiles(context: Immutable<PullRequestContext>): Promise<string[]>
  resolveCommitMessages(context: Immutable<PullRequestContext>): Promise<string[]>
  resolveCommitMessageSubjects(context: Immutable<PullRequestContext>): Promise<string[]>
  resolveCommitMessageBodies(context: Immutable<PullRequestContext>): Promise<string[]>
}
