import { useAppStore } from '../../store'
import { TOOL_LIST } from '../../types'
import styles from './ToolNav.module.css'

export function ToolNav() {
  const { activeTool, setActiveTool } = useAppStore()

  return (
    <nav className={styles.nav}>
      {TOOL_LIST.map((tool, index) => (
        <button
          key={tool.type}
          className={`${styles.item} ${activeTool === tool.type ? styles.active : ''}`}
          onClick={() => setActiveTool(tool.type)}
          title={`Ctrl+${index + 1}`}
        >
          <span className={styles.icon}>{tool.icon}</span>
          <span className={styles.label}>{tool.label}</span>
        </button>
      ))}
    </nav>
  )
}
