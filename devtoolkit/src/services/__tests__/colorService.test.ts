import { describe, it, expect } from 'vitest'
import { colorConvert } from '../colorService'

describe('colorService', () => {
  it('test_color_hex_to_rgb_hsl', () => {
    const result = colorConvert('#FF5733', 'hex')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hex).toBe('#FF5733')
      expect(result.data.rgb).toBe('rgb(255, 87, 51)')
      expect(result.data.hsl).toBeDefined()
      expect(result.data.preview).toBe('#ff5733')
    }
  })

  it('test_color_rgb_to_hex_hsl', () => {
    const result = colorConvert('rgb(255, 87, 51)', 'rgb')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hex).toBe('#FF5733')
      expect(result.data.rgb).toBe('rgb(255, 87, 51)')
      expect(result.data.hsl).toBeDefined()
    }
  })

  it('test_color_hsl_to_hex_rgb', () => {
    const result = colorConvert('hsl(11, 100%, 60%)', 'hsl')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hex).toBeDefined()
      expect(result.data.rgb).toBeDefined()
      expect(result.data.hsl).toBeDefined()
    }
  })

  it('test_color_invalid_format', () => {
    const result = colorConvert('invalid', 'hex')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_COLOR_FORMAT')
    }
  })
})
