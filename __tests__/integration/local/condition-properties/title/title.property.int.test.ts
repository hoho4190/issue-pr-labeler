import path from 'path'
import { fileURLToPath } from 'url'
import type { LocalGitHubServiceOptions } from '../../../../../src/services/github.service.local.js'
import type { ConditionPropertyTestCase } from '../types/condition-properties.test.types.js'
import { setupLocalRunMocks } from '../helpers/local-run-mocks.helper.js'
import { readExpectedMatchFixture } from '../helpers/fixture.helper.js'
import { ConditionValueTagType } from '../../../../../src/types/condition-enum.js'
import { EventType } from '../../../../../src/types/common.js'

const testFilePath = fileURLToPath(import.meta.url)
const testDir = path.dirname(testFilePath)
const fixtureBaseDir = 'fixtures'

const { configureLocalGitHubServiceMock, resetMocks, run } = await setupLocalRunMocks()

describe('Integration | Local(run) | Registry: title.property', () => {
  const baseEnv = { ...process.env }
  const eventPath = 'event.json'
  const testCases: ConditionPropertyTestCase[] = [
    {
      tc: 'TC01',
      eventName: EventType.Issue,
      tagName: ConditionValueTagType.Regex,
      expectedMatch: 'match',
      reason: 'title matches the regex pattern'
    },
    {
      tc: 'TC02',
      eventName: EventType.Issue,
      tagName: ConditionValueTagType.Regex,
      expectedMatch: 'mismatch',
      reason: 'title does not match the regex pattern'
    },
    {
      tc: 'TC03',
      eventName: EventType.PullRequest,
      tagName: ConditionValueTagType.Regex,
      expectedMatch: 'match',
      reason: 'title matches the regex pattern'
    },
    {
      tc: 'TC04',
      eventName: EventType.PullRequest,
      tagName: ConditionValueTagType.Regex,
      expectedMatch: 'mismatch',
      reason: 'title does not match the regex pattern'
    }
  ]

  beforeEach(() => {
    resetMocks()

    process.env = {
      ...baseEnv,

      LOCAL_PROJECT_PATH: testDir,

      INPUT_TOKEN: 'test-token',

      GITHUB_REPOSITORY: 'tester/repo',
      GITHUB_STEP_SUMMARY: 'tmp_summary.md'
    }
  })

  afterEach(() => {
    process.env = baseEnv
  })

  test.each(testCases)(
    '$tc | $eventName | $tagName | $expectedMatch | $reason',
    async ({ tc, eventName, expectedMatch }: ConditionPropertyTestCase) => {
      // given
      const fixturePath = `${fixtureBaseDir}/${tc}`
      process.env.LOCAL_ACTION_FIXTURE_PATH = fixturePath
      process.env.GITHUB_EVENT_NAME = eventName
      process.env.GITHUB_EVENT_PATH = eventPath

      const options: LocalGitHubServiceOptions = {
        basePath: path.join(testDir, fixturePath),
        useRealService: {},
        fixtureFiles: {}
      }

      const expected = await readExpectedMatchFixture(testDir, fixturePath, expectedMatch)

      configureLocalGitHubServiceMock(options)

      // when
      const result = await run()

      // then
      expect(result).toBeDefined()
      expect(result?.summaryData.operations).toEqual(expected)
    }
  )
})
