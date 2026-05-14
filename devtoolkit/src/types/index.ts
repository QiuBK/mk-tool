export type ToolType = 'json' | 'base64' | 'timestamp' | 'cron' | 'url' | 'color' | 'hash' | 'scraper'

export type ThemeMode = 'light' | 'dark' | 'system'

export type DisplayMode = 'sidepanel' | 'popup'

export interface ServiceResult<T> {
  success: true
  data: T
  timestamp: number
}

export interface ServiceError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  timestamp: number
}

export type ServiceResponse<T> = ServiceResult<T> | ServiceError

export interface JsonResult {
  formatted: string
  stats: {
    keys?: number
    depth?: number
    originalSize?: number
    minifiedSize?: number
    reduction?: string
  }
}

export interface ValidationError {
  line: number
  column: number
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ExcelExportResult {
  fileName: string
  rowCount: number
  columnCount: number
}

export interface EncodeResult {
  result: string
}

export interface DecodeResult {
  result: string
}

export interface TimestampResult {
  unixSeconds: number
  unixMillis: number
  local: string
  utc: string
  relative: string
}

export interface CurrentTimestampResult {
  unixSeconds: number
  unixMillis: number
  iso8601: string
}

export interface CronResult {
  expression: string
  humanReadable: string
}

export interface CronFields {
  seconds: string
  minutes: string
  hours: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
}

export interface CronParseResult {
  expression: string
  humanReadable: string
  fields: CronFields
}

export interface CronNextRunsResult {
  nextRuns: string[]
}

export interface ColorResult {
  hex: string
  rgb: string
  hsl: string
  preview: string
}

export interface HashResult {
  md5?: string
  sha1?: string
  sha256?: string
}

export interface ScrapedTable {
  headers: string[]
  rows: string[][]
  caption: string
  source: 'table'
}

export interface ScrapedList {
  items: string[]
  label: string
  source: 'ul' | 'ol'
}

export type ScrapedData = ScrapedTable | ScrapedList

export interface ScrapeResult {
  tables: ScrapedTable[]
  lists: ScrapedList[]
  url: string
  title: string
}

export interface CapturedRequest {
  id: string
  url: string
  method: string
  type: 'xhr' | 'fetch'
  timestamp: number
  requestBody: string | null
  contentType: string | null
  status: number | null
  tabId: number
}

export interface HistoryItem {
  id: string
  toolType: ToolType
  input: string
  output: string
  createdAt: number
}

export interface HistoryListResult {
  items: HistoryItem[]
  total: number
}

export interface Preferences {
  theme: ThemeMode
  defaultTimezone: string
  defaultHashAlgo: 'md5' | 'sha1' | 'sha256' | 'all'
  historyEnabled: boolean
  maxHistoryItems: number
}

export interface ToolState {
  toolType: ToolType
  inputValue: string
  outputValue: string
  scrollPosition: number
  updatedAt: number
}

export interface CronConfig {
  seconds?: string
  minutes: string
  hours: string
  dayOfMonth?: string
  month?: string
  dayOfWeek?: string
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  defaultTimezone: 'local',
  defaultHashAlgo: 'sha256',
  historyEnabled: true,
  maxHistoryItems: 500,
}

export const TOOL_LIST: { type: ToolType; label: string; icon: string }[] = [
  { type: 'json', label: 'JSON', icon: '{ }' },
  { type: 'base64', label: 'Base64', icon: 'B64' },
  { type: 'timestamp', label: '时间戳', icon: '⏱' },
  { type: 'cron', label: 'Cron', icon: '⏰' },
  { type: 'url', label: 'URL', icon: '%' },
  { type: 'color', label: '颜色', icon: '🎨' },
  { type: 'hash', label: '哈希', icon: '#' },
  { type: 'scraper', label: '抓取', icon: '📊' },
]

export const MAX_INPUT_SIZE = 1_048_576
export const MAX_HISTORY_ITEMS = 500
export const HISTORY_TRUNCATE_SIZE = 10_240
