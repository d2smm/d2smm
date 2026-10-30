// The native UI supplies context and visibility; the shared ledger supplies
// unread state. Each dot is a child of its actual control and scales with it.
(() => {
  'use strict';
  function create({getGame,badges,onChange=()=>{}}){
    let closed=false,connected=false,pending=null,problem='',restore=null,currentContext='',observedPanel=null;
    const contexts=new WeakMap(),view=D2ControlBadgeView.create();
    function refresh(){
      if(closed)return;const game=getGame(),hud=game?.hud,panel=hud?.character;
      if(panel!==observedPanel){observer.disconnect();observedPanel=panel;if(panel)observer.observe(panel,{attributes:true,attributeFilter:['class','style','aria-expanded'],subtree:true,childList:true});}
      const panelVisible=!!panel?.getClientRects().length;
      const own=!!panel&&!panel.classList.contains('inspecting')&&!panel.classList.contains('merc'),context=own?(contexts.get(game)??(!panelVisible?game.world?.player?.cls??'':'')):'';
      if(currentContext&&currentContext!==context)badges.observe('charms',currentContext,false);currentContext=context;
      const target=panel?.querySelector('#charm-panel'),open=!!context&&!!target?.getClientRects().length&&!!panel.getClientRects().length;
      if(context)badges.observe('charms',context,open);
      view.update('charms',hud?.d2?.charmsButtons??[],!!context&&badges.unread('charms',context));
    }
    function failed(error){if(closed)return;problem=error.message;console.warn('[D2SMM] Charms notification target',error);onChange();}
    function safeRefresh(){if(closed||problem)return;try{refresh();}catch(error){failed(error);}}
    async function connect(){
      if(closed||connected||pending||problem)return;
      pending=(async()=>{const contract=await D2GameContract.connect();if(!contract||closed)return;const base=await D2GameContract.analyze(contract.url);const ast=base.method('openCharacter');if(ast.params.length!==2||ast.params[1].type!=='AssignmentPattern')throw Error('Native character context changed');
        if(closed)return;const p=base.Game.prototype,original=p.openCharacter;const wrapper=function(...args){const result=original.apply(this,args);contexts.set(this,args[1]===undefined?this.kit?.id:args[1]);safeRefresh();return result;};p.openCharacter=wrapper;restore=()=>{if(p.openCharacter===wrapper)p.openCharacter=original;};connected=true;safeRefresh();onChange();
      })().catch(failed).finally(()=>pending=null);await pending;
    }
    const observer=new MutationObserver(safeRefresh),timer=setInterval(()=>{void connect();safeRefresh();},250);
    void connect();
    return Object.freeze({refresh:safeRefresh,refreshContent(game,cls){if(!closed&&game===getGame()&&game.state==='character'&&currentContext===cls&&!game.hud.character.classList.contains('inspecting'))game.openCharacter(game.characterReturn,cls);safeRefresh();},isReady:()=>connected&&!closed&&!problem,status:()=>({connected,problem,context:currentContext}),async dispose(){closed=true;clearInterval(timer);observer.disconnect();if(pending)await pending;restore?.();if(currentContext)badges.observe('charms',currentContext,false);view.dispose();}});
  }
  globalThis.D2NativeControlBadges=Object.freeze({create});
})();
