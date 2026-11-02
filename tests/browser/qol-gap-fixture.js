// Native Valkyrie and monster AI in the admitted disposable Amazon scene.
async function installGapFixture(){
  if(!globalThis.__D2GalleryLease?.contextId||!globalThis.D2GapScene)throw Error('Owned isolated scene required');
  if(globalThis.D2GapProof)throw Error('Dispose the previous gap fixture first');
  const g=D2GapScene.g,w=g.world;if(g.kit?.id!=='amazon'||!g.tainted||g.state!=='paused')throw Error('Paused disposable Amazon required');
  const origin=performance.timeOrigin,ns=await import(D2Mods.status().qol.combat.evidence.module),spawn=Object.values(ns).filter(v=>typeof v==='function'&&v.toString().includes('.enemies.push('));
  if(spawn.length!==1)throw Error('Native spawn contract changed');
  g.classArt.want(['valkyrie']);for(let i=0;i<200&&(!g.classArt.ready('valkyrie')||!g.director.ready(w));i++)await new Promise(r=>setTimeout(r,25));
  if(!g.classArt.ready('valkyrie')||!g.director.ready(w))throw Error('Native art is not ready');
  g.build.skills=[{id:'valkyrie',level:8,cooldown:3600}];w.player.life=w.player.maxLife=1000000;
  function step(dt){g.update(dt);g.state='paused';g.hud.closeLevelUp();g.frontend?.hide();}
  for(const e of w.enemies)if(e.rank!=='breakable'){e.dead=true;e.sprite.destroy();}
  w.enemies.splice(0,w.enemies.length,...w.enemies.filter(e=>e.rank==='breakable'));
  // Valkyrie lazily starts native Amazon art loading on the first cast and returns
  // false until that promise settles; false creates no summon and is safe to retry.
  const before=new Set(w.layer.children);let cast=false;
  for(let i=0;i<200&&!cast;i++){cast=g.kit.skills.valkyrie.cast(w,8);if(!cast)await new Promise(r=>setTimeout(r,25));}
  if(!cast)throw Error('Native Valkyrie art did not settle');
  const sprites=w.layer.children.filter(s=>!before.has(s)&&s.texture);
  for(let i=0;i<90;i++)step(1/60);
  const survivors=sprites.filter(s=>!s.destroyed);if(survivors.length!==1||survivors[0].texture===w.art.player)throw Error('Real persistent Valkyrie sprite not uniquely identified');
  const valk=survivors[0];
  for(const e of w.enemies)if(e.rank!=='breakable'){e.dead=true;e.sprite.destroy();}
  w.enemies.splice(0,w.enemies.length,...w.enemies.filter(e=>e.rank==='breakable'));
  w.player.x=valk.x-240;w.player.y=valk.y;g.input.release();
  const enemies=Array.from({length:30},(_,i)=>{const angle=(i-1)*50*Math.PI/180,x=i<3?Math.cos(angle)*31:85+((i-3)%3)*24,y=i<3?Math.sin(angle)*31:(Math.floor((i-3)/3)-4)*24,e=spawn[0](w,'fallen1',valk.x+x,valk.y+y);if(!e.anims?.WL||!e.anims.GH)throw Error('Real animated Fallen required');e.life=e.maxLife=1000000;return e;});
  const keep=new Set(enemies),initial=enemies.map(e=>({x:e.x-valk.x,y:e.y-valk.y}));let timer=null,run=null;
  function prune(){for(const e of w.enemies)if(e.rank!=='breakable'&&!keep.has(e)){e.dead=true;e.sprite.destroy();}w.enemies.splice(0,w.enemies.length,...w.enemies.filter(e=>e.rank==='breakable'||keep.has(e)));}
  function sample(){return {target:{x:valk.x,y:valk.y,destroyed:valk.destroyed},hero:{x:w.player.x,y:w.player.y},enemies:enemies.map(e=>({x:e.x,y:e.y,mode:e.mode,direction:e.direction,animTime:e.animTime,walkingDirections:e.anims.WL.directions,dead:e.dead})),navigation:D2Mods.status().qol.combat.navigation??null};}
  function reset(){if(valk.destroyed)throw Error('Valkyrie needs a new native cast');prune();w.player.x=valk.x-240;w.player.y=valk.y;for(let i=0;i<enemies.length;i++){const e=enemies[i];e.x=valk.x+initial[i].x;e.y=valk.y+initial[i].y;e.anim=null;e.mode='walk';e.attack=null;e.attackCooldown=0;e.skillCooldown=100;e.retiring=false;e.heading=null;}g.input.release();}
  async function configure(enabled){await D2Mods.configureBuiltin('qol',enabled);for(let i=0;i<100&&(!D2Mods.status().gameMenu.connected||enabled&&!D2Mods.status().qol.combat.connected);i++)await new Promise(r=>setTimeout(r,25));g.showMenu();g.frontend?.hide();D2Mods.close();}
  async function measure(enabled,seconds=6){stop();await configure(enabled);reset();const frames=[];let backAttacks=0,attackSamples=0;for(let i=0;i<seconds*60;i++){prune();step(1/60);if(valk.destroyed)break;for(const e of enemies)if(e.mode==='attack'&&Math.hypot(e.x-valk.x,e.y-valk.y)<=34){attackSamples++;if(e.x<valk.x-5)backAttacks++;}if(i%12===0)frames.push(sample());}g.render();return {enabled,version:D2Mods.version,count:enemies.length,backAttacks,attackSamples,targetAlive:!valk.destroyed,origin,pageRetained:Math.abs(performance.timeOrigin-origin)<1,guard:g.frameGuard.failed,combat:D2Mods.status().qol.combat,frames};}
  function stop(){if(timer!==null)clearInterval(timer);timer=null;g.input.release();g.state='paused';g.hud.closeLevelUp();g.frontend?.hide();}
  async function animate(enabled,duration=8000){stop();await configure(enabled);reset();run={enabled,done:false,samples:[]};const start=performance.now();timer=setInterval(()=>{try{prune();step(.025);g.render();run.samples.push(sample());if(performance.now()-start>=duration||valk.destroyed){run.done=true;stop();}}catch(error){run.error=error.message;stop();console.error('[Gap proof]',error);}},25);return {started:true,enabled};}
  globalThis.D2GapProof=Object.freeze({measure,animate,stop,status:()=>({run,state:g.state,origin:performance.timeOrigin,tainted:g.tainted}),scene:()=>({g,w,enemies,valk,step,ns,sample,reset,prune}),dispose(){stop();delete globalThis.D2GapProof;}});
  return {ready:true,kit:g.kit.id,count:enemies.length,target:{x:valk.x,y:valk.y},directions:enemies[0].anims.WL.directions,origin};
}

