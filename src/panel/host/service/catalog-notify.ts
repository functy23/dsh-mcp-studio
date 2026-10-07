/**
 * 技能目录变更的会话侧通知。
 *
 * 宿主侧改完技能（启停、新建、删除、加减来源、重挂 provider）之后，DSH 的技能目录缓存
 * 已经失效了，但**输入框 `/` 菜单**用的是客户端自己的缓存：
 * `@deepseek-ai/dsh-client-ui-skill` 把 `skills.list()` 的结果按 sessionId 存在
 * `Map` 里，只有两个入口能让它失效——
 *
 *   ctx.remote.$on("agent-preset/selected", invalidate)
 *   ctx.on("connection/reset", clearAll)
 *
 * 也就是说：**光重挂 provider 不够，还得再踢一下 `/` 菜单的缓存**，否则表现就是
 * 「面板里开关动了、技能目录也更新了，但输入框打 `/` 还搜得到刚禁用的技能」。
 *
 * 官方 `dsh-skills-manager` 用的正是这个办法（它的 `notifyChatCatalog()`）：
 * 先让 provider 失效，再 `emit("commands/change")`，并对每个会话补发一次
 * `agent-preset/selected`。两个事件都在 `@deepseek-ai/dsh-api-remotes` 的
 * `API_REMOTE_FORWARDED_EVENTS` 白名单里（`mode: 'emit'`），宿主侧 emit 会被转发到
 * 客户端，因此不需要改 DSH。
 *
 * 这里每一步都吞掉异常：通知是尽力而为的，失败只该留下旧列表，不该让写操作报 500。
 */
import type { HostContext } from '../../vendor/dsh-tauri/host/types/harness'

interface SessionLike {
  id?: string
  header?: { id?: string, agentPreset?: string | null }
}

/**
 * 让所有已打开会话的 `/` 菜单重新拉一次技能目录。
 *
 * `agent-preset/selected` 的载荷形状取自官方实现（`dsh-agent-preset-registry`）：
 * `ctx.emit("agent-preset/selected", session.id, preset)`。客户端的失效回调签名是
 * `invalidate(key)`，只取第一个参数，所以第二个参数只要是字符串即可——这里回发会话
 * 当前的 preset（拿不到就发空串，语义仍是「重选一次当前 preset」）。
 */
export function notifySkillCatalog(ctx: HostContext): void {
  if (typeof ctx.emit !== 'function')
    return
  tryEmit(ctx, 'commands/change')
  for (const session of listSessions(ctx)) {
    const id = session?.id ?? session?.header?.id
    if (typeof id !== 'string' || id === '')
      continue
    const preset = typeof session?.header?.agentPreset === 'string' ? session.header.agentPreset : ''
    tryEmit(ctx, 'agent-preset/selected', id, preset)
  }
}

// --- internal ---

/**
 * 读会话列表。
 *
 * **必须走 `ctx.get('sessions')`**：cordis 的属性访问带 inject 守卫——`reflect.ts` 的
 * `internal/get` 沿 fiber 祖先链找 `fiber.store[prop]`，找不到就抛
 * `cannot get property "..." without inject`；而本插件的 `inject` 里没有 `sessions`，
 * 直接写 `ctx.sessions` 会抛错，被吞掉之后一个会话都遍历不到，`/` 菜单就永远收不到刷新。
 * `ctx.get` 读的是 reflect 的全局 store，不要求 inject（cordis 源码原话：
 * "Read a service from the store without the inject requirement"）。
 */
function listSessions(ctx: HostContext): SessionLike[] {
  let sessions: unknown
  try {
    sessions = (ctx as unknown as { get: (name: string) => unknown }).get('sessions')
  }
  catch {
    return []
  }
  const list = (sessions as { list?: () => unknown } | undefined)?.list
  if (typeof list !== 'function')
    return []
  try {
    const value = list.call(sessions)
    return Array.isArray(value) ? value as SessionLike[] : []
  }
  catch {
    return []
  }
}

function tryEmit(ctx: HostContext, event: string, ...args: unknown[]): void {
  try {
    ;(ctx.emit as (name: string, ...rest: unknown[]) => unknown).call(ctx, event, ...args)
  }
  catch {
    // 事件监听器抛错不影响本次写操作的结果
  }
}
