# dsh-mcp-studio

<div align="center">

**DeepSeek Harness 的 MCP 服务与 Skills 管理器 —— 一个插件，跨 Web / Desktop 通用。**

<code>MCP 服务器增删改启停</code> <code>重启 / 健康检查</code> <code>导入扫描</code> <code>JSON 备份</code> <code>Skills 浏览与启停</code> <code>8 个模型工具</code> <code>HTTP API</code>

停用/启用走 **rank-0 override provider**，不改任何 `SKILL.md`；MCP 行读写 `cordis.patch.yml`，改动经 HMR 即时生效并在重启后保留。

</div>

---

## ✨ 为什么有它

DSH 生态里的 MCP 管理界面长期绑定在特定发行版上：Tauri 桌面版的 `dsh-tauri-panel-extension` 需要同时安装
`dsh-tauri` + `dsh-tauri-ui` + `dsh-tauri-panel-extension` 等多个插件才能工作，**换到 Web 版或 DSH Desktop 版就用不了**。

`dsh-mcp-studio` 把那套能力整合成**一个零 dsh-tauri 依赖的单包插件**，只用 DSH 官方插件契约：

- host 半走 `webServer` 精确路由 + `ctx.tools.register` + `ctx.skills`；
- client 半走 `slots.inject('settings.section')` 注册 **设置 → MCP 管理** / **设置 → Skills 管理** 两个页面；
- 不 import 任何 `dsh-tauri`、不假设 Tauri 桥、不写 profile 之外的文件。

于是 `web` / `desktop` / `tauri` 任意 profile 一条命令装同一个包。

## 🚀 安装

**前置**：可运行的 DSH（Web 版 `dsh web`、桌面版或 Tauri 版均可）。

### 方式一 · dsh 命令（推荐）

```sh
dsh plugin --profile desktop add dsh-mcp-studio@latest   # DSH 桌面版
dsh plugin --profile web     add dsh-mcp-studio@latest   # DSH Web 版
dsh plugin --profile tauri   add dsh-mcp-studio@latest   # Tauri 桌面版
```

包内声明了 `dsh.bundle.patch`，安装即自动挂载，**不需要手改任何配置文件**。装完硬刷新浏览器（Cmd/Ctrl+Shift+R）；
若 host 半也更新了，重启一次 DSH。

### 方式二 · 本地开发（link）

```sh
# 1) 构建
pnpm install && pnpm build

# 2) 在目标 profile 里挂上本地包
#    ~/.dsh/profiles/<profile>/package.json
#      "dependencies": { "dsh-mcp-studio": "link:/path/to/dsh-mcp-studio" }
#      "dsh": { "profile": { "bundles": [ ..., "dsh-mcp-studio" ] } }
pnpm install --dir ~/.dsh/profiles/desktop
```

## 🧭 界面

### 设置 → MCP 管理

| 能力 | 说明 |
| --- | --- |
| 服务器列表 | id、serverName、传输方式、作用域（项目级 / 全局）、启用状态、loader 实时状态、被覆盖标记 |
| 新增 / 编辑 | `streamable-http`（url / headers）与 `stdio`（command / args / env / cwd）两种形态，带格式校验 |
| 启用 / 停用 | 写 `disabled` 标记，loader 即时热挂载 / 热卸载 |
| 重启 | 停用 → 等待卸载 → 启用，客户端自动重连并重新同步工具 |
| 健康检查 | stdio 走 PATH 探测（含 Windows 扩展名），http 走带超时的可达性探测 |
| 复制 | 一键生成该行的 `dsh` YAML / 纯净 JSON / 标准 `mcpServers` JSON 片段 |
| 导入扫描 | 扫描其他 DSH profile、Claude Desktop、Claude Code（`.mcp.json`）、Cursor、Windsurf、VS Code、Zed 的 MCP 配置 |
| 备份 / 恢复 | 导出全部服务器为 JSON，导入时按 id 去重合并 |

### 设置 → Skills 管理

- 按 **项目级 / 运行时 / 自定义 / 用户级 / 内置 / 插件自带** 分组，组内再按 provider 折叠；
- 名称与描述实时搜索；
- 一键启用 / 停用（rank-0 override provider，**任何来源层级都能停用且不落盘改动用户文件**）；
- 查看技能详情（SKILL.md 原文）；
- 状态持久化到 `<profile>/dsh-mcp-studio.json`，重启后自动恢复；
- 用户级技能（`~/.dsh/skills`）以只读方式列出并标注原因，避免误导。

## 🤖 模型工具

宿主侧注册 8 个工具，Agent 可以直接管理 MCP 与技能：

| 工具 | 作用 |
| --- | --- |
| `mcp_studio_list` | 列出全部 MCP 服务器（含作用域、状态、loader 状态） |
| `mcp_studio_add` | 新增 MCP 服务器（项目级 / 全局） |
| `mcp_studio_set_enabled` | 启用 / 停用 |
| `mcp_studio_restart` | 重启并重连 |
| `mcp_studio_remove` | 删除 |
| `mcp_studio_check` | 健康检查 |
| `skill_studio_list` / `skill_studio_set_enabled` | 技能列表与启停 |

## 🌐 HTTP API

客户端半与脚本共用同一个同源接口：

