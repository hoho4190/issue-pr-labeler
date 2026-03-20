import { jest } from '@jest/globals'
import { ZodError, z } from 'zod'
import { captureThrown } from '../../helpers/capture-thrown.helper.js'

const nullOrEmptyToUndefinedMock =
  jest.fn<(value: string | null | undefined) => string | undefined>()

jest.unstable_mockModule('../../../src/utils/string.utils.js', () => ({
  nullOrEmptyToUndefined: (value: string | null | undefined) => nullOrEmptyToUndefinedMock(value)
}))

type GitHubApiSchemaModule = typeof import('../../../src/types/github-api.schema.js')

let GitHubPageInfoDataSchema: GitHubApiSchemaModule['GitHubPageInfoDataSchema']
let GitHubPagedNodesSchema: GitHubApiSchemaModule['GitHubPagedNodesSchema']
let GitHubLabelsDataSchema: GitHubApiSchemaModule['GitHubLabelsDataSchema']
let GitHubIssueDataSchema: GitHubApiSchemaModule['GitHubIssueDataSchema']
let GitHubIssueResponseSchema: GitHubApiSchemaModule['GitHubIssueResponseSchema']
let GitHubPullRequestDataSchema: GitHubApiSchemaModule['GitHubPullRequestDataSchema']
let GitHubPullRequestResponseSchema: GitHubApiSchemaModule['GitHubPullRequestResponseSchema']
let GitHubContentResponseSchema: GitHubApiSchemaModule['GitHubContentResponseSchema']
let GitHubLabelsResponseSchema: GitHubApiSchemaModule['GitHubLabelsResponseSchema']
let GitHubPullRequestFilesResponseSchema: GitHubApiSchemaModule['GitHubPullRequestFilesResponseSchema']
let GitHubPullRequestCommitDataSchema: GitHubApiSchemaModule['GitHubPullRequestCommitDataSchema']
let GitHubPullRequestCommitsResponseSchema: GitHubApiSchemaModule['GitHubPullRequestCommitsResponseSchema']
let GitHubIssueOrPullRequestLabelsResponseSchema: GitHubApiSchemaModule['GitHubIssueOrPullRequestLabelsResponseSchema']

const createLabelsData = () => ({
  pageInfo: {
    hasNextPage: false,
    endCursor: null
  },
  nodes: [{ name: 'bug' }]
})

const expectZodError = (error: unknown): ZodError => {
  if (!(error instanceof ZodError)) {
    throw new Error('Expected ZodError to be thrown')
  }
  return error
}

