import type { HistoryItem, HistoryListResult, Preferences } from '../types'

const STORAGE_KEY = 'devtoolkit_history'
const PREFS_KEY = 'devtoolkit_preferences'
const STATES_KEY = 'devtoolkit_tool_states'
const TRUNCATE_SIZE = 10_240

function truncate(str: string): string {
  if (str.length <= TRUNCATE_SIZE) return str
  return str.substring(0, TRUNCATE_SIZE) + '...[truncated]'
}

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

async function getStorage<T>(key: string): Promise<T | null> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const result = await chrome.storage.local.get(key)
    return (result[key] as T) || null
  }
  const item = localStorage.getItem(key)
  return item ? JSON.parse(item) : null
}

async function setStorage<T>(key: string, value: T): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    await chrome.storage.local.set({ [key]: value })
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

export async function saveHistoryItem(entry: Omit<HistoryItem, 'id' | 'createdAt'>, maxItems: number = 500): Promise<HistoryItem> {
  const item: HistoryItem = {
    id: generateId(),
    toolType: entry.toolType,
    input: truncate(entry.input),
    output: truncate(entry.output),
    createdAt: Date.now(),
  }

  const items = (await getStorage<HistoryItem[]>(STORAGE_KEY)) || []
  items.push(item)

  while (items.length > maxItems) {
    items.shift()
  }

  await setStorage(STORAGE_KEY, items)
  return item
}

export async function getHistoryList(filter?: { toolType?: string; limit?: number; offset?: number }): Promise<HistoryListResult> {
  const items = (await getStorage<HistoryItem[]>(STORAGE_KEY)) || []
  let filtered = [...items].sort((a, b) => b.createdAt - a.createdAt)

  if (filter?.toolType) {
    filtered = filtered.filter((item) => item.toolType === filter.toolType)
  }

  const total = filtered.length
  const offset = filter?.offset || 0
  const limit = filter?.limit || 50
  const paged = filtered.slice(offset, offset + limit)

  return { items: paged, total }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const items = (await getStorage<HistoryItem[]>(STORAGE_KEY)) || []
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) throw new Error('HISTORY_NOT_FOUND')
  items.splice(index, 1)
  await setStorage(STORAGE_KEY, items)
}

export async function clearHistory(): Promise<void> {
  await setStorage(STORAGE_KEY, [])
}

export async function getPreferences(defaults: Preferences): Promise<Preferences> {
  const stored = await getStorage<Partial<Preferences>>(PREFS_KEY)
  if (!stored) return defaults
  return { ...defaults, ...stored }
}

export async function updatePreferences(partial: Partial<Preferences>, defaults: Preferences): Promise<Preferences> {
  const current = await getPreferences(defaults)
  const updated = { ...current, ...partial }
  await setStorage(PREFS_KEY, updated)
  return updated
}

export async function getToolState(toolType: string): Promise<{ inputValue: string; outputValue: string; scrollPosition: number } | null> {
  const states = (await getStorage<Record<string, { inputValue: string; outputValue: string; scrollPosition: number }>>(STATES_KEY)) || {}
  return states[toolType] || null
}

export async function saveToolState(toolType: string, state: Partial<{ inputValue: string; outputValue: string; scrollPosition: number }>): Promise<void> {
  const states = (await getStorage<Record<string, { inputValue: string; outputValue: string; scrollPosition: number }>>(STATES_KEY)) || {}
  states[toolType] = { ...states[toolType], ...state }
  await setStorage(STATES_KEY, states)
}

export async function clearAllToolStates(): Promise<void> {
  await setStorage(STATES_KEY, {})
}
