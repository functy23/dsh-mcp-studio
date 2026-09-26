import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findRows, parsePatch, rowData, saveRow } from '../src/host/patch'
import { parseMcpServersJson, rowsToImportServers } from '../src/host/mcp-import'

describe('parseMcpServersJson', () => {
  it('parses the claude/cursor shape', () => {
    const servers = parseMcpServersJson(JSON.stringify({
      mcpServers: {
        fs: { command: 'npx', args: ['-y', 'server-filesystem', '/tmp'], env: { TOKEN: 'x' } },
        web: { url: 'https://example.com/mcp', headers: { Authorization: 'Bearer t' } },
      },
    }))
    assert.equal(servers.length, 2)
    assert.partialDeepStrictEqual(servers[0], { serverName: 'fs', transport: 'stdio', command: 'npx', args: ['-y', 'server-filesystem', '/tmp'], env: { TOKEN: 'x' } })
    assert.partialDeepStrictEqual(servers[1], { serverName: 'web', transport: 'streamable-http', url: 'https://example.com/mcp', headers: { Authorization: 'Bearer t' } })
  })

  it('accepts a bare map', () => {
    const servers = parseMcpServersJson('{"solo":{"command":"node"}}')
    assert.equal(servers.length, 1)
    assert.equal(servers[0]?.serverName, 'solo')
  })

  it('returns an empty list for junk', () => {
    assert.deepEqual(parseMcpServersJson('not json'), [])
    assert.deepEqual(parseMcpServersJson('[]'), [])
    assert.deepEqual(parseMcpServersJson('{"mcpServers":{"bad":{}}}'), [])
  })
})

describe('rowsToImportServers', () => {
  it('maps patch rows to import candidates', () => {
    const { text } = saveRow('', { serverName: 'one', transport: 'streamable-http', url: 'https://one.dev/mcp', disabled: true })
    const rows = findRows(parsePatch(text)).map(rowData)
    assert.deepEqual(rowsToImportServers(rows), [{ serverName: 'one', transport: 'streamable-http', url: 'https://one.dev/mcp', disabled: true }])
  })
})
