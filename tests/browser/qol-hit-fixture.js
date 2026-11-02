// Native weapon hits in the same admitted disposable scene; no replacement damage/effect logic.
async function installHitFixture(){
  if(!globalThis.__D2GalleryLease?.contextId||!globalThis.D2CrowdProof)throw Error('Owned crowd scene required');
  const{g,w,enemies,ns,step}=D2CrowdProof.scene(),url=D2Mods.status().qol.combat.evidence.module;
  const source=await(await fetch(url,{cache:'force-cache'})).text(),ast=D2JavaScriptParser.parse(source,{ecmaVersion:'latest',sourceType:'module'});
  const functions=ast.body.filter(n=>n.type==='FunctionDeclaration'),exports=new Map(ast.body.filter(n=>n.type==='ExportNamedDeclaration').flatMap(n=>n.specifiers).map(n=>[n.local.name,ns[n.exported.name]]));
  const one=(values,label)=>{if(values.length!==1)throw Error(label+' binding changed');return values[0];};
  function find(n,test){if(!n||typeof n!=='object')return [];if(Array.isArray(n))return n.flatMap(v=>find(v,test));return [...(test(n)?[n]:[]),...Object.values(n).flatMap(v=>typeof v==='object'?find(v,test):[])];}
  const crush=one(functions.filter(n=>n.params.length===4&&find(n,p=>p.type==='MemberExpression'&&p.property.name==='crushingBlow').length),'Crushing blow');
  const attack=exports.get(one(functions.filter(n=>find(n,p=>p.type==='CallExpression'&&p.callee.name===crush.id.name).length),'Native weapon hit').id.name);
  const stats=one(Object.values(ns).filter(v=>typeof v==='function'&&v.length===1&&v.toString().includes('crushingBlow:0')),'Native weapon stats');
  const effects=exports.get(one(functions.filter(n=>n.params.length===2&&['sprite.texture','framesPerDirection','until','live[r++]'].every(s=>source.slice(n.start,n.end).includes(s))),'Native overlay update').id.name);
  if(typeof attack!=='function'||typeof effects!=='function')throw Error('Native hit exports unavailable');
  const enemy=enemies[0];let created=[];
  function clear(){for(let i=0;i<20;i++)step(1/60);effects(w,10);}
  function strike(){
    D2CrowdProof.stop();D2Mods.close();clear();w.player.x=0;w.player.y=0;
    enemies.forEach((e,i)=>{e.x=i? -240+(i%6)*28:100;e.y=i?-110+Math.floor(i/6)*30:-30;});step(0);
    enemy.life=enemy.maxLife=1000000;enemy.anim=null;enemy.mode='walk';enemy.dead=false;
    const weapon=stats(w.player),previous={crit:weapon.crit,deadly:weapon.deadly,crushingBlow:weapon.crushingBlow,element:w.element,source:w.source},before=enemy.life,existing=new Set(w.flashes);
    try{weapon.crit=1;weapon.deadly=0;weapon.crushingBlow=0;w.element='physical';w.source='attack';attack(w,enemy,10);}finally{weapon.crit=previous.crit;weapon.deadly=previous.deadly;weapon.crushingBlow=previous.crushingBlow;w.element=previous.element;w.source=previous.source;}
    created=w.flashes.filter(f=>!existing.has(f));g.render();const stars=created.map(f=>f.gfx);
    return {damage:before-enemy.life,stars:stars.length,renderable:stars.map(s=>s.renderable),enabled:D2Mods.status().qol.combat.hideHitStars,guard:g.frameGuard.failed};
  }
  globalThis.D2HitProof=Object.freeze({strike,stars:()=>created.map(f=>f.gfx),clear,scene:()=>({g,w,enemy,stats,attack,effects})});
  return {ready:true,effect:'native critical-strike star'};
}
