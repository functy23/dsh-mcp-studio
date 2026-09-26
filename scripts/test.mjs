/**
 * Test runner: pre-bundle every `tests/*.spec.ts` with esbuild, then hand the
 * result to Node's built-in test runner.
 *
 * Why not vitest: the DSH runtime's Node enforces library validation, and
 * rollup/rolldown ship `.node` bindings signed by a different Team ID, so
 * dlopen fails on macOS. esbuild spawns a standalone binary and is unaffected,
 * and `node:test` needs no native code at all.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'esbuild'

const outDir = '.test-build'
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const specs = readdirSync('tests').filter(name => name.endsWith('.spec.ts')).sort()
if (specs.length === 0) {
  console.error('no tests/*.spec.ts found')
  process.exit(1)
}

await build({
  entryPoints: specs.map(name => join('tests', name)),
  outdir: outDir,
  outExtension: { '.js': '.test.cjs' },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'es2022',
  sourcemap: false,
  logLevel: 'error',
})

const files = specs.map(name => join(outDir, name.replace(/\.ts$/, '.test.cjs')))
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' })
process.exit(result.status ?? 1)
