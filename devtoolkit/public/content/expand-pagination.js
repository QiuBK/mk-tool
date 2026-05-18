(async function(){
  var result = {count:0, found:[], debug:[], storeDetail:[], domActions:[], fetchCalled:[], emitCalled:[]};
  var pageSizeNames = ['pageSize','limit','perPage','page_size','rowsPerPage','itemsPerPage','pSize','pageLimit','maxPerPage','itemLimit','size'];
  var pageNumNames = ['currentPage','current','pageNo','pageNum','pageIndex','page'];
  var commonPageSizes = [5, 10, 15, 20, 25, 30, 50, 100, 200, 500];

  function findApp(){
    var el = document.getElementById('app');
    if(el && el.__vue_app__) return el.__vue_app__;
    var all = document.querySelectorAll('*');
    for(var i=0;i<all.length;i++){ if(all[i].__vue_app__) return all[i].__vue_app__; }
    return null;
  }

  function safeKeys(obj){
    if(!obj || typeof obj !== 'object') return [];
    try { return Object.getOwnPropertyNames(obj).filter(function(x){return !x.startsWith('__')}); } catch(e) {}
    try { return Object.keys(obj); } catch(e) {}
    return [];
  }

  function isCommonPageSize(val){
    return typeof val === 'number' && commonPageSizes.indexOf(val) !== -1;
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
        if(typeof val === 'number' && pageSizeNames.indexOf(key) !== -1 && val < 9999){
          try { obj[key] = 9999; result.count++; result.found.push(path+'.'+key+'='+val+'->'+obj[key]); }
          catch(e) { result.debug.push('FAIL:'+path+'.'+key+':'+e.message); }
        }
        if(typeof val === 'number' && pageNumNames.indexOf(key) !== -1 && val !== 1){
          try { obj[key] = 1; result.count++; result.found.push(path+'.'+key+'='+val+'->1'); } catch(e) {}
        }
        if(inPagContext && typeof val === 'number' && val > 1 && val <= 500){
          try { obj[key] = 9999; result.count++; result.found.push(path+'.'+key+'='+val+'->'+obj[key]+'(ctx)'); }
          catch(e) {}
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

  function searchComponentLocalState(comp, idx){
    var modified = 0;
    var sources = [];
    try { if(comp.setupState) sources.push({name:'setupState', data: comp.setupState}); } catch(e){}
    try { if(comp.data) sources.push({name:'data', data: comp.data}); } catch(e){}

    for(var si=0; si<sources.length; si++){
      var src = sources[si];
      try {
        var keys = safeKeys(src.data);
        for(var i=0; i<keys.length; i++){
          var key = keys[i];
          if(key.startsWith('_') || key.startsWith('$')) continue;
          try {
            var val = src.data[key];
            if(val === undefined || val === null || typeof val === 'function') continue;

            if(typeof val === 'number' && isCommonPageSize(val)){
              var keyL = key.toLowerCase();
              var isPagRelated = keyL.indexOf('size') !== -1 || keyL.indexOf('limit') !== -1 ||
                keyL.indexOf('per') !== -1 || keyL.indexOf('rows') !== -1 || keyL.indexOf('page') !== -1 ||
                keyL === 'size' || keyL === 'limit' || keyL === 'num' || keyL === 'count';
              if(isPagRelated){
                try {
                  src.data[key] = 9999;
                  result.count++;
                  result.found.push('comp['+idx+'].'+src.name+'.'+key+'='+val+'->9999(local)');
                  modified++;
                } catch(e) {
                  result.debug.push('LOCAL_FAIL:comp['+idx+'].'+src.name+'.'+key+':'+e.message);
                }
              }
            }

            if(typeof val === 'object' && val !== null && !Array.isArray(val) &&
               !(val instanceof HTMLElement) && !(val instanceof Node)){
              var subKeys = safeKeys(val);
              for(var j=0; j<subKeys.length; j++){
                var subKey = subKeys[j];
                if(subKey.startsWith('_') || subKey.startsWith('$')) continue;
                try {
                  var subVal = val[subKey];
                  if(typeof subVal === 'number' && isCommonPageSize(subVal)){
                    var subKeyL = subKey.toLowerCase();
                    var isSubPag = subKeyL.indexOf('size') !== -1 || subKeyL.indexOf('limit') !== -1 ||
                      subKeyL.indexOf('per') !== -1 || subKeyL.indexOf('rows') !== -1 || subKeyL.indexOf('page') !== -1;
                    if(isSubPag){
                      try {
                        val[subKey] = 9999;
                        result.count++;
                        result.found.push('comp['+idx+'].'+src.name+'.'+key+'.'+subKey+'='+subVal+'->9999(local)');
                if(subKeyL.indexOf('size') !== -1 || subKeyL.indexOf('limit') !== -1 ||
                       subKeyL.indexOf('per') !== -1 || subKeyL.indexOf('rows') !== -1 || subKeyL.indexOf('page') !== -1){
                      try {
                        val[subKey] = 9999;
                        result.count++;
                        result.found.push('comp['+idx+'].'+src.name+'.'+key+'.'+subKey+'='+subVal+'->9999(local2)');
                        modified++;
                      } catch(e) {}
                    }
                  }
                } catch(e) {}
              }
            }
          } catch(e) {}
        }
      } catch(e) {}
    }
    return modified;
  }

  function tryEmitSizeChange(comp){
    try {
      if(comp.emit){
        comp.emit('update:page-size', 9999);
        comp.emit('size-change', 9999);
        comp.emit('update:currentPage', 1);
        comp.emit('current-change', 1);
        result.emitCalled.push('emit_size-change_9999');
        return true;
      }
    } catch(e){ result.debug.push('emit_err:'+e.message); }
    try {
      var vnode = comp.vnode;
      if(vnode && vnode.props){
        var propKeys = safeKeys(vnode.props);
        for(var i=0; i<propKeys.length; i++){
          var pk = propKeys[i];
          var pkL = pk.toLowerCase();
          if((pkL.indexOf('size') !== -1 || pkL.indexOf('change') !== -1) && typeof vnode.props[pk] === 'function'){
            try { vnode.props[pk](9999); result.emitCalled.push('vnode_'+pk+'_9999'); return true; } catch(e){}
          }
        }
      }
    } catch(e){ result.debug.push('vnode_emit_err:'+e.message); }
    return false;
  }

  function tryCallFetch(comp, idx, label){
    var sources = [];
    try { if(comp.setupState) sources.push({name:'setupState', data: comp.setupState}); } catch(e){}
    try { if(comp.proxy) sources.push({name:'proxy', data: comp.proxy}); } catch(e){}
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
             ml.indexOf('getpage') !== -1 || ml.indexOf('handlesearch') !== -1 || ml.indexOf('handlequery') !== -1 ||
             ml.indexOf('onsearch') !== -1 || ml.indexOf('onquery') !== -1 || ml.indexOf('submit') !== -1){
            try {
              src.data[mname]();
              result.fetchCalled.push(label+'.'+src.name+'.'+mname);
              return true;
            } catch(e){
              result.debug.push('fetch_err:'+label+'.'+mname+':'+e.message);
            }
          }
        }
      } catch(e){}
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

        // Use $patch to properly trigger Pinia reactivity
        pinia._s.forEach(function(store, sn){
          try {
            var state = store.$state;
            if(!state) return;
            var keys = safeKeys(state);
            for(var i=0; i<keys.length; i++){
              var key = keys[i];
              try {
                var val = state[key];
                if(typeof val === 'object' && val !== null && !Array.isArray(val)){
                  var subKeys = safeKeys(val);
                  for(var j=0; j<subKeys.length; j++){
                    var subKey = subKeys[j];
                    try {
                      var subVal = val[subKey];
                      if(typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal)){
                        var subSubKeys = safeKeys(subVal);
                        for(var k=0; k<subSubKeys.length; k++){
                          var ssk = subSubKeys[k];
                          if(pageSizeNames.indexOf(ssk) !== -1 && typeof subVal[ssk] === 'number' && subVal[ssk] < 9999){
                            var oldVal = subVal[ssk];
                            try {
                              store.$patch(function(state){
                                if(state[key] && state[key][subKey]) state[key][subKey][ssk] = 9999;
                              });
                              result.count++;
                              result.found.push(sn+'.$patch.'+key+'.'+subKey+'.'+ssk+'='+oldVal+'->9999');
                            } catch(e){
                              subVal[ssk] = 9999;
                              result.count++;
                              result.found.push(sn+'.direct.'+key+'.'+subKey+'.'+ssk+'='+oldVal+'->9999');
                            }
                          }
                          if(pageNumNames.indexOf(ssk) !== -1 && typeof subVal[ssk] === 'number' && subVal[ssk] !== 1){
                            var oldVal2 = subVal[ssk];
                            try {
                              store.$patch(function(state){
                                if(state[key] && state[key][subKey]) state[key][subKey][ssk] = 1;
                              });
                              result.count++;
                              result.found.push(sn+'.$patch.'+key+'.'+subKey+'.'+ssk+'='+oldVal2+'->1');
                            } catch(e){
                              subVal[ssk] = 1;
                              result.count++;
                              result.found.push(sn+'.direct.'+key+'.'+subKey+'.'+ssk+'='+oldVal2+'->1');
                            }
                          }
                        }
                      }
                    } catch(e) {}
                  }
                }
              } catch(e) {}
            }
          } catch(e) {}
        });
      }
    } catch(e){ result.debug.push('pinia_err:' + e.message); }

    // Search component local state for pageSize values
    var localModified = 0;
    for(var ci=0; ci<allComps.length; ci++){
      localModified += searchComponentLocalState(allComps[ci], ci);
    }
    result.debug.push('localStateModified:' + localModified);
  }

  // el-select DOM interaction
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

  // Wait for el-select events to propagate
  await new Promise(function(r){ setTimeout(r, 500); });

  // Re-apply store modifications (el-select may have overwritten them)
  if(app){
    try {
      var pinia = app.config.globalProperties.$pinia;
      if(pinia && pinia._s){
        pinia._s.forEach(function(store, sn){
          try {
            var state = store.$state;
            if(!state) return;
            var keys = safeKeys(state);
            for(var i=0; i<keys.length; i++){
              var key = keys[i];
              try {
                var val = state[key];
                if(typeof val === 'object' && val !== null && !Array.isArray(val)){
                  var subKeys = safeKeys(val);
                  for(var j=0; j<subKeys.length; j++){
                    var subKey = subKeys[j];
                    try {
                      var subVal = val[subKey];
                      if(typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal)){
                        var subSubKeys = safeKeys(subVal);
                        for(var k=0; k<subSubKeys.length; k++){
                          var ssk = subSubKeys[k];
                          if(pageSizeNames.indexOf(ssk) !== -1 && typeof subVal[ssk] === 'number' && subVal[ssk] < 9999){
                            try { subVal[ssk] = 9999; result.count++; result.found.push(sn+'.reapply.'+key+'.'+subKey+'.'+ssk+'->9999'); } catch(e){}
                          }
                        }
                      }
                    } catch(e) {}
                  }
                }
              } catch(e) {}
            }
          } catch(e) {}
        });
      }
    } catch(e) {}

    // Re-apply component local state modifications
    for(var ci=0; ci<allComps.length; ci++){
      searchComponentLocalState(allComps[ci], ci);
    }

    // Find el-pagination components and emit size-change
    var pagComps = [];
    for(var ci=0; ci<allComps.length; ci++){
      var comp = allComps[ci];
      try {
        var typeName = '';
        if(comp.vnode && comp.vnode.type) {
          if(typeof comp.vnode.type === 'object' && comp.vnode.type.name) typeName = comp.vnode.type.name;
          else if(typeof comp.vnode.type === 'string') typeName = comp.vnode.type;
        }
        if(!typeName && comp.type && comp.type.name) typeName = comp.type.name;
        var nameL = typeName.toLowerCase();
        if(nameL.indexOf('pagination') !== -1 || nameL.indexOf('pager') !== -1){
          pagComps.push({comp: comp, name: typeName, index: ci});
        }
      } catch(e){}
    }
    result.debug.push('pagComps_found:' + pagComps.length);

    for(var pi=0; pi<pagComps.length; pi++){
      result.debug.push('pagComp['+pi+']:'+pagComps[pi].name);
      tryEmitSizeChange(pagComps[pi].comp);
      // Try fetch on parent
      if(pagComps[pi].comp.parent){
        tryCallFetch(pagComps[pi].comp.parent, pagComps[pi].index, 'parent');
      }
    }

    // Try fetch on all components
    if(result.fetchCalled.length === 0){
      for(var ci=0; ci<allComps.length; ci++){
        if(tryCallFetch(allComps[ci], ci, 'comp['+ci+']')) break;
      }
    }

    // Debug: list component methods if no fetch found
    if(result.fetchCalled.length === 0){
      result.debug.push('no_fetch_found_listing_methods');
      for(var ci=0; ci<Math.min(allComps.length, 20); ci++){
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
        if(methods.length > 0) result.debug.push('comp['+ci+']:'+methods.slice(0,20).join(','));
      }
    }
  }

  return result;
})()
