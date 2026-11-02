(() => {
  'use strict';
  function create({getGame,coreReady,onChange=()=>{},connectGame=()=>D2GameContract.connect(),prepare=D2QolCombatNative.prepare}){
    let enabled=false,hideHitStars=false,closed=false,core=null,native=null,motion=null,effects=null,pending=null,restoreUpdate=null,restoreGrid=null,restoreStage=null,restoreRender=null,stageGame=null,world=null,epoch=0,problem='',inEnemies=false,tickDt=0;
    const actors=new Map(),sourceOf=Function.prototype.toString;
    function restoreColors(){for(const r of actors.values())if(!r.sprite.destroyed)r.sprite.tint=r.requested;}
    function clear(){restoreColors();effects?.restore();motion?.clear();actors.clear();core?.d2smm_qol_tint_reset();restoreGrid?.();restoreGrid=null;world=null;}
    function uninstall(){clear();restoreStage?.();restoreStage=null;stageGame=null;restoreRender?.();restoreRender=null;restoreUpdate?.();restoreUpdate=null;}
    function fail(error){problem=error.message;uninstall();console.warn('[QoL] combat adjustments unavailable',error);onChange();}
    function attachWorld(next){
      if(world===next)return;clear();
      if(!next||!Array.isArray(next.enemies)||!next.grid)return;
      const grid=next.grid,original=grid.query,descriptor=Object.getOwnPropertyDescriptor(grid,'query');
      if(typeof original!=='function'||descriptor&&!descriptor.writable||!descriptor&&!Object.isExtensible(grid))throw Error('Spatial query ownership changed');
      const query=function(x,y,r,callback){
        const source=typeof callback==='function'?sourceOf.call(callback):'',kind=source===native.pushCallback?1:0;
        if(!closed&&enabled&&world===next&&!core.d2smm_qol_query_allowed(kind))return;
        if(!closed&&enabled&&inEnemies&&world===next&&source===native.crowd.callback){try{return motion.query(this,original,x,y,r,callback);}catch(error){fail(error);}}
        return original.call(this,x,y,r,callback);
      };
      grid.query=query;world=next;restoreGrid=()=>{if(grid.query===query)descriptor?Object.defineProperty(grid,'query',descriptor):delete grid.query;};
    }
    function track(enemy){
      const sprite=enemy.sprite;let record=actors.get(enemy);
      if(record&&record.sprite!==sprite){core.d2smm_qol_tint_release(record.handle);actors.delete(enemy);record=null;}
      if(!record){const requested=sprite.tint,handle=core.d2smm_qol_tint_open(requested,world.time);if(!handle)throw Error('Monster tracking capacity or format is unsupported');record={handle,sprite,requested,epoch};actors.set(enemy,record);}
      return record;
    }
    function attachStage(game){
      if(stageGame===game)return;restoreStage?.();restoreStage=null;stageGame=null;
      const guard=game.frameGuard,original=guard?.run,descriptor=guard&&Object.getOwnPropertyDescriptor(guard,'run');
      if(typeof original!=='function'||descriptor&&!descriptor.writable||!descriptor&&!Object.isExtensible(guard))throw Error('Enemy stage ownership changed');
      const run=function(name,callback,...args){
        if(name!=='enemies'||closed||!enabled||problem)return original.call(this,name,callback,...args);
        return original.call(this,name,()=>{
          try{attachWorld(game.world);motion.begin(world,tickDt);inEnemies=true;}catch(error){fail(error);return callback();}
          try{const result=callback();if(!problem)try{motion.finish(tickDt);}catch(error){fail(error);}return result;}finally{inEnemies=false;}
        },...args);
      };
      guard.run=run;stageGame=game;restoreStage=()=>{if(guard.run===run)descriptor?Object.defineProperty(guard,'run',descriptor):delete guard.run;};
    }
    function present(){
      ++epoch;
      for(const enemy of world.enemies){
        const sprite=enemy.sprite;if(enemy.dead||enemy.rank==='breakable'||!sprite||sprite.destroyed)continue;
        const record=track(enemy),requested=sprite.tint;
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
        try{tickDt=args[0];attachWorld(this.world);attachStage(this);restoreColors();}catch(error){fail(error);return original.apply(this,args);}
        const result=original.apply(this,args);
        try{if(this.world!==world)attachWorld(this.world);else if(world)present();}catch(error){fail(error);}
        return result;
      };
      const renderOriginal=p.render;
      if(typeof renderOriginal!=='function'||!Object.getOwnPropertyDescriptor(p,'render')?.writable)throw Error('Game render ownership changed');
      const render=function(...args){
        if(!closed&&enabled&&!problem&&getGame()===this)effects.restore();
        const result=renderOriginal.apply(this,args);
        // Native render preparation recalculates every child's renderable flag.
        if(!closed&&enabled&&!problem&&getGame()===this)try{effects.present(this.world);}catch(error){fail(error);}
        return result;
      };
      p.update=update;restoreUpdate=()=>{if(p.update===update)p.update=original;};p.render=render;restoreRender=()=>{if(p.render===render)p.render=renderOriginal;};onChange();
    }
    async function connect(){
      if(closed||!enabled||!core||pending||problem||restoreUpdate)return;
      pending=(async()=>{if(!native){const contract=await connectGame();if(!contract||closed)return;native=await prepare(contract);motion=D2QolMotion.create({core,native:native.crowd,track});effects=D2QolEffects.create({core,profile:native.crowd.hitFlash});}if(!closed&&enabled)install();})().catch(fail).finally(()=>pending=null);
      await pending;
    }
    const ready=coreReady.then(value=>{core=value;for(const name of ['combat_configure','query_allowed','tint_reset','tint_open','tint','tint_release','effect_visible','effect_profile','effect_begin','effect_part','effect_end','motion_observe','motion_begin','motion_neighbor','motion_coordinate','motion_idle','motion_finish','motion_frame','motion_prop','motion_needs_route','motion_geometry_begin','motion_pose','motion_resolve','motion_guided','motion_velocity','motion_walk_phase','navigation_count'])if(typeof core['d2smm_qol_'+name]!=='function')throw Error('Combat policy exports are unavailable');core.d2smm_qol_combat_configure(Number(enabled),Number(hideHitStars));return connect();}).catch(fail);
    return Object.freeze({ready,connect,configure(value,hideStars){enabled=value;hideHitStars=hideStars;core?.d2smm_qol_combat_configure(Number(value),Number(hideStars));effects?.restore();if(!value)uninstall();else void connect();},status:()=>({enabled,hideHitStars,connected:!!restoreUpdate,problem,evidence:native?.evidence??null,tracked:actors.size,navigation:motion?.status()??null}),async dispose(){closed=true;uninstall();await ready;if(pending)await pending;uninstall();}});
  }
  globalThis.D2QolCombat=Object.freeze({create});
})();
