import { EventType, type Immutable } from '../../types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionProperty } from '../../utils/condition-definition.utils.js'
import type { Context, IssueContext, PullRequestContext } from '../../types/context.js'

const TYPE = ConditionPropertyType.Actor
const ALLOWED_EVENTS = [EventType.Issue, EventType.PullRequest] as const
const ALLOWED_TAGS = [ConditionValueTagType.Regex, ConditionValueTagType.String] as const
type ResolvedValue = string

export const ActorProperty = defineConditionProperty({
  type: TYPE,
  allowedEvents: ALLOWED_EVENTS,
  allowedTags: ALLOWED_TAGS,

  resolve: (context, _conditionResolveService): ResolvedValue =>
    actorResolver[context.eventType](context),

  evaluateTag: {
    [ConditionValueTagType.Regex]: (tag, resolved, expected) => tag.evaluate(resolved, expected),

    [ConditionValueTagType.String]: (tag, resolved, expected) => tag.evaluate(resolved, expected)
  }
})

// ============================================================================
// 🔸 Internal Helpers
// ============================================================================

type Resolver = (context: Immutable<Context>) => ResolvedValue

const actorResolver = {
  [EventType.Issue]: (context: Immutable<Context>) => (context as IssueContext).actor,
  [EventType.PullRequest]: (context: Immutable<Context>) => (context as PullRequestContext).actor
} satisfies Record<EventType, Resolver>
