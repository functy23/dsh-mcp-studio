import type { ClientContext, PanelHandle } from 'dsh-tauri/client'
import { Icon, PanelPage, Puzzle } from 'dsh-tauri-ui/client'
import { definePanel, defineRegister } from 'dsh-tauri/client'
import { ExtensionPanel } from '../components/extension-panel'
import { MARKET_SERVICE_NAME, PANEL_ACTION_ORDER, PANEL_ID } from '../constants'
import { locale } from '../locales'
import { readMarket } from '../service/market'
import { store } from '../store'
import { chooseWorkspace, createSkillSession, sessionSnapshotOf, workspaceSnapshotOf } from './extension-panel.utils'

export const extensionPanelFeature = defineRegister<ClientContext>((controller, ctx, adapter) => {
  let panel: PanelHandle | undefined

  // 市场收进本插槽后，它自带的设置页入口就是重复入口，撤下它；撤下前记住原状态，
  // 服务被撤下或本插件卸载时由 inject 返回的 disposer 还原。服务由另一个客户端插件
  // 发布，apply 顺序不保证，所以用 inject 等它到位。
  // 没有 render 的旧版（1.47.0）readMarket 会返回 undefined，这里直接 return，
  // 不会藏掉设置页入口。
  ctx.inject([MARKET_SERVICE_NAME], () => {
    const face = readMarket(ctx)
    if (face === undefined)
      return
    const restore = face.settingsVisible()
    face.setSettingsVisible(false)
    return () => face.setSettingsVisible(restore)
  })

  // 「新建技能」＝在**当前目录**（当前会话所属工作区）开一条新对话，再把 `/skill-creator `
  // 预填进那条会话的输入框：预填组件注册在每个会话输入框上，按 sessionId 认领草稿
  // （见 `skill-creator-prefill` 的 `inject: (sessionId) => ({ sessionId })`）。
  //
  // 上游只有「工作区 → connectWorkspace 开新会话」一条链路；0.1.7 起导航搬到 `uiWorkspace`，
  // 官方「在当前目录新建对话」的入口变成 `sessions.create({ workspaceId })`（适配层把
  // `uiWorkspace.connectWorkspace` 投影回 `workspaces`，留作退级第二级）。
  // 三级都拿不到会话时不再静默复用：把实际服务面打到控制台并报错，便于一次定位。
  const createSkill = async (): Promise<void> => {
    const sessionSnapshot = adapter.sessions.list?.getSnapshot()
    const workspaceId = chooseWorkspace(
      sessionSnapshotOf(sessionSnapshot),
      workspaceSnapshotOf(adapter.workspaces.list?.getSnapshot()),
    )
    const sessionId = await createSkillSession(
      { sessions: adapter.sessions, connectWorkspace: adapter.workspaces.connectWorkspace },
      workspaceId,
      sessionSnapshot,
    )
    if (sessionId === undefined) {
      console.warn('[dsh-mcp-studio] createSkill: no session available', {
        sessions: adapter.sessions?.list?.getSnapshot?.(),
        workspaces: adapter.workspaces?.list?.getSnapshot?.(),
      })
      throw new Error(locale.text('workspaceUnavailable'))
    }
    store.prefill.add(sessionId)
    panel?.close()
    adapter.openSession(sessionId)
  }

  panel = definePanel(ctx, {
    id: PANEL_ID,
    order: PANEL_ACTION_ORDER,
    locale: locale.NS,
    label: () => locale.text('extension'),
    icon: props => <Icon as={Puzzle} size={props.size} />,
    render: () => (
      <PanelPage>
        <ExtensionPanel createSkill={createSkill} market={readMarket(ctx)} />
      </PanelPage>
    ),
  })
  controller.add(panel.dispose)
})
