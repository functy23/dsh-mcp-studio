import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { detectHome, detectProfileDir, resolveStudioPaths } from '../src/host/paths'

describe('detectProfileDir', () => {
  const home = '/Users/tester/.dsh'

  it('prefers an explicit DSH_PROFILE_DIR', () => {
    const result = detectProfileDir([], { DSH_PROFILE_DIR: home + '/profiles/desktop' }, home)
    assert.equal(result.profileName, 'desktop')
    assert.equal(result.profileDir, home + '/profiles/desktop')
  })

  it('honours DSH_PROFILE', () => {
    const result = detectProfileDir([], { DSH_PROFILE: 'tauri' }, home)
    assert.deepEqual(result, { profileDir: home + '/profiles/tauri', profileName: 'tauri' })
  })

  it('reads the profile out of the launcher argv', () => {
    const argv = ['/Applications/DeepSeek Harness.app/node', '/app.asar/dsh', '/Users/tester/.dsh/profiles/desktop', '/runtime']
    const result = detectProfileDir(argv, {}, home)
    assert.equal(result.profileName, 'desktop')
    assert.equal(result.profileDir, '/Users/tester/.dsh/profiles/desktop')
  })

  it('falls back to the most recently touched profile that has a patch file', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'mcp-studio-profiles-'))
    try {
      for (const [name, mtime] of [['web', 1_000_000], ['desktop', 2_000_000]] as const) {
        const dir = join(scratch, 'profiles', name)
        mkdirSync(dir, { recursive: true })
        const patch = join(dir, 'cordis.patch.yml')
        writeFileSync(patch, '[]\n')
        utimesSync(patch, mtime, mtime)
      }
      const result = detectProfileDir([], {}, scratch)
      assert.equal(result.profileName, 'desktop')
    }
    finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  })

  it('falls back to web when nothing is found', () => {
    const result = detectProfileDir([], {}, home, () => false)
    assert.deepEqual(result, { profileDir: home + '/profiles/web', profileName: 'web' })
  })
})

describe('detectHome', () => {
  it('uses DSH_HOME when present', () => {
    assert.equal(detectHome({ DSH_HOME: '/tmp/dsh' }), '/tmp/dsh')
  })

  it('falls back to ~/.dsh', () => {
    assert.match(detectHome({}), /[\\/]\.dsh$/)
  })
})

describe('resolveStudioPaths', () => {
  it('composes both patch paths', () => {
    const paths = resolveStudioPaths({ home: '/tmp/dsh', argv: [], env: { DSH_PROFILE: 'desktop' } })
    assert.equal(paths.projectPatch, '/tmp/dsh/profiles/desktop/cordis.patch.yml')
    assert.equal(paths.globalPatch, '/tmp/dsh/cordis.patch.yml')
  })
})
