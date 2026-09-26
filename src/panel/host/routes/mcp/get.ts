import type { ExtensionRouteDeps, McpListResponse } from '../index.types'
import { defineEventHandler, dshRouteDepsOf } from 'dsh-tauri'
import { mcp } from '../../service/mcp'

export default defineEventHandler((event): McpListResponse | { error: string } => {
  const deps = dshRouteDepsOf<ExtensionRouteDeps>(event)!
  // 只读列表**不带** restartNeeded：这次请求什么都没写。它以前恒为 true，
  // 客户端一旦消费它，面板就会一进页面挂出常驻的「配置已写入，重启后生效」条。
  return mcp.list(deps.profileDirPath)
})
