# THIRD PARTY NOTICES

本仓库的 `src/panel`、`src/vendor/dsh-tauri`、`src/vendor/dsh-tauri-ui` 目录**搬运自**：

- **deepseek-harness-desktop** — <https://github.com/dsh-tauri-desk/deepseek-harness-desktop>
  - 来源包：`packages/dsh-tauri-panel-extension`、`packages/dsh-tauri`、`packages/dsh-tauri-ui`
  - 作者：Hairyf 与 deepseek-harness-desktop 贡献者
  - 许可：MIT，**附加条款**如下

```text
MIT License

Copyright (c) 2026 deepseek-harness-desktop contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Additional Terms — No Commercial Secondary Development

This file supplements the MIT License in the LICENSE file. In addition to the
rights and conditions granted there, the following condition applies to the
Software:

1. No Commercial Secondary Development: The Software may not be used for
   secondary development (including but not limited to modification,
   adaptation, or derivation) for commercial gain, monetary compensation,
   or as part of a paid commercial product or service. Direct use of the
   Software itself for commercial purposes remains permitted.

In the event of any conflict between the MIT License and these additional
terms, these additional terms prevail.

Copyright (c) 2026 deepseek-harness-desktop contributors

---

## 本项目（dsh-mcp-studio）的改动

- 上游三个包的源码原样搬运，仅调整模块解析（`src/bridge/`，构建期映射旧裸包名）。
- `src/panel/host/service/profile.ts`：补充 `DSH_PROFILE` / `DSH_PROFILE_DIR` / 启动参数探测，使其在 DSH Web / Desktop 上正确解析当前 profile。
- 插件 id 与 HTTP 路由前缀改为 `dsh-mcp-studio`（`/dsh-mcp-studio/api/*`），以避免与上游插件双挂载、可共存。
- 移除对 Tauri 运行时的引用路径：Tauri 专属模块（invoke / listen / iframe 桥）保留在 vendor 中但不被任何入口引用，产物不会访问 `window.__TAURI__`。

除上述改动外，界面与 host 逻辑版权归上游作者所有。
