import * as core from '@actions/core'
import fastq from 'fastq'
import { parse } from 'yaml'
import type { IConditionResolveService } from './condition-resolve.service.interface.js'
import type { IGitHubService } from './github.service.interface.js'
import type { ILabelService } from './label.service.interface.js'
import { getConditionProperty, getConditionValueTag } from '../registry/condition.registry.js'
import {
  ActorType,
  EventType,
  type Immutable,
  MatchOperator,
  OnMissingLabel
} from '../types/common.js'
import type { ConditionPropertyType } from '../types/condition-enum.js'
import type { Condition } from '../types/condition.js'
import { RawConfigSchema } from '../types/config-raw.schema.js'
import type { Config, Match, Rule, RulesByEvent, Settings } from '../types/config.js'
import type { Context, IssueContext, PullRequestContext } from '../types/context.js'
import {
  type Label,
  LabelAction,
  LabelActionReason,
  LabelActionResult,
  type LabelEvaluationResult,
  type LabelOperationResult,
  type RepositoryLabelDiff
} from '../types/labels.js'
import { extractHttpStatus } from '../utils/common.utils.js'
import type { ConditionPropertyTagEvaluatorFn } from '../utils/condition-definition.utils.js'
import { parseConfig } from '../utils/config-parse.utils.js'
import { makeLabel, makeLabels, makeOperationResult } from '../utils/label.utils.js'
import { safeStringify } from '../utils/string.utils.js'
import { parseWithContext } from '../utils/zod.utils.js'

enum LabelDecision {
  Add = 'add',
  Remove = 'remove',
  Keep = 'keep'
}

enum MatchResult {
  Pass = 'pass',
  Fail = 'fail',
  Skip = 'skip'
}

/**
 * Container for the data required to add a label.
 * - label: normalized label object used for the actual API call
 * - isMissing: whether the label did not exist in the repository
 */
interface PendingAddOperation {
  label: Label
  isMissing: boolean
}

/**
 * Container for the data required to remove a label.
 * - label: normalized label object used for the actual API call
 */
interface PendingRemoveOperation {
  label: Label
}

/**
 * Container that separates results finalized during preparation from items that still require API calls.
 * - pending: items that still require actual GitHub API calls
 * - results: results finalized immediately by dry-run, policy, or similar cases
 */
interface PreparedOperations<T extends PendingAddOperation | PendingRemoveOperation> {
  pending: T[]
  results: LabelOperationResult[]
}

// Limits concurrent remove requests to reduce GitHub API bursts.
const REMOVE_LABEL_CONCURRENCY = 5

export class LabelService implements ILabelService {
  /**
   * EventType → label extractor mapping
   */
  private static readonly labelExtractorsByEvent = {
    [EventType.Issue]: (context: Immutable<Context>) => (context as IssueContext).issue.labels,
    [EventType.PullRequest]: (context: Immutable<Context>) =>
      (context as PullRequestContext).pullRequest.labels
  } satisfies Record<EventType, (context: Immutable<Context>) => string[]>

  private readonly propertyCache = new Map<ConditionPropertyType, unknown>()

  public constructor(
    private readonly context: Immutable<Context>,
    private readonly gitHubService: IGitHubService,
    private readonly conditionResolveService: IConditionResolveService
  ) {}

  // ============================================================================
  // 🔹 Public
  // ============================================================================

  /**
   * Read and parse the configuration file in the repository and return it to the Config object.
   */
  public async getConfig(configFilePath: string): Promise<Immutable<Config>> {
    const content = await this.gitHubService.getContent(
      this.context.repoOwner,
      this.context.repoName,
      this.context.defaultBranch,
      `.github/${configFilePath}`
    )

    const raw = parse(content)

    const zodContext = { message: 'Parsing configuration file' }
    const rawConfig = parseWithContext(RawConfigSchema, raw, zodContext)
    core.debug(`Raw Config:\n${safeStringify(rawConfig, 2)}`)

    const config = parseConfig(rawConfig, zodContext)

    return config
  }

