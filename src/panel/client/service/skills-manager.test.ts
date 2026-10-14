/**
 * client/service/skills-manager.test.ts — 技能管理嵌入面的能力判据。
 *
 * 与 market.test.ts 同构的三条硬约束：没装 skills-manager 不出现标签页；
 * 有服务但没有 `render`（对方未升级出嵌入面）时**不能把它设置页入口藏掉**，
 * 否则功能彻底没有入口；注册表读取抛错时静默。
 */

import type { ClientContext } from 'dsh-tauri/client'
import { describe, expect, it } from 'vitest'
import { readSkillsManager } from './skills-manager'

function contextWith(service: unknown, options: { throws?: boolean } = {}): ClientContext {
  return {
    reflect: {
      get: () => {
        if (options.throws === true)
          throw new Error('registry unavailable')
        return service
      },
      provide: () => () => {},
    },
  } as unknown as ClientContext
}

/** 只带可见性开关、没有 render 的服务形状。 */
function faceless(): unknown {
  return { version: 1, setSettingsVisible: () => {}, settingsVisible: () => true }
}

describe('readSkillsManager', () => {
  it('未安装 skills-manager：服务缺席 → 不可用（标签页不出现）', () => {
    expect(readSkillsManager(contextWith(undefined))).toBeUndefined()
  })

  it('有 skillsManager 服务但没有 render → 仍不可用（不藏对方设置页入口）', () => {
    expect(readSkillsManager(contextWith(faceless()))).toBeUndefined()
  })

  it('render 可调用 → 返回服务本体', () => {
    const service = { ...faceless() as object, render: () => null }
    expect(readSkillsManager(contextWith(service))).toBe(service)
  })

  it('render 存在但不是函数 → 按不可用处理', () => {
    expect(readSkillsManager(contextWith({ ...faceless() as object, render: 'yes' }))).toBeUndefined()
  })

  it('注册表读取抛错时按不可用处理，不冒泡', () => {
    expect(readSkillsManager(contextWith(undefined, { throws: true }))).toBeUndefined()
  })

  it('缺少 reflect 的壳也不会崩', () => {
    expect(readSkillsManager({} as unknown as ClientContext)).toBeUndefined()
    expect(readSkillsManager({ reflect: {} } as unknown as ClientContext)).toBeUndefined()
  })

  it('每次都按当前注册表读数探测：服务消失后回到不可用（不缓存旧引用）', () => {
    const service: unknown = { ...faceless() as object, render: () => null }
    let current: unknown = service
    const ctx = {
      reflect: {
        get: () => current,
        provide: () => () => {},
      },
    } as unknown as ClientContext
    expect(readSkillsManager(ctx)).toBe(service)
    current = undefined
    expect(readSkillsManager(ctx)).toBeUndefined()
  })
})
