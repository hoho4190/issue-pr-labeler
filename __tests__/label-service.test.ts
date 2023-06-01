import * as core from '@actions/core'
import {Context as GithubContext} from '@actions/github/lib/context'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'
import fs from 'fs'
import {
  ConfigInfo,
  Filter,
  FilterEvent,
  FilterTarget
} from '../src/classes/config-info'
import {Context, EventName} from '../src/classes/context'
import {LabelService} from '../src/label-service'
import * as util from '../src/util'

describe('getInstance() - Unit Test', () => {
  const context = {
    token: 'mock-token'
  } as Context

  const octokit = jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        getContent: jest.fn()
      }
    }
  })) as any

  test('정상: new instance', () => {
    // then

    // when
    LabelService.getInstance(context, octokit)

    // then
  })

  test('정상: existent instance', () => {
    // then
    LabelService.getInstance(context, octokit)

    // when
    LabelService.getInstance(context, octokit)

    // then
  })
})

describe('getConfigInfo() - Unit Test', () => {
  let context: Context

  const mockConfigInfo = {
    filters: [
      {
        label: 'feat',
        regexs: ['/feat/i'],
        events: new Set([FilterEvent.ISSUES]),
        targets: new Set([FilterTarget.TITLE])
      }
    ]
  } as ConfigInfo

  const mockContentData = `
  filters:
    - label: feat
      regexs:
        - /feat/i
      events: [issues]
      targets: [title]
  `

  let convertToConfigInfoFunc: any

  beforeEach(() => {
    context = {} as Context
    context.token = 'mock-token'

    convertToConfigInfoFunc = jest
      .spyOn(util, 'convertToConfigInfo')
      .mockImplementation((data: string) => {
        return mockConfigInfo
      })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('정상: 200', async () => {
    // then
    const mockContext = {
      status: 200,
      data: {
        content: mockContentData,
        encoding: 'utf-8'
      }
    }

    const octokit = {
      rest: {
        repos: {
          getContent: () => {
            return Promise.resolve(mockContext)
          }
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    // when
    const result = await service.getConfigInfo()

    // then
    expect(result.filters.length).toBe(1)
    expect(convertToConfigInfoFunc).toBeCalledTimes(1)
  })

  test('예외: status !== 200', async () => {
    // then
    const mockContext = {
      status: 500
    }

    const octokit = {
      rest: {
        repos: {
          getContent: () => {
            return Promise.resolve(mockContext)
          }
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    // when
    const result = service.getConfigInfo()

    // then
    await expect(result).rejects.toThrowError(
      'Failed to load configuration file: status = 500'
    )
    expect(convertToConfigInfoFunc).toBeCalledTimes(0)
  })
})

describe('addLabels() - Unit Test', () => {
  beforeEach(() => {
    // Mock error/warning/info/debug
    jest.spyOn(core, 'error').mockImplementation(jest.fn())
    jest.spyOn(core, 'warning').mockImplementation(jest.fn())
    jest.spyOn(core, 'info').mockImplementation(jest.fn())
    jest.spyOn(core, 'debug').mockImplementation(jest.fn())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('예외: parseEvent() 에러', async () => {
    // give
    const context = {
      githubEventPath: 'event.json'
    } as Context

    const service = LabelService.getInstance(context, {} as any)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => {
        throw new Error()
      })

    // when
    const result = service.addLabels({} as ConfigInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    await expect(result).rejects.toThrowError('Failed to parse event.json')
  })

  test('예외: getTitleComment() 에러', async () => {
    // give
    const configInfo = {} as ConfigInfo

    const context = {
      githubEventPath: 'event.json',
      eventName: EventName.ISSUES
    } as Context

    const mockEvent = {
      issue: undefined
    } as any

    const service = LabelService.getInstance(context, {} as any)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    // when
    const result = service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    await expect(result).rejects.toThrowError('Failed to get title and comment')
  })

  test('예외: getLables() 에러', async () => {
    // give
    const configInfo = {} as ConfigInfo
    configInfo.filters = [
      {
        label: undefined
      }
    ] as any

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: {
          body: 'mock-body'
        }
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: 'mock-title'
      }
    } as any

    const service = LabelService.getInstance(context, {} as any)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    // when
    const result = service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    await expect(result).rejects.toThrowError(
      "Failed to filter label: Cannot read properties of undefined (reading 'has')"
    )
  })

  test('예외: addIssueLabels() 에러', async () => {
    // give
    const configInfo = {} as ConfigInfo
    configInfo.filters = [
      {
        label: 'feat',
        regexs: ['/feat/'],
        events: new Set([FilterEvent.ISSUES]),
        targets: new Set([FilterTarget.TITLE])
      }
    ] as Filter[]

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: {
          body: 'mock-body'
        }
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: 'feat'
      }
    } as any

    const octokit = {
      rest: {
        issues: {
          addLabels: () => {
            throw new Error('zzz')
          }
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    // when
    const result = service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    await expect(result).rejects.toThrowError()
  })

  test('정상: labels.length === 0', async () => {
    // give
    const configInfo = {} as ConfigInfo
    configInfo.filters = [
      {
        label: 'feat',
        regexs: ['/feat/'],
        events: new Set([FilterEvent.ISSUES]),
        targets: new Set([FilterTarget.TITLE])
      }
    ] as Filter[]

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: {
          body: 'mock-body'
        }
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: 'mock-title'
      }
    } as any

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.length).toBe(0)
  })

  test('정상: issues - body O', async () => {
    // give
    const configInfo = {} as ConfigInfo
    configInfo.filters = [
      {
        label: 'feat',
        regexs: ['/feat/', '/\\bfeat\\b/'],
        events: new Set([FilterEvent.ISSUES]),
        targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
      },
      {
        label: 'feat',
        regexs: ['/\\bfeat\\b/'],
        events: new Set([FilterEvent.ISSUES]),
        targets: new Set([FilterTarget.TITLE])
      },
      {
        label: 'test',
        regexs: ['/test/'],
        events: new Set([FilterEvent.PULL_REQUEST]),
        targets: new Set([FilterTarget.TITLE])
      }
    ] as Filter[]
    const title = 'title'
    const comment = 'feat'
    const expectedLabels = ['feat']

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: title
      }
    } as any

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: issues - body X', async () => {
    // give
    const configInfo = {} as ConfigInfo
    configInfo.filters = [
      {
        label: 'feat',
        regexs: ['/feat/', '/\\bfeat\\b/'],
        events: new Set([FilterEvent.ISSUES]),
        targets: new Set([FilterTarget.COMMENT])
      }
    ] as Filter[]
    const title = 'feat'
    const expectedLabels: string[] = []

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: undefined
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: title
      }
    } as any

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: PR - body O', async () => {
    // give
    const configInfo = {} as ConfigInfo
    configInfo.filters = [
      {
        label: 'feat',
        regexs: ['/feat/i', '/\\bfeat\\b/'],
        events: new Set([FilterEvent.PULL_REQUEST]),
        targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
      },
      {
        label: 'feat2',
        regexs: ['/feat/', '/\\bfeat\\b/'],
        events: new Set([FilterEvent.ISSUES]),
        targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
      }
    ] as Filter[]
    const title = 'title'
    const comment = 'FEAT'
    const expectedLabels = ['feat']

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.PULL_REQUEST
    context.githubContext = {
      payload: {
        pull_request: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      pull_request: {
        title: title
      }
    } as any

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: PR - body X', async () => {
    // give
    const configInfo = {} as ConfigInfo
    configInfo.filters = [
      {
        label: 'feat',
        regexs: ['/\\bfeat\\b/'],
        events: new Set([FilterEvent.ISSUES]),
        targets: new Set([FilterTarget.TITLE])
      }
    ] as Filter[]
    const title = 'feat'
    const expectedLabels: string[] = []

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.PULL_REQUEST
    context.githubContext = {
      payload: {
        pull_request: undefined
      }
    } as GithubContext

    const mockEvent = {
      pull_request: {
        title: title
      }
    } as any

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })
})

describe('fitering - Test', () => {
  beforeEach(() => {
    // Mock error/warning/info/debug
    jest.spyOn(core, 'error').mockImplementation(jest.fn())
    jest.spyOn(core, 'warning').mockImplementation(jest.fn())
    jest.spyOn(core, 'info').mockImplementation(jest.fn())
    jest.spyOn(core, 'debug').mockImplementation(jest.fn())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('정상: events가 일치하는 경우 - issue', async () => {
    // give
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([FilterEvent.ISSUES]),
          targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const title = 'title! - issue'
    const comment = 'comment! - issue - docs'
    const expectedLabels = ['documentation']

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: title
      }
    } as any

    // ------------------------------------------------

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: events가 일치하는 경우 - pull_request', async () => {
    // give
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([FilterEvent.PULL_REQUEST]),
          targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const title = 'title! - pr'
    const comment = 'comment! -pr - docs'
    const expectedLabels = ['documentation']

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.PULL_REQUEST
    context.githubContext = {
      payload: {
        pull_request: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      pull_request: {
        title: title
      }
    } as any

    // ------------------------------------------------

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: events가 일치하는 경우 - pull_request_target', async () => {
    // give
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([FilterEvent.PULL_REQUEST]),
          targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const title = 'title! - pr'
    const comment = 'comment! -pr - docs'
    const expectedLabels = ['documentation']

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.PULL_REQUEST_TARGET
    context.githubContext = {
      payload: {
        pull_request: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      pull_request: {
        title: title
      }
    } as any

    // ------------------------------------------------

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: events가 일치하지 않는 경우', async () => {
    // give
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([FilterEvent.ISSUES]),
          targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const title = 'title! - pr'
    const comment = 'comment! -pr - docs'
    const expectedLabels: string[] = []

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.PULL_REQUEST
    context.githubContext = {
      payload: {
        pull_request: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      pull_request: {
        title: title
      }
    } as any

    // ------------------------------------------------

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: targets이 일치하는 경우 - title', async () => {
    // give
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([FilterEvent.ISSUES, FilterEvent.PULL_REQUEST]),
          targets: new Set([FilterTarget.TITLE])
        }
      ]
    } as ConfigInfo
    const title = 'title! - docs'
    const comment = 'comment!'
    const expectedLabels = ['documentation']

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: title
      }
    } as any

    // ------------------------------------------------

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: targets이 일치하는 경우 - comment', async () => {
    // give
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([FilterEvent.ISSUES, FilterEvent.PULL_REQUEST]),
          targets: new Set([FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const title = 'title!'
    const comment = 'comment! - docs'
    const expectedLabels = ['documentation']

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: title
      }
    } as any

    // ------------------------------------------------

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: targets이 일치하지 않는 경우', async () => {
    // give
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([FilterEvent.ISSUES, FilterEvent.PULL_REQUEST]),
          targets: new Set([FilterTarget.TITLE])
        }
      ]
    } as ConfigInfo
    const title = 'title!'
    const comment = 'comment! - docs'
    const expectedLabels: string[] = []

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: title
      }
    } as any

    // ------------------------------------------------

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: ex01', async () => {
    // give
    const configInfo = {
      filters: [
        {
          label: 'major',
          regexs: [
            '/Whether Braking Changes(\\s)*Does this PR contain breaking changes\\?(\\s)*- \\[(X|x)\\] Yes/i'
          ],
          events: new Set([FilterEvent.ISSUES]),
          targets: new Set([FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const title = 'title!'
    const comment = `
    ## Whether Braking Changes
    Does this PR contain breaking changes?

    - [x] Yes
    - [ ] NO
    `
    const expectedLabels = ['major']

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.ISSUES
    context.githubContext = {
      payload: {
        issue: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      issue: {
        title: title
      }
    } as any

    // ------------------------------------------------

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })

  test('정상: ex02', async () => {
    // give
    const configInfo = {
      filters: [
        {
          label: 'feat',
          regexs: ['/- \\[(X|x)\\] New feature\\b/m'],
          events: new Set([FilterEvent.PULL_REQUEST]),
          targets: new Set([FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const title = 'title!'
    const comment = `
    ## Type of change

    - [ ] Bug fix
    - [X] New feature
    - [ ] Refactoring (no functional changes, no api changes)
    `
    const expectedLabels = ['feat']

    const context = {} as Context
    context.githubEventPath = 'event.json'
    context.eventName = EventName.PULL_REQUEST
    context.githubContext = {
      payload: {
        pull_request: {
          body: comment
        }
      }
    } as GithubContext

    const mockEvent = {
      pull_request: {
        title: title
      }
    } as any

    // ------------------------------------------------

    const octokit = {
      rest: {
        issues: {
          addLabels: jest.fn()
        }
      }
    } as any

    const service = LabelService.getInstance(context, octokit)

    const readFileSyncFunc = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => mockEvent)

    const parseFunc = jest
      .spyOn(JSON, 'parse')
      .mockImplementation(() => mockEvent)

    const infofunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(readFileSyncFunc).toBeCalledTimes(1)
    expect(parseFunc).toBeCalledTimes(1)
    expect(infofunc).toBeCalledTimes(1)
    expect(result.sort()).toEqual(expectedLabels.sort())
  })
})
