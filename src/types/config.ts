import type { MatchOperator, OnMissingLabel, EventType } from './common.js'
import type { Condition } from './condition.js'

export type RulesByEvent = { [E in EventType]: Rule[] }

export interface Config {
  settings: Settings
  rules: RulesByEvent
}

export interface Settings {
  /**
   * Determines whether to ignore events triggered by bots.
   *
   * Default: false
   */
  skipIfBot: boolean

  /**
   * Determines whether to remove the label when at least one non-skip match was evaluated
   * and all of them failed.
   *
   * Default: false
   */
  removeUnmatchedLabels: boolean

  /**
   * Behavior for handling missing labels.
   *
   * create | skip | error
   *
   * Default: create
   */
  onMissingLabel: OnMissingLabel

  /**
   * Test mode that does not apply label changes.
   *
   * Default: false
   */
  dryRun: boolean
}

export interface Rule {
  label: string
  matches: Match[]

  /** Overrides settings.skipIfBot (default: settings.skipIfBot) */
  skipIfBot: boolean
}

export interface Match {
  operator: MatchOperator
  conditions: Condition[]

  /** Overrides rule.skipIfBot (default: rule.skipIfBot) */
  skipIfBot: boolean
}
