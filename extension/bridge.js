(() => {
  'use strict';
  if(globalThis.__d2ModsBridge)return;
  globalThis.__d2ModsBridge=true;
  const pending=new Map();
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.channel!=='d2mods-bridge-v1')return;
    const callback=pending.get(event.data.responseTo);
    if(callback){pending.delete(event.data.responseTo);callback(event.data.value);}
  });
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(sender.id!==chrome.runtime.id||!['status','open'].includes(message?.action))return;
    const requestId=crypto.randomUUID(),timeout=setTimeout(()=>{if(pending.delete(requestId))reply({error:'Mod manager is not ready'});},5000);
    pending.set(requestId,value=>{clearTimeout(timeout);reply(value);});
    window.postMessage({channel:'d2mods-bridge-v1',requestId,action:message.action},location.origin);
    return true;
  });
})();
