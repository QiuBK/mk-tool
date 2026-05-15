(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element in DOM' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var diag = { type: type, id: id, foundElement: false, modified: 0, paths: [], componentsVisited: 0, dataSamples: [], piniaFound: false };

  function findVue3App() {
    var appEl = document.getElementById('app');
    if (appEl && appEl.__vue_app__) return appEl.__vue_app__;
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].__vue_app__) return all[i].__vue_app__;
    }
    return null;
  }

  function collectAllComponents(instance, depth, result) {
    if (!instance || depth > 20) return;
    result.push(instance);
    var subTree = instance.subTree;
    if (!subTree) return;
    if (subTree.component) {
      collectAllComponents(subTree.component, depth + 1, result);
    }
    var children = subTree.children;
    if (Array.isArray(children)) {
      for (var i = 0; i < children.length; i++) {
        if (children[i] && children[i].component) {
          collectAllComponents(children[i].component, depth + 1, result);
        }
        if (children[i] && children[i].dynamicChildren) {
          for (var j = 0; j < children[i].dynamicChildren.length; j++) {
            if (children[i].dynamicChildren[j] && children[i].dynamicChildren[j].component) {
              collectAllComponents(children[i].dynamicChildren[j].component, depth + 1, result);
            }
          }
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
    if (instance.subTree.children && !Array.isArray(instance.subTree.children) && instance.subTree.children.component) {
      collectAllComponents(instance.subTree.children.component, depth + 1, result);
    }
  }

  function tryModifyValue(obj, key, oldVal, newVal) {
    try {
      var cur = obj[key];
      if (cur === oldVal || cur === Number(oldVal) || String(cur) === String(oldVal)) {
        var setVal = (typeof cur === 'number') ? Number(newVal) : newVal;
        obj[key] = setVal;
        diag.modified++;
        diag.paths.push(key + '=' + oldVal + '->' + newVal + '(type:' + typeof cur + ')');
        return true;
      }
    } catch(e) {}
    return false;
  }

  function searchAndModify(instance, oldVal, newVal) {
    if (!instance) return;
    diag.componentsVisited++;
    var proxy = instance.proxy;
    var dataSources = [];
    try { if (instance.setupState) dataSources.push({ name: 'setupState', data: instance.setupState }); } catch(e) {}
    try { if (proxy && proxy.$data) dataSources.push({ name: '$data', data: proxy.$data }); } catch(e) {}
    try { if (proxy) dataSources.push({ name: 'proxy', data: proxy }); } catch(e) {}

    for (var di = 0; di < dataSources.length; di++) {
      var ds = dataSources[di].data;
      var dsName = dataSources[di].name;
      try {
        var keys = Object.keys(ds);
        if (diag.dataSamples.length < 3 && keys.length > 0) {
          var sample = { source: dsName, keys: keys.slice(0, 10) };
          for (var si = 0; si < Math.min(keys.length, 3); si++) {
            try {
              var sv = ds[keys[si]];
              if (Array.isArray(sv)) sample[keys[si]] = 'Array(' + sv.length + ')' + (sv.length > 0 && typeof sv[0] === 'object' ? JSON.stringify(Object.keys(sv[0]).slice(0, 5)) : '');
              else sample[keys[si]] = typeof sv + ':' + String(sv).substring(0, 30);
            } catch(e) {}
          }
          diag.dataSamples.push(sample);
        }
        for (var ki = 0; ki < keys.length; ki++) {
          var key = keys[ki];
          try {
            var val = ds[key];
            if (Array.isArray(val)) {
              for (var ri = 0; ri < val.length; ri++) {
                if (typeof val[ri] === 'object' && val[ri] !== null) {
                  var props = Object.keys(val[ri]);
                  for (var pi = 0; pi < props.length; pi++) {
                    if (tryModifyValue(val[ri], props[pi], oldVal, newVal)) return;
                  }
                } else {
                  if (tryModifyValue(val, ri, oldVal, newVal)) return;
                }
              }
            }
          } catch(e) {}
        }
      } catch(e) {}
    }
  }

  function findAndModifyVue3Data(app, oldVal, newVal) {
    var rootInstance = app._instance;
    if (!rootInstance) return;

    var allComponents = [];
    collectAllComponents(rootInstance, 0, allComponents);

    for (var i = 0; i < allComponents.length; i++) {
      searchAndModify(allComponents[i], oldVal, newVal);
      if (diag.modified > 0) return;
    }

    try {
      var pinia = app.config.globalProperties.$pinia;
      if (pinia) {
        diag.piniaFound = true;
        var stores = pinia._s;
        if (stores) {
          stores.forEach(function(store, storeName) {
            if (diag.modified > 0) return;
            var keys = Object.keys(store);
            for (var ki = 0; ki < keys.length; ki++) {
              var key = keys[ki];
              try {
                var val = store[key];
                if (Array.isArray(val)) {
                  for (var ri = 0; ri < val.length; ri++) {
                    if (typeof val[ri] === 'object' && val[ri] !== null) {
                      var props = Object.keys(val[ri]);
                      for (var pi = 0; pi < props.length; pi++) {
                        if (tryModifyValue(val[ri], props[pi], oldVal, newVal)) return;
                      }
                    } else {
                      if (tryModifyValue(val, ri, oldVal, newVal)) return;
                    }
                  }
                }
              } catch(e) {}
            }
          });
        }
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
        if (ns && ns.set) ns.set.call(ins[i], text);
        else ins[i].value = text;
        ins[i].dispatchEvent(new Event('input', { bubbles: true }));
        ins[i].dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (sels.length > 0) {
      for (var i = 0; i < sels.length; i++) {
        var found = false;
        for (var j = 0; j < sels[i].options.length; j++) {
          if (sels[i].options[j].textContent.trim() === text || sels[i].options[j].value === text) { found = true; break; }
        }
        if (!found) { var o = document.createElement('option'); o.value = text; o.textContent = text; sels[i].appendChild(o); }
        var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        if (setter && setter.set) setter.set.call(sels[i], text);
        else sels[i].value = text;
        sels[i].dispatchEvent(new Event('input', { bubbles: true }));
        sels[i].dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (tas.length > 0) {
      for (var i = 0; i < tas.length; i++) {
        tas[i].focus();
        var ns = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (ns && ns.set) ns.set.call(tas[i], text);
        else tas[i].value = text;
        tas[i].dispatchEvent(new Event('input', { bubbles: true }));
        tas[i].dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      var spans = cell.querySelectorAll('span');
      var oldText = cell.textContent.trim();
      if (spans.length > 0) {
        for (var i = 0; i < spans.length; i++) {
          if (spans[i].textContent.trim() === oldText) {
            spans[i].textContent = text;
          }
        }
      } else {
        cell.textContent = text;
      }
      var app = findVue3App();
      if (app) {
        findAndModifyVue3Data(app, oldText, text);
      }
    }
  }

  if (type === 'table') {
    var newHeaders = JSON.parse(headersStr);
    var newRows = JSON.parse(rowsStr);
    var table = document.querySelector('table[data-devtoolkit-id="' + id + '"]');
    if (!table) { var allT = document.querySelectorAll('table'); table = allT.length > 0 ? allT[0] : null; }
    if (!table) return { ok: false, err: 'table not found', diag: diag };
    diag.foundElement = true;
    if (newHeaders.length > 0) {
      var hc = table.querySelectorAll('thead th, thead td');
      for (var i = 0; i < newHeaders.length && i < hc.length; i++) setCell(hc[i], newHeaders[i]);
    }
    var tbody = table.querySelector('tbody');
    if (!tbody) { tbody = document.createElement('tbody'); table.appendChild(tbody); }
    var erows = tbody.querySelectorAll(':scope > tr');
    var cc = newHeaders.length || (newRows[0] ? newRows[0].length : 1);
    for (var ri = 0; ri < newRows.length; ri++) {
      var tr;
      if (ri < erows.length) tr = erows[ri];
      else { tr = document.createElement('tr'); for (var c = 0; c < cc; c++) { var td = document.createElement('td'); tr.appendChild(td); } tbody.appendChild(tr); }
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
    for (var i = 0; i < newItems.length; i++) {
      if (i < eitems.length) setCell(eitems[i], newItems[i]);
      else { var li = document.createElement('li'); li.textContent = newItems[i]; list.appendChild(li); }
    }
  }

  return { ok: true, diag: diag };
})()
