import type { ScrapeResult, ScrapedTable, ScrapedList, CapturedRequest, ReplayResponse } from '../types'

function scrapePageFn() {
  function extractTables(): { headers: string[]; rows: string[][]; caption: string; source: 'table' }[] {
    const results: { headers: string[]; rows: string[][]; caption: string; source: 'table' }[] = []
    document.querySelectorAll('table').forEach((table) => {
      const caption = table.caption?.textContent?.trim() || ''
      const allRows = table.querySelectorAll('tr')
      if (allRows.length === 0) return

      let headers: string[] = []
      let headerRowIndex = -1

      const theadRow = table.querySelector('thead tr')
      if (theadRow) {
        const cells = theadRow.querySelectorAll('th, td')
        headers = Array.from(cells).map((cell) => cell.textContent?.trim() || '')
        for (let i = 0; i < allRows.length; i++) {
          if (allRows[i] === theadRow) { headerRowIndex = i; break }
        }
      } else if (allRows.length >= 2) {
        const firstRow = allRows[0]
        const cells = firstRow.querySelectorAll('th, td')
        headers = Array.from(cells).map((cell) => cell.textContent?.trim() || '')
        headerRowIndex = 0
      }

      const rows: string[][] = []
      allRows.forEach((row, idx) => {
        if (row.parentElement?.tagName === 'THEAD') return
        if (idx === headerRowIndex) return
        const cells = row.querySelectorAll('td, th')
        if (cells.length > 0) rows.push(Array.from(cells).map((cell) => cell.textContent?.trim() || ''))
      })

      if (rows.length > 0) results.push({ headers, rows, caption, source: 'table' })
    })
    return results
  }

  function extractLists(): { items: string[]; label: string; source: 'ul' | 'ol' }[] {
    const results: { items: string[]; label: string; source: 'ul' | 'ol' }[] = []
    document.querySelectorAll('ul, ol').forEach((list) => {
      if (list.closest('table, nav, header, footer, [role="navigation"]')) return
      if (list.closest('ul, ol') && list.parentElement?.closest('ul, ol')) return
      const items = Array.from(list.querySelectorAll(':scope > li'))
        .map((li) => li.textContent?.trim() || '')
        .filter((text) => text.length > 0)
      if (items.length >= 2) {
        const label = list.getAttribute('aria-label') || list.previousElementSibling?.textContent?.trim()?.slice(0, 50) || ''
        results.push({ items, label, source: list.tagName.toLowerCase() as 'ul' | 'ol' })
      }
    })
    return results
  }

  return { tables: extractTables(), lists: extractLists(), url: location.href, title: document.title }
}

export async function scrapeCurrentPage(): Promise<ScrapeResult> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
    throw new Error('此功能仅在浏览器扩展中可用')
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    throw new Error('无法获取当前标签页')
  }

  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
    throw new Error('无法访问浏览器内部页面')
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapePageFn,
  })

  if (!results || results.length === 0 || !results[0].result) {
    throw new Error('未能在页面中提取到数据')
  }

  const data = results[0].result as ScrapeResult
  if (data.tables.length === 0 && data.lists.length === 0) {
    throw new Error('当前页面未找到表格或列表数据')
  }

  return data
}

export function tableToText(table: ScrapedTable): string {
  const lines: string[] = []
  if (table.caption) lines.push(table.caption)
  if (table.headers.length > 0) lines.push(table.headers.join('\t'))
  table.rows.forEach((row) => lines.push(row.join('\t')))
  return lines.join('\n')
}

export function listToText(list: ScrapedList): string {
  const lines: string[] = []
  if (list.label) lines.push(list.label)
  list.items.forEach((item, i) => lines.push(`${i + 1}. ${item}`))
  return lines.join('\n')
}

