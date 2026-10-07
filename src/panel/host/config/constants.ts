import { fileURLToPath } from 'node:url'
import { DSH_HOME } from 'dsh-tauri'
import { dirname, join } from 'pathe'

export const SKILL_FILE_NAME = 'SKILL.md'
export const SKILLS_DATA_DIR = join(DSH_HOME, 'skills')

export const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const MCP_PLUGIN = '@deepseek-ai/dsh-mcp-client'
export const PATCH_FILE_NAME = 'cordis.patch.yml'

/**
 * 随包发布的技能目录（`<package>/skills`）。
 *
 * 构建产物是单个 `lib/index.js`，所以 `import.meta.url` 在运行时始终指向它，
 * 与源码文件所在层级无关。
 */
export function packagedSkillsDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')
}
