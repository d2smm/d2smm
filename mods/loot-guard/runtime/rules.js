/* Independently implemented keep rules informed by Kolton/Blizzhackers pickits.
 * D2 Survivors modifiers are the authority. See SOURCES.txt for adaptations. */
(() => {
  'use strict';
  if (globalThis.D2LootRules?.version === '3.1.0') return;
  const classes = ['amazon', 'sorceress', 'necromancer', 'paladin', 'barbarian', 'druid', 'assassin'];
  const rules = globalThis.D2LootRuleData;
  let selected=null,extra=[];
  function facts(item) {
    if (!item || !['magic', 'rare'].includes(item.rarity) || !Array.isArray(item.mods)) return null;
    const stats = Object.create(null);
    for (const mod of item.mods) {
      if (!mod || typeof mod.stat !== 'string' || !Number.isFinite(mod.value)) return null;
      // Base weapon damage is not an enhanced-damage affix.
      if (mod.implicit) continue;
      stats[mod.stat] = (stats[mod.stat] || 0) + mod.value;
    }
    const get = key => stats[key] || 0;
    const res = ['fireResist', 'coldResist', 'lightningResist', 'poisonResist'].map(get);
    const classSkills = classes.map((_, i) => get(`classskills${i}`));
    const trees = Array.from({ length: 21 }, (_, i) => get(`skilltab${i}`));
    const specific = Object.entries(stats).filter(([key]) => key.startsWith('skill:'));
    const classMax = Math.max(...classSkills) + get('allSkills');
    const treeMax = Math.max(...trees) + get('allSkills');
    const combined = Math.max(...trees.map((v, i) => v + classSkills[Math.floor(i / 3)])) + get('allSkills');
    const kind = globalThis.D2LootBaseKinds?.[item.base] || '';
    return { item, get, res, resistTotal: res.reduce((a, b) => a + b, 0),
      resistCount: res.filter(v => v >= 30).length, allResist: Math.min(...res),elementalTotal:res.slice(0,3).reduce((a,b)=>a+b,0),elementalCount:res.slice(0,3).filter(v=>v>=30).length,
      classMax, treeMax, combined, specific, skillMax: Math.max(0, ...specific.map(([, v]) => v)),
      attributes: get('strength') + get('dexterity'), kind,bestResist:Math.max(...res),
      assassinSkills:Math.max(get('skilltab18'),get('skilltab19'),get('skilltab20'))+get('classskills6'),javelinSkills:get('classskills0')+get('skilltab2'),bowSkills:get('classskills0')+get('skilltab0'),
      is: type => item.type === type, magic: item.rarity === 'magic', rare: item.rarity === 'rare',
      offensiveSupport: get('attackSpeed') >= 20 || get('deadlyStrike') >= 10 || get('lifeLeech') >= 5 || get('manaLeech') >= 5 };
  }

  function predicate(node,f){
    if(node.all)return node.all.every(child=>predicate(child,f));
    if(node.any)return node.any.some(child=>predicate(child,f));
    if(node.conditions)return node.conditions.filter(child=>predicate(child,f)).length>=node.atLeast;
    const actual=node.metric?f[node.metric]:node.field==='kind'?f.kind:node.field?f.item[node.field]:f.get(node.stat);
    return node.op==='eq'?actual===node.value:node.op==='gte'?actual>=node.value:node.op==='gt'?actual>node.value:node.op==='lte'?actual<=node.value:false;
  }
  function usePackage(pack){
    selected=pack?new Set(pack.builtinRules):null;
    extra=pack?structuredClone(pack.extraRules):[];
  }
  function evaluate(item, {testFcr=true}={}) {
    const f = facts(item);
    if (!f) return { match: false, rules: [], reasons: [], valid: false };
    const matched = rules.filter(rule => (!selected||selected.has(rule.id)) && (testFcr || rule.id !== 'test-magic-fcr') && predicate(rule.when,f));
    for(const rule of extra)if((rule.toggle!=='testFcr'||testFcr)&&predicate(rule.when,f))matched.push(rule);
    return { match: matched.length > 0, rules: matched.map(r => r.id), reasons: matched.map(r => r.reason), valid: true };
  }
  function exportPackage(pack){return structuredClone({...pack,builtinRules:[],extraRules:[...pack.builtinRules.map(id=>{const rule=rules.find(r=>r.id===id);if(!rule)throw Error('Unknown built-in rule '+id);return{id:rule.id,reason:rule.reason,when:rule.when,...id==='test-magic-fcr'?{toggle:'testFcr'}:{}};}),...pack.extraRules]});}
  Object.defineProperty(globalThis, 'D2LootRules', { value: Object.freeze({ version: '3.1.0', evaluate,usePackage,exportPackage,
    metrics:Object.freeze(['resistTotal','resistCount','allResist','elementalTotal','elementalCount','bestResist','classMax','treeMax','combined','skillMax','attributes','assassinSkills','javelinSkills','bowSkills']),
    catalog: Object.freeze(rules.map(({ id, reason, source }) => Object.freeze({ id, reason, source }))) }), configurable: true });
})();
