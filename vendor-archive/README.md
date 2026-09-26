# vendor-archive — 走不到产物入口的 vendor 子树

这里是从 `src/` 搬出来的代码，**不参与构建、typecheck、测试**，只作「上游还有什么」的对照保留。

## 都有什么

- `vendor/dsh-tauri/client/hooks/*`、`service/invoke*`、`service/listen*`、`register/{account,navigation,shortcuts,sidebar,zoom-shortcut,style}*` 等：
  Tauri 桌面壳专属的 invoke / iframe / 侧边栏 / 快捷键补丁，Web 与 Desktop 版不需要，也不能进产物
  （约束见 AGENTS.md 第 2 条：产物里 `__TAURI__` 必须为 0）。
- `vendor/dsh-tauri-ui/**` 的大部分：面板只用到一半组件与样式工具，其余属于上游别的插件（模型配置、IM 面板、设置侧栏…）。
- 上述模块自己的测试（跟着被测物一起搬，否则会留下解析不到的 import）。

## 为什么是「搬走」而不是「删掉」

上游仍在演进。这一堆文件保留了原始目录结构与文件名，将来同步上游时可以直接对照 diff；
而 `src/` 下只剩活代码，grep、读码、typecheck 不再被死代码干扰（曾经 304 个源文件里 158 个从入口走不到）。

## 如果要把某个模块复活

1. 用 `git mv` 把它搬回 `src/` 下原来的路径（`vendor-archive/src/...` 去掉 `src/` 前缀）；
2. 如果它要让客户端拿到，在 `src/bridge/tauri-client.ts` / `tauri-ui.ts` 里补上再导出；
3. 跑 `pnpm typecheck && pnpm test && pnpm build`，并确认 `grep -c '__TAURI__' lib/*.js` 仍为 0。
