// Resolve the game's storage and transfer APIs from their actual consumers.
// Export letters are deliberately not part of this contract.
(() => {
  'use strict';
  const parse=source=>D2JavaScriptParser.parse(source,{ecmaVersion:'latest',sourceType:'module'});
  const key=n=>n?.name??n?.value;
  const member=(n,k)=>n?.type==='MemberExpression'&&key(n.property)===k;
  function find(node,predicate){const out=[];function visit(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(visit);return;}if(!n.type)return;if(predicate(n))out.push(n);for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')visit(v);}visit(node);return out;}
  function ast(fn){const s=Function.prototype.toString.call(fn);try{return parse('('+s+')').body[0].expression;}catch(first){try{return parse('({'+s+'})').body[0].expression.properties[0].value;}catch(second){throw Error('Shared storage syntax changed: '+second.message);}}}
  function one(values,label){const unique=[...new Set(values)];if(unique.length!==1)throw Error('Shared storage '+label+' changed ('+unique.length+' matches)');return unique[0];}
  async function prepare(contract){
    const base=await D2GameContract.analyze(contract.url),view=base.method('stashView');
    const tabRefs=find(view,n=>n.type==='MemberExpression'&&key(n.property)==='map'&&base.imports.has(n.object?.name));
    const candidates=await Promise.all(tabRefs.map(n=>base.binding({callee:n.object})));
    const tabs=one(candidates.map(d=>d.value).filter(v=>Array.isArray(v)&&JSON.stringify(v)===JSON.stringify(['personal','shared1','shared2','shared3'])),'tab IDs');
    const functions=(await Promise.all(base.calls(view).map(base.binding))).filter(d=>typeof d.value==='function');
    const getter=one(functions.filter(d=>find(ast(d.value),n=>member(n,'stashTabs')).length&&ast(d.value).params.length===3).map(d=>d.value),'item getter');
    const layoutRecord=one(functions.filter(d=>find(ast(d.value),n=>n.type==='ReturnStatement'&&n.argument?.type==='ObjectExpression'&&n.argument.properties.some(p=>key(p.key)==='placements')&&n.argument.properties.some(p=>key(p.key)==='fits')).length),'grid layout');
    const ns=layoutRecord.namespace;
    const functionsIn=Object.values(ns).filter(v=>typeof v==='function');
    const transfer=base.method('transferSave');
    const transferRef=one(find(transfer,n=>n.type==='NewExpression'&&base.imports.has(n.callee?.name)),'transfer dialog');
    const dialog=(await base.binding(transferRef)).value;
    if(typeof dialog!=='function'||!['refreshExport','import','showMain','close','replace'].every(k=>typeof dialog.prototype[k]==='function'))throw Error('Save dialog interface changed');
    const encoder=one(functionsIn.filter(fn=>{const a=ast(fn);return a.async&&find(a,n=>n.type==='NewExpression'&&n.callee.name==='CompressionStream').length;}),'save encoder');
    const readCall=one(find(ast(base.Game),n=>n.type==='PropertyDefinition'&&key(n.key)==='save'&&n.value?.type==='CallExpression'&&base.imports.has(n.value.callee?.name)),'save reader').value;
    const reader=ast((await base.binding(readCall)).value);
    const rest=find(reader,n=>n.type==='ObjectPattern').flatMap(n=>n.properties.filter(p=>p.type==='RestElement').map(p=>p.argument.name));
    if(!rest.some(name=>find(reader,n=>n.type==='ObjectExpression'&&n.properties.some(p=>p.type==='SpreadElement'&&p.argument.name===name)).length))throw Error('Native save reader no longer preserves extensions');
    const itemNamespace=await import(contract.presentation.evidence.module);
    const normalize=one(Object.values(itemNamespace).filter(fn=>{
      if(typeof fn!=='function')return false;const a=ast(fn);
      return a.params?.length===1&&find(a,n=>n.type==='ObjectPattern'&&['id','base','type','rarity','mods','socketed','forgeHeld'].every(k=>n.properties.some(p=>key(p.key)===k))).length;
    }),'item validation');
    const gridCall=one(base.calls(view).filter(n=>n.arguments.length===2&&base.imports.has(n.arguments[1]?.name)&&functions.some(d=>d.value===layoutRecord.value&&d.name===base.imports.get(n.callee.name)?.name)),'stash dimensions');
    const grid=(await base.binding({callee:gridCall.arguments[1]})).value;
    const spec=D2ManagerKernel.stash;
    if(grid?.columns!==spec.columns||grid?.rows!==spec.rows||!contract.characters)throw Error('Shared storage dimensions or character APIs changed');
    const transferAst=ast(dialog.prototype.refreshExport);
    if(!['version','actions','current','summary','code','exportBox','copyButton','downloadButton'].every(k=>find(transferAst,n=>member(n,k)).length))throw Error('Save export presentation changed');
    const importAst=ast(dialog.prototype.import);
    if(!importAst.async||!['pending','compare','importButton','fileButton','confirmView'].every(k=>find(importAst,n=>member(n,k)).length))throw Error('Save import presentation changed');
    return Object.freeze({Game:base.Game,tabs,getter,grid,layout:layoutRecord.value,normalize,dialog,encode:encoder,
      space:contract.characters.space,write:contract.characters.write,
      evidence:{game:contract.url,storageModule:layoutRecord.url,itemModule:contract.presentation.evidence.module,grid:{...grid}}});
  }
  globalThis.D2QolStashNative=Object.freeze({prepare});
})();
