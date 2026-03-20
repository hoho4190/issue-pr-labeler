import { jest } from '@jest/globals'
import { ConditionResolveService } from '../../../src/services/condition-resolve.service.js'
import type { IGitHubService } from '../../../src/services/github.service.interface.js'
import { ActorType, EventType } from '../../../src/types/common.js'
import type { PullRequestContext } from '../../../src/types/context.js'

const createGitHubServiceMock = (): jest.Mocked<IGitHubService> =>
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

const createPullRequestContext = (): PullRequestContext => ({
  eventType: EventType.PullRequest,
  repoOwner: 'octo-org',
  repoName: 'octo-repo',
  action: 'synchronize',
  actor: 'octocat',
  actorType: ActorType.User,
  defaultBranch: 'main',
  eventNumber: 99,
  link: {
    url: 'https://github.com/octo-org/octo-repo/pull/99',
    title: 'PR #99'
  },
  pullRequest: {
    author: 'octocat',
    title: 'pr title',
    body: 'pr body',
    baseBranch: 'main',
    headBranch: 'feature/test',
    isDraft: false,
    changedLines: {
      additions: 1,
      deletions: 2
    },
    labels: []
  }
})

describe('Unit | Services: condition-resolve.service', () => {
  // PR 컨텍스트일 때 changed-files를 GitHubService로 위임해 반환하는지 확인
  test('returns changed files for pull request context', async () => {
    // given
    const gitHubService = createGitHubServiceMock()
    const service = new ConditionResolveService(gitHubService)
    const context = createPullRequestContext()
    gitHubService.listPullRequestFiles.mockResolvedValue(['src/main.ts', 'README.md'])

    // when
    const files = await service.resolveChangedFiles(context)

    // then
    expect(gitHubService.listPullRequestFiles).toHaveBeenCalledWith('octo-org', 'octo-repo', 99)
    expect(files).toEqual(['src/main.ts', 'README.md'])
  })

  // PR 컨텍스트일 때 커밋을 조회하고 전체 커밋 메시지 목록만 반환하는지 확인
  test('returns commit messages for pull request context', async () => {
    // given
    const gitHubService = createGitHubServiceMock()
    const service = new ConditionResolveService(gitHubService)
    const context = createPullRequestContext()
    gitHubService.listPullRequestCommits.mockResolvedValue([
      {
        message: 'feat: add commit messages\n\nImplement support',
        messageHeadline: 'feat: add commit messages',
        messageBody: 'Implement support'
      },
      {
        message: 'test: cover commit resolver',
        messageHeadline: 'test: cover commit resolver',
        messageBody: undefined
      }
    ])

    // when
    const messages = await service.resolveCommitMessages(context)

    // then
    expect(gitHubService.listPullRequestCommits).toHaveBeenCalledWith('octo-org', 'octo-repo', 99)
    expect(messages).toEqual([
      'feat: add commit messages\n\nImplement support',
      'test: cover commit resolver'
    ])
  })

  // PR 컨텍스트일 때 커밋을 조회하고 subject 목록만 반환하는지 확인
  test('returns commit message subjects for pull request context', async () => {
    // given
    const gitHubService = createGitHubServiceMock()
    const service = new ConditionResolveService(gitHubService)
    const context = createPullRequestContext()
    gitHubService.listPullRequestCommits.mockResolvedValue([
      {
        message: 'feat: add commit messages\n\nImplement support',
        messageHeadline: 'feat: add commit messages',
        messageBody: 'Implement support'
      },
      {
        message: 'test: cover commit resolver',
        messageHeadline: 'test: cover commit resolver',
        messageBody: undefined
      }
    ])

    // when
    const subjects = await service.resolveCommitMessageSubjects(context)

    // then
    expect(gitHubService.listPullRequestCommits).toHaveBeenCalledWith('octo-org', 'octo-repo', 99)
    expect(subjects).toEqual(['feat: add commit messages', 'test: cover commit resolver'])
  })

  // PR 컨텍스트일 때 커밋을 조회하고 body가 없으면 빈 문자열로 정규화하는지 확인
  test('returns commit message bodies for pull request context', async () => {
    // given
    const gitHubService = createGitHubServiceMock()
    const service = new ConditionResolveService(gitHubService)
    const context = createPullRequestContext()
    gitHubService.listPullRequestCommits.mockResolvedValue([
      {
        message: 'feat: add commit messages\n\nImplement support',
        messageHeadline: 'feat: add commit messages',
        messageBody: 'Implement support'
      },
      {
        message: 'test: cover commit resolver',
        messageHeadline: 'test: cover commit resolver',
        messageBody: undefined
      }
    ])

    // when
    const bodies = await service.resolveCommitMessageBodies(context)

    // then
    expect(gitHubService.listPullRequestCommits).toHaveBeenCalledWith('octo-org', 'octo-repo', 99)
    expect(bodies).toEqual(['Implement support', ''])
  })
})
