import {parse} from 'yaml'
import {ConfigInfo, FilterEvent, FilterTarget} from './classes/config-info'

export function convertToConfigInfo(data: string): ConfigInfo {
  const configInfo = parse(data) as ConfigInfo

  for (const filter of configInfo.filters) {
    const filterEvents = new Set<FilterEvent>()
    const filterTargets = new Set<FilterTarget>()

    if (filter.events !== undefined) {
      for (const event of new Set(filter.events)) {
        if (
          event === FilterEvent.ISSUES ||
          event === FilterEvent.PULL_REQUEST
        ) {
          filterEvents.add(event)
        }
      }
    }
    if (filterEvents.size === 0) {
      filterEvents.add(FilterEvent.ISSUES).add(FilterEvent.PULL_REQUEST)
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
