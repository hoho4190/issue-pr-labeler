import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'
import {ConfigInfo} from '../src/classes/config-info'
import {LabelService} from '../src/label-service'
import {run} from '../src/labeler'

const originalGitHubEventPath = process.env['GITHUB_EVENT_PATH']

describe('run() - Test', () => {
  // Inputs for mock @actions/core
  const inputs = {
    token: 'mock-token',
    'disable-bot': 'true',
    'config-file-name': 'labeler-config.yml'
  } as any

  // Shallow clone original @actions/github context
  let originalContext = {...github.context}

  beforeAll(() => {
    // process
    process.env['GITHUB_EVENT_PATH'] = 'event.json'
  })

  afterAll(() => {
    // Restore
    delete process.env['GITHUB_EVENT_PATH']
    if (originalGitHubEventPath) {
      process.env['GITHUB_EVENT_PATH'] = originalGitHubEventPath
    }
  })

  beforeEach(() => {
    // Mock
    jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
      return inputs[name]
    })
    jest.spyOn(core, 'getBooleanInput').mockImplementation((name: string) => {
      return inputs[name]
    })

    // Mock error/warning/info/debug
    jest.spyOn(core, 'error').mockImplementation(jest.fn())
    jest.spyOn(core, 'warning').mockImplementation(jest.fn())
    jest.spyOn(core, 'info').mockImplementation(jest.fn())
    jest.spyOn(core, 'debug').mockImplementation(jest.fn())

    // Mock github context
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'mock-owner',
        repo: 'moock-repo'
      }
    })
    github.context.ref = 'refs/heads/some-ref'
    github.context.sha = '1234567890123456789012345678901234567890'
  })

  afterEach(() => {
    // Restore @actions/github context
    github.context.payload = originalContext.payload
    github.context.eventName = originalContext.eventName

    // Restore
    jest.restoreAllMocks()
  })

  test('정상: 지원하지 않는 이벤트 경고', async () => {
    // given
    github.context.eventName = 'ping'
    github.context.payload.issue = {
      key: 'key',
      number: 1
    }

    const warningFunc = jest
      .spyOn(core, 'warning')
      .mockImplementation(jest.fn())

    const getInstanceFunc = jest
      .spyOn(LabelService, 'getInstance')
      .mockImplementation(() => {
        return {} as LabelService
      })

    // when
    await run()

    // then
    expect(warningFunc).toHaveBeenCalledTimes(1)
    expect(getInstanceFunc).toHaveBeenCalledTimes(0)
  })

  test('정상: 이벤트 타입 null 경고', async () => {
    // given
    github.context.eventName = 'issues'
    github.context.payload.action = undefined
    github.context.payload.issue = {
      key: 'key',
      number: 1
    }

    const warningFunc = jest
      .spyOn(core, 'warning')
      .mockImplementation(jest.fn())

    const getInstanceFunc = jest
      .spyOn(LabelService, 'getInstance')
      .mockImplementation(() => {
        return {} as LabelService
      })

    // when
    await run()

    // then
    expect(warningFunc).toHaveBeenCalledTimes(1)
    expect(getInstanceFunc).toHaveBeenCalledTimes(0)
  })

  test('정상: isDisableBot === true && SenderType.BOT', async () => {
    // given
    github.context.eventName = 'issues'
    github.context.payload.sender = {
      key: 'key',
      type: 'Bot'
    }
    github.context.payload.action = 'opened'
    github.context.payload.issue = {
      key: 'key',
      number: 1
    }

    const infoFunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    const getInstanceFunc = jest
      .spyOn(LabelService, 'getInstance')
      .mockImplementation(() => {
        return {} as LabelService
      })

    // when
    await run()

    // then
    expect(infoFunc).toHaveBeenCalledTimes(1)
    expect(getInstanceFunc).toHaveBeenCalledTimes(0)
  })

  test('예외', async () => {
    // given
    github.context.eventName = 'issues'
    github.context.payload.sender = {
      key: 'key',
      type: 'User'
    }
    github.context.payload.action = 'opened'
    github.context.payload.issue = {
      key: 'key',
      number: 1
    }

    const getInstanceFunc = jest
      .spyOn(LabelService, 'getInstance')
      .mockImplementation(() => {
        throw new Error()
      })

    const setFailedFunc = jest
      .spyOn(core, 'setFailed')
      .mockImplementation(jest.fn())

    // when
    await run()

    // then
    expect(getInstanceFunc).toHaveBeenCalledTimes(1)
    expect(setFailedFunc).toHaveBeenCalledTimes(1)
  })

  test('정상: 정상 흐름', async () => {
    // given
    github.context.eventName = 'issues'
    github.context.payload.sender = {
      key: 'key',
      type: 'User'
    }
    github.context.payload.action = 'opened'
    github.context.payload.issue = {
      key: 'key',
      number: 1
    }

    const getInstanceFunc = jest
      .spyOn(LabelService, 'getInstance')
      .mockImplementation(() => {
        return {
          getConfigInfo: () => {},
          addLabels: (configInfo: ConfigInfo) => {}
        } as LabelService
      })

    const setFailedFunc = jest
      .spyOn(core, 'setFailed')
      .mockImplementation(jest.fn())

    // when
    await run()

    // then
    expect(getInstanceFunc).toHaveBeenCalledTimes(1)
    expect(setFailedFunc).toHaveBeenCalledTimes(0)
  })
})
