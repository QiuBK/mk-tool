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

  if (message.type === 'syncTableToPage') {
    const domId = message.domId as string
    const headers = message.headers as string[]
    const rows = message.rows as string[][]
    getActiveTabId().then((tabId) => {
      if (!tabId) {
        sendResponse({ success: false, error: '无法获取标签页' })
        return
      }
      chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (id: string, hdrJson: string, rowsJson: string) => {
          var newHeaders: string[] = JSON.parse(hdrJson);
          var newRows: string[][] = JSON.parse(rowsJson);
          var table = document.querySelector('table[data-devtoolkit-id="' + id + '"]');
          if (!table) return;

          function setElementValue(el: any, val: string) {
            el.focus();
            el.dispatchEvent(new Event('focus', { bubbles: true }));
            if (el.tagName === 'SELECT') {
              var found = false;
              var opts = el.options;
              for (var i = 0; i < opts.length; i++) {
                if (opts[i].textContent.trim() === val || opts[i].value === val) { found = true; break; }
              }
              if (!found) {
                var o = document.createElement('option');
                o.value = val; o.textContent = val; el.appendChild(o);
              }
              var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
              if (setter && setter.set) setter.set.call(el, val); else el.value = val;
              var tracker = (el as any)._valueTracker;
              if (tracker) { tracker.setValue(''); }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el.tagName === 'TEXTAREA') {
              el.focus(); el.select();
              var ok = false;
              try { document.execCommand('selectAll'); } catch(e) {}
              try { ok = document.execCommand('insertText', false, val); } catch(e) {}
              if (!ok) {
                var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
                if (setter && setter.set) setter.set.call(el, val); else el.value = val;
                var tracker = (el as any)._valueTracker;
                if (tracker) { tracker.setValue(''); }
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
            } else {
              el.focus();
              var nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
              if (nativeSetter && nativeSetter.set) nativeSetter.set.call(el, ''); else el.value = '';
              var tracker = (el as any)._valueTracker;
              if (tracker) { tracker.setValue(''); }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.select();
              var ok = false;
              try { document.execCommand('selectAll'); } catch(e) {}
              try { ok = document.execCommand('insertText', false, val); } catch(e) {}
              if (!ok) {
                if (nativeSetter && nativeSetter.set) nativeSetter.set.call(el, val); else el.value = val;
                var tracker2 = (el as any)._valueTracker;
                if (tracker2) { tracker2.setValue(''); }
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }

          function setCellContent(cell: any, text: string) {
            var inputs = cell.querySelectorAll('input');
            var selects = cell.querySelectorAll('select');
            var textareas = cell.querySelectorAll('textarea');
            if (inputs.length > 0) for (var i = 0; i < inputs.length; i++) setElementValue(inputs[i], text);
            if (selects.length > 0) for (var i = 0; i < selects.length; i++) setElementValue(selects[i], text);
            if (textareas.length > 0) for (var i = 0; i < textareas.length; i++) setElementValue(textareas[i], text);
            if (inputs.length === 0 && selects.length === 0 && textareas.length === 0) {
              cell.textContent = text;
            }
          }

          if (newHeaders.length > 0) {
            var hCells = table.querySelectorAll('thead th, thead td');
            for (var i = 0; i < newHeaders.length && i < hCells.length; i++) {
              setCellContent(hCells[i], newHeaders[i]);
            }
          }
          var tbody = table.querySelector('tbody');
          if (!tbody) { tbody = document.createElement('tbody'); table.appendChild(tbody); }
          var existingRows = tbody.querySelectorAll(':scope > tr');
          var colCount = newHeaders.length || (newRows[0] ? newRows[0].length : 1);
          for (var ri = 0; ri < newRows.length; ri++) {
            var tr;
            if (ri < existingRows.length) { tr = existingRows[ri]; }
            else {
              tr = document.createElement('tr');
              for (var c = 0; c < colCount; c++) { var td = document.createElement('td'); tr.appendChild(td); }
              tbody.appendChild(tr);
            }
            var cells = tr.querySelectorAll('td, th');
            for (var ci = 0; ci < newRows[ri].length && ci < cells.length; ci++) {
              setCellContent(cells[ci], newRows[ri][ci]);
            }
          }
          for (var ri = existingRows.length - 1; ri >= newRows.length; ri--) {
            existingRows[ri].remove();
          }
        },
        args: [domId, JSON.stringify(headers), JSON.stringify(rows)],
      }).then(() => {
        sendResponse({ success: true })
      }).catch((e) => {
        sendResponse({ success: false, error: e.message || '脚本注入失败' })
      })
    }).catch(() => {
      sendResponse({ success: false, error: '无法获取标签页' })
    })
    return true
  }

  if (message.type === 'syncListToPage') {
    const domId = message.domId as string
    const items = message.items as string[]
    getActiveTabId().then((tabId) => {
      if (!tabId) {
        sendResponse({ success: false, error: '无法获取标签页' })
        return
      }
      chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (id: string, itemsJson: string) => {
          var newItems: string[] = JSON.parse(itemsJson);
          var list = document.querySelector('ul[data-devtoolkit-id="' + id + '"], ol[data-devtoolkit-id="' + id + '"]');
          if (!list) return;

          function setElementValue(el: any, val: string) {
            el.focus();
            el.dispatchEvent(new Event('focus', { bubbles: true }));
            if (el.tagName === 'SELECT') {
              var found = false;
              var opts = el.options;
              for (var i = 0; i < opts.length; i++) {
                if (opts[i].textContent.trim() === val || opts[i].value === val) { found = true; break; }
              }
              if (!found) {
                var o = document.createElement('option');
                o.value = val; o.textContent = val; el.appendChild(o);
              }
              var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
              if (setter && setter.set) setter.set.call(el, val); else el.value = val;
              var tracker = (el as any)._valueTracker;
              if (tracker) { tracker.setValue(''); }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el.tagName === 'TEXTAREA') {
              el.focus(); el.select();
              var ok = false;
              try { document.execCommand('selectAll'); } catch(e) {}
              try { ok = document.execCommand('insertText', false, val); } catch(e) {}
              if (!ok) {
                var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
                if (setter && setter.set) setter.set.call(el, val); else el.value = val;
                var tracker = (el as any)._valueTracker;
                if (tracker) { tracker.setValue(''); }
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
            } else {
              el.focus();
              var nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
              if (nativeSetter && nativeSetter.set) nativeSetter.set.call(el, ''); else el.value = '';
              var tracker = (el as any)._valueTracker;
              if (tracker) { tracker.setValue(''); }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.select();
              var ok = false;
              try { document.execCommand('selectAll'); } catch(e) {}
              try { ok = document.execCommand('insertText', false, val); } catch(e) {}
              if (!ok) {
                if (nativeSetter && nativeSetter.set) nativeSetter.set.call(el, val); else el.value = val;
                var tracker2 = (el as any)._valueTracker;
                if (tracker2) { tracker2.setValue(''); }
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }

          function setItemContent(li: any, text: string) {
            var inputs = li.querySelectorAll('input');
            var selects = li.querySelectorAll('select');
            var textareas = li.querySelectorAll('textarea');
            if (inputs.length > 0) for (var i = 0; i < inputs.length; i++) setElementValue(inputs[i], text);
            if (selects.length > 0) for (var i = 0; i < selects.length; i++) setElementValue(selects[i], text);
            if (textareas.length > 0) for (var i = 0; i < textareas.length; i++) setElementValue(textareas[i], text);
            if (inputs.length === 0 && selects.length === 0 && textareas.length === 0) {
              li.textContent = text;
            }
          }

          var existingItems = list.querySelectorAll(':scope > li');

          for (var i = 0; i < newItems.length; i++) {
            if (i < existingItems.length) {
              setItemContent(existingItems[i], newItems[i]);
            } else {
              var li = document.createElement('li');
              li.textContent = newItems[i];
              list.appendChild(li);
            }
          }

          for (var i = existingItems.length - 1; i >= newItems.length; i--) {
            existingItems[i].remove();
          }
        },
        args: [domId, JSON.stringify(items)],
      }).then(() => {
        sendResponse({ success: true })
      }).catch((e) => {
        sendResponse({ success: false, error: e.message || '脚本注入失败' })
      })
    }).catch(() => {
      sendResponse({ success: false, error: '无法获取标签页' })
    })
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
