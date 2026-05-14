import type { ServiceResponse, TimestampResult, CurrentTimestampResult } from '../types'

function createSuccess<T>(data: T): ServiceResponse<T> {
  return { success: true, data, timestamp: Date.now() }
}

function createError(code: string, message: string, details?: unknown): ServiceResponse<never> {
  return { success: false, error: { code, message, details }, timestamp: Date.now() }
}

function isMillis(ts: number): boolean {
  return ts > 1e12
}

function formatRelative(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const absDiff = Math.abs(diff)
  const suffix = diff > 0 ? '前' : '后'

  if (absDiff < 60000) return '刚刚'
  if (absDiff < 3600000) return `${Math.floor(absDiff / 60000)}分钟${suffix}`
  if (absDiff < 86400000) return `${Math.floor(absDiff / 3600000)}小时${suffix}`
  if (absDiff < 2592000000) return `${Math.floor(absDiff / 86400000)}天${suffix}`
  if (absDiff < 31536000000) return `${Math.floor(absDiff / 2592000000)}个月${suffix}`
  return `${Math.floor(absDiff / 31536000000)}年${suffix}`
}

export function timestampConvert(input: number, timezone?: string): ServiceResponse<TimestampResult> {
  if (typeof input !== 'number' || isNaN(input)) {
    return createError('INVALID_TIMESTAMP', '无效的时间戳格式')
  }

  const millis = isMillis(input) ? input : input * 1000
  const unixSeconds = Math.floor(millis / 1000)
  const unixMillis = millis
  const date = new Date(millis)

  if (isNaN(date.getTime())) {
    return createError('INVALID_TIMESTAMP', '无效的时间戳格式')
  }

  let local: string
  let utc: string

  if (timezone && timezone !== 'local') {
    try {
      local = date.toLocaleString('zh-CN', { timeZone: timezone })
      utc = date.toISOString()
    } catch {
      return createError('INVALID_TIMESTAMP', `无效的时区: ${timezone}`)
    }
  } else {
    local = date.toLocaleString('zh-CN')
    utc = date.toISOString()
  }

  return createSuccess<TimestampResult>({
    unixSeconds,
    unixMillis,
    local,
    utc,
    relative: formatRelative(date),
  })
}

export function dateToTimestamp(input: string, _timezone?: string): ServiceResponse<TimestampResult> {
  const date = new Date(input)
  if (isNaN(date.getTime())) {
    return createError('INVALID_DATE', '无效的日期格式')
  }
  const unixMillis = date.getTime()
  const unixSeconds = Math.floor(unixMillis / 1000)

  return createSuccess<TimestampResult>({
    unixSeconds,
    unixMillis,
    local: date.toLocaleString('zh-CN'),
    utc: date.toISOString(),
    relative: formatRelative(date),
  })
}

export function getCurrentTimestamp(): ServiceResponse<CurrentTimestampResult> {
  const now = new Date()
  return createSuccess<CurrentTimestampResult>({
    unixSeconds: Math.floor(now.getTime() / 1000),
    unixMillis: now.getTime(),
    iso8601: now.toISOString(),
  })
}
