export const enum FilterEvent {
  ISSUES = 'issues',
  PULL_REQUEST = 'pull_request'
}

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
  events: Set<FilterEvent>
  targets: Set<FilterTarget>

  constructor(
    label: string,
    regexs: string[],
    events: Set<FilterEvent>,
    targets: Set<FilterTarget>
  ) {
    this.label = label
    this.regexs = regexs
    this.events = events
    this.targets = targets
  }
}
