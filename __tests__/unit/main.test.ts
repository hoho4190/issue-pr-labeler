import { jest } from '@jest/globals'
import type { IContextService } from '../../src/services/context.service.interface.js'
import type { ILabelService } from '../../src/services/label.service.interface.js'
import { ActorType, EventType, MatchOperator, OnMissingLabel } from '../../src/types/common.js'
import type { Config, Match, Rule, RulesByEvent, Settings } from '../../src/types/config.js'
import type { Context } from '../../src/types/context.js'
import type { LabelServiceFactory } from '../../src/types/factories.js'
import {
  LabelAction,
  LabelActionResult,
  type Label,
  type LabelEvaluationResult,
  type LabelOperationResult,
  type RepositoryLabelDiff
} from '../../src/types/labels.js'
import type { SummaryData } from '../../src/utils/summary.utils.js'

const coreDebugMock = jest.fn<(message: string) => void>()
const stringifyLabelsMock = jest.fn<(labels: readonly Label[]) => string>()
const safeStringifyMock = jest.fn<(value: unknown, space?: number) => string>()
const buildSummaryDataMock = jest.fn<(labels: readonly LabelOperationResult[]) => SummaryData>()

jest.unstable_mockModule('@actions/core', () => ({
  debug: (message: string) => coreDebugMock(message)
}))

jest.unstable_mockModule('../../src/utils/label.utils.js', () => ({
  stringifyLabels: (labels: readonly Label[]) => stringifyLabelsMock(labels)
}))

jest.unstable_mockModule('../../src/utils/string.utils.js', () => ({
  safeStringify: (value: unknown, space?: number) => safeStringifyMock(value, space)
}))

jest.unstable_mockModule('../../src/utils/summary.utils.js', () => ({
  buildSummaryData: (labels: readonly LabelOperationResult[]) => buildSummaryDataMock(labels)
}))

type MainModule = typeof import('../../src/main.js')

let run: MainModule['run']

const createContextServiceMock = (): jest.Mocked<IContextService> =>
  ({
    getContext: jest.fn()
  }) as jest.Mocked<IContextService>

const createLabelServiceMock = (): jest.Mocked<ILabelService> =>
  ({
    getConfig: jest.fn(),
    getLabelsAndMissing: jest.fn(),
    evaluateRules: jest.fn(),
    applyLabels: jest.fn()
  }) as jest.Mocked<ILabelService>

const createIssueContext = (): Context => ({
  eventType: EventType.Issue,
  repoOwner: 'octo-org',
  repoName: 'octo-repo',
  action: 'opened',
  actor: 'octocat',
  actorType: ActorType.User,
  defaultBranch: 'main',
  eventNumber: 11,
  link: {
    url: 'https://github.com/octo-org/octo-repo/issues/11',
    title: 'Issue #11'
  },
  issue: {
    author: 'octocat',
    title: 'Issue title',
    body: 'Issue body',
    labels: ['existing']
  }
})

const createSettings = (overrides: Partial<Settings> = {}): Settings => ({
  skipIfBot: false,
  removeUnmatchedLabels: false,
  onMissingLabel: OnMissingLabel.Create,
  dryRun: false,
  ...overrides
})

const createMatch = (): Match => ({
  operator: MatchOperator.All,
  conditions: [],
  skipIfBot: false
})

const createRule = (label: string): Rule => ({
  label,
  matches: [createMatch()],
  skipIfBot: false
})

const createRulesByEvent = (): RulesByEvent => ({
  [EventType.Issue]: [createRule('bug')],
  [EventType.PullRequest]: [createRule('enhancement')]
})

const createConfig = (settings: Settings): Config => ({
  settings,
  rules: createRulesByEvent()
})

const toLabel = (name: string): Label => ({
  name,
  norm: name.toLowerCase()
})

const createRepositoryLabelDiff = (all: string[], missing: string[] = []): RepositoryLabelDiff => ({
  all: all.map((name) => toLabel(name)),
  missing: missing.map((name) => toLabel(name))
})

const createEvaluationResult = (): LabelEvaluationResult => ({
  toAdd: ['bug'],
  toRemove: [],
  toKeep: []
})

const createApplyResult = (): LabelOperationResult[] => [
  {
    name: 'bug',
    norm: 'bug',
    action: LabelAction.Add,
    result: LabelActionResult.Success,
    simulatedByDryRun: false
  }
]

const createSummaryData = (): SummaryData => ({
  actions: [{ action: LabelAction.Add, count: 1 }],
  outcomes: [{ result: LabelActionResult.Success, count: 1 }],
  reasons: [{ reason: '-', count: 1 }],
  operations: [
    {
      name: 'bug',
      action: LabelAction.Add,
      result: LabelActionResult.Success,
      reason: '-',
      simulatedByDryRun: false
    }
  ]
})

