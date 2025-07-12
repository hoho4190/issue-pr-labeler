import * as core from '@actions/core'
import {GitHub} from '@actions/github/lib/utils'
import * as fs from 'fs'
import {
  ConfigInfo,
  Filter,
  FilterEvent,
  FilterTarget
} from './classes/config-info'
import {Context, EventName} from './classes/context'
import * as util from './util'

class LabelService {
  private static instance: LabelService

  private context: Context
  private octokit: InstanceType<typeof GitHub>

  private constructor(context: Context, octokit: InstanceType<typeof GitHub>) {
    this.context = context
    this.octokit = octokit
  }

  static getInstance(
    context: Context,
    octokit: InstanceType<typeof GitHub>
  ): LabelService {
    if (!LabelService.instance) {
      LabelService.instance = new LabelService(context, octokit)
    } else {
      this.instance.context = context
      this.instance.octokit = octokit
    }

    return LabelService.instance
  }

  async getConfigInfo(): Promise<ConfigInfo> {
    const content = await this.getContent(
      this.context.owner,
      this.context.repo,
      this.context.sha,
      this.context.configFilePath
    )

    return util.convertToConfigInfo(content)
  }

  async addLabels(configInfo: ConfigInfo): Promise<string[]> {
    // parseing event
    const event = this.parseEvent()

    // get title, comment
    const {title, comment} = this.getTitleComment(event)

    // get labels
    const labels = this.getLables(title, comment, configInfo.filters)

    // add labels
    if (labels.length === 0) {
      core.info('No labels to add')
    } else {
      try {
        if (this.context.eventName === EventName.ISSUES) {
          await this.addIssueLabels(
            this.context.owner,
            this.context.repo,
            this.context.eventNumber,
            labels
          )
        } else {
          await this.addPRLabels(
            this.context.owner,
            this.context.repo,
            this.context.eventNumber,
            labels
          )
        }
      } catch (error) {
        throw new Error('Failed to add labels')
      }
    }

    return labels
  }

  private async getContent(
    owner: string,
    repo: string,
    ref: string,
    path: string
  ): Promise<string> {
    let result!: string

    try {
      const res = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        ref,
        path
      })

      if (res.status !== 200) {
        throw new Error(`status = ${res.status}`)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = res.data as any
      result = Buffer.from(data.content, data.encoding).toString()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load configuration file: ${error.message}`)
      }
    }

    return result
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseEvent(): any {
    try {
      const ev = JSON.parse(
        fs.readFileSync(this.context.githubEventPath, 'utf-8')
      )

      return ev
    } catch (error) {
      throw new Error('Failed to parse event.json')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTitleComment(event: any): {title: string; comment?: string} {
    let title: string
    let comment: string | undefined

    try {
      if (this.context.eventName === EventName.ISSUES) {
        title = event.issue.title
        // comment = event.issue.body
        comment = this.context.githubContext.payload.issue?.body
      } else {
        title = event.pull_request.title
        // comment = event.issue.body
        comment = this.context.githubContext.payload.pull_request?.body
      }

      core.debug(`title = ${title}`)
      core.debug(`comment = ${comment}`)
    } catch (error) {
      throw new Error('Failed to get title and comment')
    }

    return {title, comment}
  }

  private getLables(
    title: string,
    comment: string | undefined,
    filters: Filter[]
  ): string[] {
    const labels = new Set<string>()

    try {
      const currentEvent =
        this.context.eventName === EventName.ISSUES
          ? FilterEvent.ISSUES
          : FilterEvent.PULL_REQUEST

      for (const filter of filters) {
        // If already exists in the labels to be added
        if (labels.has(filter.label)) continue

        // If is not a set event
        if (!filter.events.has(currentEvent)) continue

        for (const regStr of filter.regexs) {
          const reg = util.convertToRegExp(regStr)

          // title
          if (filter.targets.has(FilterTarget.TITLE) && reg.test(title)) {
            labels.add(filter.label)
            break
          }

          // commet
          if (
            filter.targets.has(FilterTarget.COMMENT) &&
            comment !== undefined &&
            reg.test(comment)
          ) {
            labels.add(filter.label)
            break
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to filter label: ${error.message}`)
      }
    }

    return Array.from(labels)
  }

  private async addIssueLabels(
    owner: string,
    repo: string,
    eventNumber: number,
    labels: string[]
  ): Promise<void> {
    await this.octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: eventNumber,
      labels
    })

    core.info(`Added labels to issue: ${labels.join(', ')}`)
  }

  private async addPRLabels(
    owner: string,
    repo: string,
    eventNumber: number,
    labels: string[]
  ): Promise<void> {
    await this.octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: eventNumber,
      labels
    })

    core.info(`Added labels to PR: ${labels.join(', ')}`)
  }
}

export {LabelService}
