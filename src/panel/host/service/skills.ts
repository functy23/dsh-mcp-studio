import type {
  HostSkill,
  HostSkillDefinition,
  PluginState,
  SkillInput,
  SkillRepositoryMetadata,
  SkillRow,
  SkillSourceEntry,
} from './skills.types'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { defineService } from 'dsh-tauri'
import { orderBy } from 'lodash-es'
import { isAbsolute, join, relative, resolve, sep } from 'pathe'
import { agentSourceName, SKILL_SOURCES } from '../../shared/skill-sources'
import { packagedSkillsDir, SKILL_NAME_RE, SKILLS_DATA_DIR } from '../config/constants'
import { getCurrentHostInstance } from '../config/runtime'
import { storage } from '../storage'
import { skillDir, skillFilePath } from '../utils/paths.utils'
import { isSkillSourceEntry, rewriteSkillContent, rewriteSkillPolicy, serializeSkill } from './skills.utils'

const STATE_FILE_NAME = 'state.json'

export const skills = defineService({
  // --- Skill 基础操作 ---
  async get(name: string): Promise<HostSkillDefinition | null> {
    return (await getCurrentHostInstance().skills.get(name)) ?? null
  },

  save(input: SkillInput, file?: string): string {
    if (file !== undefined) {
      writeFileSync(file, rewriteSkillContent(readFileSync(file, 'utf8'), input), 'utf8')
      return file
    }
    const target = skillFilePath(input.name)
    mkdirSync(skillDir(input.name), { recursive: true })
    writeFileSync(target, serializeSkill(input), 'utf8')
    return target
  },

  remove(name: string): boolean {
    if (!SKILL_NAME_RE.test(name))
      return false
    const dir = skillDir(name)
    if (!existsSync(dir) || !statSync(dir).isDirectory())
      return false
    rmSync(dir, { recursive: true, force: true })
    return true
  },

  // --- Skill 视图/展示目录 ---
  async getCatalog(): Promise<SkillRow[]> {
    const hostSkills = await getCurrentHostInstance().skills.list()
    const sources = await readSources()
    const rows = await Promise.all(hostSkills.map(skill => toSkillRow(skill, sources)))
    return orderBy(rows, [row => row.repository === undefined], ['asc'])
  },

  // --- Skill 来源/仓库 ---
  async listSources(): Promise<SkillSourceEntry[]> {
    return readSources()
  },

  async getSource(url: string): Promise<SkillSourceEntry | null> {
    return (await readSources()).find(entry => entry.url === url) ?? null
  },

  async saveSource(entry: SkillSourceEntry): Promise<SkillSourceEntry> {
    const sources = await readSources()
    sources.push(entry)
    await writeSources(sources)
    return entry
  },

  async removeSource(id: string): Promise<SkillSourceEntry | null> {
    const sources = await readSources()
    const at = sources.findIndex(entry => entry.id === id)
    if (at === -1)
      return null
    const [removed] = sources.splice(at, 1)
    await writeSources(sources)
    return removed
  },

  // --- Skill 策略配置 ---
  setPolicy(file: string, enabled: boolean): void {
    writeFileSync(file, rewriteSkillPolicy(readFileSync(file, 'utf8'), enabled), 'utf8')
  },
})

// --- internal ---

async function readSources(): Promise<SkillSourceEntry[]> {
  const parsed = await storage.getItem<Partial<PluginState>>(STATE_FILE_NAME)
  if (!Array.isArray(parsed?.skillRoots))
    return []
  return parsed.skillRoots.filter(isSkillSourceEntry)
}

async function writeSources(sources: SkillSourceEntry[]): Promise<void> {
  await storage.setItem(STATE_FILE_NAME, `${JSON.stringify({ skillRoots: sources }, null, 2)}\n`)
}

async function customSkillWritable(dir: string): Promise<boolean> {
  if (dir === SKILLS_DATA_DIR || dir.startsWith(SKILLS_DATA_DIR + sep))
    return true
  return (await readSources()).some(entry =>
    entry.roots.some(root => dir === root || dir.startsWith(root + sep)))
}

async function skillWritable(skill: HostSkill, dir: string | undefined): Promise<boolean> {
  if (dir === undefined)
    return false
  if (skill.source === 'user-dsh')
    return true
  return skill.source === 'custom' && await customSkillWritable(dir)
}

function pathWithin(path: string, parent: string): boolean {
  const child = resolve(path)
  const root = resolve(parent)
  const nested = relative(root, child)
  return nested === '' || (!nested.startsWith(`..${sep}`) && nested !== '..' && !isAbsolute(nested))
}

function repositoryForSkill(
  skill: HostSkill,
  entries: SkillSourceEntry[],
): SkillRepositoryMetadata | undefined {
  const dir = skill.resourceBase?.kind === 'directory' ? skill.resourceBase.path : undefined
  if (dir === undefined)
    return undefined
  const entry = entries.find(candidate => candidate.roots.some(root => pathWithin(dir, root)))
  if (entry === undefined)
    return undefined
  return {
    id: entry.id,
    label: entry.label,
    kind: entry.kind,
    ...(entry.kind === 'git' && entry.url !== undefined ? { githubUrl: entry.url } : {}),
  }
}

/**
 * `custom` 来源的细分。
 *
 * DSH 把插件通过 `customSkillDirs` 注册的目录一律记成 `custom`，但同一个 `custom` 里
 * 可能同时躺着本插件随包的技能、以及别的 agent 工具的技能目录。按技能的实际目录把它们
 * 拆开，界面才不会出现「一个标签混了两种来源」。
 */
function customSourceDetail(skill: HostSkill): string | undefined {
  if (skill.source !== 'custom')
    return undefined
  const dir = skill.resourceBase?.kind === 'directory' ? skill.resourceBase.path : undefined
  if (dir === undefined)
    return undefined
  if (pathWithin(dir, packagedSkillsDir()))
    return 'bundled'
  const spec = SKILL_SOURCES.find(candidate => pathWithin(dir, join(homedir(), candidate.directory)))
  return spec === undefined ? undefined : agentSourceName(spec.key)
}

async function toSkillRow(skill: HostSkill, entries: SkillSourceEntry[]): Promise<SkillRow> {
  const dir = skill.resourceBase?.kind === 'directory' ? skill.resourceBase.path : undefined
  const repository = repositoryForSkill(skill, entries)
  const sourceDetail = customSourceDetail(skill)
  return {
    ...skill,
    editable: await skillWritable(skill, dir),
    removable: skill.source === 'user-dsh',
    ...(dir !== undefined ? { dir } : {}),
    ...(sourceDetail !== undefined ? { sourceDetail } : {}),
    policyEditable: dir !== undefined,
    ...(repository !== undefined ? { repository } : {}),
  }
}
