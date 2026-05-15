(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element in DOM' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var diag = { type: type, id: id, foundElement: false, selects: [], inputs: [], framework: 'unknown' };

  function detectFramework() {
    if (document.querySelector('[data-reactroot]') || document.getElementById('root') || document.getElementById('__next')) return 'react';
    if (document.querySelector('[data-v-]') || document.getElementById('app') || document.querySelector('[data-server-rendered]')) return 'vue';
    var allEl = document.querySelectorAll('*');
    for (var i = 0; i < Math.min(allEl.length, 50); i++) {
      var keys = Object.keys(allEl[i]);
      for (var j = 0; j < keys.length; j++) {
        if (keys[j].indexOf('__reactFiber') === 0) return 'react';
        if (keys[j].indexOf('__vue__') === 0) return 'vue';
      }
    }
    return 'unknown';
  }
  diag.framework = detectFramework();

  function inspectSelect(sel) {
    var info = {
      tagName: sel.tagName,
      currentValue: sel.value,
      optionCount: sel.options.length,
      optionValues: [],
      optionTexts: [],
      hasValueTracker: !!sel._valueTracker,
      reactFiberFound: false,
      onChangeFound: false,
      parentTag: sel.parentElement ? sel.parentElement.tagName : 'none'
    };
    for (var i = 0; i < sel.options.length; i++) {
      info.optionValues.push(sel.options[i].value);
      info.optionTexts.push(sel.options[i].textContent.trim());
    }
    var keys = Object.keys(sel);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('__reactFiber') === 0 || keys[i].indexOf('__reactInternalInstance') === 0) {
        info.reactFiberFound = true;
        var fiber = sel[keys[i]];
        while (fiber) {
          var p = fiber.memoizedProps || fiber.pendingProps;
          if (p) {
            if (typeof p.onChange === 'function') { info.onChangeFound = true; break; }
            if (typeof p.onInput === 'function') { info.onChangeFound = true; break; }
          }
          fiber = fiber.return;
        }
        break;
      }
    }
    return info;
  }

  function setVal(el, val) {
    el.focus();
    if (el.tagName === 'SELECT') {
      var found = false;
      for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].textContent.trim() === val || el.options[i].value === val) { found = true; break; }
      }
      if (!found) {
        var o = document.createElement('option');
        o.value = val; o.textContent = val;
        el.appendChild(o);
      }
      var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(el, val);
      else el.value = val;
      if (el._valueTracker) el._valueTracker.setValue('');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      diag.selects.push({ before: inspectSelect(el), setTo: val, afterValue: el.value });
    } else {
      el.focus();
      var ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (ns && ns.set) ns.set.call(el, '');
      else el.value = '';
      if (el._valueTracker) el._valueTracker.setValue('');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.select();
      var ok = false;
      try { document.execCommand('selectAll'); } catch(e) {}
      try { ok = document.execCommand('insertText', false, val); } catch(e) {}
      if (!ok) {
        if (ns && ns.set) ns.set.call(el, val);
        else el.value = val;
        if (el._valueTracker) el._valueTracker.setValue('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      el.dispatchEvent(new Event('change', { bubbles: true }));
      diag.inputs.push({ setTo: val, afterValue: el.value });
    }
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setCell(cell, text) {
    var ins = cell.querySelectorAll('input');
    var sels = cell.querySelectorAll('select');
    var tas = cell.querySelectorAll('textarea');
    for (var i = 0; i < ins.length; i++) setVal(ins[i], text);
    for (var i = 0; i < sels.length; i++) setVal(sels[i], text);
    for (var i = 0; i < tas.length; i++) setVal(tas[i], text);
    if (!ins.length && !sels.length && !tas.length) cell.textContent = text;
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
