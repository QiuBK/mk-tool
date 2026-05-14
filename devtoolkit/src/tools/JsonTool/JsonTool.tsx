import { useState, useDeferredValue, useMemo } from 'react'
import { jsonFormat, jsonMinify, jsonValidate, jsonExportExcel } from '../../services/jsonService'
import { saveHistoryItem } from '../../services/historyService'
import { CopyButton } from '../../components/CopyButton/CopyButton'
import styles from './JsonTool.module.css'

export function JsonTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState('')
  const [sheetName, setSheetName] = useState('Sheet1')
  const [exporting, setExporting] = useState(false)

  const handleFormat = () => {
    setError('')
    const result = jsonFormat(input)
    if (result.success) {
      setOutput(result.data.formatted)
      setStats(`键数: ${result.data.stats.keys || 0} | 深度: ${result.data.stats.depth || 0}`)
      saveHistoryItem({ toolType: 'json', input: input.substring(0, 200), output: '格式化' })
    } else {
      setError(result.error.message)
    }
  }

  const handleMinify = () => {
    setError('')
    const result = jsonMinify(input)
    if (result.success) {
      setOutput(result.data.formatted)
      setStats(`原始: ${result.data.stats.originalSize}B → 压缩: ${result.data.stats.minifiedSize}B | 压缩率: ${result.data.stats.reduction}`)
      saveHistoryItem({ toolType: 'json', input: input.substring(0, 200), output: '压缩' })
    } else {
      setError(result.error.message)
    }
  }

  const handleValidate = () => {
    setError('')
    const result = jsonValidate(input)
    if (result.success) {
      if (result.data.valid) {
        setOutput('✓ JSON 格式正确')
        setStats('')
      } else {
        const err = result.data.errors[0]
        setError(`第${err.line}行第${err.column}列: ${err.message}`)
        setOutput('')
      }
    }
  }

  const handleExportExcel = async () => {
    setError('')
    setExporting(true)
    try {
      const result = await jsonExportExcel(input, { sheetName })
      if (result.success) {
        setStats(`已导出 ${result.data.rowCount} 行 × ${result.data.columnCount} 列`)
        saveHistoryItem({ toolType: 'json', input: input.substring(0, 200), output: `导出Excel ${result.data.rowCount}行` })
      } else {
        setError(result.error.message)
      }
    } finally {
      setExporting(false)
    }
  }

  const deferredInput = useDeferredValue(input)
  const inputSize = useMemo(() => new TextEncoder().encode(deferredInput).length, [deferredInput])
  const isArray = useMemo(() => { try { return Array.isArray(JSON.parse(deferredInput)); } catch { return false; } }, [deferredInput])

  return (
    <div className={styles.tool}>
      <div className={styles.inputSection}>
        <div className={styles.inputHeader}>
          <span className={styles.label}>JSON 输入</span>
          <span className={`${styles.sizeHint} ${inputSize > 512000 ? styles.warning : ''}`}>
            {inputSize > 1024 ? `${(inputSize / 1024).toFixed(1)}KB` : `${inputSize}B`}
          </span>
        </div>
        <textarea
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="在此粘贴JSON文本..."
          spellCheck={false}
        />
      </div>
      <div className={styles.actions}>
        <button onClick={handleFormat} disabled={!input.trim()}>格式化</button>
        <button onClick={handleMinify} disabled={!input.trim()}>压缩</button>
        <button onClick={handleValidate} disabled={!input.trim()}>校验</button>
        <div className={styles.excelActions}>
          <input
            type="text"
            className={styles.sheetInput}
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Sheet名"
          />
          <button onClick={handleExportExcel} disabled={!input.trim() || !isArray || exporting}>
            {exporting ? '导出中...' : '导出Excel'}
          </button>
        </div>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {stats && <div className={styles.stats}>{stats}</div>}
      {output && (
        <div className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <span className={styles.label}>输出</span>
            <CopyButton text={output} />
          </div>
          <pre className={styles.output}>{output}</pre>
        </div>
      )}
    </div>
  )
}

export default JsonTool
