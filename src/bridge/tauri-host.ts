/**
 * Bridge: `dsh-tauri` (host half) → vendored sources.
 *
 * The Tauri desktop edition used three packages (`dsh-tauri`, `dsh-tauri-ui`,
 * `dsh-tauri-panel-extension`). This package vendors them and maps the old module
 * specifiers onto the vendored files, so the original sources stay untouched:
 *
 *   `dsh-tauri`        → src/bridge/tauri-host.ts | tauri-client.ts (esbuild alias)
 *   `dsh-tauri/client`  → src/bridge/tauri-client.ts
 *   `dsh-tauri-ui/client` → src/bridge/tauri-ui.ts
 */

export { DSH_HOME } from '../vendor/dsh-tauri/host/config/constants'
export { defineHostRuntime } from '../vendor/dsh-tauri/host/config/runtime'
export { defineService } from '../vendor/dsh-tauri/host/service/index'
export { defineRoutes, dshRouteDepsOf } from '../vendor/dsh-tauri/host/routes/index'
export { defineEventHandler, readBody, getQuery } from '../vendor/dsh-tauri/host/modules/h3'
export { fsAtomicDriver } from '../vendor/dsh-tauri/host/utils/driver'
export * from '../vendor/dsh-tauri/host/utils/url'
export * from '../vendor/dsh-tauri/host/utils/spawn'
export * from '../vendor/dsh-tauri/host/utils/open'
export * from '../vendor/dsh-tauri/host/utils/atomic'
export type { HostContext } from '../vendor/dsh-tauri/host/types/harness'
export type {
  HttpMethod,
  RouteDefinition,
  RouteDisposer,
  RouteHandler,
  RouteKind,
  RouteMethod,
  RoutesContext,
  RoutesRegistration,
  RoutesSetup,
} from '../vendor/dsh-tauri/host/routes/index.type'
export type { EventHandlerRequest } from 'h3'
