(() => {
  let time=10000,plays=0;const checks=[];
  const alerts=globalThis.D2LootAlerts.create({evaluate:globalThis.D2LootRules.evaluate,play:()=>plays++,now:()=>time});
  const rare=()=>({item:{name:'Elite caster ring',type:'ring',rarity:'magic',mods:[{stat:'fcr',value:10},{stat:'mana',value:120}]}});
  if(!D2LootRules.evaluate(rare().item,{testFcr:false}).match)throw Error('Alert fixture must qualify under the permanent elite rules');
  const world={pickups:[rare()]};alerts.prime(world);
  alerts.observe(world,true);checks.push({name:'Existing floor items do not alert',passed:plays===0});
  world.pickups.push(rare());alerts.observe(world,true);checks.push({name:'New match alerts',passed:plays===1});
  alerts.observe(world,true);checks.push({name:'Same item does not repeat',passed:plays===1});
  world.pickups.push(rare(),rare());alerts.observe(world,true);checks.push({name:'Burst is throttled',passed:plays===1});
  time+=10000;world.pickups.push(rare());alerts.observe(world,true);checks.push({name:'New match after cooldown alerts',passed:plays===2});
  time+=10000;world.pickups.push(rare());alerts.observe(world,false);alerts.observe(world,true);checks.push({name:'Muted drops are not replayed later',passed:plays===2});
  world.pickups.push({...rare(),discarded:true});alerts.observe(world,true);checks.push({name:'Manual discard does not alert',passed:plays===2});
  world.pickups.push(rare());alerts.reset(world);alerts.observe(world,true);checks.push({name:'Re-enable primes current floor',passed:plays===2});
  alerts.signal();checks.push({name:'Instantly collected new match can still alert',passed:plays===3});
  const next={pickups:[rare()]};time+=10000;alerts.observe(next,true);checks.push({name:'New-world baseline is quiet',passed:plays===3});
  return{passed:checks.every(c=>c.passed),passedCount:checks.filter(c=>c.passed).length,totalCount:checks.length,failures:checks.filter(c=>!c.passed)};
})();
