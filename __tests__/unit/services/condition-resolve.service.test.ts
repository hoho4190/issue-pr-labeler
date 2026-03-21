import { jest } from '@jest/globals'
import { ConditionResolveService } from '../../../src/services/condition-resolve.service.js'
import type { IGitHubService } from '../../../src/services/github.service.interface.js'
import { ActorType, EventType } from '../../../src/types/common.js'
import type { PullRequestContext } from '../../../src/types/context.js'
import type { GitHubPullRequestCommitData } from '../../../src/types/github-api.schema.js'

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

const createPullRequestContext = (eventNumber = 99): PullRequestContext => ({
  eventType: EventType.PullRequest,
  repoOwner: 'octo-org',
  repoName: 'octo-repo',
  action: 'synchronize',
  actor: 'octocat',
  actorType: ActorType.User,
  defaultBranch: 'main',
  eventNumber,
  link: {
    url: `https://github.com/octo-org/octo-repo/pull/${String(eventNumber)}`,
    title: `PR #${String(eventNumber)}`
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

const createPullRequestCommits = (): GitHubPullRequestCommitData[] => [
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
]

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
    gitHubService.listPullRequestCommits.mockResolvedValue(createPullRequestCommits())

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
    gitHubService.listPullRequestCommits.mockResolvedValue(createPullRequestCommits())

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
    gitHubService.listPullRequestCommits.mockResolvedValue(createPullRequestCommits())

    // when
    const bodies = await service.resolveCommitMessageBodies(context)

    // then
    expect(gitHubService.listPullRequestCommits).toHaveBeenCalledWith('octo-org', 'octo-repo', 99)
    expect(bodies).toEqual(['Implement support', ''])
  })

  // 같은 PR 컨텍스트에서 commit 관련 property를 연속 조회해도 raw commit fetch는 한 번만 수행하는지 확인
  test('reuses cached pull request commits across commit-derived properties for same context', async () => {
    // given
    const gitHubService = createGitHubServiceMock()
    const service = new ConditionResolveService(gitHubService)
    const context = createPullRequestContext()
    gitHubService.listPullRequestCommits.mockResolvedValue(createPullRequestCommits())

    // when
    const messages = await service.resolveCommitMessages(context)
    const subjects = await service.resolveCommitMessageSubjects(context)
    const bodies = await service.resolveCommitMessageBodies(context)

    // then
    expect(gitHubService.listPullRequestCommits).toHaveBeenCalledTimes(1)
    expect(gitHubService.listPullRequestCommits).toHaveBeenCalledWith('octo-org', 'octo-repo', 99)
    expect(messages).toEqual([
      'feat: add commit messages\n\nImplement support',
      'test: cover commit resolver'
    ])
    expect(subjects).toEqual(['feat: add commit messages', 'test: cover commit resolver'])
    expect(bodies).toEqual(['Implement support', ''])
  })

  // 같은 PR 컨텍스트에서 commit 관련 property를 동시에 조회해도 in-flight fetch를 공유하는지 확인
  test('reuses in-flight pull request commits promise across concurrent commit-derived properties', async () => {
    // given
    const gitHubService = createGitHubServiceMock()
    const service = new ConditionResolveService(gitHubService)
    const context = createPullRequestContext()
    let resolveFetch!: (value: GitHubPullRequestCommitData[]) => void
    const fetchPromise = new Promise<GitHubPullRequestCommitData[]>((resolve) => {
      resolveFetch = resolve
    })
    gitHubService.listPullRequestCommits.mockReturnValue(fetchPromise)

    // when
    const messagesAct = service.resolveCommitMessages(context)
    const subjectsAct = service.resolveCommitMessageSubjects(context)
    const bodiesAct = service.resolveCommitMessageBodies(context)

    // then
    expect(gitHubService.listPullRequestCommits).toHaveBeenCalledTimes(1)

    // when
    resolveFetch(createPullRequestCommits())
    const [messages, subjects, bodies] = await Promise.all([messagesAct, subjectsAct, bodiesAct])

    // then
    expect(messages).toEqual([
      'feat: add commit messages\n\nImplement support',
      'test: cover commit resolver'
    ])
    expect(subjects).toEqual(['feat: add commit messages', 'test: cover commit resolver'])
    expect(bodies).toEqual(['Implement support', ''])
  })

  // 이벤트 번호가 다르면 캐시를 공유하지 않고 PR별로 다시 조회하는지 확인
  test('fetches pull request commits again when event number differs', async () => {
    // given
    const gitHubService = createGitHubServiceMock()
    const service = new ConditionResolveService(gitHubService)
    const firstContext = createPullRequestContext(99)
    const secondContext = createPullRequestContext(100)
    gitHubService.listPullRequestCommits.mockResolvedValue(createPullRequestCommits())

    // when
    const firstMessages = await service.resolveCommitMessages(firstContext)
    const secondSubjects = await service.resolveCommitMessageSubjects(secondContext)

    // then
    expect(gitHubService.listPullRequestCommits).toHaveBeenCalledTimes(2)
    expect(gitHubService.listPullRequestCommits).toHaveBeenNthCalledWith(
      1,
      'octo-org',
      'octo-repo',
      99
    )
    expect(gitHubService.listPullRequestCommits).toHaveBeenNthCalledWith(
      2,
      'octo-org',
      'octo-repo',
      100
    )
    expect(firstMessages).toEqual([
      'feat: add commit messages\n\nImplement support',
      'test: cover commit resolver'
    ])
    expect(secondSubjects).toEqual(['feat: add commit messages', 'test: cover commit resolver'])
  })

  // 조회가 실패한 경우 캐시를 제거해 다음 호출에서 재시도할 수 있는지 확인
  test('evicts cached pull request commits when fetch fails and retries on next call', async () => {
    // given
    const gitHubService = createGitHubServiceMock()
    const service = new ConditionResolveService(gitHubService)
    const context = createPullRequestContext()
    gitHubService.listPullRequestCommits
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(createPullRequestCommits())

    // when
    const firstAct = service.resolveCommitMessages(context)

    // then
    await expect(firstAct).rejects.toThrow('temporary failure')

    // when
    const retriedSubjects = await service.resolveCommitMessageSubjects(context)

    // then
    expect(gitHubService.listPullRequestCommits).toHaveBeenCalledTimes(2)
    expect(gitHubService.listPullRequestCommits).toHaveBeenNthCalledWith(
      1,
      'octo-org',
      'octo-repo',
      99
    )
    expect(gitHubService.listPullRequestCommits).toHaveBeenNthCalledWith(
      2,
      'octo-org',
      'octo-repo',
      99
    )
    expect(retriedSubjects).toEqual(['feat: add commit messages', 'test: cover commit resolver'])
  })
})
