import { jest } from '@jest/globals'
import type { OctokitClient } from '../../../src/services/github.service.interface.js'
import { EventType } from '../../../src/types/common.js'

const coreDebugMock = jest.fn<(message: string) => void>()
const parseWithContextMock =
  jest.fn<(schema: unknown, input: unknown, context: unknown) => unknown>()

class RequestErrorMock extends Error {
  public readonly status: number

  public constructor(message: string, status: number) {
    super(message)
    this.name = 'RequestError'
    this.status = status
  }
}

jest.unstable_mockModule('@actions/core', () => ({
  debug: (message: string) => coreDebugMock(message)
}))

jest.unstable_mockModule('@octokit/request-error', () => ({
  RequestError: RequestErrorMock
}))

jest.unstable_mockModule('../../../src/utils/zod.utils.js', () => ({
  parseWithContext: (schema: unknown, input: unknown, context: unknown) =>
    parseWithContextMock(schema, input, context)
}))

type GitHubServiceModule = typeof import('../../../src/services/github.service.js')

interface OctokitMock {
  graphql: jest.Mock<(query: string, variables: Record<string, unknown>) => Promise<unknown>>
  rest: {
    issues: {
      addLabels: jest.Mock<(params: unknown) => Promise<void>>
      removeLabel: jest.Mock<(params: unknown) => Promise<void>>
    }
  }
}

let GitHubService: GitHubServiceModule['GitHubService']

const createOctokitMock = (): OctokitMock => ({
  graphql: jest.fn(async () => undefined),
  rest: {
    issues: {
      addLabels: jest.fn(async () => undefined),
      removeLabel: jest.fn(async () => undefined)
    }
  }
})

const createService = (
  octokit = createOctokitMock()
): {
  service: InstanceType<GitHubServiceModule['GitHubService']>
  octokit: OctokitMock
} => ({
  service: new GitHubService(octokit as unknown as OctokitClient),
  octokit
})

const expectGitHubApiError = (error: unknown): Error & { status?: number; cause?: unknown } => {
  if (!(error instanceof Error)) {
    throw new Error('Expected Error to be thrown')
  }
  return error as Error & { status?: number; cause?: unknown }
}

