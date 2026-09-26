/**
 * Build the two shipped artifacts:
 *
 *   lib/index.js   — host half, ESM, `yaml` bundled in, DSH runtime packages external
 *   lib/client.js  — client half, CJS inside the DSH ModuleLoader factory wrapper
 *
 * esbuild is used instead of a rollup-based bundler because the DSH runtime's
 * Node has library validation enabled: loading a rollup/rolldown `.node` binding
 * signed by a different Team ID fails on macOS. esbuild drives a standalone
 * binary, which is unaffected.
 */
import { build } from 'esbuild'
import { mkdir, rm } from 'node:fs/promises'

const id = 'dsh-mcp-studio'
const runtimeProvided = ['@deepseek-ai/dsh-tools', '@deepseek-ai/cordis']

await rm('lib', { recursive: true, force: true })
await mkdir('lib', { recursive: true })

const shared = {
  bundle: true,
  target: 'es2022',
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'info',
}

await build({
  ...shared,
  entryPoints: ['src/host/index.ts'],
  outfile: 'lib/index.js',
  format: 'esm',
  platform: 'node',
  external: runtimeProvided,
  // `yaml` is bundled and is a CJS package; give esbuild's interop shim a real
  // `require` so the ESM host half can load it.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
})

await build({
  ...shared,
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  format: 'cjs',
  platform: 'browser',
  external: ['react'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  banner: {
    js: [
      `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      'var module = { exports: {} }; var exports = module.exports;',
    ].join('\n'),
  },
  footer: { js: 'return module.exports; } });' },
})

console.log(`built ${id}: lib/index.js + lib/client.js`)