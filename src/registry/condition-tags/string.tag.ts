import { ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionValueTag } from '../../utils/condition-definition.utils.js'

const TYPE = ConditionValueTagType.String
type ExpectedRawValue = string
type ExpectedValue = string
type ActualValue = string

export const StringTag = defineConditionValueTag<ExpectedRawValue, ExpectedValue, ActualValue>({
  type: TYPE,

  canParse: (raw): raw is ExpectedRawValue => typeof raw === 'string',

  parse: (raw) => raw,

  evaluate: (actual, expected) => actual === expected
})
