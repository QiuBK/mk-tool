let popupWindowId: number | null = null

interface CapturedEntry {
  id: string
  url: string
  method: string
  type: 'xhr' | 'fetch'
  timestamp: number
  requestBody: string | null
  contentType: string | null
  headers: Record<string, string>
  status: number | null
  tabId: number
  responseHeaders: Record<string, string>
  responseBody: string | null
}

const capturedRequests: Map<number, CapturedEntry[]> = new Map()
const debuggerTabs: Set<number> = new Set()
const pendingExtraHeaders: Map<string, Record<string, string>> = new Map()
const MAX_CAPTURED = 200

function normalizeHeaderKey(k: string): string {
  return k.toLowerCase()
}

function mergeHeaders(
  target: Record<string, string>,
  source: Record<string, string>,
  override: boolean = false,
): Record<string, string> {
  const targetNormMap = new Map<string, string>()
  for (const k of Object.keys(target)) {
    targetNormMap.set(normalizeHeaderKey(k), k)
  }
  for (const [k, v] of Object.entries(source)) {
    const nk = normalizeHeaderKey(k)
    const existingKey = targetNormMap.get(nk)
    if (existingKey && !override) continue
    if (existingKey) delete target[existingKey]
    target[k] = v
    targetNormMap.set(nk, k)
  }
  return target
}

function getActiveTabId(): Promise<number | null> {
  return new Promise((resolve) => {
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, (win) => {
      if (!win.id) {
        resolve(null)
        return
      }
      chrome.tabs.query({ active: true, windowId: win.id }, (tabs) => {
        resolve(tabs[0]?.id || null)
      })
    })
  })
}

function applyMode(mode: string) {
  if (mode === 'sidepanel') {
    chrome.action.setPopup({ popup: '' })
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } else {
    chrome.action.setPopup({ popup: '' })
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  }
}

chrome.storage.local.get('devtoolkit-display-mode', (result) => {
  const mode = (result['devtoolkit-display-mode'] as string) || 'sidepanel'
  applyMode(mode)
})

chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get('devtoolkit-display-mode', (result) => {
    const mode = (result['devtoolkit-display-mode'] as string) || 'sidepanel'
    if (mode === 'popup') {
      chrome.windows.create({
        url: chrome.runtime.getURL('src/popup/index.html'),
        type: 'popup',
        width: 500,
        height: 640,
      }, (win) => {
        if (win?.id) popupWindowId = win.id
      })
    } else if (tab.id != null) {
      chrome.sidePanel.open({ tabId: tab.id })
    }
  })
})

function startKeepalive() {
  try {
    chrome.alarms.create('devtoolkit-keepalive', { periodInMinutes: 0.4 })
  } catch { /* ignore */ }
}

function stopKeepalive() {
  try {
    chrome.alarms.clear('devtoolkit-keepalive')
  } catch { /* ignore */ }
}

