// Browser object lifetimes and native presentation only. C++ owns admission,
// ring geometry, ordering, timing, cancellation and per-portal consumption.
(() => {
  'use strict';
  function create({core,getGame,onChange,connectGame}){
    let enabled=false,chests=false,closed=false,native=null,pending=null,problem='',world=null,portal=null,hero=null,owner=null,runId=null,refs=[],nextId=0,restore=null;
    const ids=new WeakMap(),flags=D2TerrorizedKernel.gatherFlags,drops=D2TerrorizedKernel.dropFlags,kinds=D2TerrorizedKernel.dropKinds;
    let opened=null;
    const bits=(values,map)=>Object.entries(values).reduce((n,[k,v])=>n|(v?map[k]:0),0);
    function stop(){core.gather_cancel();refs=[];world=null;portal=null;hero=null;owner=null;runId=null;}
    function fail(error){stop();problem=error.message;console.warn('[Terrorized] gathering unavailable',error);onChange();}
    function reconcile(){const g=getGame();if(world&&(g!==owner||g?.world!==world||g?.world?.player!==hero||g?.runId!==runId||g?.clearing?.portal!==portal||['dead','loading','travel'].includes(g?.state)))stop();}
    function dropFacts(p,w){return bits({dead:!!p.dead,magnet:!!p.magnet,discarded:!!p.discarded,reaching:w.reaching===p,noSprite:!p.sprite||!!p.sprite.destroyed,airborne:!!p.flippy,hidden:p.loot==='hide'},drops);}
    function movePending(game,w){native.begin();for(const{slot,p}of refs)if(core.gather_pickup_pending(slot)){native.move(w,p,core.gather_x(slot),core.gather_y(slot));if(!core.gather_deposit(slot,p.x,p.y))throw Error('Native pickup deposit could not be confirmed');}native.finish(game);}
    function targets(w){for(const{slot}of refs)if(core.gather_moving(slot)){const point=w.clearOfProps(core.gather_ideal_x(slot),core.gather_ideal_y(slot),4,w.player);core.gather_target(slot,point?.x,point?.y);}}
    function observationFacts(game){
      return bits({gatherEnabled:enabled,gatherChests:chests,terror:!!game.world?.terror,playing:game.state==='playing',
        portal:!!game.clearing?.portal,bossWon:game.won?.kind==='tier',gatherTraining:!!game.training||!!game.world?.training,
        timeUp:!!game.clearing?.timeUp,gatherDebug:!!game.terrorDebug,gatherFrameFailed:game.frameGuard?.failed!==false},flags);
    }
    function openVictoryRewards(game){
      if(closed||problem||!game.clearing||!game.won||getGame()!==game)return;
      if(!ids.has(game.won))ids.set(game.won,++nextId);
      if(!core.gather_claim_opening(ids.get(game.won),observationFacts(game)))return;
      opened=native.openRewards(game,obj=>core.gather_open_target(!!obj.dead,!obj.sprite||!!obj.sprite.destroyed,
        obj.kind==='chest',obj.rank==='breakable',obj.type==='gem',obj.mode==='NU'));
    }
    function frame(game){
      if(closed||!(enabled||chests)||problem||getGame()!==game)return;
      reconcile();const w=game.world,c=game.clearing,gate=c?.portal;
      if(gate&&!ids.has(gate))ids.set(gate,++nextId);
      if(typeof game.frameGuard?.failed!=='boolean')throw Error('Native pickup frame status is unavailable');
      const facts=observationFacts(game);
      const action=core.gather_observe(gate?ids.get(gate):0,w?.time,w?.player?.x,w?.player?.y,w?.view?.halfW,w?.view?.halfH,w?.player?.radius,w?.player?.pickupRadius,native.evidence.itemRadiusMargin,facts);
      if(!action){if(!core.gather_phase())refs=[];return;}
      if(action===1){
        if(typeof w.clearOfProps!=='function'||!Array.isArray(w.pickups))throw Error('Native ground placement is unavailable');
        world=w;portal=gate;hero=w.player;owner=game;runId=game.runId;refs=[];
        for(const p of w.pickups){const slot=core.gather_add(p.x,p.y,kinds[p.kind]??0,dropFacts(p,w));if(slot)refs.push({slot,p});}
        if(!core.gather_layout()){refs=[];return;}
        if(core.gather_phase()===4){movePending(game,w);return;}
        targets(w);
      }
      const present=new Set(w.pickups);
      for(const{slot,p}of refs)if(!present.has(p))core.gather_release(slot);else core.gather_settle(slot,p.x,p.y,dropFacts(p,w));
      if(core.gather_phase()===4){
        if(core.gather_spread(w.time))targets(w);
        else if(core.gather_phase()===4){movePending(game,w);return;}
        else{refs=[];return;}
      }
      if(!core.gather_advance(w.time)){refs=[];return;}
      native.begin();for(const{slot,p}of refs)if(core.gather_moving(slot))native.move(w,p,core.gather_x(slot),core.gather_y(slot));native.finish(game);
      if(core.gather_phase()===3)refs=[];
    }
    async function connect(){
      if(closed||!(enabled||chests)||native||pending||problem)return;
      pending=(async()=>{const contract=await connectGame();if(!contract||closed)return;const candidate=await D2GatherNative.prepare(contract);if(closed)return;
        const p=candidate.Game.prototype,original=candidate.original.waitForPortal;
        if(p.waitForPortal!==original||!Object.getOwnPropertyDescriptor(p,'waitForPortal')?.writable)throw Error('Native portal hook changed');
        const wrapper=function(...args){
          try{openVictoryRewards(this);}catch(error){fail(error);}
          const result=original.apply(this,args);
          try{frame(this);}catch(error){fail(error);}
          return result;
        };
        native=candidate;p.waitForPortal=wrapper;restore=()=>{if(p.waitForPortal===wrapper)p.waitForPortal=original;};onChange();
      })().catch(fail).finally(()=>pending=null);await pending;
    }
    return Object.freeze({
      configure(value,chestValue){enabled=value;chests=chestValue;if(!(enabled||chests))stop();void connect();},
      reconcile(){reconcile();void connect();},
      status:()=>({enabled,chests,connected:!!native,problem,opened,phase:core.gather_phase(),count:core.gather_count(),deposited:core.gather_deposited(),radius:core.gather_radius(),evidence:native?.evidence??null}),
      async dispose(){closed=true;enabled=false;stop();if(pending)await pending;restore?.();}
    });
  }
  globalThis.D2Gather=Object.freeze({create});
})();
