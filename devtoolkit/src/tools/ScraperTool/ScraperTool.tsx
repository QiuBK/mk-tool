import { useState } from 'react'
import { scrapeCurrentPage, tableToText, listToText, tableToCsv, exportTableToExcel } from '../../services/scraperService'
import { CopyButton } from '../../components/CopyButton/CopyButton'
import type { ScrapeResult, ScrapedTable, ScrapedList } from '../../types'
import styles from './ScraperTool.module.css'

export function ScraperTool() {
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'tables' | 'lists'>('tables')

  const handleScrape = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await scrapeCurrentPage()
      setResult(data)
      setActiveTab(data.tables.length > 0 ? 'tables' : 'lists')
    } catch (e) {
      setError(e instanceof Error ? e.message : '提取失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAll = () => {
    if (!result) return
    const parts: string[] = []
    result.tables.forEach((t) => parts.push(tableToText(t)))
    result.lists.forEach((l) => parts.push(listToText(l)))
    navigator.clipboard.writeText(parts.join('\n\n'))
  }

  return (
    <div className={styles.tool}>
      <div className={styles.section}>
        <label className={styles.label}>网页数据抓取</label>
        <p className={styles.desc}>提取当前页面中的表格和列表数据，支持复制和导出</p>
      </div>
      <div className={styles.actions}>
        <button className={styles.scrapeBtn} onClick={handleScrape} disabled={loading}>
          {loading ? '提取中...' : '🔍 抓取当前页面'}
        </button>
        {result && (
          <button className={styles.copyAllBtn} onClick={handleCopyAll}>
            📋 复制全部
          </button>
        )}
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {result && (
        <div className={styles.results}>
          <div className={styles.pageInfo}>
            <span className={styles.pageTitle}>{result.title}</span>
            <span className={styles.pageUrl}>{result.url}</span>
          </div>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'tables' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('tables')}
            >
              表格 ({result.tables.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'lists' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('lists')}
            >
              列表 ({result.lists.length})
            </button>
          </div>
          {activeTab === 'tables' && (
            <div className={styles.dataList}>
              {result.tables.length === 0 && <p className={styles.empty}>未找到表格数据</p>}
              {result.tables.map((table, i) => (
                <TableCard key={i} table={table} index={i} />
              ))}
            </div>
          )}
          {activeTab === 'lists' && (
            <div className={styles.dataList}>
              {result.lists.length === 0 && <p className={styles.empty}>未找到列表数据</p>}
              {result.lists.map((list, i) => (
                <ListCard key={i} list={list} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TableCard({ table, index }: { table: ScrapedTable; index: number }) {
  const [expanded, setExpanded] = useState(true)
  const maxPreviewRows = 5
  const previewRows = expanded ? table.rows : table.rows.slice(0, maxPreviewRows)
  const hasMore = table.rows.length > maxPreviewRows

  const handleCopyCsv = () => {
    navigator.clipboard.writeText(tableToCsv(table))
  }

  const handleExportExcel = async () => {
    try {
      const name = table.caption || `table-${index + 1}`
      await exportTableToExcel(table, `${name}.xlsx`)
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          {table.caption || `表格 ${index + 1}`}
          <span className={styles.cardMeta}>{table.rows.length} 行 × {table.headers.length || table.rows[0]?.length || 0} 列</span>
        </span>
        <div className={styles.cardActions}>
          <CopyButton text={tableToText(table)} label="复制" />
          <button className={styles.smallBtn} onClick={handleCopyCsv}>CSV</button>
          <button className={styles.smallBtn} onClick={handleExportExcel}>Excel</button>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          {table.headers.length > 0 && (
            <thead>
              <tr>{table.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
          )}
          <tbody>
            {previewRows.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && !expanded && (
        <button className={styles.expandBtn} onClick={() => setExpanded(true)}>
          显示全部 {table.rows.length} 行
        </button>
      )}
      {expanded && hasMore && (
        <button className={styles.expandBtn} onClick={() => setExpanded(false)}>
          收起
        </button>
      )}
    </div>
  )
}

function ListCard({ list, index }: { list: ScrapedList; index: number }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          {list.label || `列表 ${index + 1}`}
          <span className={styles.cardMeta}>{list.source.toUpperCase()} · {list.items.length} 项</span>
        </span>
        <div className={styles.cardActions}>
          <CopyButton text={listToText(list)} label="复制" />
        </div>
      </div>
      <ol className={styles.listItems}>
        {list.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    </div>
  )
}

export default ScraperTool
