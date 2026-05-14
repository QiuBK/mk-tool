import { describe, it, expect } from 'vitest'
import { timestampConvert, dateToTimestamp, getCurrentTimestamp } from '../timestampService'

describe('timestampService', () => {
  it('test_timestamp_convert_seconds', () => {
    const result = timestampConvert(1700000000)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unixSeconds).toBe(1700000000)
      expect(result.data.unixMillis).toBe(1700000000000)
      expect(result.data.local).toBeDefined()
      expect(result.data.utc).toBe('2023-11-14T22:13:20.000Z')
      expect(result.data.relative).toBeDefined()
    }
  })

  it('test_timestamp_convert_millis', () => {
    const result = timestampConvert(1700000000000)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unixSeconds).toBe(1700000000)
      expect(result.data.unixMillis).toBe(1700000000000)
      expect(result.data.utc).toBe('2023-11-14T22:13:20.000Z')
    }
  })

  it('test_date_to_timestamp', () => {
    const result = dateToTimestamp('2023-11-14T22:13:20Z')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unixSeconds).toBe(1700000000)
    }
  })

  it('test_current_timestamp', () => {
    const result = getCurrentTimestamp()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unixSeconds).toBeGreaterThan(0)
      expect(result.data.unixMillis).toBeGreaterThan(0)
      expect(result.data.iso8601).toBeDefined()
      expect(result.data.unixMillis).toBeGreaterThanOrEqual(result.data.unixSeconds * 1000)
    }
  })

  it('test_invalid_timestamp', () => {
    const result = timestampConvert(NaN)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_TIMESTAMP')
    }
  })
})
