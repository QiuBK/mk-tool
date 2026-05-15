(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var diag = { type: type, id: id, foundElement: false, modified: 0, paths: [], piniaStores: [], componentData: [] };

  function findVue3App() {
    var appEl = document.getElementById('app');
    if (appEl && appEl.__vue_app__) return { app: appEl.__vue_app__, el: appEl };
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].__vue_app__) return { app: all[i].__vue_app__, el: all[i] };
    }
    return null;
  }

  var appResult = findVue3App();

  function deepSearchAndModify(obj, oldVal, newVal, path, depth) {
    if (!obj || typeof obj !== 'object' || depth > 5) return false;
    try {
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.startsWith('_') || key.startsWith('__')) continue;
        try {
          var cur = obj[key];
          if (cur === oldVal || cur === Number(oldVal) || String(cur) === String(oldVal)) {
            var setVal = (typeof cur === 'number') ? Number(newVal) : newVal;
            obj[key] = setVal;
            diag.modified++;
            diag.paths.push(path + '.' + key + '=' + oldVal + '->' + newVal);
            return true;
          }
          if (Array.isArray(cur)) {
            for (var ri = 0; ri < cur.length; ri++) {
              if (typeof cur[ri] === 'object' && cur[ri] !== null) {
                if (deepSearchAndModify(cur[ri], oldVal, newVal, path + '.' + key + '[' + ri + ']', depth + 1)) return true;
              } else if (cur[ri] === oldVal || cur[ri] === Number(oldVal) || String(cur[ri]) === String(oldVal)) {
                var setVal2 = (typeof cur[ri] === 'number') ? Number(newVal) : newVal;
                cur[ri] = setVal2;
                diag.modified++;
                diag.paths.push(path + '.' + key + '[' + ri + ']=' + oldVal + '->' + newVal);
                return true;
              }
            }
          } else if (typeof cur === 'object' && cur !== null && !Array.isArray(cur)) {
            if (deepSearchAndModify(cur, oldVal, newVal, path + '.' + key, depth + 1)) return true;
          }
        } catch(e) {}
      }
    } catch(e) {}
    return false;
  }

  function searchPinia(oldVal, newVal) {
    if (!appResult) return;
    try {
      var pinia = appResult.app.config.globalProperties.$pinia;
      if (!pinia || !pinia._s) return;
      pinia._s.forEach(function(store, storeName) {
        if (diag.modified > 0) return;
        var storeInfo = { name: storeName, keys: Object.keys(store).slice(0, 15) };
        var sampleKeys = Object.keys(store).slice(0, 5);
        for (var si = 0; si < sampleKeys.length; si++) {
          try {
            var sv = store[sampleKeys[si]];
            if (Array.isArray(sv)) {
              storeInfo[sampleKeys[si]] = 'Array(' + sv.length + ')';
              if (sv.length > 0 && typeof sv[0] === 'object') {
                storeInfo[sampleKeys[si] + '_keys'] = Object.keys(sv[0]).slice(0, 8);
                var sampleObj = sv[0];
                var objSample = {};
                var objKeys = Object.keys(sampleObj).slice(0, 5);
                for (var oi = 0; oi < objKeys.length; oi++) {
                  objSample[objKeys[oi]] = typeof sampleObj[objKeys[oi]] + ':' + String(sampleObj[objKeys[oi]]).substring(0, 20);
                }
                storeInfo[sampleKeys[si] + '_sample'] = objSample;
              }
            } else {
              storeInfo[sampleKeys[si]] = typeof sv + ':' + String(sv).substring(0, 30);
            }
          } catch(e) {}
        }
        diag.piniaStores.push(storeInfo);
        deepSearchAndModify(store, oldVal, newVal, storeName, 0);
      });
    } catch(e) { diag.piniaError = e.message; }
  }

  function searchComponentTree(oldVal, newVal) {
    if (!appResult) return;
    var app = appResult.app;
    var container = app._container;
    if (container && container._vnode && container._vnode.component) {
      var rootComp = container._vnode.component;
      var proxy = rootComp.proxy;
      if (proxy) {
        var dataSources = [];
        try { if (rootComp.setupState) dataSources.push({ name: 'setupState', data: rootComp.setupState }); } catch(e) {}
        try { if (proxy.$data) dataSources.push({ name: '$data', data: proxy.$data }); } catch(e) {}
        try { dataSources.push({ name: 'proxy', data: proxy }); } catch(e) {}
        for (var di = 0; di < dataSources.length; di++) {
          var dsInfo = { source: dataSources[di].name, keys: Object.keys(dataSources[di].data).slice(0, 10) };
          diag.componentData.push(dsInfo);
          if (deepSearchAndModify(dataSources[di].data, oldVal, newVal, dataSources[di].name, 0)) return;
        }
      }
    }
    var context = app._context;
    if (context) {
      var ctxKeys = Object.keys(context).slice(0, 10);
      diag.componentData.push({ source: '_context', keys: ctxKeys });
    }
  }

  function setCell(cell, text) {
    var ins = cell.querySelectorAll('input');
    var sels = cell.querySelectorAll('select');
    var tas = cell.querySelectorAll('textarea');
    if (ins.length > 0) {
      for (var i = 0; i < ins.length; i++) {
        ins[i].focus();
        var ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        if (ns && ns.set) ns.set.call(ins[i], text); else ins[i].value = text;
        ins[i].dispatchEvent(new Event('input', { bubbles: true }));
        ins[i].dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (sels.length > 0) {
      for (var i = 0; i < sels.length; i++) {
        var found = false;
        for (var j = 0; j < sels[i].options.length; j++) { if (sels[i].options[j].textContent.trim() === text || sels[i].options[j].value === text) { found = true; break; } }
        if (!found) { var o = document.createElement('option'); o.value = text; o.textContent = text; sels[i].appendChild(o); }
        var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        if (setter && setter.set) setter.set.call(sels[i], text); else sels[i].value = text;
        sels[i].dispatchEvent(new Event('input', { bubbles: true }));
        sels[i].dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (tas.length > 0) {
      for (var i = 0; i < tas.length; i++) {
        tas[i].focus();
        var ns = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (ns && ns.set) ns.set.call(tas[i], text); else tas[i].value = text;
        tas[i].dispatchEvent(new Event('input', { bubbles: true }));
        tas[i].dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      var spans = cell.querySelectorAll('span');
      var oldText = cell.textContent.trim();
      if (spans.length > 0) { for (var i = 0; i < spans.length; i++) { if (spans[i].textContent.trim() === oldText) spans[i].textContent = text; } }
      else { cell.textContent = text; }
      searchPinia(oldText, text);
      if (diag.modified === 0) searchComponentTree(oldText, text);
    }
  }

  if (type === 'table') {
    var newHeaders = JSON.parse(headersStr);
    var newRows = JSON.parse(rowsStr);
    var table = document.querySelector('table[data-devtoolkit-id="' + id + '"]');
    if (!table) { var allT = document.querySelectorAll('table'); table = allT.length > 0 ? allT[0] : null; }
    if (!table) return { ok: false, err: 'table not found', diag: diag };
    diag.foundElement = true;
    if (newHeaders.length > 0) { var hc = table.querySelectorAll('thead th, thead td'); for (var i = 0; i < newHeaders.length && i < hc.length; i++) setCell(hc[i], newHeaders[i]); }
    var tbody = table.querySelector('tbody');
    if (!tbody) { tbody = document.createElement('tbody'); table.appendChild(tbody); }
    var erows = tbody.querySelectorAll(':scope > tr');
    var cc = newHeaders.length || (newRows[0] ? newRows[0].length : 1);
    for (var ri = 0; ri < newRows.length; ri++) {
      var tr; if (ri < erows.length) tr = erows[ri]; else { tr = document.createElement('tr'); for (var c = 0; c < cc; c++) { var td = document.createElement('td'); tr.appendChild(td); } tbody.appendChild(tr); }
      var cells = tr.querySelectorAll('td, th');
      for (var ci = 0; ci < newRows[ri].length && ci < cells.length; ci++) setCell(cells[ci], newRows[ri][ci]);
    }
  }

  if (type === 'list') {
    var newItems = JSON.parse(itemsStr);
    var list = document.querySelector('ul[data-devtoolkit-id="' + id + '"], ol[data-devtoolkit-id="' + id + '"]');
    if (!list) { var allL = document.querySelectorAll('ul, ol'); list = allL.length > 0 ? allL[0] : null; }
    if (!list) return { ok: false, err: 'list not found', diag: diag };
    diag.foundElement = true;
    var eitems = list.querySelectorAll(':scope > li');
    for (var i = 0; i < newItems.length; i++) { if (i < eitems.length) setCell(eitems[i], newItems[i]); else { var li = document.createElement('li'); li.textContent = newItems[i]; list.appendChild(li); } }
  }

  return { ok: true, diag: diag };
})()
