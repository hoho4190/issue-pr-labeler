import { EventType } from '../../types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionProperty } from '../../utils/condition-definition.utils.js'
import { assertPullRequestContext } from '../../utils/context.utils.js'

const TYPE = ConditionPropertyType.CommitMessages
const ALLOWED_EVENTS = [EventType.PullRequest] as const
const ALLOWED_TAGS = [ConditionValueTagType.Regex] as const
type ResolvedValue = string[]

export const CommitMessagesProperty = defineConditionProperty({
  type: TYPE,
  allowedEvents: ALLOWED_EVENTS,
  allowedTags: ALLOWED_TAGS,

  async resolve(context, conditionResolveService): Promise<ResolvedValue> {
    assertPullRequestContext(context)
    return await conditionResolveService.resolveCommitMessages(context)
  },

  evaluateTag: (tag, resolved, expected) =>
    resolved.some((actual) => tag.evaluate(actual, expected))
})
