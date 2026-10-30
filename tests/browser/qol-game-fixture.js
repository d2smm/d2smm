// Host-verified fresh Incognito game only. Exercises native pickup and transfer
// with disposable charms, never imports or restores a player's save.
async function installQolFixture(){
  const game=D2Characters.currentGame(),cls=game?.world?.player?.cls;
  if(!globalThis.__D2GalleryLease?.contextId||!__D2GalleryLease.targetId||location.origin!=='https://d2survivors.lol'||!game?.camp||game.level!==1||game.inventoryOf(cls).length||(game.save.charmsByClass?.[cls]?.length??0))throw Error('Fresh isolated camp required');
  if(!D2Mods.status().qol.connected||D2Mods.status().qol.problem)throw Error('QoL must be connected');
  game.tainted=true;let serial=0;const created=[];
  const bag=()=>game.save.inventoryByClass?.[cls]??[],charms=()=>game.save.charmsByClass?.[cls]??[];
  function occurrences(id){let count=0;function walk(n){if(!n||typeof n!=='object')return;if(n.id===id)count++;for(const v of Object.values(n))walk(v);}walk(game.save);return count;}
  function charm(){const item={id:'qol-fixture-'+(++serial),type:'charm',base:'Grand Charm',name:'Grand Charm of Life',rarity:'magic',level:1,mods:[{stat:'life',value:5}]};created.push(item);return item;}
  async function settle(test){for(let i=0;i<100&&!test();i++)await new Promise(r=>setTimeout(r,20));if(!test())throw Error('Unread notification did not settle');}
  const unread=()=>D2Mods.status().badges.marks.some(m=>m.target==='charms'&&m.context===cls);
  globalThis.D2QolProof=Object.freeze({game,cls,created,bag,charms,occurrences,settle,unread,
    async pickup(){const item=charm(),life=game.world.player.maxLife,reveal=game.hud.revealCharms;if(!game.carry(item))throw Error('Native pickup failed');await settle(unread);const result={passed:charms().includes(item)&&!bag().includes(item)&&occurrences(item.id)===1,id:item.id,at:item.at,maxLifeBefore:life,maxLifeAfter:game.world.player.maxLife,unread:unread(),nativeRevealRestored:game.hud.revealCharms===reveal,statsUnchanged:JSON.stringify(item.mods)==='[{"stat":"life","value":5}]'};if(!result.passed)throw Error('Charm did not transfer exactly once');return result;},
    async fullGrid(){while(charms().length<5){if(!game.carry(charm()))throw Error('Fixture pickup failed');}const item=charm();if(!game.carry(item))throw Error('Normal inventory pickup failed');await new Promise(r=>setTimeout(r,100));const result={passed:bag().includes(item)&&!charms().includes(item)&&occurrences(item.id)===1,charms:charms().length,bag:bag().length,id:item.id,placements:charms().map(c=>c.at)};if(!result.passed)throw Error('Full Charm grid did not retain the item in inventory');return result;},
    openInventory(){D2Mods.close();game.resume();game.frontend?.hide();game.openCharacter('camp',cls);},
    closeInventory(){game.hud.closeCharacter();}
  });
  return{cls,tainted:game.tainted};
}
