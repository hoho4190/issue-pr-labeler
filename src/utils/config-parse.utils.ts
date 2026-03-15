import {
  type ConditionPropertyBase,
  type ConditionValueTagBase,
  getConditionProperty,
  getConditionValueTag
} from '../registry/condition.registry.js'
import { EventType, type Immutable } from '../types/common.js'
import { ConditionPropertyType } from '../types/condition-enum.js'
import type { Condition } from '../types/condition.js'
import {
  type RawConfig,
  type RawMatch,
  type RawRule,
  type RawSettings,
  type RawCondition,
  RawEventType,
  type RawEventTypeValue
} from '../types/config-raw.schema.js'
import type { Config, Match, Rule, RulesByEvent, Settings } from '../types/config.js'
import { getEnumValueByValue } from './enum.utils.js'
import { type ZodContext, ZodContextError, type ZodPath } from './zod.utils.js'

interface ParseContext {
  eventType: EventType
  path: ZodPath
}

interface ParseContextWithSkipIfBot extends ParseContext {
  skipIfBot: boolean
}

class ConfigParseError extends Error {
  readonly path: ZodPath
  readonly expected?: unknown
  readonly received?: unknown

  constructor(
    message: string,
    path: ZodPath,
    options?: {
      expected?: unknown
      received?: unknown
    }
  ) {
    super(message)
    this.name = 'ConfigParseError'
    this.path = [...path]
    this.expected = options?.expected
    this.received = options?.received
  }
}

// ============================================================================
// 🔹 Public
// ============================================================================

/**
 * RawConfig → Config parsing
 */
export function parseConfig(raw: RawConfig, zodContext: ZodContext): Immutable<Config> {
  try {
    const settings = parseSettings(raw.settings)
    const rules = parseRules(raw.rules, settings)

    return { settings, rules }
  } catch (error) {
    if (error instanceof ConfigParseError) {
      throw new ZodContextError(zodContext, [
        {
          code: 'custom',
          path: error.path,
          message: error.message,
          expected: error.expected,
          received: error.received
        }
      ])
    }

    throw error
  }
}

// ============================================================================
// 🔸 Internal Implementation
// ============================================================================

/**
 * RawSettings → Settings parsing
 */
function parseSettings(rawSettings: RawSettings): Settings {
  return rawSettings as Settings
}

/**
 * RawRule list by event type → Rule list parsing
 */
function parseRules(rawRules: RawConfig['rules'], settings: Settings): RulesByEvent {
  const path = 'rules'

  const rules: RulesByEvent = {
    [EventType.Issue]: [],
    [EventType.PullRequest]: []
  }

  // Iterate over event types, parse their rules, and assign them to `rules`.
  for (const [eventKey, rawRuleList] of Object.entries(rawRules)) {
    const eventPath = [path, eventKey]
    const eventType = parseEventType(eventKey)

    // Rule list parsing
    const parsedRules = rawRuleList.map((rawRule, i) =>
      parseRule(rawRule, {
        eventType,
        path: [...eventPath, i],
        skipIfBot: settings.skipIfBot
      })
    )

    assignRulesToEvent(rules, eventType, parsedRules)
  }

  return rules
}

/**
 * RawRule → Rule parsing
 */
function parseRule(rawRule: RawRule, parseCtx: ParseContextWithSkipIfBot): Rule {
  // skipIfBot
  const skipIfBot = rawRule.skipIfBot ?? parseCtx.skipIfBot

  // matches
  const matches = rawRule.matches.map((rawMatch, i) =>
    parseMatch(rawMatch, {
      eventType: parseCtx.eventType,
      path: [...parseCtx.path, 'matches', i],
      skipIfBot
    })
  )

  return {
    label: rawRule.label,
    matches,
    skipIfBot
  }
}

/**
 * RawMatch → Match parsing
 */
function parseMatch(rawMatch: RawMatch, parseCtx: ParseContextWithSkipIfBot): Match {
  // skipIfBot
  const skipIfBot = rawMatch.skipIfBot ?? parseCtx.skipIfBot

  // conditions
  const conditions = rawMatch.conditions.map((rawCondition, i) =>
    parseCondition(rawCondition, {
      eventType: parseCtx.eventType,
      path: [...parseCtx.path, 'conditions', i]
    })
  )

  return {
    operator: rawMatch.operator,
    conditions,
    skipIfBot
  }
}

