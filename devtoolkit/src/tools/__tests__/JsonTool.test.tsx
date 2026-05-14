import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JsonTool } from '../JsonTool/JsonTool'

vi.mock('../../services/historyService', () => ({
  saveHistoryItem: vi.fn().mockResolvedValue({}),
}))

describe('JsonTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders input textarea', () => {
    render(<JsonTool />)
    expect(screen.getByPlaceholderText('在此粘贴JSON文本...')).toBeInTheDocument()
  })

  it('renders format button', () => {
    render(<JsonTool />)
    expect(screen.getByText('格式化')).toBeInTheDocument()
  })

  it('renders validate button', () => {
    render(<JsonTool />)
    expect(screen.getByText('校验')).toBeInTheDocument()
  })

  it('format button works with valid JSON', () => {
    render(<JsonTool />)
    const textarea = screen.getByPlaceholderText('在此粘贴JSON文本...')
    fireEvent.change(textarea, { target: { value: '{"name":"test"}' } })
    fireEvent.click(screen.getByText('格式化'))
    expect(screen.getByText(/输出/)).toBeInTheDocument()
    expect(screen.getByText(/键数/)).toBeInTheDocument()
  })

  it('shows error for invalid JSON on format', () => {
    render(<JsonTool />)
    const textarea = screen.getByPlaceholderText('在此粘贴JSON文本...')
    fireEvent.change(textarea, { target: { value: '{invalid}' } })
    fireEvent.click(screen.getByText('格式化'))
    expect(screen.getByText(/JSON语法错误/)).toBeInTheDocument()
  })

  it('validate button works with valid JSON', () => {
    render(<JsonTool />)
    const textarea = screen.getByPlaceholderText('在此粘贴JSON文本...')
    fireEvent.change(textarea, { target: { value: '{"a":1}' } })
    fireEvent.click(screen.getByText('校验'))
    expect(screen.getByText('✓ JSON 格式正确')).toBeInTheDocument()
  })

  it('validate button shows error for invalid JSON', () => {
    render(<JsonTool />)
    const textarea = screen.getByPlaceholderText('在此粘贴JSON文本...')
    fireEvent.change(textarea, { target: { value: '{"name":}' } })
    fireEvent.click(screen.getByText('校验'))
    expect(screen.getByText(/行/)).toBeInTheDocument()
  })

  it('disables action buttons when input is empty', () => {
    render(<JsonTool />)
    expect(screen.getByText('格式化')).toBeDisabled()
    expect(screen.getByText('压缩')).toBeDisabled()
    expect(screen.getByText('校验')).toBeDisabled()
  })
})
