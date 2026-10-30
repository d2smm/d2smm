(() => {
  'use strict';
  if (globalThis.D2LootGuard?.version === '2.1.0') return;
  if (globalThis.D2LootGuard?.dispose) globalThis.D2LootGuard.dispose();
  else globalThis.D2LootGuard?.stop();
  document.getElementById('d2-loot-guard-status')?.remove();
  let config = { enabled: false, protectMatches: true, sound: true, testFcr: true };
  let instance = null, api = null, installed = false, inRefilter = false, duringTick=false,packGeneration=0;
  let status = 'Waiting for extension', error = '', lastStatus = 0, checked = 0, matched = 0;
  const recent = [], seen = new WeakSet(), cache = new WeakMap(), labels = new Map();
  const alerts=globalThis.D2LootAlerts.create({evaluate:item=>result(item),play:()=>api?.playSound('taunt.baal',{take:0,volume:0.7})});
  let badge = null, observer = null, connecting = false, disposed=false;
  let audioWorld=null;
  let attention=null,attentionWorld=null,attentionSequence=0;
  const attentionPickups=new Map();
  function clearAttention(){attention?.clear();attentionPickups.clear();attentionWorld=null;}
  function observeAttention(world){
    if(!attention)return;
    if(!active()||!world){clearAttention();return;}
    if(attentionWorld!==world){clearAttention();attentionWorld=world;}
    const current=new Set();
    for(const pickup of world.pickups||[]){
      if(pickup.dead||pickup.discarded||!pickup.item)continue;
      const value=result(pickup.item);if(!value.match)continue;current.add(pickup);
      let id=attentionPickups.get(pickup);if(!id){id='drop-'+(++attentionSequence);attentionPickups.set(pickup,id);}
      attention.raise(id,{title:api.name(pickup.item.name,pickup.item.rarity,pickup.item.base),detail:value.reasons[0]||'Matching drop',untilResolved:true});
    }
    for(const[pickup,id]of attentionPickups)if(!current.has(pickup)){attention.resolve(id);attentionPickups.delete(pickup);}
  }
  function active() { return config.enabled && !error; }
  function result(item) {
    if (!item || typeof item !== 'object') return { match: false, reasons: [], rules: [] };
    const signature = [packGeneration,config.testFcr,item.name,item.base, item.type, item.rarity, ...(item.mods || []).map(m => `${m.stat}:${m.value}:${!!m.implicit}`)].join('|');
    let entry = cache.get(item);
    if (!entry || entry.signature !== signature) {
      entry = { signature, value: globalThis.D2LootRules.evaluate(item,{testFcr:config.testFcr}) };
      cache.set(item, entry);
    }
    return entry.value;
  }
  function note(item, value) {
    if (!value.valid || seen.has(item)) return;
    seen.add(item); checked++;
    if (!value.match) return;
    matched++;
    recent.unshift({ name: String(item.name).slice(0,160), base: String(item.base).slice(0,100),
      rarity: item.rarity, reasons: value.reasons.slice(0,3) });
    recent.splice(15);
  }
  function restore(pickup, entry) {
    const { original, decorated } = entry;
    if (!pickup.dead && pickup.label === decorated && !original.destroyed && !decorated.destroyed && decorated.parent) {
      original.position.copyFrom(decorated.position);
      original.zIndex = decorated.zIndex;
      original.visible = decorated.visible;
      decorated.parent.addChild(original);
      pickup.label = original;
      decorated.destroy();
    } else if (!original.destroyed) original.destroy();
    // A native replacement or pickup already owns/disposed its current label.
    if (pickup.label !== decorated && !decorated.destroyed) decorated.destroy();
    labels.delete(pickup);
  }
  function restoreAll() {
    for (const [pickup, entry] of labels) restore(pickup, entry);
    if (instance?.world && api && !inRefilter) {
      inRefilter = true;
      try { api.refilter(instance.world); } finally { inRefilter = false; }
    }
  }
  function fault(problem) {
    console.error('[D2 Loot Guard]', problem);
    error = String(problem?.message || problem).slice(0,180);
    config.enabled = false;
    clearAttention();
    try { restoreAll(); } catch (cleanupError) { console.error('[D2 Loot Guard] cleanup', cleanupError); }
    publish(true);
  }
  function beforeTick(game) {
    instance = game;
    if(game.world&&audioWorld!==game.world&&api){audioWorld=game.world;api.preloadSound();}
    alerts.prime(game.world);
    if (!active() || !game.world) return;
    for (const pickup of game.world.pickups || []) {
      if (pickup.dead || pickup.discarded || !pickup.item) continue;
      const value = result(pickup.item);
      note(pickup.item, value);
      if (value.match && config.protectMatches) delete pickup.loot;
    }
  }
  function decorate(pickup, game) {
    let entry = labels.get(pickup);
    if (entry && pickup.label !== entry.decorated) { restore(pickup, entry); entry = null; }
    if (!entry) {
      const original = pickup.label;
      if (!original || original.destroyed || !original.parent) return false;
      const name = api.name(pickup.item.name, pickup.item.rarity, pickup.item.base);
      const decorated = api.text(`*** ${name} ***`, 'gold', undefined, !!pickup.missing);
      decorated.position.copyFrom(original.position);
      decorated.zIndex = original.zIndex;
      decorated.visible = original.visible;
      const parent = original.parent;
      parent.removeChild(original);
      parent.addChild(decorated);
      pickup.label = decorated;
      entry = { original, decorated, world: game.world };
      labels.set(pickup, entry);
    }
    // Keep protected magic labels visible at normal on-screen distances.
    entry.decorated.visible = !pickup.flippy && pickup.loot !== 'hide';
    return true;
  }
  function afterTick(game) {
    const world = game.world;
    observeAttention(world);
    for (const [pickup, entry] of labels) {
      if (!active() || pickup.dead || entry.world !== world || !world?.pickups?.includes(pickup) || !result(pickup.item).match) restore(pickup, entry);
    }
    if (!active() || !world) { publish(); return; }
    alerts.observe(world,config.sound);
    let changed = false;
    for (const pickup of world.pickups || []) {
      if (pickup.dead || pickup.discarded || !pickup.item) continue;
      const value = result(pickup.item);
      note(pickup.item, value);
      if (!value.match) continue;
      const had = labels.has(pickup);
      decorate(pickup, game);
      changed ||= !had && labels.has(pickup);
    }
    if (changed && !inRefilter) {
      inRefilter = true;
      try { api.refilter(world); } finally { inRefilter = false; }
      for (const [pickup, entry] of labels) entry.decorated.visible = !pickup.flippy && pickup.loot !== 'hide';
    }
    publish();
  }
  function installHooks() {
    if (installed || !api) return;
    const { prototype, originalLoot, originalTick } = api;
    if (prototype.loot !== originalLoot || prototype.tick !== originalTick) throw Error('Another modification changed the game hooks');
    api.lootHook = function (item) {
      if (active()) {
        try {
          instance = this;
          const value = result(item),first=item&&typeof item==='object'&&!seen.has(item); note(item, value);
          if(first&&duringTick&&!inRefilter&&config.sound&&value.match)alerts.signal();
          if (value.match && config.protectMatches) return 'pick';
        } catch (problem) { fault(problem); }
      }
      return originalLoot.call(this, item);
    };
    api.tickHook = function (...args) {
      try { beforeTick(this); } catch (problem) { fault(problem); }
      let value;
      duringTick=true;
      try { value=originalTick.apply(this,args); } finally { duringTick=false; }
      try { afterTick(this); } catch (problem) { fault(problem); }
      return value;
    };
    prototype.loot = api.lootHook;
    prototype.tick = api.tickHook;
    installed = true;
  }
  function uninstallHooks() {
    if (!installed) return;
    const { prototype } = api;
    if (prototype.loot === api.lootHook) prototype.loot = api.originalLoot;
    if (prototype.tick === api.tickHook) prototype.tick = api.originalTick;
    installed = false;
  }
  function snapshot() {
    return { version:'2.1.0', status: error ? 'Update needed' : !config.enabled ? 'Disabled' :
      !api ? status : !installed ? 'Disconnected' : 'Active', detail:error,
      contractReady:!!api,gameModule:api?.url??null,enabled:config.enabled,protectMatches:config.protectMatches,
      sound:config.sound,testFcr:config.testFcr,soundRequests:alerts.requests(),checked,matched,onGround:labels.size,recent:recent.slice() };
  }
  function publish(force = false) {
    if(disposed)return;
    if (!force && performance.now() - lastStatus < 2000) return;
    lastStatus = performance.now();
    const value = snapshot();
    window.dispatchEvent(new CustomEvent('d2mods:loot-status',{detail:value}));
  }
  async function connect() {
    if (api || connecting || error || disposed) return;
    connecting = true;
    try {
      const contract=await globalThis.D2GameContract.connect();
      if(!contract){status='Waiting for game';publish();return;}
      if(!contract.loot)throw Error(contract.lootError||'Loot integration is unavailable');
      await globalThis.D2Characters?.ensureHooks();
      if(disposed)return;
      const {Game,loot}=contract;
      api={...loot,url:contract.url,prototype:Game.prototype,originalLoot:Game.prototype.loot,originalTick:Game.prototype.tick,
        refilter:world=>{if(instance?.world===world)instance.refilter();}};
      api.preloadSound();
      observer?.disconnect();observer=null;
      if (active()) installHooks();
      publish(true);
    } catch (problem) { fault(problem); }
    finally { connecting=false; }
  }
  function configure(value,pack){
    if (['enabled','protectMatches','sound','testFcr'].some(key=>typeof value?.[key]!=='boolean')) throw Error('Invalid loot settings');
    if(pack){globalThis.D2LootRules.usePackage(pack);packGeneration++;}
    const changed = !!pack || Object.keys(config).some(key=>config[key]!==value[key]);
    config = { enabled:value.enabled, protectMatches:value.protectMatches, sound:value.sound, testFcr:value.testFcr };
    try {
      if (active() && api) installHooks();
      if (!active()) { clearAttention();uninstallHooks();if(changed) restoreAll(); }
      else if (changed && instance?.world) { alerts.reset(instance.world);api.refilter(instance.world);afterTick(instance); }
    } catch(problem) { fault(problem); }
    connect();publish(true);
  }
  const watchdog = setInterval(() => {
    if (!api && !error) connect();
    if(api&&!disposed)try{observeAttention(instance?.world);}catch(problem){fault(problem);}
  },5000);
  observer = new PerformanceObserver(() => connect());observer.observe({type:'resource',buffered:true});
  const diagnostics = Object.freeze({version:'2.1.0',snapshot,configure,evaluate:globalThis.D2LootRules.evaluate,
    setAttention:source=>{clearAttention();attention?.dispose();attention=source;observeAttention(instance?.world);},
    stop:()=>{config.enabled=false;clearAttention();uninstallHooks();restoreAll();publish(true);},
    dispose:()=>{disposed=true;config.enabled=false;clearAttention();attention?.dispose();uninstallHooks();try{restoreAll();}finally{clearInterval(watchdog);observer?.disconnect();document.getElementById('d2-loot-guard-status')?.remove();}},
    // Read-only access for the owning native proof; no production objects decorated.
    connection:()=>({attached:!!api,installed,hasWorld:!!instance?.world,instance})});
  Object.defineProperty(globalThis,'D2LootGuard',{value:diagnostics,configurable:true});
  window.addEventListener('pagehide',()=>{clearAttention();clearInterval(watchdog);observer?.disconnect();uninstallHooks();},{once:true});
  connect();publish(true);
})();