export function tableToCsv(table: ScrapedTable): string {
  const escape = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`
    }
    return cell
  }
  const lines: string[] = []
  if (table.headers.length > 0) lines.push(table.headers.map(escape).join(','))
  table.rows.forEach((row) => lines.push(row.map(escape).join(',')))
  return lines.join('\n')
}

export async function exportTableToExcel(table: ScrapedTable, fileName?: string): Promise<string> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(table.caption || 'Sheet1')

  if (table.headers.length > 0) {
    sheet.addRow(table.headers)
    const headerRow = sheet.getRow(1)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F0FE' },
      }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      }
    })
  }

  table.rows.forEach((row) => sheet.addRow(row))

  sheet.columns.forEach((col) => {
    let maxLen = 0
    col.eachCell?.((cell) => {
      const len = String(cell.value || '').length
      if (len > maxLen) maxLen = len
    })
    col.width = Math.min(Math.max(maxLen + 2, 8), 50)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const name = fileName || `table-${Date.now()}.xlsx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  return name
}

function interceptorFn() {
  const w = window as any
  const CAPTURED_KEY = '__devtoolkit_captured'
  if (!w[CAPTURED_KEY]) {
    w[CAPTURED_KEY] = []
  }
  if (w.__devtoolkit_patched) return
  w.__devtoolkit_patched = true

  const captured = w[CAPTURED_KEY]
  const MAX_CAPTURED = 200

  function isApiUrl(url: string) {
    try {
      const u = new URL(url, location.origin)
      return u.pathname.includes('/api/') ||
        u.pathname.includes('/v1/') ||
        u.pathname.includes('/v2/') ||
        u.pathname.includes('/v3/') ||
        u.pathname.endsWith('.json')
    } catch {
      return false
    }
  }

  function addEntry(entry: any) {
    captured.unshift(entry)
    if (captured.length > MAX_CAPTURED) captured.length = MAX_CAPTURED
  }

  const origFetch = window.fetch
  window.fetch = function (input: any, init?: any) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase()
    const headers: Record<string, string> = {}

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v: any, k: any) => { headers[k] = v })
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([k, v]: any) => { headers[k] = v })
      } else {
        Object.entries(init.headers).forEach(([k, v]: any) => { headers[k] = String(v) })
      }
    }
    if (typeof input !== 'string' && input.headers) {
      if (input.headers instanceof Headers) {
        input.headers.forEach((v: any, k: any) => { if (!headers[k]) headers[k] = v })
      }
    }

    const body = init?.body ? String(init.body) : null

    if (isApiUrl(url)) {
      const entry: any = {
        id: `fetch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url, method, type: 'fetch', timestamp: Date.now(),
        requestBody: body,
        contentType: headers['Content-Type'] || headers['content-type'] || null,
        headers: { ...headers },
        status: null, tabId: -1,
        responseHeaders: {},
        responseBody: null,
      }
      addEntry(entry)
      return origFetch.apply(this, arguments as any).then(async (response: any) => {
        entry.status = response.status
        const respHeaders: Record<string, string> = {}
        response.headers.forEach((v: any, k: any) => { respHeaders[k] = v })
        entry.responseHeaders = respHeaders
        try {
          const cloned = response.clone()
          const text = await cloned.text()
          entry.responseBody = text.length > 50000 ? text.slice(0, 50000) : text
        } catch { /* ignore */ }
        return response
      })
    }

    return origFetch.apply(this, arguments as any)
  }

  const origOpen = XMLHttpRequest.prototype.open
  const origSend = XMLHttpRequest.prototype.send
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader

  XMLHttpRequest.prototype.open = function (method: string, url: string) {
    ;(this as any).__dt = { method: (method || 'GET').toUpperCase(), url: String(url), headers: {} }
    return origOpen.apply(this, arguments as any)
  }

  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
    const dt = (this as any).__dt
    if (dt) {
      dt.headers[name] = value
    }
    return origSetHeader.apply(this, arguments as any)
  }

  XMLHttpRequest.prototype.send = function (body?: any) {
    const dt = (this as any).__dt
    if (dt && isApiUrl(dt.url)) {
      const entry: any = {
        id: `xhr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: dt.url, method: dt.method, type: 'xhr', timestamp: Date.now(),
        requestBody: body ? String(body) : null,
        contentType: dt.headers['Content-Type'] || dt.headers['content-type'] || null,
        headers: { ...dt.headers },
        status: null, tabId: -1,
        responseHeaders: {},
        responseBody: null,
      }
      addEntry(entry)
      this.addEventListener('load', function () {
        const xhr = this as any
        entry.status = xhr.status
        try {
          const allHeaders = xhr.getAllResponseHeaders()
          if (allHeaders) {
            const respHeaders: Record<string, string> = {}
            allHeaders.trim().split(/[\r\n]+/).forEach((line: string) => {
              const parts = line.split(': ')
              const key = parts.shift()
              if (key) respHeaders[key] = parts.join(': ')
            })
            entry.responseHeaders = respHeaders
          }
        } catch { /* ignore */ }
        try {
          const text = xhr.responseText
          entry.responseBody = text && text.length > 50000 ? text.slice(0, 50000) : text
        } catch { /* ignore */ }
      })
    }
    return origSend.apply(this, arguments as any)
  }
}

