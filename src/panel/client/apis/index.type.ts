/**
 * 客户端类型层 = 宿主线协议的**再导出**，不是第二份手写定义。
 *
 * 为什么这么改：这一层原来是 OpenAPI 生成器的产物（原文件头写着 @swagger 2.0），
 * 但仓库里没有生成器，于是 host 的 routes/index.types.ts 与这份副本各写一遍同一条线协议；
 * 两边一旦不同步就会产生「客户端按某字段过滤、服务端根本不发这个字段」的静默缺陷
 * （历史上就有 layer 这一例，见 CHANGELOG）。现在 host 是唯一权威，这里只做名字对齐。
 *
 * 只用 export type：类型在 esbuild 里被擦除，客户端产物不会因此把 host 代码带进来。
 */
export type {
  ActionResult,
  GetSkillQuery,
  ImportedServerView,
  McpActionResult,
  McpApplyImportResponse,
  McpCheckBody,
  McpCopyBody,
  McpImportApplyBody,
  McpImportScanResponse,
  McpListResponse,
  McpRemoveBody,
  McpRowView,
  McpSaveBody,
  McpSaveResponse,
  McpToggleBody,
  RootAddBody,
  RootAddResponse,
  RootRemoveBody,
  SkillContentResponse,
  SkillDeleteBody,
  SkillOpenBody,
  SkillPolicyBody,
  SkillRepositoryView,
  SkillRowView,
  SkillSaveBody,
  SkillSourceView,
  SkillsResponse,
} from '../../host/routes/index.types'

/** 检查接口的返回体：host 里叫 McpCheckResponse，客户端既有写法沿用 McpCheckResult。 */
export type { McpCheckResponse as McpCheckResult } from '../../host/routes/index.types'
