// Save-dialog DOM/browser binding. The game's codec and confirmation remain
// authoritative; the native manager fences the additional import transaction.
(() => {
  'use strict';
  function install(native,core,admit){
    const spec=D2ManagerKernel.stash,data=D2SharedStashData,p=native.dialog.prototype;
    const original=Object.fromEntries(['refreshExport','copy','download','import','close','showMain','replace'].map(k=>[k,p[k]]));
    const dialogs=new WeakMap();let active=null;
    function state(dialog){let s=dialogs.get(dialog);if(!s){s={extra:false,version:0,observer:null};dialogs.set(dialog,s);}return s;}
    function count(save){const doc=save?.[spec.field];return doc?data.keys.reduce((n,k)=>n+(doc.tabs?.[k]?.length??0),0):0;}
    function protect(dialog){
      const s=state(dialog);if(!s.extra||s.version!==dialog.version||!dialog.code)return;
      if(dialog.code.startsWith(spec.nativePrefix)){dialog.code=spec.backupPrefix+dialog.code.slice(spec.nativePrefix.length);dialog.exportBox.value=dialog.code;}
      else if(!dialog.code.startsWith(spec.backupPrefix)){dialog.code='';dialog.exportBox.value='';dialog.exportBox.placeholder='Mod Manager cannot export this save version.';dialog.copyButton.disabled=true;dialog.downloadButton.disabled=true;}
    }
    p.refreshExport=function(){
      const s=state(this);s.observer?.disconnect();s.extra=this.actions.current()?.[spec.field]!==undefined;
      s.observer=new MutationObserver(()=>protect(this));s.observer.observe(this.copyButton,{attributes:true,attributeFilter:['disabled']});
      original.refreshExport.call(this);s.version=this.version;
      if(s.extra)this.summary.append(document.createTextNode(' · '+count(this.actions.current())+' in Shared 4–6'));
    };
    for(const name of ['copy','download'])p[name]=function(...args){protect(this);return original[name].apply(this,args);};
    function cancel(dialog){if(active?.dialog===dialog)core.d2smm_stash_import_cancel();}
    for(const name of ['close','showMain'])p[name]=function(...args){cancel(this);return original[name].apply(this,args);};
    async function raw(code){
      const prefix=new TextEncoder().encode(code.slice(0,7));new Uint8Array(core.memory.buffer,core.d2smm_stash_prefix(),8).fill(0);new Uint8Array(core.memory.buffer,core.d2smm_stash_prefix(),prefix.length).set(prefix);
      const kind=core.d2smm_stash_code(prefix.length,code.length);if(!kind)throw Error('Unsupported or oversized save code');
      const nativeCode=kind===2?spec.nativePrefix+code.slice(spec.backupPrefix.length):code;
      const encoded=nativeCode.slice(spec.nativePrefix.length).replaceAll('-','+').replaceAll('_','/');
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
      const chunks=[];let size=0;
      try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>spec.decodedLimit)throw Error('Save is too large');chunks.push(part.value);}}
      catch(error){await reader.cancel().catch(cancelError=>console.warn('[Shared stash] decode cancellation',cancelError));throw error;}
      const save=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await new Blob(chunks).arrayBuffer()));
      if(kind===2&&save?.[spec.field]===undefined)throw Error('Extended save has no Shared storage');
      return{nativeCode,save};
    }
    p.import=async function(code){
      if(this.importButton.disabled)return;
      const ticket=core.d2smm_stash_import_begin();if(!ticket)return this.setMessage('Wait for the current save import.','error');
      active={dialog:this,ticket};this.importButton.disabled=true;this.fileButton.disabled=true;this.pending=null;
      try{
        const decoded=await raw(String(code).replace(/\s+/g,''));
        const extension=decoded.save?.[spec.field]===undefined?undefined:admit(decoded.save,decoded.save[spec.field]);
        if(!core.d2smm_stash_import_current(ticket))return;
        this.importButton.disabled=false;this.fileButton.disabled=false;
        await original.import.call(this,decoded.nativeCode);
        if(!core.d2smm_stash_import_current(ticket)){this.pending=null;this.confirmView.classList.add('hidden');this.main.classList.remove('hidden');return;}
        if(!this.pending)return;
        const pending=this.pending;
        // Native cursor recovery can temporarily create one of the extra keys.
        // Move that already-normalized list into the extension before admission.
        const doc=extension??{version:spec.version,tabs:Object.fromEntries(data.keys.map(k=>[k,[]]))};
        for(const k of data.keys){const recovered=pending.stashTabs[k];if(recovered){doc.tabs[k].push(...recovered);delete pending.stashTabs[k];}}
        Object.defineProperty(pending,spec.field,{value:doc,writable:true,configurable:true,enumerable:true});
        data.bind(pending);
        const extra=count(pending);if(extra)this.newerNote.append(document.createTextNode((this.newerNote.textContent?' · ':'')+extra+' items in Shared 4–6'));
        if(extra)this.newerNote.classList.remove('hidden');
      }catch(error){
        if(core.d2smm_stash_import_current(ticket)){this.pending=null;this.confirmView.classList.add('hidden');this.main.classList.remove('hidden');this.setMessage(error.message,'error');}
        console.warn('[Shared stash] import rejected',error);
      }finally{
        if(core.d2smm_stash_import_finish(ticket)){active=null;this.importButton.disabled=false;this.fileButton.disabled=false;}
      }
    };
    p.replace=function(...args){if(this.pending)data.bind(this.pending);return original.replace.apply(this,args);};
    return Object.freeze({busy:()=>!!active,pending:()=>active?.dialog?.pending??null});
  }
  globalThis.D2QolStashTransfer=Object.freeze({install});
})();
