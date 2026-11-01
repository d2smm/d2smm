// Controlled native combat in the host-verified disposable game only.
// Uses actual game updates, monster sprites and Druid skills; never a player save.
async function installCombatFixture(){
  if(!globalThis.__D2GalleryLease?.contextId||!__D2GalleryLease.targetId||location.origin!=='https://d2survivors.lol')throw Error('Verified isolated game required');
  if(globalThis.D2CombatProof)throw Error('Dispose the previous combat fixture first');
  const g=D2Characters.currentGame(),status=D2Mods.status().qol.combat;
  if(!g||g.kit?.id!=='druid'||!status.connected||status.problem)throw Error('Select Druid in the isolated game with combat QoL connected');
  const origin=performance.timeOrigin,enabled=D2Mods.status().qol.enabled;
  await g.startClass(g.kit);g.tainted=true;g.pause();g.frontend?.hide();
  const w=g.world,skills=['summonSpiritWolf','moltenBoulder'];g.classArt.want(skills);
  for(let n=0;n<400&&(!g.director.ready(w)||skills.some(id=>!g.classArt.ready(id)));n++)await new Promise(r=>setTimeout(r,25));
  if(!g.director.ready(w)||skills.some(id=>!g.classArt.ready(id)))throw Error('Native combat art did not become ready');
  const ns=await import(status.evidence.module),spawns=Object.values(ns).filter(v=>typeof v==='function'&&v.toString().includes('.enemies.push('));
  if(spawns.length!==1)throw Error('Native monster constructor changed');
  const spawn=(x,y)=>{const e=spawns[0](w,'fallen1',x,y);if(!e.anims)throw Error('Real Fallen animation is required');e.life=e.maxLife=1000000;return e;};
  g.build.skills=skills.map(id=>({id,level:1,cooldown:3600}));w.player.life=w.player.maxLife=1000000;
  const enemy=spawn(130,40);enemy.dummy=true;
  const before=new Map(w.layer.children.map(s=>[s,{x:s.x,y:s.y}]));
  if(!g.kit.skills.summonSpiritWolf.cast(w,1))throw Error('Native wolf summon failed');
  const candidates=w.layer.children.filter(s=>!before.has(s)&&s.texture).map(s=>({s,x:s.x,y:s.y}));
  for(let n=0;n<90;n++)g.update(1/60);
  const moving=candidates.filter(p=>!p.s.destroyed).sort((a,b)=>Math.hypot(b.s.x-b.x,b.s.y-b.y)-Math.hypot(a.s.x-a.x,a.s.y-a.y));
  if(!moving.length||Math.hypot(moving[0].s.x-moving[0].x,moving[0].s.y-moving[0].y)<1)throw Error('Native summon movement not observed');
  const pet=moving[0].s,tintEnemy=spawn(-180,-80);tintEnemy.dummy=true;
  const checks=[],samples=[];let timer=null,run=null;
  const check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);};
  const step=dt=>{g.update(dt);g.state='paused';g.hud.closeLevelUp();g.frontend?.hide();};
  async function push(value){await D2Mods.configureBuiltin('qol',value);enemy.x=pet.x+2;enemy.y=pet.y+2;enemy.sprite.position.set(enemy.x,enemy.y);const x=enemy.x,y=enemy.y;step(1/60);return Math.hypot(enemy.x-x,enemy.y-y);}
  async function verify(){
    const nativePush=await push(false),protectedPush=await push(true);
    check('Native summon shove reproduces',nativePush>1);check('QoL suppresses passive monster shove',protectedPush<.001);
    const a=spawn(260,100),b=spawn(262,100),speed=a.speed;a.speed=b.speed=0;
    const distance=Math.hypot(a.x-b.x,a.y-b.y),updateEnemies=ns[status.evidence.enemyExport];updateEnemies(w,1/60);
    check('Native monster separation remains',Math.hypot(a.x-b.x,a.y-b.y)>distance);
    a.speed=speed;const x=a.x,y=a.y;updateEnemies(w,.1);check('Normal monster movement remains',Math.hypot(a.x-x,a.y-y)>1);
    enemy.dummy=false;enemy.speed=0;enemy.x=80;enemy.y=0;const oldX=enemy.x,oldY=enemy.y;
    check('Native Molten Boulder casts',g.kit.skills.moltenBoulder.cast(w,1));for(let n=0;n<55;n++)step(1/60);
    const knockback=Math.hypot(enemy.x-oldX,enemy.y-oldY);check('Intentional skill knockback remains',knockback>1);enemy.dummy=true;
    await D2Mods.configureBuiltin('qol',false);const nativeColors=[];
    for(const[hit,chill]of [[0,0],[.5,0],[0,8]]){tintEnemy.hitFlash=hit;tintEnemy.chilledFor=chill;step(1/60);nativeColors.push(tintEnemy.sprite.tint);}
    check('Native hit and chill colors differ',new Set(nativeColors).size===3);
    tintEnemy.hitFlash=0;tintEnemy.chilledFor=0;step(1/60);await D2Mods.configureBuiltin('qol',true);step(1/60);
    tintEnemy.hitFlash=.25;tintEnemy.chilledFor=8;const start=w.time,changes=[];let last=null;
    for(let n=0;n<220;n++){step(1/60);const color=tintEnemy.sprite.tint;samples.push({at:w.time-start,color});if(color!==last){changes.push({at:w.time-start,color});last=color;}}
    check('First status change is immediate',changes[0].color===nativeColors[1]&&changes[0].at<.02);
    check('Color changes wait at least three seconds',changes.length===2&&changes[1].at-changes[0].at>=3-1e-8);
    check('Only native endpoint colors are displayed',changes[1].color===nativeColors[2]&&samples.every(s=>s.color===nativeColors[1]||s.color===nativeColors[2]));
    await D2Mods.configureBuiltin('qol',false);tintEnemy.hitFlash=.5;step(1/60);check('Disabling restores immediate native tint',tintEnemy.sprite.tint===nativeColors[1]);
    await D2Mods.configureBuiltin('qol',true);check('Game page retained',performance.timeOrigin===origin);check('Native frame guard is healthy',!g.frameGuard.failed);
    g.render();return {passed:true,checks,nativePush,protectedPush,knockback,nativeColors,changes,origin};
  }
  function stop(){clearInterval(timer);timer=null;g.state='paused';g.input.release();g.hud.closeLevelUp();g.frontend?.hide();g.render();}
  async function animate(value,duration=6500){
    stop();await D2Mods.configureBuiltin('qol',value);tintEnemy.hitFlash=0;tintEnemy.chilledFor=0;step(.025);
    run={enabled:value,start:w.time,samples:[],done:false};const begin=performance.now();
    timer=setInterval(()=>{try{const age=performance.now()-begin;tintEnemy.hitFlash=Math.floor(age/250)%2?.25:0;tintEnemy.chilledFor=8;step(.025);run.samples.push({at:w.time-run.start,color:tintEnemy.sprite.tint});g.render();if(age>=duration){run.done=true;stop();}}catch(error){run.error=error.message;stop();console.error('[Combat proof]',error);}},25);
    return {started:true,enabled:value};
  }
  globalThis.D2CombatProof=Object.freeze({verify,animate,stop,status:()=>({checks,samples,run,tainted:g.tainted,origin:performance.timeOrigin,game:g.state}),scene:()=>({g,w,enemy,tintEnemy,pet}),async dispose(){stop();await D2Mods.configureBuiltin('qol',enabled);delete globalThis.D2CombatProof;}});
  return {ready:true,kind:enemy.kind,animated:!!enemy.anims,origin,tainted:g.tainted};
}
