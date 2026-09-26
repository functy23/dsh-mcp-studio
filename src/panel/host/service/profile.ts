import process from 'node:process'
import { defineService } from 'dsh-tauri'
import { profileDir } from '../utils/paths.utils'

/**
 * 运行中的 profile 名解析。
 *
 * 原实现只认 `--profile` 开关（Tauri 桌面壳会显式传），所以嵌进 DSH Web / Desktop
 * 时解析失败、回落 'web'，MCP 行就会写错 profile。这里补齐三条通用来源：
 *
 *   1. `DSH_PROFILE` / `DSH_PROFILE_DIR` 环境变量
 *   2. `--profile <name>` 开关（保持原行为）
 *   3. 启动参数里的 `<DSH_HOME>/profiles/<name>`（DSH Web / Desktop 都是这么起的）
 */
export const profile = defineService({
  resolve(argv: readonly string[] = process.argv): string | null {
    const explicit = process.env.DSH_PROFILE
    if (explicit !== undefined && explicit.trim() !== '')
      return explicit.trim()

    const dir = process.env.DSH_PROFILE_DIR
    if (dir !== undefined && dir.trim() !== '') {
      const name = dir.trim().replace(/[\\/]+$/, '').split(/[\\/]/).pop()
      if (name !== undefined && name !== '')
        return name
    }

    const flag = argv.indexOf('--profile')
    if (flag !== -1 && flag + 1 < argv.length && !argv[flag + 1].startsWith('-'))
      return argv[flag + 1]

    for (const arg of argv) {
      const hit = /[\\/]profiles[\\/]([^\\/]+)[\\/]?$/.exec(arg)
      if (hit !== null && hit[1] !== undefined && hit[1] !== '')
        return hit[1]
    }
    return null
  },

  peek(name: string): string {
    return profileDir(name)
  },
})
