(() => {
  'use strict';
  const VERSION='2.10.0';
  if(globalThis.D2Mods?.version===VERSION){globalThis.D2Mods.show();return;}
  const db=globalThis.D2ModStore.create();let record=null,closed=false,initialized=false,busy=false,installing=false,queue=Promise.resolve(),notice='',panel=null,view=null,persistent=null,updates=null,checking=false,installerBootstrap=null;
  const channel=new BroadcastChannel('d2-survivors-mods-v1');
  const blank={enabled:false,protectMatches:true,sound:true,testFcr:false};
  let preferences={revision:0,showGem:true,charactersEnabled:true,gearLoadoutsEnabled:true,terrorizedEnabled:true};
  function applyBuiltins(){globalThis.D2Characters.configureFeatures({characters:preferences.charactersEnabled,gearLoadouts:preferences.gearLoadoutsEnabled});terrorized.configure(preferences.terrorizedEnabled);}
  const attention=D2ModAttention.create({onChange:entries=>view?.paintAttention(entries)});
  globalThis.D2LootGuard.setAttention(attention.source('loot-guard','Loot Guard'));
  const gameMenu=D2ModGameMenu.create(()=>show());
  const gameUI=D2ModGameUI.create(gameMenu.getGame,()=>paint());
  const terrorized=D2Terrorized.create({getGame:gameMenu.getGame,onChange:paint,notify:text=>{notice=text;show();}});
  function assertOpen(){if(closed)throw Error('Mod manager has been closed');}
  function task(work){const operation=queue.then(async()=>{assertOpen();busy=true;paint();try{return await work();}finally{busy=false;paint();}});queue=operation.catch(error=>{notice=error.message;console.error('[D2 Mods]',error);paint();});return operation;}
  function apply(){
    if(!record?.pack){globalThis.D2LootGuard.configure(blank);return;}
    globalThis.D2ModPackages.validate(record.pack);globalThis.D2ModPackages.settings(record.settings);
    globalThis.D2LootGuard.configure(record.settings,record.pack);
  }
  async function load(){let[value,display]=await Promise.all([db.read(),db.readPreferences()]);assertOpen();if(value?.pack){const decoded=await globalThis.D2ModPackages.decode(value.source);if(decoded.sha256!==value.sha256)throw Error('Stored mod checksum differs. Reinstall its file.');value.pack=decoded.pack;if(value.elitePolicyVersion!==1)value=await db.write({...value,settings:{...value.settings,testFcr:false},elitePolicyVersion:1},value.revision);}assertOpen();record=value;preferences=display;applyBuiltins();apply();initialized=true;paint();}
  async function installText(source,{customRules=false}={}){return task(async()=>{
    const decoded=await globalThis.D2ModPackages.decode(source);assertOpen();
    if(record?.pack&&record.pack.id!==decoded.pack.id)throw Error('A loot mod is already installed. Remove it before installing another.');
    if(record?.sha256===decoded.sha256&&!!record.customRules===customRules){notice=`${record.pack.name} is already installed`;show();return summary();}
    if(record?.pack&&updates?.manager)throw Error('Update Mod Manager before updating Loot Guard');
    const next={...decoded,customRules,settings:record?.pack?record.settings:{...decoded.pack.defaults,testFcr:false},elitePolicyVersion:1,installedAt:new Date().toISOString()};
    const saved=await db.write(next,record?.revision??0);assertOpen();record=saved;apply();notice=customRules?'Imported rules':`Installed ${record.pack.name} ${record.pack.version}`;channel.postMessage({changed:true});show();return summary();
  });}
  async function installFile(file){
    const installer=file?.name.endsWith('.d2installer.html');
    if(!file||(!file.name.toLowerCase().endsWith('.json')&&!installer))throw Error('Choose a JSON rules file or mod-manager installer');
    if(file.size>262144)throw Error('Mod file must be under 256 KB');
    // Requested only by an explicit file-picker/drop gesture; denial is not hidden.
    navigator.storage?.persist?.().then(value=>{persistent=value;paint();}).catch(error=>console.info('[D2 Mods] persistence grant',error));
    const source=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
    if(!installer)return installText(source,{customRules:true});
    const document=new DOMParser().parseFromString(source,'text/html'),element=document.getElementById('d2-installer-data');
    if(!element)throw Error('The installer has no mod descriptor');
    const descriptor=JSON.parse(element.textContent);
    if(descriptor.format!=='d2mods.installer.v1'||typeof descriptor.packageText!=='string')throw Error('Unsupported installer');
    const bootstrap=globalThis.D2ModUpdates.descriptor(descriptor.bootstrap,'manager');
    const result=await installText(descriptor.packageText);installerBootstrap=bootstrap;paint();return result;
  }
  async function configure(changes){return task(async()=>{
    if(!record?.pack)throw Error('Install a mod first');
    const settings=globalThis.D2ModPackages.settings({...record.settings,...changes});
    const saved=await db.write({...record,settings},record.revision);assertOpen();record=saved;apply();notice='';channel.postMessage({changed:true});return summary();
  });}
  async function uninstall(){return task(async()=>{record=await db.write(null,record?.revision??0);assertOpen();apply();notice='Mod removed';channel.postMessage({changed:true});return summary();});}
  async function configurePreferences(changes){return task(async()=>{
    if(!changes||typeof changes!=='object'||!Object.keys(changes).length||Object.keys(changes).some(k=>!['showGem','charactersEnabled','gearLoadoutsEnabled','terrorizedEnabled'].includes(k)||typeof changes[k]!=='boolean'))throw Error('Invalid manager setting');
    preferences=await db.writePreferences({...preferences,...changes},preferences.revision);assertOpen();applyBuiltins();notice='';channel.postMessage({changed:true});return summary();
  });}
  async function configureBuiltin(id,enabled){const keys={'characters':'charactersEnabled','gear-loadouts':'gearLoadoutsEnabled','terrorized':'terrorizedEnabled'};if(!Object.hasOwn(keys,id)||typeof enabled!=='boolean')throw Error('Invalid built-in mod setting');return configurePreferences({[keys[id]]:enabled});}
  async function checkUpdates(){if(checking)return;if(installing||busy)throw Error('Wait for the current mod operation');checking=true;notice='';paint();try{updates=await globalThis.D2ModUpdates.check(record?.pack?{id:record.pack.id,version:record.pack.version,sha256:record.sha256,customRules:!!record.customRules}:null,VERSION);notice=updates.mod||updates.manager?'':'Everything is up to date';return updates;}catch(error){updates=null;throw error;}finally{checking=false;paint();}}
  async function installModUpdate(){
    if(busy||installing||checking)throw Error('Wait for the current mod operation');
    if(updates?.manager)throw Error('Update Mod Manager before updating Loot Guard');
    const entry=updates?.mod;if(!entry||!record?.pack)throw Error('Check for updates first');
    installing=true;paint();
    try{
      const revision=record.revision,source=await globalThis.D2ModUpdates.download(entry,'mod'),candidate=await globalThis.D2ModPackages.decode(source);assertOpen();
      if(updates?.manager)throw Error('Update Mod Manager before updating Loot Guard');
      if(candidate.pack.id!==entry.id||candidate.pack.version!==entry.version||revision!==record.revision)throw Error('Update identity or installed state changed');
      await installText(source);updates={...updates,mod:null,latestMod:entry};notice=`Updated ${record.pack.name} to ${record.pack.version}`;
    }finally{installing=false;paint();}
  }
  async function installManagerUpdate(){
    const entry=updates?.manager;if(!entry)throw Error('Check for updates first');
    if(busy||installing||checking)throw Error('Wait for the current mod operation');
    installing=true;paint();
    try{
      const old=globalThis.D2ModUpdates.descriptor(globalThis.D2ModsBootstrap,'manager');
      await globalThis.D2ModUpdates.download(entry,'manager');
      if(!gameUI.snapshot().atTitle){panel?.close();if(!await gameMenu.exitToMenu())return;}
      if(!gameUI.snapshot().atTitle)throw Error('The game has not reached the title screen yet');
      const previous=await db.readRuntime();await db.writeRuntime(entry,previous);
      await dispose();
      let next;
      try{next=await globalThis.D2ModUpdates.loadRuntime(entry);next.show();}
      catch(error){
        const recovery=globalThis.D2ModStore.create();await recovery.writeRuntime(previous,entry);recovery.close();
        if(globalThis.D2Mods)await globalThis.D2Mods.dispose();
        const restored=await globalThis.D2ModUpdates.loadRuntime(old);restored.notify(`Update failed; previous manager restored. ${error.message}`);restored.show();
      }
      if(next)try{await next.checkUpdates();}catch(error){console.warn('[D2 Mods] post-update check',error);next.notify(`Manager updated. Could not check mod updates: ${error.message}`);}
    }finally{installing=false;if(!closed)paint();}
  }
  function summary(){return{version:VERSION,ready:initialized&&!closed,busy:busy||installing,checking,updates,hotkey:'M',origin:location.origin,storage:'IndexedDB',persistent,notice,preferences:{showGem:preferences.showGem},
    builtinMods:[{id:'characters',version:VERSION,enabled:preferences.charactersEnabled},{id:'gear-loadouts',version:VERSION,enabled:preferences.gearLoadoutsEnabled},{id:'terrorized',version:VERSION,enabled:preferences.terrorizedEnabled,problem:terrorized.status().problem?'Rerun is unavailable in this game build.':''}],
    mod:record?.pack?{id:record.pack.id,name:record.pack.name,version:record.pack.version,sha256:record.sha256,customRules:!!record.customRules,settings:{...record.settings},ruleCount:record.pack.builtinRules.length+record.pack.extraRules.length,revision:record.revision}:null,
    runtime:globalThis.D2LootGuard.snapshot(),attention:attention.snapshot(),gameMenu:gameMenu.status(),terrorized:terrorized.status(),session:gameUI.snapshot()};}
  function report(error){notice=error.message||String(error);console.error('[D2 Mods]',error);show();paint();}
  function show(){globalThis.D2Characters?.close();if(!panel)mount();if(!panel.open){gameUI.release();panel.showModal();}paint();}
  function exportText(){return record?.pack?JSON.stringify({...D2LootRules.exportPackage(record.pack),defaults:record.settings},null,2)+'\n':null;}
  function paint(){view?.paint(summary(),record?.pack,installerBootstrap);}
  function mount(){
    view=globalThis.D2ModView.create({
      show,report,configure,configurePreferences,configureBuiltin,installFile,exportText,uninstall,checkUpdates,installModUpdate,installManagerUpdate,focusGame:gameUI.focus,
      characters:()=>{panel.close();globalThis.D2Characters.show({section:'characters'});},
      gear:()=>{panel.close();globalThis.D2Characters.show({section:'gear'});},
      toggleFilter:()=>configure({enabled:!record.settings.enabled}),
      enableDefault:()=>installText(globalThis.D2ModsDefaultPackage)
    });
    panel=view.panel;paint();
  }
  function dragOver(event){if([...event.dataTransfer?.types||[]].includes('Files'))event.preventDefault();}
  function drop(event){const files=[...event.dataTransfer?.files||[]];const file=files.find(f=>f.name.toLowerCase().endsWith('.json')||f.name.endsWith('.d2installer.html'));if(!file)return;event.preventDefault();event.stopImmediatePropagation();show();installFile(file).catch(report);}
  let managerKeyHeld=false;
  function consumeHotkey(event){event.preventDefault();event.stopImmediatePropagation();}
  function hotkey(event){
    if(event.code!=='KeyM')return;
    if(managerKeyHeld){consumeHotkey(event);return;}
    if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing)return;
    const target=event.composedPath()[0];
    if(target?.isContentEditable||target?.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select'))return;
    consumeHotkey(event);
    if(event.repeat)return;
    managerKeyHeld=true;
    panel?.open?panel.close():show();
  }
  function releaseHotkey(event){if(event.code==='KeyM'&&managerKeyHeld){managerKeyHeld=false;consumeHotkey(event);}}
  function resetHotkey(){managerKeyHeld=false;}
  function message(event){
    if(event.source!==window||event.origin!==location.origin||event.data?.channel!=='d2mods-bridge-v1')return;
    const request=event.data;if(!['status','open'].includes(request.action)||typeof request.requestId!=='string')return;
    if(request.action==='open')show();window.postMessage({channel:'d2mods-bridge-v1',responseTo:request.requestId,value:summary()},location.origin);
  }
  const lootStatus=()=>paint();
  document.addEventListener('dragover',dragOver,true);document.addEventListener('drop',drop,true);window.addEventListener('keydown',hotkey,true);window.addEventListener('message',message);window.addEventListener('d2mods:loot-status',lootStatus);
  window.addEventListener('keyup',releaseHotkey,true);window.addEventListener('blur',resetHotkey);
  channel.onmessage=()=>task(load).catch(report);
  const ready=task(async()=>{mount();persistent=await navigator.storage?.persisted?.()??false;await load();});
  async function dispose(){await queue;closed=true;await terrorized.dispose();gameUI.dispose();view?.dispose();globalThis.D2LootGuard.dispose();attention.dispose();await globalThis.D2Characters?.dispose();await gameMenu.dispose();await globalThis.D2GameContract?.dispose();globalThis.D2GameSkin?.dispose();db.close();channel.close();document.removeEventListener('dragover',dragOver,true);document.removeEventListener('drop',drop,true);window.removeEventListener('keydown',hotkey,true);window.removeEventListener('keyup',releaseHotkey,true);window.removeEventListener('blur',resetHotkey);window.removeEventListener('message',message);window.removeEventListener('d2mods:loot-status',lootStatus);document.getElementById('d2-mod-system')?.remove();delete globalThis.D2Mods;delete globalThis.D2LootGuard;delete globalThis.D2Characters;}
  globalThis.D2Mods=Object.freeze({version:VERSION,ready,status:summary,show,focusGame:gameUI.focus,close:()=>panel?.close(),installFile,installText,configure,configurePreferences,configureBuiltin,uninstall,dispose,exportText,checkUpdates,installModUpdate,installManagerUpdate,attention:Object.freeze({source:attention.source}),notify:text=>{notice=String(text).slice(0,400);paint();}});
  ready.catch(report);
})();
