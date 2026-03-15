/* istanbul ignore file */
/**
 * Local development entrypoint for @github/local-action.
 */
import fs from 'fs'
import * as github from '@actions/github'
import { createLocalGitHubService, getActionInputs, runAction } from './utils/action.utils.js'
import { run as main, type RunResult } from './main.js'
import { ConditionResolveService } from './services/condition-resolve.service.js'
import { ContextService } from './services/context.service.js'
import { LabelService } from './services/label.service.js'
import type { LocalGitHubServiceOptions } from './services/github.service.local.js'
import type { Immutable } from './types/common.js'
import type { Context } from './types/context.js'

const ACTION_NAME = '[LOCAL] Issue PR Labeler'

const getLocalServiceOptions = (
  basePath: string,
  configFilePath: string
): LocalGitHubServiceOptions => ({
  // Base path for fixture files.
  basePath,
  // Options that determine whether each method uses the real GitHubService
  // or the local GitHubService.
  useRealService: {
    // getContent: false
  },
  // Options for overriding the fixture file name for each method (directory is basePath).
  fixtureFiles: {
    getContent: configFilePath
  }
})

// Exported so that @github/local-action can call run().
export async function run(): Promise<Immutable<RunResult> | undefined> {
  // Load and overwrite GitHub Action context
  const basePath = `${process.env.LOCAL_PROJECT_PATH}/${process.env.LOCAL_ACTION_FIXTURE_PATH}`
  const envPath = `${basePath}/${process.env.GITHUB_EVENT_PATH}`
  const gitHubContext = JSON.parse(fs.readFileSync(envPath, 'utf-8'))
  github.context.eventName = process.env.GITHUB_EVENT_NAME!
  github.context.payload = gitHubContext

  return await runAction(ACTION_NAME, async () => {
    const { token, configFilePath } = getActionInputs()
    const gitHubService = createLocalGitHubService(
      token,
      getLocalServiceOptions(basePath, configFilePath)
    )
    const conditionResolveService = new ConditionResolveService(gitHubService)

    return await main(
      configFilePath,
      new ContextService(github.context, gitHubService),
      (ctx: Immutable<Context>) => new LabelService(ctx, gitHubService, conditionResolveService)
    )
  })
}

// Run when this module is executed directly in Node.js ESM.
if (import.meta.url === `file://${process.argv[1]}`) {
  run()
}
