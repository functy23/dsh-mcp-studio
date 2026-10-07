/**
 * 技能来源标签的映射契约。
 *
 * 为什么值得写：来源标签原本只有一张七项表，任何表外值都退化成同一个「自定义」——
 * provider 上报的 `agent-codex`、`agent-trae-cn`、`agent-agents` 本来各是一个独立来源，
 * 在界面上却成了三个同名 chip。这组用例钉住四层回退：内置表 → 外部 Agent 表 →
 * 去掉前缀的原始 key → 「自定义」。
 */
import type { Translate } from '../locales/index.types'
import { describe, expect, it } from 'vitest'
import { agentSourceLocaleKey, agentSourceName, SKILL_SOURCES } from '../../shared/skill-sources'
import { AGENT_SOURCE_LOCALE_KEYS, sourceKey, sourceLabel } from './index'

/** 用 key 本身当文案，方便断言命中的是哪一层。 */
const t = ((key: string) => key) as unknown as Translate

describe('sourceLabel', () => {
  it('内置来源仍走本地化文案', () => {
    expect(sourceLabel('bundled', t)).toBe('sourceBundled')
    expect(sourceLabel('custom', t)).toBe('sourceCustom')
    expect(sourceLabel('user-dsh', t)).toBe('sourceUserDsh')
    expect(sourceLabel('project-agents', t)).toBe('sourceProjectAgents')
  })

  it('已知外部 Agent 目录走本地化文案', () => {
    expect(sourceLabel('agent-codex', t)).toBe('sourceAgentCodex')
    expect(sourceLabel('agent-trae-cn', t)).toBe('sourceAgentTraeCn')
    expect(sourceLabel('agent-agents', t)).toBe('sourceAgentAgents')
  })

  it('表外 agent-* 退回去掉前缀的原始 key', () => {
    expect(sourceLabel('agent-newtool', t)).toBe('newtool')
  })

  it('其它未知来源仍是自定义', () => {
    expect(sourceLabel('something-else', t)).toBe('sourceCustom')
    expect(sourceLabel('', t)).toBe('sourceCustom')
  })

  it('custom 的细分压过笼统的 custom', () => {
    expect(sourceLabel('custom', t, 'bundled')).toBe('sourceBundled')
    expect(sourceLabel('custom', t, 'agent-codex')).toBe('sourceAgentCodex')
    expect(sourceLabel('custom', t, 'agent-trae-cn')).toBe('sourceAgentTraeCn')
  })
})

describe('sourceKey', () => {
  it('有细分时用细分，没有时退回 source', () => {
    expect(sourceKey({ source: 'custom', sourceDetail: 'agent-codex' })).toBe('agent-codex')
    expect(sourceKey({ source: 'custom', sourceDetail: 'bundled' })).toBe('bundled')
    expect(sourceKey({ source: 'custom' })).toBe('custom')
    expect(sourceKey({ source: 'user-dsh' })).toBe('user-dsh')
  })

  it('同一个 custom 下的不同细分不会并成一组', () => {
    const rows = [
      { source: 'custom', sourceDetail: 'bundled' },
      { source: 'custom', sourceDetail: 'agent-codex' },
      { source: 'custom' },
    ]
    expect(new Set(rows.map(sourceKey)).size).toBe(3)
  })
})

describe('skill source table', () => {
  it('目录 key 派生出稳定的来源名与文案 key', () => {
    expect(agentSourceName('codex')).toBe('agent-codex')
    expect(agentSourceLocaleKey('codex')).toBe('sourceAgentCodex')
    expect(agentSourceLocaleKey('trae-cn')).toBe('sourceAgentTraeCn')
    expect(agentSourceLocaleKey('windsurf-user')).toBe('sourceAgentWindsurfUser')
  })

  it('表里每个目录都能被显示层命中，且文案 key 与表一一对应', () => {
    for (const spec of SKILL_SOURCES) {
      expect(AGENT_SOURCE_LOCALE_KEYS[spec.key]).toBe(agentSourceLocaleKey(spec.key))
      expect(sourceLabel(agentSourceName(spec.key), t)).not.toBe('sourceCustom')
    }
  })

  it('官方已经扫过的目录带 official，不再重复注册', () => {
    const officials = SKILL_SOURCES.filter(spec => spec.official !== undefined).map(spec => spec.official)
    expect(officials).toContain('user-agents')
  })

  it('目录 key 不重复', () => {
    const keys = SKILL_SOURCES.map(spec => spec.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
