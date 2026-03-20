import fs from 'fs'
import type { IGitHubService } from './github.service.interface.js'
import type { EventType } from '../types/common.js'
import {
  type GitHubIssueData,
  GitHubIssueDataSchema,
  type GitHubPullRequestCommitData,
  type GitHubPullRequestData,
  GitHubPullRequestDataSchema
} from '../types/github-api.schema.js'

export interface LocalGitHubServiceOptions {
  basePath: string
  useRealService: Partial<Record<keyof IGitHubService, boolean>>
  fixtureFiles: Partial<Record<keyof IGitHubService, string>>
}

export class LocalGitHubService implements IGitHubService {
  constructor(
    private readonly realService: IGitHubService,
    private readonly options: LocalGitHubServiceOptions
  ) {}

  // ============================================================================
  // 🔹 Public
  // ============================================================================

  public async getIssue(
    owner: string,
    repo: string,
    eventNumber: number
  ): Promise<GitHubIssueData> {
    const { useReal, fixturePath } = this.getMethodOptions('getIssue', 'getIssue.json')

    if (useReal) {
      return this.realService.getIssue(owner, repo, eventNumber)
    }

    const data = fs.readFileSync(fixturePath, 'utf-8')
    const json = JSON.parse(data)
    return GitHubIssueDataSchema.parse(json)
  }

  public async getPullRequest(
    owner: string,
    repo: string,
    eventNumber: number
  ): Promise<GitHubPullRequestData> {
    const { useReal, fixturePath } = this.getMethodOptions('getPullRequest', 'getPullRequest.json')

    if (useReal) {
      return this.realService.getPullRequest(owner, repo, eventNumber)
    }

    const data = fs.readFileSync(fixturePath, 'utf-8')
    const json = JSON.parse(data)
    return GitHubPullRequestDataSchema.parse(json)
  }

  public async getContent(owner: string, repo: string, ref: string, path: string): Promise<string> {
    const { useReal, fixturePath } = this.getMethodOptions('getContent', 'getContent.yml')

    if (useReal) {
      return this.realService.getContent(owner, repo, ref, path)
    }

    return fs.readFileSync(fixturePath, 'utf-8')
  }

  public async listRepositoryLabels(owner: string, repo: string): Promise<string[]> {
    const { useReal, fixturePath } = this.getMethodOptions(
      'listRepositoryLabels',
      'listRepositoryLabels.json'
    )

    if (useReal) {
      return this.realService.listRepositoryLabels(owner, repo)
    }

    const data = fs.readFileSync(fixturePath, 'utf-8')
    return JSON.parse(data)
  }

  public async listPullRequestFiles(
    owner: string,
    repo: string,
    eventNumber: number
  ): Promise<string[]> {
    const { useReal, fixturePath } = this.getMethodOptions(
      'listPullRequestFiles',
      'listPullRequestFiles.json'
    )

    if (useReal) {
      return this.realService.listPullRequestFiles(owner, repo, eventNumber)
    }

    const data = fs.readFileSync(fixturePath, 'utf-8')
    return JSON.parse(data)
  }

  public async listPullRequestCommits(
    owner: string,
    repo: string,
    eventNumber: number
  ): Promise<GitHubPullRequestCommitData[]> {
    const { useReal, fixturePath } = this.getMethodOptions(
      'listPullRequestCommits',
      'listPullRequestCommits.json'
    )

    if (useReal) {
      return this.realService.listPullRequestCommits(owner, repo, eventNumber)
    }

    const data = fs.readFileSync(fixturePath, 'utf-8')
    return JSON.parse(data)
  }

  public async listLabelsForIssueOrPr(
    owner: string,
    repo: string,
    eventNumber: number,
    eventType: EventType,
    afterCursor?: string | null
  ): Promise<string[]> {
    const { useReal, fixturePath } = this.getMethodOptions(
      'listLabelsForIssueOrPr',
      'listLabelsForIssueOrPr.json'
    )

    if (useReal) {
      return this.realService.listLabelsForIssueOrPr(
        owner,
        repo,
        eventNumber,
        eventType,
        afterCursor
      )
    }

    const data = fs.readFileSync(fixturePath, 'utf-8')
    return JSON.parse(data)
  }

  public async addLabels(
    owner: string,
    repo: string,
    eventNumber: number,
    labels: string[]
  ): Promise<void> {
    const { useReal } = this.getMethodOptions('addLabels')

    if (useReal) {
      await this.realService.addLabels(owner, repo, eventNumber, labels)
    }
  }

  public async removeLabel(
    owner: string,
    repo: string,
    eventNumber: number,
    label: string
  ): Promise<void> {
    const { useReal } = this.getMethodOptions('removeLabel')

    if (useReal) {
      return await this.realService.removeLabel(owner, repo, eventNumber, label)
    }
  }

  // ============================================================================
  // 🔸 Internal Helpers
  // ============================================================================

  private getMethodOptions<K extends keyof IGitHubService>(
    key: K,
    defaultFileName: string
  ): { useReal: boolean; fixturePath: string }
  private getMethodOptions<K extends keyof IGitHubService>(key: K): { useReal: boolean }
  private getMethodOptions<K extends keyof IGitHubService>(
    key: K,
    defaultFileName?: string
  ): { useReal: boolean; fixturePath?: string } {
    const useReal = this.options.useRealService[key] ?? false

    if (!defaultFileName) {
      return { useReal }
    }

    const fixtureFile = this.options.fixtureFiles[key] ?? defaultFileName

    return {
      useReal,
      fixturePath: `${this.options.basePath}/${fixtureFile}`
    }
  }
}
