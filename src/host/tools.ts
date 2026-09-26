import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  checkServer,
  listServers,
  removeServer,
  restartServer,
  saveServer,
  toggleServer,
  type Scope,
} from './mcp'
import { SkillsManager } from './skills'
import type { StudioState } from './state'

function text(value: string): Array<{ type: 'text', text: string }> {
  return [{ type: 'text', text: value }]
}

function textOutput(): { schema: { type: 'string' }, render: (_args: unknown, value: string) => Array<{ type: 'text', text: string }> } {
  return { schema: { type: 'string' }, render: (_args: unknown, value: string) => text(value) }
}

function scopeOf(value: unknown): Scope {
  return value === 'global' ? 'global' : 'profile'
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * Register the model-facing tools. Names are prefixed with `mcp_studio_` so they
 * are easy to find in a tool list and cannot collide with other MCP managers.
 */
export function registerTools(ctx: any, state: StudioState): void {
  const registry = ctx?.get?.('tools')
  if (registry === undefined || registry === null || typeof registry.register !== 'function') {
    console.error('[dsh-mcp-studio] tools service unavailable; model tools not registered')
    return
  }
  const skills = new SkillsManager(state)

  registry.register(defineTool({
    name: 'mcp_studio_list',
    description: 'List every MCP server configured in the active DSH profile (scope, transport, enabled state, live loader state, and any patch parse errors).',
    parameters: {},
    output: textOutput(),
    async execute() {
      const { servers, errors } = listServers(state.paths, state.ctx)
      const lines = servers.map(server => [
        server.id,
        server.serverName,
        server.scope,
        server.transport,
        server.disabled ? 'disabled' : 'enabled',
        server.live !== undefined ? `loader:${server.live.disabled ? 'off' : 'on'}` : 'loader:unknown',
      ].join(' | '))
      const suffix = errors.length > 0 ? `\nparse errors:\n${errors.join('\n')}` : ''
      return `MCP servers (profile ${state.paths.profileName}):\n${lines.join('\n') || '(none)'}${suffix}`
    },
  }))

  registry.register(defineTool({
    name: 'mcp_studio_add',
    description: 'Add a new MCP server to the active profile (project scope) or to the global patch file, then let the loader hot-mount it.',
    parameters: {
      serverName: { type: 'string', required: true, description: 'Unique server name, e.g. web-search.' },
      transport: { type: 'string', required: true, description: 'streamable-http or stdio.' },
      url: { type: 'string', description: 'Server URL (required for streamable-http).' },
      command: { type: 'string', description: 'Executable plus optional arguments (required for stdio).' },
      args: { type: 'string', description: 'Arguments, space separated (stdio).' },
      env: { type: 'string', description: 'Extra environment variables as key=value lines (stdio).' },
      headers: { type: 'string', description: 'Extra headers as key=value lines (streamable-http).' },
      scope: { type: 'string', description: 'profile (default) or global.' },
    },
    output: textOutput(),
    async execute(args: any) {
      const saved = saveServer(state.paths, scopeOf(args.scope), {
        serverName: str(args.serverName),
        transport: args.transport === 'stdio' ? 'stdio' : 'streamable-http',
        command: str(args.command),
        args: str(args.args),
        env: str(args.env),
        headers: str(args.headers),
        url: str(args.url),
      })
      return `OK: added ${saved.id} to ${scopeOf(args.scope)} scope`
    },
  }))

  registry.register(defineTool({
    name: 'mcp_studio_set_enabled',
    description: 'Enable or disable one configured MCP server (writes the patch file; the loader applies it immediately).',
    parameters: {
      id: { type: 'string', required: true, description: 'Entry id, e.g. mcp-web-search.' },
      enabled: { type: 'boolean', required: true, description: 'true to enable, false to disable.' },
      scope: { type: 'string', description: 'profile (default) or global.' },
    },
    output: textOutput(),
    async execute(args: any) {
      const ok = toggleServer(state.paths, scopeOf(args.scope), str(args.id), args.enabled !== true)
      if (!ok)
        throw new Error(`no such MCP row: ${str(args.id)}`)
      return `OK: ${str(args.id)} now ${args.enabled === true ? 'enabled' : 'disabled'}`
    },
  }))

  registry.register(defineTool({
    name: 'mcp_studio_restart',
    description: 'Restart one MCP server (disable, wait for unload, re-enable) so the client reconnects and re-syncs its tools.',
    parameters: {
      id: { type: 'string', required: true, description: 'Entry id, e.g. mcp-web-search.' },
      scope: { type: 'string', description: 'profile (default) or global.' },
    },
    output: textOutput(),
    async execute(args: any) {
      const ok = await restartServer(state.paths, scopeOf(args.scope), str(args.id))
      if (!ok)
        throw new Error(`no such MCP row: ${str(args.id)}`)
      return `OK: ${str(args.id)} restarted`
    },
  }))

  registry.register(defineTool({
    name: 'mcp_studio_remove',
    description: 'Remove one MCP server from the active profile or from the global patch file.',
    parameters: {
      id: { type: 'string', required: true, description: 'Entry id, e.g. mcp-web-search.' },
      scope: { type: 'string', description: 'profile (default) or global.' },
    },
    output: textOutput(),
    async execute(args: any) {
      const ok = removeServer(state.paths, scopeOf(args.scope), str(args.id))
      if (!ok)
        throw new Error(`no such MCP row: ${str(args.id)}`)
      return `OK: removed ${str(args.id)}`
    },
  }))

  registry.register(defineTool({
    name: 'mcp_studio_check',
    description: 'Health-check one MCP server: PATH lookup for stdio commands, HTTP reachability for streamable-http URLs.',
    parameters: {
      id: { type: 'string', required: true, description: 'Entry id, e.g. mcp-web-search.' },
      scope: { type: 'string', description: 'profile (default) or global.' },
    },
    output: textOutput(),
    async execute(args: any) {
      const result = await checkServer(state.paths, scopeOf(args.scope), str(args.id))
      return `${result.ok ? 'OK' : 'FAIL'}: ${str(args.id)} — ${result.detail}`
    },
  }))

  registry.register(defineTool({
    name: 'skill_studio_list',
    description: 'List every skill DSH can see (name, level, provider, availability), including skills disabled through this plugin.',
    parameters: {},
    output: textOutput(),
    async execute() {
      const result = await skills.list()
      if (!result.ok)
        throw new Error(result.error ?? 'skills unavailable')
      const lines = result.skills.map(skill => [
        skill.name,
        skill.level,
        skill.provider ?? '-',
        skill.disabledByStudio ? 'disabled-by-studio' : (skill.modelInvocable ? 'available' : 'disabled'),
      ].join(' | '))
      return `Skills (${result.skills.length}):\n${lines.join('\n') || '(none)'}`
    },
  }))

  registry.register(defineTool({
    name: 'skill_studio_set_enabled',
    description: 'Enable or disable one skill through a rank-0 override provider (no user file is modified).',
    parameters: {
      name: { type: 'string', required: true, description: 'Skill name, e.g. code-review.' },
      enabled: { type: 'boolean', required: true, description: 'true to enable, false to disable.' },
    },
    output: textOutput(),
    async execute(args: any) {
      const result = await skills.setEnabled(str(args.name), args.enabled === true)
      if (!result.ok)
        throw new Error(result.error ?? 'toggle failed')
      return `OK: ${str(args.name)} now ${args.enabled === true ? 'enabled' : 'disabled'}`
    },
  }))
}
