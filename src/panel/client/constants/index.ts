import type { LocaleKey, Translate } from '../locales/index.types'
import { agentSourceKey, agentSourceLocaleKey, SKILL_SOURCES } from '../../shared/skill-sources'
import { PLUGIN_ID } from '../../shared/constants'

export { PLUGIN_ID } from '../../shared/constants'

export const CONVERSATION_INPUT_LEFT_SLOT = 'conversation.input.left'
export const MARKET_SERVICE_NAME = 'market'
export const PANEL_ID = PLUGIN_ID
export const PANEL_ACTION_ORDER = 20
export const INPUT_PREFILL_ID = `${PLUGIN_ID}.skill-prefill`
export const INPUT_PREFILL_ORDER = 40
export const INPUT_PREFILL_PRIORITY = 0
export const STYLE_ID = `${PLUGIN_ID}-styles`

export const LOCALE_EFFECT = `${PLUGIN_ID}: locale`
export const STYLES_EFFECT = `${PLUGIN_ID}: styles`
export const SKILL_CREATOR_PREFILL_EFFECT = `${PLUGIN_ID}: skill creator prefill`
export const EXTENSION_PANEL_EFFECT = `${PLUGIN_ID}: extension panel`

export const SKILL_CREATOR_DRAFT = '/skill-creator '
export const SKILL_REFRESH_INTERVAL_MS = 300
export const SKILL_REFRESH_TIMEOUT_MS = 5_000
export const IMPORT_REFRESH_DELAYS_MS = [250, 750, 1_500] as const
export const MCP_RESTART_INITIAL_DELAY_MS = 3_000
export const MCP_RESTART_POLL_INTERVAL_MS = 1_500
export const MCP_RESTART_TIMEOUT_MS = 60_000
export const GITHUB_REPOSITORY_PATTERN = /^(?:https?:\/\/github\.com\/)?[\w.-]+\/[\w.-]+\/?$/i

export const SOURCE_LOCALE_KEYS: Readonly<Record<string, LocaleKey>> = {
  'project-dsh': 'sourceProjectDsh',
  'project-agents': 'sourceProjectAgents',
  'user-dsh': 'sourceUserDsh',
  'user-agents': 'sourceUserAgents',
  'runtime': 'sourceRuntime',
  'bundled': 'sourceBundled',
  'custom': 'sourceCustom',
}

/**
 * 外部 Agent 目录 → 界面文案。
 *
 * 目录表在 `../../shared/skill-sources`（唯一真相源），文案 key 由目录 key 驼峰化得到；
 * 加一家新工具只要在那边加一行、再在 locales 里补一条 `sourceAgent<Key>` 文案。
 */
export const AGENT_SOURCE_LOCALE_KEYS: Readonly<Record<string, LocaleKey>> = Object.fromEntries(
  SKILL_SOURCES.map(spec => [spec.key, agentSourceLocaleKey(spec.key) as LocaleKey]),
)

/**
 * 技能在界面上实际使用的来源键。
 *
 * 宿主算出的 `sourceDetail` 优先：`custom` 是个筐，里面既可能有本插件随包的技能，也可能
 * 有别的 agent 工具的目录，只看 `source` 会把它们归成同一组。
 */
export function sourceKey(row: { source: string, sourceDetail?: string }): string {
  return row.sourceDetail ?? row.source
}

/**
 * 一个技能来源的显示文案。
 *
 * 内置来源与已知的外部 Agent 目录走本地化文案；其余 `agent-<key>` 退回去掉前缀的原始
 * key——它们各自是不同的来源，只显示「自定义」会让多个来源挤成同一个标签。
 */
export function sourceLabel(source: string, t: Translate, detail?: string): string {
  const effective = sourceKey({ source, sourceDetail: detail })
  const known = SOURCE_LOCALE_KEYS[effective]
  if (known !== undefined) return t(known)
  const key = agentSourceKey(effective)
  if (key === effective) return t('sourceCustom')
  const localeKey = AGENT_SOURCE_LOCALE_KEYS[key]
  return localeKey === undefined ? key : t(localeKey)
}
