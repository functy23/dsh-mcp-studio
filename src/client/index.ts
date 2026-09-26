import React from 'react'
import { API_GATE_HEADER, API_GATE_VALUE, API_PATH, PLUGIN_ID, SETTINGS_SECTIONS } from '../shared/constants'
import { ensureCss } from './styles'
import { MCPPage } from './pages/mcp'
import { SkillsPage } from './pages/skills'

export async function apiCall<T = any>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  try {
    const response = await fetch(API_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [API_GATE_HEADER]: API_GATE_VALUE },
      body: JSON.stringify({ op, args }),
    })
    return await response.json() as T
  }
  catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) } as T
  }
}

export default {
  name: PLUGIN_ID + '-client',
  inject: ['timer'],
  apply(ctx: any): void {
    ensureCss()
    const slots = ctx.get('slots')
    if (slots === undefined)
      return
    slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: SETTINGS_SECTIONS.mcp.id, order: SETTINGS_SECTIONS.mcp.order, label: SETTINGS_SECTIONS.mcp.label },
      () => React.createElement(MCPPage, { apiCall }),
    ))
    slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: SETTINGS_SECTIONS.skills.id, order: SETTINGS_SECTIONS.skills.order, label: SETTINGS_SECTIONS.skills.label },
      () => React.createElement(SkillsPage, { apiCall }),
    ))
  },
}
