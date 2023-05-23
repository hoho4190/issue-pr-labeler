import {parse} from 'yaml'
import {ConfigInfo, FilterTarget} from './classes/config-info'
import {EventName} from './classes/context'

export function convertToConfigInfo(data: string): ConfigInfo {
  const configInfo = parse(data) as ConfigInfo

  for (const filter of configInfo.filters) {
    const filterEvents = new Set<EventName>()
    const filterTargets = new Set<FilterTarget>()

    if (filter.events !== undefined) {
      for (const event of new Set(filter.events)) {
        if (event === EventName.ISSUES || event === EventName.PULL_REQUEST) {
          filterEvents.add(event)
        }
      }
    }
    if (filterEvents.size === 0) {
      filterEvents.add(EventName.ISSUES).add(EventName.PULL_REQUEST)
    }

    if (filter.targets !== undefined) {
      for (const target of new Set(filter.targets)) {
        if (target === FilterTarget.TITLE || target === FilterTarget.COMMENT) {
          filterTargets.add(target)
        }
      }
    }
    if (filterTargets.size === 0) {
      filterTargets.add(FilterTarget.TITLE).add(FilterTarget.COMMENT)
    }

    filter.events = filterEvents
    filter.targets = filterTargets
  }

  return configInfo
}

export function convertToRegExp(str: string): RegExp {
  const match = str.match(/^\/([\s\S]+)\/([gimuy]*)$/)
  if (!match) throw new Error(`invalid regular expression: ${str}`)

  return new RegExp(match[1], match[2])
}