describe('Unit | Services: github.service', () => {
  beforeAll(async () => {
    const module = await import('../../../src/services/github.service.js')
    GitHubService = module.GitHubService
  })

  beforeEach(() => {
    coreDebugMock.mockReset()
    parseWithContextMock.mockReset()

    parseWithContextMock.mockImplementation((_schema, input) => input)
  })

  describe('getIssue()', () => {
    // 이슈 조회 시 GraphQL 요청/스키마 파싱/디버그 로깅이 연결되는지 확인
    test('returns parsed issue repository payload', async () => {
      // given
      const { service, octokit } = createService()
      const response = {
        repository: {
          defaultBranchRef: { name: 'main' },
          issue: {
            author: { login: 'octocat' },
            title: 'Issue title',
            body: 'Issue body',
            labels: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ name: 'bug' }]
            }
          }
        }
      }
      octokit.graphql.mockResolvedValue(response)

      // when
      const result = await service.getIssue('octo-org', 'octo-repo', 7)

      // then
      expect(result).toEqual(response.repository)
      expect(octokit.graphql).toHaveBeenCalledTimes(1)
      const [query, variables] = octokit.graphql.mock.calls[0]!
      expect(query).toContain('issue(number: $eventNumber)')
      expect(variables).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        eventNumber: 7
      })
      expect(parseWithContextMock).toHaveBeenCalledWith(expect.anything(), response, {
        message: 'Retrieving issue details'
      })
      expect(coreDebugMock).toHaveBeenNthCalledWith(
        1,
        '[GitHubService:getIssue] calling GitHub API...'
      )
      expect(coreDebugMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('[GitHubService:getIssue] success, result=')
      )
    })
  })

  describe('getPullRequest()', () => {
    // PR 조회 시 GraphQL 변수와 파싱 결과를 반환하는지 확인
    test('returns parsed pull request repository payload', async () => {
      // given
      const { service, octokit } = createService()
      const response = {
        repository: {
          defaultBranchRef: { name: 'main' },
          pullRequest: {
            author: { login: 'octocat' },
            title: 'PR title',
            body: 'PR body',
            baseRefName: 'main',
            headRefName: 'feature/branch',
            isDraft: false,
            additions: 12,
            deletions: 4,
            labels: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ name: 'enhancement' }]
            }
          }
        }
      }
      octokit.graphql.mockResolvedValue(response)

      // when
      const result = await service.getPullRequest('octo-org', 'octo-repo', 9)

      // then
      expect(result).toEqual(response.repository)
      expect(octokit.graphql).toHaveBeenCalledTimes(1)
      const [query, variables] = octokit.graphql.mock.calls[0]!
      expect(query).toContain('pullRequest(number: $eventNumber)')
      expect(variables).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        eventNumber: 9
      })
      expect(parseWithContextMock).toHaveBeenCalledWith(expect.anything(), response, {
        message: 'Retrieving pull request details'
      })
    })
  })

  describe('getContent()', () => {
    // ref:path 표현식으로 파일 내용을 조회하는지 확인
    test('returns blob text from repository object query', async () => {
      // given
      const { service, octokit } = createService()
      const response = {
        repository: {
          object: {
            text: 'settings:\n  dryRun: false'
          }
        }
      }
      octokit.graphql.mockResolvedValue(response)

      // when
      const content = await service.getContent(
        'octo-org',
        'octo-repo',
        'main',
        '.github/labeler-config.yml'
      )

      // then
      expect(content).toBe('settings:\n  dryRun: false')
      const [query, variables] = octokit.graphql.mock.calls[0]!
      expect(query).toContain('object(expression: $expression)')
      expect(variables).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        expression: 'main:.github/labeler-config.yml'
      })
      expect(parseWithContextMock).toHaveBeenCalledWith(expect.anything(), response, {
        message: 'Retrieving repository file content'
      })
    })
  })

  describe('listRepositoryLabels()', () => {
    // 레포 레이블 목록을 페이지네이션으로 병합하는지 확인
    test('returns labels merged across paged responses', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql
        .mockResolvedValueOnce({
          repository: {
            labels: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
              nodes: [{ name: 'bug' }]
            }
          }
        })
        .mockResolvedValueOnce({
          repository: {
            labels: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ name: 'docs' }, { name: 'needs-review' }]
            }
          }
        })

      // when
      const labels = await service.listRepositoryLabels('octo-org', 'octo-repo')

      // then
      expect(labels).toEqual(['bug', 'docs', 'needs-review'])
      expect(octokit.graphql).toHaveBeenCalledTimes(2)
      expect(octokit.graphql.mock.calls[0]![1]).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        after: null
      })
      expect(octokit.graphql.mock.calls[1]![1]).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        after: 'cursor-1'
      })
      expect(parseWithContextMock).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.anything(),
        { message: 'Retrieving repository labels' }
      )
    })

    // 페이지네이션 응답이 끝나지 않으면 최대 페이지 보호 로직이 동작하는지 확인
    test('throws wrapped error when pagination exceeds max page limit', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql.mockResolvedValue({
        repository: {
          labels: {
            pageInfo: { hasNextPage: true, endCursor: 'cursor-loop' },
            nodes: []
          }
        }
      })

      // when
      const act = service.listRepositoryLabels('octo-org', 'octo-repo')

      // then
      await expect(act).rejects.toThrow(
        '[GitHubService:listRepositoryLabels] Too many pages (> 50), possible infinite loop'
      )
      expect(octokit.graphql).toHaveBeenCalledTimes(50)
    })
  })

  describe('listPullRequestFiles()', () => {
    // PR 변경 파일 목록을 페이지 단위로 누적하는지 확인
    test('returns file paths from all pages', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql
        .mockResolvedValueOnce({
          repository: {
            pullRequest: {
              files: {
                pageInfo: { hasNextPage: true, endCursor: 'cursor-2' },
                nodes: [{ path: 'src/a.ts' }]
              }
            }
          }
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequest: {
              files: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [{ path: 'src/b.ts' }, { path: 'README.md' }]
              }
            }
          }
        })

      // when
      const files = await service.listPullRequestFiles('octo-org', 'octo-repo', 101)

      // then
      expect(files).toEqual(['src/a.ts', 'src/b.ts', 'README.md'])
      expect(octokit.graphql).toHaveBeenCalledTimes(2)
      expect(octokit.graphql.mock.calls[0]![1]).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        eventNumber: 101,
        after: null
      })
      expect(octokit.graphql.mock.calls[1]![1]).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        eventNumber: 101,
        after: 'cursor-2'
      })
      expect(parseWithContextMock).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.anything(),
        { message: 'Retrieving pull request files' }
      )
    })

    // 파일 목록 페이지네이션이 무한히 이어지면 보호 로직으로 실패하는지 확인
    test('throws wrapped error when file pagination exceeds max page limit', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql.mockResolvedValue({
        repository: {
          pullRequest: {
            files: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor-loop' },
              nodes: []
            }
          }
        }
      })

      // when
      const act = service.listPullRequestFiles('octo-org', 'octo-repo', 11)

      // then
      await expect(act).rejects.toThrow(
        '[GitHubService:listPullRequestFiles] Too many pages (> 50), possible infinite loop'
      )
      expect(octokit.graphql).toHaveBeenCalledTimes(50)
    })
  })

  describe('listPullRequestCommits()', () => {
    // PR 커밋 목록을 페이지 단위로 누적하고 commit 객체를 그대로 반환하는지 확인
    test('returns commits from all pages', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql
        .mockResolvedValueOnce({
          repository: {
            pullRequest: {
              commits: {
                pageInfo: { hasNextPage: true, endCursor: 'cursor-3' },
                nodes: [
                  {
                    commit: {
                      message: 'feat: add commit messages\n\nImplement support',
                      messageHeadline: 'feat: add commit messages',
                      messageBody: 'Implement support'
                    }
                  }
                ]
              }
            }
          }
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequest: {
              commits: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    commit: {
                      message: 'test: add commit fixtures',
                      messageHeadline: 'test: add commit fixtures',
                      messageBody: undefined
                    }
                  }
                ]
              }
            }
          }
        })

      // when
      const commits = await service.listPullRequestCommits('octo-org', 'octo-repo', 102)

      // then
      expect(commits).toEqual([
        {
          message: 'feat: add commit messages\n\nImplement support',
          messageHeadline: 'feat: add commit messages',
          messageBody: 'Implement support'
        },
        {
          message: 'test: add commit fixtures',
          messageHeadline: 'test: add commit fixtures',
          messageBody: undefined
        }
      ])
      expect(octokit.graphql).toHaveBeenCalledTimes(2)
      expect(octokit.graphql.mock.calls[0]![1]).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        eventNumber: 102,
        after: null
      })
      expect(octokit.graphql.mock.calls[1]![1]).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        eventNumber: 102,
        after: 'cursor-3'
      })
      expect(parseWithContextMock).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.anything(),
        { message: 'Retrieving pull request commits' }
      )
    })

    // 커밋 페이지네이션이 무한히 이어지면 보호 로직으로 실패하는지 확인
    test('throws wrapped error when commit pagination exceeds max page limit', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql.mockResolvedValue({
        repository: {
          pullRequest: {
            commits: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor-loop' },
              nodes: []
            }
          }
        }
      })

      // when
      const act = service.listPullRequestCommits('octo-org', 'octo-repo', 12)

      // then
      await expect(act).rejects.toThrow(
        '[GitHubService:listPullRequestCommits] Too many pages (> 50), possible infinite loop'
      )
      expect(octokit.graphql).toHaveBeenCalledTimes(50)
    })
  })

  describe('listLabelsForIssueOrPr()', () => {
    // 이슈 레이블 조회 시 시작 커서를 반영하고 다음 페이지 레이블을 병합하는지 확인
    test('returns merged labels for issue with explicit start cursor', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql
        .mockResolvedValueOnce({
          repository: {
            issue: {
              labels: {
                pageInfo: { hasNextPage: true, endCursor: 'next-cursor' },
                nodes: [{ name: 'triage' }]
              }
            }
          }
        })
        .mockResolvedValueOnce({
          repository: {
            issue: {
              labels: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [{ name: 'backend' }]
              }
            }
          }
        })

      // when
      const labels = await service.listLabelsForIssueOrPr(
        'octo-org',
        'octo-repo',
        5,
        EventType.Issue,
        'cursor-start'
      )

      // then
      expect(labels).toEqual(['triage', 'backend'])
      expect(octokit.graphql).toHaveBeenCalledTimes(2)
      const [issueQuery, issueVariables] = octokit.graphql.mock.calls[0]!
      expect(issueQuery).toContain('issue(number: $eventNumber)')
      expect(issueVariables).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        eventNumber: 5,
        after: 'cursor-start'
      })
    })

    // PR 이벤트에서 기본 시작 커서를 null로 두고 pullRequest 필드를 조회하는지 확인
    test('uses pullRequest field and null cursor when afterCursor is omitted', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql.mockResolvedValue({
        repository: {
          pullRequest: {
            labels: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ name: 'frontend' }]
            }
          }
        }
      })

      // when
      const labels = await service.listLabelsForIssueOrPr(
        'octo-org',
        'octo-repo',
        6,
        EventType.PullRequest
      )

      // then
      expect(labels).toEqual(['frontend'])
      expect(octokit.graphql).toHaveBeenCalledTimes(1)
      const [prQuery, prVariables] = octokit.graphql.mock.calls[0]!
      expect(prQuery).toContain('pullRequest(number: $eventNumber)')
      expect(prVariables).toEqual({
        owner: 'octo-org',
        repo: 'octo-repo',
        eventNumber: 6,
        after: null
      })
      expect(parseWithContextMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        message: 'Retrieving labels for issue or pull request'
      })
    })

    // 레이블 페이지네이션이 끝나지 않을 때 최대 페이지 제한으로 실패하는지 확인
    test('throws wrapped error when label pagination exceeds max page limit', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql.mockResolvedValue({
        repository: {
          pullRequest: {
            labels: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor-loop' },
              nodes: []
            }
          }
        }
      })

      // when
      const act = service.listLabelsForIssueOrPr('octo-org', 'octo-repo', 17, EventType.PullRequest)

      // then
      await expect(act).rejects.toThrow(
        '[GitHubService:listLabelsForIssueOrPr] Too many pages (> 50), possible infinite loop'
      )
      expect(octokit.graphql).toHaveBeenCalledTimes(50)
    })
  })

  describe('addLabels()', () => {
    // 추가할 레이블이 없으면 REST 호출 없이 종료하는지 확인
    test('skips REST call when label list is empty', async () => {
      // given
      const { service, octokit } = createService()

      // when
      await service.addLabels('octo-org', 'octo-repo', 33, [])

      // then
      expect(octokit.rest.issues.addLabels).not.toHaveBeenCalled()
    })

    // 레이블이 있으면 REST addLabels 파라미터를 정확히 전달하는지 확인
    test('calls REST addLabels when labels are provided', async () => {
      // given
      const { service, octokit } = createService()

      // when
      await service.addLabels('octo-org', 'octo-repo', 33, ['bug', 'urgent'])

      // then
      expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: 'octo-org',
        repo: 'octo-repo',
        issue_number: 33,
        labels: ['bug', 'urgent']
      })
    })
  })

  describe('removeLabel()', () => {
    // 레이블 제거 시 REST removeLabel 호출 파라미터가 올바른지 확인
    test('calls REST removeLabel with issue number and label name', async () => {
      // given
      const { service, octokit } = createService()

      // when
      await service.removeLabel('octo-org', 'octo-repo', 44, 'stale')

      // then
      expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'octo-org',
        repo: 'octo-repo',
        issue_number: 44,
        name: 'stale'
      })
    })
  })

  describe('callGitHubAPI() error handling via public methods', () => {
    // RequestError는 status/cause를 포함한 GitHubApiError로 변환되는지 확인
    test('wraps RequestError with status and cause', async () => {
      // given
      const { service, octokit } = createService()
      const requestError = new RequestErrorMock('forbidden', 403)
      octokit.graphql.mockRejectedValue(requestError)

      // when
      let thrown: unknown
      try {
        await service.getIssue('octo-org', 'octo-repo', 1)
      } catch (error) {
        thrown = error
      }

      // then
      const apiError = expectGitHubApiError(thrown)
      expect(apiError.name).toBe('GitHubApiError')
      expect(apiError.message).toBe(
        '[GitHubService:getIssue] GitHub API request failed: 403 forbidden'
      )
      expect(apiError.status).toBe(403)
      expect(apiError.cause).toBe(requestError)
    })

    // 일반 Error는 상태코드 없이 cause를 보존해 래핑하는지 확인
    test('wraps generic Error preserving cause', async () => {
      // given
      const { service, octokit } = createService()
      const originalError = new Error('schema parse failed')
      octokit.graphql.mockRejectedValue(originalError)

      // when
      let thrown: unknown
      try {
        await service.getPullRequest('octo-org', 'octo-repo', 2)
      } catch (error) {
        thrown = error
      }

      // then
      const apiError = expectGitHubApiError(thrown)
      expect(apiError.name).toBe('GitHubApiError')
      expect(apiError.message).toBe('[GitHubService:getPullRequest] schema parse failed')
      expect(apiError.status).toBeUndefined()
      expect(apiError.cause).toBe(originalError)
    })

    // 비-Error throw 값은 문자열화된 메시지로 래핑하고 cause를 두지 않는지 확인
    test('wraps unknown non-error throw without cause', async () => {
      // given
      const { service, octokit } = createService()
      octokit.graphql.mockRejectedValue(12345)

      // when
      let thrown: unknown
      try {
        await service.getContent('octo-org', 'octo-repo', 'main', 'README.md')
      } catch (error) {
        thrown = error
      }

      // then
      const apiError = expectGitHubApiError(thrown)
      expect(apiError.name).toBe('GitHubApiError')
      expect(apiError.message).toBe('[GitHubService:getContent] Unknown non-error thrown: 12345')
      expect(apiError.status).toBeUndefined()
      expect(Object.prototype.hasOwnProperty.call(apiError, 'cause')).toBe(false)
    })
  })
})
