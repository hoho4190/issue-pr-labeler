import { EventType } from '../../types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionProperty } from '../../utils/condition-definition.utils.js'
import { assertPullRequestContext } from '../../utils/context.utils.js'

const TYPE = ConditionPropertyType.BaseBranch
const ALLOWED_EVENTS = [EventType.PullRequest] as const
const ALLOWED_TAGS = [ConditionValueTagType.Regex, ConditionValueTagType.String] as const
type ResolvedValue = string

export const BaseBranchProperty = defineConditionProperty({
  type: TYPE,
  allowedEvents: ALLOWED_EVENTS,
  allowedTags: ALLOWED_TAGS,

  resolve(context, _conditionResolveService): ResolvedValue {
    assertPullRequestContext(context)
    return context.pullRequest.baseBranch
  },

  evaluateTag: {
    [ConditionValueTagType.Regex]: (tag, resolved, expected) => tag.evaluate(resolved, expected),

    [ConditionValueTagType.String]: (tag, resolved, expected) => tag.evaluate(resolved, expected)
  }
})
