// Disposable native-game scene for the user's five-second crowd comparison.
async function installBaalMovementFixture(){
  const scene=globalThis.D2BaalScene,g=scene?.g,w=g?.world;
  if(!globalThis.__D2GalleryLease?.owned||!w||g.camp||!g.tainted||g.state!=='paused')throw Error('Owned paused test run required');
  if(globalThis.D2BaalProof)throw Error('Baal fixture already installed');
  const modules=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>/\/assets\/itemArt-[^/]+\.js$/.test(u));
  const urls=[...new Set(modules)];if(urls.length!==1)throw Error('Native gameplay module is ambiguous');
  const ns=await import(urls[0]),constructors=Object.values(ns).filter(v=>typeof v==='function'&&v.toString().includes('.enemies.push('));
  if(constructors.length!==1)throw Error('Native monster constructor changed');
  const spawn=constructors[0],hero=w.player;
  for(const e of w.enemies)if(e.rank!=='breakable'){e.dead=true;e.sprite.destroy();}
  w.enemies.splice(0,w.enemies.length,...w.enemies.filter(e=>e.rank==='breakable'));
  const placeholder=spawn(w,'baalminion1',hero.x+400,hero.y),look=placeholder.look??placeholder.type.look;
  g.director.requestAssets(w);
  for(let i=0;i<1200&&!w.monsters.anims(look);i++){
    if(w.monsters.failed(look))throw Error('Native Baal art failed');
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  if(!w.monsters.anims(look))throw Error('Native Baal art did not settle');
  placeholder.dead=true;placeholder.sprite.destroy();w.enemies.splice(w.enemies.indexOf(placeholder),1);
  const radius=placeholder.radius,spacing=radius*2+8;
  const enemies=Array.from({length:30},(_,i)=>{
    const e=spawn(w,'baalminion1',hero.x+90+(i%6)*spacing,hero.y+(Math.floor(i/6)-2)*spacing);
    if(!e.anims?.WL||!e.anims.A1||e.kind!=='baalminion1')throw Error('Real Minion of Destruction required');
    e.life=e.maxLife=1000000;return e;
  });
  hero.life=hero.maxLife=1000000;g.input.release();g.frontend?.hide();g.hud.closeLevelUp();
  const cohort=new Set(enemies),initial=enemies.map(e=>({x:e.x,y:e.y})),heroStart={x:hero.x,y:hero.y};let timer=null,run=null;
  function prune(){for(const e of w.enemies)if(e.rank!=='breakable'&&!cohort.has(e)){e.dead=true;if(!e.sprite.destroyed)e.sprite.destroy();}w.enemies.splice(0,w.enemies.length,...w.enemies.filter(e=>e.rank==='breakable'||cohort.has(e)));}
  function step(dt){prune();g.update(dt);g.state='paused';g.frontend?.hide();g.hud.closeLevelUp();}
  function snapshot(){return {time:w.time,hero:{x:hero.x,y:hero.y},eye:w.view?.eye?{x:w.view.eye.x,y:w.view.eye.y}:null,enemies:enemies.map(e=>({x:e.x,y:e.y,spriteX:e.sprite.destroyed?null:e.sprite.x,spriteY:e.sprite.destroyed?null:e.sprite.y,mode:e.mode,animated:!!e.anim,direction:e.direction,animTime:e.animTime,dead:e.dead,destroyed:e.sprite.destroyed})),combat:globalThis.D2Mods?.status().qol?.combat??null};}
  function stop(){if(timer!==null)clearInterval(timer);timer=null;g.input.release();g.state='paused';g.frontend?.hide();g.hud.closeLevelUp();}
  function reset(){stop();hero.x=heroStart.x;hero.y=heroStart.y;for(const e of enemies){e.dead=true;if(!e.sprite.destroyed)e.sprite.destroy();}cohort.clear();prune();for(let i=0;i<enemies.length;i++){const e=spawn(w,'baalminion1',initial[i].x,initial[i].y);e.life=e.maxLife=1000000;enemies[i]=e;cohort.add(e);}}
  function prepare(){reset();for(let i=0;i<180;i++)step(1/60);g.render();return {count:enemies.length,kind:enemies[0].kind,radius,hero:heroStart,manager:globalThis.D2Mods?.version??null,combat:globalThis.D2Mods?.status().qol?.combat??null};}
  function start(){stop();run={startedAt:performance.now(),done:false,samples:[snapshot()]};timer=setInterval(()=>{try{step(.025);g.render();run.samples.push(snapshot());if(performance.now()-run.startedAt>=5000){run.done=true;stop();}}catch(error){run.error=error.message;stop();console.error('[Baal movement proof]',error);}},25);return {started:true};}
  globalThis.D2BaalProof=Object.freeze({prepare,start,stop,snapshot,status:()=>({run,state:g.state,tainted:g.tainted,guard:g.frameGuard.failed}),scene:()=>({g,w,enemies,step,ns}),dispose(){stop();delete globalThis.D2BaalProof;}});
  return prepare();
}

// Cast one real Decoy through the native passive, then stop further test casts.
async function prepareNativeDecoy(){
  const {g,w,step}=D2BaalProof.scene();
  if(!__D2GalleryLease.owned||!g.tainted||g.state!=='paused'||g.kit.id!=='amazon')throw Error('Owned Amazon scene required');
  const old=globalThis.D2DecoyProof?.sprite;if(old&&!old.destroyed){old.destroy();step(0);}
  D2BaalProof.prepare();const before=new Set(w.layer.children);let matches=[];
  g.kit.passives.dopplezon.apply(w.player,5,0);
  try{
    for(let i=0;i<1200;i++){
      step(1/60);matches=w.layer.children.filter(v=>!before.has(v)&&!v.destroyed&&v.texture&&v.alpha===.75);
      if(matches.length)break;if(i%30===0)await new Promise(resolve=>setTimeout(resolve,25));
    }
  }finally{g.kit.passives.dopplezon.apply(w.player,0,5);}
  if(matches.length!==1)throw Error('Native Decoy was not uniquely observed');
  globalThis.D2DecoyProof={sprite:matches[0],createdAt:w.time};g.render();
  return {kind:'native Decoy',x:matches[0].x,y:matches[0].y,worldTime:w.time,count:D2BaalProof.scene().enemies.length,combat:D2Mods.status().qol.combat};
}
