(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var diag = { type: type, id: id, foundElement: false, modified: 0, paths: [], storeList: [], stateSamples: [] };

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
            try { obj[key] = setVal; } catch(e) { try { obj[key] = setVal; } catch(e2) {} }
            diag.modified++;
            diag.paths.push(path + '.' + key + '=' + oldVal + '->' + newVal + '(t:' + typeof cur + ')');
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
                diag.paths.push(path + '.' + key + '[' + ri + ']=' + oldVal + '->' + newVal + '(t:' + typeof cur[ri] + ')');
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
      var storeNames = [];
      pinia._s.forEach(function(store, storeName) { storeNames.push(storeName); });
      diag.storeList = storeNames;

      pinia._s.forEach(function(store, storeName) {
        if (diag.modified > 0) return;

        var state = null;
        try { state = store.$state; } catch(e) {}
        if (state) {
          var stateKeys;
          try { stateKeys = Object.getOwnPropertyNames(state); } catch(e) { stateKeys = Object.keys(state); }
          if (diag.stateSamples.length < 3) {
            var sample = { store: storeName, stateKeys: stateKeys.slice(0, 15) };
            for (var si = 0; si < Math.min(stateKeys.length, 5); si++) {
              try {
                var sv = state[stateKeys[si]];
                if (Array.isArray(sv)) {
                  sample[stateKeys[si]] = 'Array(' + sv.length + ')';
                  if (sv.length > 0 && typeof sv[0] === 'object') {
                    sample[stateKeys[si] + '_objKeys'] = Object.keys(sv[0]).slice(0, 8);
                    var objSample = {};
                    var objKeys = Object.keys(sv[0]).slice(0, 5);
                    for (var oi = 0; oi < objKeys.length; oi++) {
                      try { objSample[objKeys[oi]] = typeof sv[0][objKeys[oi]] + ':' + String(sv[0][objKeys[oi]]).substring(0, 20); } catch(e) {}
                    }
                    sample[stateKeys[si] + '_sample'] = objSample;
                  }
                } else {
                  sample[stateKeys[si]] = typeof sv + ':' + String(sv).substring(0, 30);
                }
              } catch(e) {}
            }
            diag.stateSamples.push(sample);
          }
          if (deepSearchAndModify(state, oldVal, newVal, storeName + '.$state', 0)) return;
        }

        try { if (deepSearchAndModify(store, oldVal, newVal, storeName, 0)) return; } catch(e) {}
      });
    } catch(e) { diag.piniaError = e.message; }
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