// Observe native simulation/presentation; no replacement AI or animation model.
async function verifyGapMotion(){
  const s=D2GapProof.scene(),{g,w,enemies,valk,step,reset,prune}=s;
  if(!g.tainted||g.state!=='paused')throw Error('Disposable paused scene required');
  D2GapProof.stop();reset();let walking=0,walkTextures=0,textureChanges=0,restarts=0,budgetExcess=0;
  for(let frame=0;frame<360;frame++){
    const before=enemies.map(e=>({x:e.x,y:e.y,texture:e.sprite.texture,animated:!!e.anim}));prune();step(1/60);
    restarts+=D2Mods.status().qol.combat.navigation.walkRestarts;
    enemies.forEach((e,i)=>{const old=before[i],distance=Math.hypot(e.x-old.x,e.y-old.y);if(e.anim||old.animated||e.mode!=='walk'||distance<1e-6)return;
      walking++;if(e.anims.WL.frames.flat().includes(e.sprite.texture))walkTextures++;if(e.sprite.texture!==old.texture)textureChanges++;
      budgetExcess=Math.max(budgetExcess,distance-e.speed/60);
    });
  }
  if(valk.destroyed)throw Error('Native Valkyrie died');
  const front=enemies.filter(e=>Math.hypot(e.x-valk.x,e.y-valk.y)<34),poses=front.map(e=>({x:e.x,y:e.y}));let frontDrift=0;
  for(let frame=0;frame<180;frame++){const angle=frame/180*Math.PI*2;w.player.x=valk.x+240*Math.cos(angle);w.player.y=valk.y+240*Math.sin(angle);prune();step(1/60);front.forEach((e,i)=>frontDrift=Math.max(frontDrift,Math.hypot(e.x-poses[i].x,e.y-poses[i].y)));}
  w.player.x=valk.x+60;w.player.y=valk.y;for(let i=0;i<60;i++){prune();step(1/60);}const nearTargets=D2Mods.status().qol.combat.navigation.targets;
  w.player.x=valk.x-240;w.player.y=valk.y;for(let i=0;i<120;i++){prune();step(1/60);}const farTargets=D2Mods.status().qol.combat.navigation.targets;
  g.render();const result={version:D2Mods.version,walking,walkTextures,textureChanges,restarts,budgetExcess,frontCount:front.length,frontDrift,nearTargets,farTargets,targetAlive:!valk.destroyed,guard:g.frameGuard.failed,problem:D2Mods.status().qol.combat.problem};
  if(!walking||walking!==walkTextures||!textureChanges||!restarts||budgetExcess>1e-5||frontDrift>1e-5||!nearTargets.some(t=>t.kind==='hero')||!farTargets.some(t=>t.kind==='valkyrie')||!result.targetAlive||result.guard||result.problem)throw Error(JSON.stringify(result));
  return result;
}

function verifyGapTargetRemoval(){
  const {g,w,enemies,valk,step,prune}=D2GapProof.scene();
  if(!g.tainted||g.state!=='paused'||valk.destroyed)throw Error('Live disposable Valkyrie required');
  D2GapProof.stop();g.build.skills=[];valk.destroy();
  // Native ally lifecycle removes its body when the sprite is destroyed.
  for(let i=0;i<360;i++){prune();step(1/60);}
  const combat=D2Mods.status().qol.combat;
  const attackers=enemies.filter(e=>e.mode==='attack'&&Math.hypot(e.x-w.player.x,e.y-w.player.y)<34).length;
  const passed=valk.destroyed&&combat.navigation.targets.length===1&&combat.navigation.targets[0].kind==='hero'&&combat.navigation.targets[0].actors===30&&attackers>0&&!combat.problem&&!g.frameGuard.failed;
  g.render();if(!passed)throw Error(JSON.stringify({combat,attackers}));return {passed,removed:true,attackers,combat};
}
