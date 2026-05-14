import type { ServiceResponse, JsonResult, ValidationResult, ValidationError, ExcelExportResult } from '../types'
import ExcelJS from 'exceljs'

const MAX_INPUT_SIZE = 1_048_576

function createSuccess<T>(data: T): ServiceResponse<T> {
  return { success: true, data, timestamp: Date.now() }
}

function createError(code: string, message: string, details?: unknown): ServiceResponse<never> {
  return { success: false, error: { code, message, details }, timestamp: Date.now() }
}

function countKeys(obj: unknown): number {
  if (typeof obj !== 'object' || obj === null) return 0
  if (Array.isArray(obj)) return obj.reduce((sum: number, item: unknown) => sum + countKeys(item), 0)
  let count = 0
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    count++
    count += countKeys((obj as Record<string, unknown>)[key])
  }
  return count
}

function maxDepth(obj: unknown, depth: number = 0): number {
  if (typeof obj !== 'object' || obj === null) return depth
  if (Array.isArray(obj)) {
    if (obj.length === 0) return depth + 1
    return Math.max(...obj.map((item: unknown) => maxDepth(item, depth + 1)))
  }
  const values = Object.values(obj as Record<string, unknown>)
  if (values.length === 0) return depth + 1
  return Math.max(...values.map((v: unknown) => maxDepth(v, depth + 1)))
}

export function jsonFormat(input: string): ServiceResponse<JsonResult> {
  if (!input || !input.trim()) return createError('EMPTY_INPUT', '请输入内容')
  if (input.length > MAX_INPUT_SIZE) return createError('INPUT_TOO_LARGE', '输入超过1MB限制', { maxSize: '1MB' })
  try {
    const parsed = JSON.parse(input)
    const formatted = JSON.stringify(parsed, null, 2)
    return createSuccess<JsonResult>({
      formatted,
      stats: { keys: countKeys(parsed), depth: maxDepth(parsed) },
    })
  } catch (e) {
    const err = e as Error
    const match = err.message.match(/position (\d+)/)
    const pos = match ? parseInt(match[1]) : 0
    const before = input.substring(0, pos)
    const line = (before.match(/\n/g) || []).length + 1
    const column = pos - before.lastIndexOf('\n')
    return createError('INVALID_JSON', `JSON语法错误：第${line}行第${column}列`, { line, column, message: err.message })
  }
}

export function jsonMinify(input: string): ServiceResponse<JsonResult> {
  if (!input || !input.trim()) return createError('EMPTY_INPUT', '请输入内容')
  if (input.length > MAX_INPUT_SIZE) return createError('INPUT_TOO_LARGE', '输入超过1MB限制', { maxSize: '1MB' })
  try {
    const parsed = JSON.parse(input)
    const formatted = JSON.stringify(parsed)
    const originalSize = new TextEncoder().encode(input).length
    const minifiedSize = new TextEncoder().encode(formatted).length
    const reduction = originalSize > 0 ? ((1 - minifiedSize / originalSize) * 100).toFixed(1) + '%' : '0%'
    return createSuccess<JsonResult>({
      formatted,
      stats: { originalSize, minifiedSize, reduction },
    })
  } catch (e) {
    const err = e as Error
    return createError('INVALID_JSON', err.message)
  }
}

export function jsonValidate(input: string): ServiceResponse<ValidationResult> {
  if (!input || !input.trim()) return createError('EMPTY_INPUT', '请输入内容')
  if (input.length > MAX_INPUT_SIZE) return createError('INPUT_TOO_LARGE', '输入超过1MB限制', { maxSize: '1MB' })
  try {
    JSON.parse(input)
    return createSuccess<ValidationResult>({ valid: true, errors: [] })
  } catch (e) {
    const err = e as Error
    const match = err.message.match(/position (\d+)/)
    const pos = match ? parseInt(match[1]) : 0
    const before = input.substring(0, pos)
    const line = (before.match(/\n/g) || []).length + 1
    const column = pos - before.lastIndexOf('\n')
    const errors: ValidationError[] = [{ line, column, message: err.message.replace(/^JSON\.parse:\s*/, '') }]
    return createSuccess<ValidationResult>({ valid: false, errors })
  }
}

export async function jsonExportExcel(
  input: string,
  options?: { sheetName?: string; fileName?: string }
): Promise<ServiceResponse<ExcelExportResult>> {
  if (!input || !input.trim()) return createError('EMPTY_INPUT', '请输入内容')
  if (input.length > MAX_INPUT_SIZE) return createError('INPUT_TOO_LARGE', '输入超过1MB限制', { maxSize: '1MB' })

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return createError('INVALID_JSON', '无效的JSON格式')
  }

  if (!Array.isArray(parsed)) {
    return createError('NOT_JSON_ARRAY', '仅支持JSON数组格式（Array of Object）', { actualType: typeof parsed })
  }

  try {
    const workbook = new ExcelJS.Workbook()
    const sheetName = options?.sheetName || 'Sheet1'
    const worksheet = workbook.addWorksheet(sheetName.substring(0, 31))

    const allKeys = new Set<string>()
    for (const item of parsed) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.keys(item as Record<string, unknown>).forEach((k) => allKeys.add(k))
      }
    }

    const headers = Array.from(allKeys)
    worksheet.addRow(headers)

    for (const item of parsed) {
      const row: (string | number | null)[] = headers.map((key) => {
        const val = (item as Record<string, unknown>)?.[key]
        if (val === null || val === undefined) return null
        if (typeof val === 'object') return JSON.stringify(val)
        return val as string | number
      })
      worksheet.addRow(row)
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = options?.fileName || `export_${Date.now()}`
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return createSuccess<ExcelExportResult>({
      fileName: `${fileName}.xlsx`,
      rowCount: parsed.length,
      columnCount: headers.length,
    })
  } catch (e) {
    const err = e as Error
    return createError('EXPORT_FAILED', `Excel导出失败：${err.message}`, { message: err.message })
  }
}
