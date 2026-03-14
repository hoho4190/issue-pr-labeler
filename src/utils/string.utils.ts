// ============================================================================
// 🔹 Public
// ============================================================================

/**
 * Converts null or empty string to undefined.
 *
 * @param value - The string value to convert
 * @returns The original string, or undefined if null or empty
 */
export function nullOrEmptyToUndefined(value?: string | null): string | undefined {
  return value === null || value === '' ? undefined : value
}

/**
 * Safely stringifies a value with optional length and indentation limits.
 * For logging/output use only — not guaranteed to be valid or reversible JSON.
 *
 * @param obj       - The object to stringify
 * @param maxLength - Maximum length of the result string (default: 1000)
 * @param space     - Indentation spaces (default: 0, single line output)
 * @returns A safely stringified string, or '[Unserializable]' on failure
 */
export function safeStringifyWithLimit(obj: unknown, maxLength = 1000, space = 0): string {
  try {
    const json = safeStringify(obj, space)
    return json.length > maxLength ? json.slice(0, maxLength) + '...' : json
  } catch {
    return '[Unserializable]'
  }
}

/**
 * Safely stringifies a value with optional indentation.
 * For logging/output use only — not guaranteed to be valid or reversible JSON.
 *
 * @param value - The value to convert
 * @param space - Indentation spaces (default: 0, single line output)
 * @returns A safe string representation of the value
 */
export function safeStringify(value: unknown, space = 0): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return safeJsonStringify(value, space)
}

// ============================================================================
// 🔸 Internal Helpers
// ============================================================================

/**
 * Safely converts a value to JSON string format.
 * Handles circular references and special object types gracefully.
 *
 * @param obj   - The object to stringify
 * @param space - Indentation spaces
 * @returns A safely stringified JSON string
 */
function safeJsonStringify(obj: unknown, space: number): string {
  const seen = new WeakSet()
  return JSON.stringify(obj, replacerWithToString(seen), space)
}

/**
 * Provides a replacer function for JSON.stringify.
 * Safely handles circular references and custom toString behaviors.
 *
 * @param seen - A WeakSet to track already serialized objects
 * @returns A replacer function
 */
function replacerWithToString(seen: WeakSet<object>) {
  return (_key: string, value: unknown): unknown => {
    // Handle BigInt (JSON.stringify throws error by default)
    if (typeof value === 'bigint') return value.toString()

    if (typeof value === 'object' && value !== null) {
      // Prevent circular references
      if (seen.has(value)) return '[Circular]'
      seen.add(value)

      // Handle special types
      if (Array.isArray(value)) return value
      if (value instanceof Map) return Object.fromEntries(value)
      if (value instanceof Set) return Array.from(value)
      if (value instanceof RegExp) return value.toString()
      if (value instanceof Error) {
        return { name: value.name, message: value.message, stack: value.stack }
      }

      // Preserve structure for plain objects, consider toString for non-plain objects
      const proto = Object.getPrototypeOf(value)
      const isPlain = proto === Object.prototype || proto === null

      if (!isPlain && hasCallableToString(value)) {
        const customToString = value.toString
        if (customToString !== Object.prototype.toString) {
          try {
            const str = customToString.call(value)
            if (typeof str === 'string' && !str.startsWith('[object ')) {
              return str
            }
          } catch {
            return '[toString-error]'
          }
        }
      }
    }
    return value
  }
}

/**
 * Checks if an object has a callable toString method.
 *
 * @param value - The object to check
 * @returns True if the object has a callable toString method
 */
function hasCallableToString(value: object): value is { toString: () => string } {
  const maybe = (value as unknown as { toString?: unknown }).toString
  return typeof maybe === 'function'
}
