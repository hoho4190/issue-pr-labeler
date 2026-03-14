import { ActorType, EventType } from '../../../src/types/common.js'
import type { Context } from '../../../src/types/context.js'
import { assertIssueContext, assertPullRequestContext } from '../../../src/utils/context.utils.js'

describe('Unit | Utils: context.utils', () => {
  describe('assertIssueContext()', () => {
    // Issue 컨텍스트일 때 예외 없이 통과하는지 확인
    test('does not throw for Issue context', () => {
      // given
      const ctx: any = {
        eventType: EventType.Issue
      }

      // when
      const act = () => assertIssueContext(ctx)

      // then
      expect(act).not.toThrow()
    })

    // PR 컨텍스트일 때 에러를 던지는지 확인
    test('throws for PR context', () => {
      // given
      const ctx: any = {
        eventType: EventType.PullRequest
      }

      // when
      const act = () => assertIssueContext(ctx)

      // then
      expect(act).toThrow('Accessed issue-only data in a non-issue context.')
    })

    // eventType이 누락되면 에러를 던지는지 확인
    test('throws when eventType is missing', () => {
      // given
      const ctx: any = {}

      // when
      const act = () => assertIssueContext(ctx)

      // then
      expect(act).toThrow('Accessed issue-only data in a non-issue context.')
    })

    // 지원하지 않는 eventType 값이면 에러를 던지는지 확인
    test('throws when eventType is unsupported value', () => {
      // given
      const ctx: any = {
        eventType: 'issue'
      }

      // when
      const act = () => assertIssueContext(ctx)

      // then
      expect(act).toThrow('Accessed issue-only data in a non-issue context.')
    })

    // assert 호출 후 Context가 IssueContext로 좁혀져 issue 필드 접근이 가능한지 확인
    test('narrows Context union to IssueContext after assertion', () => {
      // given
      const createContext = (eventType: EventType): Context => {
        if (eventType === EventType.Issue) {
          return {
            eventType: EventType.Issue,
            repoOwner: 'octo-org',
            repoName: 'octo-repo',
            action: 'opened',
            actor: 'octocat',
            actorType: ActorType.User,
            defaultBranch: 'main',
            eventNumber: 1,
            link: {
              url: 'https://github.com/octo-org/octo-repo/issues/1',
              title: 'Issue title'
            },
            issue: {
              author: 'octocat',
              title: 'Issue title',
              body: 'Issue body',
              labels: []
            }
          }
        }

        return {
          eventType: EventType.PullRequest,
          repoOwner: 'octo-org',
          repoName: 'octo-repo',
          action: 'opened',
          actor: 'octocat',
          actorType: ActorType.User,
          defaultBranch: 'main',
          eventNumber: 1,
          link: {
            url: 'https://github.com/octo-org/octo-repo/pull/1',
            title: 'PR title'
          },
          pullRequest: {
            author: 'octocat',
            title: 'PR title',
            body: 'PR body',
            baseBranch: 'main',
            headBranch: 'feature/a',
            isDraft: false,
            changedLines: {
              additions: 1,
              deletions: 1
            },
            labels: []
          }
        }
      }
      const ctx = createContext(EventType.Issue)

      // when
      assertIssueContext(ctx)

      // then
      const issueTitle: string = ctx.issue.title
      expect(issueTitle).toBe('Issue title')
    })
  })

  describe('assertPullRequestContext()', () => {
    // PR 컨텍스트일 때 예외 없이 통과하는지 확인
    test('does not throw for PR context', () => {
      // given
      const ctx: any = {
        eventType: EventType.PullRequest
      }

      // when
      const act = () => assertPullRequestContext(ctx)

      // then
      expect(act).not.toThrow()
    })

    // Issue 컨텍스트일 때 에러를 던지는지 확인
    test('throws for Issue context', () => {
      // given
      const ctx: any = {
        eventType: EventType.Issue
      }

      // when
      const act = () => assertPullRequestContext(ctx)

      // then
      expect(act).toThrow('Accessed PR-only data in a non-PR context.')
    })

    // eventType이 누락되면 에러를 던지는지 확인
    test('throws when eventType is missing', () => {
      // given
      const ctx: any = {}

      // when
      const act = () => assertPullRequestContext(ctx)

      // then
      expect(act).toThrow('Accessed PR-only data in a non-PR context.')
    })

    // 지원하지 않는 eventType 값이면 에러를 던지는지 확인
    test('throws when eventType is unsupported value', () => {
      // given
      const ctx: any = {
        eventType: 'pullrequest'
      }

      // when
      const act = () => assertPullRequestContext(ctx)

      // then
      expect(act).toThrow('Accessed PR-only data in a non-PR context.')
    })

    // assert 호출 후 Context가 PullRequestContext로 좁혀져 pullRequest 필드 접근이 가능한지 확인
    test('narrows Context union to PullRequestContext after assertion', () => {
      // given
      const createContext = (eventType: EventType): Context => {
        if (eventType === EventType.Issue) {
          return {
            eventType: EventType.Issue,
            repoOwner: 'octo-org',
            repoName: 'octo-repo',
            action: 'opened',
            actor: 'octocat',
            actorType: ActorType.User,
            defaultBranch: 'main',
            eventNumber: 1,
            link: {
              url: 'https://github.com/octo-org/octo-repo/issues/1',
              title: 'Issue title'
            },
            issue: {
              author: 'octocat',
              title: 'Issue title',
              body: 'Issue body',
              labels: []
            }
          }
        }

        return {
          eventType: EventType.PullRequest,
          repoOwner: 'octo-org',
          repoName: 'octo-repo',
          action: 'opened',
          actor: 'octocat',
          actorType: ActorType.User,
          defaultBranch: 'main',
          eventNumber: 1,
          link: {
            url: 'https://github.com/octo-org/octo-repo/pull/1',
            title: 'PR title'
          },
          pullRequest: {
            author: 'octocat',
            title: 'PR title',
            body: 'PR body',
            baseBranch: 'main',
            headBranch: 'feature/a',
            isDraft: false,
            changedLines: {
              additions: 1,
              deletions: 1
            },
            labels: []
          }
        }
      }
      const ctx = createContext(EventType.PullRequest)

      // when
      assertPullRequestContext(ctx)

      // then
      const pullRequestTitle: string = ctx.pullRequest.title
      expect(pullRequestTitle).toBe('PR title')
    })
  })
})
