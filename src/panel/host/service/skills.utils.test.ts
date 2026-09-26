/**
 * SKILL.md frontmatter 的读写契约测试。
 *
 * 为什么值得写：serializeSkill（新建）与 rewriteSkillContent（就地重写）曾经各拼一遍同一份
 * frontmatter，加字段时容易只改一处；现在两者共用 managedLines，这组用例把契约钉住，
 * 顺便覆盖「保留未知键 / 沿用换行风格 / 策略位增删」这三条容易被重构弄丢的行为。
 */
import type { SkillInput } from './skills.types'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterAll, describe, expect, it } from 'vitest'
import { isSkillSourceEntry, rewriteSkillContent, rewriteSkillPolicy, rootView, serializeSkill, validateSkillInput } from './skills.utils'

function input(patch: Partial<SkillInput> = {}): SkillInput {
  return {
    name: 'demo-skill',
    description: 'A demo skill',
    whenToUse: '',
    modelInvocable: true,
    userInvocable: true,
    content: '# Demo\n\nbody\n',
    ...patch,
  }
}

const dirs: string[] = []

afterAll(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

describe('serializeSkill（新建技能）', () => {
  it('写 name / description，启用态不写策略位', () => {
    expect(serializeSkill(input())).toBe('---\nname: demo-skill\ndescription: "A demo skill"\n---\n\n# Demo\n\nbody\n')
  })

  it('whenToUse 非空才写，且与 description 一样走 JSON 转义', () => {
    expect(serializeSkill(input({ whenToUse: 'when: 用户要"建技能"' })))
      .toBe('---\nname: demo-skill\ndescription: "A demo skill"\nwhenToUse: "when: 用户要\\"建技能\\""\n---\n\n# Demo\n\nbody\n')
  })

  it('关闭模型/用户调用时写两个策略位', () => {
    const text = serializeSkill(input({ modelInvocable: false, userInvocable: false }))
    expect(text).toContain('disable-model-invocation: true\nuser-invocable: false')
  })

  it('正文 CRLF 归一为 LF，首尾空行裁掉', () => {
    expect(serializeSkill(input({ content: '\r\n# Demo\r\n\r\n' })))
      .toBe('---\nname: demo-skill\ndescription: "A demo skill"\n---\n\n# Demo\n')
  })
})

describe('rewriteSkillContent（就地重写）', () => {
  const crlf = '---\r\nname: old\r\ndescription: "old"\r\ncustom-key: keep-me\r\n---\r\nold body'

  it('替换受管键、保留未知键、沿用原文件换行风格', () => {
    expect(rewriteSkillContent(crlf, input({ name: 'new-skill', description: 'New', whenToUse: 'w', content: 'new body' })))
      .toBe('---\r\nname: new-skill\r\ndescription: "New"\r\nwhenToUse: "w"\r\ncustom-key: keep-me\r\n---\r\n\r\nnew body\r\n')
  })

  it('同名受管键只出现一次（不会既保留旧的又写新的）', () => {
    const once = '---\nname: old\ndescription: "old"\nname: older\n---\n\nbody\n'
    const text = rewriteSkillContent(once, input())
    expect(text.match(/^name:/gm)).toHaveLength(1)
    expect(text.match(/^description:/gm)).toHaveLength(1)
  })

  it('原本禁用的技能重新启用后策略位被移除', () => {
    const disabled = '---\nname: demo-skill\ndescription: "A demo skill"\ndisable-model-invocation: true\n---\n\nbody\n'
    const text = rewriteSkillContent(disabled, input({ content: 'body' }))
    expect(text).not.toContain('disable-model-invocation')
  })

  it('没有 frontmatter 的文件直接报错，不产出半个文件', () => {
    expect(() => rewriteSkillContent('# no frontmatter', input())).toThrowError('skill file has no frontmatter block')
  })
})

describe('rewriteSkillPolicy（启停策略位）', () => {
  const file = '---\nname: demo\ndescription: "d"\n---\n\nbody\n'

  it('停用时补两个策略位', () => {
    expect(rewriteSkillPolicy(file, false))
      .toBe('---\nname: demo\ndescription: "d"\ndisable-model-invocation: true\nuser-invocable: false\n---\n\nbody\n')
  })

  it('启用时只删策略位，其余键原样保留', () => {
    const disabled = rewriteSkillPolicy(file, false)
    expect(rewriteSkillPolicy(disabled, true)).toBe(file)
  })
})

describe('validateSkillInput / isSkillSourceEntry / rootView', () => {
  it('名字必须是 kebab-case，描述必填', () => {
    expect(validateSkillInput(input({ name: 'Bad Name' }))).toBe('name must be kebab-case (a-z, 0-9, dashes)')
    expect(validateSkillInput(input({ description: '   ' }))).toBe('description is required')
    expect(validateSkillInput(input())).toBeNull()
  })

  it('来源条目判定只认 id + roots', () => {
    expect(isSkillSourceEntry({ id: 'a', roots: [] })).toBe(true)
    expect(isSkillSourceEntry({ id: 'a' })).toBe(false)
    expect(isSkillSourceEntry(null)).toBe(false)
  })

  it('rootView 的 live 反映磁盘上目录是否存在', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-skill-root-'))
    dirs.push(dir)
    const entry = { id: 'local-1', kind: 'local' as const, label: 'local', roots: [dir] }
    expect(rootView(entry).live).toBe(true)
    expect(rootView({ ...entry, roots: [join(dir, 'missing')] }).live).toBe(false)
  })
})
