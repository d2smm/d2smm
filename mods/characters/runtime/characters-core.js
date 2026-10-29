(() => {
  'use strict';
  const slots=['weapon','head','amulet','shield','body','gloves','ring1','ring2','belt','boots'];
  const classes=['amazon','assassin','barbarian','druid','necromancer','paladin','sorceress'];
  const sharedTabs=['shared1','shared2','shared3'];
  const clone=value=>structuredClone(value);
  function requireValue(ok,message){if(!ok)throw Error(message);}
  function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
  function archiveKey(hero){return stable(hero);}
  function body(save){
    const value={...save};delete value.seal;
    if(value.equippedByClass){value.equippedByClass={...value.equippedByClass};for(const cls of classes)if(value.equippedByClass[cls]&&Object.keys(value.equippedByClass[cls]).length===0)delete value.equippedByClass[cls];}
    for(const field of ['inventoryByClass','stashTabs','charmsByClass'])if(value[field]){value[field]={...value[field]};for(const key of field==='stashTabs'?[...classes,...sharedTabs]:classes)if(Array.isArray(value[field][key])&&value[field][key].length===0)delete value[field][key];if(field==='charmsByClass'&&Object.keys(value[field]).length===0)delete value[field];}
    return stable(value);
  }
  function itemKey(item){const value={...item};delete value.at;return stable(value);}
  function inventory(save){const found=new Map();function walk(value){if(!value||typeof value!=='object')return;if(typeof value.id==='string'&&typeof value.base==='string'&&typeof value.rarity==='string'){requireValue(!found.has(value.id),'Duplicate item identity; no items were moved');found.set(value.id,itemKey(value));return;}for(const child of Object.values(value))walk(child);}walk(save);return found;}
  function sameItems(before,after){const a=inventory(before),b=inventory(after);requireValue(a.size===b.size&&[...a].every(([id,value])=>b.get(id)===value),'Item conservation check failed; no changes were applied');}
  function wornIds(save,cls){return Object.fromEntries(slots.filter(slot=>save.equippedByClass?.[cls]?.[slot]).map(slot=>[slot,save.equippedByClass[cls][slot].id]));}
  function lineage(save){return {born:save.born??null,player:save.leaderboard?.id??null};}
  function checkLineage(save,meta){const a=lineage(save),b=meta.lineage;requireValue(a.born===b.born&&(!a.player||!b.player||a.player===b.player),'This save does not match the managed roster');}
  function freshHero(hero){const value=clone(hero??{});requireValue(Object.keys(value).every(k=>['glow','best','tomes','unranked'].includes(k)),'The fresh hero record has unsupported progression');requireValue(value.glow===undefined||value.glow===true,'Invalid fresh hero glow');requireValue(value.best===undefined||Number.isInteger(value.best)&&value.best>=0,'Invalid fresh hero progress');requireValue(value.tomes===undefined||Number.isInteger(value.tomes)&&value.tomes>=0,'Invalid fresh hero tomes');requireValue(value.unranked===undefined||['edited','restored'].includes(value.unranked),'Invalid fresh hero ranking state');return value;}
  function defaultForNew(meta){return [1,2,3].find(id=>!meta.characters.some(c=>c.defaultLoadout===id))??1;}
  function availableItems(save,cls){return [...Object.values(save.equippedByClass?.[cls]??{}),...(save.inventoryByClass?.[cls]??[]),...(save.stashTabs?.[cls]??[]),...sharedTabs.flatMap(tab=>save.stashTabs?.[tab]??[])].filter(Boolean);}
  function locate(save,cls,id){
    if(Object.values(save.equippedByClass?.[cls]??{}).some(i=>i?.id===id))return 'Equipped';
    if(save.inventoryByClass?.[cls]?.some(i=>i.id===id))return 'Inventory';
    const vault=save.stashTabs?.[cls]?.find(i=>i.id===id);if(vault)return 'Gear vault · '+(vault.at?.y>=5?'bottom':'top');
    for(let i=0;i<sharedTabs.length;i++)if(save.stashTabs?.[sharedTabs[i]]?.some(v=>v.id===id))return 'Shared '+(i+1);
    for(const other of classes)if(other!==cls){if(Object.values(save.equippedByClass?.[other]??{}).some(i=>i?.id===id))return other+' equipment';if(save.inventoryByClass?.[other]?.some(i=>i.id===id))return other+' inventory';if(save.stashTabs?.[other]?.some(i=>i.id===id))return other+' stash';}
    return 'Unavailable';
  }
  function validateMeta(meta){
    requireValue(meta&&meta.lineage&&Array.isArray(meta.characters)&&meta.characters.length>=1&&meta.characters.length<=3,'Invalid character roster');
    requireValue(new Set(meta.characters.map(c=>c.id)).size===meta.characters.length&&meta.characters.some(c=>c.id===meta.activeCharacter),'Invalid character identities');
    requireValue(Array.isArray(meta.loadouts)&&meta.loadouts.length===3&&[1,2,3].every(id=>meta.loadouts.filter(l=>l.id===id).length===1),'Invalid gear loadouts');
    requireValue([1,2,3].includes(meta.selectedLoadout)&&meta.characters.every(c=>typeof c.id==='string'&&typeof c.name==='string'&&[1,2,3].includes(c.defaultLoadout)&&(c.archive===null||typeof c.archive==='string')),'Invalid character preferences');
    for(const l of meta.loadouts)requireValue(l.items&&typeof l.items==='object'&&!Array.isArray(l.items)&&Object.entries(l.items).every(([slot,id])=>slots.includes(slot)&&typeof id==='string'&&id.length>0)&&new Set(Object.values(l.items)).size===Object.keys(l.items).length,'Invalid equipment references');
    for(const c of meta.characters)if(c.freshHero!==undefined)freshHero(c.freshHero);
  }
  function checkBase(save,cls,context){requireValue(classes.includes(cls),'Choose a class');requireValue(save.mode!=='hc','Characters and loadouts are available in Softcore only');requireValue(context.camp===true&&!context.inRun&&!context.swapping,'Return to camp before changing characters or equipment');requireValue(!save.cursor,'Put down the item on your cursor first');inventory(save);}
  function checkRoster(save,cls,meta){validateMeta(meta);checkLineage(save,meta);const list=save.retired?.[cls]??[];for(const c of meta.characters){if(c.id===meta.activeCharacter)continue;if(c.archive===null)continue;requireValue(list.filter(h=>archiveKey(h)===c.archive).length===1,'Archived heroes changed outside Mod Manager; release the vault before rebinding');}}
  function reserved(meta){return new Set(meta.loadouts.flatMap(l=>Object.values(l.items)));}
  function validateReferences(save,cls,meta){const ids=new Set(availableItems(save,cls).map(i=>i.id));for(const id of reserved(meta))requireValue(ids.has(id),'A loadout item is '+locate(save,cls,id)+'. Move it to Shared storage before switching.');}
  function enable(save,cls,context,ids){checkBase(save,cls,context);requireValue(!(save.stashTabs?.[cls]?.length),'Empty this class’s personal stash before reserving it');requireValue(ids.length>=4,'Missing slot identities');const items=wornIds(save,cls);return {lineage:lineage(save),activeCharacter:ids[0],selectedLoadout:1,characters:[{id:ids[0],name:'Character 1',archive:null,defaultLoadout:1}],loadouts:[1,2,3].map(id=>({id,name:'Loadout '+id,items:clone(items)}))};}
  function resolveGear(save,cls,meta,loadoutId,native){
    const target=meta.loadouts.find(l=>l.id===loadoutId);requireValue(target,'Choose a loadout');
    const desired=Object.values(target.items);requireValue(new Set(desired).size===desired.length,'One item cannot occupy two equipped slots');
    const worn=save.equippedByClass?.[cls]??{},bag=save.inventoryByClass?.[cls]??[],vault=save.stashTabs?.[cls]??[];
    const local=[...Object.values(worn),...bag,...vault].filter(Boolean),pool=new Map(availableItems(save,cls).map(i=>[i.id,i]));
    const refs=reserved(meta),doll=native.doll(cls),equipped={};
    for(const slot of slots){const id=target.items[slot];if(!id)continue;const item=pool.get(id);requireValue(item,'A loadout item is missing');requireValue(doll.fits(item,slot)&&doll.canWear(item),'An item no longer fits this class or equipment slot');equipped[slot]=item;}
    for(const[slot,item]of Object.entries(equipped))requireValue(doll.displaced(item,equipped,slot).every(s=>!equipped[s]||s===slot),'This loadout has conflicting weapons or shields');
    const activeIds=new Set(desired),vaultIds=new Set(vault.map(i=>i.id)),outgoing=new Set(Object.values(worn).filter(Boolean).map(i=>i.id));
    const stored=local.filter(i=>!activeIds.has(i.id)&&(refs.has(i.id)||vaultIds.has(i.id)||outgoing.has(i.id)));
    const ordinary=bag.filter(i=>!activeIds.has(i.id)&&!stored.some(v=>v.id===i.id));
    // References may overlap. Each real item is assigned to just one storage half.
    const inactive=meta.loadouts.filter(l=>l.id!==loadoutId),groups=[[],[]];
    stored.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    for(const item of stored){const preferred=inactive.findIndex(l=>Object.values(l.items).includes(item.id));groups[preferred<0?0:preferred].push(item);}
    const placed=[];
    for(let half=0;half<2;half++){const local=[];for(const original of groups[half]){const item=clone(original);delete item.at;const at=native.space(local,item,{columns:10,rows:5});requireValue(at,'The '+(half?'bottom':'top')+' gear-vault half is full');item.at={x:at.x,y:at.y};local.push(item);}for(const item of local){item.at.y+=half*5;placed.push(item);}}
    for(const item of Object.values(equipped))delete item.at;
    for(const tab of sharedTabs)if(save.stashTabs?.[tab])save.stashTabs[tab]=save.stashTabs[tab].filter(i=>!activeIds.has(i.id));
    (save.equippedByClass??={})[cls]=equipped;(save.inventoryByClass??={})[cls]=ordinary;(save.stashTabs??={})[cls]=placed;meta.selectedLoadout=loadoutId;
  }
  function plan(save,metadata,cls,action,context,native){
    checkBase(save,cls,context);const before=clone(save),draft=clone(save),meta=clone(metadata);checkRoster(draft,cls,meta);validateReferences(draft,cls,meta);
    if(action.kind==='switch'&&action.character===meta.activeCharacter)action={kind:'equip',loadout:meta.characters.find(c=>c.id===meta.activeCharacter).defaultLoadout};
    if(action.kind==='adopt'&&action.archive!==undefined)requireValue(archiveKey(draft.retired?.[cls]?.[action.index])===action.archive,'The archived hero list changed; choose the hero again');
    if(action.kind==='equip'){resolveGear(draft,cls,meta,action.loadout,native);}
    else if(action.kind==='returnUnused'){const ids=reserved(meta),vault=draft.stashTabs?.[cls]??[],bag=draft.inventoryByClass?.[cls]??[];for(const item of vault.filter(i=>!ids.has(i.id))){delete item.at;const at=native.space(bag,item,{columns:10,rows:4});requireValue(at,'Make room in the inventory for unused gear');item.at=at;bag.push(item);}draft.stashTabs[cls]=vault.filter(i=>ids.has(i.id));(draft.inventoryByClass??={})[cls]=bag;}
    else if(action.kind==='saveLoadout'){const l=meta.loadouts.find(l=>l.id===action.loadout);requireValue(l,'Choose a loadout');l.items=wornIds(draft,cls);meta.selectedLoadout=l.id;if(action.makeDefault===true)meta.characters.find(c=>c.id===meta.activeCharacter).defaultLoadout=l.id;}
    else if(action.kind==='default'){requireValue(meta.loadouts.some(l=>l.id===action.loadout),'Choose a loadout');const c=meta.characters.find(c=>c.id===meta.activeCharacter);c.defaultLoadout=action.loadout;}
    else if(action.kind==='rename'){const c=action.target==='character'?meta.characters.find(c=>c.id===action.id):meta.loadouts.find(l=>l.id===action.id);requireValue(c&&typeof action.name==='string'&&action.name.trim().length>0&&action.name.trim().length<=40,'Use a name between 1 and 40 characters');c.name=action.name.trim();}
    else if(action.kind==='adopt'){requireValue(meta.characters.length<3,'Three characters per class are supported');const h=draft.retired?.[cls]?.[action.index];requireValue(h,'That archived hero is unavailable');requireValue(!h.run,'Finish that archived hero’s saved run before adding it');const key=archiveKey(h);requireValue(!meta.characters.some(c=>c.archive===key),'That hero is already in the roster');requireValue((draft.retired?.[cls]??[]).filter(h=>archiveKey(h)===key).length===1,'These archived heroes cannot be distinguished safely');meta.characters.push({id:action.id,name:action.name||'Character '+(meta.characters.length+1),archive:key,defaultLoadout:action.loadout??defaultForNew(meta)});}
    else if(action.kind==='switch'||action.kind==='new'){
      requireValue(!native.savedRun(draft,cls),'Finish the saved run before switching characters');requireValue((draft.retired?.[cls]?.length??0)<32,'The native hero archive is full');
      const current=meta.characters.find(c=>c.id===meta.activeCharacter),oldHero=draft.heroes?.[cls],oldKept=oldHero?.kept;
      requireValue(stable(wornIds(draft,cls))===stable(meta.loadouts.find(l=>l.id===meta.selectedLoadout).items),'Save the equipped gear to a loadout before switching characters');
      let target;
      if(action.kind==='new'){requireValue(meta.characters.length<3,'Three characters per class are supported');requireValue(oldKept?.run?.level>=99,'Reach level 99 with this hero before creating another character');target={id:action.id,name:action.name||'Character '+(meta.characters.length+1),archive:null,defaultLoadout:action.loadout??defaultForNew(meta)};requireValue(native.restart(draft,cls),'The game cannot retire this hero yet');requireValue(draft.heroes?.[cls]?.glow===true,'The native restart did not preserve the level-99 golden glow');target.freshHero=freshHero(draft.heroes[cls]);meta.characters.push(target);}
      else{target=meta.characters.find(c=>c.id===action.character);requireValue(target&&target!==current,'Choose another character');if(target.archive===null){requireValue(!oldHero?.run,'Finish the saved run first');if(oldKept)requireValue(native.restart(draft,cls),'The game cannot retire this hero yet');if(target.freshHero!==undefined)(draft.heroes??={})[cls]=freshHero(target.freshHero);}
      else{const index=(draft.retired?.[cls]??[]).findIndex(h=>archiveKey(h)===target.archive);requireValue(index>=0&&!draft.retired[cls][index].run,'That archived hero has a saved run');requireValue(native.swap(draft,cls,index),'The game refused this character switch');}}
      current.archive=null;
      if(!oldKept)current.freshHero=freshHero(oldHero);
      if(oldKept){const matches=(draft.retired?.[cls]??[]).filter(h=>h.kept===oldKept);requireValue(matches.length===1,'Could not identify the outgoing archived hero');current.archive=archiveKey(matches[0]);}
      target.archive=null;meta.activeCharacter=target.id;resolveGear(draft,cls,meta,target.defaultLoadout,native);
    }else throw Error('Unsupported character action');
    checkRoster(draft,cls,meta);validateReferences(draft,cls,meta);sameItems(before,draft);
    return{before:body(before),after:body(draft),draft,meta,gameChanged:body(before)!==body(draft),restand:action.kind==='switch'||action.kind==='new'};
  }
  function describe(save,cls,meta){
    const list=save.retired?.[cls]??[],items=availableItems(save,cls);
    return{classId:cls,activeCharacter:meta?.activeCharacter,selectedLoadout:meta?.selectedLoadout,creationLevel:save.heroes?.[cls]?.kept?.run?.level??1,
      characters:(meta?.characters??[]).map(c=>{const h=c.id===meta.activeCharacter?save.heroes?.[cls]:list.find(h=>archiveKey(h)===c.archive);const b=h?.run??h?.kept;return{...c,archive:undefined,freshHero:undefined,active:c.id===meta.activeCharacter,level:b?.run?.level??1,skills:b?.build?.skills?.map(s=>s.id)??[]};}),
      loadouts:(meta?.loadouts??[]).map(l=>({...l,matches:stable(l.items)===stable(wornIds(save,cls)),items:Object.entries(l.items).map(([slot,id])=>{const item=items.find(i=>i.id===id);return{slot,id,name:item?.name??'Unavailable item',location:locate(save,cls,id)};})})),
      archived:list.map((h,index)=>({index,key:archiveKey(h),level:(h.run??h.kept)?.run?.level??1})).filter(h=>!meta?.characters.some(c=>c.archive===h.key))};
  }
  globalThis.D2CharacterCore=Object.freeze({slots,classes,body,archiveKey,itemKey,inventory,sameItems,wornIds,enable,plan,describe,reserved,validateMeta});
})();
