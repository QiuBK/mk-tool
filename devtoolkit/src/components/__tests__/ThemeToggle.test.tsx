import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { useAppStore } from '../../store'

describe('ThemeToggle', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeTool: 'json',
      toolStates: {},
      theme: 'light',
      resolvedTheme: 'light',
      historyOpen: false,
      clipboardFeedback: null,
    })
    localStorage.clear()
  })

  it('renders toggle button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows moon emoji when theme is light', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveTextContent('🌙')
  })

  it('shows sun emoji when theme is dark', () => {
    useAppStore.setState({ theme: 'dark', resolvedTheme: 'dark' })
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveTextContent('☀️')
  })

  it('clicking toggles theme from light to dark', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(useAppStore.getState().theme).toBe('dark')
    expect(useAppStore.getState().resolvedTheme).toBe('dark')
  })

  it('clicking toggles theme from dark to light', () => {
    useAppStore.setState({ theme: 'dark', resolvedTheme: 'dark' })
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(useAppStore.getState().theme).toBe('light')
    expect(useAppStore.getState().resolvedTheme).toBe('light')
  })
})
