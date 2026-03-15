/* istanbul ignore file */
/**
 * GitHub Actions entrypoint.
 */
import * as github from '@actions/github'
import { createGitHubService, getActionInputs, runAction } from './utils/action.utils.js'
import { run as main, type RunResult } from './main.js'
import { ConditionResolveService } from './services/condition-resolve.service.js'
import { ContextService } from './services/context.service.js'
import { LabelService } from './services/label.service.js'
import type { Immutable } from './types/common.js'
import type { Context } from './types/context.js'

const ACTION_NAME = 'Issue PR Labeler'

export async function run(): Promise<Immutable<RunResult> | undefined> {
  return await runAction(ACTION_NAME, async () => {
    const { token, configFilePath } = getActionInputs()
    const gitHubService = createGitHubService(token)
    const conditionResolveService = new ConditionResolveService(gitHubService)

    return await main(
      configFilePath,
      new ContextService(github.context, gitHubService),
      (ctx: Immutable<Context>) => new LabelService(ctx, gitHubService, conditionResolveService)
    )
  })
}

run()
