import {expect, test} from '@jest/globals'
import {ConfigInfo, Filter} from '../../src/classes/config-info'

test('ConfigInfo.constructor() - Test', () => {
  // given
  const filters: Filter[] = []

  // when
  const result = new ConfigInfo(filters)

  // then
  expect(result.filters).toEqual(filters)
})
