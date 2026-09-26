/**
 * Browser shim for the Node `util` module.
 *
 * A transitive CJS dependency calls `require('util')` for `util.inspect` in a debug
 * path. On the DSH client the ModuleLoader owns `require`, and `util` is not part of
 * its module table, so the call is redirected here (see `scripts/build.mjs`).
 */
export function inspect(value: unknown): string {
  if (typeof value === 'string')
    return value
  try {
    return JSON.stringify(value) ?? String(value)
  }
  catch {
    return String(value)
  }
}

export function format(value: unknown): string {
  return inspect(value)
}

/** Named imports some CJS dependencies ask for even when they never call them. */
export const types = { isDate: (value: unknown): boolean => value instanceof Date }
export function deprecate<T extends (...args: any[]) => any>(fn: T): T {
  return fn
}
export function promisify<T extends (...args: any[]) => any>(fn: T): (...args: any[]) => Promise<any> {
  return (...args: any[]) => Promise.resolve(fn(...args))
}

export default { inspect, format, types, deprecate, promisify }
