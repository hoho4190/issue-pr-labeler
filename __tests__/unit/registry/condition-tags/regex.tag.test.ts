import { RegexTag } from '../../../../src/registry/condition-tags/regex.tag.js'
import { ConditionValueTagType } from '../../../../src/types/condition-enum.js'

describe('Unit | Registry: regex.tag', () => {
  describe('metadata', () => {
    // RegexTag: type와 기본 메타데이터를 검증한다
    test('exposes correct type and metadata', () => {
      // given

      // when

      // then
      expect(RegexTag.type).toBe(ConditionValueTagType.Regex)
      expect(typeof RegexTag.canParse).toBe('function')
      expect(typeof RegexTag.parse).toBe('function')
      expect(typeof RegexTag.evaluate).toBe('function')
    })
  })

  describe('canParse()', () => {
    // RegexTag: canParse는 '/pattern/flags' 형태만 허용한다
    test("validates '/pattern/flags' strings", () => {
      // given
      const valid = ['/foo/', '/^abc$/i', '/[a-z]+/g']
      const invalid = ['foo', '/[unterminated/', 'foo/bar', '/foo/gg', 123, true]

      // when
      const validResults = valid.map((v) => RegexTag.canParse(v))
      const invalidResults = invalid.map((v) => RegexTag.canParse(v))

      // then
      expect(validResults.every(Boolean)).toBe(true)
      expect(invalidResults.every((r) => r === false)).toBe(true)
    })

    // RegexTag: boxed string 객체는 허용하지 않는다
    test('rejects boxed string object', () => {
      // given
      const boxedString = new String('/foo/')

      // when
      const canParse = RegexTag.canParse(boxedString)

      // then
      expect(canParse).toBe(false)
    })
  })

  describe('parse()', () => {
    // RegexTag: parse는 RegExp로 변환하며 패턴과 플래그를 보존한다
    test('returns RegExp with correct source and flags', () => {
      // given
      const raw = '/^ab+c$/im'

      // when
      const re = RegexTag.parse(raw)

      // then
      expect(re).toBeInstanceOf(RegExp)
      expect(re.source).toBe('^ab+c$')
      expect(re.flags).toBe('im')
    })

    // RegexTag: 잘못된 문자열은 parse 시 에러를 던진다
    test('throws on invalid regex string', () => {
      // given
      const raw = 'not-a-regex'

      // when
      const act = () => RegexTag.parse(raw)

      // then
      expect(act).toThrow(/Invalid regex value: not-a-regex/)
    })

    // RegexTag: 잘못된 플래그 조합은 parse 시 에러를 던진다
    test('throws on invalid regex flags', () => {
      // given
      const raw = '/foo/gg'

      // when
      const act = () => RegexTag.parse(raw)

      // then
      expect(act).toThrow(/Invalid regex value: \/foo\/gg/)
    })
  })

  describe('evaluate()', () => {
    // RegexTag: evaluate는 expected RegExp.test(actual)을 호출한다
    test('uses RegExp.test(actual)', () => {
      // given
      const expected = /hello/i
      const actual1 = 'Hello world'
      const actual2 = 'world'

      // when
      const match = RegexTag.evaluate(actual1, expected)
      const notMatch = RegexTag.evaluate(actual2, expected)

      // then
      expect(match).toBe(true)
      expect(notMatch).toBe(false)
    })
  })
})
