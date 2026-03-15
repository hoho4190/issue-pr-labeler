import type { Immutable } from '../types/common.js'
import type {
  Label,
  LabelAction,
  LabelActionReason,
  LabelActionResult,
  LabelOperationResult
} from '../types/labels.js'
import { assertNonEmptyString } from './common.utils.js'

// ============================================================================
// 🔹 Public
// ============================================================================

export function stringifyLabels<T extends Label>(labels: Immutable<T[]>): string {
  return `[${labels.map((l) => l.name).join(', ')}]`
}

export function makeLabel(raw: string): Label {
  assertNonEmptyString(raw, 'makeLabel')

  const name = raw.trim()
  return {
    name,
    norm: name.toLowerCase()
  }
}

export function makeLabels(raws: string[]): Label[] {
  return raws.map((r) => makeLabel(r))
}

export function makeOperationResult(
  label: Label,
  action: LabelAction,
  result: LabelActionResult,
  reason?: LabelActionReason,
  simulatedByDryRun = false
): LabelOperationResult {
  return {
    ...label,
    action,
    result,
    reason,
    simulatedByDryRun
  }
}
