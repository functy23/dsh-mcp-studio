export interface ExtensionRouteDeps {
  profileDirPath: string
  remountProvider: () => Promise<void>
}

export interface ActionResult {
  ok: boolean
  error?: string
}

export interface SkillRepositoryView {
  id: string
  label: string
  kind: 'local' | 'git'
  githubUrl?: string
}

export interface SkillRowView {
  name: string
  description: string
  whenToUse?: string
  invocation: { modelInvocable: boolean, userInvocable: boolean }
  source: string
  provider: string
  editable: boolean
  removable: boolean
  dir?: string
  policyEditable: boolean
  repository?: SkillRepositoryView
}

export interface SkillsResponse {
  skills: SkillRowView[]
}

export interface SkillContentResponse {
  name: string
  content: string
}

export interface SkillSourceView {
  id: string
  kind: 'local' | 'git'
  label: string
  url?: string
  ref?: string
  path?: string
  roots: string[]
  materialDir?: string
  live: boolean
}

export interface RootAddResponse {
  ok: boolean
  root: SkillSourceView
}

export interface ImportedServerView {
  agent: 'claude-code' | 'codex' | 'cursor' | 'gemini'
  name: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
}

export interface McpRowView {
  id: string
  shadowed?: boolean
  scope?: 'global' | 'profile'
  serverName: string
  transport: 'stdio' | 'streamable-http'
  disabled: boolean
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
}

export interface McpListResponse {
  servers: McpRowView[]
  globalError?: string
}

export interface McpSaveResponse {
  ok: boolean
  id: string
  restartNeeded: boolean
}

export interface McpActionResult {
  ok: boolean
  restartNeeded: boolean
}

export interface McpCheckResponse {
  ok: boolean
  /** 失败原因 / 命中的可执行路径；服务层可能拿不到，故可选。 */
  detail?: string
}

export interface McpImportScanResponse {
  servers: ImportedServerView[]
  existing: string[]
}

export interface McpApplyImportResponse {
  ok: boolean
  results: Array<{ name: string, ok: boolean, error?: string }>
  restartNeeded: boolean
}

export interface SkillSaveBody {
  name: string
  description: string
  whenToUse?: string
  modelInvocable?: boolean
  userInvocable?: boolean
  content: string
}

export interface SkillDeleteBody {
  name: string
}

export interface SkillPolicyBody {
  name: string
  enabled: boolean
}

export interface SkillOpenBody {
  target: 'user-skills' | 'plugin-state' | 'skill' | 'root'
  name?: string
  id?: string
}

export interface RootAddBody {
  kind: 'local' | 'git'
  path?: string
  url?: string
}

export interface RootRemoveBody {
  id: string
}

export interface McpSaveBody {
  id: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
  scope?: 'global' | 'profile'
}

export interface McpRemoveBody {
  id: string
  scope?: 'global' | 'profile'
}

export interface McpToggleBody {
  id: string
  disabled: boolean
  scope?: 'global' | 'profile'
}

export interface McpCheckBody {
  id: string
  scope?: 'global' | 'profile'
}

export interface McpImportApplyBody {
  items: Array<{ agent: string, name: string }>
  scope?: 'global' | 'profile'
}

/** POST /api/mcp/copy 的请求体：把一行从 scope 复制到 toScope。 */
export interface McpCopyBody {
  id?: string
  scope?: 'global' | 'profile'
  toScope?: 'global' | 'profile'
}

/** GET /api/skill 的查询串（`?name=`）。 */
export interface GetSkillQuery {
  name?: string
}
