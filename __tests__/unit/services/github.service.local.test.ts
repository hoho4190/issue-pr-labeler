import { jest } from '@jest/globals'
import type { IGitHubService } from '../../../src/services/github.service.interface.js'
import { EventType } from '../../../src/types/common.js'

const readFileSyncMock = jest.fn<(path: string, encoding: BufferEncoding) => string>()
const issueDataSchemaParseMock = jest.fn<(input: unknown) => unknown>()
const pullRequestDataSchemaParseMock = jest.fn<(input: unknown) => unknown>()
const pullRequestCommitsDataSchemaParseMock = jest.fn<(input: unknown) => unknown>()

jest.unstable_mockModule('fs', () => ({
  default: {
    readFileSync: (path: string, encoding: BufferEncoding) => readFileSyncMock(path, encoding)
  },
  readFileSync: (path: string, encoding: BufferEncoding) => readFileSyncMock(path, encoding)
}))

jest.unstable_mockModule('../../../src/types/github-api.schema.js', () => ({
  GitHubIssueDataSchema: {
    parse: (input: unknown) => issueDataSchemaParseMock(input)
  },
  GitHubPullRequestDataSchema: {
    parse: (input: unknown) => pullRequestDataSchemaParseMock(input)
  },
  GitHubPullRequestCommitsDataSchema: {
    parse: (input: unknown) => pullRequestCommitsDataSchemaParseMock(input)
  }
}))

type GitHubServiceLocalModule = typeof import('../../../src/services/github.service.local.js')

let LocalGitHubService: GitHubServiceLocalModule['LocalGitHubService']

const createRealGitHubServiceMock = (): jest.Mocked<IGitHubService> =>
  ({
    getIssue: jest.fn(),
    getPullRequest: jest.fn(),
    getContent: jest.fn(),
    listRepositoryLabels: jest.fn(),
    listPullRequestFiles: jest.fn(),
    listPullRequestCommits: jest.fn(),
    listLabelsForIssueOrPr: jest.fn(),
    addLabels: jest.fn(),
    removeLabel: jest.fn()
  }) as jest.Mocked<IGitHubService>

const createService = ({
  useRealService = {},
  fixtureFiles = {}
}: {
  useRealService?: Partial<Record<keyof IGitHubService, boolean>>
  fixtureFiles?: Partial<Record<keyof IGitHubService, string>>
} = {}): {
  service: InstanceType<GitHubServiceLocalModule['LocalGitHubService']>
  realGitHubService: jest.Mocked<IGitHubService>
} => {
  const realGitHubService = createRealGitHubServiceMock()
  const service = new LocalGitHubService(realGitHubService, {
    basePath: '/tmp/fixtures',
    useRealService,
    fixtureFiles
  })
  return { service, realGitHubService }
}

