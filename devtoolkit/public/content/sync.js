(function() {
  var el = document.getElementById('__devtoolkit_sync__');
  if (!el) return { ok: false, err: 'no sync element in DOM' };
  var type = el.getAttribute('data-type');
  var id = el.getAttribute('data-id') || '';
  var headersStr = el.getAttribute('data-headers') || '[]';
  var rowsStr = el.getAttribute('data-rows') || '[]';
  var itemsStr = el.getAttribute('data-items')|| '[]';
  el.remove();

  var diag = {
    type: type, id: id, foundElement: false,
    rootIds: [], rootTags: [],
    vue2Root: false, vue3Root: false,
    reactRoot: false,
    tableHtml: '', cellSamples: [],
    allVueKeys: [], allReactKeys: []
  };

  var root = document.getElementById('root');
  var app = document.getElementById('app');
  var next = document.getElementById('__next');
  diag.rootIds = [
    root ? 'root' : '',
    app ? 'app' : '',
    next ? '__next' : ''
  ].filter(function(s) { return s; });
  if (root) diag.rootTags.push(root.children[0] ? root.children[0].tagName : 'empty');
  if (app) diag.rootTags.push(app.children[0] ? app.children[0].tagName : 'empty');

  if (root) {
    var rKeys = Object.keys(root);
    for (var i = 0; i < rKeys.length; i++) {
      if (rKeys[i].indexOf('__react') === 0) diag.reactRoot = true;
      if (rKeys[i].indexOf('__vue') === 0) diag.vue2Root = true;
    }
  }
  if (app) {
    var aKeys = Object.keys(app);
    for (var i = 0; i < aKeys.length; i++) {
      if (aKeys[i].indexOf('__react') === 0) diag.reactRoot = true;
      if (aKeys[i].indexOf('__vue') === 0) diag.vue2Root = true;
    }
  }

  var allEl = document.querySelectorAll('*');
  var vueCount = 0, reactCount = 0;
  for (var i = 0; i < Math.min(allEl.length, 200); i++) {
    var keys = Object.keys(allEl[i]);
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].indexOf('__vue') === 0) { vueCount++; if (diag.allVueKeys.indexOf(keys[j]) === -1 && diag.allVueKeys.length < 5) diag.allVueKeys.push(keys[j]); }
      if (keys[j].indexOf('__react') === 0) { reactCount++; if (diag.allReactKeys.indexOf(keys[j]) === -1 && diag.allReactKeys.length < 5) diag.allReactKeys.push(keys[j]); }
    }
  }
  diag.vueCount = vueCount;
  diag.reactCount = reactCount;

  function setCell(cell, text) {
    var sample = {
      text: text,
      html: cell.innerHTML.substring(0, 200),
      children: cell.children.length,
      childTags: []
    };
    for (var i = 0; i < Math.min(cell.children.length, 5); i++) {
      sample.childTags.push(cell.children[i].tagName + (cell.children[i].className ? '.' + cell.children[i].className.split(' ')[0] : ''));
    }
    var keys = Object.keys(cell);
    var specialKeys = [];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('__vue') === 0 || keys[i].indexOf('__react') === 0 || keys[i].indexOf('data-v') === 0) {
        specialKeys.push(keys[i]);
      }
    }
    sample.specialKeys = specialKeys.slice(0, 5);

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
    }
    diag.cellSamples.push(sample);
  }

  if (type === 'table') {
    var newHeaders = JSON.parse(headersStr);
    var newRows = JSON.parse(rowsStr);
    var table = document.querySelector('table[data-devtoolkit-id="' + id + '"]');
    if (!table) { var allT = document.querySelectorAll('table'); table = allT.length > 0 ? allT[0] : null; }
    if (!table) return { ok: false, err: 'table not found', diag: diag };
    diag.foundElement = true;
    diag.tableHtml = table.outerHTML.substring(0, 500);
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
