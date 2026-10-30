// Uses actual native drops and the boss/portal lifecycle in the host-verified,
// tainted Terrorized Incognito fixture. Never use with a player's game or save.
async function prepareGatherProof(seed){
  const game=D2Characters.currentGame(),demo=globalThis.__D2TerrorDemo;
  if(!globalThis.__D2GalleryLease?.contextId||!demo||demo.game!==game||!game?.tainted)throw Error('Prepared isolated Terror fixture required');
  await game.startReplay(game.kit,demo.expected.tier);
  // Pause in the same browser task: an agent/tool round trip must not leave
  // a disposable level-one hero fighting Terror enemies during setup.
  if(game.state!=='playing')throw Error('Native replay did not start');
  game.pause();
  return seedGatherDrops(seed);
}
async function seedGatherDrops(seed){
  const g=D2Characters.currentGame(),lease=globalThis.__D2GalleryLease;
  if(!lease?.contextId||!lease.targetId||!globalThis.__D2TerrorDemo||!g?.tainted||!g.world?.terror||g.won||g.state!=='paused'||g.world.pickups.length)throw Error('Use the untouched isolated Terror replay fixture');
  const status=D2Mods.status().terrorized.gather;
  if(!status.enabled||!status.connected||status.problem)throw Error('Enable Gather Run Drops through its checkbox first');
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
  g.level=g.build.level=w.player.level=99;g.xp=0;g.pendingLevelUps=0;g.slotPicks=[];
  g.input.release();g.walkTarget=null;
  const positions=[[-330,-200],[-260,-210],[-180,-240],[20,-220],[260,-180],[360,-80],[350,60],[250,190],[140,230],[-50,230],[-240,200],[-350,60]];
  const names=['Beast Loop','Gale Grasp','Amber Ring','Raven Finger','Storm Knot','Dread Circle','Bone Coil','Viper Grip','Stone Turn','Bitter Hold','Eagle Loop','Doom Band'];
  positions.forEach(([x,y],i)=>{const item=structuredClone(seed.drop);item.id='gather-'+g.runId+'-ring-'+i;item.name=names[i];if(i){item.mods=[{stat:'fireResist',value:5}];item.level=18;item.rarity=i===2?'magic':'rare';}dropItem(w,item,center.x+x,center.y+y);});
  dropOther(w,'chest',center.x-340,center.y-80,0);
  dropOther(w,'potion',center.x+320,center.y+130,0);
  dropOther(w,'scroll',center.x+200,center.y-220,0);
  dropOther(w,'gold',center.x+410,center.y+100,10);
  dropXp(w,center.x-400,center.y+100,1);
  const drops=w.pickups.map(p=>({p,item:p.item,kind:p.kind,value:p.value,source:{x:p.x,y:p.y},itemJson:JSON.stringify(p.item)}));
  const origin=performance.timeOrigin,trace=[];let timer=null,started=false;
  D2Mods.close();
  globalThis.D2GatherProof=Object.freeze({g,w,center,drops,trace,
    start(){if(started)throw Error('Fixture already started');started=true;g.resume();
      timer=setInterval(()=>{const state=D2Mods.status().terrorized.gather;trace.push({time:w.time,phase:state.phase,portal:!!g.clearing?.portal,positions:drops.map(({p})=>({x:p.x,y:p.y,dead:p.dead,magnet:p.magnet}))});
        if(state.phase===3||state.problem){clearInterval(timer);timer=null;g.pause();g.frontend.hide();}
      },35);
    },
    result(){const state=D2Mods.status().terrorized.gather,remaining=drops.filter(d=>d.kind!=='gold'&&d.kind!=='xp');
      const intact=d=>d.p.item===d.item&&JSON.stringify(d.p.item)===d.itemJson&&d.p.value===d.value;
      const chestsUnmoved=drops.filter(d=>d.kind==='chest').every(d=>d.p.x===d.source.x&&d.p.y===d.source.y);
      const looseItemsMoved=drops.filter(d=>d.item).every(d=>d.p.x!==d.source.x||d.p.y!==d.source.y);
      const passed=state.phase===3&&!state.problem&&looseItemsMoved&&(status.chests||chestsUnmoved)&&remaining.every(d=>intact(d)&&(w.pickups.includes(d.p)&&!d.p.dead||!d.item&&d.kind!=='chest'&&d.p.dead&&d.p.magnet));
      return{passed,status:state,chestsUnmoved,looseItemsMoved,originUnchanged:performance.timeOrigin===origin,runId:g.runId,expectedGroundDrops:remaining.length,remaining:remaining.filter(d=>!d.p.dead).length,nativeGoldXpCollected:drops.filter(d=>d.kind==='gold'||d.kind==='xp').map(d=>({kind:d.kind,dead:d.p.dead})),positions:remaining.map(d=>({name:d.item?.name??d.kind,kind:d.kind,x:d.p.x,y:d.p.y,nativeCollected:d.p.dead&&d.p.magnet,radius:Math.hypot(d.p.x-w.player.x,d.p.y-w.player.y),spriteMatches:!d.p.sprite.destroyed&&d.p.sprite.x===d.p.x&&d.p.sprite.y===d.p.y})),frames:trace.length};
    },
    dispose(){if(timer)clearInterval(timer);timer=null;}
  });
  return{drops:drops.length,center,tainted:g.tainted,phase:status.phase};
}
