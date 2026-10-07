/**
 * 「打开技能目录」的来源 → 目录映射契约。
 *
 * 为什么值得写：这个按钮原先固定打开 DSH 自己的技能目录，用户切到「Codex」「Trae 国内版」
 * 等分类后点它仍然打开那个空目录。映射全部来自 `shared/skill-sources` 那张表，这组用例把
 * 「表改了、按钮跟着变」钉住，顺便覆盖两个官方来源（user-dsh / user-agents）与未知来源。
 */
import { homedir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'
import { SKILLS_DATA_DIR } from '../config/constants'
import { skillSourceDir } from './paths.utils'

describe('skillSourceDir', () => {
  it('DSH 自己的来源落在技能目录', () => {
    expect(skillSourceDir('user-dsh')).toBe(SKILLS_DATA_DIR)
    expect(skillSourceDir('custom')).toBe(SKILLS_DATA_DIR)
  })

  it('外部 Agent 目录按表解析，带不带 agent- 前缀都认', () => {
    expect(skillSourceDir('agent-codex')).toBe(join(homedir(), '.codex/skills'))
    expect(skillSourceDir('agent-trae-cn')).toBe(join(homedir(), '.trae-cn/skills'))
    expect(skillSourceDir('user-agents')).toBe(join(homedir(), '.agents/skills'))
    expect(skillSourceDir('agent-agents')).toBe(join(homedir(), '.agents/skills'))
  })

  it('表里没有的来源返回 undefined，由调用方处理', () => {
    expect(skillSourceDir('project-dsh')).toBeUndefined()
    expect(skillSourceDir('agent-unknown-tool')).toBeUndefined()
  })
})