try {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'devtoolkit-keepalive') {
      if (debuggerTabs.size === 0) {
        stopKeepalive()
      }
    }
  })
} catch { /* ignore */ }

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'setDisplayMode') {
    const mode = message.mode as string
    applyMode(mode)
    chrome.storage.local.set({ 'devtoolkit-display-mode': mode })

    if (mode === 'popup') {
      if (popupWindowId != null) {
        chrome.windows.remove(popupWindowId)
        popupWindowId = null
      }
      chrome.windows.create({
        url: chrome.runtime.getURL('src/popup/index.html'),
        type: 'popup',
        width: 500,
        height: 640,
      }, (win) => {
        if (win?.id) popupWindowId = win.id
      })
    } else {
      if (popupWindowId != null) {
        chrome.windows.remove(popupWindowId)
        popupWindowId = null
      }
      chrome.windows.getLastFocused({ windowTypes: ['normal'] }, (win) => {
        if (win.id) {
          chrome.tabs.query({ active: true, windowId: win.id }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.sidePanel.open({ tabId: tabs[0].id })
            }
          })
        }
      })
    }
    sendResponse({ ok: true })
    return true
  }

  if (message.type === 'startCapture') {
    const tabId = message.tabId as number
    if (!tabId || tabId < 0) {
      sendResponse({ ok: false, error: `无效的标签页ID: ${tabId}` })
      return true
    }
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message || ''
        if (msg.includes('already attached')) {
          debuggerTabs.add(tabId)
          startKeepalive()
          chrome.debugger.sendCommand({ tabId }, 'Network.enable', {}, () => {
            sendResponse({ ok: true })
          })
          return
        }
        sendResponse({ ok: false, error: `debugger.attach失败: ${msg}` })
        return
      }
      debuggerTabs.add(tabId)
      startKeepalive()
      chrome.debugger.sendCommand({ tabId }, 'Network.enable', {}, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: `Network.enable失败: ${chrome.runtime.lastError.message}` })
          return
        }
        sendResponse({ ok: true })
      })
    })
    return true
  }

  if (message.type === 'stopCapture') {
    const tabId = message.tabId as number
    chrome.debugger.detach({ tabId }, () => {
      debuggerTabs.delete(tabId)
      if (debuggerTabs.size === 0) stopKeepalive()
      sendResponse({ ok: true })
    })
    return true
  }

  if (message.type === 'isDebuggerAttached') {
    const tabId = message.tabId as number
    chrome.debugger.getTargets((targets) => {
      const attached = targets.some((t: any) => t.id === String(tabId) && t.attached)
      if (attached) {
        debuggerTabs.add(tabId)
      } else {
        debuggerTabs.delete(tabId)
      }
      sendResponse({ attached })
    })
    return true
  }

  if (message.type === 'getActiveTabId') {
    getActiveTabId().then((tabId) => {
      sendResponse({ tabId })
    })
    return true
  }

  if (message.type === 'getCapturedRequests') {
    const tabId = message.tabId as number
    const requests = capturedRequests.get(tabId) || []
    sendResponse({ requests: JSON.parse(JSON.stringify(requests)) })
    return true
  }

  if (message.type === 'clearCapturedRequests') {
    const tabId = message.tabId as number
    capturedRequests.delete(tabId)
    sendResponse({ ok: true })
    return true
  }

  if (message.type === 'expandPagination') {
    getActiveTabId().then(async (tabId) => {
      if (!tabId) { sendResponse({ count: 0 }); return }
      const wasAttached = debuggerTabs.has(tabId)
      try {
        if (!wasAttached) {
          await new Promise<void>((resolve, reject) => {
            chrome.debugger.attach({ tabId }, '1.3', () => {
              if (chrome.runtime.lastError) {
                const msg = chrome.runtime.lastError.message || ''
                if (msg.includes('already attached')) { debuggerTabs.add(tabId); resolve() }
                else reject(new Error(msg))
              } else { debuggerTabs.add(tabId); resolve() }
            })
          })
        }
        const expandCode = `(function(){var count=0;function findApp(){var el=document.getElementById('app');if(el&&el.__vue_app__)return el.__vue_app__;var all=document.querySelectorAll('*');for(var i=0;i<all.length;i++){if(all[i].__vue_app__)return all[i].__vue_app__;}return null;}function deepSetPageSize(obj,depth){if(!obj||typeof obj!=='object'||depth>10)return;try{var keys;try{keys=Object.getOwnPropertyNames(obj);}catch(e){keys=Object.keys(obj);}for(var i=0;i<keys.length;i++){var key=keys[i];if(key.startsWith('_')||key.startsWith('$')||key==='constructor'||key==='prototype'||key==='__proto__')continue;try{var val=obj[key];if(typeof val==='number'&&(key==='pageSize'||key==='limit'||key==='size'||key==='perPage'||key==='page_size'||key==='rowsPerPage'||key==='itemCount'||key==='total'||key==='num')){if(val<9999){obj[key]=9999;count++;}}if(typeof val==='object'&&val!==null&&!Array.isArray(val)&&!(val instanceof HTMLElement)&&!(val instanceof Node)){deepSetPageSize(val,depth+1);}}catch(e){}}}catch(e){}}var app=findApp();if(app){try{var pinia=app.config.globalProperties.$pinia;if(pinia&&pinia._s){pinia._s.forEach(function(store){try{var state=store.$state;if(state)deepSetPageSize(state,0);}catch(e){}try{deepSetPageSize(store,0);}catch(e){}});}}catch(e){}try{var rootComp=null;if(app._instance)rootComp=app._instance;else if(app._container&&app._container._vnode&&app._container._vnode.component)rootComp=app._container._vnode.component;if(rootComp){var all=[];function collect(inst,d){if(!inst||d>25)return;all.push(inst);var st=inst.subTree;if(!st)return;if(st.component)collect(st.component,d+1);if(Array.isArray(st.children)){for(var i=0;i<st.children.length;i++){if(st.children[i]&&st.children[i].component)collect(st.children[i].component,d+1);}}if(st.dynamicChildren){for(var i=0;i<st.dynamicChildren.length;i++){if(st.dynamicChildren[i]&&st.dynamicChildren[i].component)collect(st.dynamicChildren[i].component,d+1);}}}collect(rootComp,0);for(var ci=0;ci<all.length;ci++){var comp=all[ci];try{if(comp.setupState)deepSetPageSize(comp.setupState,0);}catch(e){}try{if(comp.proxy&&comp.proxy.$data)deepSetPageSize(comp.proxy.$data,0);}catch(e){}}}}catch(e){}}return count;})()`
        const result = await new Promise<any>((resolve, reject) => {
          chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
            expression: expandCode,
            returnByValue: true,
          }, (res: any) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
            else resolve(res)
          })
        })
        if (!wasAttached) {
          await new Promise<void>((resolve) => {
            chrome.debugger.detach({ tabId }, () => {
              debuggerTabs.delete(tabId)
              if (debuggerTabs.size === 0) stopKeepalive()
              resolve()
            })
          })
        }
        const count = result?.result?.value || 0
        sendResponse({ count })
      } catch (e: any) {
        if (debuggerTabs.has(tabId)) {
          try { chrome.debugger.detach({ tabId }, () => { debuggerTabs.delete(tabId); if (debuggerTabs.size === 0) stopKeepalive() }) } catch {}
        }
        sendResponse({ count: 0 })
      }
    }).catch(() => { sendResponse({ count: 0 }) })
    return true
  }

  async function runSyncScript(tabId: number, syncType: string, syncId: string, data: Record<string, string>) {
    const wasAttached = debuggerTabs.has(tabId)
    if (!wasAttached) {
      await new Promise<void>((resolve, reject) => {
        chrome.debugger.attach({ tabId }, '1.3', () => {
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message || ''
            if (msg.includes('already attached')) { debuggerTabs.add(tabId); resolve() }
            else reject(new Error(msg))
          } else { debuggerTabs.add(tabId); resolve() }
        })
      })
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (sType: string, sId: string, sData: Record<string, string>) => {
          var existing = document.getElementById('__devtoolkit_sync__')
          if (existing) existing.remove()
          var el = document.createElement('devtoolkit-sync')
          el.id = '__devtoolkit_sync__'
          el.style.display = 'none'
          el.setAttribute('data-type', sType)
          el.setAttribute('data-id', sId)
          for (var k in sData) { if (sData.hasOwnProperty(k)) el.setAttribute('data-' + k, sData[k]) }
          document.body.appendChild(el)
        },
        args: [syncType, syncId, data],
      })
    } catch {
      if (!wasAttached && debuggerTabs.has(tabId)) {
        try { chrome.debugger.detach({ tabId }, () => { debuggerTabs.delete(tabId); if (debuggerTabs.size === 0) stopKeepalive() }) } catch {}
      }
      throw new Error('写入DOM数据失败')
    }
    try {
      const syncJsCode = await (await fetch(chrome.runtime.getURL('content/sync.js'))).text()
      const result = await new Promise<any>((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
          expression: syncJsCode,
          returnByValue: true,
        }, (res: any) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
          else resolve(res)
        })
      })
      if (!wasAttached) {
        await new Promise<void>((resolve) => {
          chrome.debugger.detach({ tabId }, () => {
            debuggerTabs.delete(tabId)
            if (debuggerTabs.size === 0) stopKeepalive()
            resolve()
          })
        })
      }
      const val = result?.result?.value
      if (val && val.ok === false) {
        return { success: false, error: val.err || '同步失败' }
      } else if (val && val.ok === true && val.diag) {
        const d = val.diag
        let info = `修改:${d.modified}项 组件:${d.compCount}个`
        if (d.paths.length > 0) info += ` [${d.paths.slice(0, 5).join(',')}]`
        if (d.compSamples.length > 0) {
          for (const cs of d.compSamples) {
            const arrKeys = Object.keys(cs).filter(k => typeof cs[k] === 'string' && cs[k].startsWith('Array('))
            if (arrKeys.length > 0) {
              info += ` ${cs.source}:${arrKeys[0]}=${cs[arrKeys[0]]}`
              if (cs[arrKeys[0] + '_keys']) info += `[${cs[arrKeys[0] + '_keys'].join(',')}]`
            }
          }
        }
        return { success: true, info }
      } else {
        return { success: true, info: JSON.stringify(val).substring(0, 300) }
      }
    } catch (e: any) {
      if (debuggerTabs.has(tabId)) {
        try { chrome.debugger.detach({ tabId }, () => { debuggerTabs.delete(tabId); if (debuggerTabs.size === 0) stopKeepalive() }) } catch {}
      }
      return { success: false, error: e.message || '同步失败' }
    }
  }

  if (message.type === 'syncTableToPage') {
    const domId = message.domId as string
    const headers = message.headers as string[]
    const rows = message.rows as string[][]
    getActiveTabId().then(async (tabId) => {
      if (!tabId) { sendResponse({ success: false, error: '无法获取标签页' }); return }
      const result = await runSyncScript(tabId, 'table', domId, { headers: JSON.stringify(headers), rows: JSON.stringify(rows) })
      sendResponse(result)
    }).catch(() => { sendResponse({ success: false, error: '无法获取标签页' }) })
    return true
  }

  if (message.type === 'syncListToPage') {
    const domId = message.domId as string
    const items = message.items as string[]
    getActiveTabId().then(async (tabId) => {
      if (!tabId) { sendResponse({ success: false, error: '无法获取标签页' }); return }
      const result = await runSyncScript(tabId, 'list', domId, { items: JSON.stringify(items) })
      sendResponse(result)
    }).catch(() => { sendResponse({ success: false, error: '无法获取标签页' }) })
    return true
  }

  return false
})

