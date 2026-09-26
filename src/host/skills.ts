import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { StudioState } from './state'

/** Rank used by the override provider: lower than every real provider, so a disable always wins. */
const OVERRIDE_RANK = 0
const OVERRIDE_PROVIDER = 'dsh-mcp-studio-override'
const STATE_FILE = 'dsh-mcp-studio.json'

export interface SkillRow {
  name: string
  description: string
  source?: string
  provider?: string
  path?: string
  modelInvocable: boolean
  userInvocable: boolean
  /** Human-facing bucket: 项目级 / 运行时 / 用户级 / 自定义 / 内置 / 插件自带. */
  level: string
  /** true when this plugin's override provider is what makes the skill unavailable. */
  disabledByStudio: boolean
  /** false when the skill cannot be enabled/disabled from here, with a reason. */
  toggleable: boolean
  reason?: string
}

interface StudioStateFile {
  version: 1
  disabledSkills: string[]
}

export function levelOf(source: string | undefined, provider: string | undefined): string {
  if (source === 'project-dsh' || source === 'project-agents')
    return '项目级'
  if (source === 'runtime')
    return '运行时'
  if (source === 'user-dsh' || source === 'user-agents')
    return '用户级'
  if (source === 'bundled')
    return '内置'
  if (source === 'custom' && provider === 'filesystem')
    return '自定义'
  return '插件自带'
}

export function isUserLevel(source: string | undefined): boolean {
  return source === 'user-dsh' || source === 'user-agents'
}

