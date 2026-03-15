import { EventType } from '../../types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionProperty } from '../../utils/condition-definition.utils.js'
import { assertPullRequestContext } from '../../utils/context.utils.js'

const TYPE = ConditionPropertyType.IsDraft
const ALLOWED_EVENTS = [EventType.PullRequest] as const
const ALLOWED_TAGS = [ConditionValueTagType.Boolean] as const
type ResolvedValue = boolean

export const IsDraftProperty = defineConditionProperty({
  type: TYPE,
  allowedEvents: ALLOWED_EVENTS,
  allowedTags: ALLOWED_TAGS,

  resolve(context, _conditionResolveService): ResolvedValue {
    assertPullRequestContext(context)
    return context.pullRequest.isDraft
  },

  evaluateTag: (tag, resolved, expected) => tag.evaluate(resolved, expected)
})
