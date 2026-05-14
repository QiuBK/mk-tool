import { useState } from 'react'
import { colorConvert } from '../../services/colorService'
import { saveHistoryItem } from '../../services/historyService'
import { CopyButton } from '../../components/CopyButton/CopyButton'
import styles from './ColorTool.module.css'

export function ColorTool() {
  const [input, setInput] = useState('')
  const [format, setFormat] = useState<'hex' | 'rgb' | 'hsl'>('hex')
  const [result, setResult] = useState<{ hex: string; rgb: string; hsl: string; preview: string } | null>(null)
  const [error, setError] = useState('')

  const handleConvert = () => {
    setError('')
    const r = colorConvert(input, format)
    if (r.success) {
      setResult(r.data)
      saveHistoryItem({ toolType: 'color', input, output: r.data.hex })
    } else { setError(r.error.message) }
  }

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    setFormat('hex')
    const r = colorConvert(e.target.value, 'hex')
    if (r.success) setResult(r.data)
  }

  return (
    <div className={styles.tool}>
      <div className={styles.row}>
        <div className={styles.section}>
          <label className={styles.label}>颜色值</label>
          <div className={styles.inputRow}>
            <input type="text" className={styles.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder="#FF5733 / rgb(255,87,51) / hsl(11,100%,60%)" />
            <select className={styles.select} value={format} onChange={(e) => setFormat(e.target.value as 'hex' | 'rgb' | 'hsl')}>
              <option value="hex">HEX</option>
              <option value="rgb">RGB</option>
              <option value="hsl">HSL</option>
            </select>
            <button onClick={handleConvert} disabled={!input.trim()}>转换</button>
          </div>
        </div>
        <div className={styles.pickerSection}>
          <label className={styles.label}>选色器</label>
          <input type="color" className={styles.picker} value={result?.preview || '#4f46e5'} onChange={handlePickerChange} />
        </div>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {result && (
        <div className={styles.results}>
          {result.preview && <div className={styles.preview} style={{ backgroundColor: result.preview }} />}
          <div className={styles.resultRow}><span>HEX</span><code>{result.hex}</code><CopyButton text={result.hex} label="复制" /></div>
          <div className={styles.resultRow}><span>RGB</span><code>{result.rgb}</code><CopyButton text={result.rgb} label="复制" /></div>
          <div className={styles.resultRow}><span>HSL</span><code>{result.hsl}</code><CopyButton text={result.hsl} label="复制" /></div>
        </div>
      )}
    </div>
  )
}

export default ColorTool
