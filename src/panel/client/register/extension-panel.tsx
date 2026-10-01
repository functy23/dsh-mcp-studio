import type { ClientContext, PanelHandle } from 'dsh-tauri/client'
import { Icon, PanelPage, Puzzle } from 'dsh-tauri-ui/client'
import { definePanel, defineRegister } from 'dsh-tauri/client'
import { ExtensionPanel } from '../components/extension-panel'
import { MARKET_SERVICE_NAME, PANEL_ACTION_ORDER, PANEL_ID } from '../constants'
import { locale } from '../locales'
import { readMarket } from '../service/market'
import { store } from '../store'
import { chooseWorkspace, pickSessionId, sessionSnapshotOf, workspaceSnapshotOf } from './extension-panel.utils'

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

  // 技能创建器只需要一个有会话承载的预填：预填组件注册在每个会话输入框上
  // （见 `skill-creator-prefill` 的 `inject: (sessionId) => ({ sessionId })`）。
  //
  // 上游只走「工作区 → connectWorkspace 开新会话」一条链路，但新版核心把导航能力从
  // `workspaces` 上移走（没有 `connectWorkspace` / `startSession`），于是在 DSH Web /
  // Desktop 上必然报「没有可用工作区」。这里改为优先复用活跃会话，只有拿不到任何会话时
  // 才回退上游链路；`sessions.open` 同样按能力可选调用。
  const createSkill = async (): Promise<void> => {
    const sessions = sessionSnapshotOf(adapter.sessions.list?.getSnapshot())
    let sessionId = pickSessionId(adapter.sessions.list?.getSnapshot())
    if (sessionId === undefined) {
      const id = chooseWorkspace(sessions, workspaceSnapshotOf(adapter.workspaces.list?.getSnapshot()))
      if (id !== undefined) {
        const connected = await adapter.workspaces.connectWorkspace?.(id)
        if (typeof connected === 'string' && connected !== '')
          sessionId = connected
      }
    }
    if (sessionId === undefined) {
      // 拿不到任何会话时把实际服务面打到控制台：核心布局各代不同，便于一次定位。
      console.warn('[dsh-mcp-studio] createSkill: no session available', {
        sessions: adapter.sessions?.list?.getSnapshot?.(),
        workspaces: adapter.workspaces?.list?.getSnapshot?.(),
      })
      throw new Error(locale.text('workspaceUnavailable'))
    }
    store.prefill.add(sessionId)
    panel?.close()
    adapter.sessions.open?.(sessionId)
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
