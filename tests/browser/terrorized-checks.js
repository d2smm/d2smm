// Controlled UI receivers exercise the shipped C++ policy and browser adapter.
// They never write a native save or start an actual game run.
(async()=>{
  const before=localStorage.getItem('d2-survivors/save/v1'),origin=performance.timeOrigin;
  const checks=[],starts=[],check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name);};
  class Receiver{
    constructor(){this.state='dead';this.runId=7;this.whose='hero';this.kit={id:'amazon'};this.world={act:1,terror:{tier:25}};this.tierDone={tier:25,open:26};this.save={heroes:{amazon:{kept:{}}},terror:{amazon:{cleared:25,open:26}}};this.frontend={surface:{screen:{ending:true}},hide(){this.surface.screen=null;}};}
    startReplay(){}
    showTierCleared(){this.state='dead';this.originalWays=[{label:'NEXT TIER',run:()=>{this.tierDone=null;}},{label:"CHARSI'S WARES",key:'town',run:()=>{this.state='town';}},{label:'END THE RUN',key:'menu',run:()=>{this.tierDone=null;this.state='select';}}];this.showEnding({victory:true,ways:this.originalWays});}
    showEnding(view){this.model=view;this.frontend.surface.screen={ending:true};this.buttons=view.ways.map(way=>({...way,run:()=>{this.frontend.hide();way.run();}}));}
  }
  const game=new Receiver();let current=game;
  const original={showEnding:Receiver.prototype.showEnding,showTierCleared:Receiver.prototype.showTierCleared,startReplay:Receiver.prototype.startReplay},hide=game.frontend.hide;
  const native={Game:Receiver,original,actCount:5,progress:(s,c)=>s.terror[c],kept:(s,c)=>s.heroes[c].kept,isEnding:s=>!!s?.ending,
    replay(g,tier,act){starts.push({tier,act,open:g.save.terror.amazon.open});g.tierDone=null;g.state='loading';return Promise.resolve();},evidence:{controlled:true}};
  const bridge=D2Terrorized.create({getGame:()=>current,connectGame:async()=>({Game:Receiver}),prepare:async()=>native});
  const reset=()=>{current=game;game.state='dead';game.world={act:1,terror:{tier:25}};game.tierDone={tier:25,open:26};game.showTierCleared();};
  try{
    await bridge.ready;
    check('Controller connects',bridge.status().connected&&!bridge.status().problem);
    check('RERUN is first',game.model.ways[0].label==='RERUN');
    check('Original choices and callbacks are retained',game.model.ways.slice(1).every((row,i)=>row===game.originalWays[i]));
    check('Original ways array is untouched',game.originalWays.length===3&&game.originalWays[0].label==='NEXT TIER');
    check('Enter hint describes rerun',game.model.hint.startsWith('Enter: rerun'));
    const twice=game.buttons[0].run;twice();twice();
    check('Native hide-before-action still starts once',starts.length===1);
    check('Completed 25 Act II is used despite open 26',starts[0].tier===25&&starts[0].act===1&&starts[0].open===26);
    reset();const oldWorld=game.buttons[0].run;game.world={act:1,terror:{tier:25}};oldWorld();
    check('Replaced world rejects a stale callback',starts.length===1);
    reset();const oldScreen=game.buttons[0].run;game.frontend.surface.screen={other:true};game.frontend.hide();oldScreen();
    check('Another dismissed screen does not authorize rerun',starts.length===1);
    reset();const disabled=game.buttons[0].run;bridge.configure(false);
    check('Disabling restores the native choices',game.model.ways.length===3&&game.model.ways[0].label==='NEXT TIER');
    disabled();check('Disabled callback cannot start',starts.length===1);
    game.showTierCleared();bridge.configure(true);
    check('Re-enabling restores RERUN in the current ending',game.model.ways[0].label==='RERUN');
    game.buttons[2].run();check('Charsi remains the native action',game.state==='town'&&starts.length===1);
    reset();game.save.terror.amazon.playing=0;game.showTierCleared();
    check('An active native Terror is never abandoned by the mod',game.model.ways[0].label==='NEXT TIER'&&starts.length===1);delete game.save.terror.amazon.playing;
    reset();game.world.terror.cow=true;game.showTierCleared();check('Unsupported Cow replay preserves the native menu',game.model.ways[0].label==='NEXT TIER');
    reset();game.tierDone=null;game.world.terror=null;game.showEnding({victory:true,ways:[{label:'CONTINUE',run(){}}]});
    check('Ordinary endings are untouched',game.model.ways.length===1&&game.model.ways[0].label==='CONTINUE');
    reset();const own=Receiver.prototype.showEnding,foreign=function(...args){return own.apply(this,args);};Receiver.prototype.showEnding=foreign;
    await bridge.dispose();
    check('Disposal preserves another wrapper',Receiver.prototype.showEnding===foreign);
    check('Disposal restores owned lifecycle hooks',Receiver.prototype.showTierCleared===original.showTierCleared&&game.frontend.hide===hide);
    check('Disposal removes RERUN from the owned screen',game.model.ways[0].label==='NEXT TIER');
    check('Native save bytes and page identity are unchanged',localStorage.getItem('d2-survivors/save/v1')===before&&performance.timeOrigin===origin);
    return{passed:true,checks,starts};
  }finally{await bridge.dispose();}
})()