  /**
   * Returns repository labels along with labels missing from the config.
   */
  public async getLabelsAndMissing(
    rules: Immutable<RulesByEvent>
  ): Promise<Immutable<RepositoryLabelDiff>> {
    const allNames = await this.gitHubService.listRepositoryLabels(
      this.context.repoOwner,
      this.context.repoName
    )

    const all = makeLabels(allNames)
    const repoNorms = new Set(all.map((l) => l.norm))

    const missing = new Set<Label>()

    for (const rule of Object.values(rules).flat()) {
      const label = makeLabel(rule.label)
      if (!repoNorms.has(label.norm)) {
        missing.add(label)
      }
    }

    return { all, missing: Array.from(missing) }
  }

  /**
   * Evaluate rules and categorize labels to add, remove, or keep.
   */
  public async evaluateRules(
    rules: Immutable<Rule[]>,
    settings: Immutable<Settings>
  ): Promise<Immutable<LabelEvaluationResult>> {
    const toAdd: string[] = []
    const toRemove: string[] = []
    const toKeep: string[] = []

    for (const rule of rules) {
      const decision = await this.evaluateRule(rule, settings)

      switch (decision) {
        case LabelDecision.Add: {
          toAdd.push(rule.label)
          break
        }
        case LabelDecision.Remove: {
          toRemove.push(rule.label)
          break
        }
        case LabelDecision.Keep: {
          toKeep.push(rule.label)
          break
        }
      }
    }

    return { toAdd, toRemove, toKeep }
  }

  /**
   * Applies label changes (add, remove, keep) to a issue or pull request.
   */
  public async applyLabels(
    repositoryLabelDiff: Immutable<RepositoryLabelDiff>,
    labelEvaluation: Immutable<LabelEvaluationResult>,
    settings: Immutable<Settings>
  ): Promise<Immutable<LabelOperationResult[]>> {
    if (settings.dryRun) {
      core.info('Dry run enabled. no label changes will be applied.')
    }

    // 저장소 전체 레이블과 설정 파일엔 있지만 저장소에 없는 레이블 분리
    const { all: allLabels, missing: missingLabels } = repositoryLabelDiff

    // 비교는 소문자(norm) 기준으로 수행하므로 빠르게 접근할 수 있도록 맵 구성
    const repoLabelByNorm = new Map(allLabels.map((label) => [label.norm, label]))
    const missingLabelNorms = new Set(missingLabels.map((label) => label.norm))

    // 현재 이슈/PR에 붙어있는 레이블 목록 얻기
    const currentLabels = await this.getLabelsForIssueOrPr()
    const currentLabelNorms = new Set(currentLabels.map((label) => label.norm))

    // 1) 추가 대상 레이블 처리: 정책에 따라 즉시 결과 확정/대기 목록 분리
    const addPrepared = this.prepareAddOperations(
      labelEvaluation.toAdd,
      repoLabelByNorm,
      missingLabelNorms,
      currentLabelNorms,
      settings
    )
    // 2) 제거 대상 레이블 처리: 정책/현재 상태에 따라 즉시 결과 확정/대기 목록 분리
    const removePrepared = this.prepareRemoveOperations(
      labelEvaluation.toRemove,
      repoLabelByNorm,
      missingLabelNorms,
      currentLabelNorms,
      settings
    )

    // 3) 실제 추가 API 호출 수행 (dry-run이면 noop 결과를 반환)
    const addResults = await this.executeAddOperations(addPrepared.pending, settings)
    // 4) 제거 API는 레이블별 개별 호출 (병렬 실행)
    const removeResults = await this.executeRemoveOperations(removePrepared.pending, settings)

    // 5) 유지 대상 레이블은 아무 작업 없이 noop 결과로 반환
    const keepResults = labelEvaluation.toKeep.map((raw) => {
      const label = this.resolveLabel(raw, repoLabelByNorm)
      return this.makeLoggedOperationResult(label, LabelAction.None, LabelActionResult.Noop)
    })

    // 모든 결과를 합쳐 레이블 이름 기준으로 정렬하여 일관된 출력 보장
    const results = [
      ...addPrepared.results,
      ...addResults,
      ...removePrepared.results,
      ...removeResults,
      ...keepResults
    ]

    return results.sort((a, b) => a.name.localeCompare(b.name))
  }

  // ============================================================================
  // 🔸 Internal Implementation
  // ============================================================================

