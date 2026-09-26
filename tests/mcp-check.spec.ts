import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { checkRow, resolveCommandOnPath } from '../src/host/mcp-check'

describe('resolveCommandOnPath', () => {
  const pathEnv = '/usr/bin:/usr/local/bin'

  it('finds a bare command on PATH', () => {
    const exists = (path: string): boolean => path === '/usr/local/bin/npx'
    assert.equal(resolveCommandOnPath('npx', pathEnv, 'linux', exists), true)
  })

  it('reports a missing command', () => {
    assert.equal(resolveCommandOnPath('nope', pathEnv, 'linux', () => false), false)
  })

  it('probes explicit paths directly', () => {
    const exists = (path: string): boolean => path === '/opt/tools/server'
    assert.equal(resolveCommandOnPath('/opt/tools/server', pathEnv, 'linux', exists), true)
  })

  it('tries windows extensions', () => {
    // `path.join` uses the host separator, so match on the suffix the probe must try.
    const exists = (candidate: string): boolean => candidate.includes('npx.cmd')
    assert.equal(resolveCommandOnPath('npx', 'C:\\tools', 'win32', exists), true)
    assert.equal(resolveCommandOnPath('npx', 'C:\\tools', 'win32', () => false), false)
  })

  it('rejects an empty command', () => {
    assert.equal(resolveCommandOnPath('', pathEnv, 'linux', () => true), false)
  })
})

describe('checkRow', () => {
  it('checks stdio commands against PATH', async () => {
    const result = await checkRow({ id: 'a', serverName: 'a', transport: 'stdio', command: 'npx', disabled: false }, {
      pathEnv: '/bin',
      platform: 'linux',
      exists: path => path === '/bin/npx',
    })
    assert.equal(result.ok, true)
  })

  it('reports a missing stdio command', async () => {
    const result = await checkRow({ id: 'a', serverName: 'a', transport: 'stdio', command: 'nope', disabled: false }, {
      pathEnv: '/bin',
      platform: 'linux',
      exists: () => false,
    })
    assert.equal(result.ok, false)
    assert.ok(result.detail.includes('nope'))
  })

  it('reports a bad http url', async () => {
    const result = await checkRow({ id: 'a', serverName: 'a', transport: 'streamable-http', url: 'ftp://x', disabled: false })
    assert.equal(result.ok, false)
  })

  it('reports the http status', async () => {
    const result = await checkRow({ id: 'a', serverName: 'a', transport: 'streamable-http', url: 'https://example.com/mcp', disabled: false }, {
      fetchImpl: (async () => ({ status: 200 })) as unknown as typeof fetch,
    })
    assert.deepEqual(result, { ok: true, detail: 'HTTP 200' })
  })

  it('captures fetch failures', async () => {
    const failing = (async () => { throw new Error('ECONNREFUSED') }) as unknown as typeof fetch
    const result = await checkRow({ id: 'a', serverName: 'a', transport: 'streamable-http', url: 'https://example.com/mcp', disabled: false }, { fetchImpl: failing })
    assert.equal(result.ok, false)
    assert.ok(result.detail.includes('ECONNREFUSED'))
  })
})
