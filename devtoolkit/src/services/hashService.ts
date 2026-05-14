import md5 from 'blueimp-md5'
import type { ServiceResponse, HashResult } from '../types'

const MAX_INPUT_SIZE = 1_048_576

function createSuccess<T>(data: T): ServiceResponse<T> {
  return { success: true, data, timestamp: Date.now() }
}

function createError(code: string, message: string, details?: unknown): ServiceResponse<never> {
  return { success: false, error: { code, message, details }, timestamp: Date.now() }
}

async function computeSHA(data: string, algorithm: 'SHA-1' | 'SHA-256'): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashCompute(input: string, algorithm: 'md5' | 'sha1' | 'sha256' | 'all'): Promise<ServiceResponse<HashResult>> {
  if (!input) return createError('EMPTY_INPUT', '请输入内容')
  if (input.length > MAX_INPUT_SIZE) return createError('INPUT_TOO_LARGE', '输入超过1MB限制', { maxSize: '1MB' })

  const validAlgos = ['md5', 'sha1', 'sha256', 'all']
  if (!validAlgos.includes(algorithm)) {
    return createError('UNSUPPORTED_ALGORITHM', '不支持的哈希算法', { algorithm })
  }

  const result: HashResult = {}

  if (algorithm === 'md5' || algorithm === 'all') {
    result.md5 = md5(input) as string
  }
  if (algorithm === 'sha1' || algorithm === 'all') {
    result.sha1 = await computeSHA(input, 'SHA-1')
  }
  if (algorithm === 'sha256' || algorithm === 'all') {
    result.sha256 = await computeSHA(input, 'SHA-256')
  }

  return createSuccess<HashResult>(result)
}
