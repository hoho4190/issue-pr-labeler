import { EventType, type Immutable } from '../types/common.js'
import type { Context, IssueContext, PullRequestContext } from '../types/context.js'

// ============================================================================
// 🔹 Public
// ============================================================================

export function assertIssueContext(context: Immutable<Context>): asserts context is IssueContext {
  if (context.eventType == EventType.Issue) {
    return
  }

  throw new Error('Accessed issue-only data in a non-issue context.')
}

export function assertPullRequestContext(
  context: Immutable<Context>
): asserts context is PullRequestContext {
  if (context.eventType == EventType.PullRequest) {
    return
  }

  throw new Error('Accessed PR-only data in a non-PR context.')
}
