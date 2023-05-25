import * as core from '@actions/core'
import {Context, EventName, EventType, SenderType} from './classes/context'
import {LabelService} from './label-service'

async function run(): Promise<void> {
  try {
    const context = new Context()
    if (!checkEventValues(context)) {
      return
    }

    const service = LabelService.getInstance(context)

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

export function checkEventValues(context: Context): boolean {
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

  if (
    context.eventType !== EventType.OPENED &&
    context.eventType !== EventType.REOPENED
  ) {
    core.warning(
      `Supports only "opened, reopened": current type = ${context.eventType}`
    )
    return false
  }

  if (context.senderType == null) {
    throw new Error('"Sender type" not found')
  } else if (
    context.isDisableBot === true &&
    context.senderType === SenderType.BOT
  ) {
    core.info('Passed - opened by Bot')
    return false
  }

  if (context.eventType == null) {
    core.warning('"Event type" not found')
    return false
  }

  if (context.eventNumber == null) {
    core.warning('"Event number" not found')
    return false
  }

  return true
}

run()
