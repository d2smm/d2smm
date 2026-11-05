// Uses actual native drops and the boss/portal lifecycle in the host-verified,
// tainted Terrorized Incognito fixture. Never use with a player's game or save.
async function prepareGatherProof(seed,freeCells=40){
  const game=D2Characters.currentGame(),demo=globalThis.__D2TerrorDemo;
  if(!globalThis.__D2GalleryLease?.contextId||!demo||demo.game!==game||!game?.tainted)throw Error('Prepared isolated Terror fixture required');
  game.hud.closeCharacter();
  if(!game.hud.character.classList.contains('hidden'))throw Error('Close the native character/stash panel before replay proof');
  await game.startReplay(game.kit,demo.expected.tier);
  // Pause in the same browser task: an agent/tool round trip must not leave
  // a disposable level-one hero fighting Terror enemies during setup.
  if(game.state!=='playing')throw Error('Native replay did not start');
  game.pause();
  return seedGatherDrops(seed,freeCells);
}
async function seedGatherDrops(seed,freeCells=40){
  const g=D2Characters.currentGame(),lease=globalThis.__D2GalleryLease;
  if(!lease?.contextId||!lease.targetId||!globalThis.__D2TerrorDemo||!g?.tainted||!g.world?.terror||g.won||g.state!=='paused'||g.world.pickups.length)throw Error('Use the untouched isolated Terror replay fixture');
  const status=D2Mods.status().terrorized.gather;
  if(!status.enabled||!status.connected||status.problem)throw Error('Enable Gather Run Drops through its checkbox first');
  if(![0,5,40].includes(freeCells))throw Error('Use an empty, partly full, or full bag case');
  const bag=g.inventoryOf(g.kit.id);if(bag.some(i=>!i.id.startsWith('gather-')))throw Error('Only owned gather-fixture inventory may be replaced');
  const stashBefore=JSON.stringify({native:g.save.stashTabs,extra:g.save.d2smmSharedStash});
  bag.splice(0,bag.length,...Array.from({length:40-freeCells},(_,i)=>({id:'gather-'+g.runId+'-bag-'+i,base:'Ring',name:'Ring',type:'ring',rarity:'normal',level:1,mods:[],at:{x:i%10,y:Math.floor(i/10)}})));
  const ns=await import(status.evidence.pickups),functions=[...new Set(Object.values(ns).filter(v=>typeof v==='function'))];
  const one=(a,label)=>{if(a.length!==1)throw Error('Native '+label+' fixture binding changed');return a[0];};
  const dropItem=one(functions.filter(fn=>{const s=fn.toString();return s.includes('dropLog')&&s.includes('labelY');}),'item drop');
  const dropOther=one(functions.filter(fn=>{const s=fn.toString();return s.includes('consumables')&&s.includes('Math.round')&&s.includes('gold');}),'other drop');
  const dropXp=one(functions.filter(fn=>{const s=fn.toString();return s.includes('gemCount++')&&s.includes('>=250');}),'experience drop');
  const w=g.world,center={x:w.player.x,y:w.player.y};
  // Settle the native victory before the visual-only level seed. The mod does
  // not participate in settlement, and this avoids saving synthetic levels.
  g.actCleared();
  // Synthetic level 99 avoids unrelated draft queues while filming. This is
  // fixture data only; the production mod never changes levels or skill picks.
  g.input.release();g.walkTarget=null;
  const positions=[[-330,-200],[-260,-210],[-180,-240],[20,-220],[260,-180],[360,-80],[350,60],[250,190],[140,230],[-50,230],[-240,200],[-350,60]];
  const names=['Beast Loop','Gale Grasp','Amber Ring','Raven Finger','Storm Knot','Dread Circle','Bone Coil','Viper Grip','Stone Turn','Bitter Hold','Eagle Loop','Doom Band'];
  positions.forEach(([x,y],i)=>{const item=structuredClone(seed.drop);item.id='gather-'+g.runId+'-ring-'+i;item.name=names[i];if(i){item.mods=[{stat:'fireResist',value:5}];item.level=18;item.rarity=i===2?'magic':'rare';}dropItem(w,item,center.x+x,center.y+y);});
  const discarded={...structuredClone(seed.drop),id:'gather-'+g.runId+'-discarded',name:'Discarded Ring'};dropItem(w,discarded,center.x-430,center.y-160,true);
  dropOther(w,'chest',center.x-340,center.y-80,0);
  dropOther(w,'potion',center.x+320,center.y+130,0);
  dropOther(w,'mana',center.x+360,center.y+180,0);
  dropOther(w,'scroll',center.x+200,center.y-220,0);
  dropOther(w,'gold',center.x+410,center.y+100,10);
  dropXp(w,center.x-400,center.y+100,1);
  g.level=g.build.level=w.player.level=99;g.xp=0;g.pendingLevelUps=0;g.slotPicks=[];
  const drops=w.pickups.map(p=>({p,item:p.item,kind:p.kind,value:p.value,discarded:!!p.discarded,hidden:p.loot==='hide',source:{x:p.x,y:p.y},itemKey:p.item?D2CharacterCore.itemKey(p.item):null}));
  const origin=performance.timeOrigin,trace=[];let timer=null,started=false,startedAt=0;
  D2Mods.close();
  globalThis.D2GatherProof=Object.freeze({g,w,center,drops,trace,freeCells,
    start(){if(started)throw Error('Fixture already started');started=true;startedAt=performance.now();g.resume();
      timer=setInterval(()=>{const state=D2Mods.status().terrorized.gather;trace.push({atMs:performance.now()-startedAt,time:w.time,phase:state.phase,deposited:state.deposited,portal:!!g.clearing?.portal,positions:drops.map(({p})=>({x:p.x,y:p.y,dead:p.dead,magnet:p.magnet}))});
        if(state.phase===3||state.problem){clearInterval(timer);timer=null;g.pause();g.frontend.hide();}
      },35);
    },
    result(){const state=D2Mods.status().terrorized.gather,items=drops.filter(d=>d.item&&!d.discarded),remaining=items.filter(d=>!d.p.dead),inventory=g.inventoryOf(g.kit.id);
      const intact=d=>d.p.item===d.item&&D2CharacterCore.itemKey(d.item)===d.itemKey&&d.p.value===d.value;
      const chestsUnmoved=drops.filter(d=>d.kind==='chest').every(d=>d.p.x===d.source.x&&d.p.y===d.source.y);
      const collected=items.filter(d=>d.p.dead),expectedCollected=Math.min(freeCells,items.filter(d=>!d.hidden).length);
      const discardedUnmoved=drops.filter(d=>d.discarded).every(d=>!d.p.dead&&d.p.x===d.source.x&&d.p.y===d.source.y&&!inventory.includes(d.item));
      const exactlyOnce=items.every(d=>intact(d)&&(d.p.dead?inventory.filter(i=>i.id===d.item.id).length===1&&!w.pickups.includes(d.p):!inventory.some(i=>i.id===d.item.id)&&w.pickups.includes(d.p)));
      const ring=remaining.every(d=>Math.hypot(d.p.x-center.x,d.p.y-center.y)>=Math.max(w.player.radius+10,w.player.pickupRadius)+16-1e-6&&!d.p.sprite.destroyed&&d.p.sprite.x===d.p.x&&d.p.sprite.y===d.p.y);
      const hiddenPreserved=items.filter(d=>d.hidden).every(d=>!d.p.dead&&d.p.loot==='hide');
      const stashUnchanged=JSON.stringify({native:g.save.stashTabs,extra:g.save.d2smmSharedStash})===stashBefore;
      const currency=drops.filter(d=>d.kind==='gold'||d.kind==='xp'),nativeCurrency=currency.every(d=>d.p.value===d.value&&(d.p.dead||d.p.magnet));
      const passed=state.phase===3&&!state.problem&&state.deposited>=items.length&&collected.length===expectedCollected&&inventory.length===40-freeCells+expectedCollected&&exactlyOnce&&ring&&hiddenPreserved&&discardedUnmoved&&stashUnchanged&&nativeCurrency&&(status.chests||chestsUnmoved);
      return{passed,status:state,freeCells,expectedCollected,collected:collected.length,remaining:remaining.length,exactlyOnce,ring,hiddenPreserved,discardedUnmoved,stashUnchanged,chestsUnmoved,nativeCurrency,originUnchanged:performance.timeOrigin===origin,runId:g.runId,currency:currency.map(d=>({kind:d.kind,dead:d.p.dead,magnet:d.p.magnet})),positions:remaining.map(d=>({name:d.item.name,hidden:d.hidden,x:d.p.x,y:d.p.y,radius:Math.hypot(d.p.x-w.player.x,d.p.y-w.player.y)})),pickupAtMs:trace.find(t=>t.deposited>0)?.atMs,spreadAtMs:trace.find(t=>t.phase===2)?.atMs,frames:trace.length};
    },
    dispose(){if(timer)clearInterval(timer);timer=null;}
  });
  return{drops:drops.length,freeCells,center,tainted:g.tainted,phase:status.phase};
}
