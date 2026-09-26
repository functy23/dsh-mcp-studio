import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const bridge = (file: string): string => fileURLToPath(new URL(file, import.meta.url))

/**
 * 旧裸包名 → 本地桥接文件，与 `scripts/build.mjs` 的 esbuild alias、`tsconfig.json` 的
 * `paths` 三处同源；少了这一处，任何 import 'dsh-tauri' 的模块在测试里都解析不到
 * （上游源码不改 import，所以别名必须每条链路都齐）。
 *
 * 顺序敏感：'dsh-tauri' 是 'dsh-tauri/client' 的前缀，具体键必须排在前面。
 * `include` 只收 src 下的测试：移出 src 的归档树里带着上游测试，不该再进测试套件。
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: 'dsh-tauri/client', replacement: bridge('./src/bridge/tauri-client.ts') },
      { find: 'dsh-tauri-ui/client', replacement: bridge('./src/bridge/tauri-ui.ts') },
      { find: 'dsh-tauri', replacement: bridge('./src/bridge/tauri-host.ts') },
    ],
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
