(() => {
  'use strict';
  function create({getGame,coreReady,onChange=()=>{},connectGame=()=>D2GameContract.connect(),prepare=D2QolCombatNative.prepare}){
    let enabled=false,closed=false,core=null,native=null,pending=null,restoreUpdate=null,restoreGrid=null,world=null,epoch=0,problem='';
    const actors=new Map(),sourceOf=Function.prototype.toString;
    function restoreColors(){for(const r of actors.values())if(!r.sprite.destroyed)r.sprite.tint=r.requested;}
    function clear(){restoreColors();actors.clear();core?.d2smm_qol_tint_reset();restoreGrid?.();restoreGrid=null;world=null;}
    function uninstall(){clear();restoreUpdate?.();restoreUpdate=null;}
    function fail(error){problem=error.message;uninstall();console.warn('[QoL] combat adjustments unavailable',error);onChange();}
    function attachWorld(next){
      if(world===next)return;clear();
      if(!next||!Array.isArray(next.enemies)||!next.grid)return;
      const grid=next.grid,original=grid.query,descriptor=Object.getOwnPropertyDescriptor(grid,'query');
      if(typeof original!=='function'||descriptor&&!descriptor.writable||!descriptor&&!Object.isExtensible(grid))throw Error('Spatial query ownership changed');
      const query=function(x,y,r,callback){
        const kind=typeof callback==='function'&&sourceOf.call(callback)===native.pushCallback?1:0;
        if(!closed&&enabled&&world===next&&!core.d2smm_qol_query_allowed(kind))return;
        return original.call(this,x,y,r,callback);
      };
      grid.query=query;world=next;restoreGrid=()=>{if(grid.query===query)descriptor?Object.defineProperty(grid,'query',descriptor):delete grid.query;};
    }
    function present(){
      ++epoch;
      for(const enemy of world.enemies){
        const sprite=enemy.sprite;if(enemy.dead||enemy.rank==='breakable'||!sprite||sprite.destroyed)continue;
        let record=actors.get(enemy);
        if(record&&record.sprite!==sprite){core.d2smm_qol_tint_release(record.handle);actors.delete(enemy);record=null;}
        const requested=sprite.tint;
        if(!record){const handle=core.d2smm_qol_tint_open(requested,world.time);if(!handle)throw Error('Monster tint capacity or format is unsupported');record={handle,sprite,requested,epoch};actors.set(enemy,record);}
        record.requested=requested;record.epoch=epoch;
        const color=core.d2smm_qol_tint(record.handle,requested,world.time);if(color<0)throw Error('Monster tint is invalid');sprite.tint=color;
      }
      for(const[enemy,r]of actors)if(r.epoch!==epoch){core.d2smm_qol_tint_release(r.handle);actors.delete(enemy);}
    }
    function install(){
      if(restoreUpdate||closed||!enabled)return;
      const p=native.Game.prototype,original=native.original;
      if(p.update!==original)throw Error('Game update ownership changed');
      const update=function(...args){
        if(closed||!enabled||problem||getGame()!==this)return original.apply(this,args);
        try{attachWorld(this.world);restoreColors();}catch(error){fail(error);return original.apply(this,args);}
        const result=original.apply(this,args);
        try{if(this.world!==world)attachWorld(this.world);else if(world)present();}catch(error){fail(error);}
        return result;
      };
      p.update=update;restoreUpdate=()=>{if(p.update===update)p.update=original;};onChange();
    }
    async function connect(){
      if(closed||!enabled||!core||pending||problem||restoreUpdate)return;
      pending=(async()=>{if(!native){const contract=await connectGame();if(!contract||closed)return;native=await prepare(contract);}if(!closed&&enabled)install();})().catch(fail).finally(()=>pending=null);
      await pending;
    }
    const ready=coreReady.then(value=>{core=value;for(const name of ['combat_configure','query_allowed','tint_reset','tint_open','tint','tint_release'])if(typeof core['d2smm_qol_'+name]!=='function')throw Error('Combat policy exports are unavailable');core.d2smm_qol_combat_configure(Number(enabled));return connect();}).catch(fail);
    return Object.freeze({ready,connect,configure(value){enabled=value;core?.d2smm_qol_combat_configure(Number(value));if(!value)uninstall();else void connect();},status:()=>({enabled,connected:!!restoreUpdate,problem,evidence:native?.evidence??null,tracked:actors.size}),async dispose(){closed=true;uninstall();await ready;if(pending)await pending;uninstall();}});
  }
  globalThis.D2QolCombat=Object.freeze({create});
})();
