(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var diag = { type: type, id: id, foundElement: false, modified: 0, paths: [], appKeys: [], instanceInfo: null, domVueKeys: [] };

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
  if (appResult) {
    var app = appResult.app;
    var appEl = appResult.el;
    diag.appKeys = Object.keys(app).slice(0, 20);
    diag.instanceInfo = {
      hasInstance: !!app._instance,
      instanceType: app._instance ? typeof app._instance : 'none',
      instanceKeys: app._instance ? Object.keys(app._instance).slice(0, 15) : [],
      hasConfig: !!app.config,
      configKeys: app.config ? Object.keys(app.config).slice(0, 10) : [],
      hasGlobalProperties: !!(app.config && app.config.globalProperties),
      gpKeys: (app.config && app.config.globalProperties) ? Object.keys(app.config.globalProperties).slice(0, 10) : []
    };

    var elKeys = Object.keys(appEl);
    for (var i = 0; i < elKeys.length; i++) {
      if (elKeys[i].indexOf('__vue') === 0) diag.domVueKeys.push(elKeys[i] + ':' + typeof appEl[elKeys[i]]);
    }

    if (!app._instance) {
      var root = app._container || appEl;
      var vnode = root._vnode || root.__vue_app__ ? null : null;
      var allEl = document.querySelectorAll('*');
      for (var i = 0; i < Math.min(allEl.length, 500); i++) {
        var eKeys = Object.keys(allEl[i]);
        for (var j = 0; j < eKeys.length; j++) {
          if (eKeys[j].indexOf('__vueParentComponent') === 0) {
            var comp = allEl[i][eKeys[j]];
            diag.instanceInfo.foundParentComponent = true;
            diag.instanceInfo.pcKeys = Object.keys(comp).slice(0, 15);
            diag.instanceInfo.pcType = typeof comp;
            diag.instanceInfo.hasProxy = !!comp.proxy;
            diag.instanceInfo.hasSetupState = !!comp.setupState;
            if (comp.setupState) {
              diag.instanceInfo.setupKeys = Object.keys(comp.setupState).slice(0, 10);
            }
            break;
          }
        }
        if (diag.instanceInfo.foundParentComponent) break;
      }
    }
  }

  function tryModifyValue(obj, key, oldVal, newVal) {
    try {
      var cur = obj[key];
      if (cur === oldVal || cur === Number(oldVal) || String(cur) === String(oldVal)) {
        var setVal = (typeof cur === 'number') ? Number(newVal) : newVal;
        obj[key] = setVal;
        diag.modified++;
        diag.paths.push(key + '=' + oldVal + '->' + newVal);
        return true;
      }
    } catch(e) {}
    return false;
  }

  function searchComponentData(instance, oldVal, newVal) {
    if (!instance) return;
    var proxy = instance.proxy;
    var dataSources = [];
    try { if (instance.setupState) dataSources.push(instance.setupState); } catch(e) {}
    try { if (proxy && proxy.$data) dataSources.push(proxy.$data); } catch(e) {}
    try { if (proxy) dataSources.push(proxy); } catch(e) {}

    for (var di = 0; di < dataSources.length; di++) {
      var ds = dataSources[di];
      try {
        var keys = Object.keys(ds);
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

  function findAndModifyViaDOM(oldVal, newVal) {
    var allEl = document.querySelectorAll('*');
    for (var i = 0; i < allEl.length; i++) {
      var eKeys = Object.keys(allEl[i]);
      for (var j = 0; j < eKeys.length; j++) {
        if (eKeys[j].indexOf('__vueParentComponent') === 0) {
          var comp = allEl[i][eKeys[j]];
          searchComponentData(comp, oldVal, newVal);
          if (diag.modified > 0) return;
          var sub = comp.subTree;
          if (sub && sub.component) {
            searchComponentData(sub.component, oldVal, newVal);
            if (diag.modified > 0) return;
          }
        }
      }
    }

    if (appResult) {
      try {
        var pinia = appResult.app.config.globalProperties.$pinia;
        if (pinia && pinia._s) {
          diag.instanceInfo.piniaFound = true;
          pinia._s.forEach(function(store) {
            if (diag.modified > 0) return;
            var keys = Object.keys(store);
            for (var ki = 0; ki < keys.length; ki++) {
              try {
                var val = store[keys[ki]];
                if (Array.isArray(val)) {
                  for (var ri = 0; ri < val.length; ri++) {
                    if (typeof val[ri] === 'object' && val[ri] !== null) {
                      var props = Object.keys(val[ri]);
                      for (var pi = 0; pi < props.length; pi++) {
                        if (tryModifyValue(val[ri], props[pi], oldVal, newVal)) return;
                      }
                    }
                  }
                }
              } catch(e) {}
            }
          });
        }
      } catch(e) {}
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
      findAndModifyViaDOM(oldText, text);
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
