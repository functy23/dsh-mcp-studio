# dsh-mcp-studio

<div align="center">

**The MCP server & Skills manager for DeepSeek Harness — one plugin, web and desktop.**

<code>CRUD for MCP servers</code> <code>restart / health checks</code> <code>import scanning</code> <code>JSON backup</code> <code>Skills browser & toggles</code> <code>8 model tools</code> <code>HTTP API</code>

Disabling a skill uses a **rank-0 override provider** and never touches a `SKILL.md`;
MCP rows are written to `cordis.patch.yml`, applied by HMR, and kept across restarts.

</div>

---

## ✨ Why

MCP management in the DSH ecosystem has been tied to one distribution: the Tauri desktop
edition's `dsh-tauri-panel-extension` needs `dsh-tauri` + `dsh-tauri-ui` + the panel package
installed together, and **does not work on the web or desktop profiles**.

`dsh-mcp-studio` folds the same capability into **one package with zero `dsh-tauri`
dependencies**, built only on public DSH contracts:

- the host half uses a `webServer` exact route, `ctx.tools.register` and `ctx.skills`;
- the client half registers **Settings → MCP 管理** and **Settings → Skills 管理** via
  `slots.inject('settings.section', …)`;
- nothing outside the active profile is touched, and no distribution-private module is imported.

The result: `web`, `desktop` and `tauri` profiles all install the same build with one command.

## 🚀 Install

**Requirement**: a working DSH (web edition, desktop edition, or Tauri edition).

```sh
dsh plugin --profile desktop add dsh-mcp-studio@latest   # DSH Desktop
dsh plugin --profile web     add dsh-mcp-studio@latest   # DSH Web
dsh plugin --profile tauri   add dsh-mcp-studio@latest   # Tauri desktop
```

The package declares `dsh.bundle.patch`, so installation mounts it automatically — no manual
config edits. Hard-refresh the browser afterwards (Cmd/Ctrl+Shift+R); restart DSH once if the
host half changed.

**Local development (link install)**

```sh
pnpm install && pnpm build
# ~/.dsh/profiles/<profile>/package.json
#   "dependencies": { "dsh-mcp-studio": "link:/path/to/dsh-mcp-studio" }
#   "dsh": { "profile": { "bundles": [ ..., "dsh-mcp-studio" ] } }
pnpm install --dir ~/.dsh/profiles/desktop
```

## 🧭 Screens

### Settings → MCP 管理

Server list (id, name, transport, scope, enabled state, live loader state, shadowing), add /
edit for both `streamable-http` and `stdio` shapes, enable / disable, restart (disable →
unload → re-enable), health checks (PATH probe for stdio, timed HTTP probe otherwise),
copy as DSH YAML / plain JSON / standard `mcpServers` JSON, import scanning, and JSON
export/import with id-based de-duplication.

### Settings → Skills 管理

Skills grouped by level (project / runtime / custom / user / bundled / plugin) and then by
provider, with search, one-click enable/disable through the override provider, a detail view
that shows the raw `SKILL.md`, and a persisted state file at
`<profile>/dsh-mcp-studio.json`. User-level skills are listed read-only with the reason shown.

## 🤖 Model tools

`mcp_studio_list`, `mcp_studio_add`, `mcp_studio_set_enabled`, `mcp_studio_restart`,
`mcp_studio_remove`, `mcp_studio_check`, `skill_studio_list`, `skill_studio_set_enabled`.

## 🌐 HTTP API

```sh
curl -s http://127.0.0.1:3080/dsh-mcp-studio/api \
  -H 'content-type: application/json' \
  -H 'x-dsh-plugin: dsh-mcp-studio' \
  -d '{"op":"mcp-list","args":{}}'
```

POST-only; the `x-dsh-plugin` header is required (a cross-site page cannot set a custom header
without a CORS preflight, which this route never answers); `Origin` is checked when present;
bodies are capped at 1 MiB; an unparseable patch file is reported, never rewritten.

Ops: `ping`, `paths`, `mcp-list`, `mcp-save`, `mcp-remove`, `mcp-toggle`, `mcp-restart`,
`mcp-check`, `mcp-copy`, `mcp-export`, `mcp-import`, `mcp-import-scan`, `mcp-import-apply`,
`skill-list`, `skill-detail`, `skill-toggle`, `skill-refresh`.

## 🛠 Development

```sh
pnpm install
pnpm typecheck     # tsc --noEmit
pnpm build         # node scripts/build.mjs (esbuild)
pnpm test          # node scripts/test.mjs (node:test, 53 tests)
pnpm check         # everything
```

esbuild and `node:test` are used deliberately: the DSH runtime's Node enforces macOS library
validation, so rollup/rolldown/vitest `.node` bindings fail to load. See `AGENTS.md`.

## 🙏 Credits

- **[deepseek-harness-desktop](https://github.com/dsh-tauri-desk/deepseek-harness-desktop)**
  (Tauri desktop edition) — the functional baseline for this project:
  `packages/dsh-tauri-panel-extension` defined the MCP / Skills panel experience and the key
  design decisions (patch-row writes, profile detection, health checks, import scanning).
- Official plugin docs: <https://deepseek-harness.github.io/deepseek-harness/develop/basic/>

## 📄 License

[MIT](LICENSE)
