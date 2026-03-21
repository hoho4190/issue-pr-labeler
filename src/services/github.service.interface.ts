import type { getOctokit } from '@actions/github'
import type { EventType } from '../types/common.js'
import type {
  GitHubIssueData,
  GitHubPullRequestCommitData,
  GitHubPullRequestData
} from '../types/github-api.schema.js'

export type OctokitClient = ReturnType<typeof getOctokit>

export interface IGitHubService {
  getIssue(owner: string, repo: string, eventNumber: number): Promise<GitHubIssueData>

  getPullRequest(owner: string, repo: string, eventNumber: number): Promise<GitHubPullRequestData>

  getContent(owner: string, repo: string, ref: string, path: string): Promise<string>

  listRepositoryLabels(owner: string, repo: string): Promise<string[]>

  listPullRequestFiles(owner: string, repo: string, eventNumber: number): Promise<string[]>

  listPullRequestCommits(
    owner: string,
    repo: string,
    eventNumber: number
  ): Promise<GitHubPullRequestCommitData[]>

  listLabelsForIssueOrPr(
    owner: string,
    repo: string,
    eventNumber: number,
    eventType: EventType,
    afterCursor?: string | null
  ): Promise<string[]>

  addLabels(owner: string, repo: string, eventNumber: number, labels: string[]): Promise<void>

  removeLabel(owner: string, repo: string, eventNumber: number, label: string): Promise<void>
}