/**
 * RawCondition → Condition parsing
 */
function parseCondition(rawCondition: RawCondition, parseCtx: ParseContext): Condition {
  // Condition info extraction
  const { propertyType, rawValue, negate } = extractConditionInfo(rawCondition, parseCtx.path)

  // `ConditionProperty` lookup
  const property = getConditionProperty(propertyType)

  // Event type validation
  validateConditionPropertyAllowedForEvent(property, parseCtx.eventType, parseCtx.path)

  // Allowed tag iteration and condition parsing
  for (const tagType of property.allowedTags) {
    const tag = getConditionValueTag(tagType)
    const expected = safeParseExpectedValueByTag(tag, rawValue)

    if (expected !== undefined) {
      return {
        propertyType: property.type,
        tagType,
        expected,
        negate
      } as Condition
    }
  }

  throw new ConfigParseError(
    'Value cannot be parsed with any of the allowed tags.',
    parseCtx.path,
    {
      expected: property.allowedTags.join('|'),
      received: rawValue
    }
  )
}

// ============================================================================
// 🔸 Internal Helpers
// ============================================================================

/**
 * RawEventType → EventType mapping
 */
const rawToEventTypeMap = {
  [RawEventType[EventType.Issue]]: EventType.Issue,
  [RawEventType[EventType.PullRequest]]: EventType.PullRequest
} satisfies Record<RawEventTypeValue, EventType>

/**
 * RawEventType → EventType parsing
 */
function parseEventType(eventKey: string): EventType {
  return rawToEventTypeMap[eventKey as RawEventTypeValue]
}

/**
 * EventType → rule assigner mapping
 */
const ruleAssignersByEvent: {
  [E in EventType]: (rules: RulesByEvent, parsedRules: Rule[]) => void
} = {
  [EventType.Issue]: (rules, parsedRules) => {
    rules[EventType.Issue] = parsedRules
  },
  [EventType.PullRequest]: (rules, parsedRules) => {
    rules[EventType.PullRequest] = parsedRules
  }
}

/**
 * Assign rule list to specific event type.
 */
function assignRulesToEvent(rules: RulesByEvent, eventType: EventType, parsedRules: Rule[]): void {
  return ruleAssignersByEvent[eventType](rules, parsedRules)
}

/**
 * Extracts the single condition property, its value, and negate flag.
 */
function extractConditionInfo(
  rawCondition: RawCondition,
  path: ZodPath
): {
  propertyType: ConditionPropertyType
  rawValue: unknown
  negate: boolean
} {
  const { negate, ...rest } = rawCondition

  const keys = Object.keys(rest)
  if (keys.length !== 1) {
    throw new ConfigParseError('Condition must have exactly one property besides "negate".', path, {
      expected: Object.values(ConditionPropertyType).join('|'),
      received: keys
    })
  }

  const propertyType = getEnumValueByValue(ConditionPropertyType, keys[0])
  return {
    propertyType,
    rawValue: rest[propertyType],
    negate
  }
}

/**
 * Validate whether a `ConditionProperty` is allowed for the given event type.
 */
function validateConditionPropertyAllowedForEvent(
  property: ConditionPropertyBase,
  eventType: EventType,
  path: ZodPath
): void {
  if (!property.allowedEvents.includes(eventType)) {
    throw new ConfigParseError('Invalid property for event.', path, {
      expected: `<${eventType} allowed properties>`,
      received: property.type
    })
  }
}

/**
 * Safely parses a tag's expected value.
 * Using generics here captures the specific tag's type parameters so
 * canParse narrows correctly and parse's parameter isn't inferred as never.
 */
function safeParseExpectedValueByTag(
  tag: ConditionValueTagBase,
  raw: unknown
): unknown | undefined {
  if (!tag.canParse(raw)) return undefined
  // After canParse, `raw` is guaranteed to be the expected raw type for this tag.
  return (tag as unknown as { parse: (x: unknown) => unknown }).parse(raw)
}

// ============================================================================
// 🔹 Test-only exports
// ============================================================================

export const __test__ = {
  parseEventType,
  assignRulesToEvent,
  extractConditionInfo,
  validateConditionPropertyAllowedForEvent
}
