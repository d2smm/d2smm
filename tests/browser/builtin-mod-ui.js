// Run in a newly created, host-verified Incognito game after loading the candidate.
(async()=>{
  if(!globalThis.__D2GalleryLease?.contextId||location.origin!=='https://d2survivors.lol')throw Error('Verified isolated game context required');
  await D2Mods.ready;await D2Characters.ready;
  const raw=()=>localStorage.getItem('d2-survivors/save/v1');
  const metadata=async()=>{const db=D2CharacterStore.create();try{return JSON.stringify(await db.read());}finally{db.close();}};
  const before={save:raw(),metadata:await metadata(),origin:performance.timeOrigin};
  const checks=[],check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);};
  const feature=id=>D2Mods.status().builtinMods.find(m=>m.id===id);
  const settle=async predicate=>{for(let i=0;i<100;i++){if(!D2Mods.status().busy&&predicate())return;await new Promise(r=>setTimeout(r,20));}throw Error('Mod setting did not settle');};
  D2Mods.show();const root=document.getElementById('d2-mod-system').shadowRoot;
  const options=root.querySelector('details[data-section=options]');
  check('Loot Guard uses the same Enabled label',root.querySelector('[data-setting=enabled]').closest('label').querySelector('span').textContent==='Enabled');
  check('Loot options begin collapsed',!!options&&!options.open);
  options.querySelector('summary').click();
  check('Sound, testing, and protection belong to Options',options.open&&['sound','testFcr','protectMatches'].every(k=>!!options.querySelector(`[data-setting="${k}"]`)));
  options.querySelector('summary').click();
  check('Options closes independently of Rules',!options.open&&!root.querySelector('details[data-section=rules]').open);
  const card=id=>root.querySelector(`[data-builtin-mod="${id}"]`);
  check('All built-ins appear as mod cards',['characters','gear-loadouts','terrorized','qol'].every(id=>!!card(id)));
  check('Terrorized has no unnecessary Open button',!card('terrorized').querySelector('button'));
  check('QoL has no unnecessary Open button',!card('qol').querySelector('button'));
  const gatherOptions=card('terrorized').querySelector('[data-builtin-options=terrorized]'),gather=card('terrorized').querySelector('[data-builtin-option=gatherRunDrops]'),initialGather=feature('terrorized').options.gatherRunDrops;
  check('Gather uses the collapsed Options disclosure',!!gatherOptions&&!gatherOptions.open&&!!gather);
  gatherOptions.querySelector('summary').click();gather.click();await settle(()=>feature('terrorized').options.gatherRunDrops!==initialGather);
  check('Gather changes through its actual checkbox',gather.checked===!initialGather);
  gather.click();await settle(()=>feature('terrorized').options.gatherRunDrops===initialGather);gatherOptions.querySelector('summary').click();
  check('Duplicate shortcut strip is gone',!root.querySelector('.d2mods__character-actions'));
  for(const id of ['characters','gear-loadouts','terrorized','qol']){
    check(id+' initially enabled',feature(id).enabled);
    card(id).querySelector('input').click();await settle(()=>!feature(id).enabled);
    check(id+' disables through its actual checkbox',!card(id).querySelector('input').checked&&(!card(id).querySelector('button')||card(id).querySelector('button').disabled));
  }
  if(D2Mods.status().mod)await D2Mods.configure({enabled:false});
  const gem=root.querySelector('[data-action=toggle-manager]'),master=root.querySelector('[data-action=toggle-manager-panel]');
  check('Feature selections do not override the master gem state',D2Mods.status().managerEnabled&&gem.dataset.state==='on');
  const selections=JSON.stringify(D2Mods.status().builtinMods.map(m=>[m.id,m.enabled]));
  master.click();await settle(()=>!D2Mods.status().managerEnabled);
  check('Master off makes the gem blue and retains selections',gem.dataset.state==='off'&&JSON.stringify(D2Mods.status().builtinMods.map(m=>[m.id,m.enabled]))===selections);
  master.click();await settle(()=>D2Mods.status().managerEnabled);
  check('Master on makes the gem purple and retains selections',gem.dataset.state==='on'&&JSON.stringify(D2Mods.status().builtinMods.map(m=>[m.id,m.enabled]))===selections);
  card('characters').querySelector('input').click();await settle(()=>feature('characters').enabled);
  check('Characters alone gives the gem its on state',root.querySelector('.d2mods__launcher').dataset.state==='on'&&!feature('gear-loadouts').enabled);
  card('characters').querySelector('input').click();await settle(()=>!feature('characters').enabled);
  await D2Mods.configurePreferences({showGem:false});await D2Mods.configurePreferences({showGem:true});
  check('Changing gem visibility preserves disabled mods',D2Mods.status().builtinMods.every(m=>!m.enabled));
  const db=D2ModStore.create();let persisted;try{persisted=await db.readPreferences();}finally{db.close();}
  check('Settings survive reopening their store',persisted.charactersEnabled===false&&persisted.gearLoadoutsEnabled===false&&persisted.terrorizedEnabled===false&&persisted.qolEnabled===false&&persisted.showGem===true);
  check('Gather preference survives feature/master toggles and store reopen',persisted.terrorizedGatherDrops===initialGather&&gather.disabled);
  for(const [id,value] of [['missing',true],['characters','false']]){let rejected=false;try{await D2Mods.configureBuiltin(id,value);}catch(error){rejected=true;}check('Invalid built-in setting rejected: '+id,rejected);}
  check('Native save and character metadata are unchanged',raw()===before.save&&await metadata()===before.metadata);
  check('The game page was retained',performance.timeOrigin===before.origin);
  globalThis.__D2BuiltinProof={before,checks};
  return{passed:true,checks,leaves:'Built-ins disabled for a manager-restart persistence check'};
})()
