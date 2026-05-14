import { describe, it, expect } from 'vitest'
import { base64Encode, base64Decode } from '../base64Service'

describe('base64Service', () => {
  it('test_base64_encode', () => {
    const result = base64Encode('Hello')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.result).toBe('SGVsbG8=')
    }
  })

  it('test_base64_decode', () => {
    const result = base64Decode('SGVsbG8=')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.result).toBe('Hello')
    }
  })

  it('test_base64_encode_utf8', () => {
    const encoded = base64Encode('Hello, 世界')
    expect(encoded.success).toBe(true)
    if (encoded.success) {
      const decoded = base64Decode(encoded.data.result)
      expect(decoded.success).toBe(true)
      if (decoded.success) {
        expect(decoded.data.result).toBe('Hello, 世界')
      }
    }
  })

  it('test_base64_invalid_input', () => {
    const result = base64Decode('not-valid-base64!!!')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_BASE64')
    }
  })

  it('test_base64_empty_input', () => {
    const result = base64Encode('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('EMPTY_INPUT')
    }
  })
})
