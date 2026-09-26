import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { PatchRowData } from './patch'

export interface CheckResult {
  ok: boolean
  detail: string
}

export interface CheckOptions {
  pathEnv?: string
  platform?: string
  timeoutMs?: number
  exists?: (path: string) => boolean
  fetchImpl?: typeof fetch
}

const DEFAULT_TIMEOUT_MS = 5000

/**
 * Resolve an executable the way a shell would: an explicit path is probed
 * directly, a bare name is looked up on PATH (with Windows extensions).
 */
export function resolveCommandOnPath(
  command: string,
  pathEnv: string,
  platform: string = process.platform,
  exists: (path: string) => boolean = existsSync,
): boolean {
  if (command === '')
    return false
  if (command.includes('/') || command.includes('\\'))
    return exists(command)
  const extensions = platform === 'win32' ? ['', '.exe', '.cmd', '.bat', '.com'] : ['']
  const separator = platform === 'win32' ? ';' : ':'
  for (const rawDir of pathEnv.split(separator)) {
    const dir = rawDir.trim().replace(/^"|"$/g, '')
    if (dir === '')
      continue
    for (const extension of extensions) {
      if (exists(join(dir, command + extension)))
        return true
    }
  }
  return false
}

/** Probe one configured MCP server: PATH lookup for stdio, HTTP reachability otherwise. */
export async function checkRow(row: PatchRowData, options: CheckOptions = {}): Promise<CheckResult> {
  if (row.transport === 'stdio') {
    const command = (row.command ?? '').trim()
    if (command === '')
      return { ok: false, detail: 'stdio 行缺少 command' }
    const pathEnv = options.pathEnv ?? process.env.PATH ?? ''
    return resolveCommandOnPath(command, pathEnv, options.platform, options.exists)
      ? { ok: true, detail: `已找到可执行文件：${command}` }
      : { ok: false, detail: `PATH 中找不到命令：${command}` }
  }

  const url = (row.url ?? '').trim()
  if (!/^https?:\/\//.test(url))
    return { ok: false, detail: 'streamable-http 行缺少合法的 http(s) url' }

  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { accept: 'application/json, text/event-stream', ...(row.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
    })
    return { ok: true, detail: `HTTP ${response.status}` }
  }
  catch (error) {
    const cause = (error as { cause?: { code?: unknown } }).cause?.code
    const detail = cause !== undefined ? String(cause) : (error instanceof Error ? error.message : String(error))
    return { ok: false, detail }
  }
}
