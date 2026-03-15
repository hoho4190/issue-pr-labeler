import { jest } from '@jest/globals'
import type { IGitHubService } from '../../../src/services/github.service.interface.js'
import { ActorType, EventType } from '../../../src/types/common.js'
import type { GitHubContext } from '../../../src/types/github-context.js'
import type {
  GitHubIssueData,
  GitHubLabelsData,
  GitHubPullRequestData
} from '../../../src/types/github-api.schema.js'

const getEnumValueByValueMock =
  jest.fn<(enumObj: Record<string, string | number>, value: string | number) => string | number>()

jest.unstable_mockModule('../../../src/utils/enum.utils.js', () => ({
  getEnumValueByValue: (enumObj: Record<string, string | number>, value: string | number) =>
    getEnumValueByValueMock(enumObj, value)
}))

type ContextServiceModule = typeof import('../../../src/services/context.service.js')

let ContextService: ContextServiceModule['ContextService']

const createGitHubServiceMock = (): jest.Mocked<IGitHubService> =>
  ({
    getIssue: jest.fn(),
    getPullRequest: jest.fn(),
    getContent: jest.fn(),
    listRepositoryLabels: jest.fn(),
    listPullRequestFiles: jest.fn(),
    listLabelsForIssueOrPr: jest.fn(),
    addLabels: jest.fn(),
    removeLabel: jest.fn()
  }) as jest.Mocked<IGitHubService>

const createLabelsData = (
  names: string[],
  hasNextPage = false,
  endCursor: string | null = null
): GitHubLabelsData => ({
  pageInfo: {
    hasNextPage,
    endCursor
  },
  nodes: names.map((name) => ({ name }))
})

const createIssueData = (labels: GitHubLabelsData): GitHubIssueData => ({
  defaultBranchRef: { name: 'main' },
  issue: {
    author: { login: 'issue-author' },
    title: 'Issue title',
    body: 'Issue body',
    labels
  }
})

const createPullRequestData = (labels: GitHubLabelsData): GitHubPullRequestData => ({
  defaultBranchRef: { name: 'develop' },
  pullRequest: {
    author: { login: 'pr-author' },
    title: 'PR title',
    body: 'PR body',
    baseRefName: 'main',
    headRefName: 'feature/test',
    isDraft: true,
    additions: 11,
    deletions: 7,
    labels
  }
})

const defaultGetEnumValueByValue = (
  enumObj: Record<string, string | number>,
  value: string | number
): string | number => {
  const matched = Object.values(enumObj).find((enumValue) => enumValue === value)
  if (matched === undefined) {
    throw new Error(`Invalid enum value. Received: "${String(value)}"`)
  }
  return matched
}

