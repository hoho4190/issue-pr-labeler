import type { Immutable } from '../types/common.js'
import type { Config, Rule, RulesByEvent, Settings } from '../types/config.js'
import type {
  LabelEvaluationResult,
  LabelOperationResult,
  RepositoryLabelDiff
} from '../types/labels.js'

export interface ILabelService {
  getConfig(configFilePath: string): Promise<Immutable<Config>>

  getLabelsAndMissing(rules: Immutable<RulesByEvent>): Promise<Immutable<RepositoryLabelDiff>>

  evaluateRules(
    rules: Immutable<Rule[]>,
    settings: Immutable<Settings>
  ): Promise<Immutable<LabelEvaluationResult>>

  applyLabels(
    repositoryLabelDiff: Immutable<RepositoryLabelDiff>,
    labelEvaluation: Immutable<LabelEvaluationResult>,
    settings: Immutable<Settings>
  ): Promise<Immutable<LabelOperationResult[]>>
}
