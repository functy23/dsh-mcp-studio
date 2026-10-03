import { describe, expect, it, vi } from 'vitest'
import {
  chooseWorkspace,
  createSkillSession,
  currentSessionIdOf,
  lastSessionIdOf,
  pickSessionId,
  sessionCreatorOf,
  sessionCwdOf,
  sessionSnapshotOf,
  workspaceSnapshotOf,
} from './extension-panel.utils'

describe('currentSessionIdOf', () => {
  it('reads the projected current id', () => {
    expect(currentSessionIdOf({ current: 's-1', ids: ['s-1', 's-2'] })).toBe('s-1')
  })

  it('accepts the alias keys some layouts expose', () => {
    expect(currentSessionIdOf({ activeSessionId: 's-2' })).toBe('s-2')
  })

  it('stays undefined without a selection instead of guessing the last row', () => {
    expect(currentSessionIdOf({ ids: ['s-1', 's-2'] })).toBeUndefined()
    expect(currentSessionIdOf({ current: '' })).toBeUndefined()
    expect(currentSessionIdOf(null)).toBeUndefined()
  })
})

describe('lastSessionIdOf', () => {
  it('takes the most recently active row', () => {
    expect(lastSessionIdOf({ ids: ['s-1', 's-2'] })).toBe('s-2')
  })

  it('ignores empty ids and non-list snapshots', () => {
    expect(lastSessionIdOf({ ids: ['s-1', ''] })).toBe('s-1')
    expect(lastSessionIdOf({ ids: [] })).toBeUndefined()
    expect(lastSessionIdOf({ ids: 's-1' })).toBeUndefined()
  })
})

describe('pickSessionId', () => {
  it('prefers the selection, then the most recent row', () => {
    expect(pickSessionId({ current: 's-1', ids: ['s-2', 's-1'] })).toBe('s-1')
    expect(pickSessionId({ ids: ['s-2', 's-1'] })).toBe('s-1')
    expect(pickSessionId({ ids: [] })).toBeUndefined()
  })
})

describe('sessionCreatorOf', () => {
  it('probes the official create member', () => {
    const sessions = { create: vi.fn() }
    expect(sessionCreatorOf(sessions)).toBe(sessions)
  })

  it('reports absence instead of handing back a non-callable service', () => {
    expect(sessionCreatorOf({ list: {} })).toBeUndefined()
    expect(sessionCreatorOf(null)).toBeUndefined()
    expect(sessionCreatorOf('sessions')).toBeUndefined()
  })
})

describe('sessionCwdOf', () => {
  it('reads the directory of the given session row', () => {
    const snapshot = { ids: ['s-1'], byId: { 's-1': { cwd: '/work/dir', blank: false } } }
    expect(sessionCwdOf(snapshot, 's-1')).toBe('/work/dir')
  })

  it('stays undefined without a row, a cwd, or an id', () => {
    expect(sessionCwdOf({ byId: {} }, 's-1')).toBeUndefined()
    expect(sessionCwdOf({ byId: { 's-1': { blank: true } } }, 's-1')).toBeUndefined()
    expect(sessionCwdOf({ byId: { 's-1': { cwd: '' } } }, 's-1')).toBeUndefined()
    expect(sessionCwdOf({ byId: { 's-1': { cwd: '/w' } } }, undefined)).toBeUndefined()
    expect(sessionCwdOf(null, 's-1')).toBeUndefined()
  })
})

describe('createSkillSession', () => {
  it('creates a new session inside the current workspace instead of reusing the active one', async () => {
    const create = vi.fn(async () => 's-new')
    const connectWorkspace = vi.fn(async () => 's-connected')
    const sessionId = await createSkillSession(
      { sessions: { create }, connectWorkspace },
      'ws-1',
      { current: 's-active', ids: ['s-active'] },
    )
    expect(sessionId).toBe('s-new')
    expect(create).toHaveBeenCalledWith({ workspaceId: 'ws-1' })
    expect(connectWorkspace).not.toHaveBeenCalled()
  })

  it('falls back to connectWorkspace on cores without sessions.create', async () => {
    const connectWorkspace = vi.fn(async () => 's-connected')
    const sessionId = await createSkillSession(
      { sessions: { list: {} }, connectWorkspace },
      'ws-1',
      { current: 's-active' },
    )
    expect(sessionId).toBe('s-connected')
    expect(connectWorkspace).toHaveBeenCalledWith('ws-1')
  })

  it('falls through an empty id from either official entry', async () => {
    const create = vi.fn(async () => '')
    const connectWorkspace = vi.fn(async () => '')
    const sessionId = await createSkillSession(
      { sessions: { create }, connectWorkspace },
      'ws-1',
      { current: 's-active' },
    )
    expect(sessionId).toBe('s-active')
  })

  it('creates in the current directory when the session belongs to no workspace', async () => {
    const create = vi.fn(async () => 's-new')
    const sessionId = await createSkillSession(
      { sessions: { create } },
      undefined,
      { current: 's-ungrouped', ids: ['s-ungrouped'], byId: { 's-ungrouped': { cwd: '/work/dir' } } },
    )
    expect(sessionId).toBe('s-new')
    expect(create).toHaveBeenCalledWith({ cwd: '/work/dir' })
  })

  it('reuses the active session only when neither a workspace nor a cwd is resolvable', async () => {
    const create = vi.fn(async () => 's-new')
    const sessionId = await createSkillSession(
      { sessions: { create } },
      undefined,
      { current: 's-active', ids: ['s-active'] },
    )
    expect(sessionId).toBe('s-active')
    expect(create).not.toHaveBeenCalled()
  })

  it('surfaces an official create failure instead of silently reusing the conversation', async () => {
    const create = vi.fn(async () => { throw new Error('workspace/not-found') })
    await expect(
      createSkillSession({ sessions: { create } }, 'ws-1', { current: 's-active' }),
    ).rejects.toThrow('workspace/not-found')
  })

  it('reports unavailable when nothing can host the draft', async () => {
    expect(await createSkillSession({}, undefined, { ids: [] })).toBeUndefined()
  })
})

describe('chooseWorkspace', () => {
  const sessions = sessionSnapshotOf({ current: 's-1', ids: ['s-1'] })

  it('picks the workspace that owns the current session', () => {
    const workspaces = workspaceSnapshotOf({
      items: [
        { workspaceId: 'ws-a', sessionIds: ['s-9'] },
        { workspaceId: 'ws-b', sessionIds: ['s-1'] },
      ],
    })
    expect(chooseWorkspace(sessions, workspaces)).toBe('ws-b')
  })

  it('falls back to the recent workspace, then to the first row', () => {
    const items = [
      { workspaceId: 'ws-a', sessionIds: [] },
      { workspaceId: 'ws-b', sessionIds: [] },
    ]
    expect(chooseWorkspace(sessions, workspaceSnapshotOf({ items, recentWorkspaceId: 'ws-b' }))).toBe('ws-b')
    expect(chooseWorkspace(sessions, workspaceSnapshotOf({ items }))).toBe('ws-a')
  })

  it('returns undefined without any workspace row', () => {
    expect(chooseWorkspace(sessions, workspaceSnapshotOf({}))).toBeUndefined()
    expect(chooseWorkspace(sessions, workspaceSnapshotOf(null))).toBeUndefined()
  })

  it('accepts the legacy id field', () => {
    const workspaces = workspaceSnapshotOf({ items: [{ id: 'ws-legacy', sessionIds: ['s-1'] }] })
    expect(chooseWorkspace(sessions, workspaces)).toBe('ws-legacy')
  })
})
