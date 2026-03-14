import { jest } from '@jest/globals'
import { NumericComparisonTag } from '../../../../src/registry/condition-tags/numeric-comparison.tag.js'
import { ConditionValueTagType } from '../../../../src/types/condition-enum.js'

describe('Unit | Registry: numeric-comparison.tag', () => {
  describe('metadata', () => {
    // NumericComparisonTag: type와 기본 메타데이터를 검증한다
    test('exposes correct type and metadata', () => {
      // given
      // when
      // then
      expect(NumericComparisonTag.type).toBe(ConditionValueTagType.NumericComparison)
      expect(typeof NumericComparisonTag.canParse).toBe('function')
      expect(typeof NumericComparisonTag.parse).toBe('function')
      expect(typeof NumericComparisonTag.evaluate).toBe('function')
    })
  })

  describe('canParse()', () => {
    // NumericComparisonTag: canParse는 연산자+숫자 형식만 허용한다
    test('validates operator + number format', () => {
      // given
      const valid = ['>1', '>= 10', '<5', '<=42', '==0', '!= 3']
      const invalid = ['>>2', '=>2', '>=-1', '>= 1.5', 'abc', '  ', '>= x', 10]

      // when
      const validResults = valid.map((v) => NumericComparisonTag.canParse(v))
      const invalidResults = invalid.map((v) => NumericComparisonTag.canParse(v))

      // then
      expect(validResults.every(Boolean)).toBe(true)
      expect(invalidResults.every((r) => r === false)).toBe(true)
    })

    // NumericComparisonTag: boxed string 객체는 허용하지 않는다
    test('rejects boxed string object', () => {
      // given
      const boxedString = new String('>= 10')

      // when
      const canParse = NumericComparisonTag.canParse(boxedString)

      // then
      expect(canParse).toBe(false)
    })
  })

  describe('parse()', () => {
    // NumericComparisonTag: parse는 연산자와 숫자를 구조화한다
    test('extracts operator and numeric value', () => {
      // given
      const raw = '>= 100'

      // when
      const parsed = NumericComparisonTag.parse(raw)

      // then
      expect(parsed).toEqual({ operator: '>=', value: 100 })
    })

    // NumericComparisonTag: 공백 없는 표현식도 파싱한다
    test('parses expression without whitespace', () => {
      // given
      const raw = '!=0'

      // when
      const parsed = NumericComparisonTag.parse(raw)

      // then
      expect(parsed).toEqual({ operator: '!=', value: 0 })
    })

    // NumericComparisonTag: 잘못된 형식은 parse 시 에러를 던진다
    test('throws on invalid expression', () => {
      // given
      const bad = '>= x'

      // when
      const act = () => NumericComparisonTag.parse(bad)

      // then
      expect(act).toThrow(/Invalid numeric-comparison value: >= x/)
    })

    // NumericComparisonTag: 정규식 매칭이 비정상적으로 실패할 때 에러를 던진다
    test('throws when regex match unexpectedly fails', () => {
      // given
      const raw = '>= 1'
      using matchSpy = jest
        .spyOn(String.prototype, 'match')
        .mockReturnValueOnce(null as unknown as RegExpMatchArray)

      // when
      const act = () => NumericComparisonTag.parse(raw)

      // then
      expect(act).toThrow(/Expected comparison operator and number: >= 1/)
      expect(matchSpy).toHaveBeenCalledWith(expect.any(RegExp))
    })
  })

  describe('evaluate()', () => {
    // NumericComparisonTag: evaluate는 각 연산자에 맞게 비교한다
    test('compares according to operator', () => {
      // given
      const gt = NumericComparisonTag.parse('> 5')
      const gte = NumericComparisonTag.parse('>= 5')
      const lt = NumericComparisonTag.parse('< 5')
      const lte = NumericComparisonTag.parse('<= 5')
      const eq = NumericComparisonTag.parse('== 5')
      const neq = NumericComparisonTag.parse('!= 5')

      // when
      const gtRes = NumericComparisonTag.evaluate(6, gt)
      const gteRes1 = NumericComparisonTag.evaluate(5, gte)
      const gteRes2 = NumericComparisonTag.evaluate(4, gte)
      const ltRes = NumericComparisonTag.evaluate(4, lt)
      const lteRes1 = NumericComparisonTag.evaluate(5, lte)
      const lteRes2 = NumericComparisonTag.evaluate(6, lte)
      const eqRes1 = NumericComparisonTag.evaluate(5, eq)
      const eqRes2 = NumericComparisonTag.evaluate(4, eq)
      const neqRes1 = NumericComparisonTag.evaluate(5, neq)
      const neqRes2 = NumericComparisonTag.evaluate(4, neq)

      // then
      expect(gtRes).toBe(true)
      expect(gteRes1).toBe(true)
      expect(gteRes2).toBe(false)
      expect(ltRes).toBe(true)
      expect(lteRes1).toBe(true)
      expect(lteRes2).toBe(false)
      expect(eqRes1).toBe(true)
      expect(eqRes2).toBe(false)
      expect(neqRes1).toBe(false)
      expect(neqRes2).toBe(true)
    })
  })
})
