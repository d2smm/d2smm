(async()=>{
  const checks=[],check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);},save=localStorage.getItem('d2-survivors/save/v1');
  const exported=D2Mods.exportText(),pack=JSON.parse(exported),settings=D2Mods.status().mod.settings;
  check('Export contains every editable condition rather than preset IDs',pack.builtinRules.length===0&&pack.extraRules.length===49&&pack.extraRules.every(r=>r.when));
  D2ModPackages.validate(pack);
  const item=mana=>({type:'ring',base:'Ring',rarity:'magic',name:'Ring',mods:[{stat:'fcr',value:10},{stat:'mana',value:mana}]}),rule=pack.extraRules.find(r=>r.id==='ring-blue-caster');
  rule.when.all.find(c=>c.stat==='mana').value=150;rule.reason='10 FCR / 150 mana magic ring';
  await D2Mods.installFile(new File([JSON.stringify(pack)],'my-rules.json',{type:'application/json'}));
  check('Plain JSON import marks the installed rules as edited',D2Mods.status().mod.customRules===true);
  check('Edited threshold changes the actual filter',!D2LootRules.evaluate(item(130),{testFcr:false}).match&&D2LootRules.evaluate(item(150),{testFcr:false}).match);
  check('Import preserves player toggles',JSON.stringify(settings)===JSON.stringify(D2Mods.status().mod.settings));
  const before=D2Mods.status().mod;
  let rejected=false;try{await D2Mods.installFile(new File(['{"broken":'],'broken.json'));}catch(error){rejected=true;}
  check('Malformed JSON leaves the accepted rules unchanged',rejected&&D2Mods.status().mod.sha256===before.sha256&&D2Mods.status().mod.revision===before.revision);
  const invalid=structuredClone(pack);invalid.extraRules[0].when={metric:'not-a-metric',op:'gte',value:1};rejected=false;
  try{await D2Mods.installFile(new File([JSON.stringify(invalid)],'invalid.json'));}catch(error){rejected=true;}
  check('Unsupported conditions leave the accepted rules unchanged',rejected&&D2Mods.status().mod.sha256===before.sha256);
  const db=D2ModStore.create(),stored=await db.read();db.close();check('Edited rules and provenance survive storage reopen',stored.customRules&&stored.sha256===before.sha256&&JSON.parse(stored.source).extraRules.find(r=>r.id==='ring-blue-caster').when.all.find(c=>c.stat==='mana').value===150);
  const roundtrip=JSON.parse(D2Mods.exportText());check('Export preserves the edited threshold',roundtrip.extraRules.find(r=>r.id==='ring-blue-caster').when.all.find(c=>c.stat==='mana').value===150);
  const feed=await D2Mods.checkUpdates();check('Custom same-version rules do not break update checks',feed.latestMod.version==='1.4.0'&&D2Mods.status().mod.sha256===before.sha256);
  const updateFeed=await(await fetch('https://d2s.arken.gg/updates/stable.json')).json(),fetcher=async()=>new Response(JSON.stringify(updateFeed));rejected=false;
  try{await D2ModUpdates.check({id:'loot-guard',version:'1.4.0',sha256:'0'.repeat(64)},'2.8.0',fetcher);}catch(error){rejected=true;}
  check('Official same-version checksum protection remains enforced',rejected);
  await D2Mods.installText(D2ModsDefaultPackage);check('Canonical replacement clears edited status',!D2Mods.status().mod.customRules);
  check('Import/export never writes the native game save',save===localStorage.getItem('d2-survivors/save/v1'));
  return{passed:true,checks,exportBytes:new TextEncoder().encode(exported).length,scope:'Actual manager queue, validator, matcher and mod database; no game save edits'};
})()
