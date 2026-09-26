/*
 * @title dsh-mcp-studio
 * @swagger 2.0
 * @version 0.0.0
 */

import type { FetchOptions } from "dsh-tauri/client";
import { ofetch } from "dsh-tauri/client";
import type * as Types from "./index.type";

export const baseURL = "/dsh-mcp-studio/api";

/** @method post */
export function postHostRestart(options?: FetchOptions) {
  return ofetch<void>("/host/restart", { baseURL, method: "post", ...options });
}

/** @method post */
export function postImportApply(body: Types.McpImportApplyBody, options?: FetchOptions) {
  return ofetch<Types.McpApplyImportResponse>("/import/apply", { baseURL, method: "post", body, ...options });
}

/** @method get */
export function getImportScan(options?: FetchOptions) {
  return ofetch<Types.McpImportScanResponse>("/import/scan", { baseURL, method: "get", ...options });
}

/** @method post */
export function postMcpCheck(body: Types.McpCheckBody, options?: FetchOptions) {
  return ofetch<Types.McpCheckResult>("/mcp/check", { baseURL, method: "post", body, ...options });
}

/** @method post */
export function postMcpCopy(body: Types.McpCopyBody, options?: FetchOptions) {
  return ofetch<void>("/mcp/copy", { baseURL, method: "post", body, ...options });
}

/** @method get */
export function getMcp(options?: FetchOptions) {
  return ofetch<Types.McpListResponse>("/mcp", { baseURL, method: "get", ...options });
}

/** @method post */
export function postMcp(body: Types.McpSaveBody, options?: FetchOptions) {
  return ofetch<Types.McpSaveResponse>("/mcp", { baseURL, method: "post", body, ...options });
}

/** @method delete */
export function deleteMcp(body: Types.McpRemoveBody, options?: FetchOptions) {
  return ofetch<Types.McpActionResult>("/mcp", { baseURL, method: "delete", body, ...options });
}

/** @method post */
export function postMcpToggle(body: Types.McpToggleBody, options?: FetchOptions) {
  return ofetch<Types.McpActionResult>("/mcp/toggle", { baseURL, method: "post", body, ...options });
}

/** @method post */
export function postOpenDir(body: Types.SkillOpenBody, options?: FetchOptions) {
  return ofetch<Types.ActionResult>("/open/dir", { baseURL, method: "post", body, ...options });
}

/** @method get */
export function getRoots(options?: FetchOptions) {
  return ofetch<void>("/roots", { baseURL, method: "get", ...options });
}

/** @method post */
export function postRoots(body: Types.RootAddBody, options?: FetchOptions) {
  return ofetch<Types.RootAddResponse>("/roots", { baseURL, method: "post", body, ...options });
}

/** @method delete */
export function deleteRoots(body: Types.RootRemoveBody, options?: FetchOptions) {
  return ofetch<Types.ActionResult>("/roots", { baseURL, method: "delete", body, ...options });
}

/** @method get */
export function getSkill(params?: Types.GetSkillQuery, options?: FetchOptions) {
  return ofetch<Types.SkillContentResponse>("/skill", { baseURL, method: "get", params, ...options });
}

/** @method post */
export function postSkill(body: Types.SkillSaveBody, options?: FetchOptions) {
  return ofetch<Types.ActionResult>("/skill", { baseURL, method: "post", body, ...options });
}

/** @method delete */
export function deleteSkill(body: Types.SkillDeleteBody, options?: FetchOptions) {
  return ofetch<Types.ActionResult>("/skill", { baseURL, method: "delete", body, ...options });
}

/** @method post */
export function postSkillPolicy(body: Types.SkillPolicyBody, options?: FetchOptions) {
  return ofetch<Types.ActionResult>("/skill/policy", { baseURL, method: "post", body, ...options });
}

/** @method get */
export function getSkills(options?: FetchOptions) {
  return ofetch<Types.SkillsResponse>("/skills", { baseURL, method: "get", ...options });
}

/** @method post */
export function postSkillsRefresh(options?: FetchOptions) {
  return ofetch<Types.SkillsResponse>("/skills/refresh", { baseURL, method: "post", ...options });
}
