import { API_GATE_HEADER, API_GATE_VALUE, API_PATH, PLUGIN_ID } from '../shared/constants'
import { resolveStudioPaths } from './paths'
import { createApiHandler } from './api'
import { registerTools } from './tools'

export interface StudioConfig {
  /** Force a specific profile when auto-detection is not conclusive. */
  profile?: string
  /** Optional write token; when set, mutating API ops require `x-dsh-token`. */
  token?: string
}

export const name = PLUGIN_ID
export const inject = ['webServer']

export function apply(ctx: any, config: StudioConfig = {}): void {
  const paths = config.profile !== undefined && config.profile !== ''
    ? resolveStudioPaths({ env: { ...process.env, DSH_PROFILE: config.profile } })
    : resolveStudioPaths()

  const state = {
    ctx,
    config,
    paths,
    api: { path: API_PATH, gateHeader: API_GATE_HEADER, gateValue: API_GATE_VALUE },
  }

  const webServer = ctx.get('webServer')
  if (webServer !== undefined) {
    ctx.effect(
      () => webServer.register({
        kind: 'exact',
        path: API_PATH,
        handler: createApiHandler(state),
      }),
      'dsh-mcp-studio: api route',
    )
  }

  try {
    registerTools(ctx, state)
  }
  catch (error) {
    console.error('[dsh-mcp-studio] tool registration failed:', message(error))
  }
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
