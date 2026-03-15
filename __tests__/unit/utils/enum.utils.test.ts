import { OnMissingLabel } from '../../../src/types/common.js'
import {
  getEnumEntryByValue,
  getEnumKeyByValue,
  getEnumValueByValue
} from '../../../src/utils/enum.utils.js'

// 숫자 enum 테스트용
enum NumEnum {
  One = 1,
  Two = 2
}

describe('Unit | Utils: enum.utils', () => {
  describe('getEnumKeyByValue()', () => {
    // 문자열 enum 값으로 키 반환 확인
    test('returns key for string enum value', () => {
      // given
      const value = 'create'

      // when
      const key = getEnumKeyByValue(OnMissingLabel, value)

      // then
      expect(key).toBe('Create')
    })

    // 숫자 enum 값으로 키 반환 확인 (리버스 매핑 고려)
    test('returns key for numeric enum value', () => {
      // given
      const value = 1

      // when
      const key = getEnumKeyByValue(NumEnum, value)

      // then
      expect(key).toBe('One')
    })

    // enum key 문자열(값이 아닌 이름)은 허용하지 않는지 확인
    test('throws when enum key is passed instead of enum value', () => {
      // given
      const value = 'Create'

      // when
      const act = () => getEnumKeyByValue(OnMissingLabel, value)

      // then
      expect(act).toThrow('Invalid enum value. Received: "Create"')
    })

    // 존재하지 않는 값일 때 에러 메시지 확인
    test('throws when value does not exist', () => {
      // given
      const value = 'invalid'

      // when
      const act = () => getEnumKeyByValue(OnMissingLabel, value)

      // then
      expect(act).toThrow('Invalid enum value. Received: "invalid"')
    })
  })

  describe('getEnumValueByValue()', () => {
    // 문자열 enum 값 그대로 반환 (키 탐색 후 동일 값 반환)
    test('returns value for string enum value', () => {
      // given
      const value = 'skip'

      // when
      const val = getEnumValueByValue(OnMissingLabel, value)

      // then
      expect(val).toBe('skip')
    })

    // 숫자 enum 값 그대로 반환
    test('returns value for numeric enum value', () => {
      // given
      const value = 2

      // when
      const val = getEnumValueByValue(NumEnum, value)

      // then
      expect(val).toBe(2)
    })

    // 런타임에서 undefined가 들어오면 에러를 던지는지 확인
    test('throws when value is undefined at runtime', () => {
      // given
      const value: any = undefined

      // when
      const act = () => getEnumValueByValue(OnMissingLabel, value)

      // then
      expect(act).toThrow('Invalid enum value. Received: "undefined"')
    })

    // 내부적으로 getEnumKeyByValue 에러 전파 확인
    test('throws when value does not exist', () => {
      // given
      const value = 'nope'

      // when
      const act = () => getEnumValueByValue(OnMissingLabel, value)

      // then
      expect(act).toThrow('Invalid enum value. Received: "nope"')
    })
  })

  describe('getEnumEntryByValue()', () => {
    // key, value 쌍이 올바르게 반환되는지 확인
    test('returns entry {key, value} for string enum', () => {
      // given
      const value = 'error'

      // when
      const entry = getEnumEntryByValue(OnMissingLabel, value)

      // then
      expect(entry).toEqual({ key: 'Error', value: 'error' })
    })

    // 숫자 enum에 대해서도 동일하게 작동
    test('returns entry {key, value} for numeric enum', () => {
      // given
      const value = 1

      // when
      const entry = getEnumEntryByValue(NumEnum, value)

      // then
      expect(entry).toEqual({ key: 'One', value: 1 })
    })

    // enum key 문자열(값이 아닌 이름)을 전달하면 에러를 던지는지 확인
    test('throws when enum key is passed instead of enum value', () => {
      // given
      const value = 'Error'

      // when
      const act = () => getEnumEntryByValue(OnMissingLabel, value)

      // then
      expect(act).toThrow('Invalid enum value. Received: "Error"')
    })

    // 존재하지 않는 값일 때 에러 발생
    test('throws when value does not exist', () => {
      // given
      const value = 999

      // when
      const act = () => getEnumEntryByValue(NumEnum, value)

      // then
      expect(act).toThrow('Invalid enum value. Received: "999"')
    })
  })
})
