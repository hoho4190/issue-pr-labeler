import type { ConditionValueTagType } from '../../../../../src/types/condition-enum.js'
import type { EventType } from '../../../../../src/types/common.js'

export type ExpectedMatch = 'match' | 'mismatch'

export interface ConditionPropertyTestCase {
  tc: string
  eventName: EventType
  tagName: ConditionValueTagType
  expectedMatch: ExpectedMatch
  reason: string
}
