import isGlob from 'is-glob'
import picomatch from 'picomatch'
import { ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionValueTag } from '../../utils/condition-definition.utils.js'

const TYPE = ConditionValueTagType.GlobPattern
type ExpectedRawValue = string
type ExpectedValue = string
type ActualValue = string

export const GlobPatternTag = defineConditionValueTag<ExpectedRawValue, ExpectedValue, ActualValue>(
  {
    type: TYPE,

    canParse: (raw): raw is ExpectedRawValue => typeof raw === 'string' && isGlob(raw),

    parse: (raw) => raw,

    evaluate(actual, expected) {
      const isMatch = picomatch(expected)
      return isMatch(actual)
    }
  }
)
