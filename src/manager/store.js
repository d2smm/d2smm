(() => {
  'use strict';
  function create(name='d2-survivors-mods-v1'){
    let db=null,opening=null;
    function open(){
      if(db)return Promise.resolve(db);
      return opening ||= new Promise((resolve,reject)=>{
        const request=indexedDB.open(name,1);
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('state'))request.result.createObjectStore('state');};
        request.onerror=()=>{opening=null;reject(request.error);};
        request.onblocked=()=>{opening=null;reject(Error('Mod storage is busy in another tab'));};
        request.onsuccess=()=>{db=request.result;db.onversionchange=()=>{db.close();db=null;opening=null;};resolve(db);};
      });
    }
    async function read(){const connection=await open();return new Promise((resolve,reject)=>{
      const tx=connection.transaction('state','readonly'),request=tx.objectStore('state').get('current');let value=null;
      request.onsuccess=()=>value=request.result??null;
      tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||Error('Mod read aborted'));tx.onerror=()=>reject(tx.error||Error('Mod read failed'));
    });}
    async function write(record,expectedRevision){const connection=await open();return new Promise((resolve,reject)=>{
      const tx=connection.transaction('state','readwrite'),store=tx.objectStore('state'),request=store.get('current');let next=null,problem=null;
      request.onsuccess=()=>{
        const current=request.result??null;
        if((current?.revision??0)!==expectedRevision){problem=Error('Mods changed in another tab. Reopen Mods and try again.');tx.abort();return;}
        // Keep one prior accepted record. Deletion uses a revision-bearing tombstone.
        if(current?.pack)store.put(current,'previous');
        next=record?{...record,revision:expectedRevision+1}:{revision:expectedRevision+1,pack:null};store.put(next,'current');
      };
      tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(problem||tx.error||Error('Mod save aborted'));tx.onerror=()=>reject(tx.error||Error('Mod save failed'));
    });}
    function close(){db?.close();db=null;opening=null;}
    function preferences(value){
      if(!value)return{revision:0,showGem:true};
      if(!Number.isSafeInteger(value.revision)||value.revision<0||typeof value.showGem!=='boolean')throw Error('Invalid manager display settings');
      return{revision:value.revision,showGem:value.showGem};
    }
    async function readPreferences(){const connection=await open();return new Promise((resolve,reject)=>{
      const tx=connection.transaction('state','readonly'),r=tx.objectStore('state').get('preferences');let value,problem;
      r.onsuccess=()=>{try{value=preferences(r.result);}catch(error){problem=error;tx.abort();}};
      tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(problem||tx.error||Error('Display settings read aborted'));tx.onerror=()=>reject(tx.error);
    });}
    async function writePreferences(showGem,expectedRevision){
      if(typeof showGem!=='boolean'||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Invalid manager display settings');
      const connection=await open();return new Promise((resolve,reject)=>{
        const tx=connection.transaction('state','readwrite'),s=tx.objectStore('state'),r=s.get('preferences');let next,problem;
        r.onsuccess=()=>{try{const old=preferences(r.result);if(old.revision!==expectedRevision)throw Error('Display settings changed in another tab. Reopen Mod Manager and try again.');next={revision:expectedRevision+1,showGem};s.put(next,'preferences');}catch(error){problem=error;tx.abort();}};
        tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(problem||tx.error||Error('Display settings save aborted'));tx.onerror=()=>reject(tx.error);
      });
    }
    async function readRuntime(){const connection=await open();return new Promise((resolve,reject)=>{const tx=connection.transaction('state','readonly'),r=tx.objectStore('state').get('runtime');let value=null;r.onsuccess=()=>value=r.result??null;tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});}
    async function writeRuntime(value,expected){const connection=await open();return new Promise((resolve,reject)=>{
      const tx=connection.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.get('runtime');let problem=null;
      r.onsuccess=()=>{if((r.result?.sha256??null)!==(expected?.sha256??null)){problem=Error('Manager selection changed in another tab');tx.abort();return;}if(r.result)store.put(r.result,'previousRuntime');value?store.put(value,'runtime'):store.delete('runtime');};
      tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(problem||tx.error);tx.onerror=()=>reject(tx.error);
    });}
    return Object.freeze({read,write,close,name,readRuntime,writeRuntime,readPreferences,writePreferences});
  }
  globalThis.D2ModStore=Object.freeze({create});
})();
