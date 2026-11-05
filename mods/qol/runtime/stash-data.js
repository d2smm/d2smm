// Mechanical views into one serialized extension. No duplicate item arrays are
// serialized into stashTabs; clone consumers explicitly rebind these views.
(() => {
  'use strict';
  if(globalThis.D2SharedStashData)return;
  const spec=D2ManagerKernel.stash,keys=spec.keys.slice(spec.nativeTabs),bound=new WeakMap();
  let admission=null;
  function bind(save){
    if(!save?.stashTabs)return save;
    const old=bound.get(save),descriptor=Object.getOwnPropertyDescriptor(save,spec.field);
    if(old&&old.tabs===save.stashTabs&&descriptor?.get===old.get)return save;
    const stored=save[spec.field];
    if(stored!==undefined&&!admission)throw Error('Extra Shared storage is still loading');
    const doc=stored===undefined?{version:spec.version,tabs:Object.fromEntries(keys.map(k=>[k,[]]))}:admission(save,stored);
    for(const k of keys)if(Object.getOwnPropertyDescriptor(save.stashTabs,k)?.enumerable)throw Error('Unexpected extra stash storage; original save retained');
    const get=()=>keys.some(k=>doc.tabs[k].length)?doc:undefined;
    Object.defineProperty(save,spec.field,{enumerable:true,configurable:true,get});
    for(const k of keys)Object.defineProperty(save.stashTabs,k,{configurable:true,enumerable:false,get:()=>doc.tabs[k],set:items=>{doc.tabs[k]=items;}});
    bound.set(save,{tabs:save.stashTabs,get,doc});return save;
  }
  globalThis.D2SharedStashData=Object.freeze({keys,sharedKeys:spec.keys,bind,clone:value=>bind(structuredClone(value)),setAdmission:value=>{admission=value;}});
})();
