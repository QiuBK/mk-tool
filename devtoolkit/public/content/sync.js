(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return;
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  function findReactFiber(dom) {
    var keys = Object.keys(dom);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('reactFiber') !== -1 || keys[i].indexOf('reactInternalInstance') !== -1) {
        return dom[keys[i]];
      }
    }
    return null;
  }

  function findReactOnChange(fiber) {
    var current = fiber;
    while (current) {
      var props = current.memoizedProps || current.pendingProps;
      if (props) {
        if (typeof props.onChange === 'function') return props.onChange;
        if (typeof props.onInput === 'function') return props.onInput;
      }
      current = current.return;
    }
    return null;
  }

  function setElementValue(el, val) {
    el.focus();
    el.dispatchEvent(new Event('focus', { bubbles: true }));

    if (el.tagName === 'SELECT') {
      var found = false;
      var opts = el.options;
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].textContent.trim() === val || opts[i].value === val) {
          found = true; break;
        }
      }
      if (!found) {
        var o = document.createElement('option');
        o.value = val; o.textContent = val;
        el.appendChild(o);
      }
      var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(el, val);
      else el.value = val;

      var fiber = findReactFiber(el);
      if (fiber) {
        var onChange = findReactOnChange(fiber);
        if (onChange) {
          try {
            onChange({
              target: el,
              currentTarget: el,
              type: 'change',
              preventDefault: function() {},
              stopPropagation: function() {},
              persist: function() {},
              nativeEvent: new Event('change'),
            });
          } catch(e) {}
        }
      }

      if (el._valueTracker) el._valueTracker.setValue('');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

    } else if (el.tagName === 'TEXTAREA') {
      el.focus();
      el.select();
      var ok = false;
      try { document.execCommand('selectAll'); } catch(e) {}
      try { ok = document.execCommand('insertText', false, val); } catch(e) {}
      if (!ok) {
        var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (setter && setter.set) setter.set.call(el, val);
        else el.value = val;

        var fiber = findReactFiber(el);
        if (fiber) {
          var onChange = findReactOnChange(fiber);
          if (onChange) {
            try {
              onChange({
                target: el,
                currentTarget: el,
                type: 'change',
                preventDefault: function() {},
                stopPropagation: function() {},
                persist: function() {},
                nativeEvent: new Event('change'),
              });
            } catch(e) {}
          }
        }

        if (el._valueTracker) el._valueTracker.setValue('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }

    } else {
      el.focus();
      var nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) nativeSetter.set.call(el, '');
      else el.value = '';
      if (el._valueTracker) el._valueTracker.setValue('');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.select();
      var ok = false;
      try { document.execCommand('selectAll'); } catch(e) {}
      try { ok = document.execCommand('insertText', false, val); } catch(e) {}
      if (!ok) {
        if (nativeSetter && nativeSetter.set) nativeSetter.set.call(el, val);
        else el.value = val;

        var fiber = findReactFiber(el);
        if (fiber) {
          var onChange = findReactOnChange(fiber);
          if (onChange) {
            try {
              onChange({
                target: el,
                currentTarget: el,
                type: 'change',
                preventDefault: function() {},
                stopPropagation: function() {},
                persist: function() {},
                nativeEvent: new Event('change'),
              });
            } catch(e) {}
          }
        }

        if (el._valueTracker) el._valueTracker.setValue('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setCellContent(cell, text) {
    var inputs = cell.querySelectorAll('input');
    var selects = cell.querySelectorAll('select');
    var textareas = cell.querySelectorAll('textarea');
    if (inputs.length > 0) for (var i = 0; i < inputs.length; i++) setElementValue(inputs[i], text);
    if (selects.length > 0) for (var i = 0; i < selects.length; i++) setElementValue(selects[i], text);
    if (textareas.length > 0) for (var i = 0; i < textareas.length; i++) setElementValue(textareas[i], text);
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
