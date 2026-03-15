/**
 * Higher-Order Function for GitHub Actions execution.
 * Wraps a task with standardized try/catch/finally, logging, and failure handling.
 * Implements a Template Method-like pattern for consistent action flow.
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { GitHubService } from '../services/github.service.js'
import {
  LocalGitHubService,
  type LocalGitHubServiceOptions
} from '../services/github.service.local.js'
import type { RunResult } from '../main.js'
import type { Immutable } from '../types/common.js'
import { safeStringify } from './string.utils.js'
import { generateSummary } from './summary.utils.js'

const OUTPUT_LABELS = 'labels'

interface ActionInputs {
  token: string
  configFilePath: string
}

export function getActionInputs(): ActionInputs {
  const token = core.getInput('token', { required: true })
  const configFilePath = core.getInput('config-file-path')

  return { token, configFilePath }
}

export function createGitHubService(token: string): GitHubService {
  return new GitHubService(github.getOctokit(token))
}

export function createLocalGitHubService(
  token: string,
  options: LocalGitHubServiceOptions
): LocalGitHubService {
  return new LocalGitHubService(createGitHubService(token), options)
}

/**
 * Executes a GitHub Action with standardized logging, summary, and error handling.
 *
 * @param actionName - Name of the action to display in logs and summary
 * @param execute    - Async function containing the action's main logic
 */
export async function runAction(
  actionName: string,
  execute: () => Promise<Immutable<RunResult>>
): Promise<Immutable<RunResult> | undefined> {
  core.info(`Starting ${actionName}...`)

  await core.summary.clear()
  core.summary.addRaw(`## ${actionName}\n\n`)

  try {
    const runResult = await execute()

    // Output
    core.setOutput(OUTPUT_LABELS, JSON.stringify(runResult.summaryData.operations))

    // Summary
    core.summary.addRaw(
      await generateSummary(runResult.summaryData, runResult.context, runResult.settings)
    )

    core.info(`${actionName} completed successfully`)
    return runResult
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object'
          ? safeStringify(error, 2)
          : String(error)

    core.setFailed(message)
    return undefined
  } finally {
    await core.summary.write()
    core.info(`${actionName} finished`)
  }
}
