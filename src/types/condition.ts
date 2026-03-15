import type { EventType, Immutable, MaybePromise } from './common.js'
import type { ConditionPropertyType, ConditionValueTagType } from './condition-enum.js'
import type { Context } from './context.js'
import type {
  ConditionPropertyFromRegistry,
  ConditionValueTagFromRegistry
} from '../registry/condition.registry.js'
import type { IConditionResolveService } from '../services/condition-resolve.service.interface.js'

// ============================================================================
// 🔹 Public
// ============================================================================

/**
 * ConditionValueTag interface
 *
 * @template TExpectedRawValue - Raw value type before expected parsing
 * @template TExpectedValue    - Expected value type
 * @template TActualValue      - Actual value type
 */
export interface ConditionValueTag<TExpectedRawValue, TExpectedValue, TActualValue> {
  /**
   * Unique identifier for this tag.
   */
  type: ConditionValueTagType

  /**
   * Determines whether the given raw value can be parsed into `TExpectedValue`.
   *
   * @param raw - Input value of unknown type to verify for parsing.
   * @returns True if the value can be safely parsed as `TExpectedValue`; otherwise false.
   */
  canParse(raw: unknown): raw is TExpectedRawValue

  /**
   * Parses the given raw value into a validated `TExpectedValue`.
   *
   * @param raw - Raw value previously verified by {@link canParse}.
   * @returns Parsed and normalized value of type `TExpectedValue`.
   * @throws If the raw value cannot be parsed into a valid `TExpectedValue`.
   */
  parse(raw: TExpectedRawValue): TExpectedValue

  /**
   * Evaluates whether the given `actual` value satisfies the expected condition.
   *
   * @param actual   - Value to evaluate.
   * @param expected - Expected condition value of type `TExpectedValue`.
   * @returns True if the `actual` value satisfies the expected condition; otherwise false.
   */
  evaluate(actual: TActualValue, expected: TExpectedValue): boolean
}

/**
 * ConditionProperty interface
 *
 * @template TAllowedEvents - Allowed `EventType` list
 * @template TAllowedTags   - Allowed `ConditionValueTagType` list with order as priority
 * @template TResolvedValue - Resolved value type determined by 'ConditionProperty'
 *
 * @see {@link EventType}, {@link ConditionValueTagType}, {@link ConditionProperty}
 */
export interface ConditionProperty<
  TAllowedEvents extends readonly EventType[],
  TAllowedTags extends readonly ConditionValueTagType[],
  TResolvedValue
> {
  /**
   * Unique identifier for this property.
   */
  type: ConditionPropertyType

  /**
   * {@link EventType} list available for this property.
   */
  allowedEvents: TAllowedEvents

  /**
   * {@link ConditionValueTagType} list available for this property.
   * The order defines the parse priority when multiple tags are present.
   */
  allowedTags: TAllowedTags

  /**
   * Resolves the contextual value for this property.
   *
   * @param context                 - Event context
   * @param conditionResolveService - Condition resolve service
   * @returns The resolved value, either synchronously or asynchronously.
   */
  resolve(
    context: Immutable<Context>,
    conditionResolveService: IConditionResolveService
  ): MaybePromise<TResolvedValue>

  /**
   * Uses the specified {@link ConditionValueTag} to evaluate whether
   * the resolved property value satisfies the expected condition.
   *
   * @template TTagType - `ConditionValueTagType` drawn from `TAllowedTags` used for evaluation
   * @param tag         - {@link ConditionValueTag} to evaluate
   * @param resolved    - Resolved value returned from {@link resolve}.
   * @param expected    - Expected value to pass to the {@link ConditionValueTag.evaluate()}
   * @returns True if the resolved value satisfies the condition; otherwise false.
   */
  evaluateTag<TTagType extends TAllowedTags[number]>(
    tag: ConditionValueTagFromRegistry<TTagType>,
    resolved: TResolvedValue,
    expected: ConditionValueTagExpectedValue<TTagType>
  ): boolean
}

/**
 * Discriminated union of all supported condition shapes across every
 * {@link ConditionPropertyType} and its allowed {@link ConditionValueTagType}s.
 *
 * Each variant is produced by {@link ConditionFromProperty} and contains:
 * - `propertyType`: the {@link ConditionPropertyType} being evaluated
 * - `tagType`: the {@link ConditionValueTagType} used to evaluate the property
 * - `expected`: the {@link ConditionValueTagExpectedValue} for the chosen {@link ConditionValueTagType}
 * - `negate`: whether to negate the evaluation result
 *
 * @example
 * ```ts
 * // Examples of possible variants in this union:
 * // draft check
 * {
 *   propertyType: ConditionPropertyType.IsDraft,
 *   tagType: ConditionValueTagType.Boolean,
 *   expected: true,
 *   negate: false
 * }
 *
 * // title regex check
 * {
 *   propertyType: ConditionPropertyType.Title,
 *   tagType: ConditionValueTagType.Regex,
 *   expected: /WIP/i,
 *   negate: true
 * }
 * ```
 */
export type Condition = {
  [TPropertyType in ConditionPropertyType]: ConditionFromProperty<TPropertyType>
}[ConditionPropertyType]

// ============================================================================
// 🔹 Helpers
// ============================================================================

/**
 * Maps each {@link ConditionValueTagType} to its corresponding `ExpectedRawValue` type.
 *
 * @example
 * ```ts
 * // ConditionValueTagType.NumericComparison → string
 * type ExpectedRawValue = ConditionValueTagExpectedRawValueMap[ConditionValueTagType.NumericComparison]
 * ```
 */
