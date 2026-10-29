(() => {
  'use strict';
  // Journal the native-save / mod-metadata boundary. The game supplies its
  // existing save writer and instance; this never calls the save importer.
  function create({db,getGame,getNative,readRaw,changed=()=>{}}){
    const core=D2CharacterCore;
    let metadata={revision:0,classes:{},pending:null},busy=false,closed=false,flight=null;
    const context=g=>({camp:!!g?.camp&&g.state==='camp',inRun:!!g?.inRun,swapping:!!g?.swapping});
    const replace=(target,value)=>{for(const key of Object.keys(target))delete target[key];Object.assign(target,value);};
    async function recover(){
      if(!metadata.pending)return;
      const p=metadata.pending,current=core.body(JSON.parse(readRaw()));
      const normalize=value=>{try{return core.body(JSON.parse(value));}catch(error){console.info('[D2 Characters] unparseable journal identity',error.message);return value;}};
      if(current===normalize(p.after))metadata=await db.finish(metadata.revision,p.id,true);
      else if(current===normalize(p.before))metadata=await db.finish(metadata.revision,p.id,false);
      else throw Error('An interrupted switch differs from the current save. Export backups; no automatic restore will run.');
    }
    const ready=(async()=>{metadata=await db.read();await recover();for(const m of Object.values(metadata.classes))core.validateMeta(m);})();
    async function execute(cls,action){
      await ready;
      if(closed)throw Error('Character manager closed');
      if(busy)throw Error('Wait for the current character operation');
      const api=getNative(),g=getGame();
      if(!api||!g)throw Error('Open the camp before using Characters');
      busy=true;changed();
      try{
        metadata=await db.read();await recover();
        const needsClass=['equip','switch','new','returnUnused'].includes(action.kind);
        if(needsClass&&g.kit?.id!==cls){
          if(!context(g).camp||g.save.cursor)throw Error('Return to camp and put down held items first');
          await g.swapHero(cls);
          if(g.kit?.id!==cls)throw Error('The game could not select this class');
        }
        const beforeRaw=readRaw(),before=core.body(g.save),old=structuredClone(g.save),ctx=context(g);
        if(g.save.mode==='hc')throw Error('Characters and loadouts are available in Softcore only');
        if(core.body(JSON.parse(beforeRaw))!==before)throw Error('The game has unsaved changes. Save normally before switching.');
        let plan;
        if(action.kind==='enable'){
          if(metadata.classes[cls])throw Error('This class already has a gear vault');
          plan={before,after:before,draft:old,meta:core.enable(g.save,cls,ctx,[crypto.randomUUID(),1,2,3]),gameChanged:false};
        }else if(action.kind==='release'){
          if(!ctx.camp||ctx.inRun||ctx.swapping||g.save.cursor)throw Error('Return to camp and put down held items first');
          plan={before,after:before,draft:old,meta:null,gameChanged:false};
        }else{
          let current=metadata.classes[cls];
          if(!current&&action.kind==='new')current=core.enable(g.save,cls,ctx,[crypto.randomUUID(),1,2,3]);
          if(!current)throw Error('Enable loadouts for this class first');
          plan=core.plan(g.save,current,cls,{...action,id:action.id??crypto.randomUUID()},ctx,api);
        }
        const operation={id:crypto.randomUUID(),at:new Date().toISOString(),cls,beforeRaw,before,after:plan.after,meta:plan.meta};
        metadata=await db.prepare(metadata.revision,operation);
        const now=context(g);
        if(getGame()!==g||closed||readRaw()!==beforeRaw||core.body(g.save)!==before||!now.camp||now.inRun||now.swapping||(needsClass&&g.kit?.id!==cls)||g.save.cursor){
          metadata=await db.finish(metadata.revision,operation.id,false);
          throw Error('Game state changed while preparing. Nothing was applied.');
        }
        if(plan.gameChanged){
          // No await between publication to the existing save object and the
          // native writer. Moves were already validated on the candidate.
          replace(g.save,plan.draft);
          let written=false;
          try{written=api.write(g.save,true);}catch(error){console.error('[D2 Characters] native save',error);}
          if(!written){
            if(readRaw()===beforeRaw)replace(g.save,old);
            throw Error('The game could not confirm the switch. Recovery backup retained.');
          }
          if(core.body(JSON.parse(readRaw()))!==plan.after)throw Error('The saved result differs. Recovery backup retained.');
        }
        metadata=await db.finish(metadata.revision,operation.id,true);
        if(plan.gameChanged){
          if(plan.restand)await g.restandHero();
          else{g.refreshGear();g.fitBelt();await g.dressHero();}
          g.refilter();
        }
        return metadata;
      }finally{busy=false;changed();}
    }
    function perform(cls,action){if(flight)return Promise.reject(Error('Wait for the current character operation'));const op=execute(cls,action);flight=op;return op.finally(()=>{if(flight===op)flight=null;});}
    async function dispose(){closed=true;if(flight)try{await flight;}catch(error){console.info('[D2 Characters] pending operation retained',error.message);}await ready.catch(error=>console.info('[D2 Characters] storage unavailable',error.message));db.close();}
    return Object.freeze({ready,perform,recover,context,metadata:()=>metadata,busy:()=>busy,backups:()=>db.backups(),dispose});
  }
  globalThis.D2CharacterController=Object.freeze({create});
})();
