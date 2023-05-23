import {EventName} from './context'

// eslint-disable-next-line no-shadow
export const enum FilterTarget {
  TITLE = 'title',
  COMMENT = 'comment'
}

export class ConfigInfo {
  filters: Filter[]

  constructor(filters: Filter[]) {
    this.filters = filters
  }
}

export class Filter {
  label: string
  regexs: string[]
  events: Set<EventName>
  targets: Set<FilterTarget>

  constructor(
    label: string,
    regexs: string[],
    events: Set<EventName>,
    targets: Set<FilterTarget>
  ) {
    this.label = label
    this.regexs = regexs
    this.events = events
    this.targets = targets
  }
}
