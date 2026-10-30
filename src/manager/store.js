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
      if(!value)return{revision:0,showGem:true,charactersEnabled:true,gearLoadoutsEnabled:true,terrorizedEnabled:true,terrorizedGatherDrops:false,qolEnabled:true};
      const result={revision:value.revision,showGem:value.showGem,charactersEnabled:value.charactersEnabled===undefined?true:value.charactersEnabled,gearLoadoutsEnabled:value.gearLoadoutsEnabled===undefined?true:value.gearLoadoutsEnabled,terrorizedEnabled:value.terrorizedEnabled===undefined?true:value.terrorizedEnabled,terrorizedGatherDrops:value.terrorizedGatherDrops===undefined?false:value.terrorizedGatherDrops,qolEnabled:value.qolEnabled===undefined?true:value.qolEnabled};
      if(!Number.isSafeInteger(result.revision)||result.revision<0||['showGem','charactersEnabled','gearLoadoutsEnabled','terrorizedEnabled','terrorizedGatherDrops','qolEnabled'].some(k=>typeof result[k]!=='boolean'))throw Error('Invalid manager settings');
      return result;
    }
    async function readPreferences(){const connection=await open();return new Promise((resolve,reject)=>{
      const tx=connection.transaction('state','readonly'),r=tx.objectStore('state').get('preferences');let value,problem;
      r.onsuccess=()=>{try{value=preferences(r.result);}catch(error){problem=error;tx.abort();}};
      tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(problem||tx.error||Error('Display settings read aborted'));tx.onerror=()=>reject(tx.error);
    });}
    async function writePreferences(value,expectedRevision){
      if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Invalid manager settings');
      const candidate=preferences({...value,revision:expectedRevision+1});
      const connection=await open();return new Promise((resolve,reject)=>{
        const tx=connection.transaction('state','readwrite'),s=tx.objectStore('state'),r=s.get('preferences');let next,problem;
        r.onsuccess=()=>{try{const old=preferences(r.result);if(old.revision!==expectedRevision)throw Error('Mod settings changed in another tab. Reopen Mod Manager and try again.');next=candidate;s.put(next,'preferences');}catch(error){problem=error;tx.abort();}};
        tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(problem||tx.error||Error('Display settings save aborted'));tx.onerror=()=>reject(tx.error);
      });
    }
    async function readRuntime(){const connection=await open();return new Promise((resolve,reject)=>{const tx=connection.transaction('state','readonly'),r=tx.objectStore('state').get('runtime');let value=null;r.onsuccess=()=>value=r.result??null;tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});}
    async function readBadges(){const connection=await open();return new Promise((resolve,reject)=>{const tx=connection.transaction('state','readonly'),r=tx.objectStore('state').get('controlBadges');let value=null;r.onsuccess=()=>value=r.result??null;tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});}
    async function mutateBadges(reduce){const connection=await open();return new Promise((resolve,reject)=>{
      const tx=connection.transaction('state','readwrite'),s=tx.objectStore('state'),r=s.get('controlBadges');let result,problem;
      r.onsuccess=()=>{try{const current=r.result??{schema:1,revision:0,marks:[]};result=reduce(current);if(result.changed)s.put({schema:1,revision:current.revision+1,marks:result.marks},'controlBadges');}catch(error){problem=error;tx.abort();}};
      tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(problem||tx.error||Error('Unread changes could not be saved'));tx.onerror=()=>reject(tx.error);
    });}
    async function writeRuntime(value,expected){const connection=await open();return new Promise((resolve,reject)=>{
      const tx=connection.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.get('runtime');let problem=null;
      r.onsuccess=()=>{if((r.result?.sha256??null)!==(expected?.sha256??null)){problem=Error('Manager selection changed in another tab');tx.abort();return;}if(r.result)store.put(r.result,'previousRuntime');value?store.put(value,'runtime'):store.delete('runtime');};
      tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(problem||tx.error);tx.onerror=()=>reject(tx.error);
    });}
    return Object.freeze({read,write,close,name,readRuntime,writeRuntime,readPreferences,writePreferences,readBadges,mutateBadges});
  }
  globalThis.D2ModStore=Object.freeze({create});
})();
