import { useState } from 'react'
import { urlEncode, urlDecode } from '../../services/urlService'
import { saveHistoryItem } from '../../services/historyService'
import { CopyButton } from '../../components/CopyButton/CopyButton'
import styles from './UrlTool.module.css'

export function UrlTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'component' | 'uri'>('component')

  const handleEncode = () => {
    setError('')
    const result = urlEncode(input, mode)
    if (result.success) {
      setOutput(result.data.result)
      saveHistoryItem({ toolType: 'url', input: input.substring(0, 200), output: '编码' })
    } else { setError(result.error.message) }
  }

  const handleDecode = () => {
    setError('')
    const result = urlDecode(input)
    if (result.success) {
      setOutput(result.data.result)
      saveHistoryItem({ toolType: 'url', input: input.substring(0, 200), output: '解码' })
    } else { setError(result.error.message) }
  }

  return (
    <div className={styles.tool}>
      <div className={styles.section}>
        <label className={styles.label}>输入</label>
        <textarea className={styles.textarea} value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入URL文本..." spellCheck={false} />
      </div>
      <div className={styles.actions}>
        <div className={styles.modeToggle}>
          <button className={mode === 'component' ? styles.activeMode : ''} onClick={() => setMode('component')}>encodeURIComponent</button>
          <button className={mode === 'uri' ? styles.activeMode : ''} onClick={() => setMode('uri')}>encodeURI</button>
        </div>
        <button onClick={handleEncode} disabled={!input.trim()}>编码</button>
        <button onClick={handleDecode} disabled={!input.trim()}>解码</button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {output && (
        <div className={styles.section}>
          <div className={styles.outputHeader}><label className={styles.label}>结果</label><CopyButton text={output} /></div>
          <textarea className={styles.textarea} value={output} readOnly />
        </div>
      )}
    </div>
  )
}

export default UrlTool
