import * as core from '@actions/core'
import {beforeEach, describe, expect, jest, test} from '@jest/globals'
import {Context, EventName, EventType, SenderType} from '../src/classes/context'
import {checkEventValues} from '../src/main'

describe('checkEventValues() - Unit Test', () => {
  let context: Context

  beforeEach(() => {
    context = {
      githubEventPath: '',
      token: '',
      owner: '',
      repo: '',
      sha: '',
      senderType: SenderType.USER,
      eventName: EventName.ISSUES,
      eventType: EventType.OPENED,
      eventNumber: 1,
      isDisableBot: true,
      configFilePath: ''
    }
  })

  test('예외: context.senderType == null', () => {
    // given
    context.senderType = undefined

    // when
    const result = () => checkEventValues(context)

    // then
    expect(result).toThrowError('"Sender type" not found')
  })

  test('성공: 봇 비활성화 O && SenderType.BOT', () => {
    // given
    context.isDisableBot = true
    context.senderType = SenderType.BOT

    const infoFunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = checkEventValues(context)

    // then
    expect(result).toBe(false)
    expect(infoFunc).toBeCalledTimes(1)
  })

  test('성공: 봇 비활성화 O && SenderType.USER', () => {
    // given
    context.isDisableBot = true
    context.senderType = SenderType.USER

    const infoFunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = checkEventValues(context)

    // then
    expect(result).toBe(true)
    expect(infoFunc).toBeCalledTimes(0)
  })

  test('성공: 봇 비활성화 X && SenderType.BOT', () => {
    // given
    context.isDisableBot = false
    context.senderType = SenderType.BOT

    const infoFunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = checkEventValues(context)

    // then
    expect(result).toBe(true)
    expect(infoFunc).toBeCalledTimes(0)
  })

  test('성공: 봇 비활성화 X && SenderType.USER', () => {
    // given
    context.isDisableBot = false
    context.senderType = SenderType.USER

    const infoFunc = jest.spyOn(core, 'info').mockImplementation(jest.fn())

    // when
    const result = checkEventValues(context)

    // then
    expect(result).toBe(true)
    expect(infoFunc).toBeCalledTimes(0)
  })
})
