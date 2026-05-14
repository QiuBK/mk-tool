import { useEffect, useCallback, Suspense, lazy } from 'react'
import { useAppStore } from './store'
import { TOOL_LIST } from './types'
import { ToolNav } from './components/ToolNav/ToolNav'
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle'
import { HistoryPanel } from './components/HistoryPanel/HistoryPanel'
import { DisplayModeToggle } from './components/DisplayModeToggle/DisplayModeToggle'

const JsonTool = lazy(() => import('./tools/JsonTool/JsonTool'))
const Base64Tool = lazy(() => import('./tools/Base64Tool/Base64Tool'))
const TimestampTool = lazy(() => import('./tools/TimestampTool/TimestampTool'))
const CronTool = lazy(() => import('./tools/CronTool/CronTool'))
const UrlTool = lazy(() => import('./tools/UrlTool/UrlTool'))
const ColorTool = lazy(() => import('./tools/ColorTool/ColorTool'))
const HashTool = lazy(() => import('./tools/HashTool/HashTool'))
import styles from './App.module.css'

const TOOL_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC>> = {
  json: JsonTool,
  base64: Base64Tool,
  timestamp: TimestampTool,
  cron: CronTool,
  url: UrlTool,
  color: ColorTool,
  hash: HashTool,
}

const isSidepanel = typeof window !== 'undefined' && window.location.pathname.includes('sidepanel')

export default function App() {
  const { activeTool, setActiveTool, historyOpen, setHistoryOpen, displayMode } = useAppStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key >= '1' && e.key <= '7') {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        if (TOOL_LIST[index]) {
          setActiveTool(TOOL_LIST[index].type)
        }
      }
    },
    [setActiveTool],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (isSidepanel && displayMode === 'popup') {
    return (
      <div className={styles.switchedOverlay}>
        <div className={styles.switchedCard}>
          <div className={styles.switchedIcon}>🪟</div>
          <p className={styles.switchedTitle}>已切换为浮窗模式</p>
          <p className={styles.switchedDesc}>浮窗已打开，可关闭此侧边栏</p>
          <button className={styles.switchedBtn} onClick={() => {
            const btn = document.querySelector('[aria-label="Close"]') as HTMLElement
            if (btn) btn.click()
          }}>关闭侧边栏</button>
        </div>
      </div>
    )
  }

  const ActiveComponent = TOOL_COMPONENTS[activeTool] || JsonTool

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>DevToolKit</h1>
        <div className={styles.headerActions}>
          <DisplayModeToggle />
          <ThemeToggle />
          <button className={styles.historyBtn} onClick={() => setHistoryOpen(!historyOpen)}>
            📋 历史
          </button>
        </div>
      </header>
      <div className={styles.body}>
        <ToolNav />
        <main className={styles.content}>
          <Suspense fallback={<div className={styles.loading}>加载中...</div>}>
            <ActiveComponent />
          </Suspense>
        </main>
        {historyOpen && <HistoryPanel />}
      </div>
    </div>
  )
}
