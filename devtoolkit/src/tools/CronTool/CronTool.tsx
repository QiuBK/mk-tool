import { useState } from 'react'
import { cronGenerate, cronParse, cronNextRuns } from '../../services/cronService'
import { saveHistoryItem } from '../../services/historyService'
import { CopyButton } from '../../components/CopyButton/CopyButton'
import type { CronFields } from '../../types'
import styles from './CronTool.module.css'

const PRESETS = [
  { label: '每分钟', expression: '* * * * *' },
  { label: '每小时', expression: '0 * * * *' },
  { label: '每天0点', expression: '0 0 * * *' },
  { label: '每周一9点', expression: '0 9 * * 1' },
  { label: '每月1号0点', expression: '0 0 1 * *' },
]

export function CronTool() {
  const [expression, setExpression] = useState('')
  const [humanReadable, setHumanReadable] = useState('')
  const [nextRuns, setNextRuns] = useState<string[]>([])
  const [error, setError] = useState('')
  const [fields, setFields] = useState<CronFields>({ seconds: '0', minutes: '*', hours: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' })

  const updateFromExpression = (expr: string) => {
    setExpression(expr)
    setError('')
    if (!expr.trim()) { setHumanReadable(''); setNextRuns([]); return }

    const parseResult = cronParse(expr)
    if (parseResult.success) {
      setHumanReadable(parseResult.data.humanReadable)
      setFields(parseResult.data.fields)
      const runsResult = cronNextRuns(expr, 10)
      if (runsResult.success) {
        setNextRuns(runsResult.data.nextRuns)
      } else {
        setNextRuns([])
      }
    } else {
      setError(parseResult.error.message)
      setHumanReadable('')
      setNextRuns([])
    }
  }

  const updateFromFields = (newFields: CronFields) => {
    setFields(newFields)
    const result = cronGenerate(newFields)
    if (result.success) {
      setExpression(result.data.expression)
      setHumanReadable(result.data.humanReadable)
      setError('')
      const runsResult = cronNextRuns(result.data.expression, 10)
      if (runsResult.success) {
        setNextRuns(runsResult.data.nextRuns)
      } else {
        setNextRuns([])
      }
      saveHistoryItem({ toolType: 'cron', input: result.data.expression, output: result.data.humanReadable })
    } else {
      setError(result.error.message)
    }
  }

  const handleFieldChange = (field: keyof CronFields, value: string) => {
    const newFields = { ...fields, [field]: value }
    updateFromFields(newFields)
  }

  const handlePreset = (expr: string) => {
    updateFromExpression(expr)
    saveHistoryItem({ toolType: 'cron', input: expr, output: '预设' })
  }

  return (
    <div className={styles.tool}>
      <div className={styles.section}>
        <label className={styles.label}>Cron 表达式</label>
        <div className={styles.exprRow}>
          <input type="text" className={styles.exprInput} value={expression} onChange={(e) => updateFromExpression(e.target.value)} placeholder="0 0 * * *" />
          <CopyButton text={expression} label="复制" />
        </div>
      </div>
      {humanReadable && <div className={styles.humanReadable}>{humanReadable}</div>}
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.presets}>
        <span className={styles.label}>预设：</span>
        {PRESETS.map((p) => (
          <button key={p.label} className={styles.presetBtn} onClick={() => handlePreset(p.expression)}>{p.label}</button>
        ))}
      </div>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label>秒</label>
          <input type="text" value={fields.seconds} onChange={(e) => handleFieldChange('seconds', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>分</label>
          <input type="text" value={fields.minutes} onChange={(e) => handleFieldChange('minutes', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>时</label>
          <input type="text" value={fields.hours} onChange={(e) => handleFieldChange('hours', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>日</label>
          <input type="text" value={fields.dayOfMonth} onChange={(e) => handleFieldChange('dayOfMonth', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>月</label>
          <input type="text" value={fields.month} onChange={(e) => handleFieldChange('month', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>周</label>
          <input type="text" value={fields.dayOfWeek} onChange={(e) => handleFieldChange('dayOfWeek', e.target.value)} />
        </div>
      </div>
      {nextRuns.length > 0 && (
        <div className={styles.nextRuns}>
          <label className={styles.label}>近10次执行时间</label>
          {nextRuns.map((run, i) => (
            <div key={i} className={styles.runItem}><code>{new Date(run).toLocaleString('zh-CN')}</code></div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CronTool
