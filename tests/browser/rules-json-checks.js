(async()=>{
  const checks=[],check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);},save=localStorage.getItem('d2-survivors/save/v1');
  const exported=D2Mods.exportText(),pack=JSON.parse(exported),settings=D2Mods.status().mod.settings;
  const official=JSON.parse(D2ModsDefaultPackage);
  check('Export contains every editable condition rather than preset IDs',pack.builtinRules.length===0&&pack.extraRules.length===official.builtinRules.length+official.extraRules.length&&pack.extraRules.every(r=>r.when));
  D2ModPackages.validate(pack);
  const item=mana=>({type:'ring',base:'Ring',rarity:'magic',name:'Ring',mods:[{stat:'fcr',value:10},{stat:'mana',value:mana}]}),rule=pack.extraRules.find(r=>r.id==='ring-blue-caster');
  rule.when.all.find(c=>c.stat==='mana').value=150;rule.reason='10 FCR / 150 mana magic ring';
  const traveler=pack.extraRules.find(r=>r.id==='war-traveler-perfect'),mf=traveler.when.all.find(c=>c.stat==='magicFind');mf.value=49;mf.op='gte';
  const boots={type:'boots',base:'Battle Boots',rarity:'unique',name:'War Traveler',mods:[{stat:'magicFind',value:49},{stat:'enhancedDefense',value:190},{stat:'thorns',value:10}]};
  await D2Mods.installFile(new File([JSON.stringify(pack)],'my-rules.json',{type:'application/json'}));
  check('Plain JSON import marks the installed rules as edited',D2Mods.status().mod.customRules===true);
  check('Edited threshold changes the actual filter',!D2LootRules.evaluate(item(130),{testFcr:false}).match&&D2LootRules.evaluate(item(150),{testFcr:false}).match);
  check('Named unique scope and edited rolls survive import',D2LootRules.evaluate(boots,{testFcr:false}).match&&traveler.rarities[0]==='unique');
  check('Import preserves player toggles',JSON.stringify(settings)===JSON.stringify(D2Mods.status().mod.settings));
  const before=D2Mods.status().mod;
  let rejected=false;try{await D2Mods.installFile(new File(['{"broken":'],'broken.json'));}catch(error){rejected=true;}
  check('Malformed JSON leaves the accepted rules unchanged',rejected&&D2Mods.status().mod.sha256===before.sha256&&D2Mods.status().mod.revision===before.revision);
  const invalid=structuredClone(pack);invalid.extraRules[0].when={metric:'not-a-metric',op:'gte',value:1};rejected=false;
  try{await D2Mods.installFile(new File([JSON.stringify(invalid)],'invalid.json'));}catch(error){rejected=true;}
  check('Unsupported conditions leave the accepted rules unchanged',rejected&&D2Mods.status().mod.sha256===before.sha256);
  const db=D2ModStore.create(),stored=await db.read();db.close();check('Edited rules and provenance survive storage reopen',stored.customRules&&stored.sha256===before.sha256&&JSON.parse(stored.source).extraRules.find(r=>r.id==='ring-blue-caster').when.all.find(c=>c.stat==='mana').value===150);
  const roundtrip=JSON.parse(D2Mods.exportText());check('Export preserves the edited threshold',roundtrip.extraRules.find(r=>r.id==='ring-blue-caster').when.all.find(c=>c.stat==='mana').value===150);
  const decoded=await D2ModPackages.decode(D2ModsDefaultPackage),updateFeed={schema:'d2mods.updates.v1',channel:'stable',manager:D2ModsBootstrap,mods:[{id:'loot-guard',version:official.version,bytes:new TextEncoder().encode(D2ModsDefaultPackage).length,sha256:decoded.sha256,url:'https://d2s.arken.gg/mods/loot-guard/'+official.version+'.d2mod.json'}]},fetcher=async()=>new Response(JSON.stringify(updateFeed));
  const feed=await D2ModUpdates.check({id:'loot-guard',version:official.version,sha256:before.sha256,customRules:true},D2Mods.version,fetcher);check('Custom same-version rules do not break update checks',feed.latestMod.version===official.version&&D2Mods.status().mod.sha256===before.sha256);
  rejected=false;try{await D2ModUpdates.check({id:'loot-guard',version:official.version,sha256:'0'.repeat(64)},D2Mods.version,fetcher);}catch(error){rejected=true;}
  check('Official same-version checksum protection remains enforced',rejected);
  await D2Mods.installText(D2ModsDefaultPackage);check('Canonical replacement clears edited status',!D2Mods.status().mod.customRules);
  check('Official perfect-roll threshold is restored',!D2LootRules.evaluate(boots,{testFcr:false}).match);
  check('Import/export never writes the native game save',save===localStorage.getItem('d2-survivors/save/v1'));
  return{passed:true,checks,exportBytes:new TextEncoder().encode(exported).length,scope:'Actual manager queue, validator, matcher and mod database; no game save edits'};
})()
