(() => {
  'use strict';
  let instance=null,api=null,presentation=null,nativeSelect=null,closed=false,problem='',view=null,attached=false,connection=null;
  let armoryCache=null,informationBindings=null;
  let features={characters:false,gearLoadouts:false};
  function requireFeature(key){if(!features[key])throw Error((key==='characters'?'Characters':'Gear Loadouts')+' is off. Turn it on in Mod Manager.');}
  function configureFeatures(value){
    if(typeof value?.characters!=='boolean'||typeof value?.gearLoadouts!=='boolean')throw Error('Invalid built-in mod settings');
    features={characters:value.characters,gearLoadouts:value.gearLoadouts};
    if(attached&&!meta().pending)problem='';
    if(view?.isOpen()&&!features[view.section()==='gear'?'gearLoadouts':'characters'])view.close();
  }
  const patches=[],raw=()=>localStorage.getItem('d2-survivors/save/v1')||'';
  const controller=D2CharacterController.create({db:D2CharacterStore.create(),getGame:()=>instance,getNative:()=>api,readRaw:raw,changed:()=>publish()});
  const meta=()=>controller.metadata(),managed=cls=>!!meta().classes[cls];
  function publish(){if(!closed&&view?.isOpen())view.paint(status());}
  function report(error){problem=error.message||String(error);console.error('[D2 Characters]',error);publish();}
  function patch(proto,key,wrapper){const original=proto[key],replacement=wrapper(original);proto[key]=replacement;patches.push(()=>{if(proto[key]===replacement)proto[key]=original;});}
  function reserved(item){return !!item&&Object.values(meta().classes).some(m=>D2CharacterCore.reserved(m).has(item.id));}
  function inVault(game,item){return !!item&&Object.keys(meta().classes).some(cls=>(game.save.stashTabs?.[cls]??[]).some(i=>i.id===item.id));}
  function refuse(game,reason='That equipment is reserved by Gear Loadouts'){problem=reason;game.hud?.refuse(problem);publish();}
  function operationBlock(){return controller.busy()?'Wait for the current loadout operation':meta().pending?'A loadout switch needs recovery. Open Characters & gear.':null;}
  function connect(){if(connection)return connection;connection=attach().finally(()=>{connection=null;});return connection;}
  async function attach(){
    if(closed||attached)return;
    {
      const contract=await D2GameContract.connect();if(!contract)return;
      if(closed)return;
      if(!contract.characters){problem=contract.characterError;publish();return;}
      const {Game}=contract;
      if(!['tick','gearActions','openAkara','restandHero','openStashTab','swapHero','dropHeld','discardHeld'].every(k=>typeof Game.prototype[k]==='function'))throw Error('Character interaction contract changed');
      api=contract.characters;
      presentation=contract.presentation;
      informationBindings=contract.information;
      nativeSelect=Game.prototype.swapHero;
      patch(Game.prototype,'tick',original=>function(...args){instance=this;return original.apply(this,args);});
      patch(Game.prototype,'swapHero',original=>function(cls,...args){
        if(features.characters&&!controller.busy()&&this.camp&&this.state==='camp'&&!this.swapping){
          const hero=this.save.heroes?.[cls],level=(hero?.run??hero?.kept)?.run?.level??1;
          if(level>=99||(meta().classes[cls]?.characters.length??0)>1){
            instance=this;
            const blocked=operationBlock();if(blocked){refuse(this,blocked);return;}
            if(this.save.cursor){refuse(this,'Put down the held item before choosing a character');return;}
            show({classId:cls,section:'characters',intent:level>=99?'create':'choose'});return;
          }
        }
        return original.call(this,cls,...args);
      });
      patch(Game.prototype,'openStashTab',original=>function(cls){const tab=original.call(this,cls);return managed(cls)&&tab==='personal'?'shared1':tab;});
      patch(Game.prototype,'openAkara',original=>function(selected,section){if(managed(this.kit?.id)&&(selected==='restart'||section==='earlier')){if(!features.characters){refuse(this,'Turn on Characters to manage saved heroes.');return;}show({classId:this.kit.id,section:'characters',intent:selected==='restart'?'create':'choose'});return;}return original.apply(this,arguments);});
      for(const key of ['dropHeld','discardHeld'])patch(Game.prototype,key,original=>function(...args){const blocked=operationBlock();if(blocked){refuse(this,blocked);return;}if(reserved(this.save.cursor?.item)||inVault(this,this.save.cursor?.item)){refuse(this);return;}return original.apply(this,args);});
      patch(Game.prototype,'gearActions',original=>function(cls,...args){
        const game=this,actions=original.call(this,cls,...args),owner=args[2]?.doll?.owner??'hero';
        const protectedItem=item=>reserved(item)||inVault(game,item);
        const shared=grid=>['shared1','shared2','shared3'].includes(grid);
        const block=(key,check)=>{if(typeof actions[key]!=='function')return;const fn=actions[key];actions[key]=function(...values){const blocked=operationBlock();if(blocked){refuse(game,blocked);return;}if(check(...values)){refuse(game);return;}return fn.apply(this,values);};};
        if(typeof actions.openStashTab==='function'){
          const open=actions.openStashTab;
          actions.openStashTab=function(tab){
            if(!managed(cls)||tab!=='personal')return open.call(this,tab);
            const blocked=operationBlock();if(blocked){refuse(game,blocked);return;}
            if(!features.gearLoadouts){refuse(game,'Turn on Gear Loadouts to access this reserved stash.');return;}
            if(game.save.cursor){refuse(game,'Put down the held item before choosing a loadout');return;}
            if(game.state==='town'&&game.camp&&game.trade?.only==='stash'){
              const close=game.hud?.charClose;
              if(typeof close?.onclick!=='function'){refuse(game,'Close the stash before choosing a loadout');return;}
              close.click();
            }
            if(!controller.context(game).camp){refuse(game,'Return to camp before choosing a loadout');return;}
            instance=game;show({classId:cls,section:'gear'});
          };
        }
        block('toStash',item=>inVault(game,item)||protectedItem(item)&&!shared(game.openStashTab(cls)));block('fromStash',item=>inVault(game,item));block('equip',item=>inVault(game,item)||(reserved(item)&&owner!=='hero'));
        block('pickUp',(item,from)=>managed(cls)&&from?.grid==='personal'||inVault(game,item));
        block('putDown',grid=>managed(cls)&&grid==='personal'||protectedItem(game.save.cursor?.item)&&!shared(grid)&&(grid!=='inventory'||game.save.cursor?.cls!==cls));
        block('wear',()=>protectedItem(game.save.cursor?.item)&&(game.save.cursor?.cls!==cls||owner!=='hero'));
        for(const key of ['sellHeld','keepHeld','drop'])block(key,()=>protectedItem(game.save.cursor?.item));
        block('sell',protectedItem);
        for(const key of ['unequip','release'])block(key,()=>false);
        return actions;
      });
      attached=true;problem='';observer.disconnect();publish();
    }
  }
  async function perform(cls,action){requireFeature(['new','adopt','switch'].includes(action.kind)||action.kind==='rename'&&action.target==='character'?'characters':'gearLoadouts');problem='';const result=await controller.perform(cls,action);publish();return result;}
  async function selectClass(cls){
    requireFeature('characters');
    problem='';const game=instance,blocked=operationBlock();
    if(blocked)throw Error(blocked);
    if(!nativeSelect||!game?.camp||game.state!=='camp'||game.swapping)throw Error('Select your character at the campfire.');
    if(game.save.cursor)throw Error('Put down the held item first.');
    await nativeSelect.call(game,cls);
    if(game.kit.id!==cls)throw Error('That character could not be selected. Try again.');
  }
  function status(){
    let save=instance?.save;
    if(!save)try{save=JSON.parse(raw()||'{}');}catch(error){console.info('[D2 Characters] unreadable save',error.message);save={};}
    const ctx=controller.context(instance);
    return{attached,busy:controller.busy(),problem,pending:!!meta().pending,currentClass:instance?.kit?.id??'amazon',canSelect:!!nativeSelect&&ctx.camp&&!ctx.swapping&&!save.cursor,canChange:!!api&&ctx.camp&&!ctx.inRun&&!ctx.swapping&&save.mode!=='hc'&&!save.cursor,
      classes:D2CharacterCore.classes.map(cls=>{const m=meta().classes[cls],hero=save.heroes?.[cls];return{...D2CharacterCore.describe(save,cls,m),nativeLevel:(hero?.run??hero?.kept)?.run?.level??1,enabled:!!m,personalItems:save.stashTabs?.[cls]?.length??0,vault:(save.stashTabs?.[cls]??[]).map(i=>({name:i.name,half:i.at?.y>=5?'Bottom':'Top'})),hasSavedRun:!!hero?.run};})};
  }
  async function exportBackups(){const entries=await controller.backups();if(!entries.length)throw Error('No character backups have been created');const url=URL.createObjectURL(new Blob([JSON.stringify({format:'d2s.character-backups.v1',entries},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='D2S-character-backups.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function armory(cls,id,details=false){
    const save=instance?.save,m=meta().classes[cls],loadout=m?.loadouts.find(l=>l.id===id);
    if(!api||!save||!loadout)return null;
    const level=(save.heroes?.[cls]?.run??save.heroes?.[cls]?.kept)?.run?.level??1;
    const pool=[...Object.values(save.equippedByClass?.[cls]??{}),...(save.inventoryByClass?.[cls]??[]),...(save.stashTabs?.[cls]??[]),...['shared1','shared2','shared3'].flatMap(tab=>save.stashTabs?.[tab]??[])];
    const worn=Object.fromEntries(Object.entries(loadout.items).map(([slot,id])=>[slot,pool.find(i=>i?.id===id)]));
    const key=JSON.stringify([cls,id,level,worn,details]);if(armoryCache?.key===key)return armoryCache.value;
    const copies=structuredClone(worn),items={};
    for(const [slot,item]of Object.entries(copies)){
      if(!item){items[slot]={name:'Unavailable item',missing:true,lines:[]};continue;}
      const value={id:item.id,name:item.name,base:item.base,rarity:item.rarity,lines:[],icon:null};
      if(details)value.perfection=D2ItemPerfection.rate(item,presentation?.catalog?.());
      try{
        if(!presentation)throw Error('Item details are unavailable for this game update.');
        const info=presentation.describe(item,cls,level,undefined,copies);
        if(typeof info?.name!=='string'||!Array.isArray(info.lines)||info.lines.some(l=>typeof l.text!=='string'))throw Error('Item details are unavailable for this game update.');
        value.name=presentation.name(info.name,item.rarity,item.base);value.base=presentation.name(info.base??item.base);value.lines=info.lines.map(l=>({text:l.text,implicit:!!l.implicit,inert:!!l.inert,unusable:!!l.unusable,tone:l.tone}));
        const icon=presentation.icon(instance.art.items,item);
        if(icon&&typeof icon.url==='string'&&['https:','blob:','data:'].includes(new URL(icon.url,location.href).protocol))value.icon={url:icon.url,width:icon.width,height:icon.height};
      }catch(error){console.warn('[D2 Characters] item preview',error);value.error='Item details unavailable';}
      items[slot]=value;
    }
    const slots=api.doll(cls).slots.map(s=>({slot:s.slot,label:s.label,col:s.col,row:s.row,w:s.w,h:s.h}));
    armoryCache={key,value:{slots,items,level}};return armoryCache.value;
  }
  const information=D2BuildInformation.create({getGame:()=>instance,getInformation:()=>informationBindings,getPresentation:()=>presentation,armory,status});
  function show(options={}){requireFeature(options.section==='gear'?'gearLoadouts':'characters');globalThis.D2Mods?.close?.();instance?.input?.release?.();view??=D2CharacterView.create({perform,selectClass,report,exportBackups,status,armory,information:information.read});view.show(options);publish();}
  const observer=new PerformanceObserver(()=>{connect().catch(report);});observer.observe({type:'resource',buffered:true});
  const ready=controller.ready.then(connect);ready.catch(report);
  const interval=setInterval(()=>{if(!closed)publish();},2000);
  async function dispose(){closed=true;observer.disconnect();clearInterval(interval);await controller.dispose();for(const unpatch of patches.reverse())unpatch();view?.dispose();}
  globalThis.D2Characters=Object.freeze({ready,status,show,toggleGear:()=>{requireFeature('gearLoadouts');if(view?.isOpen()&&view.section()==='gear')view.close();else show({section:'gear',classId:instance?.kit?.id});},close:()=>view?.close(),perform,selectClass,configureFeatures,dispose,ensureHooks:connect,currentGame:()=>closed?null:instance});
})();
