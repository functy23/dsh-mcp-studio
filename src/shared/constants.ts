/**
 * Shared constants for the host and client halves of dsh-mcp-studio.
 * Keep this file dependency-free: it is bundled into both artifacts.
 */

/** Package / loader entry id. Must match `cordis.patch.yml` and the client bundle id. */
export const PLUGIN_ID = 'dsh-mcp-studio'

/** Same-origin HTTP endpoint the client half talks to. */
export const API_PATH = '/dsh-mcp-studio/api'

/** Request header gating the API against cross-site calls (CSRF gate). */
export const API_GATE_HEADER = 'x-dsh-plugin'

/** Value of the gate header; browsers cannot set it cross-origin without a preflight. */
export const API_GATE_VALUE = PLUGIN_ID

/** Loader module name of the DSH MCP client plugin — the rows we manage. */
export const MCP_PLUGIN = '@deepseek-ai/dsh-mcp-client'

/** Patch file name inside a profile directory and inside the DSH home. */
export const PATCH_FILE_NAME = 'cordis.patch.yml'

/** Default id prefix for newly created MCP rows. */
export const MCP_ID_PREFIX = 'mcp-'

/** Settings-page slots registered by the client half. */
export const SETTINGS_SECTIONS = {
  mcp: { id: 'mcp-studio', order: 16, label: 'MCP 管理' },
  skills: { id: 'skill-studio', order: 17, label: 'Skills 管理' },
} as const

export interface McpServerRow {
  id: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
  disabled: boolean
  scope: 'profile' | 'global'
  /** true when a profile-level row shadows an equally named global row. */
  shadowed?: boolean
}

export interface McpListResponse {
  ok: boolean
  error?: string
  servers: McpServerRow[]
  paths: { home: string; profile: string; profileName: string; projectPatch: string; globalPatch: string }
  errors: string[]
}