describe('Unit | Services: github.service.local', () => {
  beforeAll(async () => {
    const module = await import('../../../src/services/github.service.local.js')
    LocalGitHubService = module.LocalGitHubService
  })

  beforeEach(() => {
    readFileSyncMock.mockReset()
    issueDataSchemaParseMock.mockReset()
    pullRequestDataSchemaParseMock.mockReset()
    pullRequestCommitsDataSchemaParseMock.mockReset()

    readFileSyncMock.mockReturnValue('{}')
    issueDataSchemaParseMock.mockImplementation((input) => input)
    pullRequestDataSchemaParseMock.mockImplementation((input) => input)
    pullRequestCommitsDataSchemaParseMock.mockImplementation((input) => input)
  })

  describe('getIssue()', () => {
    // 실제 서비스 사용 옵션이면 fixture를 읽지 않고 realService로 위임하는지 확인
    test('delegates to real service when useRealService.getIssue is true', async () => {
      // given
      const { service, realGitHubService } = createService({
        useRealService: { getIssue: true }
      })
      const expected = { issue: { title: 'real issue' } }
      realGitHubService.getIssue.mockResolvedValue(expected as never)

      // when
      const result = await service.getIssue('octo-org', 'octo-repo', 10)

      // then
      expect(result).toBe(expected)
      expect(realGitHubService.getIssue).toHaveBeenCalledWith('octo-org', 'octo-repo', 10)
      expect(readFileSyncMock).not.toHaveBeenCalled()
      expect(issueDataSchemaParseMock).not.toHaveBeenCalled()
    })

    // fixture 모드이면 기본 파일 경로를 읽고 Issue 스키마 parse를 수행하는지 확인
    test('reads default issue fixture and parses json when useRealService is false', async () => {
      // given
      const { service, realGitHubService } = createService()
      const fixtureJson = {
        defaultBranchRef: { name: 'main' },
        issue: {
          author: { login: 'octocat' },
          title: 'fixture issue',
          body: 'fixture body',
          labels: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ name: 'bug' }]
          }
        }
      }
      readFileSyncMock.mockReturnValue(JSON.stringify(fixtureJson))
      issueDataSchemaParseMock.mockReturnValue(fixtureJson)

      // when
      const result = await service.getIssue('octo-org', 'octo-repo', 20)

      // then
      expect(result).toEqual(fixtureJson)
      expect(realGitHubService.getIssue).not.toHaveBeenCalled()
      expect(readFileSyncMock).toHaveBeenCalledWith('/tmp/fixtures/getIssue.json', 'utf-8')
      expect(issueDataSchemaParseMock).toHaveBeenCalledWith(fixtureJson)
    })
  })

  describe('getPullRequest()', () => {
    // 실제 서비스 사용 옵션이면 PR 조회를 realService에 위임하는지 확인
    test('delegates to real service when useRealService.getPullRequest is true', async () => {
      // given
      const { service, realGitHubService } = createService({
        useRealService: { getPullRequest: true }
      })
      const expected = { pullRequest: { title: 'real pr' } }
      realGitHubService.getPullRequest.mockResolvedValue(expected as never)

      // when
      const result = await service.getPullRequest('octo-org', 'octo-repo', 30)

      // then
      expect(result).toBe(expected)
      expect(realGitHubService.getPullRequest).toHaveBeenCalledWith('octo-org', 'octo-repo', 30)
      expect(readFileSyncMock).not.toHaveBeenCalled()
      expect(pullRequestDataSchemaParseMock).not.toHaveBeenCalled()
    })

    // fixture 파일명을 커스텀했을 때 해당 경로를 읽어 PR 스키마 parse를 수행하는지 확인
    test('uses custom pull request fixture filename when provided', async () => {
      // given
      const { service } = createService({
        fixtureFiles: { getPullRequest: 'custom-pr.json' }
      })
      const fixtureJson = {
        defaultBranchRef: { name: 'main' },
        pullRequest: {
          author: { login: 'octocat' },
          title: 'fixture pr',
          body: 'fixture pr body',
          baseRefName: 'main',
          headRefName: 'feature/x',
          isDraft: false,
          additions: 5,
          deletions: 1,
          labels: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ name: 'feature' }]
          }
        }
      }
      readFileSyncMock.mockReturnValue(JSON.stringify(fixtureJson))
      pullRequestDataSchemaParseMock.mockReturnValue(fixtureJson)

      // when
      const result = await service.getPullRequest('octo-org', 'octo-repo', 40)

      // then
      expect(result).toEqual(fixtureJson)
      expect(readFileSyncMock).toHaveBeenCalledWith('/tmp/fixtures/custom-pr.json', 'utf-8')
      expect(pullRequestDataSchemaParseMock).toHaveBeenCalledWith(fixtureJson)
    })
  })

  describe('getContent()', () => {
    // 실제 서비스 사용 옵션이면 파일 내용을 realService에서 가져오는지 확인
    test('delegates to real service when useRealService.getContent is true', async () => {
      // given
      const { service, realGitHubService } = createService({
        useRealService: { getContent: true }
      })
      realGitHubService.getContent.mockResolvedValue('real-content')

      // when
      const result = await service.getContent(
        'octo-org',
        'octo-repo',
        'main',
        '.github/labeler-config.yml'
      )

      // then
      expect(result).toBe('real-content')
      expect(realGitHubService.getContent).toHaveBeenCalledWith(
        'octo-org',
        'octo-repo',
        'main',
        '.github/labeler-config.yml'
      )
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    // fixture 모드이면 기본 getContent.yml 파일 내용을 그대로 반환하는지 확인
    test('reads default content fixture when useRealService is false', async () => {
      // given
      const { service } = createService()
      readFileSyncMock.mockReturnValue('settings:\n  dryRun: true')

      // when
      const result = await service.getContent('octo-org', 'octo-repo', 'main', 'config.yml')

      // then
      expect(result).toBe('settings:\n  dryRun: true')
      expect(readFileSyncMock).toHaveBeenCalledWith('/tmp/fixtures/getContent.yml', 'utf-8')
    })
  })

  describe('listRepositoryLabels()', () => {
    // 실제 서비스 사용 옵션이면 레포 레이블 조회를 realService로 위임하는지 확인
    test('delegates to real service when useRealService.listRepositoryLabels is true', async () => {
      // given
      const { service, realGitHubService } = createService({
        useRealService: { listRepositoryLabels: true }
      })
      realGitHubService.listRepositoryLabels.mockResolvedValue(['bug', 'docs'])

      // when
      const result = await service.listRepositoryLabels('octo-org', 'octo-repo')

      // then
      expect(result).toEqual(['bug', 'docs'])
      expect(realGitHubService.listRepositoryLabels).toHaveBeenCalledWith('octo-org', 'octo-repo')
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    // fixture 모드이면 JSON 레이블 목록을 파싱해서 반환하는지 확인
    test('parses repository labels from fixture json', async () => {
      // given
      const { service } = createService()
      readFileSyncMock.mockReturnValue(JSON.stringify(['frontend', 'backend']))

      // when
      const result = await service.listRepositoryLabels('octo-org', 'octo-repo')

      // then
      expect(result).toEqual(['frontend', 'backend'])
      expect(readFileSyncMock).toHaveBeenCalledWith(
        '/tmp/fixtures/listRepositoryLabels.json',
        'utf-8'
      )
    })
  })

  describe('listPullRequestFiles()', () => {
    // 실제 서비스 사용 옵션이면 PR 파일 목록 조회를 realService에 위임하는지 확인
    test('delegates to real service when useRealService.listPullRequestFiles is true', async () => {
      // given
      const { service, realGitHubService } = createService({
        useRealService: { listPullRequestFiles: true }
      })
      realGitHubService.listPullRequestFiles.mockResolvedValue(['src/a.ts', 'src/b.ts'])

      // when
      const result = await service.listPullRequestFiles('octo-org', 'octo-repo', 50)

      // then
      expect(result).toEqual(['src/a.ts', 'src/b.ts'])
      expect(realGitHubService.listPullRequestFiles).toHaveBeenCalledWith(
        'octo-org',
        'octo-repo',
        50
      )
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    // fixture 모드이면 PR 파일 목록 JSON을 파싱해 반환하는지 확인
    test('parses pull request files from fixture json', async () => {
      // given
      const { service } = createService()
      readFileSyncMock.mockReturnValue(JSON.stringify(['README.md', 'src/main.ts']))

      // when
      const result = await service.listPullRequestFiles('octo-org', 'octo-repo', 60)

      // then
      expect(result).toEqual(['README.md', 'src/main.ts'])
      expect(readFileSyncMock).toHaveBeenCalledWith(
        '/tmp/fixtures/listPullRequestFiles.json',
        'utf-8'
      )
    })
  })

  describe('listPullRequestCommits()', () => {
    // 실제 서비스 사용 옵션이면 PR 커밋 목록 조회를 realService에 위임하는지 확인
    test('delegates to real service when useRealService.listPullRequestCommits is true', async () => {
      // given
      const { service, realGitHubService } = createService({
        useRealService: { listPullRequestCommits: true }
      })
      realGitHubService.listPullRequestCommits.mockResolvedValue([
        {
          message: 'feat: add commit messages\n\nImplement support',
          messageHeadline: 'feat: add commit messages',
          messageBody: 'Implement support'
        }
      ])

      // when
      const result = await service.listPullRequestCommits('octo-org', 'octo-repo', 65)

      // then
      expect(result).toEqual([
        {
          message: 'feat: add commit messages\n\nImplement support',
          messageHeadline: 'feat: add commit messages',
          messageBody: 'Implement support'
        }
      ])
      expect(realGitHubService.listPullRequestCommits).toHaveBeenCalledWith(
        'octo-org',
        'octo-repo',
        65
      )
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    // fixture 모드이면 PR 커밋 목록 fixture JSON을 파싱해 반환하는지 확인
    test('parses pull request commits from fixture json', async () => {
      // given
      const { service } = createService()
      const fixtureJson = [
        {
          message: 'test: add local fixtures for pull request commits',
          messageHeadline: 'test: add local fixtures for pull request commits',
          messageBody: ''
        }
      ]
      const parsedCommits = [
        {
          message: 'test: add local fixtures for pull request commits',
          messageHeadline: 'test: add local fixtures for pull request commits',
          messageBody: undefined
        }
      ]
      readFileSyncMock.mockReturnValue(JSON.stringify(fixtureJson))
      pullRequestCommitsDataSchemaParseMock.mockReturnValue(parsedCommits)

      // when
      const result = await service.listPullRequestCommits('octo-org', 'octo-repo', 66)

      // then
      expect(result).toEqual(parsedCommits)
      expect(readFileSyncMock).toHaveBeenCalledWith(
        '/tmp/fixtures/listPullRequestCommits.json',
        'utf-8'
      )
      expect(pullRequestCommitsDataSchemaParseMock).toHaveBeenCalledWith(fixtureJson)
    })
  })

  describe('listLabelsForIssueOrPr()', () => {
    // 실제 서비스 사용 옵션이면 eventType/afterCursor 포함 인자를 그대로 위임하는지 확인
    test('delegates to real service with eventType and afterCursor', async () => {
      // given
      const { service, realGitHubService } = createService({
        useRealService: { listLabelsForIssueOrPr: true }
      })
      realGitHubService.listLabelsForIssueOrPr.mockResolvedValue(['triage'])

      // when
      const result = await service.listLabelsForIssueOrPr(
        'octo-org',
        'octo-repo',
        70,
        EventType.Issue,
        'cursor-1'
      )

      // then
      expect(result).toEqual(['triage'])
      expect(realGitHubService.listLabelsForIssueOrPr).toHaveBeenCalledWith(
        'octo-org',
        'octo-repo',
        70,
        EventType.Issue,
        'cursor-1'
      )
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    // fixture 모드이면 레이블 목록 fixture JSON을 파싱해 반환하는지 확인
    test('parses labels for issue or pull request from fixture json', async () => {
      // given
      const { service } = createService()
      readFileSyncMock.mockReturnValue(JSON.stringify(['bug', 'help wanted']))

      // when
      const result = await service.listLabelsForIssueOrPr(
        'octo-org',
        'octo-repo',
        80,
        EventType.PullRequest
      )

      // then
      expect(result).toEqual(['bug', 'help wanted'])
      expect(readFileSyncMock).toHaveBeenCalledWith(
        '/tmp/fixtures/listLabelsForIssueOrPr.json',
        'utf-8'
      )
    })
  })

  describe('addLabels()', () => {
    // useRealService가 true면 addLabels를 realService에 위임하는지 확인
    test('delegates to real service when useRealService.addLabels is true', async () => {
      // given
      const { service, realGitHubService } = createService({
        useRealService: { addLabels: true }
      })

      // when
      await service.addLabels('octo-org', 'octo-repo', 90, ['bug', 'urgent'])

      // then
      expect(realGitHubService.addLabels).toHaveBeenCalledWith('octo-org', 'octo-repo', 90, [
        'bug',
        'urgent'
      ])
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    // useRealService가 false면 아무 동작 없이 종료하는지 확인
    test('does nothing when useRealService.addLabels is false', async () => {
      // given
      const { service, realGitHubService } = createService()

      // when
      await service.addLabels('octo-org', 'octo-repo', 91, ['bug'])

      // then
      expect(realGitHubService.addLabels).not.toHaveBeenCalled()
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })
  })

  describe('removeLabel()', () => {
    // useRealService가 true면 removeLabel 호출을 realService에 위임하는지 확인
    test('delegates to real service when useRealService.removeLabel is true', async () => {
      // given
      const { service, realGitHubService } = createService({
        useRealService: { removeLabel: true }
      })

      // when
      await service.removeLabel('octo-org', 'octo-repo', 100, 'stale')

      // then
      expect(realGitHubService.removeLabel).toHaveBeenCalledWith(
        'octo-org',
        'octo-repo',
        100,
        'stale'
      )
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    // useRealService가 false면 removeLabel을 호출하지 않고 종료하는지 확인
    test('does nothing when useRealService.removeLabel is false', async () => {
      // given
      const { service, realGitHubService } = createService()

      // when
      await service.removeLabel('octo-org', 'octo-repo', 101, 'wontfix')

      // then
      expect(realGitHubService.removeLabel).not.toHaveBeenCalled()
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })
  })
})
