(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return;
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var _guard = false;
  function persistSelect(selectEl, desiredVal) {
    function enforce() {
      if (_guard) return;
      _guard = true;
      try {
        var found = false;
        for (var i = 0; i < selectEl.options.length; i++) {
          if (selectEl.options[i].value === desiredVal) { found = true; break; }
        }
        if (!found) {
          var o = document.createElement('option');
          o.value = desiredVal; o.textContent = desiredVal;
          selectEl.appendChild(o);
        }
        if (selectEl.value !== desiredVal) {
          var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
          if (setter && setter.set) setter.set.call(selectEl, desiredVal);
          else selectEl.value = desiredVal;
        }
      } catch(e) {}
      _guard = false;
    }
    enforce();
    var observer = new MutationObserver(function() { enforce(); });
    observer.observe(selectEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'selected'] });
    setTimeout(function() { observer.disconnect(); }, 60000);
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
      persistSelect(el, val);
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

  var info = { found: false, headers: 0, rows: 0, selects: 0, inputs: 0, items: 0 };

  if (type === 'table') {
    var newHeaders = JSON.parse(headersStr);
    var newRows = JSON.parse(rowsStr);
    var table = document.querySelector('table[data-devtoolkit-id="' + id + '"]');
    if (!table) { var allT = document.querySelectorAll('table'); table = allT.length > 0 ? allT[0] : null; }
    if (!table) return { ok: false, err: 'table not found: ' + id };
    info.found = true;

    if (newHeaders.length > 0) {
      var hc = table.querySelectorAll('thead th, thead td');
      for (var i = 0; i < newHeaders.length && i < hc.length; i++) { setCell(hc[i], newHeaders[i]); info.headers++; }
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
      for (var ci = 0; ci < newRows[ri].length && ci < cells.length; ci++) {
        setCell(cells[ci], newRows[ri][ci]);
        info.selects += cells[ci].querySelectorAll('select').length;
        info.inputs += cells[ci].querySelectorAll('input').length;
      }
      info.rows++;
    }
    for (var ri = erows.length - 1; ri >= newRows.length; ri--) erows[ri].remove();
  }

  if (type === 'list') {
    var newItems = JSON.parse(itemsStr);
    var list = document.querySelector('ul[data-devtoolkit-id="' + id + '"], ol[data-devtoolkit-id="' + id + '"]');
    if (!list) { var allL = document.querySelectorAll('ul, ol'); list = allL.length > 0 ? allL[0] : null; }
    if (!list) return { ok: false, err: 'list not found: ' + id };
    info.found = true;
    var eitems = list.querySelectorAll(':scope > li');
    for (var i = 0; i < newItems.length; i++) {
      if (i < eitems.length) setCell(eitems[i], newItems[i]);
      else { var li = document.createElement('li'); li.textContent = newItems[i]; list.appendChild(li); }
      info.items++;
    }
    for (var i = eitems.length - 1; i >= newItems.length; i--) eitems[i].remove();
  }

  return info;
})()
