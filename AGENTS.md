# AGENTS.md — dsh-mcp-studio

Working notes for agents (and humans) editing this repository.

## What this project is

A single DSH plugin that manages **MCP servers** and **Skills** for any DeepSeek Harness
profile (web / desktop / tauri). It replaces the multi-package, Tauri-only
`dsh-tauri-panel-extension` arrangement with one package that depends on nothing but the
public DSH plugin contract.

## Hard constraints

1. **No distribution-private dependencies.** Never import `dsh-tauri`, `dsh-tauri-ui`,
   `dsh-tauri-session` or any other Tauri-side package. Everything must work through
   `webServer`, `tools`, `skills`, `settings` and the client `slots` registry.
2. **No new native modules.** The DSH runtime's Node enforces macOS library validation, so
   any `.node` binding signed by another Team ID fails to `dlopen`. That is why this repo
   builds with esbuild (standalone binary) and tests with `node:test` (pure JS) instead of
   rollup/rolldown-based tooling. Do not add vitest, rollup, rolldown, swc or similar.
3. **Never damage a user's patch file.** `src/host/patch.ts` may only add, edit, remove or
   toggle entries whose `name` is `@deepseek-ai/dsh-mcp-client`. A file that fails to parse
   must produce an error, never a rewrite. The CRUD self-test in the README flow
   (add → list → check → toggle → remove) must leave the file byte-identical to the backup.
4. **No user-file edits for skills.** Skill enable/disable goes through a rank-0 override
   provider persisted in `<profile>/dsh-mcp-studio.json`. Never write into a user's
   `SKILL.md` or `~/.dsh/skills`.
5. **The API route stays gated.** POST-only, `x-dsh-plugin: dsh-mcp-studio` header required,
   same-origin `Origin` check, 1 MiB body cap. Do not relax these.

## Layout

```
src/shared/constants.ts   ids, API path, page slot metadata, wire types
src/host/index.ts         plugin object { name, inject, apply } — the only entry point
src/host/paths.ts         DSH home / profile detection (pure, unit-tested)
src/host/patch.ts         YAML row-level read/write for cordis.patch.yml (pure, unit-tested)
src/host/mcp.ts           server CRUD, restart, export/import, copy snippets
src/host/mcp-check.ts     PATH and HTTP health probes
src/host/mcp-import.ts    scanning Claude/Cursor/Windsurf/VS Code/other-profile configs
src/host/skills.ts        skill list/detail/toggle via the override provider
src/host/tools.ts         8 model-facing tools
src/host/api.ts           HTTP API: gate, body cap, op dispatch
src/client/index.ts       client plugin: registers the two settings pages
src/client/pages/*.tsx    MCP page and Skills page (React, classic runtime)
scripts/build.mjs         esbuild build → lib/index.js + lib/client.js
scripts/test.mjs          esbuild pre-bundle + node:test
```

## Commands

```sh
pnpm install
pnpm typecheck     # tsc --noEmit
pnpm build         # node scripts/build.mjs
pnpm test          # node scripts/test.mjs
pnpm check         # all three
```

The bundled DSH runtime Node may not be on `PATH`; prepend it when running pnpm by hand:

```sh
export PATH="$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin:$PATH"
```

## Installing into a profile (development loop)

```sh
# ~/.dsh/profiles/<profile>/package.json
#   dependencies: { "dsh-mcp-studio": "link:/abs/path/to/dsh-mcp-studio" }
#   dsh.profile.bundles: [ ..., "dsh-mcp-studio" ]
pnpm install --dir ~/.dsh/profiles/<profile>
```

The DSH loader hot-applies the new bundle, so the host half is reachable without a restart:

```sh
curl -s http://127.0.0.1:<port>/dsh-mcp-studio/api \
  -H 'content-type: application/json' -H 'x-dsh-plugin: dsh-mcp-studio' \
  -d '{"op":"ping","args":{}}'
```

The client half needs a browser hard refresh; a new settings page appears under
**设置 → MCP 管理 / Skills 管理**.

## Conventions

- Host code is strict TypeScript, no `any` leaks beyond DSH service handles (which are
  typed `any` on purpose — their runtime shape is not a public contract).
- Pure logic lives in small functions so it can be unit-tested without a running DSH.
- Every write path is validated first and reported back as `{ ok, error }`; the UI never
  assumes success.
- Client code is React `createElement` output (classic runtime) so the bundle only needs
  `require('react')` inside the DSH ModuleLoader factory.
- Comments explain *why* (constraints, ordering, caveats), not *what*.

## Licensing

MIT. `README.md` credits the Tauri desktop edition
(<https://github.com/dsh-tauri-desk/deepseek-harness-desktop>) as the functional baseline —
keep that credit when editing docs or shipping a release.
