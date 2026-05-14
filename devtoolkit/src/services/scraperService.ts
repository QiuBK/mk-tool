import type { ScrapeResult, ScrapedTable, ScrapedList } from '../types'

function scrapePageFn() {
  function extractTables(): { headers: string[]; rows: string[][]; caption: string; source: 'table' }[] {
    const results: { headers: string[]; rows: string[][]; caption: string; source: 'table' }[] = []
    document.querySelectorAll('table').forEach((table) => {
      const caption = table.caption?.textContent?.trim() || ''
      const headerCells = table.querySelectorAll('thead th, thead td')
      let headers: string[] = []
      if (headerCells.length > 0) {
        headers = Array.from(headerCells).map((cell) => cell.textContent?.trim() || '')
      } else {
        const firstRow = table.querySelector('tr')
        if (firstRow) {
          const cells = firstRow.querySelectorAll('th, td')
          if (cells.length > 0 && firstRow.querySelector('th')) {
            headers = Array.from(cells).map((cell) => cell.textContent?.trim() || '')
          } else {
            headers = Array.from(cells).map((_, i) => `列${i + 1}`)
          }
        }
      }
      const rows: string[][] = []
      const bodyRows = table.querySelectorAll('tbody tr')
      const rowsToProcess = bodyRows.length > 0 ? bodyRows : table.querySelectorAll('tr')
      rowsToProcess.forEach((row) => {
        if (row.parentElement?.tagName === 'THEAD') return
        if (headers.length > 0 && row === table.querySelector('tr') && row.querySelector('th')) return
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
