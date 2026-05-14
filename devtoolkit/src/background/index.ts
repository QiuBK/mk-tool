chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })

function getDisplayMode(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('devtoolkit-display-mode', (result) => {
      resolve((result['devtoolkit-display-mode'] as string) || 'sidepanel')
    })
  })
}

function openPopupWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL('src/popup/index.html'),
    type: 'popup',
    width: 500,
    height: 640,
  })
}

function openSidePanel(tabId: number) {
  chrome.sidePanel.open({ tabId })
}

chrome.action.onClicked.addListener((tab) => {
  getDisplayMode().then((mode) => {
    if (mode === 'popup') {
      openPopupWindow()
    } else if (tab.id != null) {
      openSidePanel(tab.id)
    }
  })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'setDisplayMode') {
    const mode = message.mode as string
    chrome.storage.local.set({ 'devtoolkit-display-mode': mode })
    if (mode === 'popup') {
      openPopupWindow()
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          openSidePanel(tabs[0].id)
        }
      })
    }
    sendResponse({ ok: true })
  }
  return true
})