export async function injectInterceptor(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) return

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return
  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) return

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: interceptorFn,
    })
  } catch { /* ignore */ }
}

export async function readPageAuth(): Promise<Record<string, string>> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) return {}

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return {}
  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) return {}

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: () => {
        const headers: Record<string, string> = {}
        const tokenKeys = ['token', 'access_token', 'accessToken', 'Authorization', 'authorization', 'auth_token', 'jwt', 'id_token', 'authToken']
        for (const key of tokenKeys) {
          try {
            const val = localStorage.getItem(key)
            if (val) { headers['Authorization'] = val; break }
          } catch { /* ignore */ }
        }
        if (!headers['Authorization']) {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              if (k) {
                const v = localStorage.getItem(k)
                if (v && typeof v === 'string' && v.startsWith('eyJ')) {
                  headers['Authorization'] = v
                  break
                }
              }
            }
          } catch { /* ignore */ }
        }
        return headers
      },
    })
    return (results?.[0]?.result as Record<string, string>) || {}
  } catch { /* ignore */ }
  return {}
}

export async function getCapturedRequests(tabId: number): Promise<CapturedRequest[]> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new Error('此功能仅在浏览器扩展中可用')
  }

  let interceptorData: CapturedRequest[] = []
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id && !tab.url?.startsWith('chrome://') && !tab.url?.startsWith('edge://')) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: () => (window as any).__devtoolkit_captured || [],
      })
      if (results && results[0]?.result) {
        interceptorData = results[0].result as CapturedRequest[]
      }
    }
  } catch { /* ignore */ }

  const webRequestData = await new Promise<CapturedRequest[]>((resolve) => {
    chrome.runtime.sendMessage({ type: 'getCapturedRequests', tabId }, (response) => {
      if (chrome.runtime.lastError) {
        resolve([])
        return
      }
      resolve(response?.requests || [])
    })
  })

  if (interceptorData.length === 0 && webRequestData.length === 0) {
    return []
  }

  const allRequests = new Map<string, CapturedRequest>()

  for (const r of webRequestData) {
    allRequests.set(r.id, { ...r })
  }

  for (const r of interceptorData) {
    const existing = allRequests.get(r.id)
    if (existing) {
      if (Object.keys(r.headers || {}).length > Object.keys(existing.headers || {}).length) {
        existing.headers = r.headers
      }
      if (Object.keys(r.responseHeaders || {}).length > Object.keys(existing.responseHeaders || {}).length) {
        existing.responseHeaders = r.responseHeaders
      }
      if (r.responseBody && !existing.responseBody) {
        existing.responseBody = r.responseBody
      }
      if (r.requestBody && !existing.requestBody) {
        existing.requestBody = r.requestBody
      }
      if (r.status != null && existing.status == null) {
        existing.status = r.status
      }
      if (r.contentType && !existing.contentType) {
        existing.contentType = r.contentType
      }
    } else {
      allRequests.set(r.id, { ...r })
    }
  }

  return Array.from(allRequests.values()).sort((a, b) => b.timestamp - a.timestamp)
}

export async function clearCapturedRequests(tabId: number): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
  chrome.runtime.sendMessage({ type: 'clearCapturedRequests', tabId })

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: () => { (window as any).__devtoolkit_captured = [] },
      })
    }
  } catch { /* ignore */ }
}

