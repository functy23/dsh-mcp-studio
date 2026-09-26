# Changelog

## [1.0.1] — 2026-09-26

### Fixed

- **MCP 面板「全局」筛选永远空列表**：客户端按 `row.layer` 过滤，而服务端只发 `scope`（`layer` 从未被赋值），
  于是选「全局」看不到任何行、选「项目级」时全局行也混进来。删掉两处 `layer` 声明，筛选改读 `scope`。
- **`typecheck` 失效**：52 个报错（活代码 10 个 + vendor 37 个）。活代码部分修掉（`agents.ts` 的 unknown→string
  用类型守卫收窄；`restart/post.ts` 在 `strict: false` 下显式取联合分支），vendor 部分随不可达子树移出 `src`，现在全绿。
- **测试跑不起来 / 半数红**：新增 `vitest.config.ts`（旧裸包名别名，与 esbuild、tsconfig 同源）、补 `react-dom`
  开发依赖、恢复 `.test/test-utils.ts` 测试 helper 与 `HostRoute` 类型导出，使面板唯一的路由集成测试（13 条路由 +
  HTTP 行为）重新可用；删除 6 个被测物从未 vendor 的孤儿测试。测试从 29/50 文件可用变为 **16 文件 / 153 用例全绿**。
- **`dispose()` 不再同步释放资源**：hookable v5 的 `callHook` 改为异步，控制器契约与上游测试都要求同步，
  改为本地同步清理队列（vendor 内部相对路径 import，bridge 层够不着，故直接改本体）。

### Changed

- **线协议类型单一权威**：`src/panel/client/apis/index.type.ts` 改为从 host 的 `routes/index.types.ts` 再导出
  （原先是一份没有生成器的 OpenAPI 副本，两边已漂移出上面那个 `layer` 缺陷）。
- **`restartNeeded` 真正被消费**：MCP 行保存/启停/删除/导入后由响应决定是否显示重启条。只读的列表接口
  不再返回该字段（它恒为 `true`，客户端一消费就会让面板一进页面挂出常驻重启条）。
- **不可达 vendor 子树移出 `src`**：新增 `vendor-archive/`（135 个文件），不参与构建 / typecheck / 测试，
  只保留与上游的对照；`src/` 下即活代码。
- 删除无调用方的客户端 API 包装（`mcp/copy`、`roots` get/delete）与无消费方的 `addedAt` / `updatedAt` 字段；
  `restartHost` 返回类型收紧为 `Promise<void>`（它恒返 `{ ok: true }`，`error` 永不赋值）。

### Internal

- SKILL.md frontmatter 的写入与就地重写共用一套构造（原来两处各拼一遍、已开始分叉），并补 13 条契约测试。
- 新增 `scripts/run-tests.mjs`：给 rollup 原生绑定补 ad-hoc 签名 + 挑一个不带 hardened runtime 的 Node 跑 vitest。
- 新增 GitHub Actions CI（`typecheck` / `test` / `build` + 产物不得含 `__TAURI__` 的自检），README 头部换成
  徽章版式并加项目图标（`assets/icon.png`）。

## [1.0.0] — 2026-09-26

把 Tauri 桌面版的扩展面板整合成一个跨端插件。

### Added

- **原面板 UI 原样搬运**：`dsh-tauri-panel-extension` 的 MCP / Skills / 插件市场三个 tab、组件、样式、本地化、
  store 与全部 host 服务（mcp、skills、agents、repos、restart、rmtree、provider、storage）与路由（mcp、skill、import、roots、host）。
- **依赖整合**：`dsh-tauri` 与 `dsh-tauri-ui` 一并 vendor 进本包，构建期映射旧裸包名
  （`dsh-tauri` / `dsh-tauri/client` / `dsh-tauri-ui/client`），因此上游源码无需改动 import。
- **跨端支持**：插件不再依赖 Tauri 运行时；profile 探测补齐 `DSH_PROFILE` / `DSH_PROFILE_DIR` / 启动参数，
  Web 与 Desktop profile 都能正确读写自己的 `cordis.patch.yml`。
  > 更正（1.0.1）：host 半确实是通用的，但**客户端半只声明了 `dsh.client.platform: web`**，
  > 桌面版（Electra 客户端）不会出现「扩展」入口。安装以 README 为准，只装 Web profile。
- **独立标识**：插件 id 与路由前缀改为 `dsh-mcp-studio`（`/dsh-mcp-studio/api/*`），可与 Tauri 版插件共存。


### Fixed

- **「新建技能」在 DSH Web / Desktop 上不可用**：新版核心已把导航能力从 `workspaces` 上移走
  （没有 `connectWorkspace` / `startSession`），上游「工作区 → 开新会话」链路必然报
  「没有可用工作区」。现在优先复用活跃会话（预填组件本就注册在每个会话输入框上），
  只有拿不到任何会话时才回退上游链路。
- **预填草稿不出现**：`SkillCreatorPrefill` 的依赖里加上 `pendingSessionIds` 订阅，
  复用已挂载的会话时 effect 也会重跑并写入草稿（上游靠新会话挂载触发，这条路径不存在了）。

### Notes

- 上游代码版权与“禁止商业性二次开发”附加条款见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 构建使用 esbuild、测试使用 **vitest**（见 `vitest.config.ts`）：DSH 运行时 Node 的 macOS 库验证会拒绝第三方
  `.node` 绑定（rollup / rolldown / vitest 均受影响），所以 `pnpm test` 走包装脚本 `scripts/run-tests.mjs`。