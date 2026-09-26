import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { isMap, isSeq, parseDocument, type Document, type YAMLMap, type YAMLSeq } from 'yaml'
import { MCP_ID_PREFIX, MCP_PLUGIN } from '../shared/constants'

/** A managed MCP row: its loader entry id plus the YAML node that holds it. */
export interface PatchRowRef {
  id: string
  node: YAMLMap
  /** The sequence that owns the row (an `insert` list or the document root list). */
  list: YAMLSeq
}

/** Plain-object view of a row, as the UI and the tools consume it. */
export interface PatchRowData {
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
}

export interface McpRowInput {
  id?: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string | string[]
  env?: Record<string, string> | string
  cwd?: string
  url?: string
  headers?: Record<string, string> | string
  disabled?: boolean
}

export class PatchError extends Error {}

/** Read a patch file; a missing file reads as an empty document. */
export function readPatchFile(path: string): string {
  if (!existsSync(path))
    return ''
  return readFileSync(path, 'utf8')
}

/** Parse a patch file, tolerating `!!js` tags used by DSH loader guards. */
export function parsePatch(text: string): Document {
  const doc = parseDocument(text === '' ? '[]\n' : text, { keepSourceTokens: false })
  const errors = doc.errors.filter(error => !String(error.message).includes('!!js'))
  if (errors.length > 0)
    throw new PatchError(`patch file is not valid YAML: ${errors[0]?.message ?? 'unknown error'}`)
  if (doc.contents !== null && !isSeq(doc.contents))
    throw new PatchError('patch file must contain a top-level YAML array')
  return doc
}

/** Serialize a parsed patch document back to text. */
export function stringifyPatch(doc: Document): string {
  return String(doc)
}

function asMap(value: unknown): YAMLMap | null {
  return isMap(value) ? value as YAMLMap : null
}

function asSeq(value: unknown): YAMLSeq | null {
  return isSeq(value) ? value as YAMLSeq : null
}

/**
 * Coerce a YAML value to a string.
 *
 * `map.get(key)` already unwraps scalars, but items reached through `map.items`
 * or `seq.items` are raw Scalar nodes, so their `.value` has to be unwrapped too.
 */
function str(value: unknown): string | undefined {
  if (typeof value === 'string')
    return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  if (value !== null && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    const inner = (value as { value: unknown }).value
    if (typeof inner === 'string' || typeof inner === 'number' || typeof inner === 'boolean')
      return String(inner)
  }
  return undefined
}

function mapOfStrings(value: unknown): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  const map = asMap(value)
  if (map !== null) {
    for (const item of map.items) {
      const key = str(item.key)
      const val = str(item.value)
      if (key !== undefined && val !== undefined)
        out[key] = val
    }
  }
  else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const val = str(raw)
      if (val !== undefined)
        out[key] = val
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function seqOfStrings(value: unknown): string[] | undefined {
  const seq = asSeq(value)
  const items: unknown[] = seq !== null
    ? seq.items
    : (Array.isArray(value) ? value : [])
  const out = items.map(item => str(item)).filter((item): item is string => item !== undefined)
  return out.length > 0 ? out : undefined
}

function isMcpRow(node: YAMLMap): boolean {
  return str(node.get('name')) === MCP_PLUGIN
}

/** Collect every managed MCP row: root-level entries plus entries inside `insert` lists. */
export function findRows(doc: Document): PatchRowRef[] {
  const root = asSeq(doc.contents)
  const rows: PatchRowRef[] = []
  if (root === null)
    return rows
  const pushFromList = (list: YAMLSeq): void => {
    for (const item of list.items) {
      const node = asMap(item)
      if (node !== null && isMcpRow(node)) {
        rows.push({ id: str(node.get('id')) ?? '', node, list })
      }
    }
  }
  for (const item of root.items) {
    const node = asMap(item)
    if (node === null)
      continue
    if (isMcpRow(node))
      rows.push({ id: str(node.get('id')) ?? '', node, list: root })
    const insert = asSeq(node.get('insert'))
    if (insert !== null)
      pushFromList(insert)
  }
  return rows
}

