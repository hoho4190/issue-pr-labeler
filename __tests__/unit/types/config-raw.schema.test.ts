import { ZodError } from 'zod'
import { EventType, MatchOperator, OnMissingLabel } from '../../../src/types/common.js'
import { RawConfigSchema, RawEventType } from '../../../src/types/config-raw.schema.js'
import { captureThrown } from '../../helpers/capture-thrown.helper.js'

const createRawRule = (label: string) => ({
  label,
  matches: [
    {
      operator: MatchOperator.All,
      conditions: [{ title: '/bug/i' }]
    }
  ]
})

const createRawConfigInput = () => ({
  settings: {
    skipIfBot: true,
    removeUnmatchedLabels: true,
    onMissingLabel: OnMissingLabel.Skip,
    dryRun: true
  },
  rules: {
    issue: [createRawRule('bug')],
    pr: [createRawRule('enhancement')]
  }
})

const expectZodError = (error: unknown): ZodError => {
  if (!(error instanceof ZodError)) {
    throw new Error('Expected ZodError to be thrown')
  }
  return error
}

describe('Unit | Types: config-raw.schema', () => {
  describe('RawEventType', () => {
    // Raw 이벤트 키가 EventType enum 값에 맞게 매핑되는지 확인
    test('maps event enum to raw event key names', () => {
      // given
      const issueEventType = EventType.Issue
      const pullRequestEventType = EventType.PullRequest

      // when
      const rawIssue = RawEventType[issueEventType]
      const rawPr = RawEventType[pullRequestEventType]

      // then
      expect(rawIssue).toBe('issue')
      expect(rawPr).toBe('pr')
    })
  })

  describe('RawConfigSchema preprocess', () => {
    // null 입력이면 settings/rules 기본값을 주입하는지 확인
    test('injects default settings and rules when input is null', () => {
      // given
      const input = null

      // when
      const parsed = RawConfigSchema.parse(input)

      // then
      expect(parsed).toEqual({
        settings: {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        },
        rules: {
          issue: [],
          pr: []
        }
      })
    })

    // 원시값 입력이면 object 스키마 검증에서 실패하는지 확인
    test('fails when input is a primitive', () => {
      // given
      const input = 'not-an-object'

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('invalid_type')
      expect(thrown.issues[0]?.path).toEqual([])
    })

    // 배열 입력이면 object 스키마 검증에서 실패하는지 확인
    test('fails when input is an array', () => {
      // given
      const input: unknown = []

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('invalid_type')
      expect(thrown.issues[0]?.path).toEqual([])
    })

    // settings/rules가 누락된 객체 입력이면 각각 기본값을 주입하는지 확인
    test('injects defaults when settings and rules are missing from object', () => {
      // given
      const input = {}

      // when
      const parsed = RawConfigSchema.parse(input)

      // then
      expect(parsed).toEqual({
        settings: {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        },
        rules: {
          issue: [],
          pr: []
        }
      })
    })
  })

  describe('RawConfigSchema settings/rules validation', () => {
    // 유효한 입력이면 설정값과 규칙값을 그대로 파싱하는지 확인
    test('parses valid config input', () => {
      // given
      const input = createRawConfigInput()

      // when
      const parsed = RawConfigSchema.parse(input)

      // then
      expect(parsed.settings).toEqual(input.settings)
      expect(parsed.rules.issue[0]?.label).toBe('bug')
      expect(parsed.rules.pr[0]?.label).toBe('enhancement')
      expect(parsed.rules.issue[0]?.matches[0]?.conditions[0]).toEqual({
        title: '/bug/i',
        negate: false
      })
    })

    // rules 이벤트 배열이 null/undefined일 때 빈 배열로 변환하는지 확인
    test('transforms nullable and optional rule buckets to empty arrays', () => {
      // given
      const input = {
        settings: {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        },
        rules: {
          issue: null
        }
      }

      // when
      const parsed = RawConfigSchema.parse(input)

      // then
      expect(parsed.rules.issue).toEqual([])
      expect(parsed.rules.pr).toEqual([])
    })

    // 설정 객체에 허용되지 않은 키가 있으면 strict 에러가 발생하는지 확인
    test('fails when settings has unknown key', () => {
      // given
      const input = {
        settings: {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false,
          unknown: true
        },
        rules: {
          issue: [],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))
      const issue = thrown.issues.find((entry) => entry.code === 'unrecognized_keys')

      // then
      expect(issue).toBeDefined()
      expect(issue?.path).toEqual(['settings'])
    })

    // rules 객체에 허용되지 않은 이벤트 키가 있으면 strict 에러가 발생하는지 확인
    test('fails when rules has unknown event key', () => {
      // given
      const input = {
        settings: {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        },
        rules: {
          issue: [],
          pr: [],
          unknown: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))
      const issue = thrown.issues.find((entry) => entry.code === 'unrecognized_keys')

      // then
      expect(issue).toBeDefined()
      expect(issue?.path).toEqual(['rules'])
    })

    // onMissingLabel에 잘못된 enum 값이 들어오면 검증 실패하는지 확인
    test('fails when onMissingLabel is not in enum', () => {
      // given
      const input = {
        settings: {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: 'invalid',
          dryRun: false
        },
        rules: {
          issue: [],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('invalid_value')
      expect(thrown.issues[0]?.path).toEqual(['settings', 'onMissingLabel'])
    })
  })

  describe('RawConfigSchema rule refinements', () => {
    // issue 이벤트에서 중복 레이블이 있으면 커스텀 에러를 추가하는지 확인
    test('fails when issue rules contain duplicate labels', () => {
      // given
      const input = {
        ...createRawConfigInput(),
        rules: {
          issue: [createRawRule('bug'), createRawRule('bug')],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('custom')
      expect(thrown.issues[0]?.message).toBe('Duplicate label in issue')
      expect(thrown.issues[0]?.path).toEqual(['rules', 'issue', 1])
    })

    // pr 이벤트에서 중복 레이블이 있으면 커스텀 에러를 추가하는지 확인
    test('fails when pr rules contain duplicate labels', () => {
      // given
      const input = {
        ...createRawConfigInput(),
        rules: {
          issue: [],
          pr: [createRawRule('enhancement'), createRawRule('enhancement')]
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('custom')
      expect(thrown.issues[0]?.message).toBe('Duplicate label in pr')
      expect(thrown.issues[0]?.path).toEqual(['rules', 'pr', 1])
    })

    // issue 이벤트에서 대소문자만 다른 레이블도 정규화 기준으로 중복 처리하는지 확인
    test('fails when issue rules contain case-only duplicate labels after normalization', () => {
      // given
      const input = {
        ...createRawConfigInput(),
        rules: {
          issue: [createRawRule('BUG'), createRawRule('bug')],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('custom')
      expect(thrown.issues[0]?.message).toBe('Duplicate label in issue')
      expect(thrown.issues[0]?.path).toEqual(['rules', 'issue', 1])
    })

    // label이 공백 문자열이면 스키마 단계에서 실패하는지 확인
    test('fails when rule label is whitespace-only string', () => {
      // given
      const input = {
        ...createRawConfigInput(),
        rules: {
          issue: [createRawRule('   ')],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))
      const issue = thrown.issues.find(
        (entry) =>
          entry.code === 'custom' &&
          entry.path.join('.') === ['rules', 'issue', 0, 'label'].join('.')
      )

      // then
      expect(issue).toBeDefined()
      expect(issue?.message).toBe('Label must be a non-empty string.')
      expect(issue?.path).toEqual(['rules', 'issue', 0, 'label'])
    })

    // match 목록이 빈 배열이면 최소 길이 검증에 실패하는지 확인
    test('fails when matches is an empty array', () => {
      // given
      const input = {
        ...createRawConfigInput(),
        rules: {
          issue: [
            {
              label: 'bug',
              matches: []
            }
          ],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))
      const issue = thrown.issues.find(
        (entry) =>
          entry.code === 'too_small' &&
          entry.path.join('.') === ['rules', 'issue', 0, 'matches'].join('.')
      )

      // then
      expect(issue).toBeDefined()
      expect(issue?.message).toBe('At least one match is required.')
      expect(issue?.path).toEqual(['rules', 'issue', 0, 'matches'])
    })

    // condition 목록이 빈 배열이면 최소 길이 검증에 실패하는지 확인
    test('fails when conditions is an empty array', () => {
      // given
      const input = {
        ...createRawConfigInput(),
        rules: {
          issue: [
            {
              label: 'bug',
              matches: [
                {
                  operator: MatchOperator.All,
                  conditions: []
                }
              ]
            }
          ],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))
      const issue = thrown.issues.find(
        (entry) =>
          entry.code === 'too_small' &&
          entry.path.join('.') === ['rules', 'issue', 0, 'matches', 0, 'conditions'].join('.')
      )

      // then
      expect(issue).toBeDefined()
      expect(issue?.message).toBe('At least one condition is required.')
      expect(issue?.path).toEqual(['rules', 'issue', 0, 'matches', 0, 'conditions'])
    })

    // 조건 객체에 property가 하나도 없으면 커스텀 에러를 추가하는지 확인
    test('fails when condition has no property field', () => {
      // given
      const input = {
        ...createRawConfigInput(),
        rules: {
          issue: [
            {
              label: 'bug',
              matches: [{ operator: MatchOperator.All, conditions: [{}] }]
            }
          ],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('custom')
      expect(thrown.issues[0]?.message).toBe('At least one condition property is required.')
      expect(thrown.issues[0]?.path).toEqual(['rules', 'issue', 0, 'matches', 0, 'conditions', 0])
    })

    // 조건 객체에 property가 둘 이상이면 커스텀 에러를 추가하는지 확인
    test('fails when condition has multiple property fields', () => {
      // given
      const input = {
        ...createRawConfigInput(),
        rules: {
          issue: [
            {
              label: 'bug',
              matches: [
                {
                  operator: MatchOperator.All,
                  conditions: [{ title: '/bug/i', body: '/body/i' }]
                }
              ]
            }
          ],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))

      // then
      expect(thrown.issues[0]?.code).toBe('custom')
      expect(thrown.issues[0]?.message).toBe('Only one condition property is allowed.')
      expect(thrown.issues[0]?.path).toEqual(['rules', 'issue', 0, 'matches', 0, 'conditions', 0])
    })

    // match/rule/condition strict 모드에서 허용되지 않은 키를 거부하는지 확인
    test('fails when unknown keys exist in nested rule structures', () => {
      // given
      const input = {
        ...createRawConfigInput(),
        rules: {
          issue: [
            {
              label: 'bug',
              matches: [
                {
                  operator: MatchOperator.All,
                  conditions: [{ title: '/bug/i', extraConditionKey: true }],
                  extraMatchKey: true
                }
              ],
              extraRuleKey: true
            }
          ],
          pr: []
        }
      }

      // when
      const thrown = expectZodError(captureThrown(() => RawConfigSchema.parse(input)))
      const paths = thrown.issues
        .filter((issue) => issue.code === 'unrecognized_keys')
        .map((issue) => issue.path)

      // then
      expect(paths).toContainEqual(['rules', 'issue', 0])
      expect(paths).toContainEqual(['rules', 'issue', 0, 'matches', 0])
      expect(paths).toContainEqual(['rules', 'issue', 0, 'matches', 0, 'conditions', 0])
    })
  })
})
