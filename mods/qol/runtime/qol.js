(() => {
  'use strict';
  function create({getGame,coreReady,badges,controls,onChange=()=>{},connectGame=()=>D2GameContract.connect(),prepare=D2QolNative.prepare}){
    let enabled=true,closed=false,core=null,native=null,pending=null,source=null,restore=null,problem='';
    const flags=D2ManagerKernel.qolFlags;
    const ready=Promise.all([coreReady,badges.ready]).then(([value])=>{core=value;if(badges.isReady())source=badges.source('qol');else throw Error('Unread notifications are unavailable');return connect();}).catch(fail);
    function fail(error){if(closed)return;problem=error.message;console.warn('[QoL] charm placement unavailable',error);onChange();}
    function afterCarry(game,item,result,world,cls){
      const values={enabled,pickedUp:result===true,sameWorld:game.world===world,sameClass:world?.player?.cls===cls&&game.kit?.id===cls,cursorClear:!game.save.cursor,nativeAllowed:native.rule(game.save,cls,item)===null,notificationsReady:badges.isReady()&&controls.isReady(),notSwapping:!game.swapping};
      const bits=Object.entries(values).reduce((n,[key,value])=>n|(value?flags[key]:0),0);
      if(!core.d2smm_qol_candidate(bits))return;
      const bag=game.inventoryOf(cls),charms=native.charms(game.save,cls),at=native.space(charms,item),bagCount=bag.length,charmCount=charms.length;
      const copies=list=>list.reduce((n,value)=>n+Number(value.id===item.id),0);
      if(!core.d2smm_qol_admit(copies(bag),copies(charms),bagCount,charmCount,at?.x,at?.y,native.dimensions.columns,native.dimensions.rows,bits))return;
      native.move(game,cls,item,()=>controls.refreshContent(game,cls));
      const afterBag=game.inventoryOf(cls),afterCharms=native.charms(game.save,cls);
      if(!core.d2smm_qol_transferred(bagCount,charmCount,afterBag.length,afterCharms.length,copies(afterBag),copies(afterCharms),Number(afterCharms.includes(item))))throw Error('Native charm transfer could not be confirmed');
      controls.refresh();void source.markUnread('charms',cls).catch(fail);
    }
    async function connect(){
      if(closed||!enabled||!core||!source||native||pending||problem)return;
      pending=(async()=>{const contract=await connectGame();if(!contract||closed)return;const candidate=await prepare(contract);if(closed)return;
        const p=candidate.Game.prototype,original=candidate.original.carry;if(p.carry!==original||!Object.getOwnPropertyDescriptor(p,'carry')?.writable)throw Error('Native pickup ownership changed');
        const wrapper=function(item,...rest){const world=this.world,cls=world?.player?.cls,result=original.call(this,item,...rest);if(!closed&&enabled&&!problem&&getGame()===this)try{afterCarry(this,item,result,world,cls);}catch(error){fail(error);}return result;};
        native=candidate;p.carry=wrapper;restore=()=>{if(p.carry===wrapper)p.carry=original;};onChange();
      })().catch(fail).finally(()=>pending=null);await pending;
    }
    const observer=new PerformanceObserver(()=>void connect());observer.observe({type:'resource',buffered:true});
    const timer=setInterval(()=>void connect(),500);
    return Object.freeze({ready,configure(value){if(typeof value!=='boolean')throw Error('Invalid QoL setting');enabled=value;void connect();onChange();},status:()=>({enabled,connected:!!native,problem,evidence:native?.evidence??null}),async dispose(){if(closed)return;closed=true;observer.disconnect();clearInterval(timer);await ready;if(pending)await pending;restore?.();source?.dispose();}});
  }
  globalThis.D2Qol=Object.freeze({create});
})();
