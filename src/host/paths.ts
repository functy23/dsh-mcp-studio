import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { PATCH_FILE_NAME } from '../shared/constants'

export interface StudioPaths {
  /** DSH home, e.g. `~/.dsh`. */
  home: string
  /** Profile directory, e.g. `~/.dsh/profiles/desktop`. */
  profileDir: string
  /** Profile name, e.g. `desktop` / `web` / `tauri`. */
  profileName: string
  /** `<profileDir>/cordis.patch.yml` — project-level patch file. */
  projectPatch: string
  /** `<home>/cordis.patch.yml` — global patch file. */
  globalPatch: string
}

/**
 * Detect the active profile directory. DSH exposes no single canonical env var
 * across launchers, so we probe, in order of reliability:
 *
 *   1. `DSH_PROFILE_DIR` / `DSH_PROFILE_PATH` — explicit directory
 *   2. `DSH_PROFILE` — explicit name
 *   3. the launcher argv, which carries `<home>/profiles/<name>`
 *   4. the profile whose patch file was touched most recently
 *   5. `web` (DSH's own fallback)
 *
 * Pure function so it can be unit-tested without a running DSH.
 */
export function detectProfileDir(
  argv: readonly string[],
  env: Record<string, string | undefined>,
  home: string,
  exists: (p: string) => boolean = existsSync,
  mtimeOf: (p: string) => number = safeMtime,
): { profileDir: string; profileName: string } {
  const explicitDir = env.DSH_PROFILE_DIR ?? env.DSH_PROFILE_PATH
  if (explicitDir !== undefined && explicitDir.trim() !== '') {
    const dir = resolve(explicitDir.trim())
    return { profileDir: dir, profileName: dir.split(/[\\/]/).pop() ?? 'web' }
  }

  const explicitName = env.DSH_PROFILE
  if (explicitName !== undefined && explicitName.trim() !== '') {
    const name = explicitName.trim()
    return { profileDir: join(home, 'profiles', name), profileName: name }
  }

  for (const arg of argv) {
    const hit = /[\\/]profiles[\\/]([^\\/]+)[\\/]?$/.exec(arg)
    if (hit !== null && hit[1] !== undefined && hit[1] !== '') {
      const dir = arg.replace(/[\\/]+$/, '')
      return { profileDir: dir, profileName: hit[1] }
    }
  }

  const profilesRoot = join(home, 'profiles')
  let best: { dir: string; name: string; mtime: number } | null = null
  try {
    for (const entry of readdirSync(profilesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules')
        continue
      const dir = join(profilesRoot, entry.name)
      const patch = join(dir, PATCH_FILE_NAME)
      if (!exists(patch))
        continue
      const mtime = mtimeOf(patch)
      if (best === null || mtime > best.mtime)
        best = { dir, name: entry.name, mtime }
    }
  }
  catch {
    /* profiles directory missing — fall through */
  }
  if (best !== null)
    return { profileDir: best.dir, profileName: best.name }

  return { profileDir: join(profilesRoot, 'web'), profileName: 'web' }
}

function safeMtime(path: string): number {
  try {
    return statSync(path).mtimeMs
  }
  catch {
    return 0
  }
}

/** Resolve the DSH home directory without importing DSH internals. */
export function detectHome(env: Record<string, string | undefined>): string {
  const explicit = env.DSH_HOME
  if (explicit !== undefined && explicit.trim() !== '')
    return resolve(explicit.trim())
  return join(homedir(), '.dsh')
}

/** Compose the full path set for the running profile. */
export function resolveStudioPaths(
  options: { home?: string; argv?: readonly string[]; env?: Record<string, string | undefined> } = {},
): StudioPaths {
  const env = options.env ?? (process.env as Record<string, string | undefined>)
  const home = options.home ?? detectHome(env)
  const argv = options.argv ?? process.argv
  const { profileDir, profileName } = detectProfileDir(argv, env, home)
  return {
    home,
    profileDir,
    profileName,
    projectPatch: join(profileDir, PATCH_FILE_NAME),
    globalPatch: join(home, PATCH_FILE_NAME),
  }
}
