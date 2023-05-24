import * as github from '@actions/github'
import {beforeEach, describe, expect, jest, test} from '@jest/globals'
import {ConfigInfo, FilterTarget} from '../src/classes/config-info'
import {Context, EventName} from '../src/classes/context'
import {LabelService} from '../src/label-service'

describe('getLables() - Unit Test', () => {
  // Shallow clone original @actions/github context
  let originalContext = {...github.context}

  beforeEach(() => {
    github.context.payload = originalContext.payload
  })

  test('성공: events가 일치하는 경우 - issue', async () => {
    // then
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([EventName.ISSUES]),
          targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const eventName = EventName.ISSUES
    const title = 'title! - issue'
    const comment = 'comment! - issue - docs'

    const expectedLabels = ['documentation']

    // ------------------------------------------------

    const event = {
      issue: {
        title
      }
    } as any

    // ------------------------------------------------

    github.context.payload.issue = {
      key: 'key',
      number: 1,
      body: comment
    }

    const service = LabelService.getInstance({
      token: 'mock-token',
      eventName
    } as Context)

    const parseEventFunc = jest
      .spyOn(LabelService.prototype as any, 'parseEvent')
      .mockImplementation(() => event)

    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())

    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(parseEventFunc).toBeCalledTimes(1)
    expect(addIssueLabelsFunc).toBeCalledTimes(1)
    expect(addPRLabelsFunc).toBeCalledTimes(0)
  })

  test('성공: events가 일치하는 경우 - pr', async () => {
    // then
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([EventName.PULL_REQUEST]),
          targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const eventName = EventName.PULL_REQUEST
    const title = 'title! - pr'
    const comment = 'comment! -pr - docs'

    const expectedLabels = ['documentation']

    // ------------------------------------------------

    const event = {
      pull_request: {
        title
      }
    } as any

    // ------------------------------------------------

    github.context.payload.pull_request = {
      key: 'key',
      number: 1,
      body: comment
    }

    const service = LabelService.getInstance({
      token: 'mock-token',
      eventName
    } as Context)

    const parseEventFunc = jest
      .spyOn(LabelService.prototype as any, 'parseEvent')
      .mockImplementation(() => event)

    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())

    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(parseEventFunc).toBeCalledTimes(1)
    expect(addIssueLabelsFunc).toBeCalledTimes(0)
    expect(addPRLabelsFunc).toBeCalledTimes(1)
  })

  test('성공: events가 일치하지 않는 경우', async () => {
    // then
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([EventName.ISSUES]),
          targets: new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const eventName = EventName.PULL_REQUEST
    const title = 'title! - pr'
    const comment = 'comment! -pr - docs'

    const expectedLabels: string[] = []

    // ------------------------------------------------

    const event = {
      pull_request: {
        title
      }
    } as any

    // ------------------------------------------------

    github.context.payload.pull_request = {
      key: 'key',
      number: 1,
      body: comment
    }

    const service = LabelService.getInstance({
      token: 'mock-token',
      eventName
    } as Context)

    const parseEventFunc = jest
      .spyOn(LabelService.prototype as any, 'parseEvent')
      .mockImplementation(() => event)

    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())

    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(parseEventFunc).toBeCalledTimes(1)
    expect(addIssueLabelsFunc).toBeCalledTimes(0)
    expect(addPRLabelsFunc).toBeCalledTimes(0)
  })

  test('성공: targets이 일치하는 경우 - title', async () => {
    // then
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([EventName.ISSUES, EventName.PULL_REQUEST]),
          targets: new Set([FilterTarget.TITLE])
        }
      ]
    } as ConfigInfo
    const eventName = EventName.ISSUES
    const title = 'title! - docs'
    const comment = 'comment!'

    const expectedLabels = ['documentation']

    // ------------------------------------------------

    const event = {
      issue: {
        title
      }
    } as any

    // ------------------------------------------------

    github.context.payload.issue = {
      key: 'key',
      number: 1,
      body: comment
    }

    const service = LabelService.getInstance({
      token: 'mock-token',
      eventName
    } as Context)

    const parseEventFunc = jest
      .spyOn(LabelService.prototype as any, 'parseEvent')
      .mockImplementation(() => event)

    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())

    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(parseEventFunc).toBeCalledTimes(1)
    expect(addIssueLabelsFunc).toBeCalledTimes(1)
    expect(addPRLabelsFunc).toBeCalledTimes(0)
  })

  test('성공: targets이 일치하는 경우 - comment', async () => {
    // then
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([EventName.ISSUES, EventName.PULL_REQUEST]),
          targets: new Set([FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const eventName = EventName.ISSUES
    const title = 'title!'
    const comment = 'comment! - docs'

    const expectedLabels = ['documentation']

    // ------------------------------------------------

    const event = {
      issue: {
        title
      }
    } as any

    // ------------------------------------------------

    github.context.payload.issue = {
      key: 'key',
      number: 1,
      body: comment
    }

    const service = LabelService.getInstance({
      token: 'mock-token',
      eventName
    } as Context)

    const parseEventFunc = jest
      .spyOn(LabelService.prototype as any, 'parseEvent')
      .mockImplementation(() => event)

    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())

    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(parseEventFunc).toBeCalledTimes(1)
    expect(addIssueLabelsFunc).toBeCalledTimes(1)
    expect(addPRLabelsFunc).toBeCalledTimes(0)
  })

  test('성공: targets이 일치하지 않는 경우', async () => {
    // then
    const configInfo = {
      filters: [
        {
          label: 'documentation',
          regexs: ['/docs/'],
          events: new Set([EventName.ISSUES, EventName.PULL_REQUEST]),
          targets: new Set([FilterTarget.TITLE])
        }
      ]
    } as ConfigInfo
    const eventName = EventName.ISSUES
    const title = 'title!'
    const comment = 'comment! - docs'

    const expectedLabels: string[] = []

    // ------------------------------------------------

    github.context.payload.issue = {
      key: 'key',
      number: 1,
      body: comment
    }

    const event = {
      issue: {
        title
      }
    } as any

    // ------------------------------------------------

    const service = LabelService.getInstance({
      token: 'mock-token',
      eventName
    } as Context)

    const parseEventFunc = jest
      .spyOn(LabelService.prototype as any, 'parseEvent')
      .mockImplementation(() => event)

    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())

    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(parseEventFunc).toBeCalledTimes(1)
    expect(addIssueLabelsFunc).toBeCalledTimes(0)
    expect(addPRLabelsFunc).toBeCalledTimes(0)
  })

  test('성공: 필터링1', async () => {
    // then
    const configInfo = {
      filters: [
        {
          label: 'major',
          regexs: [
            '/Whether Braking Changes(\\s)*Does this PR contain breaking changes\\?(\\s)*- \\[(X|x)\\] Yes/i'
          ],
          events: new Set([EventName.ISSUES]),
          targets: new Set([FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const eventName = EventName.ISSUES
    const title = 'title!'
    const comment = `
    ## Whether Braking Changes
    Does this PR contain breaking changes?

    - [X] Yes
    - [ ] NO
    `

    const expectedLabels = ['major']

    // ------------------------------------------------

    github.context.payload.issue = {
      key: 'key',
      number: 1,
      body: comment
    }

    const event = {
      issue: {
        title
      }
    } as any

    // ------------------------------------------------

    const service = LabelService.getInstance({
      token: 'mock-token',
      eventName
    } as Context)

    const parseEventFunc = jest
      .spyOn(LabelService.prototype as any, 'parseEvent')
      .mockImplementation(() => event)

    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())

    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(parseEventFunc).toBeCalledTimes(1)
    expect(addIssueLabelsFunc).toBeCalledTimes(1)
    expect(addPRLabelsFunc).toBeCalledTimes(0)
  })

  test('성공: 필터링1', async () => {
    // then
    const configInfo = {
      filters: [
        {
          label: 'feat',
          regexs: ['/- \\[(X|x)\\] New feature\\b/m'],
          events: new Set([EventName.PULL_REQUEST]),
          targets: new Set([FilterTarget.COMMENT])
        }
      ]
    } as ConfigInfo
    const eventName = EventName.PULL_REQUEST
    const title = 'title!'
    const comment = `
    ## Type of change

    - [ ] Bug fix
    - [x] New feature
    - [ ] Refactoring (no functional changes, no api changes)
    `

    const expectedLabels = ['feat']

    // ------------------------------------------------

    github.context.payload.pull_request = {
      key: 'key',
      number: 1,
      body: comment
    }

    const event = {
      pull_request: {
        title
      }
    } as any

    // ------------------------------------------------

    const service = LabelService.getInstance({
      token: 'mock-token',
      eventName
    } as Context)

    const parseEventFunc = jest
      .spyOn(LabelService.prototype as any, 'parseEvent')
      .mockImplementation(() => event)

    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())

    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    // when
    const result = await service.addLabels(configInfo)

    // then
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(parseEventFunc).toBeCalledTimes(1)
    expect(addIssueLabelsFunc).toBeCalledTimes(0)
    expect(addPRLabelsFunc).toBeCalledTimes(1)
  })
})
