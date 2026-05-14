import { useState } from 'react'
import { useAppStore } from '../../store'
import styles from './DisplayModeToggle.module.css'

export function DisplayModeToggle() {
  const { displayMode, setDisplayMode } = useAppStore()
  const [hint, setHint] = useState('')

  const handleToggle = () => {
    const next = displayMode === 'sidepanel' ? 'popup' : 'sidepanel'
    setDisplayMode(next)

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'setDisplayMode', mode: next })
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 'devtoolkit-display-mode': next })
    }

    if (next === 'popup') {
      setHint('浮窗已打开')
    } else {
      setHint('已切换侧边栏')
      setTimeout(() => {
        try { window.close() } catch { /* ignore */ }
      }, 600)
    }
    setTimeout(() => setHint(''), 2000)
  }

  return (
    <button
      className={styles.toggle}
      onClick={handleToggle}
      title={displayMode === 'sidepanel' ? '切换为浮窗模式' : '切换为侧边栏模式'}
    >
      {hint ? <span className={styles.hint}>{hint}</span> : (displayMode === 'sidepanel' ? '🪟' : '📌')}
    </button>
  )
}
