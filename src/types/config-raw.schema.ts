import { z, type ZodType } from 'zod'
import { EventType, MatchOperator, OnMissingLabel } from './common.js'
import { ConditionPropertyType } from './condition-enum.js'

export const RawEventType = {
  [EventType.Issue]: 'issue',
  [EventType.PullRequest]: 'pr'
} as const satisfies Record<EventType, string>
export type RawEventTypeValue = (typeof RawEventType)[EventType]

const rawEventTypeVals = Object.values(RawEventType) as RawEventTypeValue[]
const conditionPropTypeVals = Object.values(ConditionPropertyType)

const rawDefaultSettings = {
  skipIfBot: false,
  removeUnmatchedLabels: false,
  onMissingLabel: OnMissingLabel.Create,
  dryRun: false
}

const rawDefaultRules = Object.fromEntries(rawEventTypeVals.map((event) => [event, []]))
const MIN_MATCHES_MESSAGE = 'At least one match is required.'
const MIN_CONDITIONS_MESSAGE = 'At least one condition is required.'

// ──────────────────────────────────────────────
// Raw condition schema
// ──────────────────────────────────────────────

const rawConditionFieldRecord = Object.fromEntries(
  conditionPropTypeVals.map((property) => [property, z.unknown().optional()])
) as Record<ConditionPropertyType, z.ZodOptional<z.ZodUnknown>>

const RawConditionSchema = z
  .object({
    negate: z.boolean().optional().default(false)
  })
  .extend(rawConditionFieldRecord)
  .strict()
  .superRefine(validateSingleConditionProperty)

/**
 * Validates a condition object.
 * - Ensures exactly one condition field is present (excluding 'negate').
 * - Throws an error if zero or multiple condition fields are found.
 */
function validateSingleConditionProperty(
  data: z.infer<typeof RawConditionSchema>,
  ctx: z.RefinementCtx
) {
  // Extract condition keys except 'negate'
  const allKeys = Object.keys(data)
  const propertyKeys = allKeys.filter((key) =>
    conditionPropTypeVals.includes(key as ConditionPropertyType)
  )

  const expected = Object.values(ConditionPropertyType).join('|')

  if (propertyKeys.length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'At least one condition property is required.',
      expected,
      received: propertyKeys
    })
  } else if (propertyKeys.length > 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'Only one condition property is allowed.',
      expected,
      received: propertyKeys
    })
  }
}

// ──────────────────────────────────────────────
// Raw match schema
// ──────────────────────────────────────────────

const RawMatchSchema = z
  .object({
    operator: z.enum(MatchOperator),
    conditions: z.array(RawConditionSchema).min(1, MIN_CONDITIONS_MESSAGE),
    skipIfBot: z.boolean().optional()
  })
  .strict()

// ──────────────────────────────────────────────
// Raw rule schema
// ──────────────────────────────────────────────

const RawRuleSchema = z
  .object({
    label: z.string().refine((v) => v.trim().length > 0, {
      message: 'Label must be a non-empty string.'
    }),
    matches: z.array(RawMatchSchema).min(1, MIN_MATCHES_MESSAGE),
    skipIfBot: z.boolean().optional()
  })
  .strict()

// ──────────────────────────────────────────────
// Raw rules schema
// ──────────────────────────────────────────────

const RawRulesSchema = z
  .object(
    Object.fromEntries(
      Object.values(RawEventType).map((event) => [
        event,
        z
          .array(RawRuleSchema)
          .optional()
          .nullable()
          .transform((v) => v ?? [])
          .superRefine((arr, ctx) => validateDuplicateLabels(arr, ctx, event))
      ]) satisfies [RawEventTypeValue, ZodType][]
    )
  )
  .strict()

/**
 * Validates a rule array.
 * - Ensures all labels are unique.
 * - Throws an error if duplicate labels are found.
 */
function validateDuplicateLabels(
  arr: z.infer<typeof RawRuleSchema>[],
  ctx: z.RefinementCtx,
  event: RawEventTypeValue
) {
  const seen = new Set<string>()
  arr.forEach((rule, index) => {
    const normLabel = normalizeLabel(rule.label)

    if (seen.has(normLabel)) {
      ctx.addIssue({
        code: 'custom',
        message: `Duplicate label in ${event}`,
        path: [index],
        received: rule.label
      })
    } else {
      seen.add(normLabel)
    }
  })
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase()
}

// ──────────────────────────────────────────────
// Raw settings schema
// ──────────────────────────────────────────────

const RawSettingsSchema = z
  .object({
    skipIfBot: z.boolean().optional().default(rawDefaultSettings.skipIfBot),
    removeUnmatchedLabels: z.boolean().optional().default(rawDefaultSettings.removeUnmatchedLabels),
    onMissingLabel: z.enum(OnMissingLabel).optional().default(rawDefaultSettings.onMissingLabel),
    dryRun: z.boolean().optional().default(rawDefaultSettings.dryRun)
  })
  .strict()

// ──────────────────────────────────────────────
// Raw config schema
// ──────────────────────────────────────────────

export const RawConfigSchema = z.preprocess(
  (raw) => {
    if (raw == null) {
      return { settings: rawDefaultSettings, rules: rawDefaultRules }
    }

    if (typeof raw !== 'object' || Array.isArray(raw)) {
      return raw
    }

    const candidate = raw as Record<string, unknown>

    return {
      ...candidate,
      settings: candidate.settings ?? rawDefaultSettings,
      rules: candidate.rules ?? rawDefaultRules
    }
  },
  z
    .object({
      settings: RawSettingsSchema,
      rules: RawRulesSchema
    })
    .strict()
)

// ──────────────────────────────────────────────
// Type inference from schema
// ──────────────────────────────────────────────

export type RawConfig = z.infer<typeof RawConfigSchema>
export type RawSettings = z.infer<typeof RawSettingsSchema>
export type RawRule = z.infer<typeof RawRuleSchema>
export type RawMatch = z.infer<typeof RawMatchSchema>
export type RawCondition = z.infer<typeof RawConditionSchema>
