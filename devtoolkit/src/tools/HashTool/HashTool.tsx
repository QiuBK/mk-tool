import { useState } from 'react'
import { hashCompute } from '../../services/hashService'
import { saveHistoryItem } from '../../services/historyService'
import { CopyButton } from '../../components/CopyButton/CopyButton'
import styles from './HashTool.module.css'

export function HashTool() {
  const [input, setInput] = useState('')
  const [algorithm, setAlgorithm] = useState<'md5' | 'sha1' | 'sha256' | 'all'>('sha256')
  const [result, setResult] = useState<{ md5?: string; sha1?: string; sha256?: string } | null>(null)
  const [error, setError] = useState('')

  const handleCompute = async () => {
    setError('')
    const r = await hashCompute(input, algorithm)
    if (r.success) {
      setResult(r.data)
      saveHistoryItem({ toolType: 'hash', input: input.substring(0, 200), output: (r.data.sha256 || r.data.md5 || '').substring(0, 16) + '...' })
    } else { setError(r.error.message) }
  }

  return (
    <div className={styles.tool}>
      <div className={styles.section}>
        <label className={styles.label}>输入文本</label>
        <textarea className={styles.textarea} value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入待计算文本..." spellCheck={false} />
      </div>
      <div className={styles.actions}>
        <select className={styles.select} value={algorithm} onChange={(e) => setAlgorithm(e.target.value as 'md5' | 'sha1' | 'sha256' | 'all')}>
          <option value="md5">MD5</option>
          <option value="sha1">SHA-1</option>
          <option value="sha256">SHA-256</option>
          <option value="all">全部</option>
        </select>
        <button onClick={handleCompute} disabled={!input.trim()}>计算</button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {result && (
        <div className={styles.results}>
          {result.md5 && <div className={styles.resultRow}><span>MD5</span><code>{result.md5}</code><CopyButton text={result.md5} label="复制" /></div>}
          {result.sha1 && <div className={styles.resultRow}><span>SHA-1</span><code>{result.sha1}</code><CopyButton text={result.sha1} label="复制" /></div>}
          {result.sha256 && <div className={styles.resultRow}><span>SHA-256</span><code>{result.sha256}</code><CopyButton text={result.sha256} label="复制" /></div>}
        </div>
      )}
    </div>
  )
}

export default HashTool