  /**
   * Evaluate a rule.
   */
  private async evaluateRule(
    rule: Immutable<Rule>,
    settings: Immutable<Settings>
  ): Promise<LabelDecision> {
    const path = `Rule:${rule.label}`
    core.debug(`[${path}] Evaluation starting`)

    let result = LabelDecision.Keep

    let evaluatedMatches = 0
    let failedMatches = 0
    let skippedMatches = 0

    for (const [index, match] of rule.matches.entries()) {
      const matchPath = `${path} > match#${index + 1}`
      const matchResult = await this.evaluateMatch(match, matchPath)

      switch (matchResult) {
        case MatchResult.Pass:
          result = LabelDecision.Add
          break
        case MatchResult.Fail:
          evaluatedMatches += 1
          failedMatches += 1
          break
        case MatchResult.Skip:
          skippedMatches += 1
          break
      }

      // short-circuit
      if (result === LabelDecision.Add) {
        // matches 중 하나라도 pass인 경우 레이블 추가
        break
      }
    }

    // Add가 아닌 경우 removeUnmatchedLabels 적용 여부 판단
    if (
      result !== LabelDecision.Add &&
      settings.removeUnmatchedLabels &&
      evaluatedMatches > 0 &&
      failedMatches === evaluatedMatches
    ) {
      // removeUnmatchedLabels == true 이면서
      // 평가된(non-skip) Match가 최소 1개 존재하며, 그들이 모두 fail일 경우
      result = LabelDecision.Remove
    }

    core.debug(
      `[${path}] Evaluation End -> ${String(result).padEnd(5)}` +
        ` - evaluated:${evaluatedMatches}, failed:${failedMatches}, skipped:${skippedMatches}`
    )

    return result
  }

  /**
   * Evaluate a match.
   */
  private async evaluateMatch(match: Immutable<Match>, path: string): Promise<MatchResult> {
    let result: MatchResult

    if (this.context.actorType === ActorType.Bot && match.skipIfBot) {
      result = MatchResult.Skip
    } else {
      result = await this.evaluateConditions(match, path)
    }

    core.debug(
      `[${path}]: ${result}` +
        ` - op: ${match.operator}, skipIfBot: ${match.skipIfBot}, actorType: ${this.context.actorType}`
    )
    return result
  }

  /**
   * Evaluate conditions.
   */
  private async evaluateConditions(
    match: Immutable<Match>,
    matchPath: string
  ): Promise<MatchResult> {
    const isAnyOperator = match.operator === MatchOperator.Any
    const result = isAnyOperator ? MatchResult.Fail : MatchResult.Pass

    for (const [index, condition] of match.conditions.entries()) {
      const conditionResult = await this.evaluateCondition(
        condition,
        `${matchPath} > condition#${index}`
      )

      // short-circuit
      if (isAnyOperator && conditionResult) {
        return MatchResult.Pass
      } else if (!isAnyOperator && !conditionResult) {
        return MatchResult.Fail
      }
    }

    return result
  }

  /**
   * Evaluate a condition.
   */
  private async evaluateCondition(condition: Condition, path: string): Promise<boolean> {
    const property = getConditionProperty(condition.propertyType)
    const tag = getConditionValueTag(condition.tagType)

    // 평가 받을 값
    type ResolvedValue = Awaited<ReturnType<(typeof property)['resolve']>>
    let resolved: ResolvedValue

    const cacheKey = condition.propertyType
    if (this.propertyCache.has(cacheKey)) {
      resolved = this.propertyCache.get(cacheKey) as ResolvedValue
    } else {
      resolved = (await property.resolve(
        this.context,
        this.conditionResolveService
      )) as ResolvedValue
      this.propertyCache.set(cacheKey, resolved)
    }

    // 설정 파일에 작성한 값
    const expected = condition.expected

    // 파싱 단계에서 property/tag/expected 타입이 확정되어 evaluator를 타입 안전하게 호출
    const evalFn = property.evaluateTag as ConditionPropertyTagEvaluatorFn<
      typeof tag.type,
      ResolvedValue
    >
    const matched = evalFn(tag, resolved, expected)

    const result = condition.negate ? !matched : matched
    core.debug(
      `[${path}]: ${String(result).padEnd(5)}` +
        ` - ${condition.propertyType}: ${safeStringify(expected)}`
    )

    return result
  }

