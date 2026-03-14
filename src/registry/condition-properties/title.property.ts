import { EventType, type Immutable } from '../../types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionProperty } from '../../utils/condition-definition.utils.js'
import type { Context, IssueContext, PullRequestContext } from '../../types/context.js'

const TYPE = ConditionPropertyType.Title
const ALLOWED_EVENTS = [EventType.Issue, EventType.PullRequest] as const
const ALLOWED_TAGS = [ConditionValueTagType.Regex] as const
type ResolvedValue = string

export const TitleProperty = defineConditionProperty({
  type: TYPE,
  allowedEvents: ALLOWED_EVENTS,
  allowedTags: ALLOWED_TAGS,

  resolve: (context, _conditionResolveService): ResolvedValue =>
    titleResolver[context.eventType](context),

  evaluateTag: (tag, resolved, expected) => tag.evaluate(resolved, expected)
})

// ============================================================================
// 🔸 Internal Helpers
// ============================================================================

type Resolver = (context: Immutable<Context>) => ResolvedValue

const titleResolver = {
  [EventType.Issue]: (context: Immutable<Context>) => (context as IssueContext).issue.title,
  [EventType.PullRequest]: (context: Immutable<Context>) =>
    (context as PullRequestContext).pullRequest.title
} satisfies Record<EventType, Resolver>
