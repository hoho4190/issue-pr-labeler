import {
  nullOrEmptyToUndefined,
  safeStringify,
  safeStringifyWithLimit
} from '../../../src/utils/string.utils.js'

describe('Unit | Utils: string.utils', () => {
  describe('nullOrEmptyToUndefined()', () => {
    // 빈 문자열('')이면 undefined를 반환하는지 확인
    test('returns undefined for empty string', () => {
      // given
      const v = ''

      // when
      const r = nullOrEmptyToUndefined(v)

      // then
      expect(r).toBeUndefined()
    })

    // null이면 undefined를 반환하는지 확인
    test('returns undefined for null', () => {
      // given
      const v = null

      // when
      const r = nullOrEmptyToUndefined(v)

      // then
      expect(r).toBeUndefined()
    })

    // undefined는 그대로 undefined를 유지하는지 확인
    test('passes through undefined unchanged', () => {
      // given
      const v = undefined

      // when
      const r = nullOrEmptyToUndefined(v)

      // then
      expect(r).toBeUndefined()
    })

    // 비어있지 않은 문자열은 원본을 반환하는지 확인
    test('returns original string when non-empty', () => {
      // given
      const v = 'hello'

      // when
      const r = nullOrEmptyToUndefined(v)

      // then
      expect(r).toBe('hello')
    })

    // 공백만 있는 문자열은 트림하지 않고 그대로 반환하는지 확인
    test('does not trim whitespace-only strings', () => {
      // given
      const v = ' '

      // when
      const r = nullOrEmptyToUndefined(v)

      // then
      expect(r).toBe(' ')
    })
  })

  describe('safeStringifyWithLimit()', () => {
    // 인자를 생략하면 기본 길이 제한을 사용하는지 확인
    test('uses default max length when not provided', () => {
      // given
      const value = 'short'

      // when
      const r = safeStringifyWithLimit(value)

      // then
      expect(r).toBe('short')
    })

    // 지정한 최대 길이를 넘지 않으면 원본 문자열을 반환하는지 확인
    test('returns full string when under limit', () => {
      // given
      const value = { message: 'short' }

      // when
      const r = safeStringifyWithLimit(value, 100)

      // then
      expect(r).toBe('{"message":"short"}')
    })

    // 길이가 제한값과 같으면 잘라내지 않는지 확인
    test('does not truncate when length is exactly maxLength', () => {
      // given
      const value = '12345'

      // when
      const r = safeStringifyWithLimit(value, 5)

      // then
      expect(r).toBe('12345')
    })

    // 최대 길이를 초과하면 잘라내고 "..."을 붙이는지 확인
    test('truncates string when exceeding limit', () => {
      // given
      const value = 'x'.repeat(50)

      // when
      const r = safeStringifyWithLimit(value, 10)

      // then
      expect(r).toBe('xxxxxxxxxx...')
    })

    // 들여쓰기(space) 옵션을 전달하면 포맷된 문자열을 반환하는지 확인
    test('applies indentation when space is provided', () => {
      // given
      const value = { a: 1 }

      // when
      const r = safeStringifyWithLimit(value, 100, 2)

      // then
      expect(r).toBe('{\n  "a": 1\n}')
    })

    // 직렬화 중 오류가 발생하면 "[Unserializable]"을 반환하는지 확인
    test('returns placeholder when serialization fails', () => {
      // given
      const value = {
        toJSON() {
          // 직렬화 중 오류 시뮬레이션
          throw new Error('nope')
        }
      }

      // when
      const r = safeStringifyWithLimit(value, 100)

      // then
      expect(r).toBe('[Unserializable]')
    })
  })

  describe('safeStringify()', () => {
    // 문자열이면 그대로 반환하는지 확인
    test('returns input string unchanged', () => {
      // given
      const v = 'already-string'

      // when
      const r = safeStringify(v)

      // then
      expect(r).toBe('already-string')
    })

    // 숫자를 문자열로 변환하는지 확인
    test('stringifies numbers correctly', () => {
      // given
      const v = 42

      // when
      const r = safeStringify(v)

      // then
      expect(r).toBe('42')
    })

    // 불리언을 문자열로 변환하는지 확인
    test('stringifies booleans correctly', () => {
      // given
      const v = false

      // when
      const r = safeStringify(v)

      // then
      expect(r).toBe('false')
    })

    // null은 JSON 표기 문자열로 직렬화하는지 확인
    test('stringifies null as JSON null', () => {
      // given
      const v = null

      // when
      const r = safeStringify(v)

      // then
      expect(r).toBe('null')
    })

    // 최상위 BigInt를 안전하게 직렬화하는지 확인
    test('stringifies top-level bigint safely', () => {
      // given
      const v = BigInt(123)

      // when
      const r = safeStringify(v)

      // then
      expect(r).toBe('"123"')
    })

    // 다양한 객체 타입을 안전하게 직렬화하는지 확인
    test('serializes complex objects safely', () => {
      // given
      class CustomToString {
        constructor(public value: string) {}

        toString() {
          return `Custom:${this.value}`
        }
      }

      class BracketToString {
        constructor(public value: string) {}

        toString() {
          return '[object Persist]'
        }
      }

      class ThrowingToString {
        toString() {
          throw new Error('boom')
        }
      }

      class DefaultToString {
        constructor(public value: string) {}
      }

      class NonCallableToString {
        public toString: unknown

        constructor(public value: string) {
          this.toString = 123
        }
      }

      const custom = new CustomToString('value')
      const bracket = new BracketToString('persist')
      const throwing = new ThrowingToString()
      const defaultToString = new DefaultToString('default')
      const nonCallable = new NonCallableToString('non-callable')
      const map = new Map([['a', 1]])
      const set = new Set(['x', 'y'])
      const regex = /abc/gi
      const error = new Error('fail')
      error.stack = 'stack-trace'
      const big = BigInt(123)

      const arr = ['keep', 'order']

      const obj: Record<string, unknown> = {
        custom,
        bracket,
        throwing,
        defaultToString,
        nonCallable,
        map,
        set,
        regex,
        error,
        big,
        arr,
        nested: { value: 'inner' }
      }

      obj.circular = obj

      // when
      const r = safeStringify(obj, 2)

      // then
      const parsed = JSON.parse(r)
      expect(parsed.custom).toBe('Custom:value')
      expect(parsed.bracket).toEqual({ value: 'persist' })
      expect(parsed.throwing).toBe('[toString-error]')
      expect(parsed.defaultToString).toEqual({ value: 'default' })
      expect(parsed.nonCallable).toEqual({
        value: 'non-callable',
        toString: 123
      })
      expect(parsed.map).toEqual({ a: 1 })
      expect(parsed.set).toEqual(['x', 'y'])
      expect(parsed.regex).toBe('/abc/gi')
      expect(parsed.error).toEqual({
        name: 'Error',
        message: 'fail',
        stack: 'stack-trace'
      })
      expect(parsed.big).toBe('123')
      expect(parsed.arr).toEqual(['keep', 'order'])
      expect(parsed.nested).toEqual({ value: 'inner' })
      expect(parsed.circular).toBe('[Circular]')
    })
  })
})
