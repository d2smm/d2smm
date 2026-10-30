// Browser storage/DOM transport for the C++ unread ledger. Native game saves
// are never read or written here; contexts are caller-supplied stable IDs.
(() => {
  'use strict';
  function create({coreReady,store,onChange=()=>{},broadcast=()=>{}}){
    const leases=new Map(),visible=new Map(),encoder=new TextEncoder(),decoder=new TextDecoder(),ops=D2ManagerKernel.badgeOperations;
    let core=null,closed=false,initialized=false,problem='',queue=Promise.resolve();
    function input(index,value){if(typeof value!=='string')throw Error('Badge keys must be strings');const b=encoder.encode(value),v=new Uint8Array(core.memory.buffer,core.d2smm_badge_input(index),D2ManagerKernel.keyLimit+1);v.fill(0);v.set(b.subarray(0,v.length));core.d2smm_badge_length(index,b.length);if(!core.d2smm_badge_valid_key(index))throw Error('Invalid badge key');}
    function apply(operation,source,target,context,open=false){[source,target,context].forEach((s,i)=>input(i,s));const result=core.d2smm_badge_apply(ops[operation],Number(open));if(result<0)throw Error(result===-2?'Too many unread controls':'Invalid unread record');return result;}
    function project(){if(!core)return[];return Array.from({length:core.d2smm_badge_count()},(_,index)=>Object.fromEntries(['source','target','context'].map((key,field)=>{const v=new Uint8Array(core.memory.buffer,core.d2smm_badge_key(index,field),D2ManagerKernel.keyLimit+1);return[key,decoder.decode(v.subarray(0,v.indexOf(0)))];})));}
    function load(record){core.d2smm_badge_reset();if(!record)return;if(record.schema!==1||!Number.isSafeInteger(record.revision)||record.revision<0||!Array.isArray(record.marks)||record.marks.length>D2ManagerKernel.capacity)throw Error('Invalid unread metadata');try{for(const row of record.marks)apply('load',row.source,row.target,row.context);}catch(error){core.d2smm_badge_reset();throw error;}}
    function failed(error){problem=error.message;console.warn('[D2SMM] control badges',error);onChange();}
    const ready=coreReady.then(async value=>{core=value;load(await store.readBadges());initialized=true;onChange();}).catch(failed);
    function enqueue(work){const result=queue.then(async()=>{await ready;if(closed||!initialized||problem)throw Error(problem||'Control badges are unavailable');return work();});queue=result.catch(failed);return result;}
    function command(operation,source,target,context){const isVisible=visible.get(target+'\0'+context)===true;return enqueue(async()=>{const result=await store.mutateBadges(record=>{load(record);const changed=!!apply(operation,source,target,context,isVisible);return{changed,marks:project()};});onChange();if(result.changed)broadcast();return result.changed;});}
    function source(id){if(!core||!initialized)throw Error('Wait for Mod Manager to finish loading');input(0,id);if(leases.has(id))throw Error('Badge source is already registered');const token={};leases.set(id,token);let disposed=false;
      const active=()=>{if(closed||disposed||leases.get(id)!==token)throw Error('Badge source has closed');};
      return Object.freeze({markUnread(target,context){active();return command('mark',id,target,context);},clear(target,context){active();return command('clear',id,target,context);},dispose(){if(disposed)return;disposed=true;if(leases.get(id)===token)leases.delete(id);}});
    }
    function observe(target,context,open){const key=target+'\0'+context;if(visible.get(key)===open)return;visible.set(key,open);if(open)void command('read','manager',target,context).catch(error=>console.info('[D2SMM] unread acknowledgement unavailable',error.message));}
    return Object.freeze({ready,source,observe,
      unread(target,context){return initialized&&!closed?!!apply('unread','manager',target,context):false;},
      isOpen:(target,context)=>visible.get(target+'\0'+context)===true,
      isReady:()=>initialized&&!closed&&!problem,
      reload(){return enqueue(async()=>{load(await store.readBadges());onChange();});},
      status:()=>({ready:initialized&&!closed,problem,marks:project()}),
      async dispose(){if(closed)return;await ready;await queue;closed=true;leases.clear();visible.clear();core?.d2smm_badge_reset();onChange();}
    });
  }
  globalThis.D2ControlBadges=Object.freeze({create});
})();
