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
})
