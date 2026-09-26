/**
 * Minimal ambient declarations for the DSH plugin runtime packages.
 *
 * DSH ships these modules inside the host application; plugins must not install
 * them (their transitive graph is not published to npm). Only the surface this
 * plugin touches is declared here.
 */
declare module '@deepseek-ai/dsh-tools' {
  export interface ToolParameter {
    type: string
    required?: boolean
    description?: string
    [key: string]: unknown
  }

  export interface ToolDefinition<Args = any, Result = any> {
    name: string
    description: string
    parameters: Record<string, ToolParameter>
    output?: {
      schema: Record<string, unknown>
      render?: (args: Args, value: Result) => unknown
    }
    execute: (args: Args) => Promise<Result> | Result
  }

  export function defineTool<Args = any, Result = any>(definition: ToolDefinition<Args, Result>): ToolDefinition<Args, Result>
}

declare module '@deepseek-ai/cordis' {
  export interface Context {
    get(name: string): any
    on(event: string, listener: (...args: any[]) => void): unknown
    effect(callback: () => unknown, label?: string): unknown
    [key: string]: any
  }
}
