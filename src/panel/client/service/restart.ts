import { postHostRestart } from '../apis'
import { isDesktopHost } from './restart.utils'

/**
 * 请求宿主重启。
 *
 * 返回 void 而不是 { ok, error? }：重启必然切断这次请求（服务进程被替换），
 * 「拿到失败再判断」的调用方在这个接口上没有可用的失败语义——原来返回的对象
 * 恒为 { ok: true }、error 永远不填，等于用类型承诺了一个不存在的分支。
 */
export async function restartHost(): Promise<void> {
  if (isDesktopHost()) {
    window.dshDesktop?.restartSidecar?.()
    return
  }
  try {
    await postHostRestart()
  }
  catch {
    // 预期内：宿主收到请求就重启，连接被切断属于成功路径；调用方靠轮询探测恢复。
  }
}
