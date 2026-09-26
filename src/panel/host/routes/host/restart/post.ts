import type { RestartOutcome } from '../../../service/restart.types'
import { defineEventHandler } from 'dsh-tauri'
import { restart } from '../../../service/restart'

export default defineEventHandler((event) => {
  const headers = event.req.headers
  const origin = headers.get('origin')
  const host = headers.get('host')
  let sameOrigin = false
  if (origin !== null && host !== null) {
    try {
      const parsed = new URL(origin)
      sameOrigin = (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
    }
    catch {
      sameOrigin = false
    }
  }
  const forwarded = headers.has('forwarded') || headers.has('x-forwarded-for') || headers.has('x-real-ip')
  if (!sameOrigin || forwarded) {
    event.res.status = 403
    return { error: 'untrusted origin' }
  }
  const outcome = restart.start()
  if (outcome.owned) {
    event.res.status = 409
    return { error: 'restart is owned by the desktop shell' }
  }
  // tsconfig 关掉了 strict（上游代码宽松）：strictNullChecks 关闭时 TS 不按 boolean 字面量
  // 判别式收窄可辨识联合，上面那层 outcome.owned 的守卫在编译期不算数，所以显式取这一支。
  const launched = outcome as Extract<RestartOutcome, { owned: false }>
  return { ok: true, pid: launched.pid, replacementPid: launched.replacementPid, logOut: launched.logOut }
})
