import type { StudioConfig } from './index'
import type { StudioPaths } from './paths'

/** Shared runtime state handed to the API layer, the tool layer and the skills layer. */
export interface StudioState {
  ctx: any
  config: StudioConfig
  paths: StudioPaths
  api: { path: string; gateHeader: string; gateValue: string }
}
