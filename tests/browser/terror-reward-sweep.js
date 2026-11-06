// Isolated, tainted game only. The host supplies the captured build's verified
// public bindings. The game itself handles death, rolls, opening and pickup.
async function prepareVictoryLootProof(bindings,freeCells=0) {
  const game=D2Characters.currentGame(), world=game?.world;
  if(!globalThis.__D2GalleryLease?.targetId || !game?.tainted || game.state!=='paused' ||
     !world?.terror || game.won || game.clearing || game.frameGuard.failed)
    throw Error('A fresh paused, tainted Terror replay is required');
  const status=()=>D2Mods.status().terrorized.gather;
  if(!status().connected || !status().enabled || status().problem)throw Error('Gather unavailable');
  const api=await import(status().evidence.pickups);
  const spawn=api[bindings.spawnMonster], drop=api[bindings.spawnPickup], damage=api[bindings.applyEnemyDamage];
  if([spawn,drop,damage].some(fn=>typeof fn!=='function'))throw Error('Incomplete fixture bindings');
  const bag=game.inventoryOf(game.kit.id), player=world.player, shrineManager=game.scenery.shrines;
  if(![0,40].includes(freeCells)||bag.length || world.dropLog!==undefined || !game.scenery.art?.shrines?.length)
    throw Error('Fixture needs an empty bag, unused drop log and loaded shrine art');
  const stashBefore=JSON.stringify(game.save.stashTabs);
  bag.push(...Array.from({length:40-freeCells},(_,index)=>({
    id:crypto.randomUUID().replaceAll('-',''),name:'Ring',base:'Ring',type:'ring',rarity:'normal',
    mods:[],level:1,at:{x:index%10,y:Math.floor(index/10)}
  })));
  const initialIds=new Set(bag.map(item=>item.id));
  const spot=(dx,dy)=>world.clearOfProps(player.x+dx,player.y+dy,14,player);
  const monster=(type,dx,dy,options)=>{const p=spot(dx,dy);return spawn(world,type,p.x,p.y,options);};
  const urn=monster('urn',-130,32), barrel=monster('barrel',112,55);
  const proxies=[...game.scenery.containers].filter(([prop,proxy])=>!prop.sprite.destroyed&&!proxy.dead);
  const gem=shrineManager.spawn(world,game.scenery.art.shrines,'gem');
  const control=shrineManager.spawn(world,game.scenery.art.shrines,'armor');
  if(!gem||!control)throw Error('Native shrine creation failed');
  const shrineSpot=spot(-70,-85),dx=shrineSpot.x-gem.x,dy=shrineSpot.y-gem.y;
  gem.x=shrineSpot.x;gem.y=shrineSpot.y;
  gem.sprite.position.set(gem.x,gem.y);gem.sprite.zIndex=gem.y;
  gem.glow.position.set(gem.x,gem.y);gem.glow.zIndex=gem.y+.5;
  gem.label.position.set(gem.label.x+dx,gem.label.y+dy);
  for(const [x,y,value] of [[-120,-24,0],[145,-50,1]]) {
    const p=spot(x,y);drop(world,'chest',p.x,p.y,value);
  }
  game.pendingChests.push(false);
  const chests=world.pickups.filter(p=>p.kind==='chest'&&!p.dead);
  // Exhaust the available choices in the disposable build to exercise the
  // normal fallback-item callback for every chest, without overriding RNG.
  for(const id of Object.keys(game.kit.skills))game.build.banished.add('skill:'+id);
  for(const id of [...Object.keys(game.kit.passives),'fcr','frw','telekinesis','replenish','vitality'])
    game.build.banished.add('passive:'+id);
  for(const attribute of Object.keys(game.build.attributes))game.build.banished.add('attribute:'+attribute);
  for(const tree of [1,2,3])game.build.banished.add('tree:'+tree);
  world.dropLog=[];
  const boss=monster('duriel',70,-30,{rank:'actBoss',name:'Duriel'});world.actBoss=boss;
  const origin=performance.timeOrigin;
  let started=false,timer=null,first=null,rewardObjects=[],expectedChestCount=0;
  function start(){
    if(started)throw Error('Victory proof already started');
    started=true;game.resume();damage(world,boss,boss.maxLife*10000);
    if(!boss.dead||!world.events.some(e=>e.type==='actCleared')){game.pause();throw Error('Native boss death did not produce completion');}
    expectedChestCount=game.pendingChests.length+world.pickups.filter(p=>p.kind==='chest'&&!p.dead).length;
    // A high level prevents an unrelated XP selection from interrupting the post-victory capture.
    game.level=game.build.level=player.level=99;game.xp=0;game.pendingLevelUps=0;game.slotPicks=[];
    const deadline=performance.now()+12000;
    timer=setInterval(()=>{
      const s=status();
      if(s.opened&&!first){
        first={...s.opened,beforePortal:!game.clearing?.portal,at:world.time};
        rewardObjects=world.pickups.filter(p=>p.item&&!p.dead).map(p=>({p,item:p.item}));
        for(const item of bag)if(!initialIds.has(item.id))rewardObjects.push({p:null,item});
      }
      if(s.phase===3||s.problem||performance.now()>deadline){
        clearInterval(timer);timer=null;if(game.state==='playing')game.pause();game.frontend.hide();
      }
    },25);
  }
  function result(){
    const state=status(),chestRolls=world.dropLog.filter(row=>row.source==='chest').length;
    const shrineRolls=world.dropLog.filter(row=>row.source==='shrine');
    const propsOpened=proxies.filter(([placed,proxy])=>proxy.dead&&proxy.life<=0&&placed.openedAt!==undefined).length;
    const unique=new Set(rewardObjects.map(({item})=>item.id));
    const remaining=rewardObjects.filter(({p})=>p&&!p.dead);
    const collected=rewardObjects.length-remaining.length;
    const ring=remaining.every(({p})=>Math.abs(Math.hypot(p.x-player.x,p.y-player.y)-state.radius)<1);
    const exactlyOnce=rewardObjects.length>0&&unique.size===rewardObjects.length&&rewardObjects.every(({p,item})=>{
      const held=bag.filter(stored=>stored.id===item.id).length;
      return p&&!p.dead ? held===0&&p.item===item&&world.pickups.includes(p) : held===1&&!world.pickups.includes(p);
    });
    const checks={
      nativeBossDeath:boss.dead&&game.won?.kind==='tier',beforePortal:first?.beforePortal,
      allChests:first?.chests+first?.pending===expectedChestCount&&chests.every(p=>p.dead)&&game.pendingChests.length===0,
      oneItemRollPerChest:chestRolls===expectedChestCount,urnAndBarrel:urn.dead&&urn.life===0&&barrel.dead&&barrel.life===0,
      sceneryContainers:propsOpened===proxies.length,gemUsed:gem.mode!=='NU'&&shrineRolls.length>=1,
      otherShrine:control.mode==='NU',ring,exactlyOnce,completed:state.phase===3&&!state.problem,
      capacity:freeCells?collected>0:collected===0,
      conserved:[...initialIds].every(id=>bag.filter(item=>item.id===id).length===1)&&stashBefore===JSON.stringify(game.save.stashTabs),
      sameRun:performance.timeOrigin===origin&&game.world===world
    };
    return {passed:Object.values(checks).every(Boolean),checks,opened:first,chestRolls,shrineRolls,propsOpened,
      expectedChestCount,collected,remaining:remaining.length,radius:state.radius,phase:state.phase,problem:state.problem};
  }
  globalThis.D2VictoryLootProof={game,start,result};
  return {ready:true,chests:chests.length,pending:game.pendingChests.length,props:proxies.length,origin};
}
