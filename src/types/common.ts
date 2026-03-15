export type MaybePromise<T> = T | Promise<T>

/**
 * Readonly array type with at least one element.
 */
export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]]

/**
 * Behavior when a label is missing.
 */
export enum OnMissingLabel {
  Create = 'create',
  Skip = 'skip',
  Error = 'error'
}

/**
 * Actor that triggered the event.
 */
export enum ActorType {
  User = 'User',
  Bot = 'Bot'
}

/**
 * Supported GitHub event types.
 */
export enum EventType {
  Issue = 'issues',
  PullRequest = 'pull_request'
}

export const EventTypeDisplay = {
  [EventType.Issue]: 'Issue',
  [EventType.PullRequest]: 'PR'
} satisfies Record<EventType, string>

/**
 * Operators for match conditions.
 */
export enum MatchOperator {
  Any = 'any',
  All = 'all'
}

/**
 * Leaves function types and selected built-in objects unchanged,
 * and recursively applies readonly at the type level to other arrays, tuples, and objects.
 *
 * Built-in collections such as `Map` and `Set` preserve their shape,
 * but their inner elements are not recursively transformed.
 *
 * Note: Do not use this in generic bounds (`extends`).
 * readonly constraints can interfere with type inference and break the expected type relationships.
 *
 * Safe to use in:
 * - function parameter types
 * - function return types
 * - variable or object property types
 *
 * @example
 * ```ts
 * // Recommended usage
 * function freezeValue(value: Immutable<MyType>): void {}
 * function getFrozen(): Immutable<MyType> { ... }
 * const frozen: Immutable<User> = { ... }
 *
 * // Avoid this usage
 * // Type inference can break
 * function process<T extends Immutable<{ id: string }>>(value: T) {}
 * ```
 */
export type Immutable<T> =
  // Leave null unchanged
  T extends null
    ? null
    : // Leave function types unchanged
      T extends (...args: unknown[]) => unknown
      ? T
      : // Preserve empty tuples as-is to keep their length information
        T extends readonly []
        ? readonly []
        : // Recursively transform each tuple element
          T extends readonly [infer Head, ...infer Tail extends readonly unknown[]]
          ? readonly [
              Immutable<Head>,
              ...{
                [K in keyof Tail]: Immutable<Tail[K]>
              }
            ]
          : // Convert arrays to readonly arrays and recursively transform their elements
            T extends readonly (infer U)[]
            ? readonly Immutable<U>[]
            : // Leave the selected built-in objects unchanged
              T extends
                  | Date
                  | RegExp
                  | Map<unknown, unknown>
                  | Set<unknown>
                  | WeakMap<object, unknown>
                  | WeakSet<object>
                  | ArrayBuffer
                  | DataView
                  | URL
                  | URLSearchParams
              ? T
              : // Recursively apply readonly to each property of regular objects
                T extends object
                ? { readonly [P in keyof T]: Immutable<T[P]> }
                : // Leave primitive values unchanged
                  T
