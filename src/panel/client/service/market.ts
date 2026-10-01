import type { ClientContext } from 'dsh-tauri/client'
import type { MarketFace } from './market.types'
import { MARKET_SERVICE_NAME } from '../constants'

/**
 * client/service/market.ts — 读市场插件发布的面板服务（能力探测，不做版本嗅探）。
 *
 * 服务的三个状态必须分开对待，否则会把用户的入口弄丢：
 *
 * - 没有 `market`（未安装 / 未加载）→ 不能用；
 * - 有 `market` 但没有可调用的 `render`（1.47.0，即已发布版本）→ **也不能用**：
 *   收不进来，就更不能顺手把它自带的设置页入口藏掉；
 * - 有 `render` → 面板归本插件，设置页那条重复入口由 `register/extension-panel` 撤下。
 *
 * 在**渲染那一刻**探测，而不是 apply 时：服务由另一个客户端插件发布，apply 顺序不保证。
 *
 * Web / Desktop / Tauri 都收编：判据只看 `render`，不再用 iframe（`window.parent !== window`）。
 * 那条判据是上游给 Tauri 壳用的——同一份 profile 在浏览器里打开时不抢设置页入口。
 * 本插件就是那个扩展面板宿主，Issue #1 要的就是 Web/Desktop 也出现市场 tab。
 */

export function readMarket(ctx: ClientContext): MarketFace | undefined {
  const reflect = ctx?.reflect
  if (reflect === undefined || typeof reflect.get !== 'function')
    return undefined
  let service: unknown
  try {
    service = reflect.get(MARKET_SERVICE_NAME)
  }
  catch {
    // 服务注册表在极端时序下可能抛错：按「没有该能力」处理，绝不因此报错。
    return undefined
  }
  if (service === null || service === undefined)
    return undefined
  return typeof (service as MarketFace).render === 'function' ? service as MarketFace : undefined
}
