import React from 'react'

interface Row {
  id: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
  disabled: boolean
  scope: 'profile' | 'global'
  shadowed?: boolean
  live?: { present: boolean, disabled: boolean, phase?: string }
}

interface Paths {
  home: string
  profile: string
  profileName: string
  projectPatch: string
  globalPatch: string
}

interface SourceScan {
  source: string
  path: string
  servers: Array<{ serverName: string, transport: string, url?: string, command?: string }>
  existing: string[]
}

interface Props {
  apiCall: <T = any>(op: string, args?: Record<string, unknown>) => Promise<T>
}

interface FormState {
  id: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  url: string
  command: string
  args: string
  env: string
  headers: string
  cwd: string
  disabled: boolean
  scope: 'profile' | 'global'
}

const emptyForm = (scope: 'profile' | 'global' = 'profile'): FormState => ({
  id: '',
  serverName: '',
  transport: 'streamable-http',
  url: '',
  command: '',
  args: '',
  env: '',
  headers: '',
  cwd: '',
  disabled: false,
  scope,
})

function kvLines(value: Record<string, string> | undefined): string {
  if (value === undefined)
    return ''
  return Object.entries(value).map(([key, val]) => key + '=' + val).join('\n')
}

function argLine(value: string[] | undefined): string {
  return value === undefined ? '' : value.map(item => (/\s/.test(item) ? JSON.stringify(item) : item)).join(' ')
}