describe('Unit | Services: context.service', () => {
  beforeAll(async () => {
    const module = await import('../../../src/services/context.service.js')
    ContextService = module.ContextService
  })

  beforeEach(() => {
    getEnumValueByValueMock.mockReset()
    getEnumValueByValueMock.mockImplementation(defaultGetEnumValueByValue)
  })

  describe('getContext()', () => {
    // issues 이벤트에서 이슈 컨텍스트를 기본 필드와 함께 올바르게 구성하는지 확인
    test('returns issue context without fetching extra labels when pagination is complete', async () => {
      // given
      const gitHubContext = {
        eventName: EventType.Issue,
        repo: { owner: 'owner-a', repo: 'repo-a' },
        payload: {
          action: 'opened',
          sender: { login: 'sender-a', type: ActorType.User },
          issue: { number: 7 }
        },
        action: 'edited',
        actor: 'fallback-actor'
      } as unknown as GitHubContext
      const gitHubService = createGitHubServiceMock()
      gitHubService.getIssue.mockResolvedValue(
        createIssueData(createLabelsData(['bug', 'needs-triage']))
      )
      const service = new ContextService(gitHubContext, gitHubService)

      // when
      const context = await service.getContext()

      // then
      expect(gitHubService.getIssue).toHaveBeenCalledWith('owner-a', 'repo-a', 7)
      expect(gitHubService.getPullRequest).not.toHaveBeenCalled()
      expect(gitHubService.listLabelsForIssueOrPr).not.toHaveBeenCalled()
      expect(context).toEqual({
        eventType: EventType.Issue,
        repoOwner: 'owner-a',
        repoName: 'repo-a',
        action: 'opened',
        actor: 'sender-a',
        actorType: ActorType.User,
        defaultBranch: 'main',
        eventNumber: 7,
        link: {
          title: 'Issue title',
          url: 'https://github.com/owner-a/repo-a/issues/7'
        },
        issue: {
          author: 'issue-author',
          title: 'Issue title',
          body: 'Issue body',
          labels: ['bug', 'needs-triage']
        }
      })
    })

    // pull_request_target 이벤트를 pull_request로 정규화하고 fallback/action/레이블 페이지네이션을 처리하는지 확인
    test('returns pull request context with normalized event and paged labels', async () => {
      // given
      const gitHubContext = {
        eventName: 'pull_request_target',
        repo: { owner: 'owner-b', repo: 'repo-b' },
        payload: {
          sender: { type: ActorType.Bot },
          pull_request: { number: 42 }
        },
        action: 'synchronize',
        actor: 'github-actions[bot]'
      } as unknown as GitHubContext
      const gitHubService = createGitHubServiceMock()
      gitHubService.getPullRequest.mockResolvedValue(
        createPullRequestData(createLabelsData(['existing'], true, 'cursor-1'))
      )
      gitHubService.listLabelsForIssueOrPr.mockResolvedValue(['backend', 'urgent'])
      const service = new ContextService(gitHubContext, gitHubService)

      // when
      const context = await service.getContext()

      // then
      expect(gitHubService.getIssue).not.toHaveBeenCalled()
      expect(gitHubService.getPullRequest).toHaveBeenCalledWith('owner-b', 'repo-b', 42)
      expect(gitHubService.listLabelsForIssueOrPr).toHaveBeenCalledWith(
        'owner-b',
        'repo-b',
        42,
        EventType.PullRequest,
        'cursor-1'
      )
      expect(context).toEqual({
        eventType: EventType.PullRequest,
        repoOwner: 'owner-b',
        repoName: 'repo-b',
        action: 'synchronize',
        actor: 'github-actions[bot]',
        actorType: ActorType.Bot,
        defaultBranch: 'develop',
        eventNumber: 42,
        link: {
          title: 'PR title',
          url: 'https://github.com/owner-b/repo-b/pull/42'
        },
        pullRequest: {
          author: 'pr-author',
          title: 'PR title',
          body: 'PR body',
          baseBranch: 'main',
          headBranch: 'feature/test',
          isDraft: true,
          changedLines: {
            additions: 11,
            deletions: 7
          },
          labels: ['existing', 'backend', 'urgent']
        }
      })
    })

    // 페이지네이션 endCursor가 null이면 null로 다음 레이블 조회를 호출하는지 확인
    test('requests additional labels with null cursor when next page cursor is absent', async () => {
      // given
      const gitHubContext = {
        eventName: EventType.Issue,
        repo: { owner: 'owner-c', repo: 'repo-c' },
        payload: {
          action: 'labeled',
          sender: { login: 'sender-c', type: ActorType.User },
          issue: { number: 101 }
        },
        action: 'edited',
        actor: 'fallback-c'
      } as unknown as GitHubContext
      const gitHubService = createGitHubServiceMock()
      gitHubService.getIssue.mockResolvedValue(
        createIssueData(createLabelsData(['first-page'], true, null))
      )
      gitHubService.listLabelsForIssueOrPr.mockResolvedValue(['second-page'])
      const service = new ContextService(gitHubContext, gitHubService)

      // when
      const context = await service.getContext()

      // then
      expect(gitHubService.listLabelsForIssueOrPr).toHaveBeenCalledWith(
        'owner-c',
        'repo-c',
        101,
        EventType.Issue,
        null
      )
      expect(context.eventType).toBe(EventType.Issue)
      if (context.eventType !== EventType.Issue) {
        throw new Error('Expected issue context')
      }
      expect(context.issue.labels).toEqual(['first-page', 'second-page'])
    })

    // 비지원 eventType이면 getContext가 명시적 오류를 던지는지 확인
    test('throws error when parsed event type is unsupported', async () => {
      // given
      const gitHubContext = {
        eventName: EventType.Issue,
        repo: { owner: 'owner-d', repo: 'repo-d' },
        payload: {
          action: 'opened',
          sender: { login: 'sender-d', type: ActorType.User },
          issue: { number: 11 }
        },
        action: 'edited',
        actor: 'fallback-d'
      } as unknown as GitHubContext
      const gitHubService = createGitHubServiceMock()
      getEnumValueByValueMock
        .mockReturnValueOnce('unsupported-event')
        .mockReturnValueOnce(ActorType.User)
      const service = new ContextService(gitHubContext, gitHubService)

      // when
      const act = async (): Promise<void> => {
        await service.getContext()
      }

      // then
      await expect(act).rejects.toThrow('Unsupported event: issues')
      expect(gitHubService.getIssue).not.toHaveBeenCalled()
      expect(gitHubService.getPullRequest).not.toHaveBeenCalled()
    })
  })
})
