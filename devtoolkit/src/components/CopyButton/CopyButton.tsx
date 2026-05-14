import { useState, useCallback } from 'react'
import styles from './CopyButton.module.css'

interface CopyButtonProps {
  text: string
  label?: string
}

export function CopyButton({ text, label = '复制' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [text])

  return (
    <button className={styles.btn} onClick={handleCopy} disabled={!text}>
      {copied ? '已复制 ✓' : label}
    </button>
  )
}
