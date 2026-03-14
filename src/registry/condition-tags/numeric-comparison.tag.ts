import { ConditionValueTagType } from '../../types/condition-enum.js'
import { defineConditionValueTag } from '../../utils/condition-definition.utils.js'
import { getEnumValueByValue } from '../../utils/enum.utils.js'

const TYPE = ConditionValueTagType.NumericComparison
type ExpectedRawValue = string
type ExpectedValue = NumericComparisonExpression
type ActualValue = number

export const NumericComparisonTag = defineConditionValueTag<
  ExpectedRawValue,
  ExpectedValue,
  ActualValue
>({
  type: TYPE,

  canParse: (raw): raw is ExpectedRawValue => typeof raw === 'string' && COMPARISON_REGEX.test(raw),

  parse(raw) {
    const match = raw.match(COMPARISON_REGEX)
    if (!match) {
      throw new Error(`Expected comparison operator and number: ${raw}`)
    }

    const [, op, num] = match
    return {
      operator: getEnumValueByValue(NumericComparisonOperator, op),
      value: Number(num)
    }
  },

  evaluate(actual, expected) {
    return operatorFnMap[expected.operator](actual, expected.value)
  }
})

// ============================================================================
// 🔸 Internal Helpers
// ============================================================================

/**
 * Comparison operator + numeric expression (e.g., >= 100).
 */
interface NumericComparisonExpression {
  operator: NumericComparisonOperator
  value: number
}

/**
 * Numeric comparison operators.
 */
enum NumericComparisonOperator {
  Gt = '>',
  Gte = '>=',
  Lt = '<',
  Lte = '<=',
  Eq = '==',
  Neq = '!='
}

const operatorFnMap = {
  [NumericComparisonOperator.Gt]: (a: number, b: number) => a > b,
  [NumericComparisonOperator.Gte]: (a: number, b: number) => a >= b,
  [NumericComparisonOperator.Lt]: (a: number, b: number) => a < b,
  [NumericComparisonOperator.Lte]: (a: number, b: number) => a <= b,
  [NumericComparisonOperator.Eq]: (a: number, b: number) => a === b,
  [NumericComparisonOperator.Neq]: (a: number, b: number) => a !== b
} satisfies Record<NumericComparisonOperator, (a: number, b: number) => boolean>

/**
 * Regular expression for parsing a comparison operator and numeric value.
 * - Matches longer operators first (>=, <=, ==, !=, >, <)
 */
const COMPARISON_REGEX: RegExp = (() => {
  const ops = Object.values(NumericComparisonOperator)
    .sort((a, b) => b.length - a.length) // longer first
    .map((op) => op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  return new RegExp(`^(${ops})\\s*(\\d+)$`)
})()
