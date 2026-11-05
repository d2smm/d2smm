// Persistence-risk checks use only the explicitly admitted disposable game.
// Actual transfers are the game's actions; no duplicate inventory algorithm.
async function installSharedStashProof(baseline=null){
  if(!globalThis.__D2GalleryLease?.contextId||!__D2GalleryLease.targetId||location.origin!=='https://d2survivors.lol')throw Error('Verified isolated game required');
  const game=D2Characters.currentGame(),bridge=D2SharedStashProtection,spec=D2ManagerKernel.stash,cls=game.kit.id;
  if(!game.camp||!bridge||!D2Mods.status().qol.stash.enabled||game.save.cursor)throw Error('Use the isolated camp with six tabs enabled and no held item');
  // A prior replay fixture can contain deliberately synthetic progression that
  // the native importer rejects. Use its retained, native-admitted fresh save.
  if(baseline){game.save=structuredClone(baseline);D2SharedStashData.bind(game.save);game.tainted=true;}
  const checks=[],check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name);};
  const read=()=>JSON.parse(localStorage.getItem('d2-survivors/save/v1'));
  const before=structuredClone(game.save),nativeTabs=JSON.stringify(spec.keys.slice(0,3).map(k=>game.save.stashTabs[k]??[]));
  const names=[['Ring','ring'],['Amulet','amulet'],['Sash','belt']],id=()=>crypto.randomUUID().replaceAll('-','');
  const doc={version:spec.version,tabs:Object.fromEntries(D2SharedStashData.keys.map((key,i)=>[key,[{id:id(),base:names[i][0],name:names[i][0],type:names[i][1],rarity:'normal',level:1,mods:[],at:{x:i*2,y:0}}]]))};
  const accepted=bridge.admit({stashTabs:{}},doc),items=D2SharedStashData.keys.map(k=>accepted.tabs[k][0]);
  const bag=game.inventoryOf(cls);if(bag.length)throw Error('Use an empty disposable inventory');
  bag.push(...items);game.moved(items[0]);
  for(let i=0;i<items.length;i++){
    game.stashTab=D2SharedStashData.keys[i];game.gearActions(cls,()=>{},true).toStash(items[i]);
    check('Native transfer to Shared '+(i+4),game.save.stashTabs[D2SharedStashData.keys[i]].includes(items[i])&&!bag.includes(items[i]));
  }
  check('Original three Shared tabs unchanged',JSON.stringify(spec.keys.slice(0,3).map(k=>game.save.stashTabs[k]??[]))===nativeTabs);
  check('Native save stores extra items exactly once',D2SharedStashData.keys.every((k,i)=>read()[spec.field].tabs[k].some(v=>v.id===items[i].id)&&!(k in read().stashTabs)));
  const copy=D2SharedStashData.clone(game.save);D2CharacterCore.sameItems(game.save,copy);
  check('Clone views refer to their own extension arrays',D2SharedStashData.keys.every(k=>copy.stashTabs[k]===copy[spec.field].tabs[k]&&copy.stashTabs[k]!==game.save.stashTabs[k]));
  const invalid=structuredClone(read());invalid[spec.field].tabs.shared4[0].base='not an item';let rejected=false;
  try{bridge.admit(invalid,invalid[spec.field]);}catch(error){rejected=true;}check('Unknown extra items rejected without writing',rejected);
  const duplicate=structuredClone(read());duplicate[spec.field].tabs.shared5.push(structuredClone(duplicate[spec.field].tabs.shared4[0]));rejected=false;
  try{bridge.admit(duplicate,duplicate[spec.field]);}catch(error){rejected=true;}check('Duplicate extra item IDs rejected',rejected);
  const packed={version:spec.version,tabs:{shared4:Array.from({length:120},()=>({...items[0],id:id(),at:undefined})),shared5:[],shared6:[]}};
  check('All 120 native-sized cells accepted',bridge.admit({stashTabs:{}},packed).tabs.shared4.length===120);
  packed.tabs.shared4.push({...items[0],id:id(),at:undefined});rejected=false;try{bridge.admit({stashTabs:{}},packed);}catch(error){rejected=true;}check('Overfull grid rejected, never truncated',rejected);
  async function toggles(){
    const frozen=JSON.stringify(read()[spec.field]);
    await D2Mods.configurePreferences({qolExtraSharedTabs:false});
    check('Disabled option hides extra tabs',document.querySelectorAll('[data-stash-tab]').length===5);
    check('Disabling preserves serialized extra items',JSON.stringify(read()[spec.field])===frozen);
    await D2Mods.configurePreferences({qolExtraSharedTabs:true});
    check('Reenabled option restores six numbered Shared tabs',document.querySelectorAll('[data-stash-tab]').length===8);
    await D2Mods.configurePreferences({managerEnabled:false});check('Master off hides extra tabs',document.querySelectorAll('[data-stash-tab]').length===5);
    await D2Mods.configurePreferences({managerEnabled:true});check('Master on restores extra tabs',document.querySelectorAll('[data-stash-tab]').length===8);
    game.stashTab='shared4';const item=game.save.stashTabs.shared4[0];game.gearActions(cls,()=>{},true).pickUp(item,{grid:'shared4',...item.at});
    rejected=false;try{await D2Mods.configurePreferences({qolExtraSharedTabs:false});}catch(error){rejected=true;}
    check('Held extra item blocks disable before preferences write',rejected&&D2Mods.status().builtinMods.find(x=>x.id==='qol').options.extraSharedTabs);
    game.putBack();D2Mods.close();game.showTown();return checks;
  }
  async function backup(){
    game.transferSave();const dialog=game.saveTransfer;
    const until=async predicate=>{const end=performance.now()+5000;while(!predicate()){if(performance.now()>end)throw Error('Native save dialog timed out');await new Promise(r=>setTimeout(r,20));}};
    await until(()=>!!dialog.code&&!dialog.copyButton.disabled);
    check('Extended backup cannot enter vanilla import silently',dialog.code.startsWith(spec.backupPrefix));
    const code=dialog.code,beforeRaw=localStorage.getItem('d2-survivors/save/v1');
    await dialog.import(code);
    check('Native confirmation owns the prepared import',!!dialog.pending&&!dialog.confirmView.classList.contains('hidden'));
    // Native imports deliberately omit merchant stock and gambling offers.
    // Conservation here concerns the actual extra items, not shop inventory.
    D2CharacterCore.sameItems(game.save[spec.field],dialog.pending[spec.field]);
    check('Native decode plus extension preserves all item identities',D2SharedStashData.keys.every((k,i)=>dialog.pending.stashTabs[k].some(v=>v.id===items[i].id)));
    check('Import preview does not write',localStorage.getItem('d2-survivors/save/v1')===beforeRaw);
    dialog.showMain();check('Cancel clears the pending replacement',dialog.pending===null&&localStorage.getItem('d2-survivors/save/v1')===beforeRaw);
    dialog.close();game.showTown();return{code,checks};
  }
  game.stashTab='shared4';game.showTown();
  globalThis.D2SharedStashProof=Object.freeze({items,checks,before,toggles,backup,read,game});
  return{checks,items:items.map(i=>({id:i.id,name:i.name})),timeOrigin:performance.timeOrigin};
}
