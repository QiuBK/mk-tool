(function () {
  const CAPTURED_KEY = '__devtoolkit_captured'
  const PATCHED_KEY = '__devtoolkit_patched'
  if (window[PATCHED_KEY]) return
  window[PATCHED_KEY] = true
  if (!window[CAPTURED_KEY]) {
    window[CAPTURED_KEY] = []
  }
  const captured = window[CAPTURED_KEY]
  const MAX_CAPTURED = 200

  function isApiUrl(url) {
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

  function addEntry(entry) {
    captured.unshift(entry)
    if (captured.length > MAX_CAPTURED) captured.length = MAX_CAPTURED
  }

  const origFetch = window.fetch
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase()
    const headers = {}
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => { headers[k] = v })
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([k, v]) => { headers[k] = v })
      } else {
        Object.entries(init.headers).forEach(([k, v]) => { headers[k] = v })
      }
    }
    const body = init?.body ? String(init.body) : null

    if (isApiUrl(url)) {
      const entry = {
        id: `fetch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url,
        method,
        type: 'fetch',
        timestamp: Date.now(),
        requestBody: body,
        contentType: headers['Content-Type'] || headers['content-type'] || null,
        headers: { ...headers },
        status: null,
        tabId: -1,
        responseHeaders: {},
        responseBody: null,
      }
      addEntry(entry)
      return origFetch.apply(this, arguments).then(async (response) => {
        entry.status = response.status
        const respHeaders = {}
        response.headers.forEach((v, k) => { respHeaders[k] = v })
        entry.responseHeaders = respHeaders
        try {
          const cloned = response.clone()
          const text = await cloned.text()
          entry.responseBody = text.length > 50000 ? text.slice(0, 50000) : text
        } catch {}
        return response
      })
    }

    return origFetch.apply(this, arguments)
  }

  const origOpen = XMLHttpRequest.prototype.open
  const origSend = XMLHttpRequest.prototype.send
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__devtoolkit = { method: (method || 'GET').toUpperCase(), url: String(url), headers: {} }
    return origOpen.apply(this, arguments)
  }

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this.__devtoolkit) {
      this.__devtoolkit.headers[name] = value
    }
    return origSetHeader.apply(this, arguments)
  }

  XMLHttpRequest.prototype.send = function (body) {
    if (this.__devtoolkit && isApiUrl(this.__devtoolkit.url)) {
      const info = this.__devtoolkit
      const entry = {
        id: `xhr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: info.url,
        method: info.method,
        type: 'xhr',
        timestamp: Date.now(),
        requestBody: body ? String(body) : null,
        contentType: info.headers['Content-Type'] || info.headers['content-type'] || null,
        headers: { ...info.headers },
        status: null,
        tabId: -1,
        responseHeaders: {},
        responseBody: null,
      }
      addEntry(entry)
      this.addEventListener('load', function () {
        entry.status = this.status
        try {
          const allHeaders = this.getAllResponseHeaders()
          if (allHeaders) {
            const respHeaders = {}
            allHeaders.trim().split(/[\r\n]+/).forEach(function (line) {
              const parts = line.split(': ')
              const key = parts.shift()
              if (key) respHeaders[key] = parts.join(': ')
            })
            entry.responseHeaders = respHeaders
          }
        } catch {}
        try {
          const text = this.responseText
          entry.responseBody = text && text.length > 50000 ? text.slice(0, 50000) : text
        } catch {}
      })
    }
    return origSend.apply(this, arguments)
  }
})()
