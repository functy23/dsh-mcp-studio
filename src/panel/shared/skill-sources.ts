/**
 * 其他 agent 工具的技能目录。
 *
 * 这里是唯一真相源：宿主用它决定要注册哪些目录、再按技能的实际目录反查来源；客户端用它
 * 把来源翻成文案。加一家新工具 = 这里加一行 + `locales/index.ts` 补一条 `sourceAgent<Key>`
 * 文案，逻辑一行都不用动。
 *
 * 目录一律相对用户主目录、用 POSIX 分隔符书写，宿主侧用 pathe 的 join 拼成绝对路径。
 */
export interface SkillSourceSpec {
  /** 来源键：`agent-<key>` 的后半段，同时决定文案 key（`sourceAgent` + 驼峰化）。 */
  key: string
  /** 相对用户主目录的技能目录。 */
  directory: string
  /**
   * DSH 官方 provider 已经扫描、并给了正确 source 的目录。
   *
   * 这些**不**塞进 `customSkillDirs`：重复注册会让同一批技能被两个来源抢，而自定义目录
   * 一律记 `custom`，会把官方更准确的 source 覆盖掉。
   */
  official?: string
}

export const SKILL_SOURCES: readonly SkillSourceSpec[] = [
  { key: 'agents', directory: '.agents/skills', official: 'user-agents' },
  { key: 'ccswitch', directory: '.cc-switch/skills' },
  { key: 'claude', directory: '.claude/skills' },
  { key: 'clawdbot', directory: '.clawdbot/skills' },
  { key: 'codex', directory: '.codex/skills' },
  { key: 'copilot', directory: '.copilot/skills' },
  { key: 'cursor', directory: '.cursor/skills' },
  { key: 'gemini', directory: '.gemini/skills' },
  { key: 'openclaw', directory: '.openclaw/skills' },
  { key: 'opencode', directory: '.config/opencode/skills' },
  { key: 'trae', directory: '.trae/skills' },
  { key: 'trae-cn', directory: '.trae-cn/skills' },
  { key: 'windsurf', directory: '.codeium/windsurf/skills' },
  { key: 'windsurf-user', directory: '.windsurf/skills' },
]

/** 外部 Agent 目录的来源前缀。 */
export const AGENT_SOURCE_PREFIX = 'agent-'

/** 外部 Agent 目录的来源名。 */
export function agentSourceName(key: string): string {
  return `${AGENT_SOURCE_PREFIX}${key}`
}

/** `agent-<key>` → `<key>`；不是外部 Agent 来源时原样返回。 */
export function agentSourceKey(source: string): string {
  return source.startsWith(AGENT_SOURCE_PREFIX) ? source.slice(AGENT_SOURCE_PREFIX.length) : source
}

/** 外部 Agent 目录对应的文案 key（`sourceAgent` + key 的驼峰化）。 */
export function agentSourceLocaleKey(key: string): string {
  const pascal = key
    .split('-')
    .filter(part => part !== '')
    .map(part => part[0]!.toUpperCase() + part.slice(1))
    .join('')
  return `sourceAgent${pascal}`
}