/** Read a row into a plain object. */
export function rowData(ref: PatchRowRef): PatchRowData {
  const node = ref.node
  const config = asMap(node.get('config'))
  const transportRaw = config !== null ? str(config.get('transport')) : undefined
  const transport = transportRaw === 'stdio' ? 'stdio' : 'streamable-http'
  const data: PatchRowData = {
    id: ref.id,
    serverName: (config !== null ? str(config.get('serverName')) : undefined) ?? ref.id,
    transport,
    disabled: node.get('disabled') === true,
  }
  if (config === null)
    return data
  const command = str(config.get('command'))
  const url = str(config.get('url'))
  const cwd = str(config.get('cwd'))
  const args = seqOfStrings(config.get('args'))
  const env = mapOfStrings(config.get('env'))
  const headers = mapOfStrings(config.get('headers'))
  if (command !== undefined) data.command = command
  if (url !== undefined) data.url = url
  if (cwd !== undefined) data.cwd = cwd
  if (args !== undefined) data.args = args
  if (env !== undefined) data.env = env
  if (headers !== undefined) data.headers = headers
  return data
}

export function readRows(path: string): PatchRowData[] {
  const doc = parsePatch(readPatchFile(path))
  return findRows(doc).map(rowData)
}

/** Find the `insert` sequence to append to, creating a bare one when absent. */
export function managedInsert(doc: Document): YAMLSeq {
  const root = asSeq(doc.contents)
  if (root === null)
    throw new PatchError('patch file must contain a top-level YAML array')
  for (const item of root.items) {
    const node = asMap(item)
    if (node === null)
      continue
    if (node.get('id') === undefined && node.get('name') === undefined) {
      const insert = asSeq(node.get('insert'))
      if (insert !== null)
        return insert
    }
  }
  const owner = doc.createNode({ insert: [] }) as YAMLMap
  root.add(owner)
  const created = asSeq(owner.get('insert'))
  if (created === null)
    throw new PatchError('failed to create the insert list')
  return created
}

function takenIds(doc: Document): Set<string> {
  return new Set(findRows(doc).map(ref => ref.id).filter(id => id !== ''))
}

