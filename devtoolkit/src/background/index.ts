chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes['devtoolkit-display-mode']) {
    const mode = changes['devtoolkit-display-mode'].newValue
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: mode === 'sidepanel' })
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('devtoolkit-display-mode', (result) => {
    const mode = result['devtoolkit-display-mode'] || 'sidepanel'
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: mode === 'sidepanel' })
  })
})
