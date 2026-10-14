import type { ReactElement } from 'react'
import type { SkillsManagerFace } from '../service/skills-manager.types'

export interface SkillsManagerTabProps {
  manager: SkillsManagerFace
}

/**
 * 技能管理 tab：渲染 `skillsManager.render()` 交出的整份管理界面。
 *
 * 与 MarketTab 同一机制——对方的 client bundle 与本插件共用宿主 module table
 * 解析出的同一个 React 实例，所以它的 element（含 antd 树、portal 到 body 的弹层）
 * 挂进面板树任何位置都正常工作，本插件不理解也不需要理解它的内部结构。
 */
export function SkillsManagerTab({ manager }: SkillsManagerTabProps): ReactElement {
  return <>{manager.render()}</>
}