  /**
   * 추가 대상 레이블을 정책에 따라 스킵/대기 목록으로 분류합니다.
   * - 이미 붙어 있는 레이블은 스킵
   * - OnMissingLabel.Skip 정책이면서 저장소에 존재하지 않는 레이블은 스킵
   * - dry-run일 경우 실제 실행과 동일한 결과를 success로 기록하되 simulatedByDryRun 플래그만 설정
   * - 위 조건에 해당하지 않는 항목만 pending으로 넘겨 실제 API를 호출하도록 합니다.
   */
  private prepareAddOperations(
    rawLabels: Immutable<string[]>,
    repoLabelByNorm: Map<string, Label>,
    missingLabelNorms: Set<string>,
    currentLabelNorms: Set<string>,
    settings: Settings
  ): PreparedOperations<PendingAddOperation> {
    const prepared: PreparedOperations<PendingAddOperation> = {
      pending: [],
      results: []
    }

    for (const raw of rawLabels) {
      // 설정 파일에 정의된 레이블을 저장소 기준으로 정규화
      const label = this.resolveLabel(raw, repoLabelByNorm)
      const isMissing = missingLabelNorms.has(label.norm)

      if (currentLabelNorms.has(label.norm)) {
        // 1.3) 레이블이 저장소에 존재하면서 이슈/PR에 이미 추가되어 있는 경우
        prepared.results.push(
          this.makeLoggedOperationResult(
            label,
            LabelAction.Add,
            LabelActionResult.Skipped,
            LabelActionReason.AlreadyPresent
          )
        )
        continue
      }

      if (isMissing && settings.onMissingLabel === OnMissingLabel.Skip) {
        // 1.2) 레이블이 저장소에 존재하지 않으면서 OnMissingLabel.Skip인 경우
        prepared.results.push(
          this.makeLoggedOperationResult(
            label,
            LabelAction.Add,
            LabelActionResult.Skipped,
            LabelActionReason.MissingLabelSkipPolicy
          )
        )
        continue
      }

      // 1.1) 레이블이 저장소에 존재하지 않으면서 OnMissingLabel.Create인 경우 (isMissing == true)
      // 1.4) 레이블이 저장소에 존재하면서 이슈/PR에 추가되어 있지 않은 경우 (isMissing == false)

      if (settings.dryRun) {
        // dryRun일 경우
        const reason =
          isMissing && settings.onMissingLabel === OnMissingLabel.Create
            ? LabelActionReason.MissingLabelCreatePolicy
            : undefined
        prepared.results.push(
          this.makeLoggedOperationResult(
            label,
            LabelAction.Add,
            LabelActionResult.Success,
            reason,
            true
          )
        )
        continue
      }

      // 실제 추가 API를 호출해야 하므로 pending 목록에 추가하고 현재 상태 갱신
      prepared.pending.push({ label, isMissing })
      currentLabelNorms.add(label.norm)
    }

    return prepared
  }

