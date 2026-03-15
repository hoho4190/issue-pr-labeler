import fs from 'fs/promises'
import path from 'path'
import type { ExpectedMatch } from '../types/condition-properties.test.types.js'

/**
 * Reads and parses the expected result fixture JSON for a test case.
 */
export const readExpectedMatchFixture = async (
  testDir: string,
  fixturePath: string,
  expectedMatch: ExpectedMatch
): Promise<unknown> => {
  const expectedRaw = await fs.readFile(
    path.join(testDir, fixturePath, `expected-${expectedMatch}.json`),
    'utf-8'
  )

  return JSON.parse(expectedRaw)
}
