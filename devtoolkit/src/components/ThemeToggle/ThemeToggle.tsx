import { useAppStore } from '../../store'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useAppStore()

  const toggle = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }

  return (
    <button className={styles.btn} onClick={toggle} title="切换主题">
      {resolvedTheme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
