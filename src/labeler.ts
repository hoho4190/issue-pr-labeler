import * as core from '@actions/core'
import * as github from '@actions/github'
import {Context, EventName, SenderType} from './classes/context'
import {InputInfo} from './classes/input-info'
import {LabelService} from './label-service'

export async function run(): Promise<void> {
  try {
    const inputInfo = new InputInfo(
      process.env['GITHUB_EVENT_PATH'] as string,
      core.getInput('token', {required: true}),
      core.getBooleanInput('disable-bot'),
      core.getInput('config-file-name')
    )
    const context = new Context(inputInfo, github.context)

    if (!checkEventValues(context)) {
      return
    }

    const service = LabelService.getInstance(
      context,
      github.getOctokit(context.token)
    )

    // get configuration file info
    const configInfo = await service.getConfigInfo()

    // add labels
    await service.addLabels(configInfo)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

function checkEventValues(context: Context): boolean {
  if (
    context.eventName !== EventName.ISSUES &&
    context.eventName !== EventName.PULL_REQUEST &&
    context.eventName !== EventName.PULL_REQUEST_TARGET
  ) {
    core.warning(
      `Supports only "issue, pull_request, pull_request_target": current event = ${context.eventName}`
    )
    return false
  }

  if (context.eventType == null) {
    core.warning('"Event type" not found')
    return false
  }

  if (context.isDisableBot && context.senderType === SenderType.BOT) {
    core.info('Passed - opened by Bot')
    return false
  }

  return true
}
