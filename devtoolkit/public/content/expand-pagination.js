(async function(){
  var result = {count:0, found:[], debug:[], domActions:[]};

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

  var allComps = [];
  if(app){
    try {
      var rootComp = null;
      if(app._instance) rootComp = app._instance;
      else if(app._container && app._container._vnode && app._container._vnode.component)
        rootComp = app._container._vnode.component;
      if(rootComp) collectComponents(rootComp, 0, allComps);
      result.debug.push('compCount:' + allComps.length);
    } catch(e){ result.debug.push('comp_err:' + e.message); }
  }

  // Find el-pagination components in Vue tree
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
  result.debug.push('pagComps:' + pagComps.length);

  // Strategy: Inject a "9999 条/页" option into el-select dropdown and click it
  try {
    var pagSelectors = '.el-pagination, .ant-pagination, [class*="pagination"], [class*="Pagination"]';
    var pagSels = document.querySelectorAll(pagSelectors);
    result.debug.push('dom_pag:' + pagSels.length);

    for(var i=0; i<pagSels.length; i++){
      var sizesArea = pagSels[i].querySelector('.el-pagination__sizes');
      if(!sizesArea) continue;

      var elSelects = sizesArea.querySelectorAll('.el-select');
      for(var j=0; j<elSelects.length; j++){
        try {
          // Step 1: Click to open dropdown
          var wrapper = elSelects[j].querySelector('.el-select__wrapper');
          if(!wrapper) wrapper = elSelects[j].querySelector('.el-input__wrapper');
          if(!wrapper) wrapper = elSelects[j];
          wrapper.click();
          result.debug.push('step1_click_trigger:'+i+':'+j);

          // Step 2: Wait for dropdown to appear
          var dropdownEl = null;
          var dropdownItems = [];
          for(var wait=0; wait<15; wait++){
            await new Promise(function(r){ setTimeout(r, 200); });
            var poppers = document.querySelectorAll('.el-select-dropdown, .el-popper');
            for(var k=0; k<poppers.length; k++){
              var popper = poppers[k];
              var style = window.getComputedStyle(popper);
              if(style.display === 'none' || style.visibility === 'hidden') continue;
              var items = popper.querySelectorAll('.el-select-dropdown__item');
              if(items.length === 0) continue;
              dropdownEl = popper;
              dropdownItems = items;
              break;
            }
            if(dropdownEl) break;
          }

          if(!dropdownEl){
            result.debug.push('step2_no_dropdown:'+i+':'+j);
            continue;
          }
          result.debug.push('step2_dropdown_found:items='+dropdownItems.length);

          // Step 3: Check if 9999 option already exists
          var existing9999 = null;
          for(var k=0; k<dropdownItems.length; k++){
            var txt = dropdownItems[k].textContent.trim();
            if(txt === '9999' || txt === '9999 条/页' || txt.indexOf('9999') !== -1){
              existing9999 = dropdownItems[k];
              break;
            }
          }

          if(existing9999){
            // Click existing 9999 option
            existing9999.click();
            result.count++;
            result.found.push('DOM:click_existing_9999');
            result.domActions.push('click_existing_9999');
            result.debug.push('step3_click_existing_9999');
          } else {
            // Step 4: Inject a new 9999 option into the dropdown
            var newItem = document.createElement('li');
            newItem.className = 'el-select-dropdown__item';
            newItem.setAttribute('data-value', '9999');
            newItem.textContent = '9999 条/页';

            // Find the scroll container inside the dropdown
            var scrollWrap = dropdownEl.querySelector('.el-scrollbar__wrap');
            var listContainer = scrollWrap ? scrollWrap.querySelector('.el-select-dropdown__list') : null;
            if(!listContainer) listContainer = dropdownEl.querySelector('.el-select-dropdown__list');
            if(!listContainer) listContainer = dropdownEl;

            listContainer.appendChild(newItem);
            result.debug.push('step4_injected_9999_option');

            // Step 5: Click the injected 9999 option
            await new Promise(function(r){ setTimeout(r, 100); });
            newItem.click();
            result.count++;
            result.found.push('DOM:inject_and_click_9999');
            result.domActions.push('inject_click_9999');
            result.debug.push('step5_clicked_injected_9999');
          }

          // Step 6: Wait for Vue to process the event
          await new Promise(function(r){ setTimeout(r, 500); });

        } catch(e){
          result.debug.push('el_select_err:'+i+':'+j+':'+e.message);
        }
      }
    }
  } catch(e){
    result.debug.push('dom_err:' + e.message);
  }

  // Also try: find el-pagination Vue component and directly call its internal methods
  if(pagComps.length > 0 && result.count === 0){
    for(var pi=0; pi<pagComps.length; pi++){
      var pagComp = pagComps[pi].comp;
      try {
        // Try to find the internal pageSize ref and set it
        var sources = [];
        try { if(pagComp.setupState) sources.push({name:'setupState', data: pagComp.setupState}); } catch(e){}
        try { if(pagComp.data) sources.push({name:'data', data: pagComp.data}); } catch(e){}

        for(var si=0; si<sources.length; si++){
          var src = sources[si];
          try {
            var keys = safeKeys(src.data);
            result.debug.push('pagComp['+pi+'].'+src.name+':'+keys.slice(0,15).join(','));
            for(var ki=0; ki<keys.length; ki++){
              var key = keys[ki];
              try {
                var val = src.data[key];
                if(typeof val === 'number' && (key === 'pageSize' || key === 'internalPageSize' || key === 'innerPageSize')){
                  if(val < 9999){
                    src.data[key] = 9999;
                    result.count++;
                    result.found.push('pagComp['+pi+'].'+src.name+'.'+key+'='+val+'->9999');
                    result.debug.push('pagComp_set:'+key+'->9999');
                  }
                }
              } catch(e){}
            }
          } catch(e){}
        }

        // Try emit
        if(pagComp.emit){
          pagComp.emit('update:page-size', 9999);
          pagComp.emit('size-change', 9999);
          pagComp.emit('update:currentPage', 1);
          pagComp.emit('current-change', 1);
          result.count++;
          result.found.push('pagComp_emit_size-change_9999');
          result.debug.push('pagComp_emit_done');
        }

        // Try vnode props
        if(pagComp.vnode && pagComp.vnode.props){
          var propKeys = safeKeys(pagComp.vnode.props);
          result.debug.push('pagComp_vnode_props:'+propKeys.join(','));
          for(var pk=0; pk<propKeys.length; pk++){
            var pKey = propKeys[pk];
            var pKeyL = pKey.toLowerCase();
            if((pKeyL.indexOf('size') !== -1 || pKeyL.indexOf('change') !== -1) && typeof pagComp.vnode.props[pKey] === 'function'){
              try {
                pagComp.vnode.props[pKey](9999);
                result.count++;
                result.found.push('pagComp_vnode_'+pKey+'_9999');
                result.debug.push('pagComp_vnode_call:'+pKey);
              } catch(e){}
            }
          }
        }

        // Try parent component fetch
        if(pagComp.parent){
          var parentSources = [];
          try { if(pagComp.parent.setupState) parentSources.push({name:'setupState', data: pagComp.parent.setupState}); } catch(e){}
          try { if(pagComp.parent.proxy) parentSources.push({name:'proxy', data: pagComp.parent.proxy}); } catch(e){}

          for(var si=0; si<parentSources.length; si++){
            var pSrc = parentSources[si];
            try {
              var pKeys = safeKeys(pSrc.data);
              result.debug.push('parent.'+pSrc.name+':'+pKeys.slice(0,20).join(','));
              for(var ki=0; ki<pKeys.length; ki++){
                var mname = pKeys[ki];
                if(typeof pSrc.data[mname] !== 'function') continue;
                var ml = mname.toLowerCase();
                if(ml.indexOf('fetch') !== -1 || ml.indexOf('load') !== -1 || ml.indexOf('query') !== -1 ||
                   ml.indexOf('search') !== -1 || ml.indexOf('refresh') !== -1 || ml.indexOf('reload') !== -1 ||
                   ml.indexOf('getlist') !== -1 || ml.indexOf('getdata') !== -1 || ml.indexOf('gettable') !== -1 ||
                   ml.indexOf('getpage') !== -1 || ml.indexOf('handlesearch') !== -1 || ml.indexOf('handlequery') !== -1){
                  try {
                    pSrc.data[mname]();
                    result.count++;
                    result.found.push('parent.'+pSrc.name+'.'+mname);
                    result.debug.push('parent_fetch:'+mname);
                  } catch(e){
                    result.debug.push('parent_fetch_err:'+mname+':'+e.message);
                  }
                }
              }
            } catch(e){}
          }
        }
      } catch(e){
        result.debug.push('pagComp_err:'+e.message);
      }
    }
  }

  // Fallback: list component methods for debugging
  if(result.count === 0){
    result.debug.push('no_changes_listing_methods');
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

  return result;
})()