describe('Unit | Types: github-api.schema', () => {
  beforeAll(async () => {
    const module = await import('../../../src/types/github-api.schema.js')
    GitHubPageInfoDataSchema = module.GitHubPageInfoDataSchema
    GitHubPagedNodesSchema = module.GitHubPagedNodesSchema
    GitHubLabelsDataSchema = module.GitHubLabelsDataSchema
    GitHubIssueDataSchema = module.GitHubIssueDataSchema
    GitHubIssueResponseSchema = module.GitHubIssueResponseSchema
    GitHubPullRequestDataSchema = module.GitHubPullRequestDataSchema
    GitHubPullRequestResponseSchema = module.GitHubPullRequestResponseSchema
    GitHubContentResponseSchema = module.GitHubContentResponseSchema
    GitHubLabelsResponseSchema = module.GitHubLabelsResponseSchema
    GitHubPullRequestFilesResponseSchema = module.GitHubPullRequestFilesResponseSchema
    GitHubPullRequestCommitDataSchema = module.GitHubPullRequestCommitDataSchema
    GitHubPullRequestCommitsResponseSchema = module.GitHubPullRequestCommitsResponseSchema
    GitHubIssueOrPullRequestLabelsResponseSchema =
      module.GitHubIssueOrPullRequestLabelsResponseSchema
  })

  beforeEach(() => {
    nullOrEmptyToUndefinedMock.mockReset()
    nullOrEmptyToUndefinedMock.mockImplementation((value) => {
      if (value == null || value === '') {
        return undefined
      }
      return value
    })
  })

  describe('GitHubPageInfoDataSchema', () => {
    // 페이지네이션 정보가 유효하면 그대로 파싱되는지 확인
    test('parses valid page info payload', () => {
      // given
      const input = { hasNextPage: true, endCursor: 'cursor-1' }

      // when
      const parsed = GitHubPageInfoDataSchema.parse(input)

      // then
      expect(parsed).toEqual(input)
    })

    // hasNextPage 타입이 잘못되면 검증 실패하는지 확인
    test('fails when hasNextPage type is invalid', () => {
      // given
      const input = { hasNextPage: 'yes', endCursor: null }

      // when
      const thrown = expectZodError(captureThrown(() => GitHubPageInfoDataSchema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('invalid_type')
      expect(thrown.issues[0]?.path).toEqual(['hasNextPage'])
    })
  })

  describe('GitHubPagedNodesSchema', () => {
    // 제네릭 노드 스키마를 받아 nodes 배열을 검증하는지 확인
    test('parses paged nodes with custom node schema', () => {
      // given
      const schema = GitHubPagedNodesSchema(z.object({ id: z.number() }))
      const input = {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [{ id: 1 }, { id: 2 }]
      }

      // when
      const parsed = schema.parse(input)

      // then
      expect(parsed).toEqual(input)
    })

    // 노드 필드 타입이 잘못되면 해당 경로에서 실패하는지 확인
    test('fails when node payload does not match custom node schema', () => {
      // given
      const schema = GitHubPagedNodesSchema(z.object({ id: z.number() }))
      const input = {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [{ id: 'bad' }]
      }

      // when
      const thrown = expectZodError(captureThrown(() => schema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('invalid_type')
      expect(thrown.issues[0]?.path).toEqual(['nodes', 0, 'id'])
    })
  })

  describe('GitHubLabelsDataSchema', () => {
    // labels 구조(pageInfo + nodes)를 올바르게 파싱하는지 확인
    test('parses labels data payload', () => {
      // given
      const input = createLabelsData()

      // when
      const parsed = GitHubLabelsDataSchema.parse(input)

      // then
      expect(parsed).toEqual(input)
    })
  })

  describe('GitHubIssueDataSchema', () => {
    // body가 누락되면 transform이 undefined로 호출되는지 확인
    test('applies body transform when issue body is omitted', () => {
      // given
      const input = {
        defaultBranchRef: { name: 'main' },
        issue: {
          author: { login: 'octocat' },
          title: 'Issue title',
          labels: createLabelsData()
        }
      }

      // when
      const parsed = GitHubIssueDataSchema.parse(input)

      // then
      expect(parsed.issue.body).toBeUndefined()
      expect(nullOrEmptyToUndefinedMock).toHaveBeenCalledWith(undefined)
    })

    // body 문자열이 주어지면 transform 결과를 반영하는지 확인
    test('applies body transform when issue body is provided', () => {
      // given
      const input = {
        defaultBranchRef: { name: 'main' },
        issue: {
          author: { login: 'octocat' },
          title: 'Issue title',
          body: '',
          labels: createLabelsData()
        }
      }

      // when
      const parsed = GitHubIssueDataSchema.parse(input)

      // then
      expect(parsed.issue.body).toBeUndefined()
      expect(nullOrEmptyToUndefinedMock).toHaveBeenCalledWith('')
    })
  })

  describe('GitHubIssueResponseSchema', () => {
    // repository 래퍼 구조를 포함한 issue 응답을 파싱하는지 확인
    test('parses issue response payload', () => {
      // given
      const input = {
        repository: {
          defaultBranchRef: { name: 'main' },
          issue: {
            author: { login: 'octocat' },
            title: 'Issue title',
            body: 'Body',
            labels: createLabelsData()
          }
        }
      }

      // when
      const parsed = GitHubIssueResponseSchema.parse(input)

      // then
      expect(parsed.repository.issue.title).toBe('Issue title')
      expect(nullOrEmptyToUndefinedMock).toHaveBeenCalledWith('Body')
    })
  })

  describe('GitHubPullRequestDataSchema', () => {
    // nullable body가 null일 때 transform이 호출되는지 확인
    test('applies body transform when pull request body is null', () => {
      // given
      const input = {
        defaultBranchRef: { name: 'main' },
        pullRequest: {
          author: { login: 'octocat' },
          title: 'PR title',
          body: null,
          baseRefName: 'main',
          headRefName: 'feature/test',
          isDraft: false,
          additions: 10,
          deletions: 3,
          labels: createLabelsData()
        }
      }

      // when
      const parsed = GitHubPullRequestDataSchema.parse(input)

      // then
      expect(parsed.pullRequest.body).toBeUndefined()
      expect(nullOrEmptyToUndefinedMock).toHaveBeenCalledWith(null)
    })

    // body가 누락된 경우 optional transform 경로를 타는지 확인
    test('applies body transform when pull request body is omitted', () => {
      // given
      const input = {
        defaultBranchRef: { name: 'main' },
        pullRequest: {
          author: { login: 'octocat' },
          title: 'PR title',
          baseRefName: 'main',
          headRefName: 'feature/test',
          isDraft: false,
          additions: 10,
          deletions: 3,
          labels: createLabelsData()
        }
      }

      // when
      const parsed = GitHubPullRequestDataSchema.parse(input)

      // then
      expect(parsed.pullRequest.body).toBeUndefined()
      expect(nullOrEmptyToUndefinedMock).toHaveBeenCalledWith(undefined)
    })
  })

  describe('GitHubPullRequestResponseSchema', () => {
    // repository 래퍼 구조를 포함한 PR 응답을 파싱하는지 확인
    test('parses pull request response payload', () => {
      // given
      const input = {
        repository: {
          defaultBranchRef: { name: 'main' },
          pullRequest: {
            author: { login: 'octocat' },
            title: 'PR title',
            body: 'PR body',
            baseRefName: 'main',
            headRefName: 'feature/test',
            isDraft: false,
            additions: 10,
            deletions: 3,
            labels: createLabelsData()
          }
        }
      }

      // when
      const parsed = GitHubPullRequestResponseSchema.parse(input)

      // then
      expect(parsed.repository.pullRequest.title).toBe('PR title')
      expect(nullOrEmptyToUndefinedMock).toHaveBeenCalledWith('PR body')
    })
  })

  describe('GitHubPullRequestCommitDataSchema', () => {
    // nullable body가 null일 때 transform이 호출되는지 확인
    test('applies messageBody transform when commit messageBody is null', () => {
      // given
      const input = {
        message: 'feat: add commit messages\n\nImplement support',
        messageHeadline: 'feat: add commit messages',
        messageBody: null
      }

      // when
      const parsed = GitHubPullRequestCommitDataSchema.parse(input)

      // then
      expect(parsed.messageBody).toBeUndefined()
      expect(nullOrEmptyToUndefinedMock).toHaveBeenCalledWith(null)
    })

    // body가 누락된 경우 optional transform 경로를 타는지 확인
    test('applies messageBody transform when commit messageBody is omitted', () => {
      // given
      const input = {
        message: 'feat: add commit messages',
        messageHeadline: 'feat: add commit messages'
      }

      // when
      const parsed = GitHubPullRequestCommitDataSchema.parse(input)

      // then
      expect(parsed.messageBody).toBeUndefined()
      expect(nullOrEmptyToUndefinedMock).toHaveBeenCalledWith(undefined)
    })

    // messageHeadline 타입이 잘못되면 해당 경로에서 검증 실패하는지 확인
    test('fails when commit messageHeadline type is invalid', () => {
      // given
      const input = {
        message: 'feat: add commit messages',
        messageHeadline: 123,
        messageBody: 'Implement support'
      }

      // when
      const thrown = expectZodError(
        captureThrown(() => GitHubPullRequestCommitDataSchema.parse(input))
      )

      // then
      expect(thrown.issues[0]?.code).toBe('invalid_type')
      expect(thrown.issues[0]?.path).toEqual(['messageHeadline'])
    })
  })

  describe('other response schemas', () => {
    // content 응답에서 text 필드를 파싱하는지 확인
    test('parses content response payload', () => {
      // given
      const input = {
        repository: {
          object: {
            text: 'settings:\n  dryRun: false'
          }
        }
      }

      // when
      const parsed = GitHubContentResponseSchema.parse(input)

      // then
      expect(parsed.repository.object.text).toBe('settings:\n  dryRun: false')
    })

    // labels 응답에서 labels 구조를 파싱하는지 확인
    test('parses labels response payload', () => {
      // given
      const input = {
        repository: {
          labels: createLabelsData()
        }
      }

      // when
      const parsed = GitHubLabelsResponseSchema.parse(input)

      // then
      expect(parsed.repository.labels.nodes[0]?.name).toBe('bug')
    })

    // PR files 응답에서 파일 경로 목록을 파싱하는지 확인
    test('parses pull request files response payload', () => {
      // given
      const input = {
        repository: {
          pullRequest: {
            files: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ path: 'src/main.ts' }]
            }
          }
        }
      }

      // when
      const parsed = GitHubPullRequestFilesResponseSchema.parse(input)

      // then
      expect(parsed.repository.pullRequest.files.nodes[0]?.path).toBe('src/main.ts')
    })

    // PR commits 응답에서 커밋 메시지 구조를 파싱하는지 확인
    test('parses pull request commits response payload', () => {
      // given
      const input = {
        repository: {
          pullRequest: {
            commits: {
              pageInfo: { hasNextPage: false, endCursor: null },
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
      }

      // when
      const parsed = GitHubPullRequestCommitsResponseSchema.parse(input)

      // then
      expect(parsed.repository.pullRequest.commits.nodes[0]?.commit.messageHeadline).toBe(
        'feat: add commit messages'
      )
      expect(nullOrEmptyToUndefinedMock).toHaveBeenCalledWith('Implement support')
    })

    // issue/pullRequest labels 응답에서 issue만 존재해도 파싱되는지 확인
    test('parses issue-or-pr labels response with issue only', () => {
      // given
      const input = {
        repository: {
          issue: {
            labels: createLabelsData()
          }
        }
      }

      // when
      const parsed = GitHubIssueOrPullRequestLabelsResponseSchema.parse(input)

      // then
      expect(parsed.repository.issue?.labels.nodes[0]?.name).toBe('bug')
      expect(parsed.repository.pullRequest).toBeUndefined()
    })

    // issue/pullRequest labels 응답에서 pullRequest만 존재해도 파싱되는지 확인
    test('parses issue-or-pr labels response with pull request only', () => {
      // given
      const input = {
        repository: {
          pullRequest: {
            labels: createLabelsData()
          }
        }
      }

      // when
      const parsed = GitHubIssueOrPullRequestLabelsResponseSchema.parse(input)

      // then
      expect(parsed.repository.pullRequest?.labels.nodes[0]?.name).toBe('bug')
      expect(parsed.repository.issue).toBeUndefined()
    })
  })
})
