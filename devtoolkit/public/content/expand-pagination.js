(async function(){
  var result = {count:0, found:[], debug:[], storeDetail:[], domActions:[], fetchCalled:[]};
  var pageSizeNames = ['pageSize','limit','perPage','page_size','rowsPerPage','itemsPerPage','pSize','pageLimit','maxPerPage','itemLimit'];
  var pageNumNames = ['currentPage','current','pageNo','pageNum','pageIndex'];
  var fetchMethodNames = ['getList','fetchList','fetchData','loadData','queryList','queryData','search','refresh','reload','getData','loadList','initData','init','fetch','load','query','getTableData','getPageData','getPage'];

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
            try {
              obj[key] = 9999;
              var verify = obj[key];
              result.count++;
              result.found.push(path+'.'+key+'='+val+'->'+verify+'(name)');
            } catch(e) {
              result.debug.push('FAIL:'+path+'.'+key+':'+e.message);
            }
          }
        }

        if(typeof val === 'number' && pageNumNames.indexOf(key) !== -1){
          if(val !== 1){
            try {
              obj[key] = 1;
              result.count++;
              result.found.push(path+'.'+key+'='+val+'->1(page)');
            } catch(e) {}
          }
        }

        if(inPagContext && typeof val === 'number' && val > 1 && val <= 200){
          try {
            obj[key] = 9999;
            var verify2 = obj[key];
            result.count++;
            result.found.push(path+'.'+key+'='+val+'->'+verify2+'(pagCtx)');
          } catch(e) {
            result.debug.push('FAIL_PAG:'+path+'.'+key+':'+e.message);
          }
        }

        if(typeof val === 'object' && val !== null && !Array.isArray(val) &&
           !(val instanceof HTMLElement) && !(val instanceof Node) &&
           !(val instanceof Date) && !(val instanceof RegExp) &&
           !(val instanceof Error) && !(val instanceof Map) && !(val instanceof Set)){
          deepSearch(val, depth+1, path+'.'+key);
        }
      } catch(e) {
        if(depth < 3) result.debug.push('ERR:'+path+'.'+key+':'+e.message);
      }
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
        } catch(e){
          detail.nested.push({key: key, err: e.message});
        }
      }
    } catch(e){
      detail.stateKeys = ['ERR:' + e.message];
    }
    return detail;
  }

  function tryCallFetchMethod(comp, compIdx){
    var sources = [];
    try { if(comp.setupState) sources.push({name: 'setupState', data: comp.setupState}); } catch(e){}
    try { if(comp.proxy) sources.push({name: 'proxy', data: comp.proxy}); } catch(e){}
    try { if(comp.ctx) sources.push({name: 'ctx', data: comp.ctx}); } catch(e){}

    for(var si=0; si<sources.length; si++){
      var src = sources[si];
      try {
        var srcKeys = safeKeys(src.data);
        for(var fi=0; fi<fetchMethodNames.length; fi++){
          var mname = fetchMethodNames[fi];
          if(srcKeys.indexOf(mname) !== -1){
            try {
              var method = src.data[mname];
              if(typeof method === 'function'){
                method.call(src.data);
                result.fetchCalled.push('comp['+compIdx+'].'+src.name+'.'+mname);
                return true;
              }
            } catch(e){
              result.debug.push('fetch_err:comp['+compIdx+'].'+src.name+'.'+mname+':'+e.message);
            }
          }
        }
      } catch(e){}
    }
    return false;
  }

  var app = findApp();
  result.debug.push('app:' + (app ? 'found' : 'not_found'));

  if(app){
    try {
      var pinia = app.config.globalProperties.$pinia;
      result.debug.push('pinia:' + (pinia ? 'found' : 'not_found'));
      if(pinia && pinia._s){
        var storeNames = [];
        pinia._s.forEach(function(store, sn){ storeNames.push(sn); });
        result.debug.push('stores:' + storeNames.join(','));

        pinia._s.forEach(function(store, sn){
          result.storeDetail.push(dumpStoreStructure(store, sn));
          try {
            var state = store.$state;
            if(state) deepSearch(state, 0, sn+'.$state');
          } catch(e) {
            result.debug.push('store_search_err:'+sn+':'+e.message);
          }
        });
      }
    } catch(e){
      result.debug.push('pinia_err:' + e.message);
    }

    try {
      var rootComp = null;
      if(app._instance) rootComp = app._instance;
      else if(app._container && app._container._vnode && app._container._vnode.component)
        rootComp = app._container._vnode.component;

      result.debug.push('rootComp:' + (rootComp ? 'found' : 'not_found'));

      if(rootComp){
        var allComps = [];
        collectComponents(rootComp, 0, allComps);
        result.debug.push('compCount:' + allComps.length);

        for(var ci=0; ci<allComps.length; ci++){
          var comp = allComps[ci];
          try {
            if(comp.setupState) deepSearch(comp.setupState, 0, 'comp['+ci+'].setupState');
          } catch(e){}
          try {
            if(comp.proxy && comp.proxy.$data) deepSearch(comp.proxy.$data, 0, 'comp['+ci+'].$data');
          } catch(e){}
        }

        var fetchCalled = false;
        for(var ci=0; ci<allComps.length; ci++){
          var comp = allComps[ci];
          if(tryCallFetchMethod(comp, ci)){
            fetchCalled = true;
            break;
          }
        }
        if(!fetchCalled){
          result.debug.push('no_fetch_method_found_in_components');
          for(var ci=0; ci<Math.min(allComps.length, 10); ci++){
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
            try {
              var pk = safeKeys(comp.proxy);
              for(var mi=0; mi<pk.length; mi++){
                if(typeof comp.proxy[pk[mi]] === 'function' && pk[mi].charAt(0) !== '_' && pk[mi].charAt(0) !== '$'){
                  methods.push(pk[mi]);
                }
              }
            } catch(e){}
            if(methods.length > 0){
              result.debug.push('comp['+ci+']_methods:'+methods.slice(0,15).join(','));
            }
          }
        }
      }
    } catch(e){
      result.debug.push('comp_err:' + e.message);
    }
  }

  try {
    var pagSelectors = '.el-pagination, .ant-pagination, .a-pagination, .n-pagination, ' +
      '.arco-pagination, .t-pagination, [class*="pagination"], [class*="Pagination"]';
    var pagSels = document.querySelectorAll(pagSelectors);
    result.debug.push('dom_pag:' + pagSels.length);

    for(var i=0; i<pagSels.length; i++){
      var nativeSels = pagSels[i].querySelectorAll('select');
      for(var j=0; j<nativeSels.length; j++){
        var opts = nativeSels[j].options;
        var maxOpt = null;
        for(var k=0; k<opts.length; k++){
          var optVal = Number(opts[k].value);
          if(!isNaN(optVal) && optVal > 0 && (!maxOpt || optVal > Number(maxOpt.value))) maxOpt = opts[k];
        }
        if(maxOpt && nativeSels[j].value !== maxOpt.value){
          maxOpt.selected = true;
          var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
          if(setter && setter.set) setter.set.call(nativeSels[j], maxOpt.value);
          else nativeSels[j].value = maxOpt.value;
          nativeSels[j].dispatchEvent(new Event('change', {bubbles: true}));
          nativeSels[j].dispatchEvent(new Event('input', {bubbles: true}));
          result.count++;
          result.found.push('DOM:native_select->'+maxOpt.value);
          result.domActions.push('native_select:'+maxOpt.value);
        }
      }

      var sizesArea = pagSels[i].querySelector('.el-pagination__sizes');
      if(sizesArea){
        var elSelects = sizesArea.querySelectorAll('.el-select');
        for(var j=0; j<elSelects.length; j++){
          try {
            var wrapper = elSelects[j].querySelector('.el-select__wrapper');
            if(!wrapper) wrapper = elSelects[j].querySelector('.el-input__wrapper');
            if(!wrapper) wrapper = elSelects[j].querySelector('.el-input');
            if(!wrapper) wrapper = elSelects[j];
            wrapper.click();
            result.debug.push('el_select_trigger_clicked:'+i+':'+j);

            var dropdownFound = false;
            for(var wait=0; wait<10; wait++){
              await new Promise(function(r){ setTimeout(r, 200); });
              var poppers = document.querySelectorAll('.el-select-dropdown, .el-popper, .el-scrollbar__view');
              for(var k=0; k<poppers.length; k++){
                var popper = poppers[k];
                var style = window.getComputedStyle(popper);
                if(style.display === 'none' || style.visibility === 'hidden') continue;
                var items = popper.querySelectorAll('.el-select-dropdown__item, .el-option');
                if(items.length === 0) continue;

                var maxItem = null;
                var maxItemVal = 0;
                for(var l=0; l<items.length; l++){
                  var itemText = items[l].textContent.trim();
                  var itemVal = Number(itemText);
                  if(!isNaN(itemVal) && itemVal > maxItemVal){
                    maxItemVal = itemVal;
                    maxItem = items[l];
                  }
                }
                if(maxItem){
                  maxItem.click();
                  result.count++;
                  result.found.push('DOM:el_select->'+maxItemVal);
                  result.domActions.push('el_select:'+maxItemVal);
                  dropdownFound = true;
                  break;
                }
              }
              if(dropdownFound) break;
            }

            if(!dropdownFound){
              result.debug.push('el_select_no_dropdown:'+i+':'+j);
            }

            await new Promise(function(r){ setTimeout(r, 300); });
          } catch(e){
            result.debug.push('el_select_err:'+i+':'+j+':'+e.message);
          }
        }
      }

      var clickables = pagSels[i].querySelectorAll('li, span, button, a, [role="option"], [role="menuitem"]');
      for(var j=0; j<clickables.length; j++){
        var txt = clickables[j].textContent.trim();
        if(txt === '100' || txt === '200' || txt === '500' || txt === '1000' ||
           txt === '全部' || txt === 'All' || txt === 'ALL' || txt === 'Show All'){
          clickables[j].click();
          result.count++;
          result.found.push('DOM:click_'+txt);
          result.domActions.push('click:'+txt);
          break;
        }
      }
    }

    var allSelects = document.querySelectorAll('select');
    for(var i=0; i<allSelects.length; i++){
      var opts = allSelects[i].options;
      var hasPageSizeOpts = false;
      var maxOpt = null;
      for(var k=0; k<opts.length; k++){
        var optVal = Number(opts[k].value);
        if([5,10,15,20,25,30,50,100,200].indexOf(optVal) !== -1){
          hasPageSizeOpts = true;
          if(!maxOpt || optVal > Number(maxOpt.value)) maxOpt = opts[k];
        }
      }
      if(hasPageSizeOpts && maxOpt && allSelects[i].value !== maxOpt.value){
        maxOpt.selected = true;
        var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        if(setter && setter.set) setter.set.call(allSelects[i], maxOpt.value);
        else allSelects[i].value = maxOpt.value;
        allSelects[i].dispatchEvent(new Event('change', {bubbles: true}));
        result.count++;
        result.found.push('DOM:global_select->'+maxOpt.value);
      }
    }
  } catch(e){
    result.debug.push('dom_err:' + e.message);
  }

  return result;
})()
