import { AuthorProperty } from './condition-properties/author.property.js'
import { BaseBranchProperty } from './condition-properties/base-branch.property.js'
import { BodyProperty } from './condition-properties/body.property.js'
import { ChangedFilesProperty } from './condition-properties/changed-files.property.js'
import { ChangedLinesProperty } from './condition-properties/changed-lines.property.js'
import { HeadBranchProperty } from './condition-properties/head-branch.property.js'
import { IsDraftProperty } from './condition-properties/is-draft.property.js'
import { TitleProperty } from './condition-properties/title.property.js'
import { BooleanTag } from './condition-tags/boolean.tag.js'
import { GlobPatternTag } from './condition-tags/glob-pattern.tag.js'
import { NumericComparisonTag } from './condition-tags/numeric-comparison.tag.js'
import { RegexTag } from './condition-tags/regex.tag.js'
import { StringTag } from './condition-tags/string.tag.js'
import type { EventType } from '../types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../types/condition-enum.js'
import type { ConditionProperty, ConditionValueTag } from '../types/condition.js'

// ============================================================================
// 🔸 Condition Registry
// ============================================================================

/**
 * ConditionValueTag registry
 */
const CONDITION_VALUE_TAG_REGISTRY = createConditionValueTagRegistry({
  [ConditionValueTagType.Boolean]: BooleanTag,
  [ConditionValueTagType.String]: StringTag,
  [ConditionValueTagType.Regex]: RegexTag,
  [ConditionValueTagType.GlobPattern]: GlobPatternTag,
  [ConditionValueTagType.NumericComparison]: NumericComparisonTag
} as const)

/**
 * ConditionProperty registry
 */
const CONDITION_PROPERTY_REGISTRY = createConditionPropertyRegistry({
  [ConditionPropertyType.Title]: TitleProperty,
  [ConditionPropertyType.Body]: BodyProperty,
  [ConditionPropertyType.Author]: AuthorProperty,
  [ConditionPropertyType.BaseBranch]: BaseBranchProperty,
  [ConditionPropertyType.HeadBranch]: HeadBranchProperty,
  [ConditionPropertyType.IsDraft]: IsDraftProperty,
  [ConditionPropertyType.ChangedLines]: ChangedLinesProperty,
  [ConditionPropertyType.ChangedFiles]: ChangedFilesProperty
} as const)

// ============================================================================
// 🔹 Helpers
// ============================================================================

/**
 * Generic upper bound type ensuring compatibility with {@link ConditionValueTag}
 */
export type ConditionValueTagBase = ConditionValueTag<unknown, unknown, unknown>

/**
 * Generic upper bound type ensuring compatibility with {@link ConditionProperty}
 */
export type ConditionPropertyBase = ConditionProperty<
  readonly EventType[],
  readonly ConditionValueTagType[],
  unknown
>

/**
 * Extracts a {@link ConditionValueTag} type from the registry by {@link ConditionValueTagType}
 *
 * @example
 * ```ts
 * // ConditionValueTagType.String → typeof StringTag
 * type StringTagFromRegistry = ConditionValueTagFromRegistry<ConditionValueTagType.String>
 * ```
 */
export type ConditionValueTagFromRegistry<TTagType extends ConditionValueTagType> =
  ConditionValueTagRegistry[TTagType]

/**
 * Extracts a {@link ConditionProperty} type from the registry by {@link ConditionPropertyType}
 *
 * @example
 * ```ts
 * // ConditionPropertyType.Title → typeof TitleProperty
 * type TitlePropertyFromRegistry = ConditionPropertyFromRegistry<ConditionPropertyType.Title>
 * ```
 */
export type ConditionPropertyFromRegistry<TPropertyType extends ConditionPropertyType> =
  ConditionPropertyRegistry[TPropertyType]

/**
 * Returns the {@link ConditionValueTag} registered for the given {@link ConditionValueTagType}.
 *
 * @param type - {@link ConditionValueTagType} to look up.
 * @returns Corresponding {@link ConditionValueTag} from the registry.
 *
 * @example
 * ```ts
 * // ConditionValueTagType.String → StringTag
 * const stringTag: typeof StringTag = getConditionValueTag(ConditionValueTagType.String)
 * ```
 */
export function getConditionValueTag<TTagType extends ConditionValueTagType>(
  type: TTagType
): ConditionValueTagFromRegistry<TTagType> {
  return CONDITION_VALUE_TAG_REGISTRY[type]
}

/**
 * Returns the {@link ConditionProperty} registered for the given {@link ConditionPropertyType}.
 *
 * @param type - {@link ConditionPropertyType} to look up.
 * @returns Corresponding {@link ConditionProperty} from the registry.
 *
 * @example
 * ```ts
 * // ConditionPropertyType.Title → TitleProperty
 * const titleProperty: typeof TitleProperty = getConditionProperty(ConditionPropertyType.Title)
 * ```
 */
export function getConditionProperty<TPropertyType extends ConditionPropertyType>(
  type: TPropertyType
): ConditionPropertyFromRegistry<TPropertyType> {
  return CONDITION_PROPERTY_REGISTRY[type]
}

// ============================================================================
// 🔸 Internal Helpers
// ============================================================================

/**
 * ConditionValueTag registry type
 */
type ConditionValueTagRegistry = typeof CONDITION_VALUE_TAG_REGISTRY

/**
 * ConditionProperty registry type
 */
type ConditionPropertyRegistry = typeof CONDITION_PROPERTY_REGISTRY

/**
 * Compile-time guard to ensure every {@link ConditionValueTagType} key is represented
 */
type EnsureAllTagsCovered<TRegistry extends Record<ConditionValueTagType, ConditionValueTagBase>> =
  Exclude<ConditionValueTagType, keyof TRegistry> extends never ? TRegistry : never

/**
 * Compile-time guard to ensure every {@link ConditionPropertyType} key is represented
 */
type EnsureAllPropertiesCovered<
  TRegistry extends Record<ConditionPropertyType, ConditionPropertyBase>
> = Exclude<ConditionPropertyType, keyof TRegistry> extends never ? TRegistry : never

/**
 * Helper that enforces the enum coverage check
 * while preserving each {@link ConditionValueTag} implementation’s concrete typing
 */
function createConditionValueTagRegistry<
  const T extends Record<ConditionValueTagType, ConditionValueTagBase>
>(registry: EnsureAllTagsCovered<T>) {
  return registry
}

/**
 * Helper that enforces the enum coverage check
 * while preserving each {@link ConditionProperty} implementation’s concrete typing
 */
function createConditionPropertyRegistry<
  const T extends Record<ConditionPropertyType, ConditionPropertyBase>
>(registry: EnsureAllPropertiesCovered<T>) {
  return registry
}
