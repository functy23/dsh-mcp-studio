import { homedir } from 'node:os'
import { DSH_HOME } from 'dsh-tauri'
import { join } from 'pathe'
import { agentSourceKey, SKILL_SOURCES } from '../../shared/skill-sources'
import { packagedSkillsDir, SKILL_FILE_NAME, SKILLS_DATA_DIR } from '../config/constants'

const PROFILES_DIRECTORY = 'profiles'

const REPOS_DIRECTORY = 'repos'

export function skillDir(name: string): string {
  return join(SKILLS_DATA_DIR, name)
}

export function skillFilePath(name: string): string {
  return join(skillDir(name), SKILL_FILE_NAME)
}

export function materialDirFor(entryId: string): string {
  return join(SKILLS_DATA_DIR, REPOS_DIRECTORY, entryId)
}

export function profileDir(profile: string): string {
  return join(DSH_HOME, PROFILES_DIRECTORY, profile)
}

/**
 * 一个来源在磁盘上的根目录，供「打开技能目录」按钮使用。
 *
 * 来源名到目录的对应全部来自 `shared/skill-sources` 那张表（唯一真相源）；`user-dsh` 与
 * `custom` 都落在 DSH 自己的技能目录，`bundled` 是随包发布的目录。表里没有的来源（例如
 * 项目级目录，它要当前工作区才算得出来）返回 undefined，由调用方决定怎么处理。
 */
export function skillSourceDir(source: string): string | undefined {
  if (source === 'user-dsh' || source === 'custom')
    return SKILLS_DATA_DIR
  if (source === 'bundled')
    return packagedSkillsDir()
  const key = agentSourceKey(source)
  const spec = SKILL_SOURCES.find(candidate => candidate.key === key || candidate.official === source)
  return spec === undefined ? undefined : join(homedir(), spec.directory)
}