const firstOrder = (mockFn: { mock: { invocationCallOrder: number[] } }): number =>
  mockFn.mock.invocationCallOrder[0]

describe('Unit | Core: main', () => {
  beforeAll(async () => {
    const module = await import('../../src/main.js')
    run = module.run
  })

  beforeEach(() => {
    coreDebugMock.mockReset()
    stringifyLabelsMock.mockReset()
    safeStringifyMock.mockReset()
    buildSummaryDataMock.mockReset()

    safeStringifyMock.mockReturnValue('[stringified]')
    stringifyLabelsMock.mockImplementation((labels) => labels.map((v) => v.name).join(','))
    buildSummaryDataMock.mockReturnValue(createSummaryData())
  })

  describe('run()', () => {
    // 오케스트레이션 경로에서 의존성 호출 순서/인자/반환 조합이 올바른지 검증
    test('returns composed result after wiring all dependencies in order', async () => {
      // given
      const configFilePath = '.github/labeler-config.yml'
      const context = createIssueContext()
      const settings = createSettings({ onMissingLabel: OnMissingLabel.Create })
      const config = createConfig(settings)
      const repositoryLabelDiff = createRepositoryLabelDiff(['bug'], ['missing-label'])
      const evaluationResult = createEvaluationResult()
      const applyResult = createApplyResult()
      const summaryData = createSummaryData()

      const contextService = createContextServiceMock()
      const labelService = createLabelServiceMock()
      const createLabelService: jest.MockedFunction<LabelServiceFactory> = jest.fn(
        () => labelService
      )

      contextService.getContext.mockResolvedValue(context)
      labelService.getConfig.mockResolvedValue(config)
      labelService.getLabelsAndMissing.mockResolvedValue(repositoryLabelDiff)
      labelService.evaluateRules.mockResolvedValue(evaluationResult)
      labelService.applyLabels.mockResolvedValue(applyResult)
      buildSummaryDataMock.mockReturnValue(summaryData)

      safeStringifyMock
        .mockReturnValueOnce('ctx-json')
        .mockReturnValueOnce('config-json')
        .mockReturnValueOnce('repo-diff-json')
        .mockReturnValueOnce('eval-result-json')
        .mockReturnValueOnce('apply-result-json')
        .mockReturnValueOnce('summary-data-json')

      // when
      const result = await run(configFilePath, contextService, createLabelService)

      // then
      expect(result).toEqual({
        context,
        settings,
        summaryData
      })

      expect(contextService.getContext).toHaveBeenCalledTimes(1)
      expect(createLabelService).toHaveBeenCalledWith(context)
      expect(labelService.getConfig).toHaveBeenCalledWith(configFilePath)
      expect(labelService.getLabelsAndMissing).toHaveBeenCalledWith(config.rules)
      expect(labelService.evaluateRules).toHaveBeenCalledWith(
        config.rules[context.eventType],
        config.settings
      )
      expect(labelService.applyLabels).toHaveBeenCalledWith(
        repositoryLabelDiff,
        evaluationResult,
        config.settings
      )
      expect(buildSummaryDataMock).toHaveBeenCalledWith(applyResult)
      expect(stringifyLabelsMock).not.toHaveBeenCalled()

      expect(firstOrder(contextService.getContext)).toBeLessThan(firstOrder(createLabelService))
      expect(firstOrder(createLabelService)).toBeLessThan(firstOrder(labelService.getConfig))
      expect(firstOrder(labelService.getConfig)).toBeLessThan(
        firstOrder(labelService.getLabelsAndMissing)
      )
      expect(firstOrder(labelService.getLabelsAndMissing)).toBeLessThan(
        firstOrder(labelService.evaluateRules)
      )
      expect(firstOrder(labelService.evaluateRules)).toBeLessThan(
        firstOrder(labelService.applyLabels)
      )
      expect(firstOrder(labelService.applyLabels)).toBeLessThan(firstOrder(buildSummaryDataMock))

      expect(coreDebugMock).toHaveBeenNthCalledWith(1, `config-file-path: ${configFilePath}`)
      expect(coreDebugMock).toHaveBeenNthCalledWith(2, 'Parsed Context:\nctx-json')
      expect(coreDebugMock).toHaveBeenNthCalledWith(3, 'Parsed Config:\nconfig-json')
      expect(coreDebugMock).toHaveBeenNthCalledWith(4, 'RepositoryLabelDiff: repo-diff-json')
      expect(coreDebugMock).toHaveBeenNthCalledWith(
        5,
        'Label Evaluation Results:\neval-result-json'
      )
      expect(coreDebugMock).toHaveBeenNthCalledWith(6, 'result:\napply-result-json')
      expect(coreDebugMock).toHaveBeenNthCalledWith(7, 'Summary Data:\nsummary-data-json')

      expect(safeStringifyMock).toHaveBeenNthCalledWith(1, context, 2)
      expect(safeStringifyMock).toHaveBeenNthCalledWith(2, config, 2)
      expect(safeStringifyMock).toHaveBeenNthCalledWith(3, repositoryLabelDiff, 2)
      expect(safeStringifyMock).toHaveBeenNthCalledWith(4, evaluationResult, 2)
      expect(safeStringifyMock).toHaveBeenNthCalledWith(5, applyResult, 2)
      expect(safeStringifyMock).toHaveBeenNthCalledWith(6, summaryData, 2)
    })

    // onMissingLabel=error 이지만 missing 레이블이 없으면 정상 경로를 유지하는지 확인
    test('continues evaluation when error policy has no missing labels', async () => {
      // given
      const context = createIssueContext()
      const settings = createSettings({ onMissingLabel: OnMissingLabel.Error })
      const config = createConfig(settings)
      const repositoryLabelDiff = createRepositoryLabelDiff(['bug'], [])
      const evaluationResult = createEvaluationResult()
      const applyResult = createApplyResult()
      const summaryData = createSummaryData()

      const contextService = createContextServiceMock()
      const labelService = createLabelServiceMock()
      const createLabelService: jest.MockedFunction<LabelServiceFactory> = jest.fn(
        () => labelService
      )

      contextService.getContext.mockResolvedValue(context)
      labelService.getConfig.mockResolvedValue(config)
      labelService.getLabelsAndMissing.mockResolvedValue(repositoryLabelDiff)
      labelService.evaluateRules.mockResolvedValue(evaluationResult)
      labelService.applyLabels.mockResolvedValue(applyResult)
      buildSummaryDataMock.mockReturnValue(summaryData)

      // when
      const result = await run('.github/labeler-config.yml', contextService, createLabelService)

      // then
      expect(result.summaryData).toEqual(summaryData)
      expect(stringifyLabelsMock).not.toHaveBeenCalled()
      expect(labelService.evaluateRules).toHaveBeenCalledTimes(1)
      expect(labelService.applyLabels).toHaveBeenCalledTimes(1)
      expect(buildSummaryDataMock).toHaveBeenCalledTimes(1)
    })

    // onMissingLabel=error + missing 존재 시 즉시 예외를 던지고 이후 단계를 중단하는지 확인
    test('throws when error policy has missing labels and stops downstream calls', async () => {
      // given
      const context = createIssueContext()
      const settings = createSettings({ onMissingLabel: OnMissingLabel.Error })
      const config = createConfig(settings)
      const repositoryLabelDiff = createRepositoryLabelDiff(['bug'], ['missing-a'])

      const contextService = createContextServiceMock()
      const labelService = createLabelServiceMock()
      const createLabelService: jest.MockedFunction<LabelServiceFactory> = jest.fn(
        () => labelService
      )

      contextService.getContext.mockResolvedValue(context)
      labelService.getConfig.mockResolvedValue(config)
      labelService.getLabelsAndMissing.mockResolvedValue(repositoryLabelDiff)
      stringifyLabelsMock.mockReturnValue('missing-a')

      safeStringifyMock
        .mockReturnValueOnce('ctx-json')
        .mockReturnValueOnce('config-json')
        .mockReturnValueOnce('repo-diff-json')

      // when
      const act = run('.github/labeler-config.yml', contextService, createLabelService)

      // then
      await expect(act).rejects.toThrow(
        'Missing labels in repository: onMissingLabel=error, missingLabels=missing-a'
      )
      expect(stringifyLabelsMock).toHaveBeenCalledWith(repositoryLabelDiff.missing)
      expect(labelService.evaluateRules).not.toHaveBeenCalled()
      expect(labelService.applyLabels).not.toHaveBeenCalled()
      expect(buildSummaryDataMock).not.toHaveBeenCalled()
      expect(coreDebugMock).toHaveBeenCalledTimes(4)
      expect(coreDebugMock).toHaveBeenNthCalledWith(2, 'Parsed Context:\nctx-json')
      expect(coreDebugMock).toHaveBeenNthCalledWith(3, 'Parsed Config:\nconfig-json')
      expect(coreDebugMock).toHaveBeenNthCalledWith(4, 'RepositoryLabelDiff: repo-diff-json')
    })
  })
})
