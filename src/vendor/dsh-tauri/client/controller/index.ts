/**
 * client/controller.ts — 基于 hookable 的生命周期控制器（全 workspace 客户端共享）。
 *
 * Controller 化统一方案：observer / timer / listener / disposer 全部登记进统一清理队列；
 * dispose 保证幂等，异步续接以 isDisposed() 守护，业务代码无需各自维护 disposed 标志。
 */

import { noop } from '@reause/core'
import { createHooks } from 'hookable'

/** 控制器注册的命名生命周期钩子（dispose 为统一清理点）。 */
export interface LifecycleHooks {
  dispose: () => void
}

/** 受控生命周期资源（listener / timer / observer / disposer）的统一归口。 */
export interface LifecycleController {
  /**
   * 注册任意 disposer（dispose 时统一执行；执行失败不中断其他清理）。返回取消注册句柄。
   */
  add: (disposer: () => void) => () => void
  /**
   * 受控 setTimeout：dispose 后不再触发；返回提前取消句柄。
   */
  timeout: (fn: () => void, ms: number) => () => void
  /**
   * 受控 setInterval：dispose 时自动清除；返回提前取消句柄。
   */
  interval: (fn: () => void, ms: number) => () => void
  /**
   * 受控 document 事件监听：dispose 时自动移除；返回移除句柄。
   */
  listen: <K extends keyof DocumentEventMap>(
    type: K,
    fn: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ) => () => void
  /**
   * 受控 MutationObserver：dispose 时自动 disconnect；返回 observer 本体。
   * 观察配置是第三个参数且可省略，默认见 DEFAULT_MUTATION_OPTIONS。
   */
  observe: (target: Node, onMutate: MutationCallback, options?: MutationObserverInit) => MutationObserver
  /**
   * 是否已 dispose（异步续接 Guard）。
   */
  isDisposed: () => boolean
  /**
   * 一次性清理所有已注册资源（幂等）。
   */
  dispose: () => void
}

/** observe 的默认观察配置：目标自身与整棵子树的子节点增删（DOM 补丁最常用的粒度）。 */
const DEFAULT_MUTATION_OPTIONS: MutationObserverInit = { childList: true, subtree: true }

/** 创建生命周期控制器 */
export function createLifecycleController(): LifecycleController {
  const hooks = createHooks<LifecycleHooks>()
  let isDisposed = false
  const activeTimeouts = new Set<ReturnType<typeof setTimeout>>()
  /**
   * 同步清理队列（登记顺序即执行顺序）。
   *
   * 为什么不直接用 `hooks.hook('dispose', …)`：hookable v5 的 `callHook` 是异步的
   * （钩子要等一个微任务才跑到），而本控制器的契约是「dispose() 返回时资源已经释放」——
   * 上游测试按同步语义断言（见 register/index.test.ts 的幂等 dispose 用例）。
   * 所以登记走本地队列、dispose 里同步执行；hookable 只留给仍直接 hook 的调用方。
   */
  const disposers = new Set<() => void>()
  const controller: LifecycleController = {
    add(disposer) {
      if (isDisposed)
        return noop
      const safeDisposer = () => {
        if (!disposers.delete(safeDisposer))
          return
        try {
          disposer()
        }
        catch (error) {
          console.error('[LifecycleController] Unhandled exception in disposer:', error)
        }
      }
      disposers.add(safeDisposer)

      return () => {
        disposers.delete(safeDisposer)
      }
    },

    timeout(fn, ms) {
      if (isDisposed)
        return noop

      const timer = setTimeout(() => {
        activeTimeouts.delete(timer)
        fn()
      }, ms)

      activeTimeouts.add(timer)

      const cancel = () => activeTimeouts.delete(timer) && clearTimeout(timer)

      const unhook = controller.add(cancel)
      return () => {
        cancel()
        unhook()
      }
    },

    interval(fn, ms) {
      if (isDisposed)
        return noop

      const timer = setInterval(fn, ms)
      const cancel = () => clearInterval(timer)

      const unhook = controller.add(cancel)
      return () => {
        cancel()
        unhook()
      }
    },

    listen(type, fn, options) {
      if (isDisposed)
        return noop

      const handler = fn as EventListener
      document.addEventListener(type, handler, options)

      const remove = () => document.removeEventListener(type, handler, options)
      const unhook = controller.add(remove)

      return () => {
        remove()
        unhook()
      }
    },

    observe(target, onMutate, options) {
      const observer = new MutationObserver(onMutate)

      if (!isDisposed) {
        observer.observe(target, options ?? DEFAULT_MUTATION_OPTIONS)
        controller.add(() => observer.disconnect())
      }

      return observer
    },

    isDisposed: () => isDisposed,

    dispose() {
      if (isDisposed)
        return

      isDisposed = true

      for (const timer of activeTimeouts)
        clearTimeout(timer)
      activeTimeouts.clear()

      // 同步执行（顺序 = 登记顺序）：dispose() 返回后监听 / 观察者 / 自定义 disposer 都已释放。
      // 逐个跑而不是一次性清空队列：disposer 里再 add() 会被 isDisposed 拦掉，不会漏执行。
      for (const run of [...disposers])
        run()
      disposers.clear()

      // 兼容仍直接 hook('dispose') 的调用方；本控制器内部已不依赖它（v5 下是异步的）。
      void hooks.callHook('dispose')
      hooks.removeAllHooks()
    },
  }

  return controller
}
