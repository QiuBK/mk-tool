import { describe, it, expect } from 'vitest'
import { jsonFormat, jsonMinify, jsonValidate, jsonExportExcel } from '../jsonService'

describe('jsonService', () => {
  it('test_json_format_success', () => {
    const result = jsonFormat('{"name":"test","value":123}')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.formatted).toContain('name')
      expect(result.data.formatted).toContain('test')
      expect(result.data.formatted).toContain('value')
      expect(result.data.formatted).toContain('123')
      expect(result.data.stats.keys).toBe(2)
      expect(result.data.stats.depth).toBe(1)
    }
  })

  it('test_json_minify_success', () => {
    const formatted = '{\n  "name": "test",\n  "value": 123\n}'
    const result = jsonMinify(formatted)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.formatted).toBe('{"name":"test","value":123}')
      expect(result.data.stats.originalSize).toBeGreaterThan(0)
      expect(result.data.stats.minifiedSize).toBeGreaterThan(0)
      expect(result.data.stats.reduction).toBeDefined()
    }
  })

  it('test_json_validate_invalid', () => {
    const result = jsonValidate('{"name":}')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.valid).toBe(false)
      expect(result.data.errors.length).toBeGreaterThan(0)
    }
  })

  it('test_json_validate_valid', () => {
    const result = jsonValidate('{"a":1}')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.valid).toBe(true)
      expect(result.data.errors).toEqual([])
    }
  })

  it('test_json_empty_input', () => {
    const result = jsonFormat('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('EMPTY_INPUT')
    }
  })

  it('test_json_input_too_large', () => {
    const largeInput = 'x'.repeat(1_048_577)
    const result = jsonFormat(largeInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('INPUT_TOO_LARGE')
    }
  })

  it('test_json_export_not_array', async () => {
    const result = await jsonExportExcel('{"a":1}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('NOT_JSON_ARRAY')
    }
  })

  it('test_json_export_empty_input', async () => {
    const result = await jsonExportExcel('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('EMPTY_INPUT')
    }
  })
})
