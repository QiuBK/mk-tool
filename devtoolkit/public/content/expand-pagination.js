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

  function findElSelectComponents(allComps){
    var selects = [];
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
        if(nameL.indexOf('select') !== -1 || nameL === 'elselect' || nameL === 'elselectwrapper'){
          selects.push({comp: comp, name: typeName, index: i});
        }
      } catch(e){}
    }
    return selects;
  }

  function findPaginationComponents(allComps){
    var pags = [];
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
          pags.push({comp: comp, name: typeName, index: i});
        }
      } catch(e){}
    }
    return pags;
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

  // Strategy: Find el-select Vue component inside el-pagination__sizes,
  // then directly call its internal methods to set value to 9999

  // Step 1: Find el-pagination DOM elements and their associated el-select Vue components
  try {
    var pagSels = document.querySelectorAll('.el-pagination, [class*="pagination"]');
    result.debug.push('dom_pag:' + pagSels.length);

    for(var i=0; i<pagSels.length; i++){
      var sizesArea = pagSels[i].querySelector('.el-pagination__sizes');
      if(!sizesArea) continue;

      var elSelectDoms = sizesArea.querySelectorAll('.el-select');
      for(var j=0; j<elSelectDoms.length; j++){
        try {
          // Find the Vue component instance for this el-select DOM element
          var selectComp = null;
          var el = elSelectDoms[j];
          // Walk up the DOM to find an element with __vueParentComponent or traverse component tree
          // Method 1: Check __vueParentComponent on DOM elements
          var checkEl = el;
          while(checkEl && !selectComp){
            try {
              if(checkEl.__vueParentComponent) selectComp = checkEl.__vueParentComponent;
            } catch(e){}
            checkEl = checkEl.firstElementChild || checkEl.firstChild;
          }

          // Method 2: Find el-select component by matching DOM element to component $el
          if(!selectComp){
            var elSelectComps = findElSelectComponents(allComps);
            for(var k=0; k<elSelectComps.length; k++){
              try {
                var compEl = elSelectComps[k].comp.proxy && elSelectComps[k].comp.proxy.$el;
                if(compEl && (compEl === el || el.contains(compEl) || compEl.contains(el))){
                  selectComp = elSelectComps[k].comp;
                  result.debug.push('select_found_by_dom:'+k);
                  break;
                }
              } catch(e){}
            }
          }

          if(!selectComp){
            // Method 3: Find el-select component inside pagination component's subtree
            var pagComps = findPaginationComponents(allComps);
            result.debug.push('pagComps:' + pagComps.length);
            for(var k=0; k<pagComps.length; k++){
              var pagSubComps = [];
              collectComponents(pagComps[k].comp, 0, pagSubComps);
              var innerSelects = findElSelectComponents(pagSubComps);
              if(innerSelects.length > 0){
                selectComp = innerSelects[0].comp;
                result.debug.push('select_found_in_pag:'+k+':inner='+innerSelects.length);
                break;
              }
            }
          }

          if(!selectComp){
            result.debug.push('no_select_comp:'+i+':'+j);
            continue;
          }

          result.debug.push('select_comp_found:'+i+':'+j);

          // Step 2: Inspect el-select component's internal state
          var setupKeys = [];
          try { setupKeys = safeKeys(selectComp.setupState); } catch(e){}
          result.debug.push('select_setupKeys:'+setupKeys.slice(0,20).join(','));

          // Step 3: Try to set value through the component's emit
          // el-select emits 'update:modelValue' and 'change' when a value is selected
          try {
            selectComp.emit('update:modelValue', 9999);
            selectComp.emit('change', 9999);
            result.count++;
            result.found.push('select.emit(update:modelValue+change, 9999)');
            result.domActions.push('emit_modelValue_9999');
            result.debug.push('emit_modelValue_9999');
          } catch(e){
            result.debug.push('emit_err:'+e.message);
          }

          // Step 4: Also try setting through vnode props (the parent's event handlers)
          try {
            if(selectComp.vnode && selectComp.vnode.props){
              var propKeys = safeKeys(selectComp.vnode.props);
              result.debug.push('select_vnode_props:'+propKeys.join(','));
              for(var pk=0; pk<propKeys.length; pk++){
                var pKey = propKeys[pk];
                if(typeof selectComp.vnode.props[pKey] === 'function'){
                  var pKeyL = pKey.toLowerCase();
                  if(pKeyL.indexOf('model') !== -1 || pKeyL.indexOf('change') !== -1 || pKeyL.indexOf('update') !== -1){
                    try {
                      selectComp.vnode.props[pKey](9999);
                      result.count++;
                      result.found.push('select.vnode.props.'+pKey+'(9999)');
                      result.domActions.push('vnode_'+pKey+'_9999');
                      result.debug.push('vnode_call:'+pKey);
                    } catch(e){
                      result.debug.push('vnode_err:'+pKey+':'+e.message);
                    }
                  }
                }
              }
            }
          } catch(e){ result.debug.push('vnode_inspect_err:'+e.message); }

          // Step 5: Try to directly modify internal reactive state
          try {
            for(var si=0; si<setupKeys.length; si++){
              var key = setupKeys[si];
              try {
                var val = selectComp.setupState[key];
                // Look for the modelValue or currentValue
                if(key === 'modelValue' || key === 'currentValue' || key === 'value' ||
                   key === 'selectedValue' || key === 'innerValue'){
                  if(typeof val === 'number' && val < 9999){
                    selectComp.setupState[key] = 9999;
                    result.count++;
                    result.found.push('select.setupState.'+key+'='+val+'->9999');
                    result.debug.push('set_internal:'+key+'->9999');
                  }
                }
              } catch(e){}
            }
          } catch(e){}

          // Step 6: Try the proxy's $emit
          try {
            if(selectComp.proxy){
              selectComp.proxy.$emit('update:modelValue', 9999);
              selectComp.proxy.$emit('change', 9999);
              result.count++;
              result.found.push('select.proxy.$emit(9999)');
              result.domActions.push('proxy_emit_9999');
              result.debug.push('proxy_emit_9999');
            }
          } catch(e){
            result.debug.push('proxy_emit_err:'+e.message);
          }

        } catch(e){
          result.debug.push('select_err:'+i+':'+j+':'+e.message);
        }
      }
    }
  } catch(e){
    result.debug.push('dom_err:' + e.message);
  }

  // Also try: find el-pagination component and emit size-change directly
  try {
    var pagComps = findPaginationComponents(allComps);
    result.debug.push('pagComps2:' + pagComps.length);

    for(var pi=0; pi<pagComps.length; pi++){
      var pagComp = pagComps[pi].comp;
      try {
        // Emit on the pagination component
        pagComp.emit('update:page-size', 9999);
        pagComp.emit('size-change', 9999);
        pagComp.emit('update:currentPage', 1);
        pagComp.emit('current-change', 1);
        result.count++;
        result.found.push('pagComp.emit(size-change, 9999)');
        result.domActions.push('pag_emit_size-change_9999');
        result.debug.push('pag_emit_done');
      } catch(e){ result.debug.push('pag_emit_err:'+e.message); }

      // Try vnode props on pagination
      try {
        if(pagComp.vnode && pagComp.vnode.props){
          var propKeys = safeKeys(pagComp.vnode.props);
          for(var pk=0; pk<propKeys.length; pk++){
            var pKey = propKeys[pk];
            if(typeof pagComp.vnode.props[pKey] === 'function'){
              var pKeyL = pKey.toLowerCase();
              if(pKeyL.indexOf('size') !== -1 || pKeyL.indexOf('change') !== -1 || pKeyL.indexOf('update') !== -1){
                try {
                  if(pKeyL.indexOf('page') !== -1 || pKeyL.indexOf('size') !== -1){
                    pagComp.vnode.props[pKey](9999);
                    result.count++;
                    result.found.push('pagComp.vnode.'+pKey+'(9999)');
                    result.domActions.push('pag_vnode_'+pKey+'_9999');
                    result.debug.push('pag_vnode_call:'+pKey);
                  }
                  if(pKeyL.indexOf('current') !== -1){
                    pagComp.vnode.props[pKey](1);
                    result.debug.push('pag_vnode_current:'+pKey+'->1');
                  }
                } catch(e){}
              }
            }
          }
        }
      } catch(e){}

      // Try parent component fetch
      if(pagComp.parent){
        var parentSources = [];
        try { if(pagComp.parent.setupState) parentSources.push({name:'setupState', data: pagComp.parent.setupState}); } catch(e){}
        try { if(pagComp.parent.proxy) parentSources.push({name:'proxy', data: pagComp.parent.proxy}); } catch(e){}

        for(var si=0; si<parentSources.length; si++){
          var pSrc = parentSources[si];
          try {
            var pKeys = safeKeys(pSrc.data);
            result.debug.push('parent.'+pSrc.name+':'+pKeys.slice(0,25).join(','));
            for(var ki=0; ki<pKeys.length; ki++){
              var mname = pKeys[ki];
              if(typeof pSrc.data[mname] !== 'function') continue;
              var ml = mname.toLowerCase();
              if(ml.indexOf('fetch') !== -1 || ml.indexOf('load') !== -1 || ml.indexOf('query') !== -1 ||
                 ml.indexOf('search') !== -1 || ml.indexOf('refresh') !== -1 || ml.indexOf('reload') !== -1 ||
                 ml.indexOf('getlist') !== -1 || ml.indexOf('getdata') !== -1 || ml.indexOf('gettable') !== -1 ||
                 ml.indexOf('getpage') !== -1 || ml.indexOf('handlesearch') !== -1 || ml.indexOf('handlequery') !== -1 ||
                 ml.indexOf('handlesizechange') !== -1 || ml.indexOf('handlecurrentchange') !== -1){
                try {
                  pSrc.data[mname]();
                  result.count++;
                  result.found.push('parent.'+pSrc.name+'.'+mname+'()');
                  result.domActions.push('parent_fetch:'+mname);
                  result.debug.push('parent_fetch:'+mname);
                } catch(e){
                  result.debug.push('parent_fetch_err:'+mname+':'+e.message);
                }
              }
            }
          } catch(e){}
        }
      }
    }
  } catch(e){ result.debug.push('pag_err:' + e.message); }

  // Fallback: list component methods
  if(result.count === 0){
    result.debug.push('no_changes_listing');
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
