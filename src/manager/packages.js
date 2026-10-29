(() => {
  'use strict';
  const allowedSettings=['enabled','protectMatches','sound','testFcr'];
  const stats=new Set(['fcr','attackSpeed','frw','life','mana','strength','dexterity','vitality','energy','magicFind','goldFind','fireResist','coldResist','lightningResist','poisonResist','enhancedDamage','enhancedDefense','attackRatingPoints','attackRatingPerLevel','attackRatingPercentPerLevel','maxDamage','minDamage','maxDamagePerLevel','lifeLeech','manaLeech','deadlyStrike','crushingBlow','openWounds','fhr','fasterBlock','block','damageReduced','damageReduction','allSkills',...Array.from({length:7},(_,i)=>`classskills${i}`),...Array.from({length:21},(_,i)=>`skilltab${i}`)]);
  const fields=new Set(['type','rarity','base','kind']);
  function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`${label} must be an object`);}
  function keys(value,allowed,label){object(value,label);for(const key of Object.keys(value))if(!allowed.includes(key))throw Error(`${label}: unknown field ${key}`);}
  function text(value,label,max=160){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`Invalid ${label}`);return value;}
  function inspect(value,depth=0){if(depth>16)throw Error('Package is too deeply nested');if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error(`Forbidden key ${key}`);inspect(child,depth+1);}}
  function condition(node,depth=0){
    if(depth>6)throw Error('Rule condition is too deep');object(node,'Condition');
    if('all'in node||'any'in node){const key='all'in node?'all':'any';keys(node,[key],'Condition');if(!Array.isArray(node[key])||node[key].length<1||node[key].length>12)throw Error('Condition needs 1–12 children');node[key].forEach(child=>condition(child,depth+1));return;}
    if('atLeast'in node){keys(node,['atLeast','conditions'],'Condition');if(!Array.isArray(node.conditions)||node.conditions.length<1||node.conditions.length>12||!Number.isInteger(node.atLeast)||node.atLeast<1||node.atLeast>node.conditions.length)throw Error('Invalid atLeast condition');node.conditions.forEach(child=>condition(child,depth+1));return;}
    keys(node,['stat','field','metric','op','value'],'Condition');
    if(['stat','field','metric'].filter(k=>k in node).length!==1)throw Error('Condition needs exactly one stat, field or metric');
    if(node.stat||node.metric){if(node.stat&&!stats.has(node.stat))throw Error(`Unsupported stat ${node.stat}`);if(node.metric&&!D2LootRules.metrics.includes(node.metric))throw Error(`Unsupported metric ${node.metric}`);if(!['gte','gt','lte','eq'].includes(node.op)||!Number.isFinite(node.value)||Math.abs(node.value)>100000)throw Error('Invalid numeric comparison');}
    else if(!fields.has(node.field)||node.op!=='eq'||typeof node.value!=='string'||node.value.length>100)throw Error('Invalid item field comparison');
  }
  function settings(value){keys(value,allowedSettings,'Settings');for(const key of allowedSettings)if(typeof value[key]!=='boolean')throw Error(`Setting ${key} must be boolean`);return {...value};}
  function validate(value){
    inspect(value);keys(value,['format','schemaVersion','id','name','version','origin','pathPrefix','adapter','capabilities','description','defaults','builtinRules','extraRules'],'Package');
    if(value.format!=='d2-survivors.mod'||value.schemaVersion!==1)throw Error('Unsupported mod package format/version');
    if(!/^[a-z][a-z0-9-]{1,63}$/.test(value.id))throw Error('Invalid mod ID');
    text(value.name,'mod name',80);text(value.description,'description',300);
    if(!/^\d+\.\d+\.\d+$/.test(value.version))throw Error('Mod version must be major.minor.patch');
    if(value.origin!=='https://d2survivors.lol'||value.pathPrefix!=='/play/')throw Error('This mod targets a different website');
    if(value.adapter!=='d2-loot-guard-v1')throw Error('This installer currently supports loot-rule mods only');
    const capabilities=['loot-labels','loot-keep-override','game-audio'];
    if(!Array.isArray(value.capabilities)||value.capabilities.length!==3||new Set(value.capabilities).size!==3||value.capabilities.some(v=>!capabilities.includes(v)))throw Error('Unsupported mod capabilities');
    settings(value.defaults);
    const known=new Set(globalThis.D2LootRules.catalog.map(r=>r.id));
    if(!Array.isArray(value.builtinRules)||value.builtinRules.length>100||value.builtinRules.some(id=>!known.has(id)))throw Error('Unknown built-in loot rule');
    if(new Set(value.builtinRules).size!==value.builtinRules.length)throw Error('Duplicate built-in rule');
    if(!Array.isArray(value.extraRules)||value.extraRules.length>100)throw Error('At most 100 additional rules are supported');
    const ids=new Set(value.builtinRules);
    for(const rule of value.extraRules){
      keys(rule,['id','reason','when','toggle'],'Extra rule');text(rule.id,'rule ID',80);text(rule.reason,'rule reason',160);
      if(ids.has(rule.id))throw Error(`Duplicate rule ${rule.id}`);ids.add(rule.id);
      if(rule.toggle!==undefined&&rule.toggle!=='testFcr')throw Error('Unsupported rule switch');condition(rule.when);
    }
    return structuredClone(value);
  }
  async function decode(source){
    if(typeof source!=='string'||new TextEncoder().encode(source).length>262144)throw Error('Mod file must be under 256 KB');
    let value;try{value=JSON.parse(source);}catch(error){throw Error(`Invalid JSON: ${error.message}`);}
    // Input migration for already installed rule files. The canonical package
    // has capabilities only; historical build lists never gate execution.
    if(value&&Object.hasOwn(value,'supportedBuilds')){
      if(!Array.isArray(value.supportedBuilds)||value.supportedBuilds.length>10||value.supportedBuilds.some(v=>typeof v!=='string'))throw Error('Invalid historical build metadata');
      value={...value};delete value.supportedBuilds;
    }
    const pack=validate(value),bytes=new TextEncoder().encode(source);
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
    return {pack,source,sha256:hash};
  }
  globalThis.D2ModPackages=Object.freeze({validate,decode,settings,allowedSettings:Object.freeze(allowedSettings)});
})();
