import { jest } from '@jest/globals'
import { EventType } from '../../../src/types/common.js'
import { ConditionPropertyType, ConditionValueTagType } from '../../../src/types/condition-enum.js'
import {
  defineConditionProperty,
  defineConditionValueTag
} from '../../../src/utils/condition-definition.utils.js'

describe('Unit | Utils: condition-definition.utils', () => {
  describe('defineConditionValueTag()', () => {
    // canParse 통과 시 parse/evaluate를 정상 연결하는지 확인
    test('returns tag definition that parses and evaluates values', () => {
      // given
      const canParseMock = jest.fn((raw: unknown) => typeof raw === 'string')
      const canParse = (raw: unknown): raw is string => canParseMock(raw)
      const parseExpected = jest.fn((raw: string) => raw.trim())
      const evaluate = jest.fn((actual: string, expected: string) => actual.includes(expected))

      const tag = defineConditionValueTag<string, string, string>({
        type: ConditionValueTagType.String,
        canParse,
        parse: parseExpected,
        evaluate
      })

      // when
      const parsed = tag.parse('  feature  ')
      const matched = tag.evaluate('feature-branch', parsed)

      // then
      expect(tag.type).toBe(ConditionValueTagType.String)
      expect(tag.canParse).toBe(canParse)
      expect(tag.evaluate).toBe(evaluate)
      expect(parsed).toBe('feature')
      expect(matched).toBe(true)
      expect(canParseMock).toHaveBeenCalledWith('  feature  ')
      expect(parseExpected).toHaveBeenCalledWith('  feature  ')
      expect(evaluate).toHaveBeenCalledWith('feature-branch', 'feature')
    })

    // canParse 실패 시 명확한 에러를 던지고 parse를 호출하지 않는지 확인
    test('throws with invalid type message when raw value cannot be parsed', () => {
      // given
      const canParseMock = jest.fn((_raw: unknown) => false)
      const canParse = (raw: unknown): raw is string => canParseMock(raw)
      const parseExpected = jest.fn((raw: string) => raw)
      const tag = defineConditionValueTag<string, string, string>({
        type: ConditionValueTagType.String,
        canParse,
        parse: parseExpected,
        evaluate: (actual, expected) => actual === expected
      })

      // when
      const act = () => tag.parse(123 as any)

      // then
      expect(act).toThrow('Invalid string value: 123')
      expect(canParseMock).toHaveBeenCalledWith(123)
      expect(parseExpected).not.toHaveBeenCalled()
    })
  })

  describe('defineConditionProperty()', () => {
    // evaluateTag 함수 입력을 그대로 사용하고 allowed 배열은 복제하는지 확인
    test('keeps function evaluator and clones allowed arrays', () => {
      // given
      const allowedEvents = [EventType.Issue, EventType.PullRequest] as const
      const allowedTags = [ConditionValueTagType.String] as const

      const resolve = jest.fn((_context: unknown, _conditionResolveService: unknown) => ['feature'])
      const evaluateTag = jest.fn((tag: any, resolved: string[], expected: any) =>
        resolved.some((actual) => tag.evaluate(actual, expected))
      )

      const property = defineConditionProperty({
        type: ConditionPropertyType.Title,
        allowedEvents,
        allowedTags,
        resolve,
        evaluateTag
      })

      const stringTag = {
        type: ConditionValueTagType.String,
        canParse: (raw: unknown): raw is string => typeof raw === 'string',
        parse: (raw: string) => raw,
        evaluate: (actual: string, expected: string) => actual === expected
      }

      // when
      const matched = property.evaluateTag(stringTag as any, ['feature'], 'feature')

      // then
      expect(property.allowedEvents).toEqual(allowedEvents)
      expect(property.allowedTags).toEqual(allowedTags)
      expect(property.allowedEvents).not.toBe(allowedEvents)
      expect(property.allowedTags).not.toBe(allowedTags)
      expect(matched).toBe(true)
      expect(evaluateTag).toHaveBeenCalledWith(stringTag, ['feature'], 'feature')
    })

    // evaluateTag 맵 입력 시 tag.type 기준으로 올바른 evaluator를 호출하는지 확인
    test('dispatches evaluator map by tag type', () => {
      // given
      const allowedEvents = [EventType.PullRequest] as const
      const allowedTags = [ConditionValueTagType.String, ConditionValueTagType.Regex] as const
      const evaluateString = jest.fn((tag: any, resolved: string[], expected: any) =>
        resolved.some((actual) => tag.evaluate(actual, expected))
      )
      const evaluateRegex = jest.fn((tag: any, resolved: string[], expected: any) =>
        resolved.some((actual) => tag.evaluate(actual, expected))
      )

      const property = defineConditionProperty<typeof allowedEvents, typeof allowedTags, string[]>({
        type: ConditionPropertyType.ChangedFiles,
        allowedEvents,
        allowedTags,
        resolve: async (_context, _conditionResolveService) => ['docs/README.md'],
        evaluateTag: {
          [ConditionValueTagType.String]: evaluateString,
          [ConditionValueTagType.Regex]: evaluateRegex
        }
      })

      const stringTag = {
        type: ConditionValueTagType.String,
        canParse: (raw: unknown): raw is string => typeof raw === 'string',
        parse: (raw: string) => raw,
        evaluate: (actual: string, expected: string) => actual === expected
      }
      const regexTag = {
        type: ConditionValueTagType.Regex,
        canParse: (raw: unknown): raw is string => typeof raw === 'string',
        parse: (raw: string) => new RegExp(raw),
        evaluate: (actual: string, expected: RegExp) => expected.test(actual)
      }

      // when
      const matchedByString = property.evaluateTag(
        stringTag as any,
        ['docs/README.md'],
        'docs/README.md'
      )
      const matchedByRegex = property.evaluateTag(regexTag as any, ['docs/README.md'], /README/)

      // then
      expect(typeof property.evaluateTag).toBe('function')
      expect(matchedByString).toBe(true)
      expect(matchedByRegex).toBe(true)
      expect(evaluateString).toHaveBeenCalledWith(stringTag, ['docs/README.md'], 'docs/README.md')
      expect(evaluateRegex).toHaveBeenCalledWith(regexTag, ['docs/README.md'], /README/)
    })

    // evaluator 맵에 없는 tag.type이 들어오면 에러를 던지는지 확인
    test('throws when evaluator map does not support incoming tag type', () => {
      // given
      const property = defineConditionProperty({
        type: ConditionPropertyType.Author,
        allowedEvents: [EventType.Issue] as const,
        allowedTags: [ConditionValueTagType.String] as const,
        resolve: (_context, _conditionResolveService) => 'octocat',
        evaluateTag: {
          [ConditionValueTagType.String]: (tag, resolved, expected) =>
            tag.evaluate(resolved, expected)
        }
      })

      const unsupportedTag = {
        type: ConditionValueTagType.Boolean,
        canParse: (raw: unknown): raw is boolean => typeof raw === 'boolean',
        parse: (raw: boolean) => raw,
        evaluate: (actual: boolean, expected: boolean) => actual === expected
      }

      // when
      const act = () => property.evaluateTag(unsupportedTag as any, 'octocat' as any, true as any)

      // then
      expect(act).toThrow('Unsupported tag: boolean')
    })
  })
})
