import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '../index'

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeTool: 'json',
      toolStates: {},
      theme: 'system',
      resolvedTheme: 'light',
      historyOpen: false,
      clipboardFeedback: null,
    })
    localStorage.clear()
  })

  it('has correct initial state', () => {
    const state = useAppStore.getState()
    expect(state.activeTool).toBe('json')
    expect(state.theme).toBe('system')
    expect(state.historyOpen).toBe(false)
  })

  it('setActiveTool changes activeTool', () => {
    useAppStore.getState().setActiveTool('base64')
    expect(useAppStore.getState().activeTool).toBe('base64')
  })

  it('setToolState saves tool state for a tool', () => {
    useAppStore.getState().setToolState('json', { inputValue: '{"a":1}', outputValue: '{\n  "a": 1\n}' })
    const toolState = useAppStore.getState().toolStates['json']
    expect(toolState).toBeDefined()
    expect(toolState!.inputValue).toBe('{"a":1}')
    expect(toolState!.outputValue).toBe('{\n  "a": 1\n}')
  })

  it('setToolState merges with existing tool state', () => {
    useAppStore.getState().setToolState('json', { inputValue: 'hello' })
    useAppStore.getState().setToolState('json', { scrollPosition: 42 })
    const toolState = useAppStore.getState().toolStates['json']
    expect(toolState!.inputValue).toBe('hello')
    expect(toolState!.scrollPosition).toBe(42)
  })

  it('setTheme changes theme and resolvedTheme', () => {
    useAppStore.getState().setTheme('dark')
    expect(useAppStore.getState().theme).toBe('dark')
    expect(useAppStore.getState().resolvedTheme).toBe('dark')
  })

  it('setTheme "system" resolves based on system preference', () => {
    mockMatchMedia(true)
    useAppStore.getState().setTheme('system')
    expect(useAppStore.getState().theme).toBe('system')
    expect(useAppStore.getState().resolvedTheme).toBe('dark')

    mockMatchMedia(false)
    useAppStore.getState().setTheme('system')
    expect(useAppStore.getState().resolvedTheme).toBe('light')
  })

  it('setHistoryOpen toggles history panel', () => {
    useAppStore.getState().setHistoryOpen(true)
    expect(useAppStore.getState().historyOpen).toBe(true)
    useAppStore.getState().setHistoryOpen(false)
    expect(useAppStore.getState().historyOpen).toBe(false)
  })

  it('setClipboardFeedback sets and clears feedback', () => {
    useAppStore.getState().setClipboardFeedback('Copied!')
    expect(useAppStore.getState().clipboardFeedback).toBe('Copied!')
    useAppStore.getState().setClipboardFeedback(null)
    expect(useAppStore.getState().clipboardFeedback).toBeNull()
  })
})
