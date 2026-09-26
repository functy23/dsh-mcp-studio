import type { EventHandlerRequest } from 'dsh-tauri'
import type { ActionResult, ExtensionRouteDeps, RootRemoveBody } from '../index.types'
import { defineEventHandler, dshRouteDepsOf, readBody } from 'dsh-tauri'
import { rmtree } from '../../service/rmtree'
import { skills } from '../../service/skills'

export default defineEventHandler<EventHandlerRequest, Promise<ActionResult | { error: string }>>(async (event) => {
  const body = await readBody<RootRemoveBody>(event, { type: 'json' })
  if (typeof body?.id !== 'string') {
    event.res.status = 400
    return { error: 'id is required' }
  }
  const id = body.id
  try {
    const removed = await skills.removeSource(id)
    if (removed === null) {
      event.res.status = 404
      return { error: 'repository not found' }
    }
    await dshRouteDepsOf<ExtensionRouteDeps>(event)!.remountProvider()
    if (removed.materialDir !== undefined)
      rmtree.remove(removed.materialDir)
    return { ok: true }
  }
  catch (error) {
    event.res.status = 500
    return { error: error instanceof Error ? error.message : String(error) }
  }
})
