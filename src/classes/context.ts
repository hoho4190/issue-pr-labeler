import {debug} from '@actions/core'
import {Context as GithubContext} from '@actions/github/lib/context'
import {InputInfo} from './input-info'

const enum SenderType {
  USER = 'User',
  BOT = 'Bot'
}

const enum EventName {
  ISSUES = 'issues',
  PULL_REQUEST = 'pull_request',
  PULL_REQUEST_TARGET = 'pull_request_target',
  PING = 'ping'
}

class Context {
  githubContext: GithubContext
  githubEventPath: string
  token: string
  owner: string
  repo: string
  sha: string
  senderType?: SenderType
  eventName: EventName
  eventType?: string
  eventNumber: number
  isDisableBot: boolean
  configFilePath: string

  constructor(inputInfo: InputInfo, githubContext: GithubContext) {
    this.githubContext = githubContext
    this.githubEventPath = inputInfo.githubEventPath
    this.token = inputInfo.token
    this.owner = githubContext.repo.owner
    this.repo = githubContext.repo.repo
    this.sha = githubContext.sha
    this.eventName = githubContext.eventName as EventName
    this.isDisableBot = inputInfo.disableBot
    this.configFilePath = `.github/${inputInfo.configFileName}`

    this.senderType = githubContext.payload.sender?.type as SenderType
    if (githubContext.payload.issue != null) {
      this.eventNumber = githubContext.payload.issue.number
    } else if (githubContext.payload.pull_request != null) {
      this.eventNumber = githubContext.payload.pull_request.number
    } else {
      throw new Error('The payload must be an issue or pull_request value')
    }
    this.eventType = githubContext.payload.action

    debug('== Github Context ==')
    this.printGithubContext()
    debug('== Service Context ==')
    this.printServiceContext()
  }

  private printGithubContext(): void {
    debug(`context.eventName = ${this.githubContext.eventName}`)
    // debug(`context.sha = ${this.githubContext.sha}`)
    debug(`context.ref = ${this.githubContext.ref}`)
    debug(`context.workflow = ${this.githubContext.workflow}`)
    debug(`context.action = ${this.githubContext.action}`)
    debug(`context.actor = ${this.githubContext.actor}`)
    debug(`context.job = ${this.githubContext.job}`)
    debug(`context.runNumber = ${this.githubContext.runNumber}`)
    debug(`context.runId = ${this.githubContext.runId}`)
    debug(`context.apiUrl = ${this.githubContext.apiUrl}`)
    debug(`context.serverUrl = ${this.githubContext.serverUrl}`)
    debug(`context.graphqlUrl = ${this.githubContext.graphqlUrl}`)

    debug(`payload.action = ${this.githubContext.payload.action}`)
    debug(`payload.issue.number = ${this.githubContext.payload.issue?.number}`)
    debug(
      `payload.pull_request.number = ${this.githubContext.payload.pull_request?.number}`
    )
  }

  private printServiceContext(): void {
    debug(`githubEventPath = ${this.githubEventPath}`)
    debug(`token = ${this.token}`)
    debug(`owner = ${this.owner}`)
    debug(`repo = ${this.repo}`)
    // debug(`sha = ${this.sha}`)
    debug(`senderType = ${this.senderType}`)
    debug(`eventName = ${this.eventName}`)
    debug(`eventType = ${this.eventType}`)
    debug(`eventNumber = ${this.eventNumber}`)
    debug(`isDisableBot = ${this.isDisableBot}`)
    debug(`configFilePath = ${this.configFilePath}`)
  }
}

export {Context, SenderType, EventName}
