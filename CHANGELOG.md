# Changelog

## [1.0.6] — 2026-10-03

### Fixed

- **「新建技能」不再抢走当前对话**：1.0.3 起这一链路是「优先复用活跃会话」，于是点一次「新建技能」，
  草稿直接落进你正在写的那条对话（覆盖输入框里的内容），而不是开一条新的。现在按四级退级，顺序即语义：
  1. 官方 `sessions.create({ workspaceId })` —— 0.1.7 的「在当前目录新建对话」入口，在当前会话所属工作区
     开一条新会话并在 resolve 前发布进会话目录，返回值直接用于预填（核心 `dsh-client-ui-workspace` 的
     `reuseOrCreateBlank` 走的也是它）；
  2. 适配层从 `uiWorkspace` 投影回的 `workspaces.connectWorkspace` —— 上游写法（0.1.7 起导航从
     `workspaces` 搬到 `uiWorkspace`，适配层的 legacy 迁移已把它投影回原位，因此这条退级仍然可用）；
  3. 当前会话不属于任何工作区时（桌面壳的「未分组」），用它的 `cwd` 建会话——同样落在当前目录；
  4. 以上都拿不到才复用活跃会话，保证按钮仍有草稿可写。
  前几级抛错不再静默降级：错误照原样冒到面板的「无法启动技能创建器」提示上，避免同一个坑再被掩盖一次。
- **「/skill-creator」不是命令，是技能**：预填的 `/skill-creator ` 在输入框里不高亮、点不开、发送后也不加载任何东西。
  根因不是输入法也不是高亮逻辑——宿主只把技能目录里**真实存在**的条目认成 `/名字`（`@deepseek-ai/dsh-client-ui-skill`：
  「Ordinary-session candidates come from the `skills/list` Remote」），而上游 `dsh-tauri-panel-extension` 用
  `package.json` 的 `files: ["skills"]` 随包带了 `skill-creator`（anthropics/skills）与 `find-skills`
  （vercel-labs/skills），搬运时整个目录连同 `files` 项一起丢了：1.0.5 的包里既没有 `skills/`，`files` 也没有这一项，
  host 半的 `packagedSkillsDir()`（`<包根>/skills`）因此不存在，`provider.ts` 的 `existsSync` 过滤把它摘掉，
  技能目录里从来没有 `skill-creator`。
  现已按上游发布产物逐字节补回 `skills/skill-creator` 与 `skills/find-skills`（含各自的 LICENSE，见
  THIRD_PARTY_NOTICES.md），`files` 同步补 `skills`。

### Added

- `src/panel/client/register/extension-panel.utils.test.ts`：18 条用例覆盖会话/工作区快照投影与四级退级
  （含「有 `sessions.create` 时**不得**调用 `connectWorkspace`、不得复用活跃会话」这条回归断言）。

## [1.0.5] — 2026-10-01

### Fixed

- **插件市场 tab 在 Web / Desktop 上也出现**（[issue #1](https://github.com/functy23/dsh-mcp-studio/issues/1)）。
  上游 `hostsMarketPanel` 用 `window.parent !== window` 只收编 Tauri iframe，同一份代码搬过来后，
  浏览器 / DSH Desktop 里 `parent === window`，市场 tab 永远不出现，设置页入口也不会被撤下。
  本插件就是扩展面板宿主，判据改为只看 `dshmarket.render`：有就嵌进「市场」tab 并藏掉设置页重复入口；
  没装 `dshmarket` 或旧版（1.47.0，有 `market` 没有 `render`）不出现 tab，也不动设置页入口。

## [1.0.4] — 2026-09-29

### Fixed

- **文档更正：桌面版是可用的**。1.0.1 起 README 写「桌面版（`--profile desktop`）不可用，请勿安装」，
  依据是包清单里的 `dsh.client.platform: web` —— 那是把**客户端类型**（Web GUI）误读成了 profile 限制。
  实测：Web 与 Desktop 两个 profile 跑的客户端都是 `@deepseek-ai/dsh-web-app`，本插件在 desktop profile 上
  正常工作（面板、图标、技能创建均验证可用）。README 安装段改为 web / desktop 都给出命令，
  Platform 徽章回到 `Web | Desktop`。Tauri 版仍不在范围内（自带原生扩展面板插件）。

## [1.0.3] — 2026-09-27

### Fixed

- **新建技能报 `cannot get property "layout" without inject`**：客户端半漏声明 `layout` 服务。
  `definePanel` 的 `select()` / `close()` 会调 `ctx.layout.selectPanel()`，没进 `inject` 时 cordis 的反射代理直接抛错——
  技能其实已建好、草稿也填了，但以报错收场。`inject` 补为
  `['slots', 'locale', 'layout', 'sessions', 'workspaces']`。

## [1.0.2] — 2026-09-26

### Added

- **插件图标与显示名**（DSH 插件页此前显示的是默认风车占位图）：清单补 `icon: ./assets/icon.svg`，
  并新增 `locale/en.json` / `locale/zh.json` 的 `meta.title` / `meta.description`，卡片不再回退成包名。
  宿主约定：icon 必须是相对清单目录的路径、扩展名限 SVG/PNG/JPEG/WebP、上限 256 KiB、解析后不得越出包目录；
  `files` 白名单已加上图标与 locale，否则 npm 安装的用户拿不到。

### Changed

- 包描述与 README 的 Platform 徽章改为与 `dsh.client.platform: web` 一致的表述（此前写作「Web / Desktop / Tauri 通用」）。

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
- README 头部换成徽章版式并加项目图标（`assets/icon.svg` 为矢量源，`assets/icon.png` 供渲染）。
  本仓库**不加 CI**：typecheck 依赖宿主提供的 `@deepseek-ai/*`、测试依赖非 hardened 的 Node，
  干净 runner 上跑不出有意义结论，门禁一律放在本地。

## [1.0.0] — 2026-09-26

把 Tauri 桌面版的扩展面板整合成一个跨端插件。

### Added

- **原面板 UI 原样搬运**：`dsh-tauri-panel-extension` 的 MCP / Skills / 插件市场三个 tab、组件、样式、本地化、
  store 与全部 host 服务（mcp、skills、agents、repos、restart、rmtree、provider、storage）与路由（mcp、skill、import、roots、host）。
- **依赖整合**：`dsh-tauri` 与 `dsh-tauri-ui` 一并 vendor 进本包，构建期映射旧裸包名
  （`dsh-tauri` / `dsh-tauri/client` / `dsh-tauri-ui/client`），因此上游源码无需改动 import。
- **跨端支持**：插件不再依赖 Tauri 运行时；profile 探测补齐 `DSH_PROFILE` / `DSH_PROFILE_DIR` / 启动参数，
  Web 与 Desktop profile 都能正确读写自己的 `cordis.patch.yml`。
  > 更正（1.0.4）：1.0.1 这里曾写过「桌面版不可用」，那是把 `dsh.client.platform: web` 误读成了 profile 限制。
  > 实际 `web` 指**客户端类型**（Web GUI），Web 与 Desktop 两个 profile 跑的都是 `@deepseek-ai/dsh-web-app`，
  > 客户端半在 desktop profile 上正常工作（已实测：图标、面板、技能创建均可用）。
  > Tauri 版仍不在范围内——它有自己原生的扩展面板插件。
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