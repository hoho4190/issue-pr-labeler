import {expect, test} from '@jest/globals'
import * as fs from 'fs'
import {Filter, FilterTarget} from '../src/classes/config-info'
import {EventName} from '../src/classes/context'
import {convertToConfigInfo, convertToRegExp} from '../src/util'

test('convertToConfigInfo() - Test', () => {
  // given
  const settingFilePath = './__tests__/resources/labeler-config.yml'
  const fileStr: string = fs.readFileSync(settingFilePath, 'utf-8')
  // console.log(fileStr)

  const expectedFilters = [
    new Filter(
      'enhancement',
      ['/feat/i', '/refactor/'],
      new Set([EventName.ISSUES, EventName.PULL_REQUEST]),
      new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
    ),
    new Filter(
      'bug',
      ['/\\bfix\\b|bug/'],
      new Set([EventName.ISSUES, EventName.PULL_REQUEST]),
      new Set([FilterTarget.TITLE])
    ),
    new Filter(
      'documentation',
      ['/docs/'],
      new Set([EventName.PULL_REQUEST]),
      new Set([FilterTarget.TITLE, FilterTarget.COMMENT])
    )
  ].sort((a, b) => a.label.localeCompare(b.label))

  // when
  const configInfo = convertToConfigInfo(fileStr)
  const filters = configInfo.filters.sort((a, b) =>
    a.label.localeCompare(b.label)
  )

  // then
  expect(filters.length).toBe(3)
  for (const i in filters) {
    // console.log(filters[i])
    expect(filters[i].label).toBe(expectedFilters[i].label)
    expect(filters[i].regexs).toStrictEqual(expectedFilters[i].regexs)
    expect(filters[i].events).toStrictEqual(expectedFilters[i].events)
    expect(filters[i].targets).toStrictEqual(expectedFilters[i].targets)
  }
})

test('convertToRegExp() - Test', () => {
  // given
  const pattern = '\\bstr\\b'
  const modifiers = 'im'
  const regStr = `/${pattern}/${modifiers}`

  // when
  const reg = convertToRegExp(regStr)

  // then
  expect(reg.source).toEqual(pattern)
  expect(reg.flags).toEqual(modifiers)
})
