let popupWindowId: number | null = null
const capturedRequests: Map<number, { id: string; url: string; method: string; type: 'xhr' | 'fetch'; timestamp: number; requestBody: string | null; contentType: string | null; headers: Record<string, string>; status: number | null; tabId: number }[]> = new Map()
const MAX_CAPTURED = 200

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

chrome.scripting.registerContentScripts([{
  id: 'devtoolkit-interceptor',
  matches: ['<all_urls>'],
  js: ['content/interceptor.js'],
  runAt: 'document_start',
  world: 'MAIN',
}]).catch(() => {})

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
  }

  if (message.type === 'getCapturedRequests') {
    const tabId = message.tabId as number
    const requests = capturedRequests.get(tabId) || []
    sendResponse({ requests })
  }

  if (message.type === 'clearCapturedRequests') {
    const tabId = message.tabId as number
    capturedRequests.delete(tabId)
    sendResponse({ ok: true })
  }

  return true
})

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null
  }
})

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return
    const url = new URL(details.url)
    const isApi = url.pathname.includes('/api/') ||
      url.pathname.includes('/v1/') ||
      url.pathname.includes('/v2/') ||
      url.pathname.includes('/v3/') ||
      url.pathname.endsWith('.json') ||
      details.type === 'xmlhttprequest'

    if (!isApi) return

    let requestBody: string | null = null
    if (details.requestBody) {
      if (details.requestBody.raw && details.requestBody.raw.length > 0) {
        try {
          const decoder = new TextDecoder()
          requestBody = details.requestBody.raw
            .map((buf) => decoder.decode(buf.bytes))
            .join('')
        } catch { /* ignore */ }
      }
      if (details.requestBody.formData) {
        requestBody = JSON.stringify(details.requestBody.formData)
      }
    }

    const entry = {
      id: details.requestId,
      url: details.url,
      method: details.method,
      type: 'xhr' as const,
      timestamp: details.timeStamp,
      requestBody,
      contentType: null as string | null,
      headers: {} as Record<string, string>,
      status: null as number | null,
      tabId: details.tabId,
    }

    if (!capturedRequests.has(details.tabId)) {
      capturedRequests.set(details.tabId, [])
    }
    const list = capturedRequests.get(details.tabId)!
    list.unshift(entry)
    if (list.length > MAX_CAPTURED) list.length = MAX_CAPTURED
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
)

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId < 0) return
    const list = capturedRequests.get(details.tabId)
    if (!list) return
    const entry = list.find((r) => r.id === details.requestId)
    if (entry) {
      entry.status = details.statusCode
    }
  },
  { urls: ['<all_urls>'] }
)

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.tabId < 0) return
    const list = capturedRequests.get(details.tabId)
    if (!list) return
    const entry = list.find((r) => r.id === details.requestId)
    if (entry && details.requestHeaders) {
      const skipHeaders = new Set(['host', 'connection', 'content-length', 'accept-encoding'])
      const headers: Record<string, string> = {}
      details.requestHeaders.forEach((h) => {
        const key = h.name.toLowerCase()
        if (!skipHeaders.has(key) && h.value) {
          headers[h.name] = h.value
        }
      })
      entry.headers = headers
      const ct = details.requestHeaders.find((h) => h.name.toLowerCase() === 'content-type')
      if (ct) entry.contentType = ct.value || null
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders', 'extraHeaders']
)

chrome.tabs.onRemoved.addListener((tabId) => {
  capturedRequests.delete(tabId)
})
