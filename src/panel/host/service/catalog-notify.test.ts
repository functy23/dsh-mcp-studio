/**
 * 技能目录变更通知的契约。
 *
 * 为什么值得写：输入框 `/` 菜单用的是客户端自己的 per-session 缓存，官方只给了两个失效
 * 入口（`agent-preset/selected` 与 `connection/reset`）。所以宿主侧改完技能之后必须
 * 补发事件，否则「面板里开关动了、但 `/` 还搜得到刚禁用的技能」。这组用例把「发什么
 * 事件、按什么载荷、怎么读会话」钉住——正是官方 `dsh-skills-manager` 的
 * `notifyChatCatalog` 用法。
 *
 * 最后一组用例是回归护栏：**读会话必须走 `ctx.get('sessions')`**。cordis 的属性访问带
 * inject 守卫（本插件没 inject `sessions`，属性访问会抛 `cannot get property ... without
 * inject`），一旦退回属性访问，就会静默遍历到 0 个会话、`/` 菜单再也不刷新——这个 bug
 * 真的发生过（用真实 cordis 4.0.4 复刻拓扑验证过）。
 */
import { describe, expect, it, vi } from 'vitest'
import { notifySkillCatalog } from './catalog-notify'

interface FakeCtx {
  emit: ReturnType<typeof vi.fn>
  get?: (name: string) => unknown
}

function ctxWith(sessions: unknown): FakeCtx {
  const emit = vi.fn()
  return { emit, get: (name: string) => (name === 'sessions' ? { list: () => sessions } : undefined) } as FakeCtx
}

describe('notifySkillCatalog', () => {
  it('始终发出 commands/change', () => {
    const ctx = ctxWith([])
    notifySkillCatalog(ctx as never)
    expect(ctx.emit).toHaveBeenCalledWith('commands/change')
  })

  it('对每个会话补发 agent-preset/selected，载荷是 (sessionId, preset)', () => {
    const ctx = ctxWith([
      { id: 's1', header: { agentPreset: 'default' } },
      { id: 's2', header: { agentPreset: 'build' } },
    ])
    notifySkillCatalog(ctx as never)
    expect(ctx.emit).toHaveBeenCalledWith('agent-preset/selected', 's1', 'default')
    expect(ctx.emit).toHaveBeenCalledWith('agent-preset/selected', 's2', 'build')
  })

  it('会话没有 preset 也照发（客户端失效只用第一个参数，preset 用空串占位）', () => {
    const ctx = ctxWith([{ id: 's4', header: {} }, { id: 's5' }])
    notifySkillCatalog(ctx as never)
    expect(ctx.emit).toHaveBeenCalledWith('agent-preset/selected', 's4', '')
    expect(ctx.emit).toHaveBeenCalledWith('agent-preset/selected', 's5', '')
  })

  it('没有 id 的会话跳过', () => {
    const ctx = ctxWith([{ header: { agentPreset: 'default' } }, { id: '' }])
    notifySkillCatalog(ctx as never)
    const presetEvents = ctx.emit.mock.calls.filter(call => call[0] === 'agent-preset/selected')
    expect(presetEvents).toHaveLength(0)
  })

  it('sessions 缺失或 list 抛错时不崩，只发 commands/change', () => {
    const noSessions = { emit: vi.fn() } as unknown as FakeCtx
    expect(() => notifySkillCatalog(noSessions as never)).not.toThrow()
    expect(noSessions.emit).toHaveBeenCalledWith('commands/change')

    const throwing = { emit: vi.fn(), get: () => ({ list: () => { throw new Error('boom') } }) } as unknown as FakeCtx
    expect(() => notifySkillCatalog(throwing as never)).not.toThrow()
    expect(throwing.emit).toHaveBeenCalledTimes(1)
  })

  it('监听器抛错被吞掉，不影响调用方', () => {
    const ctx = ctxWith([{ id: 's6', header: { agentPreset: 'default' } }])
    ctx.emit.mockImplementation((name: string) => {
      if (name === 'agent-preset/selected')
        throw new Error('listener boom')
    })
    expect(() => notifySkillCatalog(ctx as never)).not.toThrow()
  })

  // --- 回归护栏：读会话必须走 ctx.get ---

  it('走 ctx.get("sessions")，属性访问抛错也能拿到会话', () => {
    const emit = vi.fn()
    const ctx = {
      emit,
      get: (name: string) => (name === 'sessions' ? { list: () => [{ id: 's7', header: { agentPreset: 'default' } }] } : undefined),
      // 复刻 cordis 的 inject 守卫：本插件没 inject sessions，属性访问会抛
      get sessions(): never {
        throw new Error('cannot get property "sessions" without inject')
      },
    }
    notifySkillCatalog(ctx as never)
    expect(emit).toHaveBeenCalledWith('agent-preset/selected', 's7', 'default')
  })
})
