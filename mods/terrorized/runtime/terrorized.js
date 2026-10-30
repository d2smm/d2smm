// Native presentation and browser bindings. Eligibility, offer generations,
// exact tier/act selection and single-use admission belong to the C++ kernel.
(() => {
  'use strict';
  function create({getGame,onChange=()=>{},notify=()=>{},connectGame=()=>D2GameContract.connect(),prepare=D2TerrorizedNative.prepare}){
    let enabled=true,gatherEnabled=false,gatherChests=false,gather=null,closed=false,core=null,native=null,pending=null,problem='',shown=null;
    const scope=new WeakSet(),patches=[],frontends=new Map(),flags=D2TerrorizedKernel.flags;
    const ready=Promise.resolve().then(()=>WebAssembly.instantiate(Uint8Array.from(atob(D2TerrorizedKernel.wasm),c=>c.charCodeAt(0)),{math:{sin:Math.sin,cos:Math.cos,atan2:Math.atan2}})).then(r=>{core=r.instance.exports;if(['offer','begin','invalidate','tier','act'].some(name=>typeof core['terrorized_'+name]!=='function'))throw Error('Terrorized core is unavailable');gather=D2Gather.create({core,getGame,onChange,connectGame});gather.configure(enabled&&gatherEnabled,enabled&&gatherChests);return connect();}).catch(error=>{problem=error.message;console.warn('[Terrorized] unavailable',error);onChange();});
    function trackFrontend(frontend){
      if(!frontend)return null;if(frontends.has(frontend))return frontends.get(frontend);
      const original=frontend.hide,descriptor=Object.getOwnPropertyDescriptor(frontend,'hide');if(typeof original!=='function')throw Error('Native ending dismissal changed');
      const record={lastHidden:null,wrapper:null};record.wrapper=function(...args){record.lastHidden=this.surface?.screen;return original.apply(this,args);};frontend.hide=record.wrapper;frontends.set(frontend,record);
      patches.push(()=>{if(frontend.hide===record.wrapper)descriptor?Object.defineProperty(frontend,'hide',descriptor):delete frontend.hide;});return record;
    }
    function facts(game,info,inCompletion){
      const world=game.world,done=game.tierDone,progress=native.progress(game.save,game.kit?.id);
      const values=[done?.tier,world?.terror?.tier,world?.act,native.actCount,progress?.cleared];
      const raw={enabled,victory:info?.victory===true,currentHero:game.whose==='hero',keptHero:!!native.kept(game.save,game.kit?.id),debug:!!game.terrorDebug,training:!!game.training,cow:!!world?.terror?.cow,activeRun:progress?.playing!==undefined||progress?.replay!==undefined,completion:inCompletion,numericFacts:values.every(v=>typeof v==='number')};
      return [...values.map(v=>typeof v==='number'?v:NaN),Object.entries(raw).reduce((bits,[name,value])=>bits|(value?flags[name]:0),0)];
    }
    function refresh(){
      if(closed||!native||!core)return;const game=getGame();
      if(!game||game.state!=='dead'||!game.tierDone||!game.world?.terror||!native.isEnding(game.frontend?.surface?.screen))return;
      if(shown?.game===game&&shown.world===game.world&&shown.done===game.tierDone&&shown.screen===game.frontend.surface.screen&&shown.enabled===enabled)return;
      game.showTierCleared();
    }
    function install(){
      const p=native.Game.prototype;
      for(const name of ['showTierCleared','showEnding'])if(p[name]!==native.original[name]||!Object.getOwnPropertyDescriptor(p,name)?.writable)throw Error('Native ending ownership changed');
      const cleared=function(...args){if(closed)return native.original.showTierCleared.apply(this,args);core.terrorized_invalidate();scope.add(this);try{return native.original.showTierCleared.apply(this,args);}finally{scope.delete(this);}};
      const ending=function(info,actions,...rest){
        if(closed||!scope.has(this))return native.original.showEnding.call(this,info,actions,...rest);
        const game=this;let ticket=0,frontend=null;
        try{frontend=trackFrontend(game.frontend);ticket=core.terrorized_offer(...facts(game,info,true));}catch(error){core.terrorized_invalidate();problem=error.message;console.warn('[Terrorized] ending',error);}
        const token={game,world:game.world,runId:game.runId,done:game.tierDone,kit:game.kit,info,screen:null,enabled,ticket};
        let view=info;
        if(ticket&&Array.isArray(info.ways)){
          const rerun=()=>{
            const screen=game.frontend?.surface?.screen;
            const same=!closed&&getGame()===game&&game.world===token.world&&game.runId===token.runId&&game.tierDone===token.done&&game.kit===token.kit&&game.state==='dead'&&(screen===token.screen||screen===null&&frontend?.lastHidden===token.screen);
            if(!core.terrorized_begin(ticket,...facts(game,info,true),Number(same)))return;
            const tier=core.terrorized_tier(),act=core.terrorized_act();
            try{Promise.resolve(native.replay(game,tier,act)).catch(error=>{console.warn('[Terrorized] replay',error);if(!closed)notify('Unable to rerun this Terror.');});}
            catch(error){console.warn('[Terrorized] replay',error);notify('Unable to rerun this Terror.');}
          };
          view={...info,ways:[{label:'RERUN',run:rerun},...info.ways],hint:"Enter: rerun - T: Charsi's wares - Esc: end the run"};
        }
        const result=native.original.showEnding.call(game,view,actions,...rest);token.screen=game.frontend?.surface?.screen;shown=token;onChange();return result;
      };
      for(const [name,wrapper]of [['showTierCleared',cleared],['showEnding',ending]]){const original=p[name];p[name]=wrapper;patches.push(()=>{if(p[name]===wrapper)p[name]=original;});}
    }
    async function connect(){
      if(closed||!enabled||!core||native||pending||problem)return;
      pending=(async()=>{const contract=await connectGame();if(!contract||closed)return;const candidate=await prepare(contract);if(closed)return;native=candidate;install();refresh();onChange();})().catch(error=>{if(!closed){problem=error.message;console.warn('[Terrorized] unavailable',error);onChange();}}).finally(()=>pending=null);
      await pending;
    }
    const observer=new PerformanceObserver(()=>void connect());observer.observe({type:'resource',buffered:true});
    const timer=setInterval(()=>{void connect();try{refresh();gather?.reconcile();}catch(error){if(problem!==error.message){problem=error.message;console.warn('[Terrorized] observation',error);onChange();}}},500);
    return Object.freeze({ready,
      configure(value,gatherValue=true,chestValue=false){if(typeof value!=='boolean'||typeof gatherValue!=='boolean'||typeof chestValue!=='boolean')throw Error('Invalid Terrorized setting');enabled=value;gatherEnabled=gatherValue;gatherChests=chestValue;gather?.configure(enabled&&gatherEnabled,enabled&&gatherChests);core?.terrorized_invalidate();if(core&&!native&&enabled)problem='';void connect();if(shown)shown.enabled=!enabled;refresh();onChange();},
      status:()=>({enabled,connected:!!native,problem,evidence:native?.evidence??null,gather:gather?.status()??null}),
      async dispose(){if(closed)return;closed=true;core?.terrorized_invalidate();observer.disconnect();clearInterval(timer);await gather?.dispose();if(pending)await pending;patches.reverse().forEach(fn=>fn());const game=shown?.game;if(game&&game.state==='dead'&&game.frontend?.surface?.screen===shown.screen)native.original.showTierCleared.call(game);shown=null;}
    });
  }
  globalThis.D2Terrorized=Object.freeze({create});
})();
