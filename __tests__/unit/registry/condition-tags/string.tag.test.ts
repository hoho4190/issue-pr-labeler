import { StringTag } from '../../../../src/registry/condition-tags/string.tag.js'
import { ConditionValueTagType } from '../../../../src/types/condition-enum.js'

describe('Unit | Registry: string.tag', () => {
  describe('metadata', () => {
    // StringTag: type와 기본 메타데이터를 검증한다
    test('exposes correct type and metadata', () => {
      // given

      // when

      // then
      expect(StringTag.type).toBe(ConditionValueTagType.String)
      expect(typeof StringTag.canParse).toBe('function')
      expect(typeof StringTag.parse).toBe('function')
      expect(typeof StringTag.evaluate).toBe('function')
    })
  })

  describe('canParse()', () => {
    // StringTag: canParse는 string만 허용한다
    test('accepts only string', () => {
      // given
      const good = 'hello'
      const notStringValues = [true, 1, null, undefined, {}, []]

      // when
      const can = StringTag.canParse(good)
      const results = notStringValues.map((v) => StringTag.canParse(v))

      // then
      expect(can).toBe(true)
      expect(results.every((r) => r === false)).toBe(true)
    })

    // StringTag: boxed string 객체는 허용하지 않는다
    test('rejects boxed string object', () => {
      // given
      const boxedString = new String('hello')

      // when
      const canParse = StringTag.canParse(boxedString)

      // then
      expect(canParse).toBe(false)
    })
  })

  describe('parse()', () => {
    // StringTag: parse는 원시 값을 그대로 반환한다
    test('returns the raw value', () => {
      // given
      const raw = 'world'

      // when
      const parsed = StringTag.parse(raw)

      // then
      expect(parsed).toBe('world')
    })

    // StringTag: 빈 문자열도 그대로 반환한다
    test('returns empty string as-is', () => {
      // given
      const raw = ''

      // when
      const parsed = StringTag.parse(raw)

      // then
      expect(parsed).toBe('')
    })
  })

  describe('evaluate()', () => {
    // StringTag: evaluate는 동치 비교를 수행한다
    test('performs strict equality', () => {
      // given
      const actual = 'abc'

      // when
      const eq = StringTag.evaluate(actual, 'abc')
      const neq = StringTag.evaluate(actual, 'ABD')

      // then
      expect(eq).toBe(true)
      expect(neq).toBe(false)
    })
  })
})
