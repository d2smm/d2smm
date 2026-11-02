// Bind one native summon-collision operation; all other spatial queries stay native.
(() => {
  'use strict';
  const key=n=>n?.name??n?.value;
  const literal=n=>n?.type==='Literal'?n.value:n?.type==='TemplateLiteral'&&!n.expressions.length?n.quasis[0].value.cooked:undefined;
  const member=(n,k)=>n?.type==='MemberExpression'&&key(n.property)===k;
  function find(node,test){const out=[];function visit(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(visit);return;}if(!n.type)return;if(test(n))out.push(n);for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')visit(v);}visit(node);return out;}
  function one(a,label){if(a.length!==1)throw Error('Unsupported combat contract: '+label+' ('+a.length+')');return a[0];}
  async function prepare(contract){
    const base=await D2GameContract.analyze(contract.url),update=base.method('update');
    if(update.async)throw Error('Asynchronous game update is unsupported');
    const stage=one(find(update,n=>n.type==='CallExpression'&&member(n.callee,'run')&&literal(n.arguments[0])==='enemies'),'enemy update');
    const call=one(base.calls(stage.arguments[1]),'enemy module'),binding=await base.binding(call);
    const response=await fetch(binding.url,{cache:'force-cache',credentials:'same-origin'});
    if(!response.ok)throw Error('Combat source is unavailable');
    const source=await response.text();if(source.length>8*1024*1024)throw Error('Combat source is too large');
    const module=D2JavaScriptParser.parse(source,{ecmaVersion:'latest',sourceType:'module'}),candidates=[];
    for(const fn of module.body){
      if(fn.type!=='FunctionDeclaration'||fn.params.length!==2||fn.body.body.length!==1)continue;
      const summon=fn.params[1].name;if(!summon)continue;
      const queries=find(fn,n=>n.type==='CallExpression'&&member(n.callee,'query')&&member(n.callee.object,'grid')&&n.arguments.length===4);
      if(queries.length!==1)continue;
      const q=queries[0],radius=q.arguments[2],callback=q.arguments[3];
      if(radius.type!=='BinaryExpression'||radius.operator!=='+'||radius.right.value!==40||!member(radius.left,'radius')||!member(radius.left.object,'def')||radius.left.object.object.name!==summon||callback.type!=='ArrowFunctionExpression'||callback.params.length!==1)continue;
      const enemy=callback.params[0].name;if(!enemy)continue;
      const writes=find(callback,n=>n.type==='AssignmentExpression');
      if(writes.length!==4||!['x','y'].every(axis=>writes.some(n=>n.operator==='+='&&member(n.left,axis)&&n.left.object.name===enemy)&&writes.some(n=>n.operator==='-='&&member(n.left,axis)&&n.left.object.name===summon)))continue;
      const values=find(callback,n=>literal(n)!==undefined).map(literal);
      if(!['breakable','actBoss',.7,.15].every(v=>values.includes(v)))continue;
      if(!find(callback,n=>n.type==='CallExpression'&&member(n.callee,'sqrt')&&n.callee.object.name==='Math').length)continue;
      const callers=module.body.filter(n=>n.type==='FunctionDeclaration'&&n!==fn&&find(n,p=>p.type==='CallExpression'&&p.callee.name===fn.id.name).length);
      if(callers.length!==1||!find(callers[0],n=>member(n,'aura')).length||!find(callers[0],n=>member(n,'dying')).length)continue;
      candidates.push({callback:source.slice(callback.start,callback.end),helper:fn.id.name});
    }
    const push=one(candidates,'passive summon push'),prototype=base.Game.prototype,original=prototype.update;
    if(!Object.getOwnPropertyDescriptor(prototype,'update')?.writable)throw Error('Game update is not writable');
    const crowd=D2QolCrowdNative.prepare({source,module,namespace:binding.namespace});
    return Object.freeze({Game:base.Game,original,pushCallback:push.callback,crowd,evidence:{game:contract.url,module:binding.url,enemyExport:binding.name,pushHelper:push.helper,crowd:crowd.evidence}});
  }
  globalThis.D2QolCombatNative=Object.freeze({prepare});
})();
