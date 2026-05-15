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
    const syncJsCode = `(function(){var el=document.getElementById('__devtoolkit_sync__');if(!el)return{ok:false,err:'no sync element'};var type=el.getAttribute('data-type');var id=el.getAttribute('data-id')||'';var headersStr=el.getAttribute('data-headers')||'[]';var rowsStr=el.getAttribute('data-rows')||'[]';var itemsStr=el.getAttribute('data-items')||'[]';el.remove();var _g=false;function persistSelect(se,dv){function ef(){if(_g)return;_g=true;try{var f=false;for(var i=0;i<se.options.length;i++){if(se.options[i].value===dv){f=true;break;}}if(!f){var o=document.createElement('option');o.value=dv;o.textContent=dv;se.appendChild(o);}if(se.value!==dv){var s=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');if(s&&s.set)s.set.call(se,dv);else se.value=dv;}}catch(e){}_g=false;}ef();var obs=new MutationObserver(function(){ef();});obs.observe(se,{childList:true,subtree:true,attributes:true,attributeFilter:['value','selected']});setTimeout(function(){obs.disconnect();},60000);}function setVal(el,val){el.focus();if(el.tagName==='SELECT'){var found=false;for(var i=0;i<el.options.length;i++){if(el.options[i].textContent.trim()===val||el.options[i].value===val){found=true;break;}}if(!found){var o=document.createElement('option');o.value=val;o.textContent=val;el.appendChild(o);}var setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');if(setter&&setter.set)setter.set.call(el,val);else el.value=val;if(el._valueTracker)el._valueTracker.setValue('');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));persistSelect(el,val);}else{el.focus();var ns=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');if(ns&&ns.set)ns.set.call(el,'');else el.value='';if(el._valueTracker)el._valueTracker.setValue('');el.dispatchEvent(new Event('input',{bubbles:true}));el.select();var ok=false;try{document.execCommand('selectAll');}catch(e){}try{ok=document.execCommand('insertText',false,val);}catch(e){}if(!ok){if(ns&&ns.set)ns.set.call(el,val);else el.value=val;if(el._valueTracker)el._valueTracker.setValue('');el.dispatchEvent(new Event('input',{bubbles:true}));}el.dispatchEvent(new Event('change',{bubbles:true}));}el.dispatchEvent(new Event('blur',{bubbles:true}));}function setCell(cell,text){var ins=cell.querySelectorAll('input');var sels=cell.querySelectorAll('select');var tas=cell.querySelectorAll('textarea');for(var i=0;i<ins.length;i++)setVal(ins[i],text);for(var i=0;i<sels.length;i++)setVal(sels[i],text);for(var i=0;i<tas.length;i++)setVal(tas[i],text);if(!ins.length&&!sels.length&&!tas.length)cell.textContent=text;}var info={found:false,headers:0,rows:0,selects:0,inputs:0,items:0};if(type==='table'){var nH=JSON.parse(headersStr);var nR=JSON.parse(rowsStr);var table=document.querySelector('table[data-devtoolkit-id="'+id+'"]');if(!table){var aT=document.querySelectorAll('table');table=aT.length>0?aT[0]:null;}if(!table)return{ok:false,err:'table not found: '+id};info.found=true;if(nH.length>0){var hc=table.querySelectorAll('thead th, thead td');for(var i=0;i<nH.length&&i<hc.length;i++){setCell(hc[i],nH[i]);info.headers++;}}var tbody=table.querySelector('tbody');if(!tbody){tbody=document.createElement('tbody');table.appendChild(tbody);}var er=tbody.querySelectorAll(':scope > tr');var cc=nH.length||(nR[0]?nR[0].length:1);for(var ri=0;ri<nR.length;ri++){var tr;if(ri<er.length)tr=er[ri];else{tr=document.createElement('tr');for(var c=0;c<cc;c++){var td=document.createElement('td');tr.appendChild(td);}tbody.appendChild(tr);}var cells=tr.querySelectorAll('td, th');for(var ci=0;ci<nR[ri].length&&ci<cells.length;ci++){setCell(cells[ci],nR[ri][ci]);info.selects+=cells[ci].querySelectorAll('select').length;info.inputs+=cells[ci].querySelectorAll('input').length;}info.rows++;}for(var ri=er.length-1;ri>=nR.length;ri--)er[ri].remove();}if(type==='list'){var nI=JSON.parse(itemsStr);var list=document.querySelector('ul[data-devtoolkit-id="'+id+'"], ol[data-devtoolkit-id="'+id+'"]');if(!list){var aL=document.querySelectorAll('ul, ol');list=aL.length>0?aL[0]:null;}if(!list)return{ok:false,err:'list not found: '+id};info.found=true;var ei=list.querySelectorAll(':scope > li');for(var i=0;i<nI.length;i++){if(i<ei.length)setCell(ei[i],nI[i]);else{var li=document.createElement('li');li.textContent=nI[i];list.appendChild(li);}info.items++;}for(var i=ei.length-1;i>=nI.length;i--)ei[i].remove();}return info;})()`
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
      } else if (val && val.found) {
        const detail = val.selects > 0 ? `找到表格,更新${val.rows}行${val.headers}列,${val.selects}个select,${val.inputs}个input` : `找到表格,更新${val.rows}行${val.headers}列`
        return { success: true, info: detail }
      } else {
        return { success: true }
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
