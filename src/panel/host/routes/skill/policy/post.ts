import type { EventHandlerRequest } from 'dsh-tauri'
import type { ActionResult, ExtensionRouteDeps, SkillPolicyBody } from '../../index.types'
import { defineEventHandler, dshRouteDepsOf, readBody } from 'dsh-tauri'
import { skills } from '../../../service/skills'

export default defineEventHandler<EventHandlerRequest, Promise<ActionResult | { error: string }>>(async (event) => {
  const body = await readBody<SkillPolicyBody>(event, { type: 'json' })
  if (typeof body?.name !== 'string' || typeof body?.enabled !== 'boolean') {
    event.res.status = 400
    return { error: 'name and enabled are required' }
  }
  const name = body.name
  const enabled = body.enabled
  try {
    const definition = await skills.get(name)
    if (definition === null) {
      event.res.status = 404
      return { error: 'skill not found' }
    }
    if (definition.path === undefined) {
      event.res.status = 422
      return { error: 'skill has no file on disk (runtime-registered)' }
    }
    skills.setPolicy(definition.path, enabled)
    // 策略位写在 SKILL.md 里，但技能目录有缓存；不重挂 provider 的话客户端会一直拿到
    // 旧的 invocation（表现为「点了开关不动、要重启 DSH 才生效」）。重挂会让 DSH 的目录
    // 缓存失效，下一次读取重新问所有 provider，于是这一步是即时的。
    await dshRouteDepsOf<ExtensionRouteDeps>(event)?.remountProvider()
    return { ok: true }
  }
  catch (error) {
    event.res.status = 500
    return { error: error instanceof Error ? error.message : String(error) }
  }
})
