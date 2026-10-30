// Typed transport to the browser C++ matcher. Rule data and presentation stay JS.
(() => {
  'use strict';
  const data=D2LootRuleData,meta=D2LootKernel,encoder=new TextEncoder();let core=null,current=[];
  const empty=()=>({match:false,rules:[],reasons:[],valid:false});
  const requireOK=ok=>{if(!ok)throw Error(meta.errors[core.loot_error()]||'Invalid loot rules');};
  function input(value,slot=0){
    if(typeof value!=='string')throw Error('Expected loot-rule text');const bytes=encoder.encode(value);
    if(bytes.length>meta.textLimit)throw Error('Loot-rule text is too long');
    new Uint8Array(core.memory.buffer,core.loot_input(slot),meta.textLimit).set(bytes);return bytes.length;
  }
  function condition(node){
    if(node.all){node.all.forEach(condition);requireOK(core.loot_group(meta.kinds.all,node.all.length,0));}
    else if(node.any){node.any.forEach(condition);requireOK(core.loot_group(meta.kinds.any,node.any.length,0));}
    else if(node.conditions){node.conditions.forEach(condition);requireOK(core.loot_group(meta.kinds.atLeast,node.conditions.length,node.atLeast));}
    else if(node.field)requireOK(core.loot_text(meta.fields.indexOf(node.field),meta.comparisons[node.op]??-1,input(node.value)));
    else requireOK(core.loot_number(node.stat?meta.kinds.stat:meta.kinds.metric,(node.stat?meta.stats:meta.metrics).indexOf(node.stat??node.metric),meta.comparisons[node.op]??-1,node.value));
  }
  function compile(rules,commit){
    if(!core)throw Error('Loot Guard is still loading');core.loot_begin();
    for(const rule of rules){
      requireOK(core.loot_rule(Number(rule.rarities!==undefined),Number(rule.toggle==='testFcr')));
      if(rule.rarities!==undefined)for(const rarity of rule.rarities)requireOK(core.loot_rarity(meta.rarities.indexOf(rarity)));
      condition(rule.when);requireOK(core.loot_end());
    }
    if(commit){requireOK(core.loot_commit());current=rules;}
  }
  function select(pack){return pack?[...pack.builtinRules.map(id=>{const rule=data.find(r=>r.id===id);if(!rule)throw Error('Unknown built-in rule '+id);return rule;}),...pack.extraRules]:data;}
  function usePackage(pack){compile(structuredClone(select(pack)),true);}
  function validatePackage(pack){compile(select(pack),false);}
  function evaluate(item,{testFcr=true}={}){
    if(!core||!item||typeof item!=='object')return empty();
    core.loot_item(Number(Array.isArray(item.mods)));
    for(const key of ['type','rarity','base','name']){
      const present=typeof item[key]==='string';
      if(present&&encoder.encode(item[key]).length>meta.textLimit)return empty();
      core.loot_field(meta.fields.indexOf(key),input(present?item[key]:''),Number(present));
    }
    if(Array.isArray(item.mods))for(const mod of item.mods){
      const typed=typeof mod?.stat==='string'&&typeof mod?.value==='number';
      if(typed&&encoder.encode(mod.stat).length>meta.textLimit)return empty();
      core.loot_modifier(input(typed?mod.stat:''),typed?mod.value:NaN,Number(!!mod?.implicit),Number(typed));
    }
    if(!core.loot_evaluate(Number(testFcr)))return empty();
    const matches=current.filter((_,index)=>core.loot_match(index));
    return{match:!!matches.length,rules:matches.map(r=>r.id),reasons:matches.map(r=>r.reason),valid:true};
  }
  function exportPackage(pack){return structuredClone({...pack,builtinRules:[],extraRules:select(pack).map(({id,reason,when,rarities,toggle})=>({id,reason,when,...rarities?{rarities}:{},...toggle?{toggle}:{}}))});}
  const ready=WebAssembly.instantiate(Uint8Array.from(atob(meta.wasm),c=>c.charCodeAt(0)),{}).then(({instance})=>{
    core=instance.exports;
    for(const[base,kind]of Object.entries(D2LootBaseKinds))requireOK(core.loot_base(input(base),input(kind,1)));
    usePackage(null);
  });
  Object.defineProperty(globalThis,'D2LootRules',{value:Object.freeze({version:'4.0.0',ready,evaluate,usePackage,validatePackage,exportPackage,
    fields:Object.freeze(meta.fields),stats:Object.freeze(meta.stats),metrics:Object.freeze(meta.metrics),
    catalog:Object.freeze(data.map(({id,reason,source})=>Object.freeze({id,reason,source}))) }),configurable:true});
})();
