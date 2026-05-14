async function applyDisplayMode(mode: string) {
  if (mode === 'sidepanel') {
    await chrome.action.setPopup({ popup: '' })
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } else {
    await chrome.action.setPopup({ popup: 'src/popup/index.html' })
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  }
}

chrome.storage.local.get('devtoolkit-display-mode', (result) => {
  const mode = (result['devtoolkit-display-mode'] as string) || 'sidepanel'
  applyDisplayMode(mode)
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes['devtoolkit-display-mode']) {
    const mode = changes['devtoolkit-display-mode'].newValue as string
    applyDisplayMode(mode)
  }
})
