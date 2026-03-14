import type { Immutable } from '../types/common.js'
import type { PullRequestContext } from '../types/context.js'

export interface IConditionResolveService {
  resolveChangedFiles(context: Immutable<PullRequestContext>): Promise<string[]>
}
