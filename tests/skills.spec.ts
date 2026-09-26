import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isUserLevel, levelOf, parseSkillFile } from '../src/host/skills'

describe('levelOf', () => {
  it('maps sources to human buckets', () => {
    assert.equal(levelOf('project-dsh', 'filesystem'), '项目级')
    assert.equal(levelOf('runtime', 'register'), '运行时')
    assert.equal(levelOf('user-dsh', 'filesystem'), '用户级')
    assert.equal(levelOf('bundled', 'filesystem'), '内置')
    assert.equal(levelOf('custom', 'filesystem'), '自定义')
    assert.equal(levelOf('custom', 'superpowers-dsh'), '插件自带')
    assert.equal(levelOf(undefined, undefined), '插件自带')
  })
})

describe('isUserLevel', () => {
  it('detects user-level sources', () => {
    assert.equal(isUserLevel('user-dsh'), true)
    assert.equal(isUserLevel('user-agents'), true)
    assert.equal(isUserLevel('project-dsh'), false)
  })
})

describe('parseSkillFile', () => {
  it('parses name and description', () => {
    const parsed = parseSkillFile('---\nname: my-skill\ndescription: Does things\n---\n\nBody')
    assert.deepEqual(parsed, { name: 'my-skill', description: 'Does things' })
  })

  it('strips quotes', () => {
    const parsed = parseSkillFile('---\nname: "quoted"\ndescription: \'single\'\n---\n')
    assert.deepEqual(parsed, { name: 'quoted', description: 'single' })
  })

  it('rejects files without frontmatter', () => {
    assert.equal(parseSkillFile('# no frontmatter'), null)
  })

  it('rejects empty names or descriptions', () => {
    assert.equal(parseSkillFile('---\nname: x\n---\n'), null)
    assert.equal(parseSkillFile('---\ndescription: y\n---\n'), null)
  })
})
