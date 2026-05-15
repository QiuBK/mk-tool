import type { ScrapeResult, ScrapedTable, ScrapedList, CapturedRequest, ReplayResponse } from '../types'

function scrapePageFn() {
  let idCounter = 0
  function nextId(): string {
    idCounter++
    return `devtoolkit-${idCounter}`
  }

  function extractTables(): { headers: string[]; rows: string[][]; caption: string; source: 'table'; domId: string }[] {
    const results: { headers: string[]; rows: string[][]; caption: string; source: 'table'; domId: string }[] = []
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

      if (rows.length > 0) {
        const domId = nextId()
        table.setAttribute('data-devtoolkit-id', domId)
        results.push({ headers, rows, caption, source: 'table', domId })
      }
    })
    return results
  }

  function extractLists(): { items: string[]; label: string; source: 'ul' | 'ol'; domId: string }[] {
    const results: { items: string[]; label: string; source: 'ul' | 'ol'; domId: string }[] = []
    document.querySelectorAll('ul, ol').forEach((list) => {
      if (list.closest('table, nav, header, footer, [role="navigation"]')) return
      if (list.closest('ul, ol') && list.parentElement?.closest('ul, ol')) return
      const items = Array.from(list.querySelectorAll(':scope > li'))
        .map((li) => li.textContent?.trim() || '')
        .filter((text) => text.length > 0)
      if (items.length >= 2) {
        const domId = nextId()
        list.setAttribute('data-devtoolkit-id', domId)
        const label = list.getAttribute('aria-label') || list.previousElementSibling?.textContent?.trim()?.slice(0, 50) || ''
        results.push({ items, label, source: list.tagName.toLowerCase() as 'ul' | 'ol', domId })
      }
    })
    return results
  }

  return { tables: extractTables(), lists: extractLists(), url: location.href, title: document.title }
}

export async function expandPagination(): Promise<number> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return 0
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'expandPagination' }, (response) => {
      if (chrome.runtime.lastError) { resolve(0); return }
      resolve(response?.count || 0)
    })
  })
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

  try {
    await expandPagination()
    await new Promise(r => setTimeout(r, 1500))
  } catch {}

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

export async function syncTableToPage(domId: string, headers: string[], rows: string[][]): Promise<{ success: boolean; error?: string; info?: string }> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { success: false, error: '扩展API不可用' }
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'syncTableToPage', domId, headers, rows },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message })
          return
        }
        resolve(response || { success: false, error: '无响应' })
      },
    )
  })
}

export async function syncListToPage(domId: string, items: string[]): Promise<{ success: boolean; error?: string; info?: string }> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { success: false, error: '扩展API不可用' }
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'syncListToPage', domId, items },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message })
          return
        }
        resolve(response || { success: false, error: '无响应' })
      },
    )
  })
}

export async function getActiveTabId(): Promise<number | null> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return null
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getActiveTabId' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null)
        return
      }
      resolve(response?.tabId || null)
    })
  })
}

export async function startCapture(tabId: number): Promise<{ ok: boolean; error?: string }> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new Error('此功能仅在浏览器扩展中可用')
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'startCapture', tabId }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message })
        return
      }
      resolve(response || { ok: false, error: '未知错误' })
    })
  })
}

export async function stopCapture(tabId: number): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'stopCapture', tabId }, () => {
      resolve()
    })
  })
}

export async function isDebuggerAttached(tabId: number): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return false
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'isDebuggerAttached', tabId }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false)
        return
      }
      resolve(response?.attached || false)
    })
  })
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

  return new Promise<CapturedRequest[]>((resolve) => {
    chrome.runtime.sendMessage({ type: 'getCapturedRequests', tabId }, (response) => {
      if (chrome.runtime.lastError) {
        resolve([])
        return
      }
      resolve(response?.requests || [])
    })
  })
}

export async function clearCapturedRequests(tabId: number): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
  chrome.runtime.sendMessage({ type: 'clearCapturedRequests', tabId })
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
