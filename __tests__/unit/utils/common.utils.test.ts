import { jest } from '@jest/globals'

const safeStringifyMock = jest.fn()

jest.unstable_mockModule('../../../src/utils/string.utils.js', () => ({
  safeStringify: (...args: unknown[]) => safeStringifyMock(...args)
}))

type CommonUtilsModule = typeof import('../../../src/utils/common.utils.js')

let assertNonEmptyString: CommonUtilsModule['assertNonEmptyString']
let extractHttpStatus: CommonUtilsModule['extractHttpStatus']

describe('Unit | Utils: common.utils', () => {
  beforeAll(async () => {
    const module = await import('../../../src/utils/common.utils.js')
    assertNonEmptyString = module.assertNonEmptyString
    extractHttpStatus = module.extractHttpStatus
  })

  beforeEach(() => {
    safeStringifyMock.mockReset()
    safeStringifyMock.mockImplementation((value: unknown) => String(value))
  })

  describe('assertNonEmptyString()', () => {
    // 공백 제거 후 비어있지 않은 문자열은 통과하는지 확인
    test('passes for non-empty trimmed string', () => {
      // given
      const key = 'name'
      const value = '  Hello '

      // when
      const act = () => assertNonEmptyString(value, key)

      // then
      expect(act).not.toThrow()
    })

    // 문자열 타입이 아닐 때 에러 발생하는지 확인
    test('throws when value is not a string', () => {
      // given
      const key = 'name'
      const value: unknown = 123

      // when
      const act = () => assertNonEmptyString(value, key)

      // then
      expect(act).toThrow(/\[name\] Must be a string\./)
      expect(safeStringifyMock).toHaveBeenCalledWith(value)
    })

    // 공백만 있는 문자열일 때 에러 발생하는지 확인
    test('throws when string is empty after trim', () => {
      // given
      const key = 'name'
      const value = '   '

      // when
      const act = () => assertNonEmptyString(value, key)

      // then
      expect(act).toThrow(/\[name\] Must be a non-empty string\./)
      expect(safeStringifyMock).toHaveBeenCalledWith(value)
    })

    // 줄바꿈/탭 포함 공백 문자열일 때도 에러 발생하는지 확인
    test('throws when string contains only whitespace characters', () => {
      // given
      const key = 'name'
      const value = '\n\t  '

      // when
      const act = () => assertNonEmptyString(value, key)

      // then
      expect(act).toThrow(/\[name\] Must be a non-empty string\./)
    })
  })

  describe('extractHttpStatus()', () => {
    // 최상위 status가 숫자면 해당 값을 반환하는지 확인
    test('returns status when top-level number', () => {
      // given
      const error = { status: 404 }

      // when
      const status = extractHttpStatus(error)

      // then
      expect(status).toBe(404)
    })

    // 최상위 status와 cause.status가 모두 숫자면 최상위 status를 우선 반환하는지 확인
    test('prefers top-level status over nested cause.status', () => {
      // given
      const error = { status: 400, cause: { status: 500 } }

      // when
      const status = extractHttpStatus(error)

      // then
      expect(status).toBe(400)
    })

    // 최상위 status가 숫자가 아니고, cause.status가 숫자면 해당 값을 반환하는지 확인
    test('returns nested cause.status when number', () => {
      // given
      const error = { status: 'E', cause: { status: 500 } }

      // when
      const status = extractHttpStatus(error)

      // then
      expect(status).toBe(500)
    })

    // status가 없거나 숫자가 아니면 null 반환하는지 확인
    test('returns null when no numeric status', () => {
      // given
      const error1 = { message: 'oops' }
      const error2 = { status: 'x', cause: { status: 'y' } }

      // when
      const status1 = extractHttpStatus(error1)
      const status2 = extractHttpStatus(error2)

      // then
      expect(status1).toBeNull()
      expect(status2).toBeNull()
    })

    // status가 0이어도 숫자면 그대로 반환하는지 확인
    test('returns 0 when status is zero', () => {
      // given
      const error = { status: 0 }

      // when
      const status = extractHttpStatus(error)

      // then
      expect(status).toBe(0)
    })

    // 비객체 입력 또는 null 입력 시 null 반환하는지 확인
    test('returns null for non-object input', () => {
      // given
      const err1: any = null
      const err2: any = 'error'

      // when
      const status1 = extractHttpStatus(err1)
      const status2 = extractHttpStatus(err2)

      // then
      expect(status1).toBeNull()
      expect(status2).toBeNull()
    })
  })
})
