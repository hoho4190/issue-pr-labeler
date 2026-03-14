import { jest } from '@jest/globals'
import { z, ZodError } from 'zod'
import { captureThrown } from '../../helpers/capture-thrown.helper.js'

const safeStringifyMock = jest.fn()

jest.unstable_mockModule('../../../src/utils/string.utils.js', () => ({
  safeStringify: (...args: unknown[]) => safeStringifyMock(...args)
}))

type ZodUtilsModule = typeof import('../../../src/utils/zod.utils.js')
type ZodContextErrorInstance = InstanceType<ZodUtilsModule['ZodContextError']>

let ZodContextError: ZodUtilsModule['ZodContextError']
let parseWithContext: ZodUtilsModule['parseWithContext']
let safeParseWithContext: ZodUtilsModule['safeParseWithContext']

describe('Unit | Utils: zod.utils', () => {
  beforeAll(async () => {
    const module = await import('../../../src/utils/zod.utils.js')
    ZodContextError = module.ZodContextError
    parseWithContext = module.parseWithContext
    safeParseWithContext = module.safeParseWithContext
  })

  beforeEach(() => {
    safeStringifyMock.mockReset()
    safeStringifyMock.mockReturnValue('mocked-string')
  })

  describe('ZodContextError', () => {
    // safeStringify 모킹 결과가 에러 메시지에 반영되는지 확인
    test('creates message with mocked stringify', () => {
      // given
      const context = { feature: 'test' }
      const errors = [
        {
          code: 'custom',
          path: ['field'],
          message: 'Invalid value',
          expected: 'string',
          received: 'number'
        }
      ]
      const expectedPayload = { context, errors }
      safeStringifyMock.mockReturnValue('stringified-payload')

      // when
      const error = new ZodContextError(context, errors)

      // then
      expect(error).toBeInstanceOf(ZodContextError)
      expect(error.message).toContain('stringified-payload')
      expect(error.context).toEqual(context)
      expect(error.errors).toEqual(errors)
      expect(safeStringifyMock).toHaveBeenCalledWith(expectedPayload, 2)
    })
  })

  describe('parseWithContext()', () => {
    // 유효한 입력이면 파싱 결과를 반환하는지 확인
    test('returns parsed data on success', () => {
      // given
      const schema = z.object({ name: z.string() })
      const data = { name: 'Codex' }
      const context = { requestId: 'abc' }

      // when
      const result = parseWithContext(schema, data, context)

      // then
      expect(result).toEqual(data)
      expect(safeStringifyMock).not.toHaveBeenCalled()
    })

    // ZodError 발생 시 ZodContextError로 감싸서 던지는지 확인
    test('throws ZodContextError when validation fails', () => {
      // given
      const schema = z.object({ age: z.number() })
      const invalidData = { age: 'not-a-number' }
      const context = { entity: 'user' }

      // when
      const thrown = captureThrown<ZodContextErrorInstance>(() =>
        parseWithContext(schema, invalidData, context)
      )

      // then
      expect(thrown).toBeInstanceOf(ZodContextError)
      expect(thrown.errors[0]?.code).toBe('invalid_type')
      expect(thrown.errors[0]?.path).toEqual(['age'])
      expect(thrown.errors[0]?.expected).toBe('number')
      expect(thrown.context).toEqual(context)
      expect(safeStringifyMock).toHaveBeenCalledWith({ context, errors: thrown.errors }, 2)
    })

    // 포맷된 에러에 expected/received 정보가 포함되는지 확인
    test('captures expected and received when provided by issues', () => {
      // given
      const context = { entity: 'custom' }
      const customIssue = {
        code: 'invalid_type',
        path: ['item', Symbol('skip'), 0],
        message: 'Wrong type',
        expected: 'array',
        received: 'string'
      }
      const zodError = new ZodError([customIssue as any])
      const fakeSchema = {
        parse: () => {
          throw zodError
        }
      } as unknown as z.ZodType<unknown>

      // when
      const thrown = captureThrown<ZodContextErrorInstance>(() =>
        parseWithContext(fakeSchema, {}, context)
      )

      // then
      expect(thrown).toBeInstanceOf(ZodContextError)
      expect(thrown.errors[0]?.expected).toBe('array')
      expect(thrown.errors[0]?.received).toBe('string')
      expect(thrown.errors[0]?.path).toEqual(['item', 0])
      expect(safeStringifyMock).toHaveBeenCalledWith({ context, errors: thrown.errors }, 2)
    })

    // ZodError가 아닌 에러는 그대로 던지는지 확인
    test('rethrows non-Zod errors', () => {
      // given
      const customError = new Error('boom')
      const fakeSchema = {
        parse: () => {
          throw customError
        }
      } as unknown as z.ZodType<unknown>
      const context = { operation: 'test' }
      const callCountBefore = safeStringifyMock.mock.calls.length

      // when
      const act = () => parseWithContext(fakeSchema, 'data', context)

      // then
      expect(act).toThrow(customError)
      expect(safeStringifyMock.mock.calls.length).toBe(callCountBefore)
    })
  })

  describe('safeParseWithContext()', () => {
    // 성공 시 성공 결과 객체를 반환하는지 확인
    test('returns success result when parsing succeeds', () => {
      // given
      const schema = z.object({ active: z.boolean() })
      const data = { active: true }
      const context = { source: 'cli' }

      // when
      const result = safeParseWithContext(schema, data, context)

      // then
      expect(result).toEqual({ success: true, data })
      expect(safeStringifyMock).not.toHaveBeenCalled()
    })

    // 실패 시 ZodContextError를 포함한 결과를 반환하는지 확인
    test('returns error result when parsing fails', () => {
      // given
      const schema = z.object({ count: z.number().min(2) })
      const invalidData = { count: 1 }
      const context = { source: 'api' }
      safeStringifyMock.mockReturnValue('context-error')

      // when
      const result = safeParseWithContext(schema, invalidData, context)

      // then
      expect(result.success).toBe(false)
      if (result.success) throw new Error('Expected safe parsing to fail')

      expect(result.error).toBeInstanceOf(ZodContextError)
      expect(result.error.errors[0]?.code).toBe('too_small')
      expect(result.error.errors[0]?.path).toEqual(['count'])
      expect(result.error.context).toEqual(context)
      expect(result.error.message).toContain('context-error')
      expect(safeStringifyMock).toHaveBeenCalledWith({ context, errors: result.error.errors }, 2)
    })
  })
})