```sh
curl -s http://127.0.0.1:3080/dsh-mcp-studio/api \
  -H 'content-type: application/json' \
  -H 'x-dsh-plugin: dsh-mcp-studio' \
  -d '{"op":"mcp-list","args":{}}'
```

**安全**：仅 POST；必须携带 `x-dsh-plugin: dsh-mcp-studio` 头（跨站页面无法在不触发 CORS 预检的情况下携带自定义头，本路由不响应预检）；
带 `Origin` 时校验同源；请求体上限 1 MiB；解析失败的 patch 文件只报错、不写入。

可用 op：`ping`、`paths`、`mcp-list`、`mcp-save`、`mcp-remove`、`mcp-toggle`、`mcp-restart`、`mcp-check`、`mcp-copy`、
`mcp-export`、`mcp-import`、`mcp-import-scan`、`mcp-import-apply`、`skill-list`、`skill-detail`、`skill-toggle`、`skill-refresh`。

## 🔧 配置

插件对象接受两个可选字段（写在 `cordis.patch.yml` 的对应行里）：

```yaml
- id: dsh-mcp-studio
  name: 'dsh-mcp-studio'
  config:
    profile: desktop   # 强制指定 profile（默认自动探测）
```

### profile 探测顺序

1. `DSH_PROFILE_DIR` / `DSH_PROFILE_PATH`
2. `DSH_PROFILE`
3. 启动参数里的 `<home>/profiles/<name>`
4. 最近修改过 `cordis.patch.yml` 的 profile
5. `web`

## 🧩 兼容性

| 运行形态 | 状态 |
| --- | --- |
| DSH Web（`dsh web` / `profile: web`） | ✅ |
| DSH Desktop（Electron，`profile: desktop`） | ✅ |
| Tauri 桌面版（使用 `profile: tauri`） | ✅（插件本身不依赖 Tauri；面板位置取决于该发行版的设置页实现） |

无 `dsh-tauri`、`dsh-tauri-ui` 或任何发行版私有依赖。

## 🛠 开发

```sh
pnpm install
pnpm typecheck     # tsc --noEmit
pnpm build         # node scripts/build.mjs：esbuild 产 lib/index.js（ESM host）+ lib/client.js（ModuleLoader CJS client）
pnpm test          # node scripts/test.mjs：node:test，覆盖路径探测 / patch 读写 / 导入解析 / 健康检查 / 技能解析
pnpm check         # typecheck + build + test
```

> **为什么不是 rollup/rolldown/vitest**：DSH 运行时的 Node 开启了 macOS 库验证（library validation），
> 第三方签名的 `.node` 绑定会 `dlopen` 失败。esbuild 由独立二进制驱动、`node:test` 是纯 JS，两者都不受影响。
> 详见 [AGENTS.md](AGENTS.md)。

```
src/
├── shared/constants.ts    两端共享的 id、API 路径、类型
├── host/
│   ├── index.ts           插件对象（{ name, inject, apply }）
│   ├── paths.ts           profile / DSH home 探测
│   ├── patch.ts           cordis.patch.yml 的 YAML 行级读写（只碰我们管的行）
│   ├── mcp.ts             服务器 CRUD、重启、导出导入、片段复制
│   ├── mcp-check.ts       PATH / HTTP 健康检查
│   ├── mcp-import.ts      常见 MCP 宿主配置扫描与解析
│   ├── skills.ts          技能列表 / 详情 / rank-0 override 启停
│   ├── tools.ts           mcp_studio_* / skill_studio_* 模型工具
│   └── api.ts             同源 HTTP API（CSRF 门、体积上限、op 分派）
└── client/
    ├── index.ts           client 插件：注册两个设置页
    ├── styles.ts          注入式样式（mcs- 前缀）
    └── pages/{mcp,skills}.tsx
└── scripts/
    ├── build.mjs          esbuild 构建
    └── test.mjs           esbuild 预打包 + node:test
```

## ❓ 常见问题

| 现象 | 处理 |
| --- | --- |
| 设置里没有「MCP 管理」 | 硬刷新（Cmd/Ctrl+Shift+R）；仍没有就重启 DSH 一次 |
| 出现两个 MCP 页签 | 双挂载：`cordis.patch.yml` 里既有旧 loader 行、bundle 列表里又有一条。删掉其中一条并重启 |
| 保存后没有热生效 | 确认 patch 文件可写；host 半代码更新后需要重启 DSH |
| 「检查」对本地服务失败 | 该 op 是可达性探测，本地 stdio 服务只做 PATH 探测，不实际拉起进程 |

## 🙏 鸣谢

- **[deepseek-harness-desktop](https://github.com/dsh-tauri-desk/deepseek-harness-desktop)**（Tauri 桌面版）——
  本项目功能面的参考基线：`packages/dsh-tauri-panel-extension` 的 MCP / Skills 面板定义了「装没装、连没连、一页管完」的交互形态，
  以及 patch 行写入、路径探测、健康检查、导入扫描等关键设计。没有它就没有这个整合版。
- 官方插件开发文档：<https://deepseek-harness.github.io/deepseek-harness/develop/basic/>
- DSH 插件生态的各位作者，尤其是 MCP 管理方向的先行实现，为本项目验证了 web 端插件契约。

## 📄 License

[MIT](LICENSE)
