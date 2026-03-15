/**
 * Executes a sync function and returns the thrown error.
 * Throws if the function does not throw.
 */
export function captureThrown<TError = unknown>(act: () => unknown): TError {
  try {
    act()
  } catch (error) {
    return error as TError
  }

  throw new Error('Expected function to throw')
}
