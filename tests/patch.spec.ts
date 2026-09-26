import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  findRows,
  nextRowId,
  parseArgs,
  parseKeyValues,
  parsePatch,
  removeRow,
  rowData,
  saveRow,
  slug,
  splitArgs,
  stringifyPatch,
  toggleRow,
} from '../src/host/patch'
import { MCP_PLUGIN } from '../src/shared/constants'

const base = `- insert:
    - id: mcp-existing
      name: '${MCP_PLUGIN}'
      config:
        serverName: existing
        transport: streamable-http
        url: https://example.com/mcp
`

function readRowsFrom(text: string) {
  return findRows(parsePatch(text)).map(rowData)
}

describe('splitArgs', () => {
  it('splits on whitespace and honours quotes', () => {
    assert.deepEqual(splitArgs('-y @scope/pkg /tmp'), ['-y', '@scope/pkg', '/tmp'])
    assert.deepEqual(splitArgs('-m "hello world" --flag'), ['-m', 'hello world', '--flag'])
  })

  it('returns an empty list for blank input', () => {
    assert.deepEqual(splitArgs('   '), [])
  })
})

describe('parseKeyValues', () => {
  it('parses key=value lines, skipping comments and blanks', () => {
    assert.deepEqual(parseKeyValues('A=1\n# note\nB = 2\n'), { A: '1', B: '2' })
  })

  it('accepts a record', () => {
    assert.deepEqual(parseKeyValues({ A: '1', B: '' }), { A: '1' })
  })

  it('returns undefined when empty', () => {
    assert.equal(parseKeyValues(''), undefined)
  })
})

describe('parseArgs', () => {
  it('keeps arrays', () => {
    assert.deepEqual(parseArgs(['a', 'b']), ['a', 'b'])
  })

  it('splits strings', () => {
    assert.deepEqual(parseArgs('a b'), ['a', 'b'])
  })
})

describe('slug', () => {
  it('normalises names', () => {
    assert.equal(slug('My Server!'), 'my-server')
    assert.equal(slug('   '), 'server')
  })
})

describe('parsePatch', () => {
  it('parses an existing patch file', () => {
    const doc = parsePatch(base)
    assert.equal(findRows(doc).length, 1)
    assert.partialDeepStrictEqual(rowData(findRows(doc)[0] as never), { id: 'mcp-existing', serverName: 'existing', transport: 'streamable-http' })
  })

  it('treats an empty file as an empty list', () => {
    assert.equal(findRows(parsePatch('')).length, 0)
  })

  it('rejects a non-array document', () => {
    assert.throws(() => parsePatch('id: nope'))
  })

  it('keeps unrelated entries untouched', () => {
    const text = `- id: other\n  name: 'some-plugin'\n` + base
    const doc = parsePatch(text)
    assert.equal(findRows(doc).length, 1)
    assert.ok(stringifyPatch(doc).includes('some-plugin'))
  })
})

describe('saveRow', () => {
  it('appends a new row to the existing insert list', () => {
    const { id, text } = saveRow(base, { serverName: 'fresh', transport: 'stdio', command: 'npx -y server-filesystem' })
    assert.equal(id, 'mcp-fresh')
    const rows = readRowsFrom(text)
    assert.equal(rows.length, 2)
    assert.partialDeepStrictEqual(rows[1], { id: 'mcp-fresh', serverName: 'fresh', transport: 'stdio', command: 'npx', args: ['-y', 'server-filesystem'] })
  })

  it('creates an insert list when none exists', () => {
    const { text } = saveRow('- id: other\n  name: some-plugin\n', { serverName: 'solo', transport: 'streamable-http', url: 'https://x.dev/mcp' })
    assert.ok(text.includes('insert'))
    assert.equal(readRowsFrom(text).length, 1)
  })

  it('replaces an existing row in place', () => {
    const { text } = saveRow(base, { id: 'mcp-existing', serverName: 'existing', transport: 'streamable-http', url: 'https://changed.dev/mcp' })
    const rows = readRowsFrom(text)
    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.url, 'https://changed.dev/mcp')
  })

  it('keeps env, arguments and disabled state', () => {
    const { text } = saveRow(base, {
      serverName: 'with-env',
      transport: 'stdio',
      command: 'node',
      args: ['server.js'],
      env: 'TOKEN=abc',
      disabled: true,
    })
    const row = readRowsFrom(text).find(candidate => candidate.serverName === 'with-env')
    assert.partialDeepStrictEqual(row, { disabled: true, env: { TOKEN: 'abc' } })
  })

  it('requires a serverName', () => {
    assert.throws(() => saveRow(base, { serverName: '  ', transport: 'stdio', command: 'x' }), /serverName/)
  })

  it('requires a command for stdio servers', () => {
    assert.throws(() => saveRow(base, { serverName: 'x', transport: 'stdio' }), /command/)
  })

  it('requires a url for http servers', () => {
    assert.throws(() => saveRow(base, { serverName: 'x', transport: 'streamable-http' }), /url/)
  })

  it('suffixes colliding ids', () => {
    const { text } = saveRow(base, { serverName: 'existing', transport: 'streamable-http', url: 'https://second.dev/mcp' })
    assert.deepEqual(readRowsFrom(text).map(row => row.id), ['mcp-existing', 'mcp-existing-2'])
  })
})

describe('nextRowId', () => {
  it('reuses the base id when free', () => {
    assert.equal(nextRowId(parsePatch(base), 'brand-new'), 'mcp-brand-new')
  })
})

describe('removeRow', () => {
  it('removes the row and prunes the empty insert wrapper', () => {
    const text = removeRow(base, 'mcp-existing')
    assert.notEqual(text, null)
    assert.equal(findRows(parsePatch(text as string)).length, 0)
    assert.ok(!(text as string).includes('insert'))
  })

  it('returns null for an unknown id', () => {
    assert.equal(removeRow(base, 'mcp-nope'), null)
  })
})

describe('toggleRow', () => {
  it('sets and clears the disabled flag', () => {
    const disabled = toggleRow(base, 'mcp-existing', true) as string
    assert.equal(readRowsFrom(disabled)[0]?.disabled, true)
    const enabled = toggleRow(disabled, 'mcp-existing', false) as string
    assert.equal(readRowsFrom(enabled)[0]?.disabled, false)
  })

  it('returns null for an unknown id', () => {
    assert.equal(toggleRow(base, 'mcp-nope', true), null)
  })
})
