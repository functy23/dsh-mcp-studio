<div align="center">

<img src="assets/icon.png" alt="dsh-mcp-studio" width="128" />

# dsh-mcp-studio

**DeepSeek Harness 的 MCP 服务与 Skills 管理器 —— Tauri 桌面版的扩展面板，整合成一个跨端插件。**

[![dsh-mcp-studio](https://img.shields.io/badge/dsh--mcp--studio-DSH%20plugin-4d6bfe.svg)](https://github.com/functy23/dsh-mcp-studio)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Top Language](https://img.shields.io/github/languages/top/functy23/dsh-mcp-studio?style=flat)](https://github.com/functy23/dsh-mcp-studio)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Desktop-lightgrey.svg)](https://github.com/functy23/dsh-mcp-studio)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)

[![Stars](https://img.shields.io/github/stars/functy23/dsh-mcp-studio?style=flat&logo=github)](https://github.com/functy23/dsh-mcp-studio/stargazers)
[![Repo Size](https://img.shields.io/github/repo-size/functy23/dsh-mcp-studio?style=flat&logo=github)](https://github.com/functy23/dsh-mcp-studio)
[![Contributors](https://img.shields.io/github/contributors/functy23/dsh-mcp-studio?color=ee8449&logo=githubsponsors)](https://github.com/functy23/dsh-mcp-studio/graphs/contributors)

[Issues](https://github.com/functy23/dsh-mcp-studio/issues) • [Changelog](CHANGELOG.md) • [English](README_EN.md)

</div>

---

## 📦 这是什么

Tauri 桌面版（[deepseek-harness-desktop](https://github.com/dsh-tauri-desk/deepseek-harness-desktop)）的扩展面板功能原本分散在**三个互相依赖的插件**里：

| 上游包 | 作用 | 依赖 |
| --- | --- | --- |
| `dsh-tauri-panel-extension` | 扩展面板本体：**Skills / MCP / 插件市场** 三个 tab + host 路由 | `dsh-tauri`、`dsh-tauri-ui` |
| `dsh-tauri` | 宿主/客户端框架桥：`defineRoutes`、`defineService`、`definePanel`、`defineRegister`、locale、store | — |
| `dsh-tauri-ui` | 面板用的组件库：Button/Chip/Modal/SegmentedControl/PanelPage/图标… | `dsh-tauri` |

要装 MCP 管理，就得把这三个一起装上，而且只在 Tauri 发行版里可用。

**dsh-mcp-studio 把它们整合成一个包**：上游源码原样搬运（`src/panel`、`src/vendor/dsh-tauri`、`src/vendor/dsh-tauri-ui`），
用构建期模块映射（`src/bridge`）把旧的裸包名 `dsh-tauri` / `dsh-tauri/client` / `dsh-tauri-ui/client` 指到本地文件，
再补上通用化所需的最小改造 —— **界面本身一行 UI 都没重写**。

## ✨ 整合方式

```
src/                          ← 活代码：从产物入口走得到的部分
├── panel/                    ← dsh-tauri-panel-extension（原样搬运）
│   ├── host/                 service（mcp / skills / agents / repos / restart / rmtree）、routes（mcp / skill / import / roots / host）
│   ├── client/               components（mcp-tab / mcp-editor-form / mcp-import-dialog / skills-tab / extension-panel / market-tab）、
│   │                         register（extension-panel / skill-creator-prefill / styles）、locales、styles、store、apis
│   └── shared/
├── vendor/
│   ├── dsh-tauri/            ← dsh-tauri（host 框架工具 + client 框架桥；Tauri 专属的 invoke/iframe 桥保留但不进产物）
│   └── dsh-tauri-ui/         ← dsh-tauri-ui（面板用到的组件与样式工具）
└── bridge/                   构建期模块映射：旧裸包名 → 本地源码

vendor-archive/               ← 走不到产物入口的 vendor 子树（Tauri 专属桥、未搬运模块的测试）
                                不参与构建 / typecheck / 测试，只作上游对照
```

产物只有两个文件：`lib/index.js`（host 半，ESM）与 `lib/client.js`（client 半，DSH ModuleLoader CJS）。

### 通用化改造（三处适配 + 行为修复）

1. **模块映射**：`dsh-tauri`、`dsh-tauri/client`、`dsh-tauri-ui/client` → `src/bridge/*`，因此上游源码**不需要改 import**。
2. **profile 探测**（`src/panel/host/service/profile.ts`）：上游只认 `--profile` 开关（Tauri 壳会传），
   嵌入 Web / Desktop 后必须补上 `DSH_PROFILE` / `DSH_PROFILE_DIR` / 启动参数里的 `<DSH_HOME>/profiles/<name>`，
   否则 MCP 行会写错 profile。
3. **独立标识**：插件 id 与路由前缀从 `dsh-tauri-panel-extension` 改为 `dsh-mcp-studio`（`/dsh-mcp-studio/api/*`），
   可与 Tauri 版共存、互不覆盖。

此外还有面板行为修复（依赖新版核心的导航能力变化，见 [CHANGELOG.md](CHANGELOG.md)）：

4. **「新建技能」链路**：新版核心把导航能力从 `workspaces` 上移走，改为优先复用活跃会话，拿不到会话才回退上游链路。
5. **插件市场 tab（Issue #1）**：上游用 iframe（`window.parent !== window`）才收编 `dshmarket`，那是给 Tauri 壳用的。本插件就是扩展面板宿主，Web / Desktop 上只要 `dshmarket` 发布了 `render` 就嵌进「市场」tab，并撤下设置页重复入口。

Tauri 专属部分（`dsh-tauri/client` 的 invoke / listen / iframe 消息桥、桌面侧边栏注入）**保留在 vendor 里但不被引用**，
所以产物不会访问 `window.__TAURI__`，在 Web 与 Desktop 上同样工作。

## 🚀 安装

装到你想用的那个 profile 上：

```sh
dsh plugin --profile web     add dsh-mcp-studio@latest   # DSH Web 版
dsh plugin --profile desktop add dsh-mcp-studio@latest   # DSH 桌面版
```

包内声明了 `dsh.bundle.patch`，安装即自动挂载；host 半更新后重启一次 DSH，然后硬刷新浏览器（Cmd/Ctrl+Shift+R）。

> **关于 `dsh.client.platform: web`**：这里的 `web` 指**客户端类型**（Web GUI），不是 profile 名字。
> Web 与 Desktop 两个 profile 跑的都是 `@deepseek-ai/dsh-web-app`，同一个客户端，所以两端都能用；
> 本插件的客户端半依赖它的官方模块（ui-layout / ui-primitives / ui-renderer / locale）。
>
> **Tauri 版不在范围内**：Tauri 发行版有自己的原生扩展面板插件。本仓库只是把那三个包搬过来整合成
> 跨端插件，产物里没有任何 Tauri 运行时依赖，也不反过来替换 Tauri 版的原生插件。

本地开发（link）：

```sh
pnpm install && pnpm build
# ~/.dsh/profiles/<profile>/package.json
#   "dependencies": { "dsh-mcp-studio": "link:/abs/path/to/dsh-mcp-studio" }
#   "dsh": { "profile": { "bundles": [ ..., "dsh-mcp-studio" ] } }
pnpm install --dir ~/.dsh/profiles/<profile>
```

## 🧭 界面

装好后侧边栏出现 **扩展**（Puzzle 图标），点开就是原来的三 tab 面板：

| Tab | 能力 |
| --- | --- |
| **MCP** | 服务器列表（项目级 / 全局、启用状态、传输方式、URL / 命令）、新增与编辑表单、启用 / 停用、重启、连接检查、复制片段、从其他 DSH profile 或 Claude / Cursor / Windsurf / VS Code 配置**导入扫描**、JSON 导出导入 |
| **Skills** | 技能列表（按来源分组）、搜索、启用 / 停用、查看与编辑 SKILL.md、新建技能、删除、打开目录、刷新 |
| **插件市场** | 已安装 [`dshmarket`](https://github.com/dsh-market/dsh-market) 且其客户端提供 `render` 时，把市场面板嵌进本 tab，并藏掉设置页里的重复入口；未安装或旧版没有 `render` 时不出现该 tab，设置页入口保留 |

技能启停沿用上游策略：写 SKILL.md 的 `user-invocable` 策略位，不新增旁路状态。

## 🌐 HTTP API

面板的客户端半与脚本共用同源路由（沿用上游的安全闸门：变更方法要求本机回环来源、`Origin` 与 `Host` 不符直接 403）：

| 方法 | 路径 |
| --- | --- |
| GET | `/dsh-mcp-studio/api/skills`、`/api/mcp`、`/api/skill?name=`、`/api/roots`、`/api/import/scan` |
| POST | `/api/mcp`、`/api/mcp/toggle`、`/api/mcp/check`、`/api/mcp/copy`、`/api/skills/refresh`、`/api/skill`、`/api/skill/policy`、`/api/import/apply`、`/api/roots`、`/api/open/dir`、`/api/host/restart` |
| DELETE | `/api/mcp`、`/api/skill`、`/api/roots` |

## 🛠 开发

```sh
pnpm install
pnpm typecheck     # tsc --noEmit，解析宿主真实类型（当前全绿）
pnpm build         # node scripts/build.mjs → lib/index.js + lib/client.js
pnpm test          # node scripts/run-tests.mjs（vitest；见下方说明）
```

> 本仓库**没有 CI**：验证依赖 DSH 宿主与 macOS 签名，跑在干净 runner 上只能验一半，
> 所以 `typecheck` / `test` / `build` 一律以本地为准。

> `pnpm test` 不是裸 `vitest run`：vite 加载的 rollup 原生绑定既没签名，DSH 自带 Node 又带
> hardened runtime，两处都会让 `dlopen` 失败。包装脚本 `scripts/run-tests.mjs` 会先补一次 ad-hoc 签名，
> 再挑一个不带 hardened runtime 的 Node 跑 vitest（找不到会给出下一步）。
>
> 旧裸包名的映射共三处，改一处要三处同改：`scripts/build.mjs`（esbuild alias）、`tsconfig.json`（paths）、
> `vitest.config.ts`（resolve.alias）。

> 构建用 **esbuild**：DSH 运行时的 Node 开启了 macOS 库验证（library validation），
> rollup/rolldown 的 `.node` 绑定因 Team ID 不同会 `dlopen` 失败。详见 [AGENTS.md](AGENTS.md)。

## 🙏 鸣谢

- **[deepseek-harness-desktop](https://github.com/dsh-tauri-desk/deepseek-harness-desktop)**（Tauri 桌面版，作者 Hairyf 与贡献者）——
  本项目搬运的 `dsh-tauri-panel-extension`、`dsh-tauri`、`dsh-tauri-ui` 三个包全部来自该仓库，
  **界面、交互与 host 服务逻辑均为其原始实现**；没有它就没有这个插件。请优先支持上游与 Tauri 桌面版。
- 官方插件开发文档：<https://deepseek-harness.github.io/deepseek-harness/develop/basic/>

## 📄 License

MIT（见 [LICENSE](LICENSE)）。搬运的上游代码同样以 MIT 发布，并附带
[Additional Terms — No Commercial Secondary Development](THIRD_PARTY_NOTICES.md)：
**不得用于商业性二次开发**，本项目亦以非商业开源形式分发。
