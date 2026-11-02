// A dense native Fallen pack in the explicitly verified disposable game.
// The scripted target path is proof setup; native AI, attacks, walls and updates run normally.
async function installCrowdFixture(game=D2Characters.currentGame()){
  if(!globalThis.__D2GalleryLease?.contextId||!__D2GalleryLease.targetId||location.origin!=='https://d2survivors.lol')throw Error('Verified isolated game required');
  if(globalThis.D2CrowdProof)throw Error('Dispose the previous crowd fixture first');
  const g=game,w=g?.world,origin=performance.timeOrigin;
  if(!w||g.kit?.id!=='druid'||g.state!=='paused'||!g.tainted)throw Error('Paused disposable Druid run required');
  const ns=await import(D2Mods.status().qol.combat.evidence.module),spawns=Object.values(ns).filter(v=>typeof v==='function'&&v.toString().includes('.enemies.push('));
  if(spawns.length!==1||!g.director.ready(w))throw Error('Native monster constructor or art unavailable');
  for(const enemy of w.enemies)enemy.sprite.destroy();w.enemies.length=0;
  g.build.skills=[];w.player.life=w.player.maxLife=1000000;
  const enemies=Array.from({length:30},(_,i)=>{const a=i*Math.PI*2/30,e=spawns[0](w,'fallen1',Math.cos(a)*175,Math.sin(a)*175);if(!e.anims)throw Error('Real Fallen animation required');e.life=e.maxLife=1000000;return e;});
  const initial=enemies.map(e=>({x:e.x,y:e.y}));let timer=null,run=null;
  function step(dt){g.update(dt);g.state='paused';g.hud.closeLevelUp();g.frontend?.hide();}
  function reset(){const keep=new Set(enemies);for(const e of w.enemies)if(!keep.has(e))e.sprite.destroy();w.enemies.splice(0,w.enemies.length,...enemies);w.time=0;w.actStart=0;for(let i=0;i<enemies.length;i++){const e=enemies[i];e.x=initial[i].x;e.y=initial[i].y;e.anim=null;e.attack=null;e.mode='walk';e.attackCooldown=0;e.skillCooldown=100;e.retiring=false;e.heading=null;e.born=0;}w.player.x=0;w.player.y=0;g.input.release();}
  async function configure(value){await D2Mods.configureBuiltin('qol',value);for(let i=0;i<100&&(!D2Mods.status().gameMenu.connected||value&&!D2Mods.status().qol.combat.connected);i++){if(D2Mods.status().qol.combat.problem)throw Error(D2Mods.status().qol.combat.problem);await new Promise(r=>setTimeout(r,25));}if(!D2Mods.status().gameMenu.connected||value&&!D2Mods.status().qol.combat.connected)throw Error('Native game binding did not connect');g.showMenu();g.frontend?.hide();D2Mods.close();}
  function sample(){return enemies.map(e=>({x:e.x,y:e.y,mode:e.mode,dead:e.dead}));}
  async function compare(enabled){
    stop();await configure(enabled);reset();for(let i=0;i<360;i++)step(1/60);
    let away=0,awayDistance=0,attacking=0,maxStep=0;const frames=[];
    for(let i=0;i<480;i++){
      const angle=i/480*Math.PI*4;w.player.x=Math.cos(angle)*32;w.player.y=Math.sin(angle)*32;
      const before=sample();step(1/60);
      for(let j=0;j<enemies.length;j++){const e=enemies[j],p=before[j],dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),tx=w.player.x-p.x,ty=w.player.y-p.y;
        if(dx*tx+dy*ty<-.001){away++;awayDistance+=d;}if(e.mode==='attack')attacking++;maxStep=Math.max(maxStep,d);}
      if(i%30===0)frames.push({at:i/60,hero:{x:w.player.x,y:w.player.y},enemies:sample()});
    }
    const before=sample();w.player.x=350;w.player.y=0;for(let i=0;i<120;i++)step(1/60);
    const resumed=enemies.filter((e,i)=>Math.hypot(e.x-before[i].x,e.y-before[i].y)>5).length;
    g.render();return {enabled,count:enemies.length,worldCount:w.enemies.length,away,awayDistance,attacking,maxStep,resumed,origin:performance.timeOrigin,retained:Math.abs(performance.timeOrigin-origin)<1,combat:D2Mods.status().qol.combat,frames};
  }
  function stop(){if(timer!==null)clearInterval(timer);timer=null;g.input.release();g.state='paused';g.hud.closeLevelUp();g.frontend?.hide();}
  async function animate(enabled,duration=8000){stop();await configure(enabled);reset();for(let i=0;i<360;i++)step(1/60);run={enabled,done:false,samples:[]};const start=performance.now();timer=setInterval(()=>{try{const elapsed=performance.now()-start,a=elapsed/4000*Math.PI*2;w.player.x=elapsed<6000?Math.cos(a)*32:150+(elapsed-6000)*.06;w.player.y=elapsed<6000?Math.sin(a)*32:0;step(.025);g.render();run.samples.push({at:elapsed,hero:{x:w.player.x,y:w.player.y},enemies:sample()});if(elapsed>=duration){run.done=true;stop();}}catch(error){run.error=error.message;stop();console.error('[Crowd proof]',error);}},25);return {started:true,enabled};}
  async function controls(enabled,duration=8500){stop();await configure(enabled);reset();for(let i=0;i<360;i++)step(1/60);run={enabled,input:'native keyboard',done:false,samples:[]};D2Mods.focusGame();const start=performance.now();timer=setInterval(()=>{try{const elapsed=performance.now()-start;step(.025);g.render();run.samples.push({at:elapsed,hero:{x:w.player.x,y:w.player.y},enemies:sample()});if(elapsed>=duration){run.done=true;stop();}}catch(error){run.error=error.message;stop();console.error('[Crowd input proof]',error);}},25);return {started:true,enabled};}
  globalThis.D2CrowdProof=Object.freeze({compare,animate,controls,stop,status:()=>({run,origin:performance.timeOrigin,state:g.state,tainted:g.tainted}),scene:()=>({g,w,enemies,ns,step}),dispose(){stop();delete globalThis.D2CrowdProof;}});
  return {ready:true,count:enemies.length,kind:enemies[0].kind,origin};
}
