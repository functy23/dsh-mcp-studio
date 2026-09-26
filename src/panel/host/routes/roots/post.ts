import type { EventHandlerRequest } from 'dsh-tauri'
import type { ExtensionRouteDeps, RootAddBody, RootAddResponse } from '../index.types'
import { defineEventHandler, dshRouteDepsOf, readBody } from 'dsh-tauri'
import { repos } from '../../service/repos'
import { rootView } from '../../service/skills.utils'

export default defineEventHandler<EventHandlerRequest, Promise<RootAddResponse | { error: string }>>(async (event) => {
  const body = await readBody<RootAddBody>(event, { type: 'json' })
  if (body?.kind !== 'local' && body?.kind !== 'git') {
    event.res.status = 400
    return { error: 'kind must be local or git' }
  }
  const kind = body.kind
  try {
    const entry = kind === 'local'
      ? typeof body.path === 'string' && body.path.trim() !== ''
        ? await repos.create(body.path)
        : undefined
      : typeof body.url === 'string' && body.url.trim() !== ''
        ? await repos.import(body.url)
        : undefined
    if (entry === undefined) {
      event.res.status = 400
      return { error: kind === 'local' ? 'path is required' : 'url is required' }
    }
    await dshRouteDepsOf<ExtensionRouteDeps>(event)!.remountProvider()
    return { ok: true, root: rootView(entry) }
  }
  catch (error) {
    event.res.status = 400
    return { error: error instanceof Error ? error.message : String(error) }
  }
})