type ConditionValueTagExpectedRawValueMap = Readonly<{
  [TTagType in ConditionValueTagType]: ConditionValueTagFromRegistry<TTagType> extends ConditionValueTag<
    infer TExpectedRawValue,
    infer _TExpectedValue,
    infer _TActualValue
  >
    ? TExpectedRawValue
    : never
}>

/**
 * Extracts the `ExpectedRawValue` type associated with the given {@link ConditionValueTagType}.
 *
 * @template TTagType - Tag type to extract `ExpectedRawValue` for
 *
 * @example
 * ```ts
 * // ConditionValueTagType.NumericComparison → string
 * type ExpectedRawValue = ConditionValueTagExpectedRawValue<ConditionValueTagType.NumericComparison>
 * ```
 */
export type ConditionValueTagExpectedRawValue<TTagType extends ConditionValueTagType> =
  ConditionValueTagExpectedRawValueMap[TTagType]

/**
 * Maps each {@link ConditionValueTagType} to its corresponding `ExpectedValue` type.
 *
 * @example
 * ```ts
 * // ConditionValueTagType.NumericComparison → NumericComparisonExpression
 * type ExpectedValue = ConditionValueTagExpectedValueMap[ConditionValueTagType.NumericComparison]
 * ```
 */
type ConditionValueTagExpectedValueMap = Readonly<{
  [TTagType in ConditionValueTagType]: ConditionValueTagFromRegistry<TTagType> extends ConditionValueTag<
    infer _TExpectedRawValue,
    infer TExpectedValue,
    infer _TActualValue
  >
    ? TExpectedValue
    : never
}>

/**
 * Extracts the `ExpectedValue` type associated with the given {@link ConditionValueTagType}.
 *
 * @template TTagType - Tag type to extract `ExpectedValue` for
 *
 * @example
 * ```ts
 * // ConditionValueTagType.NumericComparison → NumericComparisonExpression
 * type ExpectedValue = ConditionValueTagExpectedValue<ConditionValueTagType.NumericComparison>
 * ```
 */
export type ConditionValueTagExpectedValue<TTagType extends ConditionValueTagType> =
  ConditionValueTagExpectedValueMap[TTagType]

/**
 * Maps each {@link ConditionValueTagType} to its corresponding `ActualValue` type.
 *
 * @example
 * ```ts
 * // ConditionValueTagType.NumericComparison → number
 * type ActualValue = ConditionValueTagActualValueMap[ConditionValueTagType.NumericComparison]
 * ```
 */
type ConditionValueTagActualValueMap = Readonly<{
  [TTagType in ConditionValueTagType]: ConditionValueTagFromRegistry<TTagType> extends ConditionValueTag<
    infer _TExpectedRawValue,
    infer _TExpectedValue,
    infer TActualValue
  >
    ? TActualValue
    : never
}>

/**
 * Extracts the `ActualValue` type associated with the given {@link ConditionValueTagType}.
 *
 * @template TTagType - Tag type to extract `ActualValue` for
 *
 * @example
 * ```ts
 * // ConditionValueTagType.NumericComparison → number
 * type ActualValue = ConditionValueTagActualValue<ConditionValueTagType.NumericComparison>
 * ```
 */
export type ConditionValueTagActualValue<TTagType extends ConditionValueTagType> =
  ConditionValueTagActualValueMap[TTagType]

/**
 * Extracts the union of allowed {@link ConditionValueTagType} for the given
 * {@link ConditionPropertyType} from the property registry.
 *
 * The resulting type is the union of all tag types listed in the
 * {@link ConditionProperty.allowedTags} for that property.
 *
 * @template TPropertyType - Property type to extract the allowed tag union for
 *
 * @example
 * ```ts
 * // ConditionPropertyType.ChangedFiles → union of allowed tags (e.g., GlobPattern | String)
 * type AllowedTags = ConditionPropertyAllowedTagType<ConditionPropertyType.ChangedFiles>
 * ```
 */
type ConditionPropertyAllowedTagType<TPropertyType extends ConditionPropertyType> =
  ConditionPropertyFromRegistry<TPropertyType>['allowedTags'][number]

/**
 * Expands a {@link ConditionPropertyType} into the concrete condition shape(s)
 * for each allowed {@link ConditionValueTagType} of that property.
 *
 * The result is a discriminated union fragment with the following fields:
 * - `propertyType`: the given {@link ConditionPropertyType}
 * - `tagType`: one of the property's allowed {@link ConditionValueTagType}
 * - `expected`: the corresponding {@link ConditionValueTagExpectedValue} for `tagType`
 * - `negate`: whether to negate the evaluation result
 *
 * @template TPropertyType - Property type to expand into condition shape(s)
 *
 * @example
 * ```ts
 * // For a property that only allows the Boolean tag
 * type DraftCond = ConditionFromProperty<ConditionPropertyType.IsDraft>
 * // → {
 * //     propertyType: ConditionPropertyType.IsDraft
 * //     tagType: ConditionValueTagType.Boolean
 * //     expected: boolean
 * //     negate: boolean
 * //   }
 * ```
 */
type ConditionFromProperty<TPropertyType extends ConditionPropertyType> =
  ConditionPropertyAllowedTagType<TPropertyType> extends infer TTagType
    ? TTagType extends ConditionValueTagType
      ? {
          propertyType: TPropertyType
          tagType: TTagType
          expected: ConditionValueTagExpectedValue<TTagType>
          negate: boolean
        }
      : never
    : never
