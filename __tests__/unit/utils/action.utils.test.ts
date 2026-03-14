import { jest } from '@jest/globals'
import type { LocalGitHubServiceOptions } from '../../../src/services/github.service.local.js'

const getInputMock = jest.fn()
const infoMock = jest.fn()
const setOutputMock = jest.fn()
const setFailedMock = jest.fn()
const summaryMock = {
  clear: jest.fn(async () => summaryMock),
  addRaw: jest.fn((..._args: unknown[]) => summaryMock),
  write: jest.fn(async () => summaryMock)
}

const getOctokitMock = jest.fn()
const GitHubServiceMock = jest.fn(function (this: unknown, octokit: unknown) {
  return { octokit }
})
const LocalGitHubServiceMock = jest.fn(function (
  this: unknown,
  realService: unknown,
  options: unknown
) {
  return { realService, options }
})

const generateSummaryMock = jest.fn()
const safeStringifyMock = jest.fn()

jest.unstable_mockModule('@actions/core', () => ({
  getInput: (...args: unknown[]) => getInputMock(...args),
  info: (...args: unknown[]) => infoMock(...args),
  setOutput: (...args: unknown[]) => setOutputMock(...args),
  setFailed: (...args: unknown[]) => setFailedMock(...args),
  summary: summaryMock
}))

jest.unstable_mockModule('@actions/github', () => ({
  getOctokit: (...args: unknown[]) => getOctokitMock(...args)
}))

jest.unstable_mockModule('../../../src/services/github.service.js', () => ({
  GitHubService: GitHubServiceMock
}))

jest.unstable_mockModule('../../../src/services/github.service.local.js', () => ({
  LocalGitHubService: LocalGitHubServiceMock
}))

jest.unstable_mockModule('../../../src/utils/summary.utils.js', () => ({
  generateSummary: (...args: unknown[]) => generateSummaryMock(...args)
}))

jest.unstable_mockModule('../../../src/utils/string.utils.js', () => ({
  safeStringify: (...args: unknown[]) => safeStringifyMock(...args)
}))

type ActionUtilsModule = typeof import('../../../src/utils/action.utils.js')

let getActionInputs: ActionUtilsModule['getActionInputs']
let createGitHubService: ActionUtilsModule['createGitHubService']
let createLocalGitHubService: ActionUtilsModule['createLocalGitHubService']
let runAction: ActionUtilsModule['runAction']

