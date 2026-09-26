import React from 'react'

interface SkillRow {
  name: string
  description: string
  source?: string
  provider?: string
  path?: string
  modelInvocable: boolean
  userInvocable: boolean
  level: string
  disabledByStudio: boolean
  toggleable: boolean
  reason?: string
}

interface Props {
  apiCall: <T = any>(op: string, args?: Record<string, unknown>) => Promise<T>
}

const GROUPS = ['项目级', '运行时', '自定义', '用户级', '内置', '插件自带']

export function SkillsPage(props: Props): React.ReactElement {
  const { apiCall } = props
  const [state, setState] = React.useState({ loading: true, error: null as string | null, skills: [] as SkillRow[], complete: true, statePath: '' })
  const [query, setQuery] = React.useState('')
  const [busy, setBusy] = React.useState<string | null>(null)
  const [msg, setMsg] = React.useState<{ kind: string, text: string } | null>(null)
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({})
  const [detail, setDetail] = React.useState<{ name: string, content: string, path?: string, level?: string } | null>(null)

  const refresh = React.useCallback((): void => {
    apiCall<any>('skill-list', {}).then((res) => {
      if (res?.ok) {
        setState({ loading: false, error: null, skills: res.skills ?? [], complete: res.complete !== false, statePath: String(res.statePath ?? '') })
      }
      else {
        setState(prev => ({ ...prev, loading: false, error: String(res?.error ?? '加载失败') }))
      }
    }).catch((error: any) => setState(prev => ({ ...prev, loading: false, error: String(error?.message ?? error) })))
  }, [apiCall])

  React.useEffect(() => { refresh() }, [refresh])

  const toggle = (skill: SkillRow): void => {
    const enabled = skill.disabledByStudio
    setBusy(skill.name)
    setMsg(null)
    apiCall<any>('skill-toggle', { name: skill.name, enabled }).then((res) => {
      if (res?.ok) {
        setMsg({ kind: 'ok', text: (enabled ? '已启用 ' : '已停用 ') + skill.name })
        refresh()
      }
      else {
        setMsg({ kind: 'err', text: String(res?.error ?? '操作失败') })
      }
    }).catch((error: any) => setMsg({ kind: 'err', text: String(error?.message ?? error) }))
      .then(() => setBusy(null))
  }

  const openDetail = (skill: SkillRow): void => {
    setBusy(skill.name)
    apiCall<any>('skill-detail', { name: skill.name }).then((res) => {
      if (res?.ok)
        setDetail({ name: res.name ?? skill.name, content: String(res.content ?? ''), ...(res.path !== undefined ? { path: String(res.path) } : {}), ...(res.level !== undefined ? { level: String(res.level) } : {}) })
      else
        setMsg({ kind: 'err', text: String(res?.error ?? '读取失败') })
    }).catch((error: any) => setMsg({ kind: 'err', text: String(error?.message ?? error) }))
      .then(() => setBusy(null))
  }

  const normalized = query.trim().toLowerCase()
  const visible = state.skills.filter(skill => normalized === '' || (skill.name + ' ' + skill.description).toLowerCase().includes(normalized))

  return (
    <div className="mcs-wrap">
      <div className="mcs-head">
        <h2>Skills 管理</h2>
        <span className="mcs-chip live">{state.skills.length} 个技能</span>
        {state.complete === false ? <span className="mcs-chip warn">部分来源未就绪</span> : null}
      </div>
      <div className="mcs-sub">
        浏览全部技能来源（项目级 / 运行时 / 用户级 / 内置 / 插件自带），一键启停。停用走 rank-0 override 提供者，不修改任何 SKILL.md 文件，重启后仍然生效。
      </div>
      {state.statePath !== '' ? <div className="mcs-path">状态文件：{state.statePath}</div> : null}

      <div className="mcs-bar">
        <input className="mcs-search" placeholder="搜索技能名称或描述…" value={query} onChange={(event: any) => setQuery(event.target.value)} />
        <button className="mcs-btn" disabled={busy !== null} onClick={() => refresh()}>刷新</button>
        <button className="mcs-btn" disabled={busy !== null} onClick={() => { apiCall<any>('skill-refresh', {}).then(() => refresh()).catch(() => {}); refresh() }}>重新扫描</button>
      </div>

      {msg !== null ? <div className={'mcs-msg ' + msg.kind}>{msg.text}</div> : null}
      {state.error !== null ? <div className="mcs-msg err">{state.error}</div> : null}

      {state.loading
        ? <div className="mcs-empty">加载中…</div>
        : visible.length === 0
          ? <div className="mcs-empty">没有匹配的技能。</div>
          : GROUPS.map((group) => {
              const items = visible.filter(skill => skill.level === group)
              if (items.length === 0)
                return null
              const byProvider = new Map<string, SkillRow[]>()
              for (const skill of items) {
                const key = skill.provider ?? 'unknown'
                const bucket = byProvider.get(key) ?? []
                bucket.push(skill)
                byProvider.set(key, bucket)
              }
              return (
                <React.Fragment key={group}>
                  <div className="mcs-group">{group}（{items.length}）</div>
                  {[...byProvider.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([provider, providerItems]) => {
                    const key = group + '::' + provider
                    const isCollapsed = normalized === '' && collapsed[key] === true
                    return (
                      <React.Fragment key={key}>
                        <div className="mcs-provider" title="点击折叠/展开" onClick={() => setCollapsed({ ...collapsed, [key]: !isCollapsed })}>
                          {(isCollapsed ? '▸ ' : '▾ ') + provider + '（' + providerItems.length + '）'}
                        </div>
                        {isCollapsed
                          ? null
                          : providerItems.map(skill => (
                              <div className="mcs-row" key={skill.name}>
                                <div className="mcs-row-head">
                                  <span className="mcs-name">{skill.name}</span>
                                  <span className={'mcs-chip ' + (skill.disabledByStudio || !skill.modelInvocable ? 'off' : 'on')}>
                                    {skill.disabledByStudio ? '已停用' : (skill.modelInvocable ? '可用' : '禁用')}
                                  </span>
                                  {skill.disabledByStudio ? <span className="mcs-chip warn">由 MCP Studio 停用</span> : null}
                                  {skill.path !== undefined ? <span className="mcs-chip live">文件</span> : <span className="mcs-chip live">注册表</span>}
                                </div>
                                <div className="mcs-sub">{skill.description}</div>
                                {skill.reason !== undefined ? <div className="mcs-sub">{skill.reason}</div> : null}
                                <div className="mcs-actions">
                                  <button className="mcs-btn" disabled={busy !== null} onClick={() => openDetail(skill)}>查看</button>
                                  {skill.toggleable
                                    ? (
                                        <button className="mcs-btn" disabled={busy !== null || busy === skill.name} onClick={() => toggle(skill)}>
                                          {skill.disabledByStudio ? '启用' : '停用'}
                                        </button>
                                      )
                                    : null}
                                </div>
                              </div>
                            ))}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              )
            })}

      {detail !== null
        ? (
            <div className="mcs-mask" onClick={() => setDetail(null)}>
              <div className="mcs-dialog" onClick={(event: any) => event.stopPropagation()}>
                <div className="mcs-dialog-title">
                  {detail.name}
                  {detail.level !== undefined ? ' · ' + detail.level : ''}
                </div>
                {detail.path !== undefined ? <div className="mcs-path">{detail.path}</div> : null}
                <div className="mcs-dialog-body">
                  <pre>{detail.content === '' ? '（该技能没有可读文件，可能是运行时注册的）' : detail.content}</pre>
                </div>
                <div className="mcs-dialog-actions">
                  <button className="mcs-btn" onClick={() => setDetail(null)}>关闭</button>
                </div>
              </div>
            </div>
          )
        : null}
    </div>
  )
}
