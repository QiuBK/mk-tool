(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element in DOM' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var diag = { type: type, id: id, foundElement: false, modified: 0, paths: [], errors: [] };

  function findVue3App() {
    var appEl = document.getElementById('app');
    if (appEl && appEl.__vue_app__) return appEl.__vue_app__;
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].__vue_app__) return all[i].__vue_app__;
    }
    return null;
  }

  function walkVue3Components(instance, depth, callback) {
    if (!instance || depth > 15) return;
    try { callback(instance); } catch(e) {}
    if (instance.subTree && instance.subTree.component) {
      walkVue3Components(instance.subTree.component, depth + 1, callback);
    }
    if (instance.subTree && instance.subTree.children) {
      var children = instance.subTree.children;
      if (Array.isArray(children)) {
        for (var i = 0; i < children.length; i++) {
          if (children[i] && children[i].component) {
            walkVue3Components(children[i].component, depth + 1, callback);
          }
        }
      }
    }
    if (instance.subTree && instance.subTree.dynamicChildren) {
      var dc = instance.subTree.dynamicChildren;
      for (var i = 0; i < dc.length; i++) {
        if (dc[i] && dc[i].component) {
          walkVue3Components(dc[i].component, depth + 1, callback);
        }
      }
    }
  }

  function findAndModifyVue3Data(app, oldVal, newVal) {
    var found = false;
    var rootInstance = app._instance;
    if (!rootInstance) return false;

    walkVue3Components(rootInstance, 0, function(instance) {
      if (found) return;
      var proxy = instance.proxy;
      if (!proxy) return;

      var dataSources = [];
      try { if (instance.setupState) dataSources.push(instance.setupState); } catch(e) {}
      try { if (proxy.$data) dataSources.push(proxy.$data); } catch(e) {}
      try { dataSources.push(proxy); } catch(e) {}

      for (var di = 0; di < dataSources.length; di++) {
        if (found) break;
        var ds = dataSources[di];
        try {
          var keys = Object.keys(ds);
          for (var ki = 0; ki < keys.length; ki++) {
            if (found) break;
            var key = keys[ki];
            try {
              var val = ds[key];
              if (Array.isArray(val)) {
                for (var ri = 0; ri < val.length; ri++) {
                  if (found) break;
                  if (typeof val[ri] === 'object' && val[ri] !== null) {
                    var props = Object.keys(val[ri]);
                    for (var pi = 0; pi < props.length; pi++) {
                      var prop = props[pi];
                      try {
                        if (String(val[ri][prop]) === String(oldVal)) {
                          val[ri][prop] = newVal;
                          found = true;
                          diag.modified++;
                          diag.paths.push(key + '[' + ri + '].' + prop + '=' + oldVal + '->' + newVal);
                          break;
                        }
                      } catch(e) {}
                    }
                  } else if (String(val[ri]) === String(oldVal)) {
                    val[ri] = newVal;
                    found = true;
                    diag.modified++;
                    diag.paths.push(key + '[' + ri + ']=' + oldVal + '->' + newVal);
                  }
                }
              }
            } catch(e) {}
          }
        } catch(e) {}
      }
    });
    return found;
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
