import type { IContextService } from './context.service.interface.js'
import type { IGitHubService } from './github.service.interface.js'
import { ActorType, EventType, type Immutable } from '../types/common.js'
import type { GitHubContext } from '../types/github-context.js'
import type {
  BaseContext,
  Context,
  IssueContext,
  Link,
  PullRequestContext
} from '../types/context.js'
import type {
  GitHubIssueData,
  GitHubLabelsData,
  GitHubPullRequestData
} from '../types/github-api.schema.js'
import { getEnumValueByValue } from '../utils/enum.utils.js'

const BASE_URL = 'https://github.com'

interface GitHubContextParseResult {
  eventType: EventType
  repoOwner: string
  repoName: string
  action: string
  actor: string
  actorType: ActorType
  eventNumber: number
}

export class ContextService implements IContextService {
  public constructor(
    private readonly gitHubContext: Immutable<GitHubContext>,
    private readonly gitHubService: IGitHubService
  ) {}

  // ============================================================================
  // 🔹 Public
  // ============================================================================

  /**
   * Returns the `Context` value used by services.
   */
  public async getContext(): Promise<Immutable<Context>> {
    const gitHubCtxData = this.parseGitHubContext()

    switch (gitHubCtxData.eventType) {
      case EventType.Issue: {
        const gitHubIssueData = await this.gitHubService.getIssue(
          gitHubCtxData.repoOwner,
          gitHubCtxData.repoName,
          gitHubCtxData.eventNumber
        )
        return this.parseIssueContext(gitHubCtxData, gitHubIssueData)
      }
      case EventType.PullRequest: {
        const gitHubPrData = await this.gitHubService.getPullRequest(
          gitHubCtxData.repoOwner,
          gitHubCtxData.repoName,
          gitHubCtxData.eventNumber
        )
        return this.parsePullRequestContext(gitHubCtxData, gitHubPrData)
      }
      default:
        throw new Error(`Unsupported event: ${this.gitHubContext.eventName}`)
    }
  }

  // ============================================================================
  // 🔸 Internal Implementation
  // ============================================================================

  /**
   * Parse GitHub context from @actions/github.
   */
  private parseGitHubContext(): GitHubContextParseResult {
    // Normalize pull_request_target to pull_request for runtime handling
    const normalizedEventName: string =
      this.gitHubContext.eventName === 'pull_request_target'
        ? EventType.PullRequest
        : this.gitHubContext.eventName

    return {
      eventType: getEnumValueByValue(EventType, normalizedEventName),
      repoOwner: this.gitHubContext.repo.owner,
      repoName: this.gitHubContext.repo.repo,
      action: this.gitHubContext.payload.action ?? this.gitHubContext.action!,
      actor: this.gitHubContext.payload.sender?.login ?? this.gitHubContext.actor,
      actorType: getEnumValueByValue(ActorType, this.gitHubContext.payload.sender!.type),
      eventNumber:
        this.gitHubContext.payload.pull_request?.number ?? this.gitHubContext.payload.issue!.number
    }
  }

  /**
   * Parse base context.
   */
  private parseBaseContext(
    gitHubCtxData: GitHubContextParseResult,
    defaultBranch: string,
    link: Link
  ): BaseContext {
    return {
      repoOwner: gitHubCtxData.repoOwner,
      repoName: gitHubCtxData.repoName,
      action: gitHubCtxData.action,
      actor: gitHubCtxData.actor,
      actorType: gitHubCtxData.actorType,
      defaultBranch,
      eventNumber: gitHubCtxData.eventNumber,
      link
    }
  }

  /**
   * Parse issue context.
   */
  private async parseIssueContext(
    gitHubCtxData: GitHubContextParseResult,
    gitHubIssueData: GitHubIssueData
  ): Promise<IssueContext> {
    const baseContext = this.parseBaseContext(
      gitHubCtxData,
      gitHubIssueData.defaultBranchRef.name,
      {
        title: gitHubIssueData.issue.title,
        url: `${BASE_URL}/${gitHubCtxData.repoOwner}/${gitHubCtxData.repoName}/issues/${gitHubCtxData.eventNumber}`
      }
    )

    const issue = gitHubIssueData.issue
    const labels = await this.parseLabels(issue.labels, gitHubCtxData)

    return {
      ...baseContext,
      eventType: EventType.Issue,
      issue: {
        author: issue.author.login,
        title: issue.title,
        body: issue.body,
        labels
      }
    }
  }

  /**
   * Parse pull request context.
   */
  private async parsePullRequestContext(
    gitHubCtxData: GitHubContextParseResult,
    gitHubPrData: GitHubPullRequestData
  ): Promise<PullRequestContext> {
    const baseContext = this.parseBaseContext(gitHubCtxData, gitHubPrData.defaultBranchRef.name, {
      title: gitHubPrData.pullRequest.title,
      url: `${BASE_URL}/${gitHubCtxData.repoOwner}/${gitHubCtxData.repoName}/pull/${gitHubCtxData.eventNumber}`
    })

    const pr = gitHubPrData.pullRequest
    const labels = await this.parseLabels(pr.labels, gitHubCtxData)

    return {
      ...baseContext,
      eventType: EventType.PullRequest,
      pullRequest: {
        author: pr.author.login,
        title: pr.title,
        body: pr.body,
        baseBranch: pr.baseRefName,
        headBranch: pr.headRefName,
        isDraft: pr.isDraft,
        changedLines: {
          additions: pr.additions,
          deletions: pr.deletions
        },
        labels
      }
    }
  }

  /**
   * Parse and return all label names, handling pagination if needed.
   */
  private async parseLabels(
    gitHubLabelsData: GitHubLabelsData,
    ctx: GitHubContextParseResult
  ): Promise<string[]> {
    const firstPageNames = gitHubLabelsData.nodes.map((label) => label.name)

    if (!gitHubLabelsData.pageInfo.hasNextPage) {
      return firstPageNames
    }

    const after = gitHubLabelsData.pageInfo.endCursor ?? null
    const rest = await this.gitHubService.listLabelsForIssueOrPr(
      ctx.repoOwner,
      ctx.repoName,
      ctx.eventNumber,
      ctx.eventType,
      after
    )

    return [...firstPageNames, ...rest]
  }
}
