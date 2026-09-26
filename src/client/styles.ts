import { PLUGIN_ID } from '../shared/constants'

/**
 * Styles are injected once per document. Class names are prefixed with `mcs-`
 * (mcp studio) so they cannot collide with host UI or other plugins.
 */
export const CSS = `
.mcs-wrap{font-size:13px;line-height:1.6;display:flex;flex-direction:column;gap:12px;padding:4px 2px;color:inherit}
.mcs-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mcs-head h2{margin:0;font-size:16px}
.mcs-version{font-size:11px;opacity:.55;letter-spacing:.3px}
.mcs-sub{opacity:.75;font-size:12px}
.mcs-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;opacity:.7;word-break:break-all}
.mcs-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.mcs-msg{padding:8px 10px;border-radius:6px;font-size:12px;word-break:break-word}
.mcs-msg.ok{background:rgba(46,160,67,.15);border:1px solid rgba(46,160,67,.4)}
.mcs-msg.err{background:rgba(248,81,73,.15);border:1px solid rgba(248,81,73,.4)}
.mcs-msg.info{background:rgba(88,166,255,.15);border:1px solid rgba(88,166,255,.5)}
.mcs-btn{font-size:12px;padding:3px 10px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.5));background:transparent;color:inherit;cursor:pointer;white-space:nowrap}
.mcs-btn:hover:not(:disabled){border-color:rgba(88,166,255,.75)}
.mcs-btn:disabled{opacity:.5;cursor:default}
.mcs-btn.primary{border-color:rgba(88,166,255,.7)}
.mcs-btn.danger{border-color:rgba(248,81,73,.7)}
.mcs-row{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.mcs-row-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mcs-name{font-weight:600}
.mcs-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;opacity:.6}
.mcs-chip{font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.5));white-space:nowrap}
.mcs-chip.on{background:rgba(46,160,67,.18);border-color:rgba(46,160,67,.55)}
.mcs-chip.off{background:rgba(128,128,128,.15)}
.mcs-chip.live{background:rgba(88,166,255,.15);border-color:rgba(88,166,255,.5)}
.mcs-chip.bad{background:rgba(248,81,73,.18);border-color:rgba(248,81,73,.6)}
.mcs-chip.warn{background:rgba(219,154,4,.18);border-color:rgba(219,154,4,.6)}
.mcs-detail{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;opacity:.78;word-break:break-all}
.mcs-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.mcs-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:8px;padding:12px}
.mcs-form h3{margin:0;grid-column:1/-1;font-size:13px}
.mcs-form label{display:flex;flex-direction:column;gap:3px;font-size:12px}
.mcs-form .full{grid-column:1/-1}
.mcs-form input,.mcs-form select,.mcs-form textarea{font-size:12px;padding:4px 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.5));background:transparent;color:inherit;width:100%;box-sizing:border-box}
.mcs-form textarea{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;min-height:44px}
.mcs-form-actions{grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end}
.mcs-json{width:100%;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;min-height:80px;background:transparent;color:inherit;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.4));border-radius:5px;padding:6px;white-space:pre;overflow:auto}
.mcs-search{font-size:12px;padding:5px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.5));background:transparent;color:inherit;width:100%;box-sizing:border-box}
.mcs-group{font-size:12px;font-weight:600;opacity:.85;margin-top:4px;padding-bottom:2px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25))}
.mcs-provider{font-size:12px;font-weight:600;cursor:pointer;user-select:none;margin-top:4px;opacity:.9}
.mcs-empty{opacity:.6;font-size:12px;padding:8px 0}
.mcs-mask{position:fixed;inset:0;background:var(--dsw-alias-bg-mask-drop,rgba(0,0,0,.45));display:flex;align-items:center;justify-content:center;z-index:99999}
.mcs-dialog{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-base,#fff));border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.5));border-radius:10px;padding:16px 18px;min-width:320px;max-width:720px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 10px 34px rgba(0,0,0,.35);color:inherit}
.mcs-dialog-title{font-size:14px;font-weight:600;margin-bottom:8px}
.mcs-dialog-body{font-size:12px;opacity:.92;line-height:1.7;margin-bottom:14px;overflow:auto;min-height:0}
.mcs-dialog-body pre{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;margin:0}
.mcs-dialog-actions{display:flex;justify-content:flex-end;gap:8px}
.mcs-scan{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:8px;padding:8px 10px;margin-bottom:8px}
.mcs-scan-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between}
.mcs-scan-list{margin:6px 0 0;padding-left:18px}
`

/** Inject the stylesheet once per document. */
export function ensureCss(): void {
  if (typeof document === 'undefined')
    return
  if (document.querySelector(`style[data-plugin-css="${PLUGIN_ID}"]`) !== null)
    return
  const tag = document.createElement('style')
  tag.dataset.plugin = PLUGIN_ID
  tag.dataset.pluginCss = PLUGIN_ID
  tag.textContent = CSS
  document.head.appendChild(tag)
}
