import type { ConditionValueTagFromRegistry } from '../registry/condition.registry.js'
import type { EventType, NonEmptyReadonlyArray } from '../types/common.js'
import type { ConditionValueTagType } from '../types/condition-enum.js'
import type {
  ConditionProperty,
  ConditionValueTag,
  ConditionValueTagExpectedValue
} from '../types/condition.js'

// ============================================================================
// 🔹 ConditionValueTag definition
// ============================================================================

type DefineConditionValueTagInput<TExpectedRawValue, TExpectedValue, TActualValue> = Pick<
  ConditionValueTag<TExpectedRawValue, TExpectedValue, TActualValue>,
  'type' | 'canParse' | 'parse' | 'evaluate'
>

/**
 * ConditionValueTag definition helper
 *
 * @template TExpectedRawValue - Raw value type before expected parsing
 * @template TExpectedValue    - Expected value type
 * @template TActualValue      - Actual value type
 */
export function defineConditionValueTag<TExpectedRawValue, TExpectedValue, TActualValue>(
  input: DefineConditionValueTagInput<TExpectedRawValue, TExpectedValue, TActualValue>
): ConditionValueTag<TExpectedRawValue, TExpectedValue, TActualValue> {
  const { type, canParse, parse: parseExpected, evaluate } = input

  return {
    type,
    canParse,
    parse(raw) {
      if (!canParse(raw)) {
        throw new Error(`Invalid ${type} value: ${String(raw)}`)
      }
      return parseExpected(raw)
    },
    evaluate
  }
}

// ============================================================================
// 🔹 ConditionProperty definition
// ============================================================================

type DefineConditionPropertyInput<
  TAllowedEvents extends NonEmptyReadonlyArray<EventType>,
  TAllowedTags extends NonEmptyReadonlyArray<ConditionValueTagType>,
  TResolvedValue
> = Pick<
  ConditionProperty<TAllowedEvents, TAllowedTags, TResolvedValue>,
  'type' | 'allowedEvents' | 'allowedTags' | 'resolve'
> & {
  /**
   * Uses the specified {@link ConditionValueTag} to evaluate whether
   * the resolved property value satisfies the expected condition.
   *
   * @see {@link ConditionProperty.evaluateTag()}
   */
  evaluateTag:
    | ConditionPropertyTagEvaluator<Readonly<TAllowedTags>, TResolvedValue>
    | ConditionPropertyTagEvaluatorMap<Readonly<TAllowedTags>, TResolvedValue>
}

/**
 * ConditionProperty definition helper
 *
 * @template TAllowedEvents - Allowed `EventType` list
 * @template TAllowedTags   - Allowed `ConditionValueTagType` list with order as priority
 * @template TResolvedValue - Resolved value type determined by 'ConditionProperty'
 *
 * @see {@link EventType}, {@link ConditionValueTagType}, {@link ConditionProperty}
 */
export function defineConditionProperty<
  const TAllowedEvents extends NonEmptyReadonlyArray<EventType>,
  const TAllowedTags extends NonEmptyReadonlyArray<ConditionValueTagType>,
  TResolvedValue
>(
  input: DefineConditionPropertyInput<TAllowedEvents, TAllowedTags, TResolvedValue>
): ConditionProperty<Readonly<TAllowedEvents>, Readonly<TAllowedTags>, TResolvedValue> {
  const { allowedTags, allowedEvents, evaluateTag, ...rest } = input

  return {
    ...rest,
    allowedEvents: [...allowedEvents] as Readonly<TAllowedEvents>,
    allowedTags: [...allowedTags] as Readonly<TAllowedTags>,
    evaluateTag: toConditionPropertyEvaluator(evaluateTag)
  }
}

/**
 * Canonical evaluator function signature consumed by {@link ConditionProperty}.
 */
export type ConditionPropertyTagEvaluatorFn<
  TTagType extends ConditionValueTagType,
  TResolvedValue
> = (
  tag: ConditionValueTagFromRegistry<TTagType>,
  resolved: TResolvedValue,
  expected: ConditionValueTagExpectedValue<TTagType>
) => boolean

/**
 * Normalized {@link ConditionPropertyTagEvaluatorFn} used when {@link ConditionProperty}
 * exposes a shared evaluator for multiple tag types.
 */
type ConditionPropertyTagEvaluator<
  TAllowedTags extends NonEmptyReadonlyArray<ConditionValueTagType>,
  TResolvedValue
> = <TTagType extends TAllowedTags[number]>(
  ...args: Parameters<ConditionPropertyTagEvaluatorFn<TTagType, TResolvedValue>>
) => ReturnType<ConditionPropertyTagEvaluatorFn<TTagType, TResolvedValue>>

/**
 * Mapping of {@link ConditionPropertyTagEvaluatorFn} implementations by tag type.
 */
type ConditionPropertyTagEvaluatorMap<
  TAllowedTags extends NonEmptyReadonlyArray<ConditionValueTagType>,
  TResolvedValue
> = {
  [TTagType in TAllowedTags[number]]: ConditionPropertyTagEvaluatorFn<TTagType, TResolvedValue>
}

/**
 * Converts the supplied evaluator into the single-function form expected by {@link ConditionProperty}.
 */
function toConditionPropertyEvaluator<
  const TAllowedTags extends NonEmptyReadonlyArray<ConditionValueTagType>,
  TResolvedValue
>(
  evaluateTagInput:
    | ConditionPropertyTagEvaluator<TAllowedTags, TResolvedValue>
    | ConditionPropertyTagEvaluatorMap<TAllowedTags, TResolvedValue>
): ConditionPropertyTagEvaluator<TAllowedTags, TResolvedValue> {
  if (typeof evaluateTagInput === 'function') {
    return evaluateTagInput
  }

  const evaluators = evaluateTagInput

  return <TTagType extends TAllowedTags[number]>(
    ...args: Parameters<ConditionPropertyTagEvaluatorFn<TTagType, TResolvedValue>>
  ) => {
    const [tag, resolved, expected] = args
    const evaluator = evaluators[tag.type as TTagType] as
      | ConditionPropertyTagEvaluatorFn<TTagType, TResolvedValue>
      | undefined

    if (!evaluator) {
      throw new Error(`Unsupported tag: ${String(tag.type)}`)
    }

    return evaluator(tag, resolved, expected)
  }
}
