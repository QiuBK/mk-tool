let popupWindowId: number | null = null

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
  return true
})

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null
  }
})
