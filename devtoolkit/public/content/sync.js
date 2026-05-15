(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var diag = { type: type, id: id, foundElement: false, modified: 0, paths: [], allStores: {} };

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

  function inspectStore(store, storeName) {
    var info = { name: storeName };
    var state = null;
    try { state = store.$state; } catch(e) { info.stateError = e.message; }
    if (!state) { info.noState = true; return info; }
    var stateKeys;
    try { stateKeys = Object.getOwnPropertyNames(state); } catch(e) { stateKeys = Object.keys(state); }
    info.stateKeys = stateKeys.slice(0, 20);
    for (var i = 0; i < Math.min(stateKeys.length, 10); i++) {
      var key = stateKeys[i];
      if (key.startsWith('_') || key.startsWith('$')) continue;
      try {
        var val = state[key];
        if (Array.isArray(val)) {
          info[key] = 'Array(' + val.length + ')';
          if (val.length > 0 && typeof val[0] === 'object') {
            info[key + '_keys'] = Object.keys(val[0]).slice(0, 10);
            if (val.length > 0) {
              var sample = {};
              var objKeys = Object.keys(val[0]).slice(0, 6);
              for (var j = 0; j < objKeys.length; j++) {
                try { sample[objKeys[j]] = typeof val[0][objKeys[j]] + ':' + String(val[0][objKeys[j]]).substring(0, 25); } catch(e) {}
              }
              info[key + '_sample'] = sample;
            }
          } else if (val.length > 0) {
            info[key + '_first'] = typeof val[0] + ':' + String(val[0]).substring(0, 25);
          }
        } else if (typeof val === 'object' && val !== null) {
          var subKeys;
          try { subKeys = Object.getOwnPropertyNames(val); } catch(e) { subKeys = Object.keys(val); }
          info[key] = 'Object(' + subKeys.length + ') keys:[' + subKeys.slice(0, 8).join(',') + ']';
        } else {
          info[key] = typeof val + ':' + String(val).substring(0, 30);
        }
      } catch(e) { info[key] = 'error:' + e.message; }
    }
    return info;
  }

  function collectAllStoreInfo() {
    if (!appResult) return;
    try {
      var pinia = appResult.app.config.globalProperties.$pinia;
      if (!pinia || !pinia._s) return;
      pinia._s.forEach(function(store, storeName) {
        diag.allStores[storeName] = inspectStore(store, storeName);
      });
    } catch(e) { diag.piniaError = e.message; }
  }

  function deepSearchAndModify(obj, oldVal, newVal, path, depth) {
    if (!obj || typeof obj !== 'object' || depth > 8) return false;
    try {
      var keys;
      try { keys = Object.getOwnPropertyNames(obj); } catch(e) { keys = Object.keys(obj); }
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.startsWith('_') || key.startsWith('$') || key === 'constructor' || key === 'prototype' || key === '__proto__') continue;
        try {
          var cur = obj[key];
          if (cur === oldVal || (typeof cur === 'number' && cur === Number(oldVal)) || (typeof cur !== 'object' && String(cur) === String(oldVal))) {
            var setVal = (typeof cur === 'number') ? Number(newVal) : newVal;
            try { obj[key] = setVal; } catch(e) {}
            diag.modified++;
            diag.paths.push(path + '.' + key + '=' + oldVal + '->' + newVal);
            return true;
          }
          if (Array.isArray(cur)) {
            for (var ri = 0; ri < cur.length; ri++) {
              if (typeof cur[ri] === 'object' && cur[ri] !== null) {
                if (deepSearchAndModify(cur[ri], oldVal, newVal, path + '.' + key + '[' + ri + ']', depth + 1)) return true;
              } else if (cur[ri] === oldVal || (typeof cur[ri] === 'number' && cur[ri] === Number(oldVal)) || (typeof cur[ri] !== 'object' && String(cur[ri]) === String(oldVal))) {
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

  function searchAllPiniaStores(oldVal, newVal) {
    if (!appResult) return;
    try {
      var pinia = appResult.app.config.globalProperties.$pinia;
      if (!pinia || !pinia._s) return;
      pinia._s.forEach(function(store, storeName) {
        if (diag.modified > 0) return;
        var state = null;
        try { state = store.$state; } catch(e) {}
        if (state) {
          if (deepSearchAndModify(state, oldVal, newVal, storeName + '.$state', 0)) return;
        }
        try { if (deepSearchAndModify(store, oldVal, newVal, storeName, 0)) return; } catch(e) {}
      });
    } catch(e) {}
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
      searchAllPiniaStores(oldText, text);
    }
  }

  collectAllStoreInfo();

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
