import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { PATCH_FILE_NAME } from '../shared/constants'
import { readRows, type PatchRowData } from './patch'
import type { StudioPaths } from './paths'

export interface ImportServer {
  serverName: string
  transport: 'stdio' | 'streamable-http'
  url?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  headers?: Record<string, string>
  disabled?: boolean
}

export interface ImportSource {
  /** Where the servers were found, e.g. `~/.cursor/mcp.json`. */
  source: string
  /** Absolute path of the scanned file. */
  path: string
  servers: ImportServer[]
  /** Servers already configured in the target patch file. */
  existing: string[]
}

/**
 * Parse the `{"mcpServers": {...}}` shape used by Claude Desktop, Claude Code,
 * Cursor, Windsurf and most other MCP hosts. Also accepts a bare map of servers.
 */
export function parseMcpServersJson(text: string): ImportServer[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  }
  catch {
    return []
  }
  if (parsed === null || typeof parsed !== 'object')
    return []
  const record = parsed as Record<string, unknown>
  const container = (record.mcpServers ?? record.servers ?? record.mcp ?? record) as unknown
  if (container === null || typeof container !== 'object' || Array.isArray(container))
    return []
  const out: ImportServer[] = []
  for (const [name, value] of Object.entries(container as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      continue
    const entry = value as Record<string, unknown>
    const url = typeof entry.url === 'string' ? entry.url : (typeof entry.serverUrl === 'string' ? entry.serverUrl : undefined)
    const command = typeof entry.command === 'string' ? entry.command : undefined
    const args = Array.isArray(entry.args) ? entry.args.map(item => String(item)) : undefined
    const env = isStringMap(entry.env)
    const headers = isStringMap(entry.headers) ?? isStringMap(entry.httpHeaders)
    if (url === undefined && command === undefined)
      continue
    const server: ImportServer = {
      serverName: name,
      transport: url !== undefined ? 'streamable-http' : 'stdio',
    }
    if (url !== undefined) server.url = url
    if (command !== undefined) server.command = command
    if (args !== undefined) server.args = args
    if (env !== undefined) server.env = env
    if (headers !== undefined) server.headers = headers
    if (entry.disabled === true) server.disabled = true
    out.push(server)
  }
  return out
}

function isStringMap(value: unknown): Record<string, string> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return undefined
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string' || typeof raw === 'number')
      out[key] = String(raw)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Convert patch rows (as read from any cordis.patch.yml) into import candidates. */
export function rowsToImportServers(rows: PatchRowData[]): ImportServer[] {
  return rows.map((row) => {
    const server: ImportServer = { serverName: row.serverName, transport: row.transport }
    if (row.url !== undefined) server.url = row.url
    if (row.command !== undefined) server.command = row.command
    if (row.args !== undefined) server.args = row.args
    if (row.env !== undefined) server.env = row.env
    if (row.headers !== undefined) server.headers = row.headers
    if (row.disabled) server.disabled = true
    return server
  })
}

/**
 * Candidate files scanned for importable MCP servers: other DSH profiles, the
 * global patch file, and the well-known MCP host config files.
 */
export function importCandidates(paths: StudioPaths, env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): Array<{ source: string, path: string, kind: 'patch' | 'json' }> {
  const home = homedir()
  const candidates: Array<{ source: string, path: string, kind: 'patch' | 'json' }> = []
  const seen = new Set<string>()

  const add = (source: string, path: string, kind: 'patch' | 'json'): void => {
    if (seen.has(path) || !existsSync(path))
      return
    seen.add(path)
    candidates.push({ source, path, kind })
  }

  add('全局 DSH 配置', paths.globalPatch, 'patch')

  const profilesRoot = join(paths.home, 'profiles')
  try {
    for (const entry of readdirSync(profilesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules')
        continue
      const patch = join(profilesRoot, entry.name, PATCH_FILE_NAME)
      if (patch === paths.projectPatch)
        continue
      add(`DSH profile：${entry.name}`, patch, 'patch')
    }
  }
  catch {
    /* no profiles directory — nothing to scan */
  }

  const appData = env.HOME !== undefined && env.HOME !== '' ? env.HOME : home
  add('Claude Desktop', join(appData, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'), 'json')
  add('Cursor', join(home, '.cursor', 'mcp.json'), 'json')
  add('Cursor（项目级）', join(process.cwd(), '.cursor', 'mcp.json'), 'json')
  add('Claude Code（项目级）', join(process.cwd(), '.mcp.json'), 'json')
  add('Windsurf', join(home, '.codeium', 'windsurf', 'mcp_config.json'), 'json')
  add('VS Code（用户级）', join(appData, 'Library', 'Application Support', 'Code', 'User', 'mcp.json'), 'json')
  add('Zed', join(home, '.config', 'zed', 'settings.json'), 'json')

  return candidates
}

/** Scan every candidate file and return the servers it exposes. */
export function scanImportSources(paths: StudioPaths, existingNames: string[]): ImportSource[] {
  const existing = new Set(existingNames)
  const out: ImportSource[] = []
  for (const candidate of importCandidates(paths)) {
    let servers: ImportServer[] = []
    try {
      const text = readFileSync(candidate.path, 'utf8')
      servers = candidate.kind === 'patch'
        ? rowsToImportServers(readRows(candidate.path))
        : parseMcpServersJson(text)
    }
    catch {
      continue
    }
    if (servers.length === 0)
      continue
    out.push({
      source: candidate.source,
      path: candidate.path,
      servers,
      existing: servers.filter(server => existing.has(server.serverName)).map(server => server.serverName),
    })
  }
  return out
}
