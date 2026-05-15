(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element in DOM' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var diag = { type: type, id: id, foundElement: false, vueInfo: null, cellInfo: [] };

  function findVueInstance(el) {
    var current = el;
    while (current && current !== document.body) {
      if (current.__vue__) return { version: 2, instance: current.__vue__, el: current };
      if (current.__vueParentComponent) return { version: 3, instance: current.__vueParentComponent, el: current };
      current = current.parentElement;
    }
    return null;
  }

  function inspectVueData(vmInfo) {
    if (!vmInfo) return null;
    var info = { version: vmInfo.version, dataKeys: [], hasTable: false };
    try {
      if (vmInfo.version === 2) {
        var vm = vmInfo.instance;
        info.dataKeys = Object.keys(vm.$data || {});
        for (var i = 0; i < info.dataKeys.length; i++) {
          var key = info.dataKeys[i];
          var val = vm.$data[key];
          if (Array.isArray(val)) {
            info[key + '_length'] = val.length;
            if (val.length > 0 && typeof val[0] === 'object') {
              info[key + '_sampleKeys'] = Object.keys(val[0]).slice(0, 10);
            }
          }
        }
      } else if (vmInfo.version === 3) {
        var vm = vmInfo.instance;
        var proxy = vm.proxy;
        if (proxy) {
          info.dataKeys = Object.keys(proxy.$data || proxy);
          for (var i = 0; i < info.dataKeys.length; i++) {
            var key = info.dataKeys[i];
            var val = proxy[key];
            if (Array.isArray(val)) {
              info[key + '_length'] = val.length;
              if (val.length > 0 && typeof val[0] === 'object') {
                info[key + '_sampleKeys'] = Object.keys(val[0]).slice(0, 10);
              }
            }
          }
        }
        if (vm.setupState) {
          info.setupKeys = Object.keys(vm.setupState).slice(0, 20);
          for (var i = 0; i < Math.min(info.setupKeys.length, 10); i++) {
            var key = info.setupKeys[i];
            var val = vm.setupState[key];
            if (Array.isArray(val)) {
              info[key + '_length'] = val.length;
              if (val.length > 0 && typeof val[0] === 'object') {
                info[key + '_sampleKeys'] = Object.keys(val[0]).slice(0, 10);
              }
            }
          }
        }
      }
    } catch(e) { info.error = e.message; }
    return info;
  }

  function setCell(cell, text) {
    var cellDiag = { text: text, hasInput: false, hasSelect: false, hasVue: false, vueModified: false };
    var ins = cell.querySelectorAll('input');
    var sels = cell.querySelectorAll('select');
    var tas = cell.querySelectorAll('textarea');
    cellDiag.hasInput = ins.length > 0;
    cellDiag.hasSelect = sels.length > 0;

    if (ins.length > 0) {
      for (var i = 0; i < ins.length; i++) {
        ins[i].focus();
        var ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        if (ns && ns.set) ns.set.call(ins[i], text);
        else ins[i].value = text;
        ins[i].dispatchEvent(new Event('input', { bubbles: true }));
        ins[i].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    if (sels.length > 0) {
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
    }
    if (tas.length > 0) {
      for (var i = 0; i < tas.length; i++) {
        tas[i].focus();
        var ns = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (ns && ns.set) ns.set.call(tas[i], text);
        else tas[i].value = text;
        tas[i].dispatchEvent(new Event('input', { bubbles: true }));
        tas[i].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    if (!ins.length && !sels.length && !tas.length) {
      cell.textContent = text;

      var vmInfo = findVueInstance(cell);
      if (vmInfo) {
        cellDiag.hasVue = true;
        try {
          if (vmInfo.version === 2) {
            var vm = vmInfo.instance;
            var data = vm.$data;
            for (var key in data) {
              if (!data.hasOwnProperty(key)) continue;
              var val = data[key];
              if (Array.isArray(val)) {
                for (var ri = 0; ri < val.length; ri++) {
                  if (typeof val[ri] === 'object') {
                    for (var prop in val[ri]) {
                      if (String(val[ri][prop]) === cell.textContent || String(val[ri][prop]) === text) {
                        vm.$set(val[ri], prop, text);
                        cellDiag.vueModified = true;
                        cellDiag.vuePath = key + '[' + ri + '].' + prop;
                      }
                    }
                  }
                }
              }
            }
          } else if (vmInfo.version === 3) {
            var vm = vmInfo.instance;
            var proxy = vm.proxy;
            var dataSources = [];
            if (vm.setupState) dataSources.push(vm.setupState);
            if (proxy) dataSources.push(proxy);
            for (var di = 0; di < dataSources.length; di++) {
              var ds = dataSources[di];
              for (var key in ds) {
                if (!ds.hasOwnProperty(key)) continue;
                var val = ds[key];
                if (Array.isArray(val)) {
                  for (var ri = 0; ri < val.length; ri++) {
                    if (typeof val[ri] === 'object') {
                      for (var prop in val[ri]) {
                        if (String(val[ri][prop]) === text) {
                          val[ri][prop] = text;
                          cellDiag.vueModified = true;
                          cellDiag.vuePath = key + '[' + ri + '].' + prop;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch(e) { cellDiag.vueError = e.message; }
      }
    }
    diag.cellInfo.push(cellDiag);
  }

  if (type === 'table') {
    var newHeaders = JSON.parse(headersStr);
    var newRows = JSON.parse(rowsStr);
    var table = document.querySelector('table[data-devtoolkit-id="' + id + '"]');
    if (!table) { var allT = document.querySelectorAll('table'); table = allT.length > 0 ? allT[0] : null; }
    if (!table) return { ok: false, err: 'table not found', diag: diag };
    diag.foundElement = true;

    var vmInfo = findVueInstance(table);
    diag.vueInfo = inspectVueData(vmInfo);

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

    var vmInfo = findVueInstance(list);
    diag.vueInfo = inspectVueData(vmInfo);

    var eitems = list.querySelectorAll(':scope > li');
    for (var i = 0; i < newItems.length; i++) {
      if (i < eitems.length) setCell(eitems[i], newItems[i]);
      else { var li = document.createElement('li'); li.textContent = newItems[i]; list.appendChild(li); }
    }
  }

  return { ok: true, diag: diag };
})()
