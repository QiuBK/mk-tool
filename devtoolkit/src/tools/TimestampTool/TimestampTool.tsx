import { useState, useEffect } from 'react'
import { timestampConvert, dateToTimestamp, getCurrentTimestamp } from '../../services/timestampService'
import { saveHistoryItem } from '../../services/historyService'
import { CopyButton } from '../../components/CopyButton/CopyButton'
import styles from './TimestampTool.module.css'

export function TimestampTool() {
  const [tsInput, setTsInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [result, setResult] = useState<{ unixSeconds: number; unixMillis: number; local: string; utc: string; relative: string } | null>(null)
  const [error, setError] = useState('')
  const [current, setCurrent] = useState<{ unixSeconds: number; unixMillis: number; iso8601: string } | null>(null)

  useEffect(() => {
    const update = () => {
      const r = getCurrentTimestamp()
      if (r.success) setCurrent(r.data)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleTsConvert = () => {
    setError('')
    const num = Number(tsInput)
    if (isNaN(num)) { setError('无效的时间戳格式'); return }
    const r = timestampConvert(num)
    if (r.success) {
      setResult(r.data)
      saveHistoryItem({ toolType: 'timestamp', input: tsInput, output: r.data.local })
    } else {
      setError(r.error.message)
    }
  }

  const handleDateConvert = () => {
    setError('')
    const r = dateToTimestamp(dateInput)
    if (r.success) {
      setResult(r.data)
      saveHistoryItem({ toolType: 'timestamp', input: dateInput, output: String(r.data.unixSeconds) })
    } else {
      setError(r.error.message)
    }
  }

  return (
    <div className={styles.tool}>
      {current && (
        <div className={styles.current}>
          <div className={styles.currentItem}><span className={styles.currentLabel}>当前秒级</span><code>{current.unixSeconds}</code><CopyButton text={String(current.unixSeconds)} label="复制" /></div>
          <div className={styles.currentItem}><span className={styles.currentLabel}>当前毫秒级</span><code>{current.unixMillis}</code><CopyButton text={String(current.unixMillis)} label="复制" /></div>
          <div className={styles.currentItem}><span className={styles.currentLabel}>ISO 8601</span><code>{current.iso8601}</code><CopyButton text={current.iso8601} label="复制" /></div>
        </div>
      )}
      <div className={styles.row}>
        <div className={styles.section}>
          <label className={styles.label}>时间戳 → 日期</label>
          <div className={styles.inputRow}>
            <input type="text" className={styles.input} value={tsInput} onChange={(e) => setTsInput(e.target.value)} placeholder="输入时间戳（秒或毫秒）" />
            <button onClick={handleTsConvert} disabled={!tsInput.trim()}>转换</button>
          </div>
        </div>
        <div className={styles.section}>
          <label className={styles.label}>日期 → 时间戳</label>
          <div className={styles.inputRow}>
            <input type="datetime-local" className={styles.input} value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
            <button onClick={handleDateConvert} disabled={!dateInput.trim()}>转换</button>
          </div>
        </div>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {result && (
        <div className={styles.result}>
          <div className={styles.resultRow}><span>秒级时间戳</span><code>{result.unixSeconds}</code><CopyButton text={String(result.unixSeconds)} label="复制" /></div>
          <div className={styles.resultRow}><span>毫秒级时间戳</span><code>{result.unixMillis}</code><CopyButton text={String(result.unixMillis)} label="复制" /></div>
          <div className={styles.resultRow}><span>本地时间</span><code>{result.local}</code><CopyButton text={result.local} label="复制" /></div>
          <div className={styles.resultRow}><span>UTC时间</span><code>{result.utc}</code><CopyButton text={result.utc} label="复制" /></div>
          <div className={styles.resultRow}><span>相对时间</span><code>{result.relative}</code></div>
        </div>
      )}
    </div>
  )
}

export default TimestampTool