export function MCPPage(props: Props): React.ReactElement {
  const { apiCall } = props
  const [state, setState] = React.useState({ loading: true, rows: [] as Row[], paths: null as Paths | null, errors: [] as string[] })
  const [msg, setMsg] = React.useState<{ kind: string, text: string } | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState | null>(null)
  const [version, setVersion] = React.useState('')
  const [dialog, setDialog] = React.useState<{ kind: 'copy' | 'export' | 'import' | 'confirm-delete', title: string, body?: string, id?: string, scope?: 'profile' | 'global' } | null>(null)
  const [importText, setImportText] = React.useState('')
  const [scan, setScan] = React.useState<{ sources: SourceScan[], picked: Record<string, boolean> } | null>(null)

  const refresh = React.useCallback((): void => {
    apiCall<any>('mcp-list', {}).then((res) => {
      if (res?.ok) {
        setState({ loading: false, rows: res.servers ?? [], paths: res.paths ?? null, errors: res.errors ?? [] })
      }
      else {
        setState(prev => ({ ...prev, loading: false, errors: [res?.error ?? '加载失败'] }))
      }
    }).catch((error: any) => {
      setState(prev => ({ ...prev, loading: false, errors: [String(error?.message ?? error)] }))
    })
  }, [apiCall])

  React.useEffect(() => { refresh() }, [refresh])
  React.useEffect(() => {
    apiCall<any>('plugin-version', {}).then((res) => { if (res?.ok) setVersion(String(res.version ?? '')) }).catch(() => {})
  }, [apiCall])

  const run = (op: string, args: Record<string, unknown>, label: string, onOk?: (res: any) => void): void => {
    setBusy(label)
    setMsg(null)
    apiCall<any>(op, args).then((res) => {
      if (res?.ok) {
        setMsg({ kind: 'ok', text: label + '已完成' })
        if (onOk !== undefined) onOk(res)
        else refresh()
      }
      else {
        setMsg({ kind: 'err', text: res?.error ?? (label + '失败') })
      }
    }).catch((error: any) => setMsg({ kind: 'err', text: String(error?.message ?? error) }))
      .then(() => setBusy(null))
  }

  const openEditor = (row?: Row): void => {
    if (row === undefined) {
      setForm(emptyForm())
      return
    }
    setForm({
      id: row.id,
      serverName: row.serverName,
      transport: row.transport,
      url: row.url ?? '',
      command: row.command ?? '',
      args: argLine(row.args),
      env: kvLines(row.env),
      headers: kvLines(row.headers),
      cwd: row.cwd ?? '',
      disabled: row.disabled,
      scope: row.scope,
    })
  }

  const submitForm = (): void => {
    if (form === null)
      return
    run('mcp-save', {
      scope: form.scope,
      input: {
        ...(form.id !== '' ? { id: form.id } : {}),
        serverName: form.serverName.trim(),
        transport: form.transport,
        url: form.url.trim(),
        command: form.command.trim(),
        args: form.args,
        env: form.env,
        headers: form.headers,
        cwd: form.cwd.trim(),
        disabled: form.disabled,
      },
    }, form.id === '' ? '新增' : '保存', () => { setForm(null); refresh() })
  }

  const doScan = (): void => {
    setBusy('扫描')
    apiCall<any>('mcp-import-scan', {}).then((res) => {
      if (res?.ok) {
        const picked: Record<string, boolean> = {}
        for (const source of res.sources ?? []) {
          for (const server of source.servers ?? []) {
            if (!(source.existing ?? []).includes(server.serverName))
              picked[source.path + '::' + server.serverName] = true
          }
        }
        setScan({ sources: res.sources ?? [], picked })
        setDialog({ kind: 'import', title: '导入扫描结果' })
      }
      else {
        setMsg({ kind: 'err', text: res?.error ?? '扫描失败' })
      }
    }).catch((error: any) => setMsg({ kind: 'err', text: String(error?.message ?? error) }))
      .then(() => setBusy(null))
  }

  const applyScan = (): void => {
    if (scan === null) {
      setDialog(null)
      return
    }
    const servers: any[] = []
    for (const source of scan.sources) {
      for (const server of source.servers) {
        if (scan.picked[source.path + '::' + server.serverName] === true)
          servers.push(server)
      }
    }
    run('mcp-import-apply', { scope: 'profile', servers }, '导入', (res) => {
      setDialog(null)
      setScan(null)
      setMsg({ kind: 'ok', text: `导入完成：新增 ${(res?.added ?? []).length}，跳过 ${(res?.skipped ?? []).length}` })
      refresh()
    })
  }

  const field = (key: keyof FormState, label: string, options: { type?: string, placeholder?: string, full?: boolean } = {}): React.ReactElement | null => {
    if (form === null)
      return null
    return (
      <label className={options.full === true ? 'full' : ''} key={key}>
        {label}
        <input
          type={options.type ?? 'text'}
          value={String(form[key])}
          placeholder={options.placeholder ?? ''}
          onChange={(event: any) => setForm({ ...form, [key]: event.target.value } as FormState)}
        />
      </label>
    )
  }

  const area = (key: 'args' | 'env' | 'headers', label: string, placeholder: string): React.ReactElement | null => {
    if (form === null)
      return null
    return (
      <label className="full" key={key}>
        {label}
        <textarea
          value={form[key]}
          placeholder={placeholder}
          onChange={(event: any) => setForm({ ...form, [key]: event.target.value })}
        />
      </label>
    )
  }

  const rows = state.rows

  return (
    <div className="mcs-wrap">
      <div className="mcs-head">
        <h2>MCP 管理</h2>
        {version !== '' ? <span className="mcs-version">v{version}</span> : null}
        <span className="mcs-chip live">profile：{state.paths?.profileName ?? '…'}</span>
      </div>
      <div className="mcs-sub">
        管理 loader patch 里的 <code>@deepseek-ai/dsh-mcp-client</code> 行：新增、编辑、启停、重启、健康检查、导入导出，改动即时生效（HMR），重启后保留。
      </div>
      {state.paths !== null
        ? (
            <div className="mcs-path">
              项目级：{state.paths.projectPatch}
              <br />
              全局：{state.paths.globalPatch}
            </div>
          )
        : null}

      <div className="mcs-bar">
        <button className="mcs-btn" disabled={busy !== null} onClick={() => refresh()}>刷新</button>
        <button className="mcs-btn primary" disabled={busy !== null || state.paths === null} onClick={() => openEditor()}>新增服务器</button>
        <button className="mcs-btn" disabled={busy !== null} onClick={doScan}>从其他配置导入…</button>
        <button className="mcs-btn" disabled={busy !== null} onClick={() => run('mcp-export', {}, '导出', (res) => setDialog({ kind: 'export', title: '导出配置', body: JSON.stringify(res.bundle, null, 2) }))}>导出 JSON</button>
        <button className="mcs-btn" disabled={busy !== null} onClick={() => { setImportText(''); setDialog({ kind: 'import', title: '导入 JSON' }) }}>导入 JSON</button>
      </div>

      {msg !== null ? <div className={'mcs-msg ' + msg.kind}>{msg.text}</div> : null}
      {state.errors.map(error => <div className="mcs-msg err" key={error}>{error}</div>)}

      {form !== null
        ? (
            <div className="mcs-form">
              <h3>{form.id === '' ? '新增 MCP 服务器' : '编辑 ' + form.id}</h3>
              {field('serverName', 'Server 名称', { placeholder: 'web-search' })}
              <label>
                传输方式
                <select value={form.transport} onChange={(event: any) => setForm({ ...form, transport: event.target.value })}>
                  <option value="streamable-http">streamable-http</option>
                  <option value="stdio">stdio</option>
                </select>
              </label>
              {form.transport === 'streamable-http'
                ? field('url', 'URL', { placeholder: 'https://example.com/mcp', full: true })
                : field('command', '命令', { placeholder: 'npx -y @modelcontextprotocol/server-filesystem' })}
              {form.transport === 'stdio' ? area('args', '参数（空格分隔，支持引号）', '-y @modelcontextprotocol/server-filesystem /tmp') : null}
              {form.transport === 'stdio' ? area('env', '环境变量（每行 key=value）', 'API_KEY=xxx') : null}
              {form.transport === 'stdio' ? field('cwd', '工作目录（可选）') : null}
              {form.transport === 'streamable-http' ? area('headers', '请求头（每行 key=value）', 'Authorization=Bearer xxx') : null}
              <label>
                作用域
                <select value={form.scope} disabled={form.id !== ''} onChange={(event: any) => setForm({ ...form, scope: event.target.value })}>
                  <option value="profile">项目级（当前 profile）</option>
                  <option value="global">全局（~/.dsh）</option>
                </select>
              </label>
              <label>
                初始状态
                <select value={form.disabled ? 'disabled' : 'enabled'} onChange={(event: any) => setForm({ ...form, disabled: event.target.value === 'disabled' })}>
                  <option value="enabled">启用</option>
                  <option value="disabled">停用</option>
                </select>
              </label>
              <div className="mcs-form-actions">
                <button className="mcs-btn" onClick={() => setForm(null)}>取消</button>
                <button className="mcs-btn primary" disabled={busy !== null} onClick={submitForm}>保存</button>
              </div>
            </div>
          )
        : null}

      {state.loading
        ? <div className="mcs-empty">加载中…</div>
        : rows.length === 0
          ? <div className="mcs-empty">还没有配置任何 MCP 服务器。点「新增服务器」开始。</div>
          : rows.map(row => (
              <div className="mcs-row" key={row.scope + '::' + row.id}>
                <div className="mcs-row-head">
                  <span className="mcs-name">{row.serverName}</span>
                  <span className="mcs-id">{row.id}</span>
                  <span className={'mcs-chip ' + (row.disabled ? 'off' : 'on')}>{row.disabled ? '已停用' : '已启用'}</span>
                  <span className="mcs-chip live">{row.transport}</span>
                  <span className="mcs-chip">{row.scope === 'global' ? '全局' : '项目级'}</span>
                  {row.shadowed === true ? <span className="mcs-chip warn">被项目级覆盖</span> : null}
                  {row.live !== undefined ? <span className={'mcs-chip ' + (row.live.disabled ? 'off' : 'live')}>loader：{row.live.disabled ? '未加载' : '已加载'}{row.live.phase !== undefined ? ' · ' + row.live.phase : ''}</span> : null}
                </div>
                <div className="mcs-detail">
                  {row.transport === 'stdio'
                    ? `${row.command ?? ''} ${(row.args ?? []).join(' ')}`
                    : row.url ?? ''}
                </div>
                <div className="mcs-actions">
                  <button className="mcs-btn" disabled={busy !== null} onClick={() => run('mcp-toggle', { scope: row.scope, id: row.id, enabled: row.disabled }, row.disabled ? '启用' : '停用')}>
                    {row.disabled ? '启用' : '停用'}
                  </button>
                  <button className="mcs-btn" disabled={busy !== null} onClick={() => run('mcp-restart', { scope: row.scope, id: row.id }, '重启')}>重启</button>
                  <button className="mcs-btn" disabled={busy !== null} onClick={() => run('mcp-check', { scope: row.scope, id: row.id }, '检查', (res) => setMsg({ kind: res.ok ? 'ok' : 'err', text: `${row.id}：${res.detail ?? ''}` }))}>检查</button>
                  <button className="mcs-btn" disabled={busy !== null} onClick={() => run('mcp-copy', { scope: row.scope, id: row.id, format: 'json' }, '复制', (res) => setDialog({ kind: 'copy', title: '复制 ' + row.id, body: res.snippet }))}>复制</button>
                  <button className="mcs-btn" disabled={busy !== null} onClick={() => openEditor(row)}>编辑</button>
                  <button className="mcs-btn danger" disabled={busy !== null} onClick={() => setDialog({ kind: 'confirm-delete', title: '删除 ' + row.id, id: row.id, scope: row.scope, body: '确定要删除这个 MCP 服务器吗？此操作会写入 patch 文件。' })}>删除</button>
                </div>
              </div>
            ))}

      {dialog !== null
        ? (
            <div className="mcs-mask" onClick={() => setDialog(null)}>
              <div className="mcs-dialog" onClick={(event: any) => event.stopPropagation()}>
                <div className="mcs-dialog-title">{dialog.title}</div>
                <div className="mcs-dialog-body">
                  {dialog.kind === 'import' && scan !== null
                    ? scan.sources.length === 0
                      ? <div className="mcs-empty">没有发现可导入的 MCP 配置。</div>
                      : scan.sources.map(source => (
                          <div className="mcs-scan" key={source.path}>
                            <div className="mcs-scan-head">
                              <strong>{source.source}</strong>
                              <span className="mcs-path">{source.path}</span>
                            </div>
                            <ul className="mcs-scan-list">
                              {source.servers.map(server => {
                                const key = source.path + '::' + server.serverName
                                const exists = source.existing.includes(server.serverName)
                                return (
                                  <li key={key}>
                                    <label>
                                      <input
                                        type="checkbox"
                                        disabled={exists}
                                        checked={scan.picked[key] === true}
                                        onChange={(event: any) => setScan({ ...scan, picked: { ...scan.picked, [key]: event.target.checked } })}
                                      />
                                      {' '}
                                      {server.serverName}
                                      {' '}
                                      <span className="mcs-sub">({server.transport}{exists ? ' · 已存在' : ''})</span>
                                    </label>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ))
                    : dialog.kind === 'import'
                      ? (
                          <textarea
                            className="mcs-json"
                            placeholder={'粘贴导出的 JSON（dsh-mcp-studio 导出格式或 {"servers": [...]}）'}
                            value={importText}
                            onChange={(event: any) => setImportText(event.target.value)}
                          />
                        )
                      : <pre>{dialog.body ?? ''}</pre>}
                </div>
                <div className="mcs-dialog-actions">
                  <button className="mcs-btn" onClick={() => setDialog(null)}>关闭</button>
                  {dialog.kind === 'copy'
                    ? <button className="mcs-btn primary" onClick={() => { void navigator.clipboard?.writeText(dialog.body ?? ''); setMsg({ kind: 'ok', text: '已复制到剪贴板' }); setDialog(null) }}>复制到剪贴板</button>
                    : null}
                  {dialog.kind === 'export'
                    ? <button className="mcs-btn primary" onClick={() => { void navigator.clipboard?.writeText(dialog.body ?? ''); setMsg({ kind: 'ok', text: '已复制到剪贴板' }); setDialog(null) }}>复制到剪贴板</button>
                    : null}
                  {dialog.kind === 'import' && scan !== null
                    ? <button className="mcs-btn primary" disabled={busy !== null} onClick={applyScan}>导入选中项</button>
                    : null}
                  {dialog.kind === 'import' && scan === null
                    ? <button className="mcs-btn primary" disabled={busy !== null || importText.trim() === ''} onClick={() => run('mcp-import', { scope: 'profile', json: importText }, '导入', (res) => { setDialog(null); setMsg({ kind: 'ok', text: `导入完成：新增 ${(res?.added ?? []).length}，跳过 ${(res?.skipped ?? []).length}` }); refresh() })}>导入</button>
                    : null}
                  {dialog.kind === 'confirm-delete'
                    ? <button className="mcs-btn danger" disabled={busy !== null} onClick={() => { run('mcp-remove', { scope: dialog.scope, id: dialog.id }, '删除', () => { setDialog(null); refresh() }) }}>确认删除</button>
                    : null}
                </div>
              </div>
            </div>
          )
        : null}
    </div>
  )
}
