import type { IConditionResolveService } from './condition-resolve.service.interface.js'
import type { IGitHubService } from './github.service.interface.js'
import type { Immutable } from '../types/common.js'
import type { PullRequestContext } from '../types/context.js'

export class ConditionResolveService implements IConditionResolveService {
  public constructor(private readonly gitHubService: IGitHubService) {}

  /**
   * Resolves the value used to evaluate the `changed-files` condition.
   */
  public async resolveChangedFiles(context: Immutable<PullRequestContext>): Promise<string[]> {
    return await this.gitHubService.listPullRequestFiles(
      context.repoOwner,
      context.repoName,
      context.eventNumber
    )
  }
}
