import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { saveHistoryItem, getHistoryList, deleteHistoryItem, clearHistory } from '../historyService'

describe('historyService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saveHistoryItem - saves item and returns it with id and createdAt', async () => {
    const entry = {
      toolType: 'json' as const,
      input: '{"key":"value"}',
      output: 'formatted output',
    }

    const result = await saveHistoryItem(entry)

    expect(result.id).toBeDefined()
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
    expect(result.createdAt).toBeDefined()
    expect(typeof result.createdAt).toBe('number')
    expect(result.toolType).toBe('json')
    expect(result.input).toBe('{"key":"value"}')
    expect(result.output).toBe('formatted output')
  })

  it('getHistoryList - returns items sorted by createdAt descending', async () => {
    const item1 = await saveHistoryItem({ toolType: 'json', input: 'first', output: 'out1' })
    vi.advanceTimersByTime(10)
    const item2 = await saveHistoryItem({ toolType: 'base64', input: 'second', output: 'out2' })
    vi.advanceTimersByTime(10)
    const item3 = await saveHistoryItem({ toolType: 'url', input: 'third', output: 'out3' })

    const result = await getHistoryList()

    expect(result.total).toBe(3)
    expect(result.items[0].id).toBe(item3.id)
    expect(result.items[1].id).toBe(item2.id)
    expect(result.items[2].id).toBe(item1.id)
  })

  it('getHistoryList with toolType filter - filters by tool type', async () => {
    await saveHistoryItem({ toolType: 'json', input: 'a', output: 'out' })
    await saveHistoryItem({ toolType: 'base64', input: 'b', output: 'out' })
    await saveHistoryItem({ toolType: 'json', input: 'c', output: 'out' })

    const result = await getHistoryList({ toolType: 'json' })

    expect(result.total).toBe(2)
    expect(result.items.every((item) => item.toolType === 'json')).toBe(true)
  })

  it('deleteHistoryItem - deletes specific item', async () => {
    const item1 = await saveHistoryItem({ toolType: 'json', input: 'keep', output: 'out' })
    const item2 = await saveHistoryItem({ toolType: 'base64', input: 'delete', output: 'out' })

    await deleteHistoryItem(item2.id)

    const result = await getHistoryList()
    expect(result.total).toBe(1)
    expect(result.items[0].id).toBe(item1.id)
  })

  it('clearHistory - clears all items', async () => {
    await saveHistoryItem({ toolType: 'json', input: 'a', output: 'out' })
    await saveHistoryItem({ toolType: 'base64', input: 'b', output: 'out' })

    await clearHistory()

    const result = await getHistoryList()
    expect(result.total).toBe(0)
    expect(result.items).toEqual([])
  })

  it('saveHistoryItem with maxItems - auto-prunes oldest items when exceeding limit', async () => {
    const item1 = await saveHistoryItem({ toolType: 'json', input: 'first', output: 'out' }, 2)
    const item2 = await saveHistoryItem({ toolType: 'base64', input: 'second', output: 'out' }, 2)
    const item3 = await saveHistoryItem({ toolType: 'url', input: 'third', output: 'out' }, 2)

    const result = await getHistoryList()

    expect(result.total).toBe(2)
    const ids = result.items.map((i) => i.id)
    expect(ids).toContain(item2.id)
    expect(ids).toContain(item3.id)
    expect(ids).not.toContain(item1.id)
  })

  it('Input truncation - input > 10KB gets truncated', async () => {
    const longInput = 'x'.repeat(20_000)
    const longOutput = 'y'.repeat(20_000)

    const result = await saveHistoryItem({ toolType: 'json', input: longInput, output: longOutput })

    expect(result.input.length).toBeLessThan(longInput.length)
    expect(result.input).toContain('...[truncated]')
    expect(result.output.length).toBeLessThan(longOutput.length)
    expect(result.output).toContain('...[truncated]')
  })
})
