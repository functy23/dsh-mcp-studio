export type McpApplyImportResponse = {
  ok: boolean;
  results: Array<{ name: string; ok: boolean; error?: string }>;
  restartNeeded: boolean;
};
export type McpImportScanResponse = {
  servers: ImportedServerView[];
  existing: string[];
};
export type ImportedServerView = {
  agent: "claude-code" | "codex" | "cursor" | "gemini";
  name: string;
  transport: "stdio" | "streamable-http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
};
export type McpCheckResult = {
  ok: boolean;
  detail?: string;
};
export type McpActionResult = {
  ok: boolean;
  restartNeeded: boolean;
};
export type McpListResponse = {
  servers: McpRowView[];
  globalError?: string;
  restartNeeded: boolean;
};
export type McpRowView = {
  id: string;
  layer?: "global" | "profile";
  shadowed?: boolean;
  scope?: "global" | "profile";
  serverName: string;
  transport: "stdio" | "streamable-http";
  disabled: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
};
export type McpSaveResponse = {
  ok: boolean;
  id: string;
  restartNeeded: boolean;
};
export type ActionResult = {
  ok: boolean;
  error?: string;
};
export type RootAddResponse = {
  ok: boolean;
  root: SkillSourceView;
};
export type SkillSourceView = {
  id: string;
  kind: "local" | "git";
  label: string;
  url?: string;
  ref?: string;
  path?: string;
  roots: string[];
  materialDir?: string;
  addedAt: number;
  live: boolean;
};
export type SkillContentResponse = {
  name: string;
  content: string;
};
export type SkillsResponse = {
  skills: SkillRowView[];
};
export type SkillRowView = {
  name: string;
  description: string;
  whenToUse?: string;
  invocation: { modelInvocable: boolean; userInvocable: boolean };
  source: string;
  provider: string;
  editable: boolean;
  removable: boolean;
  dir?: string;
  policyEditable: boolean;
  repository?: SkillRepositoryView;
};
export type SkillRepositoryView = {
  id: string;
  label: string;
  kind: "local" | "git";
  githubUrl?: string;
};

export interface McpImportApplyBody {
  items: { agent: string; name: string }[];
  scope?: string;
}
export interface McpCheckBody {
  id: string;
  scope?: string;
}
export interface McpCopyBody {
  id?: string;
  scope?: string;
  toScope?: string;
}
export interface McpRemoveBody {
  id: string;
  scope?: string;
}
export interface McpSaveBody {
  id: string;
  serverName: string;
  transport: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
  scope?: string;
}
export interface McpToggleBody {
  id: string;
  disabled: boolean;
  scope?: string;
}
export interface SkillOpenBody {
  target: string;
  name?: string;
  id?: string;
}
export interface RootRemoveBody {
  id: string;
}
export interface RootAddBody {
  kind: string;
  path?: string;
  url?: string;
}
export interface SkillDeleteBody {
  name: string;
}
export interface SkillSaveBody {
  name: string;
  description: string;
  whenToUse?: string;
  modelInvocable?: boolean;
  userInvocable?: boolean;
  content: string;
}
export interface SkillPolicyBody {
  name: string;
  enabled: boolean;
}
export interface GetSkillQuery {
  name?: string;
}
