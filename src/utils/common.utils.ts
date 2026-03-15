import { safeStringify } from './string.utils.js'

// ============================================================================
// 🔹 Public
// ============================================================================

/**
 * Asserts that the value is a non-empty string.
 * Trims whitespace and rejects empty or non-string values.
 */
export function assertNonEmptyString(value: unknown, key: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(
      `[${key}] Must be a string. Received: ${safeStringify(value)} (type: ${typeof value})`
    )
  }

  if (value.trim().length === 0) {
    throw new Error(
      `[${key}] Must be a non-empty string. Received: ${safeStringify(value)} (type: ${typeof value})`
    )
  }
}

/**
 * Extracts an HTTP status code from an error object.
 */
export function extractHttpStatus(err: unknown): number | null {
  if (typeof err === 'object' && err !== null) {
    const status = (err as { status?: unknown }).status
    if (typeof status === 'number') {
      return status
    }

    const cause = (err as { cause?: unknown }).cause
    if (typeof cause === 'object' && cause !== null) {
      const nestedStatus = (cause as { status?: unknown }).status
      if (typeof nestedStatus === 'number') {
        return nestedStatus
      }
    }
  }

  return null
}
