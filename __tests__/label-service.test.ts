import * as core from '@actions/core'
import * as github from '@actions/github'
import {afterAll, beforeAll, describe, expect, jest, test} from '@jest/globals'
import {Context, EventName} from '../src/classes/context'
import {LabelService} from '../src/label-service'

// Inputs for mock @actions/core
let inputs = {} as any

describe('getLables() - Test', () => {
  beforeAll(() => {
    inputs = {
      token: 'mock-token',
      'disable-bot': 'true',
      'config-file-name': 'labeler-config.yml'
    }

    // process
    process.env['GITHUB_EVENT_PATH'] = 'event.json'

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
    github.context.payload.action = 'opened'
    github.context.payload.issue = {
      key: 'key',
      number: 1
    }
    github.context.eventName = 'issues'
    // github.context.payload.pull_request = {
    //   key: 'key',
    //   number: 1
    // }
    // github.context.eventName = 'pull_request'
    github.context.ref = 'refs/heads/mock-ref'
    github.context.sha = '1234567890123456789012345678901234567890'
    github.context.payload.sender = {
      key: 'key',
      type: 'User'
    }

    // Mock LabelService
    jest
      .spyOn(LabelService.prototype as any, 'parseEvent')
      .mockImplementation(jest.fn())
  })

  afterAll(() => {
    // Restore
    inputs = {} as any
    delete process.env['GITHUB_WORKSPACE']
    jest.restoreAllMocks()
  })

  test('success1', async () => {
    // given
    const configInfoStr = `
    filters:
      - label: enhancement
        regexs:
          - /feat/i
          - /refactor/
        events: [issues, pull_request]
        targets: [title, comment]
      - label: bug
        regexs:
          - /\\bfix\\b|bug/
        targets: [title]
      - label: documentation
        regexs:
          - /docs/
        events: [pull_request]
    `

    const {title, comment} = {
      title: 'Feat',
      comment: 'fixcode'
    }

    const expectedLabels = ['enhancement']

    const getContentFunc = jest
      .spyOn(LabelService.prototype as any, 'getContent')
      .mockImplementation(() => configInfoStr)
    const getTitleCommentFunc = jest
      .spyOn(LabelService.prototype as any, 'getTitleComment')
      .mockImplementation(() => {
        return {title, comment}
      })
    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())
    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    const context = new Context()
    // console.log(context)
    const service = LabelService.getInstance(context)
    const configInfo = await service.getConfigInfo()
    // console.log(configInfo.filters)

    // when
    const result = await service.addLabels(configInfo)

    // then
    // console.log(`actual = ${result}, expected = ${expectedLabels}`)
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(getContentFunc).toBeCalledTimes(1)
    expect(getTitleCommentFunc).toBeCalledTimes(1)
    if (context.eventName === EventName.ISSUES) {
      expect(addIssueLabelsFunc).toBeCalledTimes(1)
      expect(addPRLabelsFunc).toBeCalledTimes(0)
    } else {
      expect(addIssueLabelsFunc).toBeCalledTimes(0)
      expect(addPRLabelsFunc).toBeCalledTimes(1)
    }
  })

  test('success2', async () => {
    // given
    const configInfoStr = `
    filters:
      - label: enhancement
        regexs:
          - /feat/
          - /refactor/
        events: [issues, pull_request]
        targets: [title, comment]
      - label: bug
        regexs:
          - /fix|bug/
        targets: [comment]
      - label: documentation
        regexs:
          - /docs/
        events: [pull_request]
    `

    const {title, comment} = {
      title: 'Feat',
      comment: 'fixcode'
    }

    const expectedLabels = ['bug']

    const getContentFunc = jest
      .spyOn(LabelService.prototype as any, 'getContent')
      .mockImplementation(() => configInfoStr)
    const getTitleCommentFunc = jest
      .spyOn(LabelService.prototype as any, 'getTitleComment')
      .mockImplementation(() => {
        return {title, comment}
      })
    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())
    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    const context = new Context()
    // console.log(context)
    const service = LabelService.getInstance(context)
    const configInfo = await service.getConfigInfo()
    // console.log(configInfo.filters)

    // when
    const result = await service.addLabels(configInfo)

    // then
    // console.log(`actual = ${result}, expected = ${expectedLabels}`)
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(getContentFunc).toBeCalledTimes(1)
    expect(getTitleCommentFunc).toBeCalledTimes(1)
    if (context.eventName === EventName.ISSUES) {
      expect(addIssueLabelsFunc).toBeCalledTimes(1)
      expect(addPRLabelsFunc).toBeCalledTimes(0)
    } else {
      expect(addIssueLabelsFunc).toBeCalledTimes(0)
      expect(addPRLabelsFunc).toBeCalledTimes(1)
    }
  })

  test('success3', async () => {
    // given
    const configInfoStr = `
    filters:
      - label: feat
        regexs:
          - /\\bfeat(\\(.*\\))?:/i
      - label: fix
        regexs:
          - /\\bfix(\\(.*\\))?:/i
      - label: refactor
        regexs:
          - /\\brefactor(\\(.*\\))?:/i
    `

    const {title, comment} = {
      title: 'refactor',
      comment: `
      feat:xx
      fix(xxx-core): xx
      `
    }

    const expectedLabels = ['feat', 'fix']

    const getContentFunc = jest
      .spyOn(LabelService.prototype as any, 'getContent')
      .mockImplementation(() => configInfoStr)
    const getTitleCommentFunc = jest
      .spyOn(LabelService.prototype as any, 'getTitleComment')
      .mockImplementation(() => {
        return {title, comment}
      })
    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())
    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    const context = new Context()
    // console.log(context)
    const service = LabelService.getInstance(context)
    const configInfo = await service.getConfigInfo()
    // console.log(configInfo.filters)

    // when
    const result = await service.addLabels(configInfo)

    // then
    // console.log(`actual = ${result}, expected = ${expectedLabels}`)
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(getContentFunc).toBeCalledTimes(1)
    expect(getTitleCommentFunc).toBeCalledTimes(1)
    if (context.eventName === EventName.ISSUES) {
      expect(addIssueLabelsFunc).toBeCalledTimes(1)
      expect(addPRLabelsFunc).toBeCalledTimes(0)
    } else {
      expect(addIssueLabelsFunc).toBeCalledTimes(0)
      expect(addPRLabelsFunc).toBeCalledTimes(1)
    }
  })

  test('success4', async () => {
    // given
    const configInfoStr = `
    filters:
      # PULL_REQUEST_TEMPLATE.md
      - label: major
        regexs:
          - /Whether Braking Changes(\\s)*Does this PR contain breaking changes\\?(\\s)*- \\[(X|x)\\] Yes/i
        targets: [comment]
    `

    const {title, comment} = {
      title: 'refactor',
      comment: `
      ## Whether Braking Changes
      Does this PR contain breaking changes?

      - [X] Yes
      - [ ] NO
      `
    }

    const expectedLabels = ['major']

    const getContentFunc = jest
      .spyOn(LabelService.prototype as any, 'getContent')
      .mockImplementation(() => configInfoStr)
    const getTitleCommentFunc = jest
      .spyOn(LabelService.prototype as any, 'getTitleComment')
      .mockImplementation(() => {
        return {title, comment}
      })
    const addIssueLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addIssueLabels')
      .mockImplementation(jest.fn())
    const addPRLabelsFunc = jest
      .spyOn(LabelService.prototype as any, 'addPRLabels')
      .mockImplementation(jest.fn())

    const context = new Context()
    // console.log(context)
    const service = LabelService.getInstance(context)
    const configInfo = await service.getConfigInfo()
    // console.log(configInfo.filters)

    // when
    const result = await service.addLabels(configInfo)

    // then
    // console.log(`actual = ${result}, expected = ${expectedLabels}`)
    expect(result.sort()).toEqual(expectedLabels.sort())
    expect(getContentFunc).toBeCalledTimes(1)
    expect(getTitleCommentFunc).toBeCalledTimes(1)
    if (context.eventName === EventName.ISSUES) {
      expect(addIssueLabelsFunc).toBeCalledTimes(1)
      expect(addPRLabelsFunc).toBeCalledTimes(0)
    } else {
      expect(addIssueLabelsFunc).toBeCalledTimes(0)
      expect(addPRLabelsFunc).toBeCalledTimes(1)
    }
  })
})
