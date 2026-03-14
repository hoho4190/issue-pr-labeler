import { type z, ZodError } from 'zod'
import { safeStringify } from './string.utils.js'

export type ZodContext = Record<string, unknown>
export type ZodPath = (string | number)[]

interface FormattedError {
  code: string
  path: ZodPath
  message: string
  expected?: unknown
  received?: unknown
}

// ============================================================================
// 🔹 Public
// ============================================================================

/**
 * Custom Error class to include context + formatted errors
 */
export class ZodContextError extends Error {
  public context: ZodContext
  public errors: FormattedError[]

  constructor(context: ZodContext, errors: FormattedError[]) {
    const payload = { context, errors }
    super(`Zod validation failed with context\n${safeStringify(payload, 2)}`)
    this.context = context
    this.errors = errors
  }
}

/**
 * Zod parse wrapper that throws ZodContextError
 */
export function parseWithContext<T>(schema: z.ZodType<T>, data: unknown, context: ZodContext): T {
  try {
    return schema.parse(data)
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ZodContextError(context, formatErrors(err.issues))
    }
    throw err
  }
}

/**
 * Safe parse wrapper that returns a result object instead of throwing.
 * On failure, includes a ZodContextError with context and formatted errors.
 */
export function safeParseWithContext<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: ZodContext
): { success: true; data: T } | { success: false; error: ZodContextError } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    error: new ZodContextError(context, formatErrors(result.error.issues))
  }
}

// ============================================================================
// 🔸 Internal Helpers
// ============================================================================

/**
 * Safely formats Zod errors with extra info.
 */
function formatErrors(issues: z.ZodError['issues']): FormattedError[] {
  return issues.map((issue) => {
    const formatted: FormattedError = {
      code: issue.code,
      path: issue.path.filter(
        (p): p is string | number => typeof p === 'string' || typeof p === 'number'
      ),
      message: issue.message
    }

    if ('expected' in issue) formatted.expected = (issue as { expected: unknown }).expected
    if ('received' in issue) formatted.received = (issue as { received: unknown }).received

    return formatted
  })
}
