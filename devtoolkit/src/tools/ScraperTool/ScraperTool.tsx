import { useState, useEffect, useCallback } from 'react'
import { scrapeCurrentPage, tableToText, listToText, tableToCsv, exportTableToExcel, getCapturedRequests, clearCapturedRequests, requestToText, requestsToCsv, replayRequest, readPageAuth, startCapture, stopCapture, isDebuggerAttached, getActiveTabId, syncTableToPage, syncListToPage } from '../../services/scraperService'
import { CopyButton } from '../../components/CopyButton/CopyButton'
import type { ScrapeResult, ScrapedTable, ScrapedList, CapturedRequest, ReplayResponse } from '../../types'
import styles from './ScraperTool.module.css'

export function ScraperTool() {
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'tables' | 'lists' | 'api'>('tables')
  const [apiRequests, setApiRequests] = useState<CapturedRequest[]>([])
  const [selectedReq, setSelectedReq] = useState<CapturedRequest | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editUrl, setEditUrl] = useState('')
  const [editMethod, setEditMethod] = useState('GET')
  const [editBody, setEditBody] = useState('')
  const [editContentType, setEditContentType] = useState('')
  const [editHeaders, setEditHeaders] = useState<Record<string, string>>({})
  const [editParams, setEditParams] = useState<Record<string, string>>({})
  const [replayResp, setReplayResp] = useState<ReplayResponse | null>(null)
  const [replayLoading, setReplayLoading] = useState(false)
  const [replayError, setReplayError] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [captureError, setCaptureError] = useState('')

  const handleScrape = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await scrapeCurrentPage()
      setResult(data)
      setActiveTab(data.tables.length > 0 ? 'tables' : 'lists')
    } catch (e) {
      setError(e instanceof Error ? e.message : '提取失败')
    } finally {
      setLoading(false)
    }
  }

  const loadApiRequests = useCallback(async () => {
    try {
      const tabId = await getActiveTabId()
      if (tabId) {
        const attached = await isDebuggerAttached(tabId)
        setCapturing(attached)
        const reqs = await getCapturedRequests(tabId)
        setApiRequests(reqs)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (activeTab === 'api') {
      loadApiRequests()
      const timer = setInterval(loadApiRequests, 2000)
      return () => clearInterval(timer)
    }
  }, [activeTab, loadApiRequests])

  const handleStartCapture = async () => {
    setCaptureError('')
    try {
      const tabId = await getActiveTabId()
      if (!tabId) {
        setCaptureError('无法获取当前标签页，请确保已打开普通网页')
        return
      }
      const res = await startCapture(tabId)
      if (res.ok) {
        setCapturing(true)
        setActiveTab('api')
      } else {
        const errMsg = res.error || '无法开始抓包'
        if (errMsg.includes('Cannot access') || errMsg.includes('permission')) {
          setCaptureError('权限不足：请确保扩展有调试权限，且目标页面未打开 DevTools')
        } else if (errMsg.includes('already attached')) {
          setCapturing(true)
          setActiveTab('api')
        } else {
          setCaptureError(`抓包启动失败：${errMsg}`)
        }
      }
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : '无法开始抓包')
    }
  }

  const handleStopCapture = async () => {
    try {
      const tabId = await getActiveTabId()
      if (tabId) {
        await stopCapture(tabId)
        setCapturing(false)
      }
    } catch { /* ignore */ }
  }

  const handleClearApi = async () => {
    const tabId = await getActiveTabId()
    if (tabId) {
      await clearCapturedRequests(tabId)
      setApiRequests([])
      setSelectedReq(null)
      setEditMode(false)
      setReplayResp(null)
    }
  }

  const handleSelectReq = (req: CapturedRequest) => {
    const enriched = { ...req, headers: { ...(req.headers || {}) } }
    if (enriched.contentType && !enriched.headers['Content-Type']) {
      enriched.headers['Content-Type'] = enriched.contentType
    }
    setSelectedReq(enriched)
    setEditMode(false)
    setReplayResp(null)
    setReplayError('')
    setEditUrl(enriched.url)
    setEditMethod(enriched.method)
    setEditBody(enriched.requestBody || '')
    setEditContentType(enriched.contentType || 'application/json')
    setEditHeaders(enriched.headers)
    setEditParams(getUrlParams(enriched.url))

    if (!enriched.headers['Authorization'] && !enriched.headers['authorization']) {
      readPageAuth().then((pageAuth) => {
        if (pageAuth['Authorization']) {
          setSelectedReq((prev) => {
            if (!prev) return prev
            const updated = { ...prev, headers: { ...prev.headers, Authorization: pageAuth['Authorization'] } }
            setEditHeaders(updated.headers)
            return updated
          })
        }
      }).catch(() => {})
    }
  }

  const handleStartEdit = async () => {
    if (!selectedReq) return
    setEditMode(true)
    setReplayResp(null)
    setReplayError('')
    const mergedHeaders = { ...(selectedReq.headers || {}) }
    if (!mergedHeaders['Authorization'] && !mergedHeaders['authorization']) {
      try {
        const pageAuth = await readPageAuth()
        if (pageAuth['Authorization']) {
          mergedHeaders['Authorization'] = pageAuth['Authorization']
        }
      } catch { /* ignore */ }
    }
    setEditHeaders(mergedHeaders)
    setEditParams(getUrlParams(selectedReq.url))
  }

  const handleReplay = async () => {
    setReplayLoading(true)
    setReplayError('')
    setReplayResp(null)
    try {
      const resp = await replayRequest(editUrl, editMethod, editBody || null, editContentType || null, editHeaders)
      setReplayResp(resp)
    } catch (e) {
      setReplayError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setReplayLoading(false)
    }
  }

  const handleCopyAll = () => {
    if (!result) return
    const parts: string[] = []
    result.tables.forEach((t) => parts.push(tableToText(t)))
    result.lists.forEach((l) => parts.push(listToText(l)))
    navigator.clipboard.writeText(parts.join('\n\n'))
  }

  const handleCopyApiAll = () => {
    const text = apiRequests.map(requestToText).join('\n\n')
    navigator.clipboard.writeText(text)
  }

  const handleCopyApiCsv = () => {
    navigator.clipboard.writeText(requestsToCsv(apiRequests))
  }

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('zh-CN')

  const getShortUrl = (url: string) => {
    try {
      const u = new URL(url)
      return u.pathname + u.search
    } catch {
      return url
    }
  }

  const tryFormatJson = (text: string): string => {
    try {
      const obj = JSON.parse(text)
      return JSON.stringify(obj, null, 2)
    } catch {
      return text
    }
  }

  const getUrlParams = (url: string): Record<string, string> => {
    try {
      const u = new URL(url)
      const params: Record<string, string> = {}
      u.searchParams.forEach((v, k) => { params[k] = v })
      return params
    } catch {
      return {}
    }
  }

  const handleParamChange = (key: string, value: string) => {
    setEditParams((prev) => {
      const next = { ...prev, [key]: value }
      const baseUrl = editUrl.split('?')[0]
      try {
        const u = new URL(baseUrl)
        Object.entries(next).forEach(([k, v]) => u.searchParams.set(k, v))
        setEditUrl(u.toString())
      } catch { /* ignore */ }
      return next
    })
  }

  const handleAddParam = () => {
    setEditParams((prev) => ({ ...prev, [`param${Object.keys(prev).length + 1}`]: '' }))
  }

  const handleRemoveParam = (key: string) => {
    setEditParams((prev) => {
      const next = { ...prev }
      delete next[key]
      const baseUrl = editUrl.split('?')[0]
      try {
        const u = new URL(baseUrl)
        Object.entries(next).forEach(([k, v]) => u.searchParams.set(k, v))
        setEditUrl(u.toString())
      } catch { /* ignore */ }
      return next
    })
  }

  const handleHeaderChange = (key: string, value: string) => {
    setEditHeaders((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddHeader = () => {
    setEditHeaders((prev) => ({ ...prev, [`Header-${Object.keys(prev).length + 1}`]: '' }))
  }

  const handleRemoveHeader = (key: string) => {
    setEditHeaders((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleHeaderKeyChange = (oldKey: string, newKey: string) => {
    setEditHeaders((prev) => {
      const next: Record<string, string> = {}
      Object.entries(prev).forEach(([k, v]) => {
        if (k === oldKey) {
          next[newKey] = v
        } else {
          next[k] = v
        }
      })
      return next
    })
  }

  return (
    <div className={styles.tool}>
      <div className={styles.section}>
        <label className={styles.label}>网页数据抓取</label>
        <p className={styles.desc}>提取当前页面中的表格和列表数据，或抓取API接口请求参数</p>
      </div>
      <div className={styles.actions}>
        <button className={styles.scrapeBtn} onClick={handleScrape} disabled={loading}>
          {loading ? '提取中...' : '🔍 抓取页面数据'}
        </button>
        {!capturing ? (
          <button className={styles.captureBtnMain} onClick={handleStartCapture}>
            🌐 开始抓包
          </button>
        ) : (
          <button className={styles.stopCaptureBtnMain} onClick={handleStopCapture}>
            ⏹ 停止抓包
          </button>
        )}
        {(result || apiRequests.length > 0) && activeTab !== 'api' && (
          <button className={styles.copyAllBtn} onClick={handleCopyAll}>
            📋 复制全部
          </button>
        )}
      </div>
      {capturing && (
        <div className={styles.captureStatus}>
          🔴 正在监听 XHR/Fetch 请求...（页面顶部会出现「扩展正在调试此浏览器」提示栏，请勿关闭）
        </div>
      )}
      {captureError && <div className={styles.error}>{captureError}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {(result || activeTab === 'api' || capturing || apiRequests.length > 0) && (
        <div className={styles.results}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'tables' ? styles.tabActive : ''}`} onClick={() => setActiveTab('tables')}>
              表格 ({result?.tables.length || 0})
            </button>
            <button className={`${styles.tab} ${activeTab === 'lists' ? styles.tabActive : ''}`} onClick={() => setActiveTab('lists')}>
              列表 ({result?.lists.length || 0})
            </button>
            <button className={`${styles.tab} ${activeTab === 'api' ? styles.tabActive : ''}`} onClick={() => setActiveTab('api')}>
              接口 ({apiRequests.length})
            </button>
          </div>

          {activeTab === 'tables' && result && (
            <div className={styles.dataList}>
              {result.tables.length === 0 && <p className={styles.empty}>未找到表格数据</p>}
              {result.tables.map((table, i) => (
                <TableCard key={i} table={table} index={i} />
              ))}
            </div>
          )}

          {activeTab === 'lists' && result && (
            <div className={styles.dataList}>
              {result.lists.length === 0 && <p className={styles.empty}>未找到列表数据</p>}
              {result.lists.map((list, i) => (
                <ListCard key={i} list={list} index={i} />
              ))}
            </div>
          )}

          {activeTab === 'api' && (
            <div className={styles.apiPanel}>
              <div className={styles.apiToolbar}>
                {!capturing ? (
                  <button className={styles.captureBtn} onClick={handleStartCapture}>▶️ 开始抓包</button>
                ) : (
                  <button className={styles.stopCaptureBtn} onClick={handleStopCapture}>⏹ 停止抓包</button>
                )}
                <button className={styles.smallBtn} onClick={loadApiRequests}>🔄 刷新</button>
                {apiRequests.length > 0 && (
                  <>
                    <button className={styles.smallBtn} onClick={handleCopyApiAll}>📋 复制全部</button>
                    <button className={styles.smallBtn} onClick={handleCopyApiCsv}>CSV</button>
                  </>
                )}
                <button className={styles.smallBtn} onClick={handleClearApi}>🗑 清空</button>
              </div>
              {apiRequests.length === 0 ? (
                <div className={styles.apiEmpty}>
                  {!capturing ? (
                    <>
                      <p>点击「开始抓包」按钮开始捕获接口请求</p>
                      <p className={styles.apiHint}>开始抓包后，在目标网页上操作触发请求，接口数据会自动捕获</p>
                    </>
                  ) : (
                    <>
                      <p>正在监听接口请求...</p>
                      <p className={styles.apiHint}>请在目标网页上操作触发请求，接口数据会自动捕获</p>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.apiSplit}>
                  <div className={styles.apiList}>
                    {apiRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`${styles.apiItem} ${selectedReq?.id === req.id ? styles.apiItemActive : ''}`}
                        onClick={() => handleSelectReq(req)}
                      >
                        <div className={styles.apiItemHeader}>
                          <span className={`${styles.methodBadge} ${styles[`method_${req.method.toLowerCase()}`]}`}>
                            {req.method}
                          </span>
                          <span className={styles.apiItemStatus}>{req.status ?? '...'}</span>
                          <span className={styles.apiItemTime}>{formatTime(req.timestamp)}</span>
                        </div>
                        <div className={styles.apiItemUrl}>{getShortUrl(req.url)}</div>
                      </div>
                    ))}
                  </div>
                  {selectedReq && (
                    <div className={styles.apiDetail}>
                      {!editMode ? (
                        <>
                          <div className={styles.apiDetailSection}>
                            <div className={styles.apiDetailHeader}>
                              <span>请求信息</span>
                              <div className={styles.apiDetailActions}>
                                <button className={styles.replayBtn} onClick={handleStartEdit}>✏️ 编辑重发</button>
                                <CopyButton text={requestToText(selectedReq)} label="复制" />
                              </div>
                            </div>
                            <div className={styles.apiDetailRow}>
                              <span className={styles.apiDetailLabel}>URL</span>
                              <code className={styles.apiDetailValue}>{selectedReq.url}</code>
                            </div>
                            <div className={styles.apiDetailRow}>
                              <span className={styles.apiDetailLabel}>Method</span>
                              <code className={styles.apiDetailValue}>{selectedReq.method}</code>
                            </div>
                            {selectedReq.contentType && (
                              <div className={styles.apiDetailRow}>
                                <span className={styles.apiDetailLabel}>Content-Type</span>
                                <code className={styles.apiDetailValue}>{selectedReq.contentType}</code>
                              </div>
                            )}
                            {selectedReq.status != null && (
                              <div className={styles.apiDetailRow}>
                                <span className={styles.apiDetailLabel}>Status</span>
                                <code className={`${styles.apiDetailValue} ${selectedReq.status < 400 ? styles.statusOk : styles.statusErr}`}>
                                  {selectedReq.status}
                                </code>
                              </div>
                            )}
                          </div>
                          <div className={styles.apiDetailSection}>
                            <div className={styles.apiDetailHeader}>
                              <span>请求头</span>
                              {Object.keys(selectedReq.headers || {}).length > 0 && (
                                <CopyButton text={JSON.stringify(selectedReq.headers, null, 2)} label="复制" />
                              )}
                            </div>
                            {Object.keys(selectedReq.headers || {}).length > 0 ? (
                              <pre className={styles.apiDetailPre}>{JSON.stringify(selectedReq.headers, null, 2)}</pre>
                            ) : (
                              <p className={styles.empty}>请求头未捕获，点击「编辑重发」可手动添加</p>
                            )}
                          </div>
                          {Object.keys(getUrlParams(selectedReq.url)).length > 0 && (
                            <div className={styles.apiDetailSection}>
                              <div className={styles.apiDetailHeader}>
                                <span>Query 参数</span>
                                <CopyButton text={JSON.stringify(getUrlParams(selectedReq.url), null, 2)} label="复制" />
                              </div>
                              <pre className={styles.apiDetailPre}>{JSON.stringify(getUrlParams(selectedReq.url), null, 2)}</pre>
                            </div>
                          )}
                          {selectedReq.requestBody && (
                            <div className={styles.apiDetailSection}>
                              <div className={styles.apiDetailHeader}>
                                <span>请求体</span>
                                <CopyButton text={selectedReq.requestBody} label="复制" />
                              </div>
                              <pre className={styles.apiDetailPre}>{tryFormatJson(selectedReq.requestBody)}</pre>
                            </div>
                          )}
                          <div className={styles.apiDetailSection}>
                            <div className={styles.apiDetailHeader}>
                              <span>响应头</span>
                              {Object.keys(selectedReq.responseHeaders || {}).length > 0 && (
                                <CopyButton text={JSON.stringify(selectedReq.responseHeaders, null, 2)} label="复制" />
                              )}
                            </div>
                            {Object.keys(selectedReq.responseHeaders || {}).length > 0 ? (
                              <pre className={styles.apiDetailPre}>{JSON.stringify(selectedReq.responseHeaders, null, 2)}</pre>
                            ) : (
                              <p className={styles.empty}>响应头未捕获</p>
                            )}
                          </div>
                          <div className={styles.apiDetailSection}>
                            <div className={styles.apiDetailHeader}>
                              <span>响应体</span>
                              {selectedReq.responseBody && (
                                <CopyButton text={selectedReq.responseBody} label="复制" />
                              )}
                            </div>
                            {selectedReq.responseBody ? (
                              <pre className={styles.apiDetailPre}>{tryFormatJson(selectedReq.responseBody)}</pre>
                            ) : (
                              <p className={styles.empty}>响应体未捕获，可点击「编辑重发」重新请求获取</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className={styles.apiDetailSection}>
                          <div className={styles.apiDetailHeader}>
                            <span>编辑请求参数</span>
                            <div className={styles.apiDetailActions}>
                              <button className={styles.replayBtn} onClick={handleReplay} disabled={replayLoading}>
                                {replayLoading ? '发送中...' : '🚀 发送请求'}
                              </button>
                              <button className={styles.smallBtn} onClick={() => setEditMode(false)}>取消</button>
                            </div>
                          </div>

                          <div className={styles.editRow}>
                            <label className={styles.editLabel}>Method</label>
                            <select className={styles.editSelect} value={editMethod} onChange={(e) => setEditMethod(e.target.value)}>
                              <option>GET</option>
                              <option>POST</option>
                              <option>PUT</option>
                              <option>PATCH</option>
                              <option>DELETE</option>
                            </select>
                          </div>

                          <div className={styles.editRow}>
                            <label className={styles.editLabel}>URL</label>
                            <input className={styles.editInput} value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                          </div>

                          <div className={styles.editSection}>
                            <div className={styles.editSectionHeader}>
                              <span>请求头</span>
                              <button className={styles.smallBtn} onClick={handleAddHeader}>+ 添加</button>
                            </div>
                            {Object.entries(editHeaders).map(([key, val]) => (
                              <div key={key} className={styles.editParamRow}>
                                <input
                                  className={styles.editParamKey}
                                  value={key}
                                  onChange={(e) => handleHeaderKeyChange(key, e.target.value)}
                                />
                                <input
                                  className={styles.editParamVal}
                                  value={val}
                                  onChange={(e) => handleHeaderChange(key, e.target.value)}
                                />
                                <button className={styles.removeParamBtn} onClick={() => handleRemoveHeader(key)}>✕</button>
                              </div>
                            ))}
                          </div>

                          <div className={styles.editSection}>
                            <div className={styles.editSectionHeader}>
                              <span>Query 参数</span>
                              <button className={styles.smallBtn} onClick={handleAddParam}>+ 添加</button>
                            </div>
                            {Object.entries(editParams).map(([key, val]) => (
                              <div key={key} className={styles.editParamRow}>
                                <input className={styles.editParamKey} value={key} readOnly />
                                <input className={styles.editParamVal} value={val} onChange={(e) => handleParamChange(key, e.target.value)} />
                                <button className={styles.removeParamBtn} onClick={() => handleRemoveParam(key)}>✕</button>
                              </div>
                            ))}
                          </div>

                          {editMethod !== 'GET' && (
                            <div className={styles.editSection}>
                              <div className={styles.editSectionHeader}>
                                <span>请求体</span>
                                <CopyButton text={editBody} label="复制" />
                              </div>
                              <textarea
                                className={styles.editTextarea}
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                rows={6}
                                placeholder="输入请求体 JSON..."
                              />
                            </div>
                          )}

                          {replayError && <div className={styles.error}>{replayError}</div>}

                          {replayResp && (
                            <div className={styles.editSection}>
                              <div className={styles.editSectionHeader}>
                                <span>响应结果</span>
                                <CopyButton text={replayResp.body} label="复制" />
                              </div>
                              <div className={styles.apiDetailRow}>
                                <span className={styles.apiDetailLabel}>Status</span>
                                <code className={`${styles.apiDetailValue} ${replayResp.status < 400 ? styles.statusOk : styles.statusErr}`}>
                                  {replayResp.status} {replayResp.statusText}
                                </code>
                              </div>
                              {replayResp.requestHeaders && Object.keys(replayResp.requestHeaders).length > 0 && (
                                <div className={styles.apiDetailRow} style={{ flexDirection: 'column', gap: 2 }}>
                                  <span className={styles.apiDetailLabel}>实际请求头</span>
                                  <pre className={styles.apiDetailPre} style={{ maxHeight: 150 }}>{JSON.stringify(replayResp.requestHeaders, null, 2)}</pre>
                                </div>
                              )}
                              {Object.keys(replayResp.headers).length > 0 && (
                                <div className={styles.apiDetailRow} style={{ flexDirection: 'column', gap: 2 }}>
                                  <span className={styles.apiDetailLabel}>响应头</span>
                                  <pre className={styles.apiDetailPre} style={{ maxHeight: 150 }}>{JSON.stringify(replayResp.headers, null, 2)}</pre>
                                </div>
                              )}
                              <div className={styles.apiDetailRow} style={{ flexDirection: 'column', gap: 2 }}>
                                <span className={styles.apiDetailLabel}>响应体</span>
                                <pre className={styles.apiDetailPre}>{tryFormatJson(replayResp.body)}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TableCard({ table, index }: { table: ScrapedTable; index: number }) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [headers, setHeaders] = useState<string[]>([...table.headers])
  const [rows, setRows] = useState<string[][]>(table.rows.map(r => [...r]))
  const [syncMsg, setSyncMsg] = useState('')
  const maxPreviewRows = 5
  const previewRows = expanded ? rows : rows.slice(0, maxPreviewRows)
  const hasMore = rows.length > maxPreviewRows

  const currentTable: ScrapedTable = { ...table, headers, rows }

  const handleSync = async () => {
    setSyncMsg('同步中...')
    try {
      const result = await Promise.race([
        syncTableToPage(table.domId || '', headers, rows),
        new Promise<{ success: boolean; error?: string; info?: string }>((resolve) =>
          setTimeout(() => resolve({ success: false, error: '同步超时，请重试' }), 10000)
        ),
      ])
      if (result.success) {
        setSyncMsg(`✅ 已同步到页面${result.info ? ' (' + result.info + ')' : ''}`)
      } else {
        setSyncMsg(`❌ ${result.error}`)
      }
    } catch {
      setSyncMsg('❌ 同步失败')
    }
    setTimeout(() => setSyncMsg(''), 3000)
  }

  const handleCopyCsv = () => {
    navigator.clipboard.writeText(tableToCsv(currentTable))
  }

  const handleExportExcel = async () => {
    try {
      const name = table.caption || `table-${index + 1}`
      await exportTableToExcel(currentTable, `${name}.xlsx`)
    } catch { /* ignore */ }
  }

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    setRows(prev => {
      const next = prev.map(r => [...r])
      next[rowIdx][colIdx] = value
      return next
    })
  }

  const handleHeaderChange = (colIdx: number, value: string) => {
    setHeaders(prev => {
      const next = [...prev]
      next[colIdx] = value
      return next
    })
  }

  const handleDeleteRow = (rowIdx: number) => {
    setRows(prev => prev.filter((_, i) => i !== rowIdx))
  }

  const handleAddRow = () => {
    const colCount = headers.length || rows[0]?.length || 1
    setRows(prev => [...prev, new Array(colCount).fill('')])
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          {table.caption || `表格 ${index + 1}`}
          <span className={styles.cardMeta}>{rows.length} 行 × {headers.length || rows[0]?.length || 0} 列</span>
        </span>
        <div className={styles.cardActions}>
          <button className={styles.smallBtn} onClick={() => setEditing(!editing)}>
            {editing ? '✅ 完成' : '✏️ 编辑'}
          </button>
          <CopyButton text={tableToText(currentTable)} label="复制" />
          <button className={styles.smallBtn} onClick={handleCopyCsv}>CSV</button>
          <button className={styles.smallBtn} onClick={handleExportExcel}>Excel</button>
        </div>
      </div>
      {editing && (
        <div className={styles.syncBar}>
          <span className={styles.syncHint}>📝 编辑后点击同步</span>
          <button className={styles.syncBtn} onClick={handleSync}>🔄 同步到页面</button>
          {syncMsg && <span className={syncMsg.startsWith('✅') ? styles.syncOk : styles.syncErr}>{syncMsg}</span>}
        </div>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          {headers.length > 0 && (
            <thead>
              <tr>{headers.map((h, i) => (
                <th key={i}>
                  {editing ? (
                    <input
                      className={styles.cellInput}
                      value={h}
                      onChange={(e) => handleHeaderChange(i, e.target.value)}
                    />
                  ) : h}
                </th>
              ))}</tr>
            </thead>
          )}
          <tbody>
            {previewRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>
                    {editing ? (
                      <input
                        className={styles.cellInput}
                        value={cell}
                        onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                      />
                    ) : cell}
                  </td>
                ))}
                {editing && (
                  <td className={styles.cellAction}>
                    <button className={styles.removeParamBtn} onClick={() => handleDeleteRow(ri)}>✕</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <button className={styles.expandBtn} onClick={handleAddRow}>+ 添加行</button>
      )}
      {!editing && hasMore && !expanded && (
        <button className={styles.expandBtn} onClick={() => setExpanded(true)}>
          显示全部 {rows.length} 行
        </button>
      )}
      {!editing && expanded && hasMore && (
        <button className={styles.expandBtn} onClick={() => setExpanded(false)}>
          收起
        </button>
      )}
    </div>
  )
}

function ListCard({ list, index }: { list: ScrapedList; index: number }) {
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<string[]>([...list.items])
  const [syncMsg, setSyncMsg] = useState('')

  const currentList: ScrapedList = { ...list, items }

  const handleSync = async () => {
    setSyncMsg('同步中...')
    try {
      const result = await Promise.race([
        syncListToPage(list.domId || '', items),
        new Promise<{ success: boolean; error?: string; info?: string }>((resolve) =>
          setTimeout(() => resolve({ success: false, error: '同步超时，请重试' }), 10000)
        ),
      ])
      if (result.success) {
        setSyncMsg(`✅ 已同步到页面${result.info ? ' (' + result.info + ')' : ''}`)
      } else {
        setSyncMsg(`❌ ${result.error}`)
      }
    } catch {
      setSyncMsg('❌ 同步失败')
    }
    setTimeout(() => setSyncMsg(''), 3000)
  }

  const handleItemChange = (idx: number, value: string) => {
    setItems(prev => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  const handleDeleteItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddItem = () => {
    setItems(prev => [...prev, ''])
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          {list.label || `列表 ${index + 1}`}
          <span className={styles.cardMeta}>{list.source.toUpperCase()} · {items.length} 项</span>
        </span>
        <div className={styles.cardActions}>
          <button className={styles.smallBtn} onClick={() => setEditing(!editing)}>
            {editing ? '✅ 完成' : '✏️ 编辑'}
          </button>
          <CopyButton text={listToText(currentList)} label="复制" />
        </div>
      </div>
      {editing && (
        <div className={styles.syncBar}>
          <span className={styles.syncHint}>📝 编辑后点击同步</span>
          <button className={styles.syncBtn} onClick={handleSync}>🔄 同步到页面</button>
          {syncMsg && <span className={syncMsg.startsWith('✅') ? styles.syncOk : styles.syncErr}>{syncMsg}</span>}
        </div>
      )}
      <ol className={styles.listItems}>
        {items.map((item, i) => (
          <li key={i} className={styles.listItemEdit}>
            {editing ? (
              <div className={styles.listItemRow}>
                <input
                  className={styles.cellInput}
                  value={item}
                  onChange={(e) => handleItemChange(i, e.target.value)}
                />
                <button className={styles.removeParamBtn} onClick={() => handleDeleteItem(i)}>✕</button>
              </div>
            ) : item}
          </li>
        ))}
      </ol>
      {editing && (
        <button className={styles.expandBtn} onClick={handleAddItem}>+ 添加项</button>
      )}
    </div>
  )
}

export default ScraperTool
