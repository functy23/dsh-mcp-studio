import type { ReactElement } from 'react'

/** `skillsManager.render()` 入参：宿主可注入自己的会话快照（缺省时对方读宿主 `sessions`）。 */
export interface SkillsManagerRenderProps {
  snapshot?: unknown
}

/**
 * `@michengai/dsh-skills-manager` 经 `ctx.provide('skillsManager', …)` 发布的宿主接入面。
 *
 * 能力判据与 MarketFace 一样是 `render`（不是 version）：旧版没有这个服务，
 * 装了也收不进面板，此时本插件连对方设置页入口都不该碰。
 */
export interface SkillsManagerFace {
  version: number
  render: (props?: SkillsManagerRenderProps) => ReactElement
  setSettingsVisible: (visible: boolean) => void
  settingsVisible: () => boolean
}
