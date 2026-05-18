(async function(){
  var result = {count:0, found:[], debug:[], storeDetail:[], domActions:[], fetchCalled:[], emitCalled:[]};
  var pageSizeNames = ['pageSize','limit','perPage','page_size','rowsPerPage','itemsPerPage','pSize','pageLimit','maxPerPage','itemLimit'];
  var pageNumNames = ['currentPage','current','pageNo','pageNum','pageIndex'];

  function findApp(){
    var el = document.getElementById('app');
    if(el && el.__vue_app__) return el.__vue_app__;
    var all = document.querySelectorAll('*');
    for(var i=0;i<all.length;i++){
      if(all[i].__vue_app__) return all[i].__vue_app__;
    }
    return null;
  }

  function safeKeys(obj){
    if(!obj || typeof obj !== 'object') return [];
    try { return Object.getOwnPropertyNames(obj).filter(function(x){return !x.startsWith('__')}); } catch(e) {}
    try { return Object.keys(obj); } catch(e) {}
    return [];
  }

  function deepSearch(obj, depth, path){
    if(!obj || typeof obj !== 'object' || depth > 15) return;
    var keys;
    try { keys = safeKeys(obj); } catch(e) { return; }
    var pathL = path.toLowerCase();
    var inPagContext = pathL.indexOf('pagin') !== -1 || pathL.indexOf('pager') !== -1;
    for(var i=0; i<keys.length; i++){
      var key = keys[i];
      if(key === 'constructor' || key === 'prototype' || key === '__proto__' ||
         key === 'toJSON' || key === 'toString' || key === 'valueOf') continue;
      try {
        var val = obj[key];
        if(val === undefined || val === null || typeof val === 'function') continue;
        if(typeof val === 'number' && pageSizeNames.indexOf(key) !== -1){
          if(val < 9999){
            try { obj[key] = 9999; result.count++; result.found.push(path+'.'+key+'='+val+'->'+obj[key]+'(name)'); }
            catch(e) { result.debug.push('FAIL:'+path+'.'+key+':'+e.message); }
          }
        }
        if(typeof val === 'number' && pageNumNames.indexOf(key) !== -1){
          if(val !== 1){
            try { obj[key] = 1; result.count++; result.found.push(path+'.'+key+'='+val+'->1(page)'); } catch(e) {}
          }
        }
        if(inPagContext && typeof val === 'number' && val > 1 && val <= 200){
          try { obj[key] = 9999; result.count++; result.found.push(path+'.'+key+'='+val+'->'+obj[key]+'(pagCtx)'); }
          catch(e) { result.debug.push('FAIL_PAG:'+path+'.'+key+':'+e.message); }
        }
        if(typeof val === 'object' && val !== null && !Array.isArray(val) &&
           !(val instanceof HTMLElement) && !(val instanceof Node) &&
           !(val instanceof Date) && !(val instanceof RegExp) &&
           !(val instanceof Error) && !(val instanceof Map) && !(val instanceof Set)){
          deepSearch(val, depth+1, path+'.'+key);
        }
      } catch(e) { if(depth < 3) result.debug.push('ERR:'+path+'.'+key+':'+e.message); }
    }
  }

  function collectComponents(inst, d, arr){
    if(!inst || d > 25) return;
    arr.push(inst);
    var st = inst.subTree;
    if(!st) return;
    if(st.component) collectComponents(st.component, d+1, arr);
    if(Array.isArray(st.children)){
      for(var i=0; i<st.children.length; i++){
        if(st.children[i] && st.children[i].component) collectComponents(st.children[i].component, d+1, arr);
      }
    }
    if(st.dynamicChildren){
      for(var i=0; i<st.dynamicChildren.length; i++){
        if(st.dynamicChildren[i] && st.dynamicChildren[i].component) collectComponents(st.dynamicChildren[i].component, d+1, arr);
      }
    }
  }

  function findPaginationComponents(allComps){
    var pagComps = [];
    for(var i=0; i<allComps.length; i++){
      var comp = allComps[i];
      try {
        var typeName = '';
        if(comp.vnode && comp.vnode.type) {
          if(typeof comp.vnode.type === 'object' && comp.vnode.type.name) typeName = comp.vnode.type.name;
          else if(typeof comp.vnode.type === 'string') typeName = comp.vnode.type;
        }
        if(!typeName && comp.type && comp.type.name) typeName = comp.type.name;
        var nameL = typeName.toLowerCase();
        if(nameL.indexOf('pagination') !== -1 || nameL.indexOf('pager') !== -1){
          pagComps.push({comp: comp, name: typeName, index: i});
          continue;
        }
      } catch(e){}
      try {
        var props = comp.vnode && comp.vnode.props ? comp.vnode.props : {};
        var hasPageSize = false;
        for(var pk in props){
          if(pk.toLowerCase().indexOf('pagesize') !== -1 || pk.toLowerCase().indexOf('page-size') !== -1 ||
             pk.toLowerCase().indexOf('pagesize') !== -1 || pk.toLowerCase().indexOf('sizes') !== -1){
            hasPageSize = true; break;
          }
        }
        if(hasPageSize) pagComps.push({comp: comp, name: 'hasPageSizeProp', index: i});
      } catch(e){}
    }
    return pagComps;
  }

  function tryEmitSizeChange(pagComp){
    var comp = pagComp.comp;
    try {
      if(comp.emit){
        comp.emit('update:page-size', 9999);
        comp.emit('size-change', 9999);
        comp.emit('update:currentPage', 1);
        comp.emit('current-change', 1);
        result.emitCalled.push('emit_size-change_9999');
        return true;
      }
    } catch(e){
      result.debug.push('emit_err:'+e.message);
    }
    try {
      var vnode = comp.vnode;
      if(vnode && vnode.props){
        if(vnode.props['onSize-change']) { vnode.props['onSize-change'](9999); result.emitCalled.push('vnode_onSizeChange_9999'); return true; }
        if(vnode.props['onSizeChange']) { vnode.props['onSizeChange'](9999); result.emitCalled.push('vnode_onSizeChange_9999'); return true; }
        if(vnode.props['onUpdate:page-size']) { vnode.props['onUpdate:page-size'](9999); result.emitCalled.push('vnode_onUpdatePageSize_9999'); return true; }
        if(vnode.props['onUpdate:pageSize']) { vnode.props['onUpdate:pageSize'](9999); result.emitCalled.push('vnode_onUpdatePageSize2_9999'); return true; }
        for(var pk in vnode.props){
          var pkL = pk.toLowerCase();
          if((pkL.indexOf('size') !== -1 || pkL.indexOf('change') !== -1) && typeof vnode.props[pk] === 'function'){
            try { vnode.props[pk](9999); result.emitCalled.push('vnode_'+pk+'_9999'); return true; } catch(e){}
          }
        }
      }
    } catch(e){
      result.debug.push('vnode_emit_err:'+e.message);
    }
    return false;
  }

  function tryCallFetchOnParent(pagComp, allComps){
    var comp = pagComp.comp;
    var parent = comp.parent;
    if(!parent) return false;
    var sources = [];
    try { if(parent.setupState) sources.push({name: 'setupState', data: parent.setupState}); } catch(e){}
    try { if(parent.proxy) sources.push({name: 'proxy', data: parent.proxy}); } catch(e){}
    for(var si=0; si<sources.length; si++){
      var src = sources[si];
      try {
        var srcKeys = safeKeys(src.data);
        for(var fi=0; fi<srcKeys.length; fi++){
          var mname = srcKeys[fi];
          if(typeof src.data[mname] !== 'function') continue;
          var ml = mname.toLowerCase();
          if(ml.indexOf('fetch') !== -1 || ml.indexOf('load') !== -1 || ml.indexOf('query') !== -1 ||
             ml.indexOf('search') !== -1 || ml.indexOf('refresh') !== -1 || ml.indexOf('reload') !== -1 ||
             ml.indexOf('getlist') !== -1 || ml.indexOf('getdata') !== -1 || ml.indexOf('gettable') !== -1 ||
             ml.indexOf('getpage') !== -1 || ml.indexOf('init') !== -1){
            try {
              src.data[mname]();
              result.fetchCalled.push('parent.'+src.name+'.'+mname);
              return true;
            } catch(e){
              result.debug.push('parent_fetch_err:'+mname+':'+e.message);
            }
          }
        }
      } catch(e){}
    }
    return false;
  }

  function tryCallFetchAny(allComps){
    for(var ci=0; ci<allComps.length; ci++){
      var comp = allComps[ci];
      var sources = [];
      try { if(comp.setupState) sources.push({name: 'setupState', data: comp.setupState}); } catch(e){}
      try { if(comp.proxy) sources.push({name: 'proxy', data: comp.proxy}); } catch(e){}
      for(var si=0; si<sources.length; si++){
        var src = sources[si];
        try {
          var srcKeys = safeKeys(src.data);
          for(var fi=0; fi<srcKeys.length; fi++){
            var mname = srcKeys[fi];
            if(typeof src.data[mname] !== 'function') continue;
            var ml = mname.toLowerCase();
            if(ml.indexOf('fetch') !== -1 || ml.indexOf('load') !== -1 || ml.indexOf('query') !== -1 ||
               ml.indexOf('search') !== -1 || ml.indexOf('refresh') !== -1 || ml.indexOf('reload') !== -1 ||
               ml.indexOf('getlist') !== -1 || ml.indexOf('getdata') !== -1 || ml.indexOf('gettable') !== -1 ||
               ml.indexOf('getpage') !== -1){
              try {
                src.data[mname]();
                result.fetchCalled.push('comp['+ci+'].'+src.name+'.'+mname);
                return true;
              } catch(e){
                result.debug.push('fetch_err:'+mname+':'+e.message);
              }
            }
          }
        } catch(e){}
      }
    }
    return false;
  }

  function dumpStoreStructure(store, sn){
    var detail = {name: sn, stateKeys: [], nested: []};
    try {
      var state = store.$state;
      if(!state) { detail.stateKeys = ['NO_STATE']; return detail; }
      detail.stateKeys = safeKeys(state).slice(0, 30);
      for(var i=0; i<detail.stateKeys.length; i++){
        var key = detail.stateKeys[i];
        try {
          var val = state[key];
          if(typeof val === 'object' && val !== null && !Array.isArray(val)){
            var subKeys = safeKeys(val).slice(0, 15);
            var nestedInfo = {key: key, keys: subKeys, sub: []};
            for(var j=0; j<subKeys.length; j++){
              try {
                var subVal = val[subKeys[j]];
                if(typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal)){
                  var subSubKeys = safeKeys(subVal).slice(0, 10);
                  var subSubInfo = {key: subKeys[j], keys: subSubKeys, vals: {}};
                  for(var k=0; k<subSubKeys.length; k++){
                    try {
                      var v = subVal[subSubKeys[k]];
                      if(typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string'){
                        subSubInfo.vals[subSubKeys[k]] = typeof v + '=' + String(v).substring(0, 30);
                      } else if(Array.isArray(v)){
                        subSubInfo.vals[subSubKeys[k]] = 'Array(' + v.length + ')';
                      } else if(typeof v === 'object' && v !== null){
                        subSubInfo.vals[subSubKeys[k]] = '{' + safeKeys(v).slice(0, 5).join(',') + '}';
                      }
                    } catch(e){}
                  }
                  nestedInfo.sub.push(subSubInfo);
                } else if(typeof subVal === 'number'){
                  nestedInfo.sub.push({key: subKeys[j], val: subVal});
                }
              } catch(e){}
            }
            detail.nested.push(nestedInfo);
          } else if(Array.isArray(val)){
            detail.nested.push({key: key, val: 'Array(' + val.length + ')'});
          } else {
            detail.nested.push({key: key, val: typeof val + '=' + String(val).substring(0, 30)});
          }
        } catch(e){ detail.nested.push({key: key, err: e.message}); }
      }
    } catch(e){ detail.stateKeys = ['ERR:' + e.message]; }
    return detail;
  }

  var app = findApp();
  result.debug.push('app:' + (app ? 'found' : 'not_found'));

  var allComps = [];
  var rootComp = null;

  if(app){
    try {
      var rootComp = null;
      if(app._instance) rootComp = app._instance;
      else if(app._container && app._container._vnode && app._container._vnode.component)
        rootComp = app._container._vnode.component;
      result.debug.push('rootComp:' + (rootComp ? 'found' : 'not_found'));
      if(rootComp){
        collectComponents(rootComp, 0, allComps);
        result.debug.push('compCount:' + allComps.length);
      }
    } catch(e){ result.debug.push('comp_err:' + e.message); }

    try {
      var pinia = app.config.globalProperties.$pinia;
      if(pinia && pinia._s){
        var storeNames = [];
        pinia._s.forEach(function(store, sn){ storeNames.push(sn); });
        result.debug.push('stores:' + storeNames.join(','));
        pinia._s.forEach(function(store, sn){
          result.storeDetail.push(dumpStoreStructure(store, sn));
        });
      }
    } catch(e){ result.debug.push('pinia_err:' + e.message); }
  }

  // Phase 1: el-select DOM interaction first (triggers proper Vue event chain)
  try {
    var pagSelectors = '.el-pagination, .ant-pagination, [class*="pagination"], [class*="Pagination"]';
    var pagSels = document.querySelectorAll(pagSelectors);
    result.debug.push('dom_pag:' + pagSels.length);

    for(var i=0; i<pagSels.length; i++){
      var sizesArea = pagSels[i].querySelector('.el-pagination__sizes');
      if(sizesArea){
        var elSelects = sizesArea.querySelectorAll('.el-select');
        for(var j=0; j<elSelects.length; j++){
          try {
            var wrapper = elSelects[j].querySelector('.el-select__wrapper');
            if(!wrapper) wrapper = elSelects[j].querySelector('.el-input__wrapper');
            if(!wrapper) wrapper = elSelects[j];
            wrapper.click();
            result.debug.push('el_select_trigger:'+i+':'+j);

            var dropdownFound = false;
            for(var wait=0; wait<10; wait++){
              await new Promise(function(r){ setTimeout(r, 200); });
              var poppers = document.querySelectorAll('.el-select-dropdown, .el-popper');
              for(var k=0; k<poppers.length; k++){
                var popper = poppers[k];
                var style = window.getComputedStyle(popper);
                if(style.display === 'none' || style.visibility === 'hidden') continue;
                var items = popper.querySelectorAll('.el-select-dropdown__item, .el-option');
                if(items.length === 0) continue;
                var maxItem = null; var maxItemVal = 0;
                for(var l=0; l<items.length; l++){
                  var itemText = items[l].textContent.trim();
                  var itemVal = Number(itemText);
                  if(!isNaN(itemVal) && itemVal > maxItemVal){ maxItemVal = itemVal; maxItem = items[l]; }
                }
                if(maxItem){
                  maxItem.click();
                  result.domActions.push('el_select:'+maxItemVal);
                  result.debug.push('el_select_clicked:'+maxItemVal);
                  dropdownFound = true;
                  break;
                }
              }
              if(dropdownFound) break;
            }
            if(!dropdownFound) result.debug.push('el_select_no_dropdown:'+i+':'+j);
            await new Promise(function(r){ setTimeout(r, 300); });
          } catch(e){ result.debug.push('el_select_err:'+i+':'+j+':'+e.message); }
        }
      }
    }
  } catch(e){ result.debug.push('dom_err:' + e.message); }

  // Phase 2: Wait for el-select event to propagate, then modify store to 9999
  await new Promise(function(r){ setTimeout(r, 500); });

  if(app){
    try {
      var pinia = app.config.globalProperties.$pinia;
      if(pinia && pinia._s){
        pinia._s.forEach(function(store, sn){
          try {
            var state = store.$state;
            if(state) deepSearch(state, 0, sn+'.$state');
          } catch(e) {}
        });
      }
    } catch(e) {}

    // Phase 3: Find el-pagination component and emit size-change with 9999
    if(allComps.length > 0){
      var pagComps = findPaginationComponents(allComps);
      result.debug.push('pagComps_found:' + pagComps.length);
      for(var pi=0; pi<pagComps.length; pi++){
        result.debug.push('pagComp['+pi+']:'+pagComps[pi].name);
        tryEmitSizeChange(pagComps[pi]);
        tryCallFetchOnParent(pagComps[pi], allComps);
      }

      // Phase 4: Try to call fetch on any component
      if(result.fetchCalled.length === 0){
        tryCallFetchAny(allComps);
      }

      // Phase 5: If still no fetch, list all methods for debugging
      if(result.fetchCalled.length === 0 && result.emitCalled.length === 0){
        result.debug.push('no_emit_no_fetch');
        for(var ci=0; ci<Math.min(allComps.length, 15); ci++){
          var comp = allComps[ci];
          var methods = [];
          try {
            var sk = safeKeys(comp.setupState);
            for(var mi=0; mi<sk.length; mi++){
              if(typeof comp.setupState[sk[mi]] === 'function' && sk[mi].charAt(0) !== '_'){
                methods.push(sk[mi]);
              }
            }
          } catch(e){}
          if(methods.length > 0) result.debug.push('comp['+ci+']_methods:'+methods.slice(0,20).join(','));
        }
      }
    }
  }

  return result;
})()