export function requestToText(req: CapturedRequest): string {
  const lines: string[] = []
  lines.push(`[${req.method}] ${req.url}`)
  if (req.status != null) lines.push(`Status: ${req.status}`)
  if (req.contentType) lines.push(`Content-Type: ${req.contentType}`)
  if (req.headers && Object.keys(req.headers).length > 0) {
    lines.push(`Request Headers: ${JSON.stringify(req.headers, null, 2)}`)
  }
  if (req.requestBody) lines.push(`Request Body: ${req.requestBody}`)
  if (req.responseHeaders && Object.keys(req.responseHeaders).length > 0) {
    lines.push(`Response Headers: ${JSON.stringify(req.responseHeaders, null, 2)}`)
  }
  if (req.responseBody) lines.push(`Response Body: ${req.responseBody}`)
  return lines.join('\n')
}

export function requestsToCsv(requests: CapturedRequest[]): string {
  const headers = ['Method', 'URL', 'Status', 'Content-Type', 'Body', 'Timestamp']
  const rows = requests.map((r) => [
    r.method,
    r.url,
    String(r.status ?? ''),
    r.contentType || '',
    r.requestBody || '',
    new Date(r.timestamp).toISOString(),
  ].map((cell) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`
    }
    return cell
  }).join(','))
  return [headers.join(','), ...rows].join('\n')
}

export async function replayRequest(
  url: string,
  method: string,
  body: string | null,
  contentType: string | null,
  headers: Record<string, string> = {},
): Promise<ReplayResponse> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
    throw new Error('此功能仅在浏览器扩展中可用')
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    throw new Error('无法获取当前标签页')
  }

  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
    throw new Error('无法在浏览器内部页面发送请求')
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: 'MAIN',
    func: (fetchUrl: string, fetchMethod: string, fetchBody: string | null, fetchContentType: string | null, fetchHeaders: Record<string, string>) => {
      const forbidden = new Set(['host', 'connection', 'content-length', 'cookie', 'origin', 'referer',
        'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
        'user-agent', 'accept-encoding', 'accept-language'])
      const reqHeaders: Record<string, string> = {}
      Object.entries(fetchHeaders).forEach(([k, v]) => {
        if (!forbidden.has(k.toLowerCase())) {
          reqHeaders[k] = v
        }
      })
      if (fetchContentType && !reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
        reqHeaders['Content-Type'] = fetchContentType
      }
      if (!reqHeaders['Authorization'] && !reqHeaders['authorization']) {
        const tokenKeys = ['token', 'access_token', 'accessToken', 'Authorization', 'authorization', 'auth_token', 'jwt', 'id_token', 'authToken']
        for (const key of tokenKeys) {
          try {
            const val = localStorage.getItem(key)
            if (val) { reqHeaders['Authorization'] = val; break }
          } catch { /* ignore */ }
        }
        if (!reqHeaders['Authorization'] && !reqHeaders['authorization']) {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              if (k) {
                const v = localStorage.getItem(k)
                if (v && typeof v === 'string' && v.startsWith('eyJ')) {
                  reqHeaders['Authorization'] = v
                  break
                }
              }
            }
          } catch { /* ignore */ }
        }
      }
      return fetch(fetchUrl, {
        method: fetchMethod,
        headers: reqHeaders,
        body: (fetchMethod !== 'GET' && fetchMethod !== 'HEAD' && fetchBody) ? fetchBody : undefined,
        credentials: 'include',
      }).then(async (res) => {
        const respHeaders: Record<string, string> = {}
        res.headers.forEach((v, k) => { respHeaders[k] = v })
        const respBody = await res.text()
        return { status: res.status, statusText: res.statusText, headers: respHeaders, body: respBody, requestHeaders: reqHeaders }
      }).catch((err: any) => {
        return { status: 0, statusText: err.message || 'Network Error', headers: {}, body: '', requestHeaders: reqHeaders }
      })
    },
    args: [url, method, body, contentType, headers],
  })

  if (!results || results.length === 0) {
    throw new Error('请求发送失败：无法注入脚本')
  }

  const result = results[0].result as ReplayResponse | undefined
  if (!result) {
    throw new Error('请求发送失败：无返回结果')
  }

  if (result.status === 0) {
    throw new Error(`网络请求失败：${result.statusText}`)
  }

  return result
}