try {
  chrome.debugger.onEvent.addListener((source, method, params) => {
    if (!source.tabId) return
    const tabId = source.tabId
    const p = params as any

    if (method === 'Network.requestWillBeSentExtraInfo') {
      const extraHeaders: Record<string, string> = {}
      if (p.headers) {
        for (const [k, v] of Object.entries(p.headers)) {
          extraHeaders[k] = String(v)
        }
      }

      const list = capturedRequests.get(tabId)
      const entry = list?.find(r => r.id === p.requestId)
      if (entry) {
        mergeHeaders(entry.headers, extraHeaders, true)
      } else {
        const existing = pendingExtraHeaders.get(p.requestId)
        if (existing) {
          mergeHeaders(existing, extraHeaders, true)
        } else {
          pendingExtraHeaders.set(p.requestId, extraHeaders)
        }
      }
    }

    if (method === 'Network.requestWillBeSent') {
      const reqType = p.type as string
      if (reqType !== 'XHR' && reqType !== 'Fetch') return

      const headers: Record<string, string> = {}
      if (p.request?.headers) {
        for (const [k, v] of Object.entries(p.request.headers)) {
          headers[k] = String(v)
        }
      }

      const extraHeaders = pendingExtraHeaders.get(p.requestId)
      if (extraHeaders) {
        mergeHeaders(headers, extraHeaders, true)
        pendingExtraHeaders.delete(p.requestId)
      }

      let requestBody: string | null = null
      if (p.request?.postData) {
        requestBody = p.request.postData
      }

      const ct = headers['Content-Type'] || headers['content-type'] || null

      const existingList = capturedRequests.get(tabId)
      const existing = existingList?.find(r => r.id === p.requestId)
      if (existing) {
        existing.url = p.request.url
        existing.method = p.request.method
        mergeHeaders(existing.headers, headers, false)
        existing.requestBody = requestBody
        existing.contentType = ct
        return
      }

      const entry: CapturedEntry = {
        id: p.requestId,
        url: p.request.url,
        method: p.request.method,
        type: reqType === 'Fetch' ? 'fetch' : 'xhr',
        timestamp: p.wallTime ? p.wallTime * 1000 : Date.now(),
        requestBody,
        contentType: ct,
        headers,
        status: null,
        tabId,
        responseHeaders: {},
        responseBody: null,
      }

      if (!capturedRequests.has(tabId)) {
        capturedRequests.set(tabId, [])
      }
      const list = capturedRequests.get(tabId)!
      list.unshift(entry)
      if (list.length > MAX_CAPTURED) list.length = MAX_CAPTURED
    }

    if (method === 'Network.responseReceived') {
      const list = capturedRequests.get(tabId)
      if (!list) return

      const entry = list.find(r => r.id === p.requestId)
      if (!entry) return

      const respHeaders: Record<string, string> = {}
      if (p.response?.headers) {
        for (const [k, v] of Object.entries(p.response.headers)) {
          respHeaders[k] = String(v)
        }
      }

      entry.status = p.response?.status || null
      entry.responseHeaders = respHeaders
    }

    if (method === 'Network.loadingFinished') {
      const list = capturedRequests.get(tabId)
      if (!list) return

      const entry = list.find(r => r.id === p.requestId)
      if (!entry) return

      chrome.debugger.sendCommand(source, 'Network.getResponseBody', {
        requestId: p.requestId,
      }, (result: any) => {
        if (chrome.runtime.lastError) return
        if (result?.body) {
          if (result.base64Encoded) {
            try {
              entry.responseBody = atob(result.body)
            } catch {
              entry.responseBody = '[Binary Data]'
            }
          } else {
            entry.responseBody = result.body
          }
        }
      })
    }

    if (method === 'Network.loadingFailed') {
      const list = capturedRequests.get(tabId)
      if (!list) return

      const entry = list.find(r => r.id === p.requestId)
      if (entry && entry.status === null) {
        entry.status = 0
      }
    }
  })
} catch { /* ignore */ }

try {
  chrome.debugger.onDetach.addListener((source) => {
    if (source.tabId) {
      debuggerTabs.delete(source.tabId)
      if (debuggerTabs.size === 0) stopKeepalive()
    }
  })
} catch { /* ignore */ }

chrome.tabs.onRemoved.addListener((tabId) => {
  capturedRequests.delete(tabId)
  if (debuggerTabs.has(tabId)) {
    debuggerTabs.delete(tabId)
    if (debuggerTabs.size === 0) stopKeepalive()
  }
})

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null
  }
})