  /**
   * 제거 대상 레이블을 정책에 따라 스킵/대기 목록으로 분류합니다.
   * - 이미 붙어 있지 않은 레이블은 스킵
   * - 저장소에 없는 레이블은 정책에 따라 미리 스킵 (Create: 이미 없음으로 간주, Skip: 정책 스킵)
   * - dry-run일 경우 실제 실행과 동일한 성공 결과를 success로 기록하되 simulatedByDryRun 플래그만 설정
   * - 나머지 항목만 pending으로 넘겨 실제 제거 API를 호출합니다.
   */
  private prepareRemoveOperations(
    rawLabels: Immutable<string[]>,
    repoLabelByNorm: Map<string, Label>,
    missingLabelNorms: Set<string>,
    currentLabelNorms: Set<string>,
    settings: Settings
  ): PreparedOperations<PendingRemoveOperation> {
    const prepared: PreparedOperations<PendingRemoveOperation> = {
      pending: [],
      results: []
    }

    for (const raw of rawLabels) {
      // 설정 파일 기준 레이블을 저장소 레이블로 정규화
      const label = this.resolveLabel(raw, repoLabelByNorm)
      const isMissing = missingLabelNorms.has(label.norm)

      if (isMissing) {
        if (settings.onMissingLabel === OnMissingLabel.Create) {
          // 2.1) 레이블이 저장소에 존재하지 않으면서 OnMissingLabel.Create인 경우
          prepared.results.push(
            this.makeLoggedOperationResult(
              label,
              LabelAction.Remove,
              LabelActionResult.Skipped,
              LabelActionReason.AlreadyAbsent
            )
          )
          continue
        }

        if (settings.onMissingLabel === OnMissingLabel.Skip) {
          // 2.2) 레이블이 저장소에 존재하지 않으면서 OnMissingLabel.Skip인 경우
          prepared.results.push(
            this.makeLoggedOperationResult(
              label,
              LabelAction.Remove,
              LabelActionResult.Skipped,
              LabelActionReason.MissingLabelSkipPolicy
            )
          )
          continue
        }
      }

      if (!currentLabelNorms.has(label.norm)) {
        // 2.3) 레이블이 저장소에 존재하면서 이슈/PR에 이미 제거되어 있는 경우
        prepared.results.push(
          this.makeLoggedOperationResult(
            label,
            LabelAction.Remove,
            LabelActionResult.Skipped,
            LabelActionReason.AlreadyAbsent
          )
        )
        continue
      }

      // 2.4) 레이블이 저장소에 존재하면서 이슈/PR에 제거되어 있지 않은 경우

      if (settings.dryRun) {
        // dryRun일 경우
        prepared.results.push(
          this.makeLoggedOperationResult(
            label,
            LabelAction.Remove,
            LabelActionResult.Success,
            undefined,
            true
          )
        )
        continue
      }

      // 실제 제거 API 호출 대상이므로 pending에 저장하고 현재 상태 갱신
      prepared.pending.push({ label })
      currentLabelNorms.delete(label.norm)
    }

    return prepared
  }

  /**
   * pending으로 남겨둔 추가 작업을 한 번의 API 호출로 처리합니다.
   * - dry-run이면 실제 실행과 동일한 성공 결과를 success로 기록하되 simulatedByDryRun 플래그를 세팅
   * - 실제 호출 실패하더라도 전체 처리를 중단하지 않고 각 레이블별 실패 결과를 기록합니다.
   */
  private async executeAddOperations(
    pending: PendingAddOperation[],
    settings: Settings
  ): Promise<LabelOperationResult[]> {
    if (pending.length === 0) {
      return []
    }

    const resolveMissingReason = (item: PendingAddOperation): LabelActionReason | undefined =>
      item.isMissing ? LabelActionReason.MissingLabelCreatePolicy : undefined

    if (settings.dryRun) {
      // 사전에 필터링했지만 중복 체크
      return pending.map((item) =>
        this.makeLoggedOperationResult(
          item.label,
          LabelAction.Add,
          LabelActionResult.Success,
          resolveMissingReason(item),
          true
        )
      )
    }

    const labelsToAdd = pending.map((item) => item.label.name)

    try {
      // addLabels API는 여러 레이블을 한 번에 추가할 수 있음
      await this.gitHubService.addLabels(
        this.context.repoOwner,
        this.context.repoName,
        this.context.eventNumber,
        labelsToAdd
      )

      return pending.map((item) =>
        // missing 레이블이었으면 생성 후 추가되었으므로 MissingLabelCreatePolicy 사유 부여
        this.makeLoggedOperationResult(
          item.label,
          LabelAction.Add,
          LabelActionResult.Success,
          resolveMissingReason(item)
        )
      )
    } catch (err: unknown) {
      // 실패해도 전체 과정을 중단하지 않고 각 레이블에 실패 결과를 기록
      const reason = this.resolveFailureReason(err)
      const message = err instanceof Error ? err.message : String(err)
      core.warning(`[LabelService] Failed to add labels [${labelsToAdd.join(', ')}]: ${message}`)

      return pending.map((item) =>
        this.makeLoggedOperationResult(
          item.label,
          LabelAction.Add,
          LabelActionResult.Failed,
          reason
        )
      )
    }
  }

