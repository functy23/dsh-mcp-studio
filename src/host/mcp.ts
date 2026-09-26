import { existsSync } from 'node:fs'
import { MCP_PLUGIN } from '../shared/constants'
import type { StudioPaths } from './paths'
import {
  PatchError,
  findRows,
  parsePatch,
  readPatchFile,
  readRows,
  removeRow,
  rowData,
  saveRow,
  toggleRow,
  writePatchFile,
  type PatchRowData,
  type McpRowInput,
} from './patch'
import { checkRow, type CheckResult } from './mcp-check'

export type Scope = 'profile' | 'global'

export interface ListedRow extends PatchRowData {
  scope: Scope
  shadowed?: boolean
  /** Set when the row is currently mounted by the loader. */
  live?: { present: boolean, disabled: boolean, phase?: string }
}

export function patchPathFor(paths: StudioPaths, scope: Scope): string {
  return scope === 'global' ? paths.globalPatch : paths.projectPatch
}

export function listServers(paths: StudioPaths, ctx?: any): { servers: ListedRow[], errors: string[] } {
  const errors: string[] = []
  let globalRows: PatchRowData[] = []
  let profileRows: PatchRowData[] = []

  if (existsSync(paths.globalPatch)) {
    try {
      globalRows = readRows(paths.globalPatch)
    }
    catch (error) {
      errors.push(`全局 patch 解析失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  try {
    profileRows = readRows(paths.projectPatch)
  }
  catch (error) {
    errors.push(`项目 patch 解析失败：${error instanceof Error ? error.message : String(error)}`)
  }

  const globalIds = new Set(globalRows.map(row => row.id))
  const live = liveRowState(ctx)

  const servers: ListedRow[] = [
    ...globalRows.map((row): ListedRow => ({ ...row, scope: 'global', ...liveFor(live, row.id) })),
    ...profileRows.map((row): ListedRow => ({
      ...row,
      scope: 'profile',
      ...(globalIds.has(row.id) ? { shadowed: true } : {}),
      ...liveFor(live, row.id),
    })),
  ]
  return { servers, errors }
}

/**
 * Read the loader's live view of our MCP rows. Best-effort: DSH exposes the
 * loader service but its shape is not part of the public plugin contract, so
 * every access is guarded.
 */
export function liveRowState(ctx: any): Map<string, { present: boolean, disabled: boolean, phase?: string }> {
  const out = new Map<string, { present: boolean, disabled: boolean, phase?: string }>()
  try {
    const loader = ctx?.get?.('loader')
    const entries = loader?.entries?.()
    if (entries === undefined || entries === null)
      return out
    for (const entry of entries as Iterable<any>) {
      const options = entry?.options
      if (options?.name !== MCP_PLUGIN)
        continue
      const id = String(options.id ?? '')
      if (id === '')
        continue
      const phase = typeof entry?.state === 'string' ? entry.state : undefined
      out.set(id, { present: true, disabled: options.disabled === true, ...(phase !== undefined ? { phase } : {}) })
    }
  }
  catch {
    /* loader unavailable — the UI simply omits live state */
  }
  return out
}

function liveFor(
  live: Map<string, { present: boolean, disabled: boolean, phase?: string }>,
  id: string,
): { live?: { present: boolean, disabled: boolean, phase?: string } } {
  const hit = live.get(id)
  return hit === undefined ? {} : { live: hit }
}

export function saveServer(paths: StudioPaths, scope: Scope, input: McpRowInput): { id: string } {
  const path = patchPathFor(paths, scope)
  const before = readPatchFile(path)
  const { id, text } = saveRow(before, input)
  writePatchFile(path, text)
  return { id }
}

export function removeServer(paths: StudioPaths, scope: Scope, id: string): boolean {
  const path = patchPathFor(paths, scope)
  const after = removeRow(readPatchFile(path), id)
  if (after === null)
    return false
  writePatchFile(path, after)
  return true
}

export function toggleServer(paths: StudioPaths, scope: Scope, id: string, disabled: boolean): boolean {
  const path = patchPathFor(paths, scope)
  const after = toggleRow(readPatchFile(path), id, disabled)
  if (after === null)
    return false
  writePatchFile(path, after)
  return true
}

/**
 * "Restart" a server the way the Tauri panel does: disable the row, let the
 * loader unload it, then re-enable it so the client reconnects and re-syncs.
 */
export async function restartServer(paths: StudioPaths, scope: Scope, id: string): Promise<boolean> {
  if (!toggleServer(paths, scope, id, true))
    return false
  await new Promise(resolve => setTimeout(resolve, 350))
  return toggleServer(paths, scope, id, false)
}

export async function checkServer(paths: StudioPaths, scope: Scope, id: string): Promise<CheckResult> {
  const rows = readRows(patchPathFor(paths, scope))
  const row = rows.find(candidate => candidate.id === id)
  if (row === undefined)
    return { ok: false, detail: `未找到条目 ${id}` }
  return checkRow(row)
}

export interface ExportBundle {
  format: 'dsh-mcp-studio'
  version: 1
  exportedAt: string
  paths: { profile: string, projectPatch: string, globalPatch: string }
  servers: Array<PatchRowData & { scope: Scope }>
}

export function exportServers(paths: StudioPaths): ExportBundle {
  const { servers } = listServers(paths)
  return {
    format: 'dsh-mcp-studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    paths: { profile: paths.profileName, projectPatch: paths.projectPatch, globalPatch: paths.globalPatch },
    servers: servers.map(({ scope, ...row }) => ({ ...row, scope })),
  }
}

export interface ImportOutcome {
  added: string[]
  skipped: string[]
  errors: string[]
}

/** Merge a previously exported bundle (or a bare array of rows) into one patch file. */
export function importServers(paths: StudioPaths, scope: Scope, payload: unknown): ImportOutcome {
  const outcome: ImportOutcome = { added: [], skipped: [], errors: [] }
  const servers = normalizeImportPayload(payload, outcome)
  const path = patchPathFor(paths, scope)
  let text = readPatchFile(path)
  const existingIds = (() => {
    try {
      return new Set(readRows(path).map(row => row.id))
    }
    catch {
      return new Set<string>()
    }
  })()

  for (const server of servers) {
    const desiredId = server.id ?? ''
    if (desiredId !== '' && existingIds.has(desiredId)) {
      outcome.skipped.push(desiredId)
      continue
    }
    try {
      const input: McpRowInput = {
        serverName: server.serverName,
        transport: server.transport,
        ...(server.command !== undefined ? { command: server.command } : {}),
        ...(server.args !== undefined ? { args: server.args } : {}),
        ...(server.env !== undefined ? { env: server.env } : {}),
        ...(server.url !== undefined ? { url: server.url } : {}),
        ...(server.headers !== undefined ? { headers: server.headers } : {}),
        ...(server.disabled !== undefined ? { disabled: server.disabled } : {}),
      }
      const saved = saveRow(text, input)
      text = saved.text
      existingIds.add(saved.id)
      outcome.added.push(saved.id)
    }
    catch (error) {
      outcome.errors.push(`${server.serverName}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (outcome.added.length > 0)
    writePatchFile(path, text)
  return outcome
}

interface ImportRow {
  id?: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  url?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  headers?: Record<string, string>
  disabled?: boolean
}

function normalizeImportPayload(payload: unknown, outcome: ImportOutcome): ImportRow[] {
  const list: unknown[] = Array.isArray(payload)
    ? payload
    : (payload !== null && typeof payload === 'object' && Array.isArray((payload as { servers?: unknown[] }).servers)
        ? (payload as { servers: unknown[] }).servers
        : [])
  const out: ImportRow[] = []
  for (const item of list) {
    if (item === null || typeof item !== 'object') {
      outcome.errors.push('跳过非法条目（不是对象）')
      continue
    }
    const row = item as Record<string, unknown>
    const serverName = typeof row.serverName === 'string' ? row.serverName : ''
    if (serverName === '') {
      outcome.errors.push('跳过缺少 serverName 的条目')
      continue
    }
    const transport = row.transport === 'stdio' ? 'stdio' : 'streamable-http'
    const entry: ImportRow = { serverName, transport }
    if (typeof row.id === 'string') entry.id = row.id
    if (typeof row.url === 'string') entry.url = row.url
    if (typeof row.command === 'string') entry.command = row.command
    if (Array.isArray(row.args)) entry.args = row.args.map(value => String(value))
    if (row.env !== null && typeof row.env === 'object' && !Array.isArray(row.env))
      entry.env = stringMap(row.env)
    if (row.headers !== null && typeof row.headers === 'object' && !Array.isArray(row.headers))
      entry.headers = stringMap(row.headers)
    if (row.disabled === true) entry.disabled = true
    out.push(entry)
  }
  return out
}

function stringMap(value: object): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean')
      out[key] = String(raw)
  }
  return out
}

/** Produce a copy-pasteable YAML/JSON snippet for one row. */
export function copyServer(paths: StudioPaths, scope: Scope, id: string, format: 'yaml' | 'json' | 'mcpServers' = 'json'): string | null {
  const path = patchPathFor(paths, scope)
  const doc = parsePatch(readPatchFile(path))
  const hit = findRows(doc).find(ref => ref.id === id)
  if (hit === undefined)
    return null
  const data = rowData(hit)
  if (format === 'yaml') {
    const lines: string[] = []
    lines.push(`- id: ${data.id}`)
    lines.push(`  name: '${MCP_PLUGIN}'`)
    lines.push('  config:')
    lines.push(`    serverName: ${data.serverName}`)
    lines.push(`    transport: ${data.transport}`)
    if (data.transport === 'stdio') {
      lines.push(`    command: ${data.command ?? ''}`)
      if (data.args !== undefined)
        lines.push(`    args: [${data.args.map(arg => JSON.stringify(arg)).join(', ')}]`)
    }
    else {
      lines.push(`    url: ${data.url ?? ''}`)
    }
    if (data.disabled)
      lines.push('  disabled: true')
    return lines.join('\n')
  }
  if (format === 'mcpServers') {
    return JSON.stringify({
      mcpServers: {
        [data.serverName]: data.transport === 'stdio'
          ? { command: data.command, args: data.args, env: data.env }
          : { url: data.url, headers: data.headers },
      },
    }, null, 2)
  }
  return JSON.stringify(data, null, 2)
}

export { PatchError }
