/**
 * 测试用宿主环境工具（面板 host 路由测试与将来的集成测试共用）。
 *
 * 唯一硬约束：`testDshHome` 必须是**模块加载期就固定**的常量。`vi.mock('dsh-tauri', …)`
 * 的工厂会被 vitest 提升到文件顶部，它在模块图建立时就把这个值写进被 mock 的 `DSH_HOME`；
 * 之后再改路径不会生效。所以「每个用例一个干净 DSH_HOME」靠 `resetTestDshHome()` 清空并
 * 重建同一个目录实现，而不是每次换路径。
 */
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

/** 本进程测试专属的 DSH_HOME（带 pid，避免并行测试互相踩）。 */
export const testDshHome = join(tmpdir(), `dsh-mcp-studio-test-home-${process.pid}`)

/** 清空并重建测试 DSH_HOME，返回该路径（beforeEach 里调一次即可拿到空目录）。 */
export function resetTestDshHome(): string {
  rmSync(testDshHome, { recursive: true, force: true })
  mkdirSync(testDshHome, { recursive: true })
  return testDshHome
}
