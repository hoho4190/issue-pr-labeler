import type { ILabelService } from '../services/label.service.interface.js'
import type { Immutable } from './common.js'
import type { Context } from './context.js'

export type LabelServiceFactory = (ctx: Immutable<Context>) => ILabelService
