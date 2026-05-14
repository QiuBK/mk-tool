import { useEffect, useState } from 'react'
import { getHistoryList, deleteHistoryItem, clearHistory } from '../../services/historyService'
import { useAppStore } from '../../store'
import type { HistoryItem, ToolType } from '../../types'
import styles from './HistoryPanel.module.css'

const TOOL_LABELS: Record<ToolType, string> = {
  json: 'JSON',
  base64: 'Base64',
  timestamp: '时间戳',
  cron: 'Cron',
  url: 'URL',
  color: '颜色',
  hash: '哈希',
  scraper: '抓取',
}

export function HistoryPanel() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const { setActiveTool, setHistoryOpen } = useAppStore()

  const loadHistory = async () => {
    const result = await getHistoryList()
    setItems(result.items)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleItemClick = (item: HistoryItem) => {
    setActiveTool(item.toolType)
    setHistoryOpen(false)
  }

  const handleDelete = async (id: string) => {
    await deleteHistoryItem(id)
    await loadHistory()
  }

  const handleClear = async () => {
    await clearHistory()
    setItems([])
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>历史记录</h3>
        <button className={styles.clearBtn} onClick={handleClear}>清空</button>
      </div>
      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.id} className={styles.item} onClick={() => handleItemClick(item)}>
            <div className={styles.itemHeader}>
              <span className={styles.toolBadge}>{TOOL_LABELS[item.toolType]}</span>
              <span className={styles.time}>{formatTime(item.createdAt)}</span>
            </div>
            <div className={styles.itemPreview}>{item.input.substring(0, 80)}</div>
            <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}>×</button>
          </div>
        ))}
        {items.length === 0 && <div className={styles.empty}>暂无历史记录</div>}
      </div>
    </div>
  )
}
