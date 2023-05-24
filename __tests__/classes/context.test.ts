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
import {Context} from '../../src/classes/context'

const originalGitHubEventPath = process.env['GITHUB_EVENT_PATH']

describe('constructor() - Unit Test', () => {
  // Inputs for mock @actions/core
  let inputs = {} as any

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
    inputs = {
      token: 'mock-token',
      'disable-bot': 'true',
      'config-file-name': 'labeler-config.yml'
    }

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
  })

  afterEach(() => {
    // Restore @actions/github context
    github.context.ref = originalContext.ref
    github.context.sha = originalContext.sha
    github.context.payload = originalContext.payload
    github.context.eventName = originalContext.eventName

    // Restore
    inputs = {} as any
    jest.restoreAllMocks()
  })

  test('성공 - issues', () => {
    // given
    const repoGetFunc = jest
      .spyOn(github.context, 'repo', 'get')
      .mockImplementation(() => {
        return {
          owner: 'mock-owner',
          repo: 'moock-repo'
        }
      })
    github.context.sha = '1234567890123456789012345678901234567890'
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
    github.context.ref = 'refs/heads/mock-ref'

    // when
    const result = new Context()

    // then
    expect(repoGetFunc).toBeCalledTimes(2)
    expect(result.githubEventPath).toBe(process.env['GITHUB_EVENT_PATH'])
    expect(result.token).toBe(inputs.token)
    expect(result.owner).toBe(github.context.repo.owner)
    expect(result.repo).toBe(github.context.repo.repo)
    expect(result.sha).toBe(github.context.sha)
    expect(result.eventName).toBe(github.context.eventName)
    expect(result.isDisableBot).toBe(inputs['disable-bot'])
    expect(result.configFilePath).toBe(`.github/${inputs['config-file-name']}`)

    expect(result.senderType).toBe(github.context.payload.sender?.type)
    expect(result.eventNumber).toBe(github.context.payload.issue?.number)
    expect(result.eventType).toBe(github.context.payload.action)
  })

  test('성공 - pr', () => {
    // given
    const repoGetFunc = jest
      .spyOn(github.context, 'repo', 'get')
      .mockImplementation(() => {
        return {
          owner: 'mock-owner',
          repo: 'moock-repo'
        }
      })
    github.context.sha = '1234567890123456789012345678901234567890'
    github.context.eventName = 'pull_request'
    github.context.payload.sender = {
      key: 'key',
      type: 'User'
    }
    github.context.payload.action = 'opened'
    github.context.payload.pull_request = {
      key: 'key',
      number: 1
    }
    github.context.ref = 'refs/heads/mock-ref'

    // when
    const result = new Context()

    // then
    expect(repoGetFunc).toBeCalledTimes(2)
    expect(result.githubEventPath).toBe(process.env['GITHUB_EVENT_PATH'])
    expect(result.token).toBe(inputs.token)
    expect(result.owner).toBe(github.context.repo.owner)
    expect(result.repo).toBe(github.context.repo.repo)
    expect(result.sha).toBe(github.context.sha)
    expect(result.eventName).toBe(github.context.eventName)
    expect(result.isDisableBot).toBe(inputs['disable-bot'])
    expect(result.configFilePath).toBe(`.github/${inputs['config-file-name']}`)

    expect(result.senderType).toBe(github.context.payload.sender?.type)
    expect(result.eventNumber).toBe(github.context.payload.pull_request?.number)
    expect(result.eventType).toBe(github.context.payload.action)
  })
})
