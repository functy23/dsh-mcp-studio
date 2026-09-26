# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-09-26

First release: a single, distribution-agnostic plugin that manages MCP servers and Skills
for any DSH profile (web / desktop / tauri).

### Added

- **Settings → MCP 管理**: list, add, edit, enable/disable, restart, health-check, copy,
  export/import, and import-scan for `@deepseek-ai/dsh-mcp-client` rows in
  `cordis.patch.yml` (project-level and global scope).
- **Settings → Skills 管理**: grouped (level → provider) skill list, search, detail view,
  and enable/disable through a rank-0 override provider persisted to
  `<profile>/dsh-mcp-studio.json`.
- **Model tools**: `mcp_studio_list`, `mcp_studio_add`, `mcp_studio_set_enabled`,
  `mcp_studio_restart`, `mcp_studio_remove`, `mcp_studio_check`, `skill_studio_list`,
  `skill_studio_set_enabled`.
- **HTTP API** at `/dsh-mcp-studio/api` (POST-only, plugin gate header, same-origin check,
  1 MiB body cap) shared by the UI and local scripts.
- **Import scanning** for other DSH profiles, Claude Desktop, Claude Code, Cursor,
  Windsurf, VS Code and Zed MCP configuration files.
- Profile auto-detection (`DSH_PROFILE_DIR` → `DSH_PROFILE` → launcher argv → most recent
  patch file → `web`), so the same build works on every profile.
- 53 unit tests (`node:test`) covering path detection, patch read/write, import parsing,
  health probes and skill frontmatter parsing.

### Notes

- Functional baseline: `dsh-tauri-panel-extension` from the Tauri desktop edition
  (<https://github.com/dsh-tauri-desk/deepseek-harness-desktop>), re-implemented against the
  public DSH plugin contract so it runs on web and desktop profiles too.
- Built with esbuild and tested with `node:test` because the DSH runtime Node's library
  validation rejects third-party `.node` bindings (rollup/rolldown/vitest).
