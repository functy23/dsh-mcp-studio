import type { HostContext } from 'dsh-tauri'
import type { Config } from './apply.types'
import type { PanelExtensionHost } from './types'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import { PLUGIN_ID } from '../shared/constants'
import { clearHostRuntime, resetProviderRuntime, setCurrentHostInstance } from './config/runtime'
import { routes } from './routes'
import { profile } from './service/profile'
import { provider } from './service/provider'

const DEFAULT_PROFILE = 'web'

export type { Config } from './apply.types'

export const name = PLUGIN_ID

export const inject = ['webServer', 'skills', 'connection']

export { loadFilesystemSkillPlugin } from './service/provider.utils'

export function packagedSkillsDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')
}

export function apply(ctx: HostContext, config?: Config): void {
  ctx.inject(inject, (hostCtx) => {
    setCurrentHostInstance(hostCtx as unknown as PanelExtensionHost)
    resetProviderRuntime()
    const remountProvider = (): Promise<void> => provider.start(packagedSkillsDir())
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
