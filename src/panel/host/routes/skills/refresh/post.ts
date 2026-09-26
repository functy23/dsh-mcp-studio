import type { EventHandlerRequest } from 'dsh-tauri'
import type { ExtensionRouteDeps, SkillsResponse } from '../../index.types'
import { defineEventHandler, dshRouteDepsOf } from 'dsh-tauri'
import { skills } from '../../../service/skills'

export default defineEventHandler<EventHandlerRequest, Promise<SkillsResponse | { error: string }>>(async (event) => {
  try {
    await dshRouteDepsOf<ExtensionRouteDeps>(event)!.remountProvider()
    return { skills: await skills.getCatalog() }
  }
  catch (error) {
    event.res.status = 500
    return { error: error instanceof Error ? error.message : String(error) }
  }
})
