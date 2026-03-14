import { jest } from '@jest/globals'
import { ActorType, EventType, OnMissingLabel } from '../../../src/types/common.js'
import type { Settings } from '../../../src/types/config.js'
import type { Context } from '../../../src/types/context.js'
import {
  LabelAction,
  LabelActionReason,
  LabelActionResult,
  type LabelOperationResult
} from '../../../src/types/labels.js'
import type { SummaryData } from '../../../src/utils/summary.utils.js'

const safeStringifyMock = jest.fn()

jest.unstable_mockModule('../../../src/utils/string.utils.js', () => ({
  safeStringify: (...args: unknown[]) => safeStringifyMock(...args)
}))

type SummaryUtilsModule = typeof import('../../../src/utils/summary.utils.js')

let buildSummaryData: SummaryUtilsModule['buildSummaryData']
let generateSummary: SummaryUtilsModule['generateSummary']

const context: Context = {
  eventType: EventType.Issue,
  repoOwner: 'octocat',
  repoName: 'hello-world',
  action: 'labeled',
  actor: 'octocat',
  actorType: ActorType.User,
  defaultBranch: 'main',
  eventNumber: 42,
  link: {
    title: 'Issue #42',
    url: 'https://github.com/octocat/hello-world/issues/42'
  },
  issue: {
    author: 'octocat',
    title: 'Bug report',
    labels: ['bug']
  }
}

