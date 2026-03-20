import { jest } from '@jest/globals'
import type { IConditionResolveService } from '../../../src/services/condition-resolve.service.interface.js'
import type { IGitHubService } from '../../../src/services/github.service.interface.js'
import { ActorType, EventType, MatchOperator, OnMissingLabel } from '../../../src/types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../../src/types/condition-enum.js'
import type { Match, Rule, RulesByEvent, Settings, Config } from '../../../src/types/config.js'
import type { Condition } from '../../../src/types/condition.js'
import type { Context } from '../../../src/types/context.js'
import {
  LabelAction,
  LabelActionReason,
  LabelActionResult,
  type Label,
  type RepositoryLabelDiff
} from '../../../src/types/labels.js'

const coreInfoMock = jest.fn<(message: string) => void>()
const coreDebugMock = jest.fn<(message: string) => void>()
const coreWarningMock = jest.fn<(message: string) => void>()

const yamlParseMock = jest.fn<(content: string) => unknown>()
const parseWithContextMock =
  jest.fn<(schema: unknown, input: unknown, context: unknown) => unknown>()
const parseConfigMock = jest.fn<(raw: unknown, context: unknown) => unknown>()

const resolveByPropertyTypeMock =
  jest.fn<(propertyType: ConditionPropertyType) => unknown | Promise<unknown>>()
const evaluateTagByPropertyTypeMock =
  jest.fn<
    (
      propertyType: ConditionPropertyType,
      tag: { type: ConditionValueTagType },
      resolved: unknown,
      expected: unknown
    ) => boolean
  >()
const getConditionPropertyMock = jest.fn<(propertyType: ConditionPropertyType) => unknown>()
const getConditionValueTagMock =
  jest.fn<(tagType: ConditionValueTagType) => { type: ConditionValueTagType }>()

const fastqPromiseMock = jest.fn<
  (
    context: unknown,
    worker: (this: unknown, item: { label: Label }) => Promise<unknown>,
    concurrency: number
  ) => {
    push: (item: { label: Label }) => Promise<unknown>
    drained: () => Promise<void>
  }
>()

jest.unstable_mockModule('@actions/core', () => ({
  info: (message: string) => coreInfoMock(message),
  debug: (message: string) => coreDebugMock(message),
  warning: (message: string) => coreWarningMock(message)
}))

jest.unstable_mockModule('yaml', () => ({
  parse: (content: string) => yamlParseMock(content)
}))

jest.unstable_mockModule('../../../src/utils/zod.utils.js', () => ({
  parseWithContext: (schema: unknown, input: unknown, context: unknown) =>
    parseWithContextMock(schema, input, context)
}))

jest.unstable_mockModule('../../../src/utils/config-parse.utils.js', () => ({
  parseConfig: (raw: unknown, context: unknown) => parseConfigMock(raw, context)
}))

jest.unstable_mockModule('../../../src/registry/condition.registry.js', () => ({
  getConditionProperty: (propertyType: ConditionPropertyType) =>
    getConditionPropertyMock(propertyType),
  getConditionValueTag: (tagType: ConditionValueTagType) => getConditionValueTagMock(tagType)
}))

jest.unstable_mockModule('fastq', () => ({
  default: {
    promise: (
      context: unknown,
      worker: (this: unknown, item: { label: Label }) => Promise<unknown>,
      concurrency: number
    ) => fastqPromiseMock(context, worker, concurrency)
  }
}))

type LabelServiceModule = typeof import('../../../src/services/label.service.js')

let LabelService: LabelServiceModule['LabelService']

const createGitHubServiceMock = (): jest.Mocked<IGitHubService> =>
  ({
    getIssue: jest.fn(),
    getPullRequest: jest.fn(),
    getContent: jest.fn(),
    listRepositoryLabels: jest.fn(),
    listPullRequestFiles: jest.fn(),
    listPullRequestCommits: jest.fn(),
    listLabelsForIssueOrPr: jest.fn(),
    addLabels: jest.fn(),
    removeLabel: jest.fn()
  }) as jest.Mocked<IGitHubService>

const createConditionResolveServiceMock = (): jest.Mocked<IConditionResolveService> =>
  ({
    resolveChangedFiles: jest.fn(),
    resolveCommitMessages: jest.fn()
  }) as jest.Mocked<IConditionResolveService>

const createLabelService = (context: Context, gitHubService: jest.Mocked<IGitHubService>) =>
  new LabelService(context, gitHubService, createConditionResolveServiceMock())

