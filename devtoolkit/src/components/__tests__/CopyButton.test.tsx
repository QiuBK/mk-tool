import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CopyButton } from '../CopyButton/CopyButton'

describe('CopyButton', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders button with default label', () => {
    render(<CopyButton text="hello" />)
    expect(screen.getByRole('button', { name: '复制' })).toBeInTheDocument()
  })

  it('renders button with custom label', () => {
    render(<CopyButton text="hello" label="Copy" />)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('calls navigator.clipboard.writeText on click', async () => {
    render(<CopyButton text="hello" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello')
  })

  it('shows feedback text after click', async () => {
    render(<CopyButton text="hello" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(await screen.findByText('已复制 ✓')).toBeInTheDocument()
  })

  it('is disabled when text is empty', () => {
    render(<CopyButton text="" />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
