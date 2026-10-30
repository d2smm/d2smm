// Actual integration/core modules with an isolated native boundary. No player save is used.
async function checkBuiltinHooks(coreSource,integrationSource){
  const frame=document.createElement('iframe');frame.hidden=true;document.body.append(frame);const w=frame.contentWindow;
  const checks=[],check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);};
  const rejected=async(name,fn)=>{let failed=false;try{await fn();}catch(error){failed=true;}check(name,failed);};
  const before=localStorage.getItem('d2-survivors/save/v1');
  try{
    w.eval(coreSource);
    const ring={id:'activation-ring',name:'Beast Loop',base:'Ring',rarity:'rare',type:'ring',mods:[]};
    const vault={...ring,id:'activation-vault-ring'};
    const save={mode:'sc',heroes:{amazon:{kept:{run:{level:99},build:{skills:[]}}}},equippedByClass:{amazon:{ring1:ring}},inventoryByClass:{amazon:[]},stashTabs:{amazon:[],shared1:[]},retired:{}};
    const meta={revision:4,pending:null,classes:{amazon:w.D2CharacterCore.enable(save,'amazon',{camp:true,inRun:false,swapping:false},['hero-one',1,2,3])}};
    save.stashTabs.amazon.push(vault);meta.classes.amazon.loadouts[1].items.ring1=vault.id;
    save.retired.amazon=[{kept:{run:{level:99},build:{skills:[]}},best:8}];
    meta.classes.amazon=w.D2CharacterCore.plan(save,meta.classes.amazon,'amazon',{kind:'adopt',index:0,id:'hero-two'},{camp:true,inRun:false,swapping:false},{}).meta;
    const saved=JSON.stringify(save),metadata=JSON.stringify(meta),calls={nativeSelect:0,stash:0,put:0,sell:0,akara:0,perform:[],disposed:false};
    let busy=false,open=false,section='characters',shown=0;
    class NativeBoundary{
      tick(){} swapHero(cls){calls.nativeSelect++;this.kit.id=cls;} openAkara(){calls.akara++;}
      restandHero(){} openStashTab(){return 'shared1';} dropHeld(){} discardHeld(){}
      gearActions(){return{openStashTab:()=>calls.stash++,toStash:()=>calls.stash++,fromStash:()=>calls.stash++,putDown:()=>calls.put++,sell:()=>calls.sell++};}
    }
    const original=NativeBoundary.prototype.swapHero;
    w.D2CharacterStore={create:()=>({})};
    w.D2CharacterController={create:()=>({ready:Promise.resolve(),metadata:()=>meta,busy:()=>busy,
      context:g=>({camp:!!g?.camp&&g.state==='camp',inRun:false,swapping:false}),
      perform:async(cls,action)=>{calls.perform.push({cls,action});return meta;},dispose:async()=>{calls.disposed=true;}})};
    w.D2GameContract={connect:async()=>({Game:NativeBoundary,characters:{}})};
    w.D2CharacterView={create:()=>({show:options=>{section=options.section;open=true;shown++;},paint:()=>{},isOpen:()=>open,section:()=>section,close:()=>{open=false;},dispose:()=>{open=false;}})};
    w.eval(integrationSource);await w.D2Characters.ready;
    const g=new NativeBoundary();Object.assign(g,{save,kit:{id:'amazon'},camp:true,state:'camp',swapping:false,hud:{refuse:message=>{g.refusal=message;}}});g.tick();
    g.swapHero('amazon');check('Feature hooks stay inert until settings load',calls.nativeSelect===1&&!open);
    w.D2Characters.configureFeatures({characters:true,gearLoadouts:true});g.swapHero('amazon');check('Enabled Characters opens the level-99 chooser',open&&section==='characters'&&calls.nativeSelect===1);
    w.D2Characters.configureFeatures({characters:false,gearLoadouts:true});check('Disabling Characters closes only its view',!open);
    g.swapHero('amazon');check('Disabled Characters restores native class selection',calls.nativeSelect===2&&!open);
    await rejected('Disabled character commands never reach the controller',()=>w.D2Characters.perform('amazon',{kind:'new'}));
    w.D2Characters.show({classId:'amazon',section:'gear'});check('Gear Loadouts stays independently available',open&&section==='gear');
    w.D2Characters.configureFeatures({characters:true,gearLoadouts:false});check('Disabling Gear Loadouts closes its view',!open);
    await rejected('Disabled gear commands never reach the controller',()=>w.D2Characters.perform('amazon',{kind:'equip',loadout:1}));
    await w.D2Characters.perform('amazon',{kind:'new'});check('Characters retains its shared transaction while manual loadouts are off',calls.perform.length===1&&calls.perform[0].action.kind==='new');
    await rejected('Disabled loadout view cannot be opened directly',()=>w.D2Characters.show({section:'gear'}));
    const a=g.gearActions('amazon'),count=shown;a.openStashTab('personal');check('Disabled loadout entry does not expose a reserved vault',shown===count&&!!g.refusal);
    a.openStashTab('shared1');a.toStash(ring);check('Shared stash actions remain available',calls.stash===2);
    g.save.cursor={item:ring,cls:'amazon'};a.putDown('shared1');a.putDown('personal');a.sell(ring);check('Shared transfers work while reserved gear stays protected',calls.put===1&&calls.sell===0);delete g.save.cursor;
    w.D2Characters.configureFeatures({characters:false,gearLoadouts:false});g.openAkara('restart');check('Retained managed heroes cannot bypass their archive protection',calls.akara===0);
    busy=true;w.D2Characters.configureFeatures({characters:true,gearLoadouts:true});const n=calls.nativeSelect;g.swapHero('amazon');check('In-flight native class callbacks retain their original path',calls.nativeSelect===n+1);
    w.D2Characters.configureFeatures({characters:false,gearLoadouts:false});check('Disabling does not dispose an in-flight shared controller',!calls.disposed);busy=false;
    w.D2Characters.configureFeatures({characters:true,gearLoadouts:true});g.swapHero('amazon');check('Re-enabling restores the chooser',open&&section==='characters');
    check('All synthetic heroes, gear, and metadata are unchanged',JSON.stringify(save)===saved&&JSON.stringify(meta)===metadata);
    check('No native save writes',localStorage.getItem('d2-survivors/save/v1')===before);
    await w.D2Characters.dispose();check('Teardown restores only the owned native boundary',NativeBoundary.prototype.swapHero===original);
    return{passed:true,checks,scope:'Real activation and protection bindings; controlled native receiver, not a save-switch gameplay claim'};
  }finally{await w.D2Characters?.dispose();frame.remove();}
}
