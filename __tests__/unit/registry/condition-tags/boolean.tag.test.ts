import { BooleanTag } from '../../../../src/registry/condition-tags/boolean.tag.js'
import { ConditionValueTagType } from '../../../../src/types/condition-enum.js'

describe('Unit | Registry: boolean.tag', () => {
  describe('metadata', () => {
    // BooleanTag: type와 기본 메타데이터를 검증한다
    test('exposes correct type and metadata', () => {
      // given

      // when

      // then
      expect(BooleanTag.type).toBe(ConditionValueTagType.Boolean)
      expect(typeof BooleanTag.canParse).toBe('function')
      expect(typeof BooleanTag.parse).toBe('function')
      expect(typeof BooleanTag.evaluate).toBe('function')
    })
  })

  describe('canParse()', () => {
    // BooleanTag: canParse는 boolean만 허용한다
    test('accepts only boolean', () => {
      // given
      const truthy = true
      const falsy = false
      const notBooleanValues = [0, 1, 'true', null, undefined, {}, []]

      // when
      const canTrue = BooleanTag.canParse(truthy)
      const canFalse = BooleanTag.canParse(falsy)
      const results = notBooleanValues.map((v) => BooleanTag.canParse(v))

      // then
      expect(canTrue).toBe(true)
      expect(canFalse).toBe(true)
      expect(results.every((r) => r === false)).toBe(true)
    })

    // BooleanTag: boxed boolean 객체는 허용하지 않는다
    test('rejects boxed boolean object', () => {
      // given
      const boxedBoolean = new Boolean(true)

      // when
      const canParse = BooleanTag.canParse(boxedBoolean)

      // then
      expect(canParse).toBe(false)
    })
  })

  describe('parse()', () => {
    // BooleanTag: parse는 원시 값을 그대로 반환한다
    test('returns the raw value', () => {
      // given
      const raw = true

      // when
      const parsed = BooleanTag.parse(raw)

      // then
      expect(parsed).toBe(true)
    })

    // BooleanTag: false 값도 그대로 반환한다
    test('returns false as-is', () => {
      // given
      const raw = false

      // when
      const parsed = BooleanTag.parse(raw)

      // then
      expect(parsed).toBe(false)
    })
  })

  describe('evaluate()', () => {
    // BooleanTag: evaluate는 동치 비교를 수행한다
    test('performs strict equality', () => {
      // given
      const actualTrue = true
      const actualFalse = false

      // when
      const eqTrue = BooleanTag.evaluate(actualTrue, true)
      const eqFalse = BooleanTag.evaluate(actualFalse, false)
      const neq1 = BooleanTag.evaluate(actualTrue, false)
      const neq2 = BooleanTag.evaluate(actualFalse, true)

      // then
      expect(eqTrue).toBe(true)
      expect(eqFalse).toBe(true)
      expect(neq1).toBe(false)
      expect(neq2).toBe(false)
    })
  })
})
