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

  /**
   * Resolves the value used to evaluate the `commit-messages` condition.
   */
  public async resolveCommitMessages(context: Immutable<PullRequestContext>): Promise<string[]> {
    const commits = await this.gitHubService.listPullRequestCommits(
      context.repoOwner,
      context.repoName,
      context.eventNumber
    )

    return commits.map((commit) => commit.message)
  }

  /**
   * Resolves the value used to evaluate the `commit-message-subjects` condition.
   */
  public async resolveCommitMessageSubjects(
    context: Immutable<PullRequestContext>
  ): Promise<string[]> {
    const commits = await this.gitHubService.listPullRequestCommits(
      context.repoOwner,
      context.repoName,
      context.eventNumber
    )

    return commits.map((commit) => commit.messageHeadline)
  }

  /**
   * Resolves the value used to evaluate the `commit-message-bodies` condition.
   */
  public async resolveCommitMessageBodies(
    context: Immutable<PullRequestContext>
  ): Promise<string[]> {
    const commits = await this.gitHubService.listPullRequestCommits(
      context.repoOwner,
      context.repoName,
      context.eventNumber
    )

    return commits.map((commit) => commit.messageBody ?? '')
  }
}
