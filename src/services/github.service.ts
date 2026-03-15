import * as core from '@actions/core'
import { RequestError } from '@octokit/request-error'
import type { IGitHubService, OctokitClient } from './github.service.interface.js'
import { EventType } from '../types/common.js'
import {
  GitHubContentResponseSchema,
  type GitHubIssueData,
  GitHubIssueOrPullRequestLabelsResponseSchema,
  GitHubIssueResponseSchema,
  GitHubLabelsResponseSchema,
  type GitHubPullRequestData,
  GitHubPullRequestFilesResponseSchema,
  GitHubPullRequestResponseSchema
} from '../types/github-api.schema.js'
import { safeStringifyWithLimit } from '../utils/string.utils.js'
import { parseWithContext } from '../utils/zod.utils.js'

const MAX_GRAPHQL_PAGES = 50

class GitHubApiError extends Error {
  public readonly status?: number

  public constructor(message: string, options: { status?: number; cause?: unknown } = {}) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = options.status
    if ('cause' in options) {
      ;(this as { cause?: unknown }).cause = options.cause
    }
  }
}

export class GitHubService implements IGitHubService {
  /**
   * EventType → GraphQL field name mapping
   */
  private static readonly fieldNamesByEvent = {
    [EventType.Issue]: 'issue',
    [EventType.PullRequest]: 'pullRequest'
  } as const satisfies Record<EventType, 'issue' | 'pullRequest'>

  public constructor(private readonly octokit: OctokitClient) {}

  // ============================================================================
  // 🔹 Public
  // ============================================================================

  /**
   * Retrieves issue details used by the action.
   */
  public async getIssue(
    owner: string,
    repo: string,
    eventNumber: number
  ): Promise<GitHubIssueData> {
    return this.callGitHubAPI(async () => {
      const query = `
        query ($owner: String!, $repo: String!, $eventNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            defaultBranchRef {
              name
            }
            issue(number: $eventNumber) {
              author {
                login
              }
              title
              body
              labels(first: 100, after: null) {
                pageInfo { hasNextPage endCursor }
                nodes { name }
              }
            }
          }
        }
      `

      const variables = { owner, repo, eventNumber }

      const responseRaw = await this.octokit.graphql(query, variables)
      const response = parseWithContext(GitHubIssueResponseSchema, responseRaw, {
        message: 'Retrieving issue details'
      })

      return response.repository
    }, 'getIssue')
  }

  /**
   * Retrieves pull request details used by the action.
   */
  public async getPullRequest(
    owner: string,
    repo: string,
    eventNumber: number
  ): Promise<GitHubPullRequestData> {
    return this.callGitHubAPI(async () => {
      const query = `
        query ($owner: String!, $repo: String!, $eventNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            defaultBranchRef {
              name
            }
            pullRequest(number: $eventNumber) {
              author {
                login
              }
              title
              body
              baseRefName
              headRefName
              isDraft
              additions
              deletions
              labels(first: 100, after: null) {
                pageInfo { hasNextPage endCursor }
                nodes { name }
              }
            }
          }
        }
      `

      const variables = { owner, repo, eventNumber }

      const responseRaw = await this.octokit.graphql(query, variables)
      const response = parseWithContext(GitHubPullRequestResponseSchema, responseRaw, {
        message: 'Retrieving pull request details'
      })

      return response.repository
    }, 'getPullRequest')
  }

  /**
   * Retrieves the text content of a repository file.
   */
  public async getContent(owner: string, repo: string, ref: string, path: string): Promise<string> {
    return this.callGitHubAPI(async () => {
      const query = `
        query ($owner: String!, $repo: String!, $expression: String!) {
          repository(owner: $owner, name: $repo) {
            object(expression: $expression) {
              ... on Blob {
                text
              }
            }
          }
        }
      `

      const variables = {
        owner,
        repo,
        expression: `${ref}:${path}`
      }

      const responseRaw = await this.octokit.graphql(query, variables)
      const response = parseWithContext(GitHubContentResponseSchema, responseRaw, {
        message: 'Retrieving repository file content'
      })

      return response.repository.object.text
    }, 'getContent')
  }

  /**
   * Lists all labels defined in the repository.
   */
  public async listRepositoryLabels(owner: string, repo: string): Promise<string[]> {
    return this.callGitHubAPI(async () => {
      const labels: string[] = []

      let after: string | null = null
      let pageCount = 0
      do {
        pageCount++
        if (pageCount > MAX_GRAPHQL_PAGES) {
          throw new Error(`Too many pages (> ${MAX_GRAPHQL_PAGES}), possible infinite loop`)
        }

        const query = `
          query($owner: String!, $repo: String!, $after: String) {
            repository(owner: $owner, name: $repo) {
              labels(first: 100, after: $after) {
                pageInfo { hasNextPage endCursor }
                nodes { name }
              }
            }
          }
        `

        const variables: {
          owner: string
          repo: string
          after: string | null
        } = {
          owner,
          repo,
          after
        }

        const responseRaw = await this.octokit.graphql(query, variables)
        const response = parseWithContext(GitHubLabelsResponseSchema, responseRaw, {
          message: 'Retrieving repository labels'
        })
        const resLabels = response.repository.labels

        labels.push(...resLabels.nodes.map((node) => node.name))

        const pageInfo = resLabels.pageInfo
        after = pageInfo.hasNextPage ? pageInfo.endCursor : null
      } while (after)

      return labels
    }, 'listRepositoryLabels')
  }

