import type { ClientContext } from 'dsh-tauri/client'
import {
  EXTENSION_PANEL_EFFECT,
  LOCALE_EFFECT,
  PLUGIN_ID,
  SKILL_CREATOR_PREFILL_EFFECT,
  STYLES_EFFECT,
} from './constants'
import { locale } from './locales'
import { extensionPanelFeature } from './register/extension-panel'
import { skillCreatorPrefillFeature } from './register/skill-creator-prefill'
import { stylesFeature } from './register/styles'

export const name = PLUGIN_ID

// `layout` 必须在这里声明：definePanel 的 select/close 走 ctx.layout.selectPanel()，
// 少了它 cordis 的反射代理会抛 `cannot get property "layout" without inject`
// ——「新建技能」链路里 panel.close() 正好踩到（技能会建出来、草稿也填好，但报错收场）。
export const inject = ['slots', 'locale', 'layout', 'sessions', 'workspaces']

export function apply(ctx: ClientContext): void {
  ctx.effect(locale.registerLocale, LOCALE_EFFECT)
  ctx.effect(stylesFeature, STYLES_EFFECT)
  ctx.effect(skillCreatorPrefillFeature, SKILL_CREATOR_PREFILL_EFFECT)
  ctx.effect(extensionPanelFeature, EXTENSION_PANEL_EFFECT)
}
