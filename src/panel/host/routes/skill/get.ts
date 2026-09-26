import type { EventHandlerRequest } from 'dsh-tauri'
import type { SkillContentResponse } from '../index.types'
import { defineEventHandler, getQuery } from 'dsh-tauri'
import { skills } from '../../service/skills'

export default defineEventHandler<EventHandlerRequest, Promise<SkillContentResponse | { error: string }>>(async (event) => {
  const query = getQuery(event) as { name?: unknown }
  const name = typeof query.name === 'string' ? query.name : ''
  try {
    const definition = await skills.get(name)
    if (definition === null) {
      event.res.status = 404
      return { error: 'skill not found' }
    }
    return { name: definition.name, content: definition.content }
  }
  catch (error) {
    event.res.status = 500
    return { error: error instanceof Error ? error.message : String(error) }
  }
})
