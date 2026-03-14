import * as core from '@actions/core'
import type { IContextService } from './services/context.service.interface.js'
import { type Immutable, OnMissingLabel } from './types/common.js'
import type { Settings } from './types/config.js'
import type { Context } from './types/context.js'
import type { LabelServiceFactory } from './types/factories.js'
import type { Label } from './types/labels.js'
import { stringifyLabels } from './utils/label.utils.js'
import { safeStringify } from './utils/string.utils.js'
import { buildSummaryData, type SummaryData } from './utils/summary.utils.js'

export interface RunResult {
  context: Context
  settings: Settings
  summaryData: SummaryData
}

export async function run(
  configFilePath: string,
  contextService: IContextService,
  createLabelService: LabelServiceFactory
): Promise<Immutable<RunResult>> {
  core.debug(`config-file-path: ${configFilePath}`)

  // 1. Context Parsing
  const ctx = await contextService.getContext()
  core.debug(`Parsed Context:\n${safeStringify(ctx, 2)}`)

  // 2. LabelService Creation
  const labelService = createLabelService(ctx)

  // 3. Configuration Parsing
  const config = await labelService.getConfig(configFilePath)
  core.debug(`Parsed Config:\n${safeStringify(config, 2)}`)

  // 4. Retrieval of Repository Label List,
  // Retrieval of Labels from Configuration File That Do Not Exist in Repository
  const repoLabelDiff = await labelService.getLabelsAndMissing(config.rules)
  core.debug(`RepositoryLabelDiff: ${safeStringify(repoLabelDiff, 2)}`)

  // 5. Missing Label Error Policy Evaluation
  failOnMissingLabelsErrorPolicy(config.settings.onMissingLabel, repoLabelDiff.missing)

  // 6. Rules Evaluation
  const evalResult = await labelService.evaluateRules(config.rules[ctx.eventType], config.settings)
  core.debug(`Label Evaluation Results:\n${safeStringify(evalResult, 2)}`)

  // 7. Label Application
  const result = await labelService.applyLabels(repoLabelDiff, evalResult, config.settings)
  core.debug(`result:\n${safeStringify(result, 2)}`)

  // 8. Build summary data
  const summaryData = buildSummaryData(result)
  core.debug(`Summary Data:\n${safeStringify(summaryData, 2)}`)

  return {
    context: ctx,
    settings: config.settings,
    summaryData
  }
}

/**
 * Checks the OnMissingLabel.Error policy and throws if missing labels are found.
 */
function failOnMissingLabelsErrorPolicy(
  onMissingLabel: OnMissingLabel,
  missingLabels: Immutable<Label[]>
): void {
  if (onMissingLabel === OnMissingLabel.Error && missingLabels.length > 0)
    throw new Error(
      `Missing labels in repository: onMissingLabel=${onMissingLabel}, ` +
        `missingLabels=${stringifyLabels(missingLabels)}`
    )
}
