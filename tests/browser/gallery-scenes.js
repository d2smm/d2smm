// Real UI and rule/adapter sources, synthetic projection and detached pickups.
// A host-verified NEW Incognito target is required; never import a player save.
async function installGalleryScenes(seed, sources) {
  'use strict';
  if (!globalThis.__D2GalleryLease?.contextId || !__D2GalleryLease.targetId)
    throw Error('Verify a newly created Incognito context and target first');
  if (location.origin !== 'https://d2survivors.lol' || !location.pathname.startsWith('/play/'))
    throw Error('Gallery fixtures require the actual upstream game origin');
  if (seed.schema !== 'd2smm.gallery-fixtures.v1' || globalThis.D2GalleryScenes)
    throw Error('Unsupported seed or gallery fixtures already installed');
  if (!D2Mods.status().session.inGame) throw Error('Enter the disposable game before installing fixtures');
  const key = 'd2-survivors/save/v1', before = localStorage.getItem(key), origin = performance.timeOrigin;
  const checks = [], actions = [];
  let view = null, frame = null, receiver = null, pickup = null;
  const settings = {enabled:true, protectMatches:false, sound:false, testFcr:false};
  const check = (name, passed) => { checks.push({name, passed:!!passed}); if (!passed) throw Error(name); };
  const unchanged = () => {
    check('Fixture preserves native save bytes', localStorage.getItem(key) === before);
    check('Fixture retains the game page', performance.timeOrigin === origin);
  };
  function clear() {
    view?.dispose(); view = null;
    frame?.contentWindow.D2LootGuard?.dispose(); frame?.remove(); frame = null;
    receiver = null; pickup = null;
    unchanged();
  }
  function characters() {
    clear(); D2Mods.close();
    if (document.getElementById('d2-characters')) throw Error('Close this test context and use a fresh one; a character view already exists');
    const record = action => { actions.push(structuredClone(action)); };
    view = D2CharacterView.create({
      status:() => structuredClone(seed.characters),
      perform:(classId, action) => record({classId, action}),
      selectClass:classId => record({classId, action:{kind:'select'}}),
      report:error => { console.error('[Gallery fixture]', error); throw error; },
      exportBackups:() => { throw Error('Gallery fixtures have no save backups'); },
      armory:() => null
    });
    view.show({classId:'amazon', section:'characters'});
    const root = document.getElementById('d2-characters').shadowRoot;
    check('Both named level-99 Amazons render', [...root.querySelectorAll('[data-character-index]')].filter(n => !n.hidden).length === 2
      && seed.characters.classes[0].characters.every((c,i) => root.querySelector(`[data-character-index="${i}"] .characters__rename`).textContent.includes(c.name)
      && root.querySelector(`[data-character-index="${i}"] .characters__status`).textContent.startsWith('Level 99')));
    check('New character is available', !root.querySelector('[data-character-action=new]').disabled && !root.querySelector('[data-character-action=new]').hidden);
    check('Character chooser excludes gear controls', root.querySelector('[data-character-section=gear]').hidden);
    unchanged(); return {scene:'amazons', bounds:root.querySelector('dialog').getBoundingClientRect().toJSON()};
  }
  async function loot() {
    clear(); D2Mods.close();
    if (!D2Mods.status().mod?.settings.enabled) throw Error('Enable Loot Guard in this isolated manager first');
    frame = document.createElement('iframe'); frame.hidden = true; document.body.append(frame);
    const w = frame.contentWindow;
    for (const source of sources.slice(0,-1)) w.eval(source);
    await w.D2LootRules.ready;
    // Controlled native boundary, exclusively in the detached test realm.
    class NativeBoundary { tick() {} loot() { return 'hide'; } refilter() {} }
    w.D2GameContract = {connect:async () => ({Game:NativeBoundary, url:'gallery-controlled-boundary',
      loot:{name:name=>name, preloadSound:()=>{}, playSound:()=>{}}})};
    w.eval(sources.at(-1)); await new Promise(resolve => setTimeout(resolve,0));
    w.D2LootGuard.configure(settings, JSON.parse(D2ModsDefaultPackage));
    w.D2LootGuard.setAttention(D2Mods.attention.source('gallery-loot','Loot Guard'));
    pickup = {item:structuredClone(seed.drop)}; receiver = new NativeBoundary(); receiver.world = {pickups:[pickup]};
    receiver.tick();
    const result = w.D2LootRules.evaluate(pickup.item,{testFcr:false});
    check(seed.drop.name+' passes its expected rule with testing off', result.match && result.rules.includes(seed.expectedRule));
    check('Real loot adapter raises an unresolved '+seed.drop.name+' notice', D2Mods.status().attention.some(e => e.source === 'gallery-loot' && e.title === seed.drop.name && e.expiresAt === null));
    unchanged(); return {scene:'loot', result, attention:D2Mods.status().attention};
  }
  function checkLootLifecycle() {
    if (!receiver || !frame) throw Error('Open the loot scene first');
    const notices = () => D2Mods.status().attention.filter(e => e.source === 'gallery-loot');
    pickup.dead = true; receiver.tick(); check('Pickup resolves the attention entry', notices().length === 0);
    pickup.dead = false; receiver.tick(); check('Unresolved loot restores attention', notices().length === 1);
    frame.contentWindow.D2LootGuard.configure({...settings,enabled:false},JSON.parse(D2ModsDefaultPackage));
    check('Disabled Loot Guard clears its attention', notices().length === 0);
    frame.contentWindow.D2LootGuard.configure(settings,JSON.parse(D2ModsDefaultPackage));
    receiver.tick(); check('Enabled Loot Guard restores unresolved loot', notices().length === 1);
    unchanged(); return {passed:true, checks:[...checks]};
  }
  function resolveLoot() {
    if (!receiver || !pickup) throw Error('Open the loot scene first');
    pickup.dead=true; receiver.tick(); unchanged();
    check('Collected demo loot clears the actual attention log', !D2Mods.status().attention.some(e=>e.source==='gallery-loot'));
    return {resolved:true};
  }
  globalThis.D2GalleryScenes = Object.freeze({characters,loot,checkLootLifecycle,resolveLoot,clear,
    status:() => ({checks:[...checks], actions:structuredClone(actions), nativeSaveUnchanged:localStorage.getItem(key)===before, origin}),
    dispose:() => { clear(); delete globalThis.D2GalleryScenes; return {passed:true,checks:[...checks]}; }
  });
  return {installed:true, context:__D2GalleryLease, scope:'Synthetic UI projection and detached adapter; no native save or world writes'};
}