  /**
   * pending으로 남겨둔 제거 작업을 레이블별로 개별 API 호출(병렬)로 처리합니다.
   * - dry-run이면 실제 실행과 동일한 성공 결과를 success로 기록하되 simulatedByDryRun 플래그를 세팅
   * - 실패한 레이블이 있어도 나머지 호출은 계속 진행합니다.
   */
  private async executeRemoveOperations(
    pending: PendingRemoveOperation[],
    settings: Settings
  ): Promise<LabelOperationResult[]> {
    if (pending.length === 0) {
      return []
    }

    if (settings.dryRun) {
      // 사전에 필터링했지만 중복 체크
      return pending.map((item) =>
        this.makeLoggedOperationResult(
          item.label,
          LabelAction.Remove,
          LabelActionResult.Success,
          undefined,
          true
        )
      )
    }

    // fastq.promise 큐 생성, concurrency 제한
    const queue = fastq.promise<LabelService, PendingRemoveOperation, LabelOperationResult>(
      this,
      async function (this: LabelService, item) {
        return this.removeLabelTask(item)
      },
      REMOVE_LABEL_CONCURRENCY
    )

    // 모든 제거 작업을 큐에 push하고 결과 수집
    const results = await Promise.all(pending.map((item) => queue.push(item)))

    // 모든 작업 완료 대기 (Promise.all로 이미 완료 보장, 안전 차원)
    await queue.drained()

    return results
  }

  /**
   * 단일 레이블 제거 작업을 수행합니다.
   * - 성공하면 Success 결과 반환
   * - 실패하면 Failed와 이유를 기록하고 계속 진행
   */
  private async removeLabelTask(item: PendingRemoveOperation): Promise<LabelOperationResult> {
    try {
      await this.gitHubService.removeLabel(
        this.context.repoOwner,
        this.context.repoName,
        this.context.eventNumber,
        item.label.name
      )

      return this.makeLoggedOperationResult(
        item.label,
        LabelAction.Remove,
        LabelActionResult.Success
      )
    } catch (err: unknown) {
      // 실패 사유를 추출해 결과에 기록하고 다른 작업은 계속 진행
      const reason = this.resolveFailureReason(err)
      const message = err instanceof Error ? err.message : String(err)
      core.warning(`[LabelService] Failed to remove label ${item.label.name}: ${message}`)

      return this.makeLoggedOperationResult(
        item.label,
        LabelAction.Remove,
        LabelActionResult.Failed,
        reason
      )
    }
  }

  // ============================================================================
  // 🔸 Internal Helpers
  // ============================================================================

  /**
   * Returns the labels attached to the issue or pull request as `Label` objects.
   */
  private async getLabelsForIssueOrPr(): Promise<Label[]> {
    const extractor = LabelService.labelExtractorsByEvent[this.context.eventType]
    return makeLabels(extractor(this.context))
  }

  /**
   * Resolves a configured label string to the repository label representation.
   * - If the repository contains the same normalized label, the repository label name is used to preserve casing.
   */
  private resolveLabel(raw: string, repoLabelByNorm: Map<string, Label>): Label {
    const configLabel = makeLabel(raw)
    return repoLabelByNorm.get(configLabel.norm) ?? configLabel
  }

  /**
   * Create and log a label operation result.
   */
  private makeLoggedOperationResult(
    label: Label,
    action: LabelAction,
    result: LabelActionResult,
    reason?: LabelActionReason,
    simulatedByDryRun = false
  ): LabelOperationResult {
    const operation = makeOperationResult(label, action, result, reason, simulatedByDryRun)

    const baseMessage =
      `[LabelService] label=${operation.name}, action=${operation.action}, ` +
      `result=${operation.result}, reason=${operation.reason ?? ''}, ` +
      `simulatedByDryRun=${operation.simulatedByDryRun}`

    if (operation.result === LabelActionResult.Failed) {
      core.warning(baseMessage)
    } else {
      core.debug(baseMessage)
    }

    return operation
  }

  /**
   * Returns the appropriate reason enum based on the HTTP status code in a GitHub API error.
   */
  private resolveFailureReason(err: unknown): LabelActionReason {
    const status = extractHttpStatus(err)

    if (status === 404) {
      return LabelActionReason.Http404NotFound
    }

    if (status === 422) {
      return LabelActionReason.Http422ValidationFailed
    }

    return LabelActionReason.ApiError
  }
}
