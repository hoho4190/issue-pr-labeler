import { jest } from '@jest/globals'
import { LabelAction, LabelActionReason, LabelActionResult } from '../../../src/types/labels.js'

const assertNonEmptyStringMock = jest.fn()

jest.unstable_mockModule('../../../src/utils/common.utils.js', () => ({
  assertNonEmptyString: (...args: unknown[]) => assertNonEmptyStringMock(...args)
}))

type LabelUtilsModule = typeof import('../../../src/utils/label.utils.js')

let stringifyLabels: LabelUtilsModule['stringifyLabels']
let makeLabel: LabelUtilsModule['makeLabel']
let makeLabels: LabelUtilsModule['makeLabels']
let makeOperationResult: LabelUtilsModule['makeOperationResult']

describe('Unit | Utils: label.utils', () => {
  beforeAll(async () => {
    const module = await import('../../../src/utils/label.utils.js')
    stringifyLabels = module.stringifyLabels
    makeLabel = module.makeLabel
    makeLabels = module.makeLabels
    makeOperationResult = module.makeOperationResult
  })

  beforeEach(() => {
    assertNonEmptyStringMock.mockReset()
    assertNonEmptyStringMock.mockImplementation(() => undefined)
  })

  describe('stringifyLabels()', () => {
    // 레이블 배열을 "[name, name]" 형태 문자열로 변환하는지 확인
    test('returns bracketed comma-separated names', () => {
      // given
      const labels = [
        { name: 'bug', norm: 'bug' },
        { name: 'enhancement', norm: 'enhancement' }
      ]

      // when
      const str = stringifyLabels(labels)

      // then
      expect(str).toBe('[bug, enhancement]')
    })

    // name을 사용해 직렬화하고 norm은 사용하지 않는지 확인
    test('uses label name (not norm) when stringifying', () => {
      // given
      const labels = [{ name: 'Bug', norm: 'bug' }]

      // when
      const str = stringifyLabels(labels)

      // then
      expect(str).toBe('[Bug]')
    })

    // 빈 배열 처리 시 "[]" 반환 확인
    test('handles empty array', () => {
      // given
      const labels: Array<{ name: string; norm: string }> = []

      // when
      const str = stringifyLabels(labels)

      // then
      expect(str).toBe('[]')
    })
  })

  describe('makeLabel()', () => {
    // 입력 문자열을 trim하여 name을 만들고, 소문자 norm을 생성하는지 확인
    test('trims name and generates lowercased norm', () => {
      // given
      const raw = '  Bug '

      // when
      const label = makeLabel(raw)

      // then
      expect(label).toEqual({ name: 'Bug', norm: 'bug' })
      expect(assertNonEmptyStringMock).toHaveBeenCalledWith(raw, 'makeLabel')
    })

    // 문자열 내부 공백은 유지하고 양끝 공백만 제거하는지 확인
    test('keeps internal spaces while trimming both ends', () => {
      // given
      const raw = '  good first issue  '

      // when
      const label = makeLabel(raw)

      // then
      expect(label).toEqual({
        name: 'good first issue',
        norm: 'good first issue'
      })
      expect(assertNonEmptyStringMock).toHaveBeenCalledWith(raw, 'makeLabel')
    })

    // 문자열이 아닐 때 에러 발생하는지 확인
    test('throws when input is not a string', () => {
      // given
      const notString: any = 123
      assertNonEmptyStringMock.mockImplementation(() => {
        throw new Error('[makeLabel] Must be a string.')
      })

      // when
      const act = () => makeLabel(notString)

      // then
      expect(act).toThrow(/\[makeLabel\] Must be a string\./)
    })

    // 공백만 있는 문자열일 때 에러 발생하는지 확인
    test('throws when input is empty or whitespace', () => {
      // given
      const raw = '   '
      assertNonEmptyStringMock.mockImplementation(() => {
        throw new Error('[makeLabel] Must be a non-empty string.')
      })

      // when
      const act = () => makeLabel(raw)

      // then
      expect(act).toThrow(/\[makeLabel\] Must be a non-empty string\./)
    })
  })

  describe('makeLabels()', () => {
    // 여러 문자열을 Label 배열로 변환하는지 확인
    test('maps strings to Label array', () => {
      // given
      const raws = [' A', 'b ', ' C ']

      // when
      const labels = makeLabels(raws)

      // then
      expect(labels).toEqual([
        { name: 'A', norm: 'a' },
        { name: 'b', norm: 'b' },
        { name: 'C', norm: 'c' }
      ])
    })

    // 빈 배열을 전달하면 빈 배열을 반환하는지 확인
    test('returns empty array for empty input', () => {
      // given
      const raws: string[] = []

      // when
      const labels = makeLabels(raws)

      // then
      expect(labels).toEqual([])
    })

    // 항목 중 하나가 유효하지 않으면 에러를 전파하는지 확인
    test('throws when any item is invalid', () => {
      // given
      const raws: any = ['ok', '   ', 'also-ok']
      assertNonEmptyStringMock.mockImplementation((...args: unknown[]) => {
        const [value, key] = args as [unknown, string]

        if (typeof value !== 'string') {
          throw new Error(`[${key}] Must be a string.`)
        }
        if (value.trim().length === 0) {
          throw new Error(`[${key}] Must be a non-empty string.`)
        }
      })

      // when
      const act = () => makeLabels(raws)

      // then
      expect(act).toThrow(/\[makeLabel\] Must be a non-empty string\./)
    })
  })

  describe('makeOperationResult()', () => {
    // 기본 simulatedByDryRun=false, reason이 없는 경우 결과 객체 확인
    test('creates operation result without reason (simulatedByDryRun default false)', () => {
      // given
      const label = { name: 'bug', norm: 'bug' }
      const action = LabelAction.Add
      const result = LabelActionResult.Success

      // when
      const op = makeOperationResult(label, action, result)

      // then
      expect(op).toEqual({
        name: 'bug',
        norm: 'bug',
        action: LabelAction.Add,
        result: LabelActionResult.Success,
        reason: undefined,
        simulatedByDryRun: false
      })
    })

    // reason만 지정해도 simulatedByDryRun 기본값 false가 유지되는지 확인
    test('keeps simulatedByDryRun as false when reason is provided without simulatedByDryRun', () => {
      // given
      const label = { name: 'bug', norm: 'bug' }
      const action = LabelAction.Add
      const result = LabelActionResult.Skipped
      const reason = LabelActionReason.AlreadyPresent

      // when
      const op = makeOperationResult(label, action, result, reason)

      // then
      expect(op).toEqual({
        name: 'bug',
        norm: 'bug',
        action: LabelAction.Add,
        result: LabelActionResult.Skipped,
        reason: LabelActionReason.AlreadyPresent,
        simulatedByDryRun: false
      })
    })

    // reason 포함 및 simulatedByDryRun=true 설정 시 결과 객체 확인
    test('creates operation result with reason and simulatedByDryRun=true', () => {
      // given
      const label = { name: 'enhancement', norm: 'enhancement' }
      const action = LabelAction.Remove
      const result = LabelActionResult.Skipped
      const reason = LabelActionReason.AlreadyAbsent
      const simulatedByDryRun = true

      // when
      const op = makeOperationResult(label, action, result, reason, simulatedByDryRun)

      // then
      expect(op).toEqual({
        name: 'enhancement',
        norm: 'enhancement',
        action: LabelAction.Remove,
        result: LabelActionResult.Skipped,
        reason: LabelActionReason.AlreadyAbsent,
        simulatedByDryRun: true
      })
    })

    // label 객체를 그대로 반환하지 않고 새 객체를 생성하는지 확인
    test('returns a new object instance', () => {
      // given
      const label = { name: 'bug', norm: 'bug' }

      // when
      const op = makeOperationResult(label, LabelAction.Add, LabelActionResult.Success)

      // then
      expect(op).not.toBe(label)
      expect(op.name).toBe(label.name)
      expect(op.norm).toBe(label.norm)
    })
  })
})
