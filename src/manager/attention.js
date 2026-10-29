(() => {
  'use strict';
  function create({onChange=()=>{},now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}={}){
    const sources=new Map();let timer=null,closed=false,sequence=0;
    function snapshot(){return [...sources.values()].flatMap(s=>[...s.entries.values()]).sort((a,b)=>b.order-a.order).map(({order,...entry})=>({...entry}));}
    function changed(){
      if(timer!==null)cancel(timer);timer=null;
      const deadlines=[...sources.values()].flatMap(s=>[...s.entries.values()].filter(e=>e.expiresAt!==null).map(e=>e.expiresAt));
      if(deadlines.length)timer=schedule(expire,Math.max(0,Math.min(...deadlines)-now()));
      onChange(snapshot());
    }
    function expire(){timer=null;const time=now();for(const s of sources.values())for(const[id,e]of s.entries)if(e.expiresAt!==null&&e.expiresAt<=time)s.entries.delete(id);changed();}
    function source(id,name){
      if(closed)throw Error('Attention system has closed');
      if(typeof id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)||typeof name!=='string'||!name.trim())throw Error('Attention source needs an ID and name');
      if(sources.has(id))throw Error('Attention source is already registered: '+id);
      const owner={entries:new Map(),name:name.trim().slice(0,80)};sources.set(id,owner);let disposed=false;
      function available(){return !closed&&!disposed;}
      function clear(){if(!available()||!owner.entries.size)return;owner.entries.clear();changed();}
      return Object.freeze({
        raise(eventId,{title,detail='',untilResolved=false}={}){
          if(!available())return false;
          if(typeof eventId!=='string'||!eventId||eventId.length>160||typeof title!=='string'||!title.trim()||typeof detail!=='string'||typeof untilResolved!=='boolean')throw Error('Invalid attention entry');
          title=title.trim().slice(0,160);detail=detail.trim().slice(0,240);
          const old=owner.entries.get(eventId);
          if(old&&old.title===title&&old.detail===detail&&(old.expiresAt===null)===untilResolved)return false;
          owner.entries.set(eventId,{key:id+':'+eventId,source:id,sourceName:owner.name,title,detail,createdAt:old?.createdAt??now(),expiresAt:untilResolved?null:old?.expiresAt??now()+60000,order:old?.order??++sequence});changed();return true;
        },
        resolve(eventId){if(!available()||!owner.entries.delete(eventId))return false;changed();return true;},
        clear,
        dispose(){if(!available())return;const had=owner.entries.size>0;owner.entries.clear();sources.delete(id);disposed=true;if(had)changed();}
      });
    }
    return Object.freeze({source,snapshot,dispose(){if(closed)return;closed=true;if(timer!==null)cancel(timer);timer=null;sources.clear();onChange([]);}});
  }
  globalThis.D2ModAttention=Object.freeze({create});
})();
