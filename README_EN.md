# dsh-mcp-studio

<div align="center">

**The MCP server & Skills manager for DeepSeek Harness — the Tauri desktop edition's extension panel, consolidated into one cross-platform plugin.**

<code>Original panel UI, unmodified</code> <code>No Tauri runtime dependency</code> <code>Web / Desktop / Tauri</code>

</div>

---

## 📦 What this is

The Tauri desktop edition ([deepseek-harness-desktop](https://github.com/dsh-tauri-desk/deepseek-harness-desktop))
ships its extension panel (Skills / MCP / plugin market) as **three mutually dependent packages**:

| Upstream package | Role | Depends on |
| --- | --- | --- |
| `dsh-tauri-panel-extension` | the panel itself: Skills / MCP / market tabs + host routes | `dsh-tauri`, `dsh-tauri-ui` |
| `dsh-tauri` | host + client framework bridge (`defineRoutes`, `defineService`, `definePanel`, `defineRegister`, locale, store) | — |
| `dsh-tauri-ui` | components used by the panel (Button/Chip/Modal/SegmentedControl/PanelPage/icons…) | `dsh-tauri` |

Installing MCP management meant installing all three, and it only worked inside the Tauri build.

**dsh-mcp-studio consolidates them into a single package**: the upstream sources are vendored as-is
(`src/panel`, `src/vendor/dsh-tauri`, `src/vendor/dsh-tauri-ui`), a build-time alias layer (`src/bridge`)
maps the old bare specifiers onto those local files, and only the minimum changes needed for
cross-platform support are applied. **No UI was rewritten.**

## ✨ How the integration works

```
src/panel/            the extension panel, verbatim (host services + routes, client components/register/locales/styles)
src/vendor/dsh-tauri/ the framework bridge it imports, verbatim (Tauri-only invoke/iframe modules stay unused)
src/vendor/dsh-tauri-ui/ the components it imports, verbatim
src/bridge/           build-time module mapping: old bare specifier → local file
```

Two artifacts: `lib/index.js` (host half, ESM) and `lib/client.js` (client half, DSH ModuleLoader CJS).

### Cross-platform changes (three, all minimal)

1. **Module mapping** — `dsh-tauri`, `dsh-tauri/client`, `dsh-tauri-ui/client` resolve to `src/bridge/*`, so upstream imports are untouched.
2. **Profile detection** — upstream only honoured `--profile`; `DSH_PROFILE`, `DSH_PROFILE_DIR` and the
   `<DSH_HOME>/profiles/<name>` launcher argument are now detected too, so MCP rows land in the right profile.
3. **Own identity** — plugin id and route prefix are `dsh-mcp-studio` (`/dsh-mcp-studio/api/*`), so it coexists with the Tauri plugin.

Tauri-only code (invoke / listen / iframe bridges) stays vendored but unreferenced: the bundle never touches `window.__TAURI__`.

## 🚀 Install

```sh
dsh plugin --profile desktop add dsh-mcp-studio@latest
dsh plugin --profile web     add dsh-mcp-studio@latest
dsh plugin --profile tauri   add dsh-mcp-studio@latest
```

Restart DSH once after a host-half update, then hard-refresh the browser.

## 🧭 UI

The sidebar shows **扩展** (Puzzle icon) with the original three-tab panel:
**MCP** (list, add/edit, enable/disable, restart, connection check, copy, import scanning, JSON export/import),
**Skills** (grouped list, search, enable/disable, view/edit SKILL.md, create, delete, open folder, refresh),
**plugin market** (embedded when the market service is present).

## 🛠 Development

```sh
pnpm install
pnpm typecheck
pnpm build         # node scripts/build.mjs → lib/index.js + lib/client.js
```

> esbuild is used deliberately: the DSH runtime's Node enforces macOS library validation, and
> rollup/rolldown `.node` bindings fail to dlopen (see [AGENTS.md](AGENTS.md)).

## 🙏 Credits

- **[deepseek-harness-desktop](https://github.com/dsh-tauri-desk/deepseek-harness-desktop)** by Hairyf and contributors —
  the panel, the framework bridge and the UI components in this repository are their original work,
  vendored here. Please support the upstream project and its Tauri desktop edition.
- Official plugin docs: <https://deepseek-harness.github.io/deepseek-harness/develop/basic/>

## 📄 License

MIT, with the upstream additional terms ([THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)):
no commercial secondary development.
