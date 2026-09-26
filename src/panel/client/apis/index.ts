/**
 * 面板 HTTP API 的手写封装（ofetch）。返回类型全部来自 `./index.type`，也就是 host 的
 * `routes/index.types.ts` —— 加/改字段时只需要改 host 一处，客户端自动跟上。
 *
 * 只保留真的有调用方的入口：没有消费方的包装函数（曾经有 mcp/copy、roots get/delete 三个）
 * 会让「接口存在」与「功能可用」两件事看起来一样，改起来还得先判断谁在用。
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

/** @method post */
export function postRoots(body: Types.RootAddBody, options?: FetchOptions) {
  return ofetch<Types.RootAddResponse>("/roots", { baseURL, method: "post", body, ...options });
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
