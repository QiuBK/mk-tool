(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return;
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  function simulateInput(inputEl, newValue) {
    inputEl.focus();
    inputEl.dispatchEvent(new Event('focus', { bubbles: true }));

    if (inputEl.tagName === 'SELECT') {
      var found = false;
      var opts = inputEl.options;
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].textContent.trim() === newValue || opts[i].value === newValue) {
          found = true;
          break;
        }
      }
      if (!found) {
        var o = document.createElement('option');
        o.value = newValue;
        o.textContent = newValue;
        inputEl.appendChild(o);
      }
      var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(inputEl, newValue);
      else inputEl.value = newValue;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (inputEl.tagName === 'TEXTAREA') {
      inputEl.focus();
      inputEl.select();
      var ok = false;
      try { ok = document.execCommand('selectAll', false, null); } catch(e) {}
      try { ok = document.execCommand('insertText', false, newValue); } catch(e) {}
      if (!ok) {
        var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (setter && setter.set) setter.set.call(inputEl, newValue);
        else inputEl.value = newValue;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      inputEl.focus();
      var nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) nativeSetter.set.call(inputEl, '');
      else inputEl.value = '';
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.select();
      var ok = false;
      try { ok = document.execCommand('selectAll', false, null); } catch(e) {}
      try { ok = document.execCommand('insertText', false, newValue); } catch(e) {}
      if (!ok) {
        if (nativeSetter && nativeSetter.set) nativeSetter.set.call(inputEl, newValue);
        else inputEl.value = newValue;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    inputEl.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setCellContent(cell, text) {
    var inputs = cell.querySelectorAll('input');
    var selects = cell.querySelectorAll('select');
    var textareas = cell.querySelectorAll('textarea');
    if (inputs.length > 0) for (var i = 0; i < inputs.length; i++) simulateInput(inputs[i], text);
    if (selects.length > 0) for (var i = 0; i < selects.length; i++) simulateInput(selects[i], text);
    if (textareas.length > 0) for (var i = 0; i < textareas.length; i++) simulateInput(textareas[i], text);
    if (inputs.length === 0 && selects.length === 0 && textareas.length === 0) {
      cell.textContent = text;
    }
  }

  if (type === 'table') {
    var newHeaders = JSON.parse(headersStr);
    var newRows = JSON.parse(rowsStr);
    var table = document.querySelector('table[data-devtoolkit-id="' + id + '"]');
    if (!table) return;

    if (newHeaders.length > 0) {
      var hCells = table.querySelectorAll('thead th, thead td');
      for (var i = 0; i < newHeaders.length && i < hCells.length; i++) {
        setCellContent(hCells[i], newHeaders[i]);
      }
    }

    var tbody = table.querySelector('tbody');
    if (!tbody) { tbody = document.createElement('tbody'); table.appendChild(tbody); }
    var existingRows = tbody.querySelectorAll(':scope > tr');
    var colCount = newHeaders.length || (newRows[0] ? newRows[0].length : 1);

    for (var ri = 0; ri < newRows.length; ri++) {
      var tr;
      if (ri < existingRows.length) {
        tr = existingRows[ri];
      } else {
        tr = document.createElement('tr');
        for (var c = 0; c < colCount; c++) { var td = document.createElement('td'); tr.appendChild(td); }
        tbody.appendChild(tr);
      }
      var cells = tr.querySelectorAll('td, th');
      for (var ci = 0; ci < newRows[ri].length && ci < cells.length; ci++) {
        setCellContent(cells[ci], newRows[ri][ci]);
      }
    }

    for (var ri = existingRows.length - 1; ri >= newRows.length; ri--) {
      existingRows[ri].remove();
    }
  }

  if (type === 'list') {
    var newItems = JSON.parse(itemsStr);
    var list = document.querySelector('ul[data-devtoolkit-id="' + id + '"], ol[data-devtoolkit-id="' + id + '"]');
    if (!list) return;

    var existingItems = list.querySelectorAll(':scope > li');

    for (var i = 0; i < newItems.length; i++) {
      if (i < existingItems.length) {
        setCellContent(existingItems[i], newItems[i]);
      } else {
        var li = document.createElement('li');
        li.textContent = newItems[i];
        list.appendChild(li);
      }
    }

    for (var i = existingItems.length - 1; i >= newItems.length; i--) {
      existingItems[i].remove();
    }
  }
})();
