(() => {
  'use strict';
  function protection(native,core){
    const spec=D2ManagerKernel.stash,data=D2SharedStashData,flags=spec.facts,p=native.Game.prototype;
    let enabled=false,getGame=()=>null,changed=()=>{},restoreView=null,hud=null,restores=[];
    const originalTabs=native.tabs.slice();
    function admit(save,document){
      const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
      const shape=plain(document)&&Object.keys(document).every(k=>['version','tabs'].includes(k))&&plain(document.tabs)&&Object.keys(document.tabs).length===data.keys.length&&data.keys.every(k=>Array.isArray(document.tabs[k]));
      const lists=data.keys.map(k=>shape?document.tabs[k]:[]),counts=lists.map(a=>a.length);
      // Bound work before visiting any supplied item. Native decides admission.
      let bits=shape?flags.shape:0;
      let error=core.d2smm_stash_validate(document?.version??NaN,...counts,bits|flags.itemsValid|flags.identitiesUnique|flags.itemsFit);
      if(error)throw Error('Extra Shared storage is unsupported or damaged ('+error+'); its data was retained');
      let valid=true,fit=true;const result={version:document.version,tabs:{}};
      for(let i=0;i<lists.length;i++){
        const items=lists[i].map(item=>{const normalized=native.normalize(structuredClone(item));if(!normalized)valid=false;return normalized;});
        if(valid&&!native.layout(items,native.grid).fits)fit=false;
        result.tabs[data.keys[i]]=items;
      }
      if(valid)bits|=flags.itemsValid;if(fit)bits|=flags.itemsFit;
      const candidate={...save,[spec.field]:result,stashTabs:{...save.stashTabs}};for(const k of data.keys)delete candidate.stashTabs[k];
      try{D2CharacterCore.inventory(candidate);bits|=flags.identitiesUnique;}catch(error){console.warn('[Shared stash] duplicate identity',error.message);}
      error=core.d2smm_stash_validate(document.version,...counts,bits);
      if(error)throw Error('Extra Shared items could not be validated ('+error+'); its data was retained');
      return result;
    }
    data.setAdmission(admit);
    const transfer=D2QolStashTransfer.install(native,core,admit);
    function installHooks(){
      const wrap=(name,make)=>{const original=p[name],wrapper=make(original);p[name]=wrapper;restores.push(()=>{if(p[name]===wrapper)p[name]=original;});};
      wrap('stashView',original=>function(...args){data.bind(this.save);select(this);return original.apply(this,args);});
      wrap('gearActions',original=>function(...args){data.bind(this.save);select(this);return original.apply(this,args);});
      wrap('readCodex',original=>function(cls,item,refresh){
      data.bind(this.save);
      if(data.keys.some(k=>this.save.stashTabs[k].includes(item))){
        // Let the existing transfer own capacity, removal, placement and save.
        this.gearActions(cls,()=>{},true).fromStash(item);
        if(!this.inventoryOf(cls).includes(item)){refresh();return;}
      }
      return original.call(this,cls,item,refresh);
      });
    }
    function select(game){const current=game.stashTab==='uniques'?7:game.stashTab==='personal'?0:spec.keys.indexOf(game.stashTab)+1;const next=core.d2smm_stash_selected(current,Number(enabled));if(current!==next)game.stashTab=next===0?'personal':next===7?'uniques':spec.keys[next-1];}
    function sync(){const game=getGame();if(!game)return;data.bind(game.save);select(game);if(hud!==game.hud.d2){restoreView?.();hud=game.hud.d2;if(hud)restoreView=D2QolStashView.install(hud,core,()=>enabled);}}
    function check(value){const g=getGame(),cursor=spec.keys.indexOf(g?.save?.cursor?.from?.grid)+1;if(!core.d2smm_stash_configure(Number(value),cursor))throw Error('Put down the held item or finish the save import first.');}
    function configure(value){check(value);enabled=value;native.tabs.splice(0,native.tabs.length,...originalTabs,...value?data.keys:[]);sync();const g=getGame();if(g?.trade)g.showTown();else if(g?.state==='character')g.openCharacter(g.characterReturn,g.kit.id);changed();}
    // Save guards outlive the UI lease, so unloading/replacing Mod Manager
    // cannot produce a vanilla backup that silently drops nonempty extra tabs.
    return Object.freeze({version:1,Game:native.Game,evidence:native.evidence,admit,check,configure,sync,
      attach(options){getGame=options.getGame;changed=options.onChange;if(!restores.length)installHooks();sync();},release(){configure(false);for(const restore of restores.reverse())restore();restores=[];getGame=()=>null;changed=()=>{};restoreView?.();restoreView=null;hud=null;},status:()=>({enabled,connected:true,evidence:native.evidence,importing:transfer.busy()})});
  }
  function create({getGame,onChange=()=>{},connectGame=()=>D2GameContract.connect()}){
    let bridge=null,pending=null,closed=false,enabled=false,problem='';
    function fail(error){problem=error.message;console.warn('[Shared stash]',error);onChange();}
    async function connect(){if(closed||bridge||pending||problem)return;pending=(async()=>{
      const contract=await connectGame();if(!contract||closed)return;
      if(globalThis.D2SharedStashProtection){bridge=globalThis.D2SharedStashProtection;if(bridge.version!==1||bridge.Game!==contract.Game)throw Error('Reload before upgrading Shared storage');}
      else{const native=await D2QolStashNative.prepare(contract),core=await D2ManagerNative.create();if(closed)return;bridge=protection(native,core);globalThis.D2SharedStashProtection=bridge;}
      bridge.attach({getGame,onChange});bridge.configure(enabled);onChange();
    })().catch(fail).finally(()=>pending=null);await pending;}
    const timer=setInterval(()=>{void connect();if(bridge&&!problem)try{bridge.sync();}catch(error){fail(error);}},500),ready=connect();
    return Object.freeze({ready,check:value=>{if(value&&problem)throw Error(problem);if(value&&!bridge)throw Error('Shared storage is still loading');bridge?.check(value);},configure(value){enabled=value;bridge?.configure(value);void connect();},status:()=>({enabled,connected:!!bridge,problem,...bridge?.status()}),async dispose(){closed=true;clearInterval(timer);if(pending)await pending;bridge?.release();}});
  }
  globalThis.D2QolStash=Object.freeze({create});
})();
