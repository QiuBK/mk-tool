(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var diag = { type: type, id: id, foundElement: false, modified: 0, paths: [], compCount: 0, compSamples: [] };

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
    if (!obj || typeof obj !== 'object' || depth > 10) return false;
    var found = false;
    try {
      var keys;
      try { keys = Object.getOwnPropertyNames(obj); } catch(e) { keys = Object.keys(obj); }
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.startsWith('_') || key.startsWith('$') || key === 'constructor' || key === 'prototype' || key === '__proto__' || key === 'toJSON' || key === 'toString' || key === 'valueOf') continue;
        try {
          var cur = obj[key];
          if (cur === undefined || cur === null || typeof cur === 'function') continue;
          if (cur === oldVal || (typeof cur === 'number' && cur === Number(oldVal)) || (typeof cur !== 'object' && String(cur) === String(oldVal))) {
            var setVal = (typeof cur === 'number') ? Number(newVal) : newVal;
            try { obj[key] = setVal; } catch(e) {}
            diag.modified++;
            diag.paths.push(path + '.' + key + '=' + oldVal + '->' + newVal);
            found = true;
            continue;
          }
          if (Array.isArray(cur)) {
            for (var ri = 0; ri < cur.length; ri++) {
              if (typeof cur[ri] === 'object' && cur[ri] !== null) {
                if (deepSearchAndModify(cur[ri], oldVal, newVal, path + '.' + key + '[' + ri + ']', depth + 1)) found = true;
              } else if (cur[ri] !== null && cur[ri] !== undefined && (cur[ri] === oldVal || (typeof cur[ri] === 'number' && cur[ri] === Number(oldVal)) || (typeof cur[ri] !== 'object' && String(cur[ri]) === String(oldVal)))) {
                var setVal2 = (typeof cur[ri] === 'number') ? Number(newVal) : newVal;
                cur[ri] = setVal2;
                diag.modified++;
                diag.paths.push(path + '.' + key + '[' + ri + ']=' + oldVal + '->' + newVal);
                found = true;
              }
            }
          } else if (typeof cur === 'object' && cur !== null && !(cur instanceof HTMLElement) && !(cur instanceof Node)) {
            if (deepSearchAndModify(cur, oldVal, newVal, path + '.' + key, depth + 1)) found = true;
          }
        } catch(e) {}
      }
    } catch(e) {}
    return found;
  }

  function collectAllComponents(instance, depth, result) {
    if (!instance || depth > 25) return;
    result.push(instance);
    var subTree = instance.subTree;
    if (!subTree) return;
    if (subTree.component) collectAllComponents(subTree.component, depth + 1, result);
    if (Array.isArray(subTree.children)) {
      for (var i = 0; i < subTree.children.length; i++) {
        if (subTree.children[i] && subTree.children[i].component) {
          collectAllComponents(subTree.children[i].component, depth + 1, result);
        }
      }
    }
    if (subTree.dynamicChildren) {
      for (var i = 0; i < subTree.dynamicChildren.length; i++) {
        if (subTree.dynamicChildren[i] && subTree.dynamicChildren[i].component) {
          collectAllComponents(subTree.dynamicChildren[i].component, depth + 1, result);
        }
      }
    }
  }

  function searchComponentTree(oldVal, newVal) {
    if (!appResult) return;
    var app = appResult.app;
    var rootComp = null;
    try {
      if (app._instance) rootComp = app._instance;
      else if (app._container && app._container._vnode && app._container._vnode.component) rootComp = app._container._vnode.component;
    } catch(e) {}

    if (!rootComp) {
      try {
        var pinia = app.config.globalProperties.$pinia;
        if (pinia && pinia._s) {
          pinia._s.forEach(function(store) {
            try {
              var state = store.$state;
              if (state) deepSearchAndModify(state, oldVal, newVal, 'pinia.$state', 0);
            } catch(e) {}
          });
        }
      } catch(e) {}
      return;
    }

    var allComponents = [];
    collectAllComponents(rootComp, 0, allComponents);
    diag.compCount = allComponents.length;

    for (var ci = 0; ci < allComponents.length; ci++) {
      var comp = allComponents[ci];
      var proxy = comp.proxy;
      var dataSources = [];
      try { if (comp.setupState) dataSources.push({ name: 'setupState', data: comp.setupState }); } catch(e) {}
      try { if (proxy && proxy.$data) dataSources.push({ name: '$data', data: proxy.$data }); } catch(e) {}

      if (diag.compSamples.length < 3 && dataSources.length > 0) {
        var ds = dataSources[0];
        var sample = { source: ds.name, keys: Object.keys(ds.data).slice(0, 10) };
        for (var si = 0; si < Math.min(sample.keys.length, 3); si++) {
          try {
            var sv = ds.data[sample.keys[si]];
            if (Array.isArray(sv)) {
              sample[sample.keys[si]] = 'Array(' + sv.length + ')';
              if (sv.length > 0 && typeof sv[0] === 'object') sample[sample.keys[si] + '_keys'] = Object.keys(sv[0]).slice(0, 6);
            } else sample[sample.keys[si]] = typeof sv + ':' + String(sv).substring(0, 20);
          } catch(e) {}
        }
        diag.compSamples.push(sample);
      }

      for (var di = 0; di < dataSources.length; di++) {
        deepSearchAndModify(dataSources[di].data, oldVal, newVal, 'comp.' + dataSources[di].name, 0);
      }
    }

    try {
      var pinia = app.config.globalProperties.$pinia;
      if (pinia && pinia._s) {
        pinia._s.forEach(function(store) {
          try {
            var state = store.$state;
            if (state) deepSearchAndModify(state, oldVal, newVal, 'pinia.$state', 0);
          } catch(e) {}
        });
      }
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
      searchComponentTree(oldText, text);
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
