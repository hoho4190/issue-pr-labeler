import { EventType, type Immutable } from '../../types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionProperty } from '../../utils/condition-definition.utils.js'
import type { Context, IssueContext, PullRequestContext } from '../../types/context.js'

const TYPE = ConditionPropertyType.Body
const ALLOWED_EVENTS = [EventType.Issue, EventType.PullRequest] as const
const ALLOWED_TAGS = [ConditionValueTagType.Regex] as const
type ResolvedValue = string

export const BodyProperty = defineConditionProperty({
  type: TYPE,
  allowedEvents: ALLOWED_EVENTS,
  allowedTags: ALLOWED_TAGS,

  resolve: (context, _conditionResolveService): ResolvedValue =>
    bodyResolver[context.eventType](context),

  evaluateTag: (tag, resolved, expected) => tag.evaluate(resolved, expected)
})

// ============================================================================
// 🔸 Internal Helpers
// ============================================================================

type Resolver = (context: Immutable<Context>) => ResolvedValue

const bodyResolver = {
  [EventType.Issue]: (context: Immutable<Context>) => (context as IssueContext).issue.body ?? '',
  [EventType.PullRequest]: (context: Immutable<Context>) =>
    (context as PullRequestContext).pullRequest.body ?? ''
} satisfies Record<EventType, Resolver>
