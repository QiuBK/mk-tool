(function(){
  var result = {count:0, found:[], debug:[], storeInfo:[], compCount:0, compSamples:[], domInfo:[]};
  var pageSizeNames = ['pageSize','limit','perPage','page_size','rowsPerPage','itemsPerPage','pSize','pageLimit','maxPerPage','itemLimit','pageCount'];
  var pageNumNames = ['currentPage','current','pageNo','pageNum','pageIndex'];
  var pageSizeValues = [5, 10, 15, 20, 25, 30, 50, 100, 200];

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
    try { var k = Object.getOwnPropertyNames(obj); return k.filter(function(x){return !x.startsWith('__')}); } catch(e) {}
    try { return Object.keys(obj); } catch(e) {}
    return [];
  }

  function deepSet(obj, depth, path){
    if(!obj || typeof obj !== 'object' || depth > 15) return;
    try {
      var keys = safeKeys(obj);
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
                result.found.push(path+'.'+key+'='+val+'->'+verify);
              } catch(e) {
                result.debug.push('FAIL_SET:'+path+'.'+key+':'+e.message);
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

          if(typeof val === 'number' && pageSizeValues.indexOf(val) !== -1){
            var kl = key.toLowerCase();
            if(kl.indexOf('size') !== -1 || kl.indexOf('limit') !== -1 ||
               kl.indexOf('per') !== -1 || kl.indexOf('rows') !== -1){
              if(val < 9999){
                try {
                  obj[key] = 9999;
                  result.count++;
                  result.found.push(path+'.'+key+'='+val+'->9999(guess)');
                } catch(e) {}
              }
            }
          }

          if(typeof val === 'object' && val !== null && !Array.isArray(val) &&
             !(val instanceof HTMLElement) && !(val instanceof Node) &&
             !(val instanceof Date) && !(val instanceof RegExp) &&
             !(val instanceof Error) && !(val instanceof Map) && !(val instanceof Set)){
            deepSet(val, depth+1, path+'.'+key);
          }
        } catch(e) {
          if(depth < 3) result.debug.push('ERR:'+path+'.'+key+':'+e.message);
        }
      }
    } catch(e) {
      result.debug.push('ERR:'+path+':'+e.message);
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
          var si = {name: sn, keys: [], sample: '', found: []};
          try {
            var state = store.$state;
            if(state){
              si.keys = safeKeys(state).slice(0, 20);
              for(var ki=0; ki<Math.min(si.keys.length, 3); ki++){
                try {
                  var sv = state[si.keys[ki]];
                  if(typeof sv === 'object' && sv !== null && !Array.isArray(sv)){
                    var subK = safeKeys(sv).slice(0, 8);
                    si.sample += si.keys[ki]+':['+subK.join(',')+'] ';
                    for(var ski=0; ski<subK.length; ski++){
                      try {
                        var ssv = sv[subK[ski]];
                        if(typeof ssv === 'object' && ssv !== null && !Array.isArray(ssv)){
                          var subSubK = safeKeys(ssv).slice(0, 8);
                          si.sample += si.keys[ki]+'.'+subK[ski]+':['+subSubK.join(',')+'] ';
                        }
                      } catch(e){}
                    }
                  } else if(Array.isArray(sv)){
                    si.sample += si.keys[ki]+':Array('+sv.length+') ';
                  } else {
                    si.sample += si.keys[ki]+':'+typeof sv+'='+String(sv).substring(0,30)+' ';
                  }
                } catch(e){}
              }
              deepSet(state, 0, sn+'.$state');
            }
          } catch(e){
            si.keys = ['ERR:' + e.message];
          }
          result.storeInfo.push(si);
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
        result.compCount = allComps.length;

        for(var ci=0; ci<allComps.length; ci++){
          var comp = allComps[ci];
          try {
            if(comp.setupState){
              var setupKeys = safeKeys(comp.setupState).filter(function(k){
                return !k.startsWith('_') && !k.startsWith('$');
              });
              if(setupKeys.length > 0 && result.compSamples.length < 8){
                var sample = {keys: setupKeys.slice(0, 10)};
                for(var si=0; si<Math.min(setupKeys.length, 3); si++){
                  try {
                    var sv = comp.setupState[setupKeys[si]];
                    if(typeof sv === 'object' && sv !== null){
                      if(Array.isArray(sv)){
                        sample[setupKeys[si]] = 'Array('+sv.length+')';
                      } else {
                        sample[setupKeys[si]] = '{' + safeKeys(sv).slice(0,5).join(',') + '}';
                      }
                    } else {
                      sample[setupKeys[si]] = typeof sv + '=' + String(sv).substring(0,20);
                    }
                  } catch(e){}
                }
                result.compSamples.push(sample);
              }
              deepSet(comp.setupState, 0, 'comp['+ci+'].setupState');
            }
          } catch(e){}
          try {
            if(comp.proxy && comp.proxy.$data) deepSet(comp.proxy.$data, 0, 'comp['+ci+'].$data');
          } catch(e){}
        }
      }
    } catch(e){
      result.debug.push('comp_err:' + e.message);
    }
  }

  try {
    var pagSelectors = '.ant-pagination, .el-pagination, .a-pagination, .n-pagination, ' +
      '.v-pagination, .t-pagination, .p-pagination, .arco-pagination, ' +
      '[class*="pagination"], [class*="Pagination"], [class*="pager"], [class*="Pager"]';
    var pagSels = document.querySelectorAll(pagSelectors);
    result.debug.push('dom_pag:' + pagSels.length);

    for(var i=0; i<pagSels.length; i++){
      var pagInfo = {index: i, classes: pagSels[i].className.substring(0, 80), actions: []};

      var nativeSels = pagSels[i].querySelectorAll('select');
      for(var j=0; j<nativeSels.length; j++){
        var opts = nativeSels[j].options;
        var maxOpt = null;
        for(var k=0; k<opts.length; k++){
          var optVal = Number(opts[k].value);
          if(!isNaN(optVal) && optVal > 0 && (!maxOpt || optVal > Number(maxOpt.value))) maxOpt = opts[k];
        }
        if(maxOpt){
          var targetVal = maxOpt.value;
          if(Number(targetVal) < 9999){
            var allOpts = [];
            for(var k=0; k<opts.length; k++) allOpts.push(opts[k].value);
            pagInfo.actions.push('select_options:['+allOpts.join(',')+']');
          }
          if(nativeSels[j].value !== targetVal){
            maxOpt.selected = true;
            var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
            if(setter && setter.set) setter.set.call(nativeSels[j], targetVal);
            else nativeSels[j].value = targetVal;
            nativeSels[j].dispatchEvent(new Event('change', {bubbles: true}));
            nativeSels[j].dispatchEvent(new Event('input', {bubbles: true}));
            result.count++;
            result.found.push('DOM:select->'+targetVal);
            pagInfo.actions.push('select_changed_to:'+targetVal);
          }
        }
      }

      var customSels = pagSels[i].querySelectorAll(
        '.ant-select, .el-select, .a-select, .n-select, .arco-select, [class*="select"], [class*="Select"]'
      );
      for(var j=0; j<customSels.length; j++){
        try {
          var trigger = customSels[j].querySelector(
            '.ant-select-selector, .ant-select-selection, .el-input, .el-select__wrapper, ' +
            '[class*="trigger"], [class*="selector"], [class*="selection"]'
          );
          if(!trigger) trigger = customSels[j];
          trigger.click();
          pagInfo.actions.push('custom_select_clicked');
        } catch(e){}
      }

      var clickables = pagSels[i].querySelectorAll('li, span, div, button, a, [role="option"], [role="menuitem"]');
      for(var j=0; j<clickables.length; j++){
        var txt = clickables[j].textContent.trim();
        if(txt === '100' || txt === '200' || txt === '500' || txt === '1000' ||
           txt === '全部' || txt === 'All' || txt === 'ALL' || txt === 'Show All'){
          clickables[j].click();
          result.count++;
          result.found.push('DOM:click_'+txt);
          pagInfo.actions.push('click:'+txt);
          break;
        }
      }

      result.domInfo.push(pagInfo);
    }

    var allSelects = document.querySelectorAll('select');
    for(var i=0; i<allSelects.length; i++){
      var opts = allSelects[i].options;
      var hasPageSizeOpts = false;
      var maxOpt = null;
      for(var k=0; k<opts.length; k++){
        var optVal = Number(opts[k].value);
        if(pageSizeValues.indexOf(optVal) !== -1){
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
        allSelects[i].dispatchEvent(new Event('input', {bubbles: true}));
        result.count++;
        result.found.push('DOM:global_select->'+maxOpt.value);
      }
    }
  } catch(e){
    result.debug.push('dom_err:' + e.message);
  }

  return result;
})()
