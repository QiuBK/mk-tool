import { useState } from 'react'
import { base64Encode, base64Decode } from '../../services/base64Service'
import { saveHistoryItem } from '../../services/historyService'
import { CopyButton } from '../../components/CopyButton/CopyButton'
import styles from './Base64Tool.module.css'

export function Base64Tool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  const handleEncode = () => {
    setError('')
    const result = base64Encode(input)
    if (result.success) {
      setOutput(result.data.result)
      saveHistoryItem({ toolType: 'base64', input: input.substring(0, 200), output: '编码' })
    } else {
      setError(result.error.message)
    }
  }

  const handleDecode = () => {
    setError('')
    const result = base64Decode(input)
    if (result.success) {
      setOutput(result.data.result)
      saveHistoryItem({ toolType: 'base64', input: input.substring(0, 200), output: '解码' })
    } else {
      setError(result.error.message)
    }
  }

  return (
    <div className={styles.tool}>
      <div className={styles.section}>
        <label className={styles.label}>输入文本</label>
        <textarea className={styles.textarea} value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入文本或Base64字符串..." spellCheck={false} />
      </div>
      <div className={styles.actions}>
        <button onClick={handleEncode} disabled={!input.trim()}>编码</button>
        <button onClick={handleDecode} disabled={!input.trim()}>解码</button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {output && (
        <div className={styles.section}>
          <div className={styles.outputHeader}>
            <label className={styles.label}>结果</label>
            <CopyButton text={output} />
          </div>
          <textarea className={styles.textarea} value={output} readOnly />
        </div>
      )}
    </div>
  )
}

export default Base64Tool
