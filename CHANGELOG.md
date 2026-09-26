# Changelog

## [1.0.0] — 2026-09-26

把 Tauri 桌面版的扩展面板整合成一个跨端插件。

### Added

- **原面板 UI 原样搬运**：`dsh-tauri-panel-extension` 的 MCP / Skills / 插件市场三个 tab、组件、样式、本地化、
  store 与全部 host 服务（mcp、skills、agents、repos、restart、rmtree、provider、storage）与路由（mcp、skill、import、roots、host）。
- **依赖整合**：`dsh-tauri` 与 `dsh-tauri-ui` 一并 vendor 进本包，构建期映射旧裸包名
  （`dsh-tauri` / `dsh-tauri/client` / `dsh-tauri-ui/client`），因此上游源码无需改动 import。
- **跨端支持**：插件不再依赖 Tauri 运行时；profile 探测补齐 `DSH_PROFILE` / `DSH_PROFILE_DIR` / 启动参数，
  Web 与 Desktop profile 都能正确读写自己的 `cordis.patch.yml`。
- **独立标识**：插件 id 与路由前缀改为 `dsh-mcp-studio`（`/dsh-mcp-studio/api/*`），可与 Tauri 版插件共存。

### Notes

- 上游代码版权与“禁止商业性二次开发”附加条款见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 构建使用 esbuild、测试使用 `node:test`：DSH 运行时 Node 的 macOS 库验证会拒绝第三方 `.node` 绑定
  （rollup / rolldown / vitest 均受影响）。
