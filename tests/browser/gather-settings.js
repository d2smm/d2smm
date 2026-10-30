// Focused settings proof. Never use a player's session or an active Terror.
(async()=>{
  if(!globalThis.__D2GalleryLease?.contextId||location.origin!=='https://d2survivors.lol'||!['in-camp','no-run'].some(c=>document.body.classList.contains(c)))throw Error('Verified isolated camp or title required');
  await D2Mods.ready;
  const before={save:localStorage.getItem('d2-survivors/save/v1'),origin:performance.timeOrigin};
  const results=[],check=(name,ok)=>{results.push({name,passed:!!ok});if(!ok)throw Error(name);};
  const feature=()=>D2Mods.status().builtinMods.find(m=>m.id==='terrorized');
  const initial=feature(),restore={terrorizedEnabled:initial.enabled,terrorizedGatherDrops:initial.options.gatherRunDrops,terrorizedGatherChests:initial.options.gatherChests};
  const name='d2smm-gather-check-'+crypto.randomUUID(),store=D2ModStore.create(name);let reopened=null;
  const settle=async predicate=>{for(let i=0;i<100;++i){if(!D2Mods.status().busy&&predicate())return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('Gather setting did not settle');};
  try{
    const defaults=await store.readPreferences();
    check('Loose drops default on; chests default off',defaults.terrorizedGatherDrops===true&&defaults.terrorizedGatherChests===false);
    await store.writePreferences({...defaults,terrorizedGatherDrops:false,terrorizedGatherChests:true},defaults.revision);store.close();
    reopened=D2ModStore.create(name);const saved=await reopened.readPreferences();
    check('Explicit choices survive store reopen',saved.terrorizedGatherDrops===false&&saved.terrorizedGatherChests===true);
    await D2Mods.configurePreferences({terrorizedEnabled:true,terrorizedGatherDrops:true,terrorizedGatherChests:false});
    D2Mods.show();const root=document.getElementById('d2-mod-system').shadowRoot,card=root.querySelector('[data-builtin-mod=terrorized]');
    const options=card.querySelector('[data-builtin-options=terrorized]'),drops=card.querySelector('[data-builtin-option=gatherRunDrops]'),chests=card.querySelector('[data-builtin-option=gatherChests]');
    if(!options.open)options.querySelector('summary').click();
    check('Both choices use the existing Options controls',drops.checked&&!chests.checked&&!drops.disabled&&!chests.disabled);
    chests.click();await settle(()=>feature().options.gatherChests);
    check('Chest checkbox enables native chest selection',D2Mods.status().terrorized.gather.chests===true);
    drops.click();await settle(()=>!feature().options.gatherRunDrops);
    check('Chest selection is independent of loose drops',D2Mods.status().terrorized.gather.enabled===false&&D2Mods.status().terrorized.gather.chests===true);
    card.querySelector('[data-builtin-enabled=terrorized]').click();await settle(()=>!feature().enabled);
    check('Master switch disables both categories',drops.disabled&&chests.disabled&&!D2Mods.status().terrorized.gather.enabled&&!D2Mods.status().terrorized.gather.chests);
  }finally{
    store.close();reopened?.close();
    await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(name);request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Gather proof store is still open'));});
    await D2Mods.configurePreferences(restore);
  }
  check('Previous settings restored',feature().enabled===restore.terrorizedEnabled&&feature().options.gatherRunDrops===restore.terrorizedGatherDrops&&feature().options.gatherChests===restore.terrorizedGatherChests);
  check('Native save and page retained',before.save===localStorage.getItem('d2-survivors/save/v1')&&before.origin===performance.timeOrigin);
  return{passed:true,version:D2Mods.version,checks:results};
})()
