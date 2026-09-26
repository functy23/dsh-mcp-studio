import type { ReactElement } from 'react'
import type { MarketFace } from '../service/market.types'

export interface MarketTabProps {
  market: MarketFace
}

/**
 * 市场面板：直接渲染 `market.render()` 交出的 element。
 *
 * 市场的客户端 bundle 与宿主共用同一个 React 实例（经宿主的模块表解析 react），
 * 因此这个 element 挂在面板树的任何位置都能正常工作；它自带错误边界，弹层
 * portal 到 `document.body`，跨容器没有问题。
 */
export function MarketTab({ market }: MarketTabProps): ReactElement {
  return <>{market.render({ preferredSubsectionId: 'installed' })}</>
}
