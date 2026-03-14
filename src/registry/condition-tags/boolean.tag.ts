import { ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionValueTag } from '../../utils/condition-definition.utils.js'

const TYPE = ConditionValueTagType.Boolean
type ExpectedRawValue = boolean
type ExpectedValue = boolean
type ActualValue = boolean

export const BooleanTag = defineConditionValueTag<ExpectedRawValue, ExpectedValue, ActualValue>({
  type: TYPE,

  canParse: (raw): raw is ExpectedRawValue => typeof raw === 'boolean',

  parse: (raw) => raw,

  evaluate: (actual, expected) => actual === expected
})
