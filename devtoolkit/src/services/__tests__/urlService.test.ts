import { describe, it, expect } from 'vitest'
import { urlEncode, urlDecode } from '../urlService'

describe('urlService', () => {
  it('test_url_encode_component', () => {
    const result = urlEncode('hello world&foo=bar', 'component')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.result).toBe('hello%20world%26foo%3Dbar')
    }
  })

  it('test_url_encode_uri', () => {
    const result = urlEncode('https://example.com/path with spaces', 'uri')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.result).toBe('https://example.com/path%20with%20spaces')
    }
  })

  it('test_url_decode', () => {
    const result = urlDecode('hello%20world%26foo%3Dbar')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.result).toBe('hello world&foo=bar')
    }
  })

  it('test_url_empty_input', () => {
    const result = urlEncode('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('EMPTY_INPUT')
    }
  })
})
