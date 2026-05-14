import cronstrue from 'cronstrue'
import { CronExpressionParser } from 'cron-parser'
import type { ServiceResponse, CronResult, CronParseResult, CronFields, CronNextRunsResult, CronConfig } from '../types'

function createSuccess<T>(data: T): ServiceResponse<T> {
  return { success: true, data, timestamp: Date.now() }
}

function createError(code: string, message: string, details?: unknown): ServiceResponse<never> {
  return { success: false, error: { code, message, details }, timestamp: Date.now() }
}

export function cronGenerate(config: CronConfig): ServiceResponse<CronResult> {
  const parts = [
    config.seconds || '0',
    config.minutes,
    config.hours,
    config.dayOfMonth || '*',
    config.month || '*',
    config.dayOfWeek || '*',
  ]
  const expression = parts.join(' ')

  try {
    const humanReadable = cronstrue.toString(expression, { locale: 'zh_CN' })
    return createSuccess<CronResult>({ expression, humanReadable })
  } catch {
    return createError('INVALID_CRON_EXPRESSION', '无效的Cron配置', { field: 'expression', message: '无法生成有效的Cron表达式' })
  }
}

export function cronParse(expression: string): ServiceResponse<CronParseResult> {
  if (!expression || !expression.trim()) {
    return createError('INVALID_CRON_EXPRESSION', '请输入Cron表达式')
  }

  try {
    const humanReadable = cronstrue.toString(expression, { locale: 'zh_CN' })
    const parts = expression.trim().split(/\s+/)

    const fields: CronFields = {
      seconds: parts[0] || '0',
      minutes: parts.length >= 6 ? parts[1] : parts[0],
      hours: parts.length >= 6 ? parts[2] : parts[1],
      dayOfMonth: parts.length >= 6 ? parts[3] : parts[2],
      month: parts.length >= 6 ? parts[4] : parts[3],
      dayOfWeek: parts.length >= 6 ? parts[5] : parts[4],
    }

    return createSuccess<CronParseResult>({ expression, humanReadable, fields })
  } catch (e) {
    return createError('INVALID_CRON_EXPRESSION', '无效的Cron表达式', { field: 'expression', message: (e as Error).message })
  }
}

export function cronNextRuns(expression: string, count: number = 5, fromTime?: number): ServiceResponse<CronNextRunsResult> {
  if (!expression || !expression.trim()) {
    return createError('INVALID_CRON_EXPRESSION', '请输入Cron表达式')
  }

  if (count < 1 || count > 20) {
    return createError('INVALID_CRON_EXPRESSION', 'count必须在1-20之间')
  }

  try {
    const interval = CronExpressionParser.parse(expression, {
      currentDate: fromTime ? new Date(fromTime) : new Date(),
    })

    const nextRuns: string[] = []
    for (let i = 0; i < count; i++) {
      const next = interval.next()
      nextRuns.push(next.toISOString() as string)
    }

    return createSuccess<CronNextRunsResult>({ nextRuns })
  } catch (e) {
    return createError('INVALID_CRON_EXPRESSION', '无效的Cron表达式', { field: 'expression', message: (e as Error).message })
  }
}
