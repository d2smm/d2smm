// Browser object lifetimes and native presentation only. C++ owns admission,
// ring geometry, ordering, timing, cancellation and per-portal consumption.
(() => {
  'use strict';
  function create({core,getGame,onChange,connectGame}){
    let enabled=false,chests=false,closed=false,native=null,pending=null,problem='',world=null,portal=null,refs=[],nextId=0,restore=null;
    const ids=new WeakMap(),flags=D2TerrorizedKernel.gatherFlags,drops=D2TerrorizedKernel.dropFlags,kinds=D2TerrorizedKernel.dropKinds;
    const bits=(values,map)=>Object.entries(values).reduce((n,[k,v])=>n|(v?map[k]:0),0);
    function stop(){core.gather_cancel();refs=[];world=null;portal=null;}
    function fail(error){stop();problem=error.message;console.warn('[Terrorized] gathering unavailable',error);onChange();}
    function reconcile(){const g=getGame();if(world&&(g?.world!==world||g?.clearing?.portal!==portal||g?.state==='dead'))stop();}
    function dropFacts(p,w){return bits({dead:!!p.dead,magnet:!!p.magnet,discarded:!!p.discarded,reaching:w.reaching===p,noSprite:!p.sprite||!!p.sprite.destroyed},drops);}
    function frame(game){
      if(closed||!(enabled||chests)||problem||getGame()!==game)return;
      reconcile();const w=game.world,c=game.clearing,gate=c?.portal;
      if(gate&&!ids.has(gate))ids.set(gate,++nextId);
      const facts=bits({gatherEnabled:enabled,gatherChests:chests,terror:!!w?.terror,playing:game.state==='playing',portal:!!gate,bossWon:game.won?.kind==='tier',gatherTraining:!!game.training||!!w?.training,timeUp:!!c?.timeUp,gatherDebug:!!game.terrorDebug},flags);
      const action=core.gather_observe(gate?ids.get(gate):0,w?.time,w?.player?.x,w?.player?.y,w?.view?.halfW,w?.view?.halfH,w?.player?.radius,w?.player?.pickupRadius,facts);
      if(!action)return;
      if(action===1){
        if(typeof w.clearOfProps!=='function'||!Array.isArray(w.pickups))throw Error('Native ground placement is unavailable');
        world=w;portal=gate;refs=[];
        for(const p of w.pickups){const slot=core.gather_add(p.x,p.y,kinds[p.kind]??0,dropFacts(p,w));if(slot)refs.push({slot,p});}
        if(!core.gather_layout()){refs=[];return;}
        for(const{slot}of refs){const point=w.clearOfProps(core.gather_ideal_x(slot),core.gather_ideal_y(slot),4,w.player);core.gather_target(slot,point?.x,point?.y);}
      }
      const present=new Set(w.pickups);
      for(const{slot,p}of refs)if(!present.has(p)||dropFacts(p,w))core.gather_release(slot);
      if(!core.gather_advance(w.time)){refs=[];return;}
      native.begin();for(const{slot,p}of refs)if(core.gather_moving(slot))native.move(w,p,core.gather_x(slot),core.gather_y(slot));native.finish(game);
      if(core.gather_phase()===3)refs=[];
    }
    async function connect(){
      if(closed||!(enabled||chests)||native||pending||problem)return;
      pending=(async()=>{const contract=await connectGame();if(!contract||closed)return;const candidate=await D2GatherNative.prepare(contract);if(closed)return;
        const p=candidate.Game.prototype,original=candidate.original.waitForPortal;
        if(p.waitForPortal!==original||!Object.getOwnPropertyDescriptor(p,'waitForPortal')?.writable)throw Error('Native portal hook changed');
        const wrapper=function(...args){const result=original.apply(this,args);try{frame(this);}catch(error){fail(error);}return result;};
        native=candidate;p.waitForPortal=wrapper;restore=()=>{if(p.waitForPortal===wrapper)p.waitForPortal=original;};onChange();
      })().catch(fail).finally(()=>pending=null);await pending;
    }
    return Object.freeze({
      configure(value,chestValue){enabled=value;chests=chestValue;if(!(enabled||chests))stop();void connect();},
      reconcile(){reconcile();void connect();},
      status:()=>({enabled,chests,connected:!!native,problem,phase:core.gather_phase(),count:core.gather_count(),radius:core.gather_radius(),evidence:native?.evidence??null}),
      async dispose(){closed=true;enabled=false;stop();if(pending)await pending;restore?.();}
    });
  }
  globalThis.D2Gather=Object.freeze({create});
})();
