import type { ClientContext } from '../types'
import { defineRegister } from '.'
import { invokeParent } from '../service/invoke-parent'
import { getFrameStyle, getOverlayMarkedStyle, getSidebarStyle } from './style.utils'

export const registerStyle = defineRegister<ClientContext>((controller) => {
  function reportSidebarBackground() {
    invokeParent({
      type: 'dsh://style',
      sidebar: getSidebarStyle(),
      marked: getOverlayMarkedStyle(),
      frame: getFrameStyle(),
      colorScheme: document.documentElement.style.colorScheme,
    })
  }

  controller.observe(document.body, reportSidebarBackground, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'], // 过滤：只关注这两个属性
  })
})
