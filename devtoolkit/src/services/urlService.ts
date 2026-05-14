import type { ServiceResponse, EncodeResult, DecodeResult } from '../types'

const MAX_INPUT_SIZE = 1_048_576

function createSuccess<T>(data: T): ServiceResponse<T> {
  return { success: true, data, timestamp: Date.now() }
}

function createError(code: string, message: string, details?: unknown): ServiceResponse<never> {
  return { success: false, error: { code, message, details }, timestamp: Date.now() }
}

export function urlEncode(input: string, mode: 'component' | 'uri' = 'component'): ServiceResponse<EncodeResult> {
  if (!input) return createError('EMPTY_INPUT', '请输入内容')
  if (input.length > MAX_INPUT_SIZE) return createError('INPUT_TOO_LARGE', '输入超过1MB限制', { maxSize: '1MB' })
  const result = mode === 'uri' ? encodeURI(input) : encodeURIComponent(input)
  return createSuccess<EncodeResult>({ result })
}

export function urlDecode(input: string): ServiceResponse<DecodeResult> {
  if (!input) return createError('EMPTY_INPUT', '请输入内容')
  try {
    const result = decodeURIComponent(input)
    return createSuccess<DecodeResult>({ result })
  } catch {
    try {
      const result = decodeURI(input)
      return createSuccess<DecodeResult>({ result })
    } catch {
      return createError('EMPTY_INPUT', '无效的URL编码字符串')
    }
  }
}
