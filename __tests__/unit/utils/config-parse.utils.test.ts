import { jest } from '@jest/globals'
import { captureThrown } from '../../helpers/capture-thrown.helper.js'
import { EventType, MatchOperator, OnMissingLabel } from '../../../src/types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../../src/types/condition-enum.js'
import type { RawConfig } from '../../../src/types/config-raw.schema.js'
import { ZodContextError } from '../../../src/utils/zod.utils.js'

const getEnumValueByValueMock = jest.fn()
const getConditionPropertyMock = jest.fn()
const getConditionValueTagMock = jest.fn()

jest.unstable_mockModule('../../../src/utils/enum.utils.js', () => ({
  getEnumValueByValue: (...args: unknown[]) => getEnumValueByValueMock(...args)
}))

jest.unstable_mockModule('../../../src/registry/condition.registry.js', () => ({
  getConditionProperty: (...args: unknown[]) => getConditionPropertyMock(...args),
  getConditionValueTag: (...args: unknown[]) => getConditionValueTagMock(...args)
}))

type ConfigParseUtilsModule = typeof import('../../../src/utils/config-parse.utils.js')

let parseConfig: ConfigParseUtilsModule['parseConfig']
let __test__: ConfigParseUtilsModule['__test__']

describe('Unit | Utils: config-parse.utils', () => {
  beforeAll(async () => {
    const module = await import('../../../src/utils/config-parse.utils.js')
    parseConfig = module.parseConfig
    __test__ = module.__test__
  })

  beforeEach(() => {
    getEnumValueByValueMock.mockReset()
    getConditionPropertyMock.mockReset()
    getConditionValueTagMock.mockReset()

    getEnumValueByValueMock.mockImplementation((_enumObj, value) => value)

    getConditionPropertyMock.mockImplementation(() => {
      throw new Error('getConditionProperty mock is not configured')
    })

    getConditionValueTagMock.mockImplementation(() => {
      throw new Error('getConditionValueTag mock is not configured')
    })
  })

  describe('parseConfig()', () => {
    // 외부 의존성 모킹 상태에서 규칙을 파싱하고 skipIfBot 상속을 적용하는지 확인
    test('parses config using mocked registry/enum dependencies', () => {
      // given
      const canParse = jest.fn(() => true)
      const parseExpected = jest.fn((_raw: unknown) => '/parsed-regex/')

      getConditionPropertyMock.mockReturnValue({
        type: ConditionPropertyType.Title,
        allowedEvents: [EventType.Issue, EventType.PullRequest],
        allowedTags: [ConditionValueTagType.Regex]
      })

      getConditionValueTagMock.mockReturnValue({
        canParse,
        parse: parseExpected
      })

      const raw = {
        settings: {
          skipIfBot: true,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        },
        rules: {
          issue: [
            {
              label: 'bug',
              matches: [
                {
                  operator: MatchOperator.All,
                  conditions: [{ title: '/bug/i', negate: true }]
                }
              ]
            }
          ],
          pr: []
        }
      } as RawConfig
      const zodContext = { message: 'parse mocked dependencies' }

      // when
      const parsed = parseConfig(raw, zodContext)

      // then
      expect(parsed.settings).toEqual(raw.settings)

      const issueRule = parsed.rules[EventType.Issue][0]
      if (!issueRule) throw new Error('Expected issue rule')

      expect(issueRule.skipIfBot).toBe(true)
      expect(issueRule.matches[0]?.skipIfBot).toBe(true)
      expect(issueRule.matches[0]?.conditions[0]).toEqual({
        propertyType: ConditionPropertyType.Title,
        tagType: ConditionValueTagType.Regex,
        expected: '/parsed-regex/',
        negate: true
      })

      expect(getEnumValueByValueMock).toHaveBeenCalledWith(ConditionPropertyType, 'title')
      expect(getConditionPropertyMock).toHaveBeenCalledWith(ConditionPropertyType.Title)
      expect(getConditionValueTagMock).toHaveBeenCalledWith(ConditionValueTagType.Regex)
      expect(canParse).toHaveBeenCalledWith('/bug/i')
      expect(parseExpected).toHaveBeenCalledWith('/bug/i')
    })

    // 허용되지 않은 이벤트 property면 ZodContextError로 래핑하는지 확인
    test('wraps ConfigParseError into ZodContextError for invalid event property', () => {
      // given
      getConditionPropertyMock.mockReturnValue({
        type: ConditionPropertyType.BaseBranch,
        allowedEvents: [EventType.PullRequest],
        allowedTags: [ConditionValueTagType.String]
      })

      const raw = {
        settings: {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        },
        rules: {
          issue: [
            {
              label: 'invalid-issue-rule',
              matches: [
                {
                  operator: MatchOperator.All,
                  conditions: [{ 'base-branch': 'main', negate: false }]
                }
              ]
            }
          ],
          pr: []
        }
      } as RawConfig
      const zodContext = { message: 'invalid event property' }

      // when
      const thrown = captureThrown<ZodContextError>(() => parseConfig(raw, zodContext))

      // then
      expect(thrown).toBeInstanceOf(ZodContextError)
      expect(thrown.context).toEqual(zodContext)
      expect(thrown.errors[0]).toEqual({
        code: 'custom',
        path: ['rules', 'issue', 0, 'matches', 0, 'conditions', 0],
        message: 'Invalid property for event.',
        expected: '<issues allowed properties>',
        received: 'base-branch'
      })
    })

    // 허용 태그들 모두 parse 실패하면 ZodContextError를 던지는지 확인
    test('throws ZodContextError when every allowed tag rejects raw value', () => {
      // given
      getConditionPropertyMock.mockReturnValue({
        type: ConditionPropertyType.Author,
        allowedEvents: [EventType.Issue, EventType.PullRequest],
        allowedTags: [ConditionValueTagType.Regex, ConditionValueTagType.String]
      })

      getConditionValueTagMock.mockImplementation((_tagType: unknown) => ({
        canParse: (_raw: unknown) => false,
        parse: (_raw: unknown) => 'should-not-parse'
      }))

      const raw = {
        settings: {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        },
        rules: {
          issue: [
            {
              label: 'invalid-author',
              matches: [
                {
                  operator: MatchOperator.All,
                  conditions: [{ author: 'octocat', negate: false }]
                }
              ]
            }
          ],
          pr: []
        }
      } as RawConfig
      const zodContext = { message: 'invalid author value' }

      // when
      const thrown = captureThrown<ZodContextError>(() => parseConfig(raw, zodContext))

      // then
      expect(thrown).toBeInstanceOf(ZodContextError)
      expect(thrown.errors[0]).toEqual({
        code: 'custom',
        path: ['rules', 'issue', 0, 'matches', 0, 'conditions', 0],
        message: 'Value cannot be parsed with any of the allowed tags.',
        expected: 'regex|string',
        received: 'octocat'
      })
      expect(getConditionValueTagMock).toHaveBeenNthCalledWith(1, ConditionValueTagType.Regex)
      expect(getConditionValueTagMock).toHaveBeenNthCalledWith(2, ConditionValueTagType.String)
    })

    // ConfigParseError가 아닌 예외는 그대로 전파하는지 확인
    test('rethrows non-ConfigParseError errors as-is', () => {
      // given
      const customError = new Error('enum parse failed')
      getEnumValueByValueMock.mockImplementation(() => {
        throw customError
      })

      const raw = {
        settings: {
          skipIfBot: false,
          removeUnmatchedLabels: false,
          onMissingLabel: OnMissingLabel.Create,
          dryRun: false
        },
        rules: {
          issue: [
            {
              label: 'invalid-property-key',
              matches: [
                {
                  operator: MatchOperator.All,
                  conditions: [{ unknown: 'x', negate: false } as any]
                }
              ]
            }
          ],
          pr: []
        }
      } as RawConfig
      const zodContext = { message: 'invalid property key' }

      // when
      const act = () => parseConfig(raw, zodContext)

      // then
      expect(act).toThrow(customError)
      expect(act).not.toThrow(ZodContextError)
    })
  })

  describe('__test__.parseEventType()', () => {
    // raw event key가 EventType으로 매핑되는지 확인
    test('maps raw event keys to EventType values', () => {
      // given
      const parseEventType = __test__.parseEventType

      // when
      const issueType = parseEventType('issue')
      const prType = parseEventType('pr')

      // then
      expect(issueType).toBe(EventType.Issue)
      expect(prType).toBe(EventType.PullRequest)
    })

    // 정의되지 않은 키는 undefined를 반환하는지 확인
    test('returns undefined for unknown raw event key', () => {
      // given
      const parseEventType = __test__.parseEventType

      // when
      const eventType = parseEventType('unknown' as any)

      // then
      expect(eventType).toBeUndefined()
    })
  })

  describe('__test__.assignRulesToEvent()', () => {
    // 지정된 이벤트 슬롯에 파싱된 rule 목록을 대입하는지 확인
    test('assigns parsed rules to the targeted event bucket', () => {
      // given
      const assignRulesToEvent = __test__.assignRulesToEvent
      const rules = {
        [EventType.Issue]: [],
        [EventType.PullRequest]: []
      }
      const parsedRules = [
        {
          label: 'rule-a',
          matches: [],
          skipIfBot: false
        }
      ]

      // when
      assignRulesToEvent(rules, EventType.PullRequest, parsedRules as any)

      // then
      expect(rules[EventType.PullRequest]).toBe(parsedRules)
      expect(rules[EventType.Issue]).toEqual([])
    })
  })

  describe('__test__.extractConditionInfo()', () => {
    // 단일 property + negate를 올바르게 추출하는지 확인
    test('extracts propertyType, rawValue, and negate', () => {
      // given
      const extractConditionInfo = __test__.extractConditionInfo
      const rawCondition = { title: '/hello/i', negate: true }
      const path = ['rules', 'issue', 0, 'matches', 0, 'conditions', 0]

      getEnumValueByValueMock.mockReturnValue(ConditionPropertyType.Title)

      // when
      const info = extractConditionInfo(rawCondition as any, path)

      // then
      expect(info).toEqual({
        propertyType: ConditionPropertyType.Title,
        rawValue: '/hello/i',
        negate: true
      })
      expect(getEnumValueByValueMock).toHaveBeenCalledWith(ConditionPropertyType, 'title')
    })

    // condition property가 없으면 에러를 던지는지 확인
    test('throws when no condition property is provided', () => {
      // given
      const extractConditionInfo = __test__.extractConditionInfo
      const rawCondition = { negate: false }
      const path = ['rules', 'issue', 0]

      // when
      const act = () => extractConditionInfo(rawCondition as any, path)

      // then
      expect(act).toThrow('Condition must have exactly one property besides "negate".')
    })

    // condition property가 2개 이상이면 에러를 던지는지 확인
    test('throws when multiple condition properties are provided', () => {
      // given
      const extractConditionInfo = __test__.extractConditionInfo
      const rawCondition = {
        title: '/hello/i',
        author: 'octocat',
        negate: false
      }
      const path = ['rules', 'issue', 0]

      // when
      const act = () => extractConditionInfo(rawCondition as any, path)

      // then
      expect(act).toThrow('Condition must have exactly one property besides "negate".')
    })
  })

  describe('__test__.validateConditionPropertyAllowedForEvent()', () => {
    // allowedEvents에 현재 이벤트가 포함되면 통과하는지 확인
    test('does not throw when property is allowed for event', () => {
      // given
      const validateConditionPropertyAllowedForEvent =
        __test__.validateConditionPropertyAllowedForEvent
      const property = {
        type: ConditionPropertyType.Title,
        allowedEvents: [EventType.Issue, EventType.PullRequest]
      }
      const path = ['rules', 'issue', 0]

      // when
      const act = () =>
        validateConditionPropertyAllowedForEvent(property as any, EventType.Issue, path)

      // then
      expect(act).not.toThrow()
    })

    // allowedEvents에 없는 이벤트면 에러를 던지는지 확인
    test('throws when property is not allowed for event', () => {
      // given
      const validateConditionPropertyAllowedForEvent =
        __test__.validateConditionPropertyAllowedForEvent
      const property = {
        type: ConditionPropertyType.BaseBranch,
        allowedEvents: [EventType.PullRequest]
      }
      const path = ['rules', 'issue', 0]

      // when
      const act = () =>
        validateConditionPropertyAllowedForEvent(property as any, EventType.Issue, path)

      // then
      expect(act).toThrow('Invalid property for event.')
    })
  })
})
