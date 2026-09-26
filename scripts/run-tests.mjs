/**
 * 测试运行器包装（pnpm test 实际执行的就是它）。
 *
 * 为什么不能直接 `vitest run`：vite 会加载 rollup 的 **原生绑定**
 * （`@rollup/rollup-<platform>/*.node`），而 macOS 的库验证对「进程与库签名 Team ID
 * 不一致」的 dlopen 直接拒绝，DSH 运行时那个 Node 带 hardened runtime
 * （`flags=0x10000(runtime)`，签名 Team ID 固定），所以：
 *
 *   1. 原生绑定必须是**已签名**的（用户态 pnpm 装出来的 .node 往往完全没签名）→ 这里补一次
 *      ad-hoc 签名（`codesign --force --sign -`，幂等；重装依赖后需要重跑一次）；
 *   2. 运行它的 Node 必须是**没有 hardened runtime** 的那个（Homebrew 的 node 是 ad-hoc 签名，
 *      不加 runtime 标志）→ 这里自动挑一个可用的 Node 来跑 vitest。
 *
 * 两个条件缺一个都会在 vitest 启动前抛 ERR_DLOPEN_FAILED。本脚本把这两步固化，避免每次
 * 靠记忆手敲；找不到可用 Node 时给出可执行的下一步而不是一句「测试跑不起来」。
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const isMac = process.platform === 'darwin'

/** 平台相关的原生绑定目录，例如 @rollup/rollup-darwin-arm64。 */
function nativeBindings() {
  const pnpmDir = join(root, 'node_modules', '.pnpm')
  if (!existsSync(pnpmDir))
    return []
  const found = []
  for (const entry of readdirSync(pnpmDir)) {
    if (!entry.startsWith('@rollup+rollup-'))
      continue
    const pkgDir = join(pnpmDir, entry, 'node_modules', '@rollup', entry.slice('@rollup+'.length))
    if (!existsSync(pkgDir))
      continue
    for (const file of readdirSync(pkgDir)) {
      if (file.endsWith('.node'))
        found.push(join(pkgDir, file))
    }
  }
  return found
}

function signatureOf(binary) {
  try {
    return execFileSync('codesign', ['-dv', '--verbose=2', binary], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  }
  catch (error) {
    // codesign 把诊断信息写在 stderr，且未签名时以非 0 退出
    return String(error?.stderr ?? '')
  }
}

function ensureSigned() {
  if (!isMac)
    return
  for (const binding of nativeBindings()) {
    if (!/not signed at all/.test(signatureOf(binding)))
      continue
    console.log(`[test-runner] ad-hoc 签名原生绑定: ${binding.replace(root + '/', '')}`)
    execFileSync('codesign', ['--force', '--sign', '-', binding], { stdio: 'inherit' })
  }
}

function isHardened(binary) {
  if (!isMac)
    return false
  return /flags=\S*\(runtime\)/.test(signatureOf(binary))
}

function pickNode() {
  const candidates = [
    process.env.DSH_TEST_NODE,
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    process.execPath,
  ].filter((candidate) => typeof candidate === 'string' && candidate !== '')
  const usable = []
  for (const candidate of candidates) {
    if (!existsSync(candidate))
      continue
    if (isHardened(candidate)) {
      usable.push({ candidate, hardened: true })
      continue
    }
    return { candidate, hardened: false }
  }
  return usable[0] === undefined ? undefined : usable[0]
}

ensureSigned()

const chosen = pickNode()
if (chosen === undefined) {
  console.error('[test-runner] 找不到可用的 Node（PATH 里没有 node）。')
  process.exit(2)
}
if (chosen.hardened) {
  console.error([
    `[test-runner] 只有带 hardened runtime 的 Node 可用（${chosen.candidate}）。`,
    '  它加载不了 rollup 的原生绑定（库验证要求 Team ID 一致），vitest 会在启动前报 ERR_DLOPEN_FAILED。',
    '  装一个不带 hardened runtime 的 Node（例如 `brew install node`），或显式指定：',
    '    DSH_TEST_NODE=/path/to/node pnpm test',
  ].join('\n'))
  process.exit(2)
}

if (chosen.candidate !== process.execPath)
  console.log(`[test-runner] 用 ${chosen.candidate} 运行 vitest`)

const result = spawnSync(
  chosen.candidate,
  [join(root, 'node_modules', 'vitest', 'vitest.mjs'), 'run', ...process.argv.slice(2)],
  { cwd: root, stdio: 'inherit' },
)
process.exit(result.status ?? 1)
