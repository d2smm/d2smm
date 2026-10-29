(() => {
  'use strict';
  function create(name='d2s-characters-v1'){
    let db=null,opening=null;
    async function open(){if(db)return db;return opening??=new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Character storage is open in another tab'));r.onsuccess=()=>{db=r.result;db.onversionchange=()=>{db.close();db=null;opening=null;};resolve(db);};});}
    async function read(){const d=await open();return new Promise((resolve,reject)=>{const t=d.transaction('state','readonly'),r=t.objectStore('state').get('current');let v;r.onsuccess=()=>v=r.result??{revision:0,classes:{},pending:null};t.oncomplete=()=>resolve(v);t.onabort=()=>reject(t.error||Error('Character storage read aborted'));t.onerror=()=>reject(t.error);});}
    async function change(expected,fn){const d=await open();return new Promise((resolve,reject)=>{const t=d.transaction('state','readwrite'),s=t.objectStore('state'),r=s.get('current');let next,problem;r.onsuccess=()=>{try{const old=r.result??{revision:0,classes:{},pending:null};if(old.revision!==expected)throw Error('Character settings changed in another tab');next=fn(old,s);s.put(next,'current');}catch(e){problem=e;t.abort();}};t.oncomplete=()=>resolve(next);t.onabort=()=>reject(problem||t.error||Error('Character save aborted'));t.onerror=()=>reject(t.error);});}
    function prepare(expected,operation){return change(expected,(old,s)=>{if(old.pending)throw Error('A character switch needs recovery first');if(operation.beforeRaw.length>8*1024*1024)throw Error('Save is too large to back up safely');s.put({at:operation.at,raw:operation.beforeRaw},'backup-'+(expected%3));return{...old,revision:expected+1,pending:operation};});}
    function finish(expected,id,commit){return change(expected,old=>{if(old.pending?.id!==id)throw Error('Character transaction identity changed');const classes={...old.classes};if(commit){if(old.pending.meta)classes[old.pending.cls]=old.pending.meta;else delete classes[old.pending.cls];}return{revision:expected+1,classes,pending:null};});}
    async function backups(){const d=await open();return new Promise((resolve,reject)=>{const t=d.transaction('state','readonly'),s=t.objectStore('state'),out=[];for(let i=0;i<3;i++){const r=s.get('backup-'+i);r.onsuccess=()=>{if(r.result)out.push(r.result);};}t.oncomplete=()=>resolve(out.sort((a,b)=>b.at.localeCompare(a.at)));t.onabort=()=>reject(t.error);t.onerror=()=>reject(t.error);});}
    return Object.freeze({read,prepare,finish,backups,close:()=>{db?.close();db=null;opening=null;}});
  }
  globalThis.D2CharacterStore=Object.freeze({create});
})();
