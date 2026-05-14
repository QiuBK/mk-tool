import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ToolType, ThemeMode, DisplayMode } from '../types'

interface AppState {
  activeTool: ToolType
  setActiveTool: (tool: ToolType) => void
  toolStates: Partial<Record<ToolType, { inputValue: string; outputValue: string; scrollPosition: number }>>
  setToolState: (tool: ToolType, state: { inputValue?: string; outputValue?: string; scrollPosition?: number }) => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  resolvedTheme: 'light' | 'dark'
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
  historyOpen: boolean
  setHistoryOpen: (open: boolean) => void
  clipboardFeedback: string | null
  setClipboardFeedback: (feedback: string | null) => void
}

const chromeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(name)
      return (result[name] as string) || null
    }
    return localStorage.getItem(name)
  },
  setItem: async (name: string, value: string) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [name]: value })
    } else {
      localStorage.setItem(name, value)
    }
  },
  removeItem: async (name: string) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.remove(name)
    } else {
      localStorage.removeItem(name)
    }
  },
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTool: 'json',
      setActiveTool: (tool) => set({ activeTool: tool }),
      toolStates: {},
      setToolState: (tool, state) =>
        set((s) => ({
          toolStates: {
            ...s.toolStates,
            [tool]: { ...s.toolStates[tool], ...state },
          },
        })),
      theme: 'system',
      setTheme: (theme) => {
        const resolved = theme === 'system' ? getSystemTheme() : theme
        set({ theme, resolvedTheme: resolved })
        document.documentElement.setAttribute('data-theme', resolved)
      },
      resolvedTheme: getSystemTheme(),
      displayMode: 'sidepanel',
      setDisplayMode: (mode) => set({ displayMode: mode }),
      historyOpen: false,
      setHistoryOpen: (open) => set({ historyOpen: open }),
      clipboardFeedback: null,
      setClipboardFeedback: (feedback) => set({ clipboardFeedback: feedback }),
    }),
    {
      name: 'devtoolkit-preferences',
      storage: createJSONStorage(() => chromeStorage),
      partialize: (state) => ({
        activeTool: state.activeTool,
        toolStates: state.toolStates,
        theme: state.theme,
        displayMode: state.displayMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = state.theme === 'system' ? getSystemTheme() : state.theme
          state.resolvedTheme = resolved
          document.documentElement.setAttribute('data-theme', resolved)
        }
      },
    },
  ),
)
