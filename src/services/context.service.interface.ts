import type { Immutable } from '../types/common.js'
import type { Context } from '../types/context.js'

export interface IContextService {
  getContext(): Promise<Immutable<Context>>
}
