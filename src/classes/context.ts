import {getInput} from '@actions/core'
import * as github from '@actions/github'

// eslint-disable-next-line no-shadow
const enum EventName {
  ISSUES = 'issues',
  PULL_REQUEST = 'pull_request'
}

// eslint-disable-next-line no-shadow
const enum EventType {
  OPENED = 'opened'
}

class Context {
  githubEventPath: string
  token: string
  owner: string
  repo: string
  sha: string
  eventName: EventName
  eventType?: EventType
  eventNumber?: number
  configFilePath: string

  constructor() {
    this.githubEventPath = process.env['GITHUB_EVENT_PATH'] as string
    this.token = getInput('token', {required: true})
    this.owner = github.context.repo.owner
    this.repo = github.context.repo.repo
    this.sha = github.context.sha
    this.eventName = github.context.eventName as EventName
    this.configFilePath = `.github/${getInput('config-file-name')}`

    if (github.context.payload.issue != null) {
      this.eventNumber = github.context.payload.issue.number
    } else if (github.context.payload.pull_request != null) {
      this.eventNumber = github.context.payload.pull_request.number
    }
    this.eventType = github.context.payload.action as EventType
  }
}

export {Context, EventName, EventType}
