import type { HostContext } from 'dsh-tauri'
import type { Config } from './apply.types'
import type { PanelExtensionHost } from './types'
import { PLUGIN_ID } from '../shared/constants'
import { packagedSkillsDir } from './config/constants'
import { clearHostRuntime, resetProviderRuntime, setCurrentHostInstance } from './config/runtime'
import { routes } from './routes'
import { notifySkillCatalog } from './service/catalog-notify'
import { profile } from './service/profile'
import { provider } from './service/provider'

const DEFAULT_PROFILE = 'web'

export type { Config } from './apply.types'

export const name = PLUGIN_ID

export const inject = ['webServer', 'skills', 'connection']

export { loadFilesystemSkillPlugin } from './service/provider.utils'
export { packagedSkillsDir } from './config/constants'

export function apply(ctx: HostContext, config?: Config): void {
  ctx.inject(inject, (hostCtx) => {
    setCurrentHostInstance(hostCtx as unknown as PanelExtensionHost)
    resetProviderRuntime()
    // 重挂 provider 只让 DSH 的技能目录缓存失效；输入框 `/` 菜单还有自己的
    // per-session 缓存，必须再发一次官方转发事件才会重新拉。两件事一起做。
    const remountProvider = async (): Promise<void> => {
      await provider.start(packagedSkillsDir())
      notifySkillCatalog(hostCtx as unknown as HostContext)
    }
    const profileDirPath = profile.peek(config?.profile ?? profile.resolve() ?? DEFAULT_PROFILE)
    ctx.effect(() => startProvider(remountProvider), 'dsh-mcp-studio: skill provider')
    ctx.effect(
      () => routes(hostCtx as unknown as HostContext, { profileDirPath, remountProvider }),
      'dsh-mcp-studio: routes',
    )
    return clearHostRuntime
  })
}

function startProvider(remountProvider: () => Promise<void>): () => void {
  void remountProvider()
  return clearHostRuntime
}
