import type { EventHandlerRequest } from 'dsh-tauri'
import type { ActionResult, ExtensionRouteDeps, SkillDeleteBody } from '../index.types'
import { defineEventHandler, dshRouteDepsOf, readBody } from 'dsh-tauri'
import { skills } from '../../service/skills'

export default defineEventHandler<EventHandlerRequest, Promise<ActionResult | { error: string }>>(async (event) => {
  const body = await readBody<SkillDeleteBody>(event, { type: 'json' })
  const name = typeof body?.name === 'string' ? body.name : ''
  try {
    if (!skills.remove(name)) {
      event.res.status = 404
      return { error: 'skill not found' }
    }
    // 同步刷新宿主技能目录与客户端 `/` 菜单缓存，否则删掉的技能还留在 `/` 里。
    await dshRouteDepsOf<ExtensionRouteDeps>(event)?.remountProvider()
    return { ok: true, name }
  }
  catch (error) {
    event.res.status = 500
    return { error: error instanceof Error ? error.message : String(error) }
  }
})
