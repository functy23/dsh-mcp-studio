# AGENTS.md — dsh-mcp-studio

面向在本仓库工作的 agent / 开发者。

## 这个仓库是什么

把 Tauri 桌面版的扩展面板整合成一个跨端插件：

- `src/panel` ← `dsh-tauri-panel-extension`（面板本体：Skills / MCP / 插件市场 + host 服务与路由）
- `src/vendor/dsh-tauri` ← `dsh-tauri`（host 框架工具 + client 框架桥）
- `src/vendor/dsh-tauri-ui` ← `dsh-tauri-ui`（面板用到的组件与样式工具）
- `src/bridge` ← 构建期模块映射（旧裸包名 → 本地文件）

**上游源码保持原样**：需要改行为时，优先在 bridge 或入口层适配，而不是改 vendor/panel 的语义。

## 硬性约束

1. **不要重写 UI**。面板组件、样式、交互都来自上游；改动限于 import 解析、profile 探测、插件 id / 路由前缀。
2. **不要引入 Tauri 运行时依赖**。`window.__TAURI__`、`@tauri-apps/*`、iframe 父窗口消息桥都不得出现在产物里；
   Tauri 专属模块留在 vendor 但不被入口引用。可用 `grep -c '__TAURI__' lib/*.js` 自检（应为 0）。
3. **构建不要引入需要原生绑定的打包器**。DSH 运行时的 Node 开启 macOS 库验证，
   rollup / rolldown 的 `.node` 绑定会 `dlopen` 失败（实测），所以构建固定用 esbuild（独立二进制）。
   测试沿用上游的 vitest（`src/**/*.test.ts`，50 个文件）：在 DSH 自带 Node 下同样受库验证限制，
   需要系统 Node ≥ 20 才能跑通 —— `pnpm test` 跑不起来时用系统 Node 重试，别改测试框架。
4. **官方包一律 external**。`@deepseek-ai/*`、`react`、`react/jsx-runtime` 由宿主提供；
   打进产物会导致 React 双实例与 hooks 失效。见 `scripts/build.mjs` 的 `officialExternal` 插件。
5. **直接改用户的 `cordis.patch.yml` 必须可回滚**：写入前备份，写入后回读校验，CRUD 自检要能保证文件与备份逐字节一致。
6. **技能启停沿用上游策略**（SKILL.md 的 `user-invocable` 策略位），不要新增旁路状态文件。

## 命令

```sh
pnpm install
pnpm typecheck     # tsc --noEmit（上游代码宽松，故 strict: false）
pnpm build         # node scripts/build.mjs
pnpm test          # vitest run（需系统 Node，见约束 3）
```

DSH 自带的 Node 可能不在 PATH，手工跑 pnpm 时先加：

```sh
export PATH="$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin:$PATH"
```

## 本地安装与验证

```sh
# ~/.dsh/profiles/<profile>/package.json
#   dependencies: { "dsh-mcp-studio": "link:/abs/path" }
#   dsh.profile.bundles: [ ..., "dsh-mcp-studio" ]
pnpm install --dir ~/.dsh/profiles/<profile>
```

- host 半：`dsh.profile.bundles` 变更后 loader 会热挂载；**修改 lib/index.js 内容需要重启 DSH**。
- client 半：浏览器硬刷新（Cmd/Ctrl+Shift+R）。
- 路由自检：

```sh
curl -s http://127.0.0.1:<port>/dsh-mcp-studio/api/mcp
curl -s http://127.0.0.1:<port>/dsh-mcp-studio/api/skills
```

host 半可以在没有 DSH 的情况下冒烟测试：`node` 导入 `lib/index.js`，用带 `webServer` / `skills` / `connection` / `logger` 的
mock ctx 调 `apply(ctx, { profile: 'desktop' })`，应注册 13 条路由且不抛错。

## 约定

- 产物只有 `lib/index.js`（ESM host）与 `lib/client.js`（ModuleLoader CJS client + id `dsh-mcp-studio`）。
- `package.json` 的 `dsh.client.inject` 必须列出用到的官方客户端模块（layout / primitives / renderer / locale）。
- 中文注释解释“为什么”（约束、顺序、坑），不解释“是什么”。
- 任何行为变更都要同步 `README.md`、`README_EN.md`、`CHANGELOG.md`，并保留上游鸣谢与许可说明。