/** Minimal SKILL.md frontmatter reader mirroring dsh-skill-filesystem's parse rules. */
export function parseSkillFile(raw: string): { name: string, description: string, path?: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)
  if (match === null)
    return null
  const fields = new Map<string, string>()
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line.trim())
    if (kv !== null && kv[1] !== undefined)
      fields.set(kv[1], (kv[2] ?? '').trim().replace(/^['"]|['"]$/g, ''))
  }
  const name = fields.get('name')
  const description = fields.get('description')
  if (name === undefined || name === '' || description === undefined || description === '')
    return null
  return { name, description }
}

/**
 * Skills manager: lists every skill DSH knows about, and enables/disables them
 * through a rank-0 override provider (no user file is ever modified).
 */
export class SkillsManager {
  private readonly ctx: any
  private readonly state: StudioState
  private readonly overrides = new Map<string, any>()
  private control: any = null
  private registered = false

  constructor(state: StudioState) {
    this.state = state
    this.ctx = state.ctx
  }

  private get skillsService(): any {
    return this.ctx?.get?.('skills')
  }

  get available(): boolean {
    return this.skillsService !== undefined && this.skillsService !== null
  }

  private statePath(): string {
    return join(this.state.paths.profileDir, STATE_FILE)
  }

  private readState(): string[] {
    try {
      const raw = readFileSync(this.statePath(), 'utf8')
      const parsed = JSON.parse(raw) as Partial<StudioStateFile>
      return Array.isArray(parsed.disabledSkills)
        ? parsed.disabledSkills.filter((name): name is string => typeof name === 'string')
        : []
    }
    catch {
      return []
    }
  }

  private writeState(names: string[]): void {
    try {
      const payload: StudioStateFile = { version: 1, disabledSkills: names }
      writeFileSync(this.statePath(), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    }
    catch (error) {
      console.error('[dsh-mcp-studio] failed to persist skill state:', error instanceof Error ? error.message : String(error))
    }
  }

  /** Register the override provider. Safe to call once per plugin apply. */
  register(): void {
    if (this.registered || !this.available)
      return
    const service = this.skillsService
    if (typeof service.registerProvider !== 'function')
      return
    const overrides = this.overrides
    try {
      service.registerProvider((control: any) => {
        this.control = control
        return {
          name: OVERRIDE_PROVIDER,
          async list() {
            return [...overrides.values()].map((definition: any) => ({
              name: definition.name,
              description: definition.description,
              ...(definition.whenToUse !== undefined ? { whenToUse: definition.whenToUse } : {}),
              invocation: definition.invocation,
              source: definition.source,
              provider: OVERRIDE_PROVIDER,
              rank: OVERRIDE_RANK,
              ...(definition.path !== undefined ? { path: definition.path } : {}),
              locator: definition.name,
            }))
          },
          async get(candidate: { name: string }) {
            return overrides.get(candidate.name)
          },
        }
      })
      this.registered = true
      this.ctx.on?.('skills/change', () => { void this.reapply() })
      void this.reapply()
    }
    catch (error) {
      console.error('[dsh-mcp-studio] skills provider registration failed:', error instanceof Error ? error.message : String(error))
    }
  }

  /** Re-materialise persisted disables into the override provider. */
  async reapply(): Promise<void> {
    if (!this.available)
      return
    let changed = false
    for (const name of this.readState()) {
      if (this.overrides.has(name))
        continue
      try {
        const definition = await this.skillsService.get(name)
        if (definition === null || definition === undefined)
          continue
        this.overrides.set(name, {
          ...definition,
          provider: OVERRIDE_PROVIDER,
          invocation: { modelInvocable: false, userInvocable: false },
        })
        changed = true
      }
      catch {
        /* provider not ready — retried on the next skills/change */
      }
    }
    if (changed)
      this.invalidate()
  }

  private invalidate(): void {
    try {
      this.control?.invalidate?.()
    }
    catch {
      /* control not ready yet */
    }
  }

  /** Every skill: registry snapshot merged with user-level files and live overrides. */
  async list(): Promise<{ ok: boolean, error?: string, skills: SkillRow[], complete: boolean, overrideProvider: string, statePath: string }> {
    if (!this.available) {
      return { ok: false, error: 'skills 服务不可用（当前 profile 未启用技能注册表）', skills: [], complete: false, overrideProvider: OVERRIDE_PROVIDER, statePath: this.statePath() }
    }
    const rows = new Map<string, SkillRow>()
    let complete = true
    try {
      const snapshot = await this.skillsService.snapshot({})
      complete = snapshot?.complete !== false
      for (const skill of snapshot?.skills ?? [])
        rows.set(skill.name, this.toRow(skill))
    }
    catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error), skills: [], complete: false, overrideProvider: OVERRIDE_PROVIDER, statePath: this.statePath() }
    }

    for (const skill of this.scanUserSkills()) {
      if (!rows.has(skill.name))
        rows.set(skill.name, skill)
    }
    for (const [name, definition] of this.overrides) {
      const existing = rows.get(name)
      if (existing !== undefined) {
        existing.disabledByStudio = true
        existing.modelInvocable = false
        existing.userInvocable = false
        if (definition.description !== undefined && existing.description === '')
          existing.description = String(definition.description)
      }
    }

    const skills = [...rows.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    return { ok: true, skills, complete, overrideProvider: OVERRIDE_PROVIDER, statePath: this.statePath() }
  }

  private toRow(skill: any): SkillRow {
    const disabledByStudio = this.overrides.has(skill.name)
    const userLevel = isUserLevel(skill.source)
    const row: SkillRow = {
      name: String(skill.name ?? ''),
      description: String(skill.description ?? ''),
      modelInvocable: skill.invocation?.modelInvocable !== false,
      userInvocable: skill.invocation?.userInvocable !== false,
      level: levelOf(skill.source, skill.provider),
      disabledByStudio,
      toggleable: !userLevel,
    }
    if (skill.source !== undefined) row.source = String(skill.source)
    if (skill.provider !== undefined) row.provider = String(skill.provider)
    if (skill.path !== undefined) row.path = String(skill.path)
    if (userLevel)
      row.reason = '用户级技能由 DSH 文件系统管理，请在 SKILL.md 中设置 user-invocable: false'
    return row
  }

  /** User-level skills live in the scoped layer and never show up in a global snapshot. */
  private scanUserSkills(): SkillRow[] {
    const root = join(this.state.paths.home, 'skills')
    if (!existsSync(root))
      return []
    const out: SkillRow[] = []
    let entries: string[] = []
    try {
      entries = readdirSync(root)
    }
    catch {
      return []
    }
    const consider = (file: string, dir?: string): void => {
      try {
        const parsed = parseSkillFile(readFileSync(file, 'utf8'))
        if (parsed === null)
          return
        out.push({
          name: parsed.name,
          description: parsed.description,
          source: 'user-dsh',
          provider: 'filesystem',
          path: file,
          modelInvocable: true,
          userInvocable: true,
          level: '用户级',
          disabledByStudio: false,
          toggleable: false,
          reason: '用户级技能由 DSH 文件系统管理，请在 SKILL.md 中设置 user-invocable: false',
        })
      }
      catch {
        /* unreadable file — skip */
      }
    }
    for (const entry of entries) {
      const full = join(root, entry)
      try {
        if (statSync(full).isDirectory()) {
          const file = join(full, 'SKILL.md')
          if (existsSync(file))
            consider(file, full)
        }
        else if (entry.endsWith('.md')) {
          consider(full)
        }
      }
      catch {
        /* skip unreadable entry */
      }
    }
    return out
  }

  /** Read one skill's SKILL.md (or its registry definition when no file exists). */
  async detail(name: string): Promise<{ ok: boolean, error?: string, name?: string, description?: string, path?: string, content?: string, level?: string }> {
    if (!this.available) {
      const userSkill = this.scanUserSkills().find(skill => skill.name === name)
      if (userSkill === undefined)
        return { ok: false, error: 'skills 服务不可用' }
      return this.readDetailFromFile(userSkill)
    }
    let definition: any = null
    try {
      definition = await this.skillsService.get(name)
    }
    catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
    if (definition === null || definition === undefined) {
      const userSkill = this.scanUserSkills().find(skill => skill.name === name)
      if (userSkill === undefined)
        return { ok: false, error: `未找到技能 ${name}` }
      return this.readDetailFromFile(userSkill)
    }
    const row = this.toRow(definition)
    if (row.path !== undefined && existsSync(row.path)) {
      try {
        return { ok: true, name: row.name, description: row.description, path: row.path, content: readFileSync(row.path, 'utf8'), level: row.level }
      }
      catch {
        /* fall through to the registry view */
      }
    }
    return {
      ok: true,
      name: row.name,
      description: row.description,
      level: row.level,
      content: definition.content !== undefined
        ? String(definition.content)
        : JSON.stringify({ name: row.name, description: row.description, source: row.source, provider: row.provider, invocation: { modelInvocable: row.modelInvocable, userInvocable: row.userInvocable } }, null, 2),
    }
  }

  private readDetailFromFile(skill: SkillRow): { ok: boolean, name: string, description: string, path?: string, content: string, level: string } {
    const content = skill.path !== undefined && existsSync(skill.path) ? readFileSync(skill.path, 'utf8') : ''
    return {
      ok: true,
      name: skill.name,
      description: skill.description,
      ...(skill.path !== undefined ? { path: skill.path } : {}),
      content,
      level: skill.level,
    }
  }

  /** Enable or disable one skill. Only the override provider is written — never a user file. */
  async setEnabled(name: string, enabled: boolean): Promise<{ ok: boolean, error?: string }> {
    if (!this.available)
      return { ok: false, error: 'skills 服务不可用' }
    if (name === '')
      return { ok: false, error: 'name is required' }
    if (!enabled) {
      let definition: any = null
      try {
        definition = await this.skillsService.get(name)
      }
      catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
      if (definition === null || definition === undefined)
        return { ok: false, error: `未找到技能 ${name}` }
      if (isUserLevel(definition.source))
        return { ok: false, error: '用户级技能不支持在此停用（请在 SKILL.md 中设置 user-invocable: false）' }
      this.overrides.set(name, {
        ...definition,
        provider: OVERRIDE_PROVIDER,
        invocation: { modelInvocable: false, userInvocable: false },
      })
    }
    else {
      if (!this.overrides.has(name))
        return { ok: true }
      this.overrides.delete(name)
    }
    this.writeState([...this.overrides.keys()])
    this.invalidate()
    return { ok: true }
  }

  /** Force the registry to re-read providers (used by the Skills page refresh button). */
  async refresh(): Promise<{ ok: boolean, error?: string }> {
    if (!this.available)
      return { ok: false, error: 'skills 服务不可用' }
    try {
      this.control?.invalidate?.()
      await this.skillsService.refresh?.()
      return { ok: true }
    }
    catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}
