import { ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionValueTag } from '../../utils/condition-definition.utils.js'

const TYPE = ConditionValueTagType.Regex
type ExpectedRawValue = string
type ExpectedValue = RegExp
type ActualValue = string

export const RegexTag = defineConditionValueTag<ExpectedRawValue, ExpectedValue, ActualValue>({
  type: TYPE,

  canParse: (raw): raw is ExpectedRawValue => typeof raw === 'string' && isValidRegexString(raw),

  parse: (raw) => parseRegexString(raw),

  evaluate: (actual, expected) => expected.test(actual)
})

// ============================================================================
// 🔸 Internal Helpers
// ============================================================================

/**
 * Checks whether the string is in the '/pattern/flags' format.
 */
function isValidRegexString(value: string): boolean {
  try {
    parseRegexString(value)
    return true
  } catch {
    return false
  }
}

/**
 * Parses a string into a RegExp object.
 * - value: '/pattern/flags'
 */
function parseRegexString(value: string): RegExp {
  const lastSlash = value.lastIndexOf('/')
  if (lastSlash <= 0) throw new Error(`Invalid regex string: ${value}`)

  const pattern = value.slice(1, lastSlash)
  const flags = value.slice(lastSlash + 1)

  return new RegExp(pattern, flags)
}
