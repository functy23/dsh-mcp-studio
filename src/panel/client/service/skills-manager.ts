import type { ClientContext } from 'dsh-tauri/client'
import type { SkillsManagerFace } from './skills-manager.types'
import { SKILLS_MANAGER_SERVICE_NAME } from '../constants'

/**
 * client/service/skills-manager.ts — 读 dsh-skills-manager 发布的嵌入面。
 *
 * 判据与 readMarket 完全同构（能力探测、渲染时探测、异常静默），那边有逐条理由，
 * 这里只补一条差异：**没有 face 时本插件连对方自己的设置页入口都不碰**，
 * skills-manager 退回原生形态（设置 → 技能），用户不会被藏掉入口后找不到功能。
 */

export function readSkillsManager(ctx: ClientContext): SkillsManagerFace | undefined {
  const reflect = ctx?.reflect
  if (reflect === undefined || typeof reflect.get !== 'function')
    return undefined
  let service: unknown
  try {
    service = reflect.get(SKILLS_MANAGER_SERVICE_NAME)
  }
  catch {
    return undefined
  }
  if (service === null || service === undefined)
    return undefined
  return typeof (service as SkillsManagerFace).render === 'function' ? service as SkillsManagerFace : undefined
}
