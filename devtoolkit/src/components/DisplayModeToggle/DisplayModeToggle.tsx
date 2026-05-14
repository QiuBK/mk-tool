import { useAppStore } from '../../store'
import styles from './DisplayModeToggle.module.css'

export function DisplayModeToggle() {
  const { displayMode, setDisplayMode } = useAppStore()

  const handleToggle = () => {
    const next = displayMode === 'sidepanel' ? 'popup' : 'sidepanel'
    setDisplayMode(next)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 'devtoolkit-display-mode': next })
    }
  }

  return (
    <button
      className={styles.toggle}
      onClick={handleToggle}
      title={displayMode === 'sidepanel' ? '当前：侧边栏模式，点击切换为浮窗' : '当前：浮窗模式，点击切换为侧边栏'}
    >
      {displayMode === 'sidepanel' ? '📌' : '🪟'}
    </button>
  )
}
