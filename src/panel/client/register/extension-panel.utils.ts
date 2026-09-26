import type { SessionListSnapshot, WorkspaceListItem, WorkspaceListSnapshot } from './extension-panel.types'

function workspaceId(item: WorkspaceListItem): string | undefined {
  return item.workspaceId ?? item.id
}

export function sessionSnapshotOf(value: unknown): SessionListSnapshot {
  if (typeof value !== 'object' || value === null)
    return { ids: [] }
  const snapshot = value as Record<string, unknown>
  return {
    ...(typeof snapshot.current === 'string' ? { current: snapshot.current } : {}),
    ids: Array.isArray(snapshot.ids) ? snapshot.ids.filter((id): id is string => typeof id === 'string') : [],
  }
}

export function workspaceSnapshotOf(value: unknown): WorkspaceListSnapshot {
  if (typeof value !== 'object' || value === null)
    return {}
  const snapshot = value as Record<string, unknown>
  const items = Array.isArray(snapshot.items)
    ? snapshot.items.filter((item: unknown): item is WorkspaceListItem => typeof item === 'object' && item !== null)
    : undefined
  return {
    ...(items !== undefined ? { items } : {}),
    ...(typeof snapshot.recentWorkspaceId === 'string' ? { recentWorkspaceId: snapshot.recentWorkspaceId } : {}),
  }
}

/**
 * 从会话列表快照里尽力取一个可用会话 id。
 *
 * 核心各代的字段名不一致：旧版把当前会话放在 `current`，新版由 `uiSession.adapter.current`
 * 投影补回，部分布局只暴露 `ids` 列表。技能创建器只需要「一个能承载预填的会话」，
 * 所以按优先级逐个候选，最后退回列表末项（最近活跃）。
 */
export function pickSessionId(snapshot: unknown): string | undefined {
  if (typeof snapshot !== 'object' || snapshot === null)
    return undefined
  const record = snapshot as Record<string, unknown>
  for (const key of ['current', 'currentSessionId', 'activeSessionId', 'selectedSessionId', 'recentSessionId', 'lastSessionId']) {
    const value = record[key]
    if (typeof value === 'string' && value !== '')
      return value
  }
  if (Array.isArray(record.ids)) {
    const ids = record.ids.filter((id): id is string => typeof id === 'string' && id !== '')
    if (ids.length > 0)
      return ids[ids.length - 1]
  }
  return undefined
}

export function chooseWorkspace(
  sessions: SessionListSnapshot,
  workspaces: WorkspaceListSnapshot,
): string | undefined {
  const items = workspaces.items ?? []
  const current = sessions.current
  const currentItem = current === undefined
    ? undefined
    : items.find(item => item.sessionIds?.includes(current))
  const currentId = currentItem === undefined ? undefined : workspaceId(currentItem)
  if (currentId !== undefined)
    return currentId
  if (workspaces.recentWorkspaceId !== undefined && items.some(item => workspaceId(item) === workspaces.recentWorkspaceId))
    return workspaces.recentWorkspaceId
  return items.map(workspaceId).find((id): id is string => id !== undefined)
}
