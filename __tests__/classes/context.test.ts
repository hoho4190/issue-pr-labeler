import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'
import {Context} from '../../src/classes/context'
import {InputInfo} from '../../src/classes/input-info'

describe('constructor() - Unit Test', () => {
  const inputInfo = new InputInfo(
    'event.json',
    'mock-token',
    true,
    'labeler-config.yml'
  )

  // Shallow clone original @actions/github context
  let originalContext = {...github.context}

  beforeEach(() => {
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
    jest.restoreAllMocks()
  })

  test('정상: issues', () => {
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
    github.context.payload.pull_request = undefined
    github.context.ref = 'refs/heads/mock-ref'

    // when
    const result = new Context(inputInfo, github.context)

    // then
    expect(repoGetFunc).toHaveBeenCalledTimes(2)
    expect(result.githubEventPath).toBe(inputInfo.githubEventPath)
    expect(result.token).toBe(inputInfo.token)
    expect(result.owner).toBe(github.context.repo.owner)
    expect(result.repo).toBe(github.context.repo.repo)
    expect(result.sha).toBe(github.context.sha)
    expect(result.eventName).toBe(github.context.eventName)
    expect(result.isDisableBot).toBe(inputInfo.disableBot)
    expect(result.configFilePath).toBe(`.github/${inputInfo.configFileName}`)

    expect(result.senderType).toBe(github.context.payload.sender?.type)
    expect(result.eventNumber).toBe(github.context.payload.issue?.number)
    expect(result.eventType).toBe(github.context.payload.action)
  })

  test('정상: pr', () => {
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
    github.context.payload.issue = undefined
    github.context.payload.pull_request = {
      key: 'key',
      number: 1
    }
    github.context.ref = 'refs/heads/mock-ref'

    // when
    const result = new Context(inputInfo, github.context)

    // then
    expect(repoGetFunc).toHaveBeenCalledTimes(2)
    expect(result.githubEventPath).toBe(inputInfo.githubEventPath)
    expect(result.token).toBe(inputInfo.token)
    expect(result.owner).toBe(github.context.repo.owner)
    expect(result.repo).toBe(github.context.repo.repo)
    expect(result.sha).toBe(github.context.sha)
    expect(result.eventName).toBe(github.context.eventName)
    expect(result.isDisableBot).toBe(inputInfo.disableBot)
    expect(result.configFilePath).toBe(`.github/${inputInfo.configFileName}`)

    expect(result.senderType).toBe(github.context.payload.sender?.type)
    expect(result.eventNumber).toBe(github.context.payload.pull_request?.number)
    expect(result.eventType).toBe(github.context.payload.action)
  })

  test('예외: 페이로드에 issue, pull_request 값 없음', () => {
    // given
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'mock-owner',
        repo: 'moock-repo'
      }
    })
    github.context.sha = '1234567890123456789012345678901234567890'
    github.context.payload.sender = undefined
    github.context.payload.action = 'edited'
    github.context.payload.issue = undefined
    github.context.payload.pull_request = undefined
    github.context.ref = 'refs/heads/mock-ref'

    // when
    const result = () => new Context(inputInfo, github.context)

    // then
    expect(result).toThrow(
      'The payload must be an issue or pull_request value'
    )
  })
})