describe('Unit | Utils: action.utils', () => {
  beforeAll(async () => {
    const module = await import('../../../src/utils/action.utils.js')
    getActionInputs = module.getActionInputs
    createGitHubService = module.createGitHubService
    createLocalGitHubService = module.createLocalGitHubService
    runAction = module.runAction
  })

  beforeEach(() => {
    getInputMock.mockReset()
    infoMock.mockReset()
    setOutputMock.mockReset()
    setFailedMock.mockReset()

    summaryMock.clear.mockReset()
    summaryMock.addRaw.mockReset()
    summaryMock.write.mockReset()

    getOctokitMock.mockReset()
    GitHubServiceMock.mockReset()
    LocalGitHubServiceMock.mockReset()
    generateSummaryMock.mockReset()
    safeStringifyMock.mockReset()

    summaryMock.clear.mockResolvedValue(summaryMock)
    summaryMock.addRaw.mockReturnValue(summaryMock)
    summaryMock.write.mockResolvedValue(summaryMock)

    getInputMock.mockImplementation((name: unknown) => {
      if (name === 'token') return 'test-token'
      if (name === 'config-file-path') return '.github/labeler-config.yml'
      return ''
    })

    getOctokitMock.mockReturnValue({ client: 'octokit' })

    GitHubServiceMock.mockImplementation((octokit: unknown) => ({ octokit }))
    LocalGitHubServiceMock.mockImplementation((realService: unknown, options: unknown) => ({
      realService,
      options
    }))

    generateSummaryMock.mockImplementation(async () => 'generated-summary')
    safeStringifyMock.mockReturnValue('[stringified-object]')
  })

  describe('getActionInputs()', () => {
    // GitHub Action 입력값을 올바르게 읽어 반환하는지 확인
    test('returns token and config file path from core inputs', () => {
      // given
      const expectedToken = 'ghs_token'
      const expectedConfigPath = '.github/custom.yml'
      getInputMock.mockImplementation((name: unknown) => {
        if (name === 'token') return expectedToken
        if (name === 'config-file-path') return expectedConfigPath
        return ''
      })

      // when
      const inputs = getActionInputs()

      // then
      expect(inputs).toEqual({
        token: expectedToken,
        configFilePath: expectedConfigPath
      })
      expect(getInputMock).toHaveBeenNthCalledWith(1, 'token', {
        required: true
      })
      expect(getInputMock).toHaveBeenNthCalledWith(2, 'config-file-path')
    })
  })

  describe('createGitHubService()', () => {
    // 토큰으로 Octokit을 만들고 GitHubService 생성자에 전달하는지 확인
    test('creates GitHubService with octokit from token', () => {
      // given
      const token = 'token-123'
      const octokit = { client: 'mock-octokit' }
      getOctokitMock.mockReturnValue(octokit)

      // when
      const service = createGitHubService(token)

      // then
      expect(getOctokitMock).toHaveBeenCalledWith(token)
      expect(GitHubServiceMock).toHaveBeenCalledWith(octokit)
      expect(service).toEqual({ octokit })
    })
  })

  describe('createLocalGitHubService()', () => {
    // real GitHubService와 options로 LocalGitHubService를 생성하는지 확인
    test('creates LocalGitHubService with real service and options', () => {
      // given
      const token = 'local-token'
      const options: LocalGitHubServiceOptions = {
        basePath: '/tmp/fixture',
        useRealService: { getIssue: true },
        fixtureFiles: { getContent: 'custom.yml' }
      }
      const octokit = { client: 'local-octokit' }
      getOctokitMock.mockReturnValue(octokit)

      // when
      const localService = createLocalGitHubService(token, options)

      // then
      expect(getOctokitMock).toHaveBeenCalledWith(token)
      expect(GitHubServiceMock).toHaveBeenCalledWith(octokit)
      expect(LocalGitHubServiceMock).toHaveBeenCalledWith({ octokit }, options)
      expect(localService).toEqual({
        realService: { octokit },
        options
      })
    })
  })

  describe('runAction()', () => {
    // 실행 성공 시 output/summary/log를 정상 처리하고 결과를 반환하는지 확인
    test('returns run result and writes outputs/summary on success', async () => {
      // given
      const actionName = 'Issue PR Labeler'
      const runResult = {
        context: { eventType: 'issues' },
        settings: { dryRun: false },
        summaryData: {
          actions: [],
          outcomes: [],
          reasons: [],
          operations: [{ name: 'bug', action: 'Add', result: 'Success' }]
        }
      } as any
      const execute = jest.fn(async () => runResult)

      // when
      const result = await runAction(actionName, execute)

      // then
      expect(result).toBe(runResult)
      expect(execute).toHaveBeenCalledTimes(1)

      expect(infoMock).toHaveBeenNthCalledWith(1, `Starting ${actionName}...`)
      expect(infoMock).toHaveBeenNthCalledWith(2, `${actionName} completed successfully`)
      expect(infoMock).toHaveBeenNthCalledWith(3, `${actionName} finished`)

      expect(summaryMock.clear).toHaveBeenCalledTimes(1)
      expect(summaryMock.addRaw).toHaveBeenNthCalledWith(1, `## ${actionName}\n\n`)
      expect(summaryMock.addRaw).toHaveBeenNthCalledWith(2, 'generated-summary')
      expect(summaryMock.write).toHaveBeenCalledTimes(1)

      expect(generateSummaryMock).toHaveBeenCalledWith(
        runResult.summaryData,
        runResult.context,
        runResult.settings
      )

      expect(setOutputMock).toHaveBeenCalledWith(
        'labels',
        JSON.stringify(runResult.summaryData.operations)
      )
      expect(setFailedMock).not.toHaveBeenCalled()
      expect(safeStringifyMock).not.toHaveBeenCalled()
    })

    // Error 인스턴스 예외 시 메시지를 setFailed로 전달하고 undefined를 반환하는지 확인
    test('handles Error by using error.message and returns undefined', async () => {
      // given
      const actionName = 'Issue PR Labeler'
      const executeError = new Error('boom')
      const execute = jest.fn(async () => {
        throw executeError
      })

      // when
      const result = await runAction(actionName, execute)

      // then
      expect(result).toBeUndefined()

      expect(setOutputMock).not.toHaveBeenCalled()
      expect(generateSummaryMock).not.toHaveBeenCalled()
      expect(setFailedMock).toHaveBeenCalledWith('boom')
      expect(summaryMock.addRaw).toHaveBeenNthCalledWith(2, 'boom')
      expect(safeStringifyMock).not.toHaveBeenCalled()
      expect(summaryMock.write).toHaveBeenCalledTimes(1)

      expect(infoMock).toHaveBeenNthCalledWith(1, `Starting ${actionName}...`)
      expect(infoMock).toHaveBeenNthCalledWith(2, `${actionName} finished`)
      expect(infoMock).not.toHaveBeenCalledWith(`${actionName} completed successfully`)
    })

    // non-Error 객체 예외 시 safeStringify 결과 메시지를 사용하는지 확인
    test('handles object error by using safeStringify output', async () => {
      // given
      const actionName = 'Issue PR Labeler'
      const thrown = { code: 'E_TEST', detail: 'failure' }
      safeStringifyMock.mockReturnValue('{"code":"E_TEST"}')
      const execute = jest.fn(async () => {
        throw thrown
      })

      // when
      const result = await runAction(actionName, execute)

      // then
      expect(result).toBeUndefined()
      expect(safeStringifyMock).toHaveBeenCalledWith(thrown, 2)
      expect(setFailedMock).toHaveBeenCalledWith('{"code":"E_TEST"}')
      expect(summaryMock.addRaw).toHaveBeenNthCalledWith(2, '{"code":"E_TEST"}')
      expect(summaryMock.write).toHaveBeenCalledTimes(1)
    })

    // 원시값 예외 시 String(error)로 메시지를 생성하는지 확인
    test('handles primitive error by string coercion', async () => {
      // given
      const actionName = 'Issue PR Labeler'
      const execute = jest.fn(async () => {
        throw 42
      })

      // when
      const result = await runAction(actionName, execute)

      // then
      expect(result).toBeUndefined()
      expect(safeStringifyMock).not.toHaveBeenCalled()
      expect(setFailedMock).toHaveBeenCalledWith('42')
      expect(summaryMock.addRaw).toHaveBeenNthCalledWith(2, '42')
      expect(summaryMock.write).toHaveBeenCalledTimes(1)
    })
  })
})
