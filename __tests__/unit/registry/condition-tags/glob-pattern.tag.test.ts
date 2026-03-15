import { GlobPatternTag } from '../../../../src/registry/condition-tags/glob-pattern.tag.js'
import { ConditionValueTagType } from '../../../../src/types/condition-enum.js'

describe('Unit | Registry: glob-pattern.tag', () => {
  describe('metadata', () => {
    // GlobPatternTag: type와 기본 메타데이터를 검증한다
    test('exposes correct name and metadata', () => {
      // given

      // when

      // then
      expect(GlobPatternTag.type).toBe(ConditionValueTagType.GlobPattern)
      expect(typeof GlobPatternTag.canParse).toBe('function')
      expect(typeof GlobPatternTag.parse).toBe('function')
      expect(typeof GlobPatternTag.evaluate).toBe('function')
    })
  })

  describe('canParse()', () => {
    // GlobPatternTag: canParse는 glob 패턴 문자열만 허용한다
    test('accepts only glob pattern strings', () => {
      // given
      const valid = ['**/*.ts', 'src/**/test?.ts', '!**/*.d.ts']
      const invalid = ['plain.txt', 'no-glob', 123, true, null]

      // when
      const validResults = valid.map((v) => GlobPatternTag.canParse(v))
      const invalidResults = invalid.map((v) => GlobPatternTag.canParse(v))

      // then
      expect(validResults.every(Boolean)).toBe(true)
      expect(invalidResults.every((r) => r === false)).toBe(true)
    })

    // GlobPatternTag: boxed string 객체는 허용하지 않는다
    test('rejects boxed string object', () => {
      // given
      const boxedString = new String('**/*.ts')

      // when
      const canParse = GlobPatternTag.canParse(boxedString)

      // then
      expect(canParse).toBe(false)
    })
  })

  describe('parse()', () => {
    // GlobPatternTag: parse는 원시 값을 그대로 반환한다
    test('returns the raw string', () => {
      // given
      const raw = '**/*.md'

      // when
      const parsed = GlobPatternTag.parse(raw)

      // then
      expect(parsed).toBe(raw)
    })

    // GlobPatternTag: glob 패턴이 아닌 문자열은 parse 시 에러를 던진다
    test('throws on non-glob string', () => {
      // given
      const raw = 'plain.txt'

      // when
      const act = () => GlobPatternTag.parse(raw)

      // then
      expect(act).toThrow(/Invalid glob-pattern value: plain.txt/)
    })
  })

  describe('evaluate()', () => {
    // GlobPatternTag: evaluate는 picomatch를 통해 매칭 여부를 판단한다
    test('matches using picomatch', () => {
      // given
      const expected = '**/*.ts'
      const actualMatch = 'src/app.ts'
      const actualNoMatch = 'src/app.js'

      // when
      const isMatch = GlobPatternTag.evaluate(actualMatch, expected)
      const notMatch = GlobPatternTag.evaluate(actualNoMatch, expected)

      // then
      expect(isMatch).toBe(true)
      expect(notMatch).toBe(false)
    })

    // GlobPatternTag: 부정 glob 패턴도 올바르게 평가한다
    test('supports negated glob pattern', () => {
      // given
      const expected = '!**/*.d.ts'
      const actualMatch = 'src/app.ts'
      const actualNoMatch = 'src/types.d.ts'

      // when
      const isMatch = GlobPatternTag.evaluate(actualMatch, expected)
      const notMatch = GlobPatternTag.evaluate(actualNoMatch, expected)

      // then
      expect(isMatch).toBe(true)
      expect(notMatch).toBe(false)
    })
  })
})
