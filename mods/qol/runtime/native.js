// Bind native charm eligibility, packing and transfer. Packing is probed on
// disposable item copies because the game's helper normalizes coordinates.
(() => {
  'use strict';
  const key=n=>n?.name??n?.value;
  const member=(n,k)=>n?.type==='MemberExpression'&&key(n.property)===k;
  const literal=n=>n?.type==='Literal'?n.value:n?.type==='TemplateLiteral'&&!n.expressions.length?n.quasis[0].value.cooked:undefined;
  function find(node,predicate){const out=[];function walk(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(walk);return;}if(!n.type)return;if(predicate(n))out.push(n);for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')walk(v);}walk(node);return out;}
  function one(a,label){if(a.length!==1)throw Error('Native charm '+label+' changed ('+a.length+' matches)');return a[0];}
  async function prepare(contract){
    const base=await D2GameContract.analyze(contract.url),carry=base.method('carry'),move=base.method('moveCharm');base.method('changeGear');base.method('inventoryOf');
    if(carry.async||move.async||move.params.length!==4||!find(move,n=>n.type==='CallExpression'&&member(n.callee,'changeGear')).length)throw Error('Native charm transfer changed');
    const saved=one(find(move,n=>n.type==='VariableDeclarator'&&member(n.init,'save')&&n.init.object.type==='ThisExpression'),'save reference').id.name;
    const cls=move.params[0].name,item=move.params[1].name;
    const grid=one(find(move,n=>n.type==='VariableDeclarator'&&n.init?.type==='CallExpression'&&literal(n.init.arguments[2])==='charms'),'grid reference').id.name;
    const ruleCall=one(base.calls(move).filter(n=>n.arguments.length===3&&n.arguments[0]?.name===saved&&n.arguments[1]?.name===cls&&n.arguments[2]?.name===item&&find(move,v=>v.type==='VariableDeclarator'&&v.init===n).length),'restriction');
    const free=new Set(D2SourceBindings.references(move));
    const spaceCall=one(base.calls(move).filter(n=>n.arguments.length===3&&n.arguments[0]?.name===grid&&n.arguments[1]?.name===item&&base.imports.has(n.arguments[2]?.name)&&free.has(n.arguments[2].name)&&find(move,v=>v.type==='VariableDeclarator'&&v.init===n).length),'space finder');
    const getterCall=one(base.calls(base.method('charmsFor')).filter(n=>n.arguments.length===2&&member(n.arguments[0],'save')&&n.arguments[0].object.type==='ThisExpression'),'read-only inventory');
    const [rule,space,charms]=await Promise.all([base.binding(ruleCall),base.binding(spaceCall),base.binding(getterCall)]);
    const sizeRef=base.imports.get(spaceCall.arguments[2].name);if(!sizeRef)throw Error('Native charm dimensions are unavailable');
    const dimensions=(await import(sizeRef.url))[sizeRef.name];
    if([rule.value,space.value,charms.value].some(f=>typeof f!=='function')||!dimensions)throw Error('Native charm bindings are unavailable');
    const p=base.Game.prototype,original={carry:p.carry,moveCharm:p.moveCharm,changeGear:p.changeGear};
    return Object.freeze({Game:base.Game,original,dimensions,rule:rule.value,charms:charms.value,
      space(items,item){return space.value(structuredClone(items),structuredClone(item),dimensions);},
      move(game,cls,item,refresh){
        if(game.moveCharm!==original.moveCharm||game.changeGear!==original.changeGear)throw Error('Native charm transfer ownership changed');
        // Manual transfers may reveal Charms. Automatic placement keeps the
        // current panel selection; the unread dot is its notification instead.
        const hud=game.hud,reveal=hud.revealCharms,descriptor=Object.getOwnPropertyDescriptor(hud,'revealCharms');let suppress=true;
        const quiet=function(...args){return suppress?true:reveal.apply(this,args);};
        if(reveal!==undefined&&typeof reveal!=='function')throw Error('Native Charms presentation changed');
        if(reveal)hud.revealCharms=quiet;
        try{original.moveCharm.call(game,cls,item,false,refresh);}finally{suppress=false;if(reveal&&hud.revealCharms===quiet)descriptor?Object.defineProperty(hud,'revealCharms',descriptor):delete hud.revealCharms;}
      },
      evidence:{game:contract.url,rule:{url:rule.url,name:rule.name},space:{url:space.url,name:space.name},charms:{url:charms.url,name:charms.name},dimensions:{columns:dimensions.columns,rows:dimensions.rows}}
    });
  }
  globalThis.D2QolNative=Object.freeze({prepare});
})();
