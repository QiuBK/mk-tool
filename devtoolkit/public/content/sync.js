(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return;
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items') || '[]';
  el.remove();

  var _persistedSelects = [];

  function findReactHandler(el) {
    var keys = Object.keys(el);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('__reactFiber') === 0 || keys[i].indexOf('__reactInternalInstance') === 0) {
        var fiber = el[keys[i]];
        while (fiber) {
          var p = fiber.memoizedProps || fiber.pendingProps;
          if (p) {
            if (typeof p.onChange === 'function') return p.onChange;
            if (typeof p.onInput === 'function') return p.onInput;
          }
          fiber = fiber.return;
        }
      }
    }
    if (el.__vue__) {
      var vm = el.__vue__;
      if (typeof vm.$emit === 'function') return function(v) { vm.$emit('input', v); vm.$emit('change', v); };
    }
    if (el.__vueParentComponent) {
      var vc = el.__vueParentComponent;
      if (vc && vc.emit) return function(v) { vc.emit('update:modelValue', v); vc.emit('change', v); };
    }
    return null;
  }

  function persistSelect(selectEl, desiredVal) {
    var nativeDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    var nativeGet = nativeDesc ? nativeDesc.get : null;
    var nativeSet = nativeDesc ? nativeDesc.set : null;

    function ensureOption() {
      var found = false;
      for (var i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value === desiredVal) { found = true; break; }
      }
      if (!found) {
        var o = document.createElement('option');
        o.value = desiredVal; o.textContent = desiredVal;
        selectEl.appendChild(o);
      }
    }

    function enforceValue() {
      ensureOption();
      var curVal;
      try { curVal = nativeGet ? nativeGet.call(selectEl) : selectEl.value; } catch(e) { curVal = selectEl.value; }
      if (curVal !== desiredVal) {
        if (nativeSet) nativeSet.call(selectEl, desiredVal);
        else selectEl.value = desiredVal;
      }
    }

    enforceValue();

    try {
      Object.defineProperty(selectEl, 'value', {
        get: function() { return desiredVal; },
        set: function(newVal) { if (nativeSet) nativeSet.call(this, newVal); },
        configurable: true
      });
    } catch(e) {}

    if (selectEl._valueTracker) selectEl._valueTracker.setValue('');

    var selectObserver = new MutationObserver(function() { enforceValue(); });
    selectObserver.observe(selectEl, { childList: true, subtree: true });

    var parent = selectEl.parentNode;
    var parentObserver = null;
    if (parent) {
      parentObserver = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          for (var j = 0; j < mutations[i].addedNodes.length; j++) {
            var node = mutations[i].addedNodes[j];
            if (node.tagName === 'SELECT' || node.querySelector && node.querySelector('select')) {
              var newSel = node.tagName === 'SELECT' ? node : node.querySelector('select');
              if (newSel) {
                selectObserver.disconnect();
                parentObserver.disconnect();
                clearInterval(timerId);
                persistSelect(newSel, desiredVal);
                return;
              }
            }
          }
        }
      });
      parentObserver.observe(parent, { childList: true, subtree: true });
    }

    var timerId = setInterval(function() {
      if (!document.body.contains(selectEl)) { clearInterval(timerId); selectObserver.disconnect(); if (parentObserver) parentObserver.disconnect(); return; }
      enforceValue();
    }, 200);

    setTimeout(function() {
      clearInterval(timerId);
      selectObserver.disconnect();
      if (parentObserver) parentObserver.disconnect();
      try { Object.defineProperty(selectEl, 'value', (nativeDesc && nativeDesc.configurable) ? nativeDesc : { get: nativeGet || function() { return this.getAttribute('value') || ''; }, set: function(v) { if (nativeSet) nativeSet.call(this, v); }, configurable: true }); } catch(e) {}
    }, 60000);

    _persistedSelects.push({ el: selectEl, val: desiredVal });
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

      var handler = findReactHandler(el);
      if (handler) {
        try { handler({ target: el, currentTarget: el, type: 'change' }); } catch(e) {}
      }

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
        var handler = findReactHandler(el);
        if (handler) {
          try { handler({ target: el, currentTarget: el, type: 'change' }); } catch(e) {}
        }
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
