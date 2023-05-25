import {debug, getBooleanInput, getInput} from '@actions/core'
import * as github from '@actions/github'

// eslint-disable-next-line no-shadow
const enum SenderType {
  USER = 'User',
  BOT = 'Bot'
}

// eslint-disable-next-line no-shadow
const enum EventName {
  ISSUES = 'issues',
  PULL_REQUEST = 'pull_request',
  PULL_REQUEST_TARGET = 'pull_request_target'
}

// eslint-disable-next-line no-shadow
const enum EventType {
  OPENED = 'opened',
  REOPENED = 'reopened'
}

class Context {
  githubEventPath: string
  token: string
  owner: string
  repo: string
  sha: string
  senderType?: SenderType
  eventName: EventName
  eventType?: EventType
  eventNumber?: number
  isDisableBot: boolean
  configFilePath: string

  constructor() {
    this.githubEventPath = process.env['GITHUB_EVENT_PATH'] as string
    this.token = getInput('token', {required: true})
    this.owner = github.context.repo.owner
    this.repo = github.context.repo.repo
    this.sha = github.context.sha
    this.eventName = github.context.eventName as EventName
    this.isDisableBot = getBooleanInput('disable-bot')
    this.configFilePath = `.github/${getInput('config-file-name')}`

    this.senderType = github.context.payload.sender?.type as SenderType
    if (github.context.payload.issue != null) {
      this.eventNumber = github.context.payload.issue.number
    } else if (github.context.payload.pull_request != null) {
      this.eventNumber = github.context.payload.pull_request.number
    }
    this.eventType = github.context.payload.action as EventType

    printLog(this)
    // printGithubLog()
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printGithubLog(): void {
  debug(`context.eventName = ${github.context.eventName}`)
  // debug(`context.sha = ${github.context.sha}`)
  debug(`context.ref = ${github.context.ref}`)
  debug(`context.workflow = ${github.context.workflow}`)
  debug(`context.action = ${github.context.action}`)
  debug(`context.actor = ${github.context.actor}`)
  debug(`context.job = ${github.context.job}`)
  debug(`context.runNumber = ${github.context.runNumber}`)
  debug(`context.runId = ${github.context.runId}`)
  debug(`context.apiUrl = ${github.context.apiUrl}`)
  debug(`context.serverUrl = ${github.context.serverUrl}`)
  debug(`context.graphqlUrl = ${github.context.graphqlUrl}`)

  debug(`payload.action = ${github.context.payload.action}`)
  debug(`payload.issue.number = ${github.context.payload.issue?.number}`)
  debug(
    `payload.pull_request.number = ${github.context.payload.pull_request?.number}`
  )
}

function printLog(context: Context): void {
  debug(`githubEventPath = ${context.githubEventPath}`)
  debug(`token = ${context.token}`)
  debug(`owner = ${context.owner}`)
  debug(`repo = ${context.repo}`)
  // debug(`sha = ${context.sha}`)
  debug(`senderType = ${context.senderType}`)
  debug(`eventName = ${context.eventName}`)
  debug(`eventType = ${context.eventType}`)
  debug(`eventNumber = ${context.eventNumber}`)
  debug(`isDisableBot = ${context.isDisableBot}`)
  debug(`configFilePath = ${context.configFilePath}`)
}

export {Context, SenderType, EventName, EventType}
