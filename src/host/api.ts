import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PLUGIN_ID } from '../shared/constants'
import type { StudioState } from './state'
import {
  checkServer,
  copyServer,
  exportServers,
  importServers,
  listServers,
  removeServer,
  restartServer,
  saveServer,
  toggleServer,
  type Scope,
} from './mcp'
import { scanImportSources } from './mcp-import'
import { SkillsManager } from './skills'
import type { McpRowInput } from './patch'

const MAX_BODY_BYTES = 1024 * 1024

export interface ApiEnvelope {
  op?: string
  args?: Record<string, unknown>
}

function packageVersion(): string {
  try {
    const url = new URL('../package.json', import.meta.url)
    const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as { version?: string }
    return parsed.version ?? '0.0.0'
  }
  catch {
    return '0.0.0'
  }
}

function headerOf(req: IncomingMessage, name: string): string {
  const value = req.headers?.[name]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request body too large'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
}

function asScope(value: unknown): Scope {
  return value === 'global' ? 'global' : 'profile'
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/**
 * Build the HTTP handler for `/dsh-mcp-studio/api`.
 *
 * Security posture: the route can rewrite loader patch files, so it is POST-only,
 * requires the `x-dsh-plugin` header (a cross-origin page cannot attach a custom
 * header without a CORS preflight, which this route never answers), rejects
 * non-same-origin `Origin` headers, and caps the request body at 1 MiB.
 */
export function createApiHandler(state: StudioState): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const skills = new SkillsManager(state)
  skills.register()
  const handlers: Record<string, (args: Record<string, unknown>) => Promise<unknown> | unknown> = {
    ping: () => ({ ok: true, version: packageVersion(), profile: state.paths.profileName }),

    paths: () => ({
      ok: true,
      paths: {
        home: state.paths.home,
        profile: state.paths.profileDir,
        profileName: state.paths.profileName,
        projectPatch: state.paths.projectPatch,
        globalPatch: state.paths.globalPatch,
      },
      version: packageVersion(),
      skillsAvailable: skills.available,
    }),

    'mcp-list': () => {
      const { servers, errors } = listServers(state.paths, state.ctx)
      return { ok: true, servers, errors, paths: state.paths }
    },

    'mcp-save': (args) => {
      const input = (args.input ?? args) as McpRowInput
      const saved = saveServer(state.paths, asScope(args.scope), input)
      return { ok: true, id: saved.id, scope: asScope(args.scope) }
    },

    'mcp-remove': (args) => {
      const removed = removeServer(state.paths, asScope(args.scope), asString(args.id))
      return removed ? { ok: true } : { ok: false, error: `未找到条目 ${asString(args.id)}` }
    },

    'mcp-toggle': (args) => {
      const enabled = args.enabled === true
      const toggled = toggleServer(state.paths, asScope(args.scope), asString(args.id), !enabled)
      return toggled ? { ok: true, id: asString(args.id), enabled } : { ok: false, error: `未找到条目 ${asString(args.id)}` }
    },

    'mcp-restart': async (args) => {
      const restarted = await restartServer(state.paths, asScope(args.scope), asString(args.id))
      return restarted ? { ok: true, id: asString(args.id) } : { ok: false, error: `未找到条目 ${asString(args.id)}` }
    },

    'mcp-check': async (args) => {
      const result = await checkServer(state.paths, asScope(args.scope), asString(args.id))
      return { ok: result.ok, detail: result.detail, id: asString(args.id) }
    },

    'mcp-copy': (args) => {
      const format = args.format === 'yaml' ? 'yaml' : args.format === 'mcpServers' ? 'mcpServers' : 'json'
      const snippet = copyServer(state.paths, asScope(args.scope), asString(args.id), format)
      return snippet === null ? { ok: false, error: '未找到条目' } : { ok: true, snippet, format }
    },

    'mcp-export': () => ({ ok: true, bundle: exportServers(state.paths) }),

    'mcp-import': (args) => {
      let payload: unknown = args.payload
      if (payload === undefined && typeof args.json === 'string') {
        try {
          payload = JSON.parse(args.json)
        }
        catch (error) {
          return { ok: false, error: `JSON 解析失败：${error instanceof Error ? error.message : String(error)}` }
        }
      }
      const outcome = importServers(state.paths, asScope(args.scope), payload)
      return { ok: true, ...outcome }
    },

    'mcp-import-scan': () => {
      const { servers } = listServers(state.paths, state.ctx)
      const sources = scanImportSources(state.paths, servers.map(server => server.serverName))
      return { ok: true, sources }
    },

    'mcp-import-apply': (args) => {
      const servers = Array.isArray(args.servers) ? args.servers : []
      const outcome = importServers(state.paths, asScope(args.scope), { servers })
      return { ok: true, ...outcome }
    },

    'skill-list': async () => skills.list(),

    'skill-detail': async (args) => skills.detail(asString(args.name)),

    'skill-toggle': async (args) => {
      const enabled = args.enabled === true
      const result = await skills.setEnabled(asString(args.name), enabled)
      return result.ok ? { ok: true, name: asString(args.name), enabled } : result
    },

    'skill-refresh': async () => skills.refresh(),

    'plugin-version': () => ({ ok: true, version: packageVersion(), id: PLUGIN_ID }),
  }

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (String(req.method ?? 'POST').toUpperCase() !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    if (headerOf(req, state.api.gateHeader) !== state.api.gateValue) {
      sendJson(res, 403, { ok: false, error: 'missing plugin gate header' })
      return
    }
    const origin = headerOf(req, 'origin')
    if (origin !== '') {
      let sameOrigin = false
      try {
        const url = new URL(origin)
        sameOrigin = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname) || url.host === headerOf(req, 'host')
      }
      catch {
        sameOrigin = false
      }
      if (!sameOrigin) {
        sendJson(res, 403, { ok: false, error: 'cross-origin request rejected' })
        return
      }
    }

    let envelope: ApiEnvelope = {}
    try {
      envelope = JSON.parse((await readBody(req)) || '{}') as ApiEnvelope
    }
    catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      sendJson(res, 200, { ok: false, error: detail.includes('too large') ? '请求体过大' : `请求解析失败：${detail}` })
      return
    }

    const op = String(envelope.op ?? '')
    const handler = handlers[op]
    if (handler === undefined) {
      sendJson(res, 200, { ok: false, error: `未知操作: ${op}` })
      return
    }
    try {
      const result = await handler(envelope.args ?? {})
      sendJson(res, 200, result === undefined ? { ok: true } : result)
    }
    catch (error) {
      sendJson(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  }
}
