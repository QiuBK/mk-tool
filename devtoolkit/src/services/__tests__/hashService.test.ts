import { describe, it, expect } from 'vitest'
import { hashCompute } from '../hashService'

describe('hashService', () => {
  it('test_hash_md5', async () => {
    const result = await hashCompute('hello', 'md5')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.md5).toBe('5d41402abc4b2a76b9719d911017c592')
    }
  })

  it('test_hash_sha1', async () => {
    const result = await hashCompute('hello', 'sha1')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sha1).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
    }
  })

  it('test_hash_sha256', async () => {
    const result = await hashCompute('hello', 'sha256')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sha256).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
    }
  })

  it('test_hash_all', async () => {
    const result = await hashCompute('hello', 'all')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.md5).toBe('5d41402abc4b2a76b9719d911017c592')
      expect(result.data.sha1).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
      expect(result.data.sha256).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
    }
  })

  it('test_hash_empty_input', async () => {
    const result = await hashCompute('', 'md5')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('EMPTY_INPUT')
    }
  })
})