describe('Unit | Utils: summary.utils', () => {
  beforeAll(async () => {
    const module = await import('../../../src/utils/summary.utils.js')
    buildSummaryData = module.buildSummaryData
    generateSummary = module.generateSummary
  })

  beforeEach(() => {
    safeStringifyMock.mockReset()
    safeStringifyMock.mockImplementation((value: unknown) => String(value))
  })

  describe('buildSummaryData()', () => {
    test('aggregates actions, outcomes, and reasons', () => {
      // given
      const labels: LabelOperationResult[] = [
        {
          name: 'label-a',
          norm: 'label-a',
          action: LabelAction.Add,
          result: LabelActionResult.Success,
          reason: LabelActionReason.MissingLabelCreatePolicy,
          simulatedByDryRun: true
        },
        {
          name: 'label-b',
          norm: 'label-b',
          action: LabelAction.Remove,
          result: LabelActionResult.Failed,
          reason: LabelActionReason.Http404NotFound,
          simulatedByDryRun: true
        },
        {
          name: 'label-c',
          norm: 'label-c',
          action: LabelAction.Remove,
          result: LabelActionResult.Failed,
          reason: LabelActionReason.Http404NotFound,
          simulatedByDryRun: false
        }
      ]

      // when
      const summaryData = buildSummaryData(labels)

      // then
      expect(summaryData.actions).toEqual([
        { action: LabelAction.Add, count: 1 },
        { action: LabelAction.Remove, count: 2 },
        { action: LabelAction.None, count: 0 }
      ])
      expect(summaryData.outcomes).toEqual([
        { result: LabelActionResult.Success, count: 1 },
        { result: LabelActionResult.Failed, count: 2 },
        { result: LabelActionResult.Skipped, count: 0 },
        { result: LabelActionResult.Noop, count: 0 }
      ])
      expect(summaryData.reasons).toEqual([
        { reason: LabelActionReason.Http404NotFound, count: 2 },
        {
          reason: LabelActionReason.MissingLabelCreatePolicy,
          count: 1
        }
      ])
      expect(summaryData.operations).toHaveLength(3)
    })

    test('sorts reasons alphabetically when counts are equal', () => {
      // given
      const labels: LabelOperationResult[] = [
        {
          name: 'label-a',
          norm: 'label-a',
          action: LabelAction.Add,
          result: LabelActionResult.Failed,
          reason: LabelActionReason.Http422ValidationFailed,
          simulatedByDryRun: false
        },
        {
          name: 'label-b',
          norm: 'label-b',
          action: LabelAction.Add,
          result: LabelActionResult.Failed,
          reason: LabelActionReason.MissingLabelCreatePolicy,
          simulatedByDryRun: false
        },
        {
          name: 'label-c',
          norm: 'label-c',
          action: LabelAction.Add,
          result: LabelActionResult.Failed,
          reason: LabelActionReason.Http404NotFound,
          simulatedByDryRun: false
        }
      ]

      // when
      const summaryData = buildSummaryData(labels)

      // then
      expect(summaryData.reasons).toEqual([
        { reason: LabelActionReason.Http404NotFound, count: 1 },
        { reason: LabelActionReason.Http422ValidationFailed, count: 1 },
        { reason: LabelActionReason.MissingLabelCreatePolicy, count: 1 }
      ])
    })

    test("normalizes undefined reason as '-'", () => {
      // given
      const labels: LabelOperationResult[] = [
        {
          name: 'label-a',
          norm: 'label-a',
          action: LabelAction.Add,
          result: LabelActionResult.Success,
          simulatedByDryRun: false
        }
      ]

      // when
      const summaryData = buildSummaryData(labels)

      // then
      expect(summaryData.reasons).toEqual([{ reason: '-', count: 1 }])
      expect(summaryData.operations[0]?.reason).toBe('-')
    })

    test('returns zeroed counters for empty input', () => {
      // given
      const labels: LabelOperationResult[] = []

      // when
      const summaryData = buildSummaryData(labels)

      // then
      expect(summaryData.actions).toEqual([
        { action: LabelAction.Add, count: 0 },
        { action: LabelAction.Remove, count: 0 },
        { action: LabelAction.None, count: 0 }
      ])
      expect(summaryData.outcomes).toEqual([
        { result: LabelActionResult.Success, count: 0 },
        { result: LabelActionResult.Failed, count: 0 },
        { result: LabelActionResult.Skipped, count: 0 },
        { result: LabelActionResult.Noop, count: 0 }
      ])
      expect(summaryData.reasons).toEqual([])
      expect(summaryData.operations).toEqual([])
    })
  })

  describe('generateSummary()', () => {
    describe('dry-run mode', () => {
      // Dry-run 모드에서 모든 분기 확인
      test('renders full summary under dry-run mode', () => {
        // given
        const settings: Settings = {
          skipIfBot: false,
          removeUnmatchedLabels: true,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: true
        }

        const summaryData: SummaryData = {
          actions: [
            { action: LabelAction.Add, count: 1 },
            { action: LabelAction.Remove, count: 0 },
            { action: LabelAction.None, count: 0 }
          ],
          outcomes: [
            { result: LabelActionResult.Success, count: 1 },
            { result: LabelActionResult.Failed, count: 0 },
            { result: LabelActionResult.Skipped, count: 0 },
            { result: LabelActionResult.Noop, count: 0 }
          ],
          reasons: [
            {
              reason: LabelActionReason.MissingLabelCreatePolicy,
              count: 1
            }
          ],
          operations: [
            {
              name: 'label-a',
              action: LabelAction.Add,
              result: LabelActionResult.Success,
              reason: LabelActionReason.MissingLabelCreatePolicy,
              simulatedByDryRun: true
            }
          ]
        }

        // when
        const result = generateSummary(summaryData, context, settings)

        // then
        expect(result).toContain(`> Issue: [${context.link.title}](${context.link.url})`)
        expect(result).toContain('⚠️ Dry-run mode enabled: no changes were applied.')
        expect(result).toContain('| ➕ Add | 1 |') // action count
        expect(result).toContain('| 🟢 (Success) | 1 |') // dry-run Success 변환
        expect(result).toContain('| missing_label_create_policy | 1 |') // reason count
        expect(result).toContain(
          '| (label-a) | ➕ Add | 🟢 Success | missing_label_create_policy |'
        )

        expect(result).toMatchSnapshot()
      })

      // Dry-run 미사용 시 성공 출력 확인
      test('renders summary without dry-run adjustments', () => {
        // given
        const settings: Settings = {
          skipIfBot: false,
          removeUnmatchedLabels: true,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        }

        const summaryData: SummaryData = {
          actions: [
            { action: LabelAction.Add, count: 1 },
            { action: LabelAction.Remove, count: 0 },
            { action: LabelAction.None, count: 0 }
          ],
          outcomes: [
            { result: LabelActionResult.Success, count: 1 },
            { result: LabelActionResult.Failed, count: 0 },
            { result: LabelActionResult.Skipped, count: 0 },
            { result: LabelActionResult.Noop, count: 0 }
          ],
          reasons: [
            {
              reason: LabelActionReason.MissingLabelCreatePolicy,
              count: 1
            }
          ],
          operations: [
            {
              name: 'label-a',
              action: LabelAction.Add,
              result: LabelActionResult.Success,
              reason: LabelActionReason.MissingLabelCreatePolicy,
              simulatedByDryRun: false
            }
          ]
        }

        // when
        const result = generateSummary(summaryData, context, settings)

        // then
        expect(result).toContain(`> Issue: [${context.link.title}](${context.link.url})`)
        expect(result).not.toContain('Dry-run mode enabled') // dry-run 문구 없음
        expect(result).toContain('| ➕ Add | 1 |') // action count
        expect(result).toContain('| 🟢 Success | 1 |') // 일반 Success 그대로 출력
        expect(result).toContain('| missing_label_create_policy | 1 |') // reason count
        expect(result).toContain('| label-a | ➕ Add | 🟢 Success | missing_label_create_policy |')

        expect(result).toMatchSnapshot()
      })

      // settings.dryRun=true일 때 operation별 simulatedByDryRun 플래그에 따라 레이블 표기 분기 확인
      test('wraps only operations with simulatedByDryRun=true in parentheses', () => {
        // given
        const settings: Settings = {
          skipIfBot: false,
          removeUnmatchedLabels: true,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: true
        }
        const summaryData: SummaryData = {
          actions: [
            { action: LabelAction.Add, count: 1 },
            { action: LabelAction.Remove, count: 1 },
            { action: LabelAction.None, count: 0 }
          ],
          outcomes: [
            { result: LabelActionResult.Success, count: 1 },
            { result: LabelActionResult.Failed, count: 1 },
            { result: LabelActionResult.Skipped, count: 0 },
            { result: LabelActionResult.Noop, count: 0 }
          ],
          reasons: [{ reason: '-', count: 2 }],
          operations: [
            {
              name: 'simulated-label',
              action: LabelAction.Add,
              result: LabelActionResult.Success,
              reason: '-',
              simulatedByDryRun: true
            },
            {
              name: 'actual-label',
              action: LabelAction.Remove,
              result: LabelActionResult.Failed,
              reason: '-',
              simulatedByDryRun: false
            }
          ]
        }

        // when
        const result = generateSummary(summaryData, context, settings)

        // then
        expect(result).toContain('| (simulated-label) | ➕ Add | 🟢 Success | - |')
        expect(result).toContain('| actual-label | ➖ Remove | 🔴 Failed | - |')
        expect(result).not.toContain('(actual-label)')
      })
    })

    describe('execution info', () => {
      // PR 이벤트 컨텍스트일 때 링크 헤더와 정렬된 settings를 출력하는지 확인
      test('renders PR link prefix and sorted settings output', () => {
        // given
        const settings: Settings = {
          skipIfBot: true,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Skip,
          dryRun: false
        }
        const prContext: Context = {
          eventType: EventType.PullRequest,
          repoOwner: 'octocat',
          repoName: 'hello-world',
          action: 'opened',
          actor: 'octocat',
          actorType: ActorType.User,
          defaultBranch: 'main',
          eventNumber: 7,
          link: {
            title: 'PR #7',
            url: 'https://github.com/octocat/hello-world/pull/7'
          },
          pullRequest: {
            author: 'octocat',
            title: 'Fix docs',
            labels: ['docs'],
            baseBranch: 'main',
            headBranch: 'docs/fix',
            isDraft: false,
            changedLines: {
              additions: 3,
              deletions: 1
            }
          }
        }
        const summaryData: SummaryData = {
          actions: [],
          outcomes: [],
          reasons: [],
          operations: []
        }

        // when
        const result = generateSummary(summaryData, prContext, settings)

        // then
        expect(result).toContain('> PR: [PR #7](https://github.com/octocat/hello-world/pull/7)')
        expect(result).toContain(
          '> ⚙️ Settings: dryRun=false, onMissingLabel=skip, removeUnmatchedLabels=false, skipIfBot=true'
        )
        expect(safeStringifyMock).toHaveBeenCalledWith(false)
        expect(safeStringifyMock).toHaveBeenCalledWith('skip')
        expect(safeStringifyMock).toHaveBeenCalledWith(true)
      })
    })

    describe('summarizeByReason', () => {
      // count가 서로 다를 때 내림차순 정렬되는지 확인
      test('reasons are sorted by count descending', () => {
        // given
        const settings: Settings = {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        }

        const summaryData: SummaryData = {
          actions: [{ action: LabelAction.Remove, count: 3 }],
          outcomes: [{ result: LabelActionResult.Failed, count: 3 }],
          reasons: [
            { reason: LabelActionReason.Http404NotFound, count: 2 },
            { reason: LabelActionReason.Http422ValidationFailed, count: 1 }
          ],
          operations: [
            {
              name: 'label-a',
              action: LabelAction.Remove,
              result: LabelActionResult.Failed,
              reason: LabelActionReason.Http422ValidationFailed,
              simulatedByDryRun: false
            },
            {
              name: 'label-b',
              action: LabelAction.Remove,
              result: LabelActionResult.Failed,
              reason: LabelActionReason.Http404NotFound,
              simulatedByDryRun: false
            },
            {
              name: 'label-c',
              action: LabelAction.Remove,
              result: LabelActionResult.Failed,
              reason: LabelActionReason.Http404NotFound,
              simulatedByDryRun: false
            }
          ]
        }

        // when
        const result = generateSummary(summaryData, context, settings)

        // then
        const reasonSection = result.split('### Reasons for Outcomes')[1]
        expect(reasonSection.indexOf(LabelActionReason.Http404NotFound)).toBeLessThan(
          reasonSection.indexOf(LabelActionReason.Http422ValidationFailed)
        )
      })

      // 동일한 카운트일 때 reason이 알파벳 순으로 정렬되는지 확인
      test('reasons are sorted alphabetically when counts are equal', () => {
        // given
        const settings: Settings = {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        }

        const summaryData: SummaryData = {
          actions: [{ action: LabelAction.Remove, count: 2 }],
          outcomes: [{ result: LabelActionResult.Failed, count: 2 }],
          reasons: [
            { reason: LabelActionReason.Http404NotFound, count: 1 },
            { reason: LabelActionReason.Http422ValidationFailed, count: 1 }
          ],
          operations: [
            {
              name: 'label-a',
              action: LabelAction.Remove,
              result: LabelActionResult.Failed,
              reason: LabelActionReason.Http422ValidationFailed,
              simulatedByDryRun: false
            },
            {
              name: 'label-b',
              action: LabelAction.Remove,
              result: LabelActionResult.Failed,
              reason: LabelActionReason.Http404NotFound,
              simulatedByDryRun: false
            }
          ]
        }

        // when
        const result = generateSummary(summaryData, context, settings)

        // then
        const reasonSection = result.split('### Reasons for Outcomes')[1]
        expect(reasonSection).toMatch(/http_404_not_found[\s\S]*http_422_validation_failed/)
      })

      // reason이 없는 경우 '-'로 처리되는지 확인
      test("handles undefined reason by replacing with '-'", () => {
        // given
        const settings: Settings = {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        }

        const summaryData: SummaryData = {
          actions: [{ action: LabelAction.Add, count: 1 }],
          outcomes: [{ result: LabelActionResult.Success, count: 1 }],
          reasons: [{ reason: '-', count: 1 }],
          operations: [
            {
              name: 'label-no-reason',
              action: LabelAction.Add,
              result: LabelActionResult.Success,
              reason: '-',
              simulatedByDryRun: false
            }
          ]
        }

        // when
        const result = generateSummary(summaryData, context, settings)

        // then
        const reasonSection = result.split('### Reasons for Outcomes')[1]
        expect(reasonSection).toContain('| - | 1 |')
        expect(result).toContain('| label-no-reason | ➕ Add | 🟢 Success | - |')
      })
    })
  })
})