const createIssueContext = (labels: string[], actorType = ActorType.User): Context => ({
  eventType: EventType.Issue,
  repoOwner: 'octo-org',
  repoName: 'octo-repo',
  action: 'opened',
  actor: actorType === ActorType.Bot ? 'github-actions[bot]' : 'octocat',
  actorType,
  defaultBranch: 'main',
  eventNumber: 101,
  link: {
    url: 'https://github.com/octo-org/octo-repo/issues/101',
    title: 'Issue #101'
  },
  issue: {
    author: 'octocat',
    title: 'issue title',
    body: 'issue body',
    labels
  }
})

const createPullRequestContext = (labels: string[], actorType = ActorType.User): Context => ({
  eventType: EventType.PullRequest,
  repoOwner: 'octo-org',
  repoName: 'octo-repo',
  action: 'synchronize',
  actor: actorType === ActorType.Bot ? 'github-actions[bot]' : 'octocat',
  actorType,
  defaultBranch: 'main',
  eventNumber: 202,
  link: {
    url: 'https://github.com/octo-org/octo-repo/pull/202',
    title: 'PR #202'
  },
  pullRequest: {
    author: 'octocat',
    title: 'pr title',
    body: 'pr body',
    baseBranch: 'main',
    headBranch: 'feature/label-tests',
    isDraft: false,
    changedLines: {
      additions: 10,
      deletions: 2
    },
    labels
  }
})

const createSettings = (overrides: Partial<Settings> = {}): Settings => ({
  skipIfBot: false,
  removeUnmatchedLabels: false,
  onMissingLabel: OnMissingLabel.Create,
  dryRun: false,
  ...overrides
})

const createCondition = (
  propertyType: ConditionPropertyType,
  expected: unknown,
  options: { negate?: boolean; tagType?: ConditionValueTagType } = {}
): Condition =>
  ({
    propertyType,
    tagType: options.tagType ?? ConditionValueTagType.String,
    expected,
    negate: options.negate ?? false
  }) as Condition

const createMatch = (
  conditions: Condition[],
  operator = MatchOperator.All,
  skipIfBot = false
): Match => ({
  operator,
  conditions,
  skipIfBot
})

const createRule = (label: string, matches: Match[]): Rule => ({
  label,
  matches,
  skipIfBot: false
})

const toLabel = (name: string): Label => ({
  name,
  norm: name.toLowerCase()
})

const createRepositoryLabelDiff = (all: string[], missing: string[] = []): RepositoryLabelDiff => ({
  all: all.map((name) => toLabel(name)),
  missing: missing.map((name) => toLabel(name))
})

const countCallsByPropertyType = (propertyType: ConditionPropertyType): number =>
  resolveByPropertyTypeMock.mock.calls.filter(([actual]) => actual === propertyType).length

const findResult = <T extends { name: string; action: LabelAction }>(
  results: readonly T[],
  name: string,
  action: LabelAction
): T | undefined => results.find((result) => result.name === name && result.action === action)

