(function () {
  const CAPTURED_KEY = '__devtoolkit_captured'
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
      addEntry({
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
      })
    }

    return origFetch.apply(this, arguments).then((response) => {
      if (isApiUrl(url)) {
        const entry = captured.find((e) => e.url === url && e.method === method && e.status === null)
        if (entry) entry.status = response.status
      }
      return response
    })
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
      }
      addEntry(entry)
      this.addEventListener('load', function () {
        entry.status = this.status
      })
    }
    return origSend.apply(this, arguments)
  }
})()
