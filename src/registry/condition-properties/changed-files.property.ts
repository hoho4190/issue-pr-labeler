import { EventType } from '../../types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionProperty } from '../../utils/condition-definition.utils.js'
import { assertPullRequestContext } from '../../utils/context.utils.js'

const TYPE = ConditionPropertyType.ChangedFiles
const ALLOWED_EVENTS = [EventType.PullRequest] as const
const ALLOWED_TAGS = [ConditionValueTagType.GlobPattern, ConditionValueTagType.String] as const
type ResolvedValue = string[]

export const ChangedFilesProperty = defineConditionProperty({
  type: TYPE,
  allowedEvents: ALLOWED_EVENTS,
  allowedTags: ALLOWED_TAGS,

  async resolve(context, conditionResolveService): Promise<ResolvedValue> {
    assertPullRequestContext(context)
    return await conditionResolveService.resolveChangedFiles(context)
  },

  evaluateTag: {
    [ConditionValueTagType.GlobPattern]: (tag, resolved, expected) =>
      resolved.some((actual) => tag.evaluate(actual, expected)),

    [ConditionValueTagType.String]: (tag, resolved, expected) =>
      resolved.some((actual) => tag.evaluate(actual, expected))
  }
})