describe('Unit | Services: label.service', () => {
  beforeAll(async () => {
    const module = await import('../../../src/services/label.service.js')
    LabelService = module.LabelService
  })

  beforeEach(() => {
    coreInfoMock.mockReset()
    coreDebugMock.mockReset()
    coreWarningMock.mockReset()

    yamlParseMock.mockReset()
    parseWithContextMock.mockReset()
    parseConfigMock.mockReset()

    resolveByPropertyTypeMock.mockReset()
    evaluateTagByPropertyTypeMock.mockReset()
    getConditionPropertyMock.mockReset()
    getConditionValueTagMock.mockReset()
    fastqPromiseMock.mockReset()

    yamlParseMock.mockImplementation((content) => ({ raw: content }))
    parseWithContextMock.mockImplementation((_schema, input) => input)
    parseConfigMock.mockImplementation((raw) => raw)

    resolveByPropertyTypeMock.mockImplementation((propertyType) => `resolved:${propertyType}`)
    evaluateTagByPropertyTypeMock.mockImplementation((_propertyType, _tag, resolved, expected) => {
      return resolved === expected
    })
    getConditionPropertyMock.mockImplementation((propertyType) => ({
      type: propertyType,
      allowedEvents: [EventType.Issue],
      allowedTags: [ConditionValueTagType.String],
      resolve: () => resolveByPropertyTypeMock(propertyType),
      evaluateTag: (tag: { type: ConditionValueTagType }, resolved: unknown, expected: unknown) =>
        evaluateTagByPropertyTypeMock(propertyType, tag, resolved, expected)
    }))
    getConditionValueTagMock.mockImplementation((tagType) => ({ type: tagType }))

    fastqPromiseMock.mockImplementation((context, worker) => ({
      push: (item) => worker.call(context, item),
      drained: async () => undefined
    }))
  })

  describe('getConfig()', () => {
    // 설정 파일 로딩 시 fetch -> yaml parse -> schema parse -> config parse 파이프라인이 연결되는지 확인
    test('returns parsed configuration from repository content', async () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      const yamlRaw = 'settings:\n  dryRun: false'
      const parsedYaml = { source: 'yaml-object' }
      const parsedRawConfig = { source: 'raw-config' }
      const finalConfig: Config = {
        settings: createSettings(),
        rules: {
          [EventType.Issue]: [],
          [EventType.PullRequest]: []
        }
      }
      gitHubService.getContent.mockResolvedValue(yamlRaw)
      yamlParseMock.mockReturnValue(parsedYaml)
      parseWithContextMock.mockReturnValue(parsedRawConfig)
      parseConfigMock.mockReturnValue(finalConfig)

      // when
      const result = await service.getConfig('labeler-config.yml')

      // then
      expect(gitHubService.getContent).toHaveBeenCalledWith(
        'octo-org',
        'octo-repo',
        'main',
        '.github/labeler-config.yml'
      )
      expect(yamlParseMock).toHaveBeenCalledWith(yamlRaw)
      expect(parseWithContextMock).toHaveBeenCalledWith(
        expect.anything(),
        parsedYaml,
        expect.objectContaining({ message: 'Parsing configuration file' })
      )
      expect(parseConfigMock).toHaveBeenCalledWith(
        parsedRawConfig,
        expect.objectContaining({ message: 'Parsing configuration file' })
      )
      expect(coreDebugMock).toHaveBeenCalled()
      expect(result).toBe(finalConfig)
    })
  })

  describe('getLabelsAndMissing()', () => {
    // 저장소 레이블 대비 설정 레이블 누락 항목을 정상 계산하는지 확인
    test('returns repository labels and missing labels from rules', async () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      const rules: RulesByEvent = {
        [EventType.Issue]: [createRule('bug', []), createRule('help wanted', [])],
        [EventType.PullRequest]: [createRule('enhancement', [])]
      }
      gitHubService.listRepositoryLabels.mockResolvedValue(['bug', 'enhancement'])

      // when
      const result = await service.getLabelsAndMissing(rules)

      // then
      expect(gitHubService.listRepositoryLabels).toHaveBeenCalledWith('octo-org', 'octo-repo')
      expect(result.all).toEqual([toLabel('bug'), toLabel('enhancement')])
      expect(result.missing).toEqual([toLabel('help wanted')])
    })
  })

  describe('evaluateRules()', () => {
    // 첫 번째 match에서 pass가 나오면 add로 확정되고 이후 match 평가를 중단하는지 확인
    test('returns add and short-circuits remaining matches when a match passes', async () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      resolveByPropertyTypeMock.mockImplementation((propertyType) => {
        if (propertyType === ConditionPropertyType.Title) {
          return 'ready'
        }
        return 'not-used'
      })
      const rules: Rule[] = [
        createRule('ready-label', [
          createMatch([createCondition(ConditionPropertyType.Title, 'ready')], MatchOperator.All),
          createMatch(
            [createCondition(ConditionPropertyType.Body, 'must-not-run')],
            MatchOperator.All
          )
        ])
      ]

      // when
      const result = await service.evaluateRules(
        rules,
        createSettings({ removeUnmatchedLabels: true })
      )

      // then
      expect(result).toEqual({
        toAdd: ['ready-label'],
        toRemove: [],
        toKeep: []
      })
      expect(resolveByPropertyTypeMock).not.toHaveBeenCalledWith(ConditionPropertyType.Body)
    })

    // all/any 연산자 실패와 property cache를 반영해 removeUnmatchedLabels가 remove로 전환하는지 확인
    test('returns remove when all evaluated matches fail and removeUnmatchedLabels is true', async () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      resolveByPropertyTypeMock.mockImplementation((propertyType) => {
        if (propertyType === ConditionPropertyType.Title) {
          return 'cache-hit'
        }
        if (propertyType === ConditionPropertyType.Body) {
          return 'none'
        }
        return 'other'
      })
      const rules: Rule[] = [
        createRule('remove-me', [
          createMatch(
            [
              createCondition(ConditionPropertyType.Title, 'cache-hit'),
              createCondition(ConditionPropertyType.Title, 'different')
            ],
            MatchOperator.All
          ),
          createMatch(
            [
              createCondition(ConditionPropertyType.Body, 'target-a'),
              createCondition(ConditionPropertyType.Body, 'target-b')
            ],
            MatchOperator.Any
          )
        ])
      ]

      // when
      const result = await service.evaluateRules(
        rules,
        createSettings({ removeUnmatchedLabels: true })
      )

      // then
      expect(result).toEqual({
        toAdd: [],
        toRemove: ['remove-me'],
        toKeep: []
      })
      expect(countCallsByPropertyType(ConditionPropertyType.Title)).toBe(1)
      expect(countCallsByPropertyType(ConditionPropertyType.Body)).toBe(1)
    })

    // 봇 이벤트에서 skipIfBot=true match는 skip 처리되어 keep으로 남는지 확인
    test('returns keep when all matches are skipped for bot actor', async () => {
      // given
      const context = createIssueContext([], ActorType.Bot)
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      const rules: Rule[] = [
        createRule('skipped-for-bot', [
          createMatch(
            [createCondition(ConditionPropertyType.Title, 'ready')],
            MatchOperator.All,
            true
          )
        ])
      ]

      // when
      const result = await service.evaluateRules(
        rules,
        createSettings({ removeUnmatchedLabels: true })
      )

      // then
      expect(result).toEqual({
        toAdd: [],
        toRemove: [],
        toKeep: ['skipped-for-bot']
      })
      expect(getConditionPropertyMock).not.toHaveBeenCalled()
    })

    // negate=true 조건과 any short-circuit pass가 결합될 때 add로 판정되는지 확인
    test('handles negate condition and passes any operator with short-circuit', async () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      resolveByPropertyTypeMock.mockImplementation((propertyType) => {
        if (propertyType === ConditionPropertyType.Title) {
          return 'blocked'
        }
        return 'should-not-run'
      })
      const rules: Rule[] = [
        createRule('negated-add', [
          createMatch(
            [
              createCondition(ConditionPropertyType.Title, 'different', { negate: true }),
              createCondition(ConditionPropertyType.Body, 'never')
            ],
            MatchOperator.Any
          )
        ])
      ]

      // when
      const result = await service.evaluateRules(rules, createSettings())

      // then
      expect(result).toEqual({
        toAdd: ['negated-add'],
        toRemove: [],
        toKeep: []
      })
      expect(resolveByPropertyTypeMock).not.toHaveBeenCalledWith(ConditionPropertyType.Body)
    })
  })

  describe('applyLabels()', () => {
    // add/remove/keep 조합에서 정책별 skip/pending/success 흐름과 정렬 결과를 검증
    test('applies labels with mixed add/remove/keep decisions in non-dry-run mode', async () => {
      // given
      const context = createIssueContext(['bug', 'old', 'present'])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      const repositoryLabelDiff = createRepositoryLabelDiff(
        ['Bug', 'feature', 'old', 'present', 'absent-existing'],
        ['new-label', 'missing-remove']
      )
      const labelEvaluation = {
        toAdd: ['bug', 'new-label', 'feature'],
        toRemove: ['old', 'missing-remove', 'absent-existing'],
        toKeep: ['present']
      }

      // when
      const results = await service.applyLabels(
        repositoryLabelDiff,
        labelEvaluation,
        createSettings()
      )

      // then
      expect(gitHubService.addLabels).toHaveBeenCalledWith('octo-org', 'octo-repo', 101, [
        'new-label',
        'feature'
      ])
      expect(gitHubService.removeLabel).toHaveBeenCalledWith('octo-org', 'octo-repo', 101, 'old')
      expect(fastqPromiseMock).toHaveBeenCalledWith(expect.anything(), expect.any(Function), 5)

      const sortedNames = [...results.map((result) => result.name)].sort((a, b) =>
        a.localeCompare(b)
      )
      expect(results.map((result) => result.name)).toEqual(sortedNames)

      expect(findResult(results, 'Bug', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Skipped,
        reason: LabelActionReason.AlreadyPresent,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'new-label', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Success,
        reason: LabelActionReason.MissingLabelCreatePolicy,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'feature', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Success,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'old', LabelAction.Remove)).toMatchObject({
        result: LabelActionResult.Success,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'missing-remove', LabelAction.Remove)).toMatchObject({
        result: LabelActionResult.Skipped,
        reason: LabelActionReason.AlreadyAbsent,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'absent-existing', LabelAction.Remove)).toMatchObject({
        result: LabelActionResult.Skipped,
        reason: LabelActionReason.AlreadyAbsent,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'present', LabelAction.None)).toMatchObject({
        result: LabelActionResult.Noop,
        simulatedByDryRun: false
      })
    })

    // dry-run + onMissing=skip 조합에서 API 호출 없이 정책 결과만 기록되는지 확인
    test('records dry-run and missing-label skip policies without calling GitHub APIs', async () => {
      // given
      const context = createPullRequestContext(['existing'])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      const repositoryLabelDiff = createRepositoryLabelDiff(['existing', 'to-add'], ['new'])
      const labelEvaluation = {
        toAdd: ['new', 'existing', 'to-add'],
        toRemove: ['new', 'existing'],
        toKeep: []
      }
      const settings = createSettings({
        dryRun: true,
        onMissingLabel: OnMissingLabel.Skip
      })

      // when
      const results = await service.applyLabels(repositoryLabelDiff, labelEvaluation, settings)

      // then
      expect(coreInfoMock).toHaveBeenCalledWith(
        'Dry run enabled. no label changes will be applied.'
      )
      expect(gitHubService.addLabels).not.toHaveBeenCalled()
      expect(gitHubService.removeLabel).not.toHaveBeenCalled()
      expect(findResult(results, 'new', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Skipped,
        reason: LabelActionReason.MissingLabelSkipPolicy,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'existing', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Skipped,
        reason: LabelActionReason.AlreadyPresent,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'to-add', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Success,
        simulatedByDryRun: true
      })
      expect(findResult(results, 'new', LabelAction.Remove)).toMatchObject({
        result: LabelActionResult.Skipped,
        reason: LabelActionReason.MissingLabelSkipPolicy,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'existing', LabelAction.Remove)).toMatchObject({
        result: LabelActionResult.Success,
        simulatedByDryRun: true
      })
    })

    // add/remove API 실패 시 HTTP status별 실패 사유(422/404)를 정확히 매핑하는지 확인
    test('maps add/remove API errors to failure reasons', async () => {
      // given
      const context = createIssueContext(['remove-me'])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      gitHubService.addLabels.mockRejectedValue({
        status: 422,
        message: 'Validation failed'
      })
      gitHubService.removeLabel.mockRejectedValue({
        status: 404,
        message: 'Not found'
      })
      const repositoryLabelDiff = createRepositoryLabelDiff(['add-me', 'remove-me'])
      const labelEvaluation = {
        toAdd: ['add-me'],
        toRemove: ['remove-me'],
        toKeep: []
      }

      // when
      const results = await service.applyLabels(
        repositoryLabelDiff,
        labelEvaluation,
        createSettings()
      )

      // then
      expect(findResult(results, 'add-me', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Failed,
        reason: LabelActionReason.Http422ValidationFailed,
        simulatedByDryRun: false
      })
      expect(findResult(results, 'remove-me', LabelAction.Remove)).toMatchObject({
        result: LabelActionResult.Failed,
        reason: LabelActionReason.Http404NotFound,
        simulatedByDryRun: false
      })
      expect(coreWarningMock).toHaveBeenCalled()
    })
  })

  describe('internal fallback branches', () => {
    // executeAddOperations의 dry-run 분기가 pending 항목을 성공으로 반환하는지 확인
    test('returns dry-run add results from executeAddOperations', async () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      const pending = [
        { label: toLabel('missing-label'), isMissing: true },
        { label: toLabel('existing-label'), isMissing: false }
      ]

      // when
      const results = await (service as any).executeAddOperations(
        pending,
        createSettings({ dryRun: true })
      )

      // then
      expect(gitHubService.addLabels).not.toHaveBeenCalled()
      expect(findResult(results, 'missing-label', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Success,
        reason: LabelActionReason.MissingLabelCreatePolicy,
        simulatedByDryRun: true
      })
      expect(findResult(results, 'existing-label', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Success,
        simulatedByDryRun: true
      })
    })

    // executeAddOperations에서 비표준 오류(primitive)가 발생하면 api_error로 처리하는지 확인
    test('returns api_error when executeAddOperations catches non-http error', async () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      gitHubService.addLabels.mockRejectedValue('boom')
      const pending = [{ label: toLabel('unstable'), isMissing: false }]

      // when
      const results = await (service as any).executeAddOperations(pending, createSettings())

      // then
      expect(findResult(results, 'unstable', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Failed,
        reason: LabelActionReason.ApiError,
        simulatedByDryRun: false
      })
    })

    // prepareAdd/prepareRemove의 누락 정책 분기(create/skip)를 직접 호출로 검증
    test('covers missing-label policy branches in prepare operations', () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)

      // when
      const preparedAdd = (service as any).prepareAddOperations(
        ['missing-add'],
        new Map<string, Label>(),
        new Set<string>(['missing-add']),
        new Set<string>(),
        createSettings({
          dryRun: true,
          onMissingLabel: OnMissingLabel.Create
        })
      )
      const preparedRemove = (service as any).prepareRemoveOperations(
        ['missing-remove'],
        new Map<string, Label>(),
        new Set<string>(['missing-remove']),
        new Set<string>(['missing-remove']),
        createSettings({
          onMissingLabel: OnMissingLabel.Skip
        })
      )
      const preparedRemoveWithErrorPolicy = (service as any).prepareRemoveOperations(
        ['missing-remove-error'],
        new Map<string, Label>(),
        new Set<string>(['missing-remove-error']),
        new Set<string>(['missing-remove-error']),
        createSettings({
          onMissingLabel: OnMissingLabel.Error
        })
      )

      // then
      expect(findResult(preparedAdd.results, 'missing-add', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Success,
        reason: LabelActionReason.MissingLabelCreatePolicy,
        simulatedByDryRun: true
      })
      expect(
        findResult(preparedRemove.results, 'missing-remove', LabelAction.Remove)
      ).toMatchObject({
        result: LabelActionResult.Skipped,
        reason: LabelActionReason.MissingLabelSkipPolicy,
        simulatedByDryRun: false
      })
      expect(preparedRemoveWithErrorPolicy.pending).toEqual([
        {
          label: toLabel('missing-remove-error')
        }
      ])
    })

    // add/remove 실패 시 Error.message 경로(err instanceof Error)를 사용하는지 확인
    test('uses Error.message in add and remove failure logs', async () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)
      gitHubService.addLabels.mockRejectedValue(new Error('add-error-message'))
      gitHubService.removeLabel.mockRejectedValue(new Error('remove-error-message'))

      // when
      const addResults = await (service as any).executeAddOperations(
        [{ label: toLabel('err-add'), isMissing: false }],
        createSettings()
      )
      const removeResult = await (service as any).removeLabelTask({
        label: toLabel('err-remove')
      })

      // then
      expect(findResult(addResults, 'err-add', LabelAction.Add)).toMatchObject({
        result: LabelActionResult.Failed,
        reason: LabelActionReason.ApiError,
        simulatedByDryRun: false
      })
      expect(removeResult).toMatchObject({
        name: 'err-remove',
        action: LabelAction.Remove,
        result: LabelActionResult.Failed,
        reason: LabelActionReason.ApiError,
        simulatedByDryRun: false
      })
      expect(coreWarningMock).toHaveBeenCalledWith(expect.stringContaining('add-error-message'))
      expect(coreWarningMock).toHaveBeenCalledWith(expect.stringContaining('remove-error-message'))
    })

    // executeRemoveOperations의 empty/dry-run 방어 분기를 검증
    test('handles empty and dry-run branches in executeRemoveOperations', async () => {
      // given
      const context = createIssueContext([])
      const gitHubService = createGitHubServiceMock()
      const service = createLabelService(context, gitHubService)

      // when
      const emptyResults = await (service as any).executeRemoveOperations([], createSettings())
      const dryRunResults = await (service as any).executeRemoveOperations(
        [{ label: toLabel('cleanup') }],
        createSettings({ dryRun: true })
      )

      // then
      expect(emptyResults).toEqual([])
      expect(findResult(dryRunResults, 'cleanup', LabelAction.Remove)).toMatchObject({
        result: LabelActionResult.Success,
        simulatedByDryRun: true
      })
      expect(gitHubService.removeLabel).not.toHaveBeenCalled()
    })
  })
})
