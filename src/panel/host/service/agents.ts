import type { ImportedServer } from './agents.types'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { defineService } from 'dsh-tauri'
import { compact, filter, isEmpty, isObject, pickBy, uniqBy } from 'lodash-es'
import { join } from 'pathe'
import { parse as parseToml } from 'smol-toml'
import { SKILL_SOURCES } from '../../shared/skill-sources'

const CLAUDE_MCP_FILES = ['.claude/settings.json', '.claude.json'] as const

const CURSOR_MCP_FILE = '.cursor/mcp.json'

const GEMINI_MCP_FILE = '.gemini/settings.json'

const CODEX_MCP_FILE = '.codex/config.toml'

/**
 * 本插件要替 DSH 兜住的技能目录。
 *
 * 目录表在 `../shared/skill-sources`（唯一真相源）；这里只把相对路径拼成绝对路径，并跳过
 * 官方 provider 已经扫过、已有准确 source 的那几个目录。
 */
function agentSkillRoots(home: string = homedir()): Array<{ key: string, path: string }> {
  return SKILL_SOURCES
    .filter(spec => spec.official === undefined)
    .map(spec => ({ key: spec.key, path: join(home, spec.directory) }))
}

export const agents = defineService({
  resolve(home: string = homedir()): ImportedServer[] {
    return uniqBy(
      [...scanClaudeMcp(home), ...scanCodexMcp(home), ...scanCursorMcp(home), ...scanGeminiMcp(home)],
      server => `${server.agent}/${server.name}`,
    )
  },

  peek(home: string = homedir()): string[] {
    return agentSkillRoots(home)
      .map(root => root.path)
      .filter(path => existsSync(path))
  },
})

// --- internal ---

/**
 * 字符串判定（类型守卫版）。
 *
 * 不用 lodash 的 isString：lodash-es 没带类型声明，它是 any，在 tsconfig 关掉 strict 的
 * 配置下 TS 不会因此把 unknown 收窄成 string（实测 TS2322：unknown 不能赋给 string），
 * 于是「运行时判过、编译期没判过」的字段就会一路报错。守卫自带类型谓词，两边一致。
 */
function isText(value: unknown): value is string {
  return typeof value === 'string'
}

function stringEntries(value: unknown): Record<string, string> | undefined {
  if (!isObject(value) || Array.isArray(value))
    return undefined
  const out = pickBy(value as Record<string, unknown>, isText)
  return isEmpty(out) ? undefined : out
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value))
    return undefined
  const out = filter(value, isText)
  return isEmpty(out) ? undefined : out
}

function mapMcpServersEntry(agent: ImportedServer['agent'], name: string, entry: unknown): ImportedServer | null {
  if (!isObject(entry))
    return null
  const record = entry as Record<string, unknown>
  const type = isText(record.type) ? record.type : 'stdio'
  if (type === 'stdio') {
    if (!isText(record.command) || record.command === '')
      return null
    return {
      agent,
      name,
      transport: 'stdio',
      command: record.command,
      args: stringArray(record.args),
      env: stringEntries(record.env),
    }
  }
  if (type === 'http' || type === 'streamable-http') {
    if (!isText(record.url) || record.url === '')
      return null
    return {
      agent,
      name,
      transport: 'streamable-http',
      url: record.url,
      headers: stringEntries(record.headers),
    }
  }
  return null
}

function mapAgentEntry(
  agent: ImportedServer['agent'],
  name: string,
  entry: unknown,
  urlKey: 'httpUrl' | 'url',
): ImportedServer | null {
  if (!isObject(entry))
    return null
  const record = entry as Record<string, unknown>
  if (isText(record.command) && record.command !== '') {
    return {
      agent,
      name,
      transport: 'stdio',
      command: record.command,
      args: stringArray(record.args),
      env: stringEntries(record.env),
    }
  }
  const url = record[urlKey]
  if (isText(url) && url !== '')
    return { agent, name, transport: 'streamable-http', url }
  return null
}

function scanClaudeMcp(home: string): ImportedServer[] {
  const merged: Record<string, unknown> = {}
  for (const file of CLAUDE_MCP_FILES) {
    const path = join(home, file)
    if (!existsSync(path))
      continue
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as { mcpServers?: unknown }
      if (isObject(parsed.mcpServers))
        Object.assign(merged, parsed.mcpServers)
    }
    catch {
      continue
    }
  }
  return compact(Object.entries(merged).map(([name, entry]) => mapMcpServersEntry('claude-code', name, entry)))
}

function scanCursorMcp(home: string): ImportedServer[] {
  const file = join(home, CURSOR_MCP_FILE)
  if (!existsSync(file))
    return []
  let parsed: { mcpServers?: unknown }
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8')) as { mcpServers?: unknown }
  }
  catch {
    return []
  }
  if (!isObject(parsed.mcpServers))
    return []
  return compact(Object.entries(parsed.mcpServers).map(([name, entry]) => mapMcpServersEntry('cursor', name, entry)))
}

function scanGeminiMcp(home: string): ImportedServer[] {
  const file = join(home, GEMINI_MCP_FILE)
  if (!existsSync(file))
    return []
  let parsed: { mcpServers?: unknown }
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8')) as { mcpServers?: unknown }
  }
  catch {
    return []
  }
  if (!isObject(parsed.mcpServers))
    return []
  return compact(Object.entries(parsed.mcpServers).map(([name, entry]) => mapAgentEntry('gemini', name, entry, 'httpUrl')))
}

function scanCodexMcp(home: string): ImportedServer[] {
  const file = join(home, CODEX_MCP_FILE)
  if (!existsSync(file))
    return []
  let root: Record<string, unknown>
  try {
    root = parseToml(readFileSync(file, 'utf8')) as Record<string, unknown>
  }
  catch {
    return []
  }
  const table = root.mcp_servers
  if (!isObject(table))
    return []
  return compact(Object.entries(table).map(([name, entry]) => mapAgentEntry('codex', name, entry, 'url')))
}
