import type { ConversationInputLeftProps } from './skill-creator-prefill.types'
import { useEffect } from 'react'
import { useStore } from 'dsh-tauri/client'
import { SKILL_CREATOR_DRAFT } from '../constants'
import { store } from '../store'

export function SkillCreatorPrefill({ sessionId, inputActions }: ConversationInputLeftProps): null {
  // 订阅 pending 列表：从面板点「新建技能」时复用的可能就是当前**已挂载**的会话，
  // 依赖里若只有 [inputActions, sessionId]，effect 不会重跑、草稿写不进去。
  // 上游靠 connectWorkspace 开新会话天然触发挂载，新版核心没有该能力（见
  // register/extension-panel.tsx 的 createSkill），所以这里补上订阅。
  const { pendingSessionIds } = useStore(store.prefill)
  useEffect(() => {
    if (!store.prefill.consume(sessionId))
      return
    inputActions.setDraft(SKILL_CREATOR_DRAFT)
  }, [inputActions, sessionId, pendingSessionIds])
  return null
}
