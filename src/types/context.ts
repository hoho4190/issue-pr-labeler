import type { ActorType, EventType } from './common.js'

/**
 * Context type for pull request and issue events.
 */
export type Context = IssueContext | PullRequestContext

export type Link = {
  url: string
  title: string
}

export type BaseContext = {
  repoOwner: string
  repoName: string
  action: string
  actor: string
  actorType: ActorType
  defaultBranch: string
  eventNumber: number
  link: Link
}

export type IssueContext = BaseContext & {
  eventType: EventType.Issue
  issue: {
    author: string
    title: string
    body?: string
    labels: string[]
  }
}

export type PullRequestContext = BaseContext & {
  eventType: EventType.PullRequest
  pullRequest: {
    author: string
    title: string
    body?: string
    baseBranch: string
    headBranch: string
    isDraft: boolean
    changedLines: {
      additions: number
      deletions: number
    }
    labels: string[]
  }
}
