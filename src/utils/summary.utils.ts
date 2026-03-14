import { EventTypeDisplay, type Immutable } from '../types/common.js'
import type { Settings } from '../types/config.js'
import type { Context } from '../types/context.js'
import {
  LabelAction,
  LabelActionResult,
  type LabelActionReason,
  type LabelOperationResult
} from '../types/labels.js'
import { safeStringify } from './string.utils.js'

const actionEmoji = {
  [LabelAction.Add]: '➕',
  [LabelAction.Remove]: '➖',
  [LabelAction.None]: '▫️'
} satisfies Record<LabelAction, string>

const resultEmoji = {
  [LabelActionResult.Success]: '🟢',
  [LabelActionResult.Failed]: '🔴',
  [LabelActionResult.Skipped]: '🟡',
  [LabelActionResult.Noop]: '⚪'
} satisfies Record<LabelActionResult, string>

type SummaryOperation = {
  name: string
  action: LabelAction
  result: LabelActionResult
  reason: LabelActionReason | '-'
  simulatedByDryRun: boolean
}

type SummaryActionRow = {
  action: LabelAction
  count: number
}

type SummaryOutcomeRow = {
  result: LabelActionResult
  count: number
}

type SummaryReasonRow = {
  reason: string
  count: number
}

export type SummaryData = {
  actions: SummaryActionRow[]
  outcomes: SummaryOutcomeRow[]
  reasons: SummaryReasonRow[]
  operations: SummaryOperation[]
}

// ============================================================================
// 🔹 Public
// ============================================================================

/**
 * Build summary data used to generate a Markdown summary.
 */
export function buildSummaryData(labels: Immutable<LabelOperationResult[]>): SummaryData {
  const actionCounts = {
    [LabelAction.Add]: 0,
    [LabelAction.Remove]: 0,
    [LabelAction.None]: 0
  } satisfies Record<LabelAction, number>

  const outcomeCounts = {
    [LabelActionResult.Success]: 0,
    [LabelActionResult.Failed]: 0,
    [LabelActionResult.Skipped]: 0,
    [LabelActionResult.Noop]: 0
  } satisfies Record<LabelActionResult, number>

  const reasonCounts: Record<string, number> = {}
  const operations: SummaryOperation[] = []

  labels.forEach((r) => {
    actionCounts[r.action]++
    outcomeCounts[r.result]++

    const reason = r.reason ?? '-'
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1

    operations.push({
      name: r.name,
      action: r.action,
      result: r.result,
      reason,
      simulatedByDryRun: r.simulatedByDryRun
    })
  })

  const actions: SummaryActionRow[] = Object.entries(actionCounts).map(([action, count]) => ({
    action: action as LabelAction,
    count
  }))

  const outcomes: SummaryOutcomeRow[] = Object.entries(outcomeCounts).map(([result, count]) => ({
    result: result as LabelActionResult,
    count
  }))

  const reasons: SummaryReasonRow[] = Object.entries(reasonCounts)
    .sort((a, b) => {
      const [reasonA, countA] = a
      const [reasonB, countB] = b
      if (countA !== countB) {
        return countB - countA
      }
      return reasonA.localeCompare(reasonB)
    })
    .map(([reason, count]) => ({ reason, count }))

  return { actions, outcomes, reasons, operations }
}

/**
 * Generate a summary.
 */
export function generateSummary(
  summaryData: Immutable<SummaryData>,
  context: Immutable<Context>,
  settings: Immutable<Settings>
): string {
  const result: string[] = []

  result.push(summarizeExecutionInfo(context, settings))
  result.push(summarizeByAction(summaryData.actions))
  result.push(summarizeByResult(summaryData.outcomes, settings.dryRun))
  result.push(summarizeByReason(summaryData.reasons))
  result.push(summarizeOperations(summaryData.operations, settings.dryRun))

  return result.join('\n\n')
}

// ============================================================================
// 🔸 Internal Implementation
// ============================================================================

function summarizeExecutionInfo(
  context: Immutable<Context>,
  settings: Immutable<Settings>
): string {
  const row: string[] = []

  row.push(summarizeLink(context), '>')
  if (settings.dryRun) {
    row.push('> ⚠️ Dry-run mode enabled: no changes were applied.', '>')
  }
  row.push(summarizeSettings(settings))

  return row.join('\n')
}

function summarizeLink(context: Immutable<Context>): string {
  return `> ${EventTypeDisplay[context.eventType]}: [${context.link.title}](${context.link.url})`
}

function summarizeSettings(settings: Immutable<Settings>): string {
  const entries = Object.entries(settings)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${safeStringify(value)}`)

  return `> ⚙️ Settings: ${entries.join(', ')}`
}

function summarizeByAction(actions: Immutable<SummaryActionRow[]>): string {
  const rows = actions.map(({ action, count }) => `| ${actionEmoji[action]} ${action} | ${count} |`)

  return ['### Actions Performed', '', '| Action | Count |', '|---|---|', ...rows].join('\n')
}

function summarizeByResult(outcomes: Immutable<SummaryOutcomeRow[]>, dryRun: boolean): string {
  const rows = outcomes.map(({ result, count }) => {
    const resultLabel = dryRun && result === LabelActionResult.Success ? '(Success)' : result
    return `| ${resultEmoji[result]} ${resultLabel} | ${count} |`
  })

  return [
    '### Outcomes Summary',
    '',
    '| Result | Count |',
    '|---|---|',
    ...rows,
    '',
    '> `Skipped`: Tried to add/remove, but skipped due to policy or current state.',
    '>',
    '> `Noop`: Does nothing because it is not a target for add/remove.'
  ].join('\n')
}

function summarizeByReason(reasons: Immutable<SummaryReasonRow[]>): string {
  const rows = reasons.map(({ reason, count }) => `| ${reason} | ${count} |`)

  return ['### Reasons for Outcomes', '', '| Reason | Count |', '|---|---|', ...rows].join('\n')
}

function summarizeOperations(operations: Immutable<SummaryOperation[]>, dryRun: boolean): string {
  const rows = operations.map((r) => {
    const labelName = dryRun && r.simulatedByDryRun ? `(${r.name})` : r.name
    const actionStr = `${actionEmoji[r.action]} ${r.action}`
    const resultStr = `${resultEmoji[r.result]} ${r.result}`
    const reasonStr = r.reason
    return `| ${labelName} | ${actionStr} | ${resultStr} | ${reasonStr} |`
  })

  return [
    '### Details by Label',
    '',
    '| Label | Action | Result | Reason |',
    '|---|---|---|---|',
    ...rows
  ].join('\n')
}
