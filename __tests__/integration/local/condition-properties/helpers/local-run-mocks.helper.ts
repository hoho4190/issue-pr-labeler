import { jest } from '@jest/globals'
import type { LocalGitHubServiceOptions } from '../../../../../src/services/github.service.local.js'

type CreateLocalGitHubServiceFn =
  typeof import('../../../../../src/utils/action.utils.js').createLocalGitHubService
type RunFn = typeof import('../../../../../src/local.js').run

const setOutputMock = jest.fn()
const infoMock = jest.fn()
const debugMock = jest.fn()
const summaryMock = {
  clear: jest.fn(async () => summaryMock),
  addRaw: jest.fn((..._args: unknown[]) => summaryMock),
  write: jest.fn(async () => summaryMock)
}

export interface LocalRunMocks {
  run: RunFn
  resetMocks: () => void
  configureLocalGitHubServiceMock: (options: LocalGitHubServiceOptions) => void
}

export const setupLocalRunMocks = async (): Promise<LocalRunMocks> => {
  await jest.unstable_mockModule('@actions/core', () => ({
    getInput: (name: string, options?: { required?: boolean }) => {
      const envKey = `INPUT_${name.replace(/ /g, '_').replace(/-/g, '_').toUpperCase()}`
      const value = process.env[envKey] ?? ''
      if (options?.required && value === '') {
        throw new Error(`Input required and not supplied: ${name}`)
      }
      return value.trim()
    },
    setOutput: (...args: unknown[]) => setOutputMock(...args),
    setFailed: jest.fn(),
    info: (...args: unknown[]) => infoMock(...args),
    debug: (...args: unknown[]) => debugMock(...args),
    summary: summaryMock
  }))

  const actualActionUtils = await import('../../../../../src/utils/action.utils.js')
  const mockCreateLocalGitHubServiceFn = jest.fn<CreateLocalGitHubServiceFn>()

  await jest.unstable_mockModule('../../../../../src/utils/action.utils.js', () => ({
    ...actualActionUtils,
    createLocalGitHubService: (...args: Parameters<typeof mockCreateLocalGitHubServiceFn>) =>
      mockCreateLocalGitHubServiceFn(...args)
  }))

  const { run } = await import('../../../../../src/local.js')

  const resetMocks = () => {
    setOutputMock.mockReset()
    infoMock.mockReset()
    debugMock.mockReset()
    summaryMock.clear.mockReset()
    summaryMock.addRaw.mockReset()
    summaryMock.write.mockReset()
    mockCreateLocalGitHubServiceFn.mockReset()

    summaryMock.clear.mockResolvedValue(summaryMock)
    summaryMock.addRaw.mockReturnValue(summaryMock)
    summaryMock.write.mockResolvedValue(summaryMock)
  }

  const configureLocalGitHubServiceMock = (options: LocalGitHubServiceOptions) => {
    mockCreateLocalGitHubServiceFn.mockImplementation((token) =>
      actualActionUtils.createLocalGitHubService(token, options)
    )
  }

  return {
    run,
    resetMocks,
    configureLocalGitHubServiceMock
  }
}
