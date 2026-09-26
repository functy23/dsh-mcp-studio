import type { SkillInput, SkillSourceEntry, SkillSourceView } from './skills.types'
import { isEmpty } from 'lodash-es'
import { SKILL_NAME_RE } from '../config/constants'
import { directoryExists } from '../utils/filesystem.utils'

const SKILL_DESCRIPTION_MAX_LENGTH = 1024

const SKILL_WHEN_TO_USE_MAX_LENGTH = 2048

const SKILL_CONTENT_MAX_BYTES = 256 * 1024

/** 受管 frontmatter 键：写回时先删掉，再由输入统一重建（避免同名键写两遍）。 */
const MANAGED_KEY_RE = /^(?:name|description|whenToUse|disable-model-invocation|user-invocable):/

/** 策略位键：只由 rewriteSkillPolicy 管，正文写入不碰。 */
const POLICY_KEY_RE = /^(?:disable-model-invocation|user-invocable):/

export function rootView(entry: SkillSourceEntry): SkillSourceView {
  return { ...entry, live: entry.roots.every(root => directoryExists(root)) }
}

export function isSkillSourceEntry(entry: unknown): entry is SkillSourceEntry {
  if (typeof entry !== 'object' || entry === null)
    return false
  const candidate = entry as Record<string, unknown>
  return typeof candidate.id === 'string' && Array.isArray(candidate.roots)
}

export function serializeSkill(input: SkillInput): string {
  const body = normalizedBody(input.content)
  return `---\n${managedLines(input).join('\n')}\n---\n\n${body}\n`
}

export function validateSkillInput(input: SkillInput): string | null {
  if (!SKILL_NAME_RE.test(input.name))
    return 'name must be kebab-case (a-z, 0-9, dashes)'
  if (input.description.trim() === '')
    return 'description is required'
  if (input.description.length > SKILL_DESCRIPTION_MAX_LENGTH)
    return `description too long (max ${SKILL_DESCRIPTION_MAX_LENGTH})`
  if ((input.whenToUse?.length ?? 0) > SKILL_WHEN_TO_USE_MAX_LENGTH)
    return `whenToUse too long (max ${SKILL_WHEN_TO_USE_MAX_LENGTH})`
  if (input.content.length > SKILL_CONTENT_MAX_BYTES)
    return 'content too large (max 256 KiB)'
  return null
}

/**
 * 就地重写已有 SKILL.md 的 frontmatter。
 *
 * 与 serializeSkill 共用同一套受管键构造（`managedLines`），差别只有两点，都在这里显式化：
 * 保留本工具不认识的键（上游/用户手写的扩展键不能吃），以及沿用原文件的换行风格。
 */
export function rewriteSkillContent(text: string, input: SkillInput): string {
  const { newline, lines } = frontmatterOf(text)
  const unknown = lines.filter(line => !MANAGED_KEY_RE.test(line))
  const body = normalizedBody(input.content)
  return `---${newline}${managedLines(input, unknown).join(newline)}${newline}---${newline}${newline}${body}${newline}`
}

export function rewriteSkillPolicy(text: string, enabled: boolean): string {
  const { newline, lines, body } = frontmatterOf(text)
  const kept = lines.filter(line => !POLICY_KEY_RE.test(line))
  if (!enabled)
    kept.push('disable-model-invocation: true', 'user-invocable: false')
  return `---${newline}${kept.join(newline)}${newline}---${body}`
}

// --- internal ---

/**
 * 受管 frontmatter 行（顺序固定：身份 → 触发说明 → 策略位），可选追加保留行。
 *
 * 写入（serializeSkill）与就地重写（rewriteSkillContent）都走这里：加字段时只改这一处，
 * 两边不会再出现「一个写、一个不写」的分叉。
 */
function managedLines(input: SkillInput, extra: readonly string[] = []): string[] {
  const lines = [
    `name: ${input.name}`,
    `description: ${JSON.stringify(input.description)}`,
  ]
  if (!isEmpty(input.whenToUse))
    lines.push(`whenToUse: ${JSON.stringify(input.whenToUse)}`)
  if (!input.modelInvocable)
    lines.push('disable-model-invocation: true')
  if (!input.userInvocable)
    lines.push('user-invocable: false')
  return [...lines, ...extra]
}

/** 正文统一成 LF 并去掉首尾空行：磁盘上的 SKILL.md 只保留一种换行，比较与 diff 才稳定。 */
function normalizedBody(content: string): string {
  return content.replace(/\r\n/g, '\n').trim()
}

function frontmatterOf(text: string): { newline: string, lines: string[], body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (match === null)
    throw new Error('skill file has no frontmatter block')
  return {
    newline: text.includes('\r\n---') ? '\r\n' : '\n',
    lines: match[1].split(/\r?\n/),
    body: text.slice(match[0].length),
  }
}