export function nextRowId(doc: Document, serverName: string): string {
  const taken = takenIds(doc)
  const base = `${MCP_ID_PREFIX}${slug(serverName)}`
  if (!taken.has(base))
    return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`))
    suffix += 1
  return `${base}-${suffix}`
}

export function slug(value: string): string {
  const slugged = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return slugged === '' ? 'server' : slugged
}

export function parseKeyValues(input: Record<string, string> | string | undefined): Record<string, string> | undefined {
  if (input === undefined)
    return undefined
  if (typeof input !== 'string') {
    const entries = Object.entries(input).filter(([key, value]) => key.trim() !== '' && String(value).trim() !== '')
    return entries.length > 0 ? Object.fromEntries(entries.map(([key, value]) => [key, String(value)])) : undefined
  }
  const out: Record<string, string> = {}
  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#'))
      continue
    const index = trimmed.indexOf('=')
    if (index <= 0)
      continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim()
    if (key !== '')
      out[key] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function parseArgs(input: string | string[] | undefined): string[] | undefined {
  if (input === undefined)
    return undefined
  if (Array.isArray(input)) {
    const out = input.map(item => String(item)).filter(item => item !== '')
    return out.length > 0 ? out : undefined
  }
  const out = splitArgs(input)
  return out.length > 0 ? out : undefined
}

/** Split a shell-ish argument string, honouring single and double quotes. */
export function splitArgs(input: string): string[] {
  const out: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let has = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i] as string
    if (quote !== null) {
      if (char === quote)
        quote = null
      else
        current += char
      has = true
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      has = true
      continue
    }
    if (/\s/.test(char)) {
      if (has) {
        out.push(current)
        current = ''
        has = false
      }
      continue
    }
    current += char
    has = true
  }
  if (has)
    out.push(current)
  return out
}

export function normalizeStdioCommand(command: string, args: string[] | undefined): { command: string, args?: string[] } {
  const trimmed = command.trim()
  if (args !== undefined && args.length > 0)
    return { command: trimmed, args }
  const parts = splitArgs(trimmed)
  if (parts.length > 1)
    return { command: parts[0] as string, args: parts.slice(1) }
  return { command: trimmed }
}

/** Build the loader row node for one MCP server. */
export function buildRowNode(doc: Document, input: McpRowInput, id: string): YAMLMap {
  const config: Record<string, unknown> = { serverName: input.serverName, transport: input.transport }
  if (input.transport === 'stdio') {
    const stdio = normalizeStdioCommand(input.command ?? '', parseArgs(input.args))
    config.command = stdio.command
    const args = stdio.args
    if (args !== undefined)
      config.args = args
    const env = parseKeyValues(input.env)
    if (env !== undefined)
      config.env = env
    if (input.cwd !== undefined && input.cwd.trim() !== '')
      config.cwd = input.cwd.trim()
  }
  else {
    config.url = (input.url ?? '').trim()
    const headers = parseKeyValues(input.headers)
    if (headers !== undefined)
      config.headers = headers
  }
  const row: Record<string, unknown> = { id, name: MCP_PLUGIN, config }
  if (input.disabled === true)
    row.disabled = true
  return doc.createNode(row) as YAMLMap
}

export interface SaveOutcome {
  id: string
  text: string
}

/** Insert or replace one MCP row. Returns the row id and the new file text. */
export function saveRow(text: string, input: McpRowInput): SaveOutcome {
  if (input.serverName.trim() === '')
    throw new PatchError('serverName is required')
  if (input.transport === 'stdio' && (input.command ?? '').trim() === '')
    throw new PatchError('command is required for a stdio server')
  if (input.transport !== 'stdio' && (input.url ?? '').trim() === '')
    throw new PatchError('url is required for a streamable-http server')

  const doc = parsePatch(text)
  const rows = findRows(doc)
  const requestedId = (input.id ?? '').trim()
  const existing = requestedId !== '' ? rows.find(ref => ref.id === requestedId) : undefined
  const id = existing !== undefined ? existing.id : (requestedId !== '' ? requestedId : nextRowId(doc, input.serverName))
  const node = buildRowNode(doc, input, id)

  if (existing === undefined) {
    managedInsert(doc).add(node)
  }
  else {
    const index = existing.list.items.indexOf(existing.node)
    if (index >= 0)
      existing.list.items[index] = node
  }
  return { id, text: stringifyPatch(doc) }
}

/** Remove one MCP row by id. Returns null when nothing matched. */
export function removeRow(text: string, id: string): string | null {
  const doc = parsePatch(text)
  const rows = findRows(doc)
  const hit = rows.find(ref => ref.id === id)
  if (hit === undefined)
    return null
  const index = hit.list.items.indexOf(hit.node)
  if (index >= 0)
    hit.list.items.splice(index, 1)
  // Drop an `insert` wrapper that we emptied and that carries no other keys.
  const root = asSeq(doc.contents)
  if (root !== null) {
    for (const item of [...root.items]) {
      const node = asMap(item)
      if (node === null)
        continue
      const insert = asSeq(node.get('insert'))
      if (insert !== null && insert.items.length === 0 && node.items.length === 1) {
        const wrapperIndex = root.items.indexOf(node)
        if (wrapperIndex >= 0)
          root.items.splice(wrapperIndex, 1)
      }
    }
  }
  return stringifyPatch(doc)
}

/** Enable/disable one MCP row by id. Returns null when nothing matched. */
export function toggleRow(text: string, id: string, disabled: boolean): string | null {
  const doc = parsePatch(text)
  const hit = findRows(doc).find(ref => ref.id === id)
  if (hit === undefined)
    return null
  if (disabled)
    hit.node.set('disabled', true)
  else
    hit.node.delete('disabled')
  return stringifyPatch(doc)
}

/** Write a patch file, creating parent directories as needed. */
export function writePatchFile(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text, 'utf8')
}
