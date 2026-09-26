/**
 * Bridge: `dsh-tauri/client` → vendored sources.
 *
 * Only the surface the panel actually uses is re-exported; the Tauri-only bridge
 * (invoke / listen / iframe messaging) stays vendored but is never pulled into the
 * bundle, so no `window.__TAURI__` access happens on the web or desktop builds.
 */

export { definePanel } from '../vendor/dsh-tauri/client/panel/index'
export type { PanelEntry, PanelHandle, PanelIconProps } from '../vendor/dsh-tauri/client/panel/index'
export { defineRegister } from '../vendor/dsh-tauri/client/register/index'
export { defineAdapter } from '../vendor/dsh-tauri/client/register/index.adapter'
export type { RegisterController, RegisterCleanup, RegisterSetup } from '../vendor/dsh-tauri/client/register/index'
export { defineLocale } from '../vendor/dsh-tauri/client/locale/index'
export type { LocaleDefinition, LocaleDicts } from '../vendor/dsh-tauri/client/locale/index'
export { defineStore, useStore } from '../vendor/dsh-tauri/client/modules/valtio-define'
export { createLifecycleController } from '../vendor/dsh-tauri/client/controller/index'
export type { LifecycleController } from '../vendor/dsh-tauri/client/controller/index'
export { compact, isEmpty, omitBy, orderBy, remove, uniq } from '../vendor/dsh-tauri/client/modules/lodash-es'
export { ofetch } from '../vendor/dsh-tauri/client/request/index'
export type { FetchOptions } from '../vendor/dsh-tauri/client/request/index'
export type { ClientContext, Translate } from '../vendor/dsh-tauri/client/types/harness'
export type { ClientAdapter } from '../vendor/dsh-tauri/client/types/adapter'
