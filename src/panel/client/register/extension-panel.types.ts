export interface SessionListSnapshot {
  current?: string
  ids: string[]
}

export interface WorkspaceListItem {
  workspaceId?: string
  id?: string
  sessionIds?: readonly string[]
}

export interface WorkspaceListSnapshot {
  items?: WorkspaceListItem[]
  recentWorkspaceId?: string
}

/**
 * 「新建会话」的能力面（官方 `ctx.sessions.create`）。
 *
 * 只声明用到的成员：`create` 在 resolve 前就已把这一行发布到会话目录，所以拿到 id 之后
 * 可以立刻打开它、把草稿写进它的输入框——这正是技能创建器要的那一步。
 */
export interface SessionCreator {
  create: (options?: { workspaceId?: string, cwd?: string }) => Promise<unknown>
}
