import type { ServiceResponse, EncodeResult, DecodeResult } from '../types'

const MAX_INPUT_SIZE = 1_048_576

function createSuccess<T>(data: T): ServiceResponse<T> {
  return { success: true, data, timestamp: Date.now() }
}

function createError(code: string, message: string, details?: unknown): ServiceResponse<never> {
  return { success: false, error: { code, message, details }, timestamp: Date.now() }
}

export function base64Encode(input: string): ServiceResponse<EncodeResult> {
  if (!input) return createError('EMPTY_INPUT', '请输入内容')
  if (input.length > MAX_INPUT_SIZE) return createError('INPUT_TOO_LARGE', '输入超过1MB限制', { maxSize: '1MB' })
  try {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(input)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return createSuccess<EncodeResult>({ result: btoa(binary) })
  } catch (e) {
    return createError('INVALID_BASE64', '编码失败')
  }
}

export function base64Decode(input: string): ServiceResponse<DecodeResult> {
  if (!input) return createError('EMPTY_INPUT', '请输入内容')
  try {
    const binary = atob(input)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const decoder = new TextDecoder()
    return createSuccess<DecodeResult>({ result: decoder.decode(bytes) })
  } catch {
    return createError('INVALID_BASE64', '无效的Base64字符串')
  }
}