  /**
   * Lists all changed file paths in the pull request.
   */
  public async listPullRequestFiles(
    owner: string,
    repo: string,
    eventNumber: number
  ): Promise<string[]> {
    return this.callGitHubAPI(async () => {
      const files: string[] = []

      let after: string | null = null
      let pageCount = 0
      do {
        pageCount++
        if (pageCount > MAX_GRAPHQL_PAGES) {
          throw new Error(`Too many pages (> ${MAX_GRAPHQL_PAGES}), possible infinite loop`)
        }

        const query = `
          query($owner: String!, $repo: String!, $eventNumber: Int!, $after: String) {
            repository(owner: $owner, name: $repo) {
              pullRequest(number: $eventNumber) {
                files(first: 100, after: $after) {
                  pageInfo { hasNextPage endCursor }
                  nodes { path }
                }
              }
            }
          }
        `

        const variables: {
          owner: string
          repo: string
          eventNumber: number
          after: string | null
        } = {
          owner,
          repo,
          eventNumber,
          after
        }

        const responseRaw = await this.octokit.graphql(query, variables)
        const response = parseWithContext(GitHubPullRequestFilesResponseSchema, responseRaw, {
          message: 'Retrieving pull request files'
        })
        const resFiles = response.repository.pullRequest.files

        files.push(...resFiles.nodes.map((n) => n.path))

        const pageInfo = resFiles.pageInfo
        after = pageInfo.hasNextPage ? pageInfo.endCursor : null
      } while (after)

      return files
    }, 'listPullRequestFiles')
  }

  /**
   * Lists all labels on the target issue or pull request.
   */
  public async listLabelsForIssueOrPr(
    owner: string,
    repo: string,
    eventNumber: number,
    eventType: EventType,
    afterCursor?: string | null
  ): Promise<string[]> {
    return this.callGitHubAPI(async () => {
      const labels: string[] = []

      const fieldName = GitHubService.fieldNamesByEvent[eventType]

      let after: string | null = afterCursor ?? null
      let pageCount = 0
      do {
        pageCount++
        if (pageCount > MAX_GRAPHQL_PAGES) {
          throw new Error(`Too many pages (> ${MAX_GRAPHQL_PAGES}), possible infinite loop`)
        }

        const query = `
          query($owner: String!, $repo: String!, $eventNumber: Int!, $after: String) {
            repository(owner: $owner, name: $repo) {
              ${fieldName}(number: $eventNumber) {
                labels(first: 100, after: $after) {
                  pageInfo { hasNextPage endCursor }
                  nodes { name }
                }
              }
            }
          }
        `

        const variables: {
          owner: string
          repo: string
          eventNumber: number
          after: string | null
        } = {
          owner,
          repo,
          eventNumber,
          after
        }

        const responseRaw = await this.octokit.graphql(query, variables)
        const response = parseWithContext(
          GitHubIssueOrPullRequestLabelsResponseSchema,
          responseRaw,
          { message: 'Retrieving labels for issue or pull request' }
        )
        const resLabels = response.repository[fieldName]!.labels

        labels.push(...resLabels.nodes.map((node) => node.name))

        const pageInfo = resLabels.pageInfo
        after = pageInfo.hasNextPage ? pageInfo.endCursor : null
      } while (after)

      return labels
    }, 'listLabelsForIssueOrPr')
  }

  /**
   * Adds labels to the target issue or pull request.
   */
  public async addLabels(
    owner: string,
    repo: string,
    eventNumber: number,
    labels: string[]
  ): Promise<void> {
    return this.callGitHubAPI(async () => {
      if (labels.length === 0) {
        return
      }

      await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: eventNumber,
        labels
      })
    }, 'addLabels')
  }

  /**
   * Removes a label from the target issue or pull request.
   */
  public async removeLabel(
    owner: string,
    repo: string,
    eventNumber: number,
    label: string
  ): Promise<void> {
    return this.callGitHubAPI(async () => {
      await this.octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: eventNumber,
        name: label
      })
    }, 'removeLabel')
  }

  // ============================================================================
  // 🔸 Internal Helpers
  // ============================================================================

  private async callGitHubAPI<T>(fn: () => Promise<T>, operation: string): Promise<T> {
    const prefix = `[GitHubService:${operation}]`

    try {
      core.debug(`${prefix} calling GitHub API...`)

      const result = await fn()
      core.debug(`${prefix} success, result=${safeStringifyWithLimit(result)}`)

      return result
    } catch (err: unknown) {
      const prefix = `[GitHubService:${operation}]`

      if (err instanceof RequestError) {
        throw new GitHubApiError(
          `${prefix} GitHub API request failed: ${err.status} ${err.message}`,
          { status: err.status, cause: err }
        )
      }

      if (err instanceof Error) {
        throw new GitHubApiError(`${prefix} ${err.message}`, { cause: err })
      }

      throw new GitHubApiError(`${prefix} Unknown non-error thrown: ${String(err)}`)
    }
  }
}
