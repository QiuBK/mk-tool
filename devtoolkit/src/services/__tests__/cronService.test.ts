import { describe, it, expect } from 'vitest'
import { cronGenerate, cronParse, cronNextRuns } from '../cronService'

describe('cronService', () => {
  it('test_cron_generate', () => {
    const config = { minutes: '0', hours: '*' }
    const result = cronGenerate(config)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expression).toBeDefined()
      expect(result.data.humanReadable).toBeDefined()
    }
  })

  it('test_cron_parse', () => {
    const result = cronParse('0 * * * *')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expression).toBe('0 * * * *')
      expect(result.data.humanReadable).toBeDefined()
      expect(result.data.fields).toBeDefined()
      expect(result.data.fields.minutes).toBeDefined()
    }
  })

  it('test_cron_next_runs', () => {
    const result = cronNextRuns('0 * * * *', 3)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nextRuns).toHaveLength(3)
    }
  })

  it('test_cron_invalid_expression', () => {
    const result = cronParse('invalid')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_CRON_EXPRESSION')
    }
  })

  it('test_cron_preset_presets', () => {
    const config = { minutes: '0', hours: '0', dayOfMonth: '*', month: '*', dayOfWeek: '1' }
    const result = cronGenerate(config)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expression).toBeDefined()
      expect(result.data.humanReadable).toBeDefined()
    }
  })
})
