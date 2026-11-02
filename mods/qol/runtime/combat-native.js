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
    const functions=module.body.filter(n=>n.type==='FunctionDeclaration'),byName=new Map(functions.map(n=>[n.id.name,n])),decoys=[];let registeredLures=0;
    for(const factory of functions){
      if(factory.params.length!==4)continue;
      const[world,x,y,config]=factory.params.map(p=>p.name);if(!world||!x||!y||!config)continue;
      const body=find(factory,n=>n.type==='CallExpression'&&n.arguments[0]?.name===world&&literal(n.arguments[3])==='lure');if(!body.length)continue;++registeredLures;
      const queries=find(factory,n=>n.type==='CallExpression'&&member(n.callee,'query')&&member(n.callee.object,'grid')&&n.arguments[0]?.name===x&&n.arguments[1]?.name===y);
      if(queries.length!==1)continue;const query=queries[0],radius=query.arguments[2],callback=query.arguments[3];
      if(radius?.type!=='BinaryExpression'||radius.operator!=='+'||literal(radius.right)!==40||!member(radius.left,'radius')||radius.left.object.name!==config||callback?.type!=='ArrowFunctionExpression'||callback.params.length!==1)continue;
      const enemy=callback.params[0].name,calls=find(callback,n=>n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.arguments.length===5&&n.arguments[0]?.name===world&&n.arguments[1]?.name===enemy&&n.arguments[2]?.name===x&&n.arguments[3]?.name===y);
      if(calls.length!==1)continue;const mover=byName.get(calls[0].callee.name);if(!mover||mover.params.length!==5)continue;
      const actor=mover.params[1].name,writes=find(mover,n=>n.type==='AssignmentExpression'),path=n=>n.type==='Identifier'?n.name:n.type==='MemberExpression'?path(n.object)+'.'+key(n.property):'';
      const positions=writes.filter(n=>[actor+'.x',actor+'.y'].includes(path(n.left)));
      if(positions.length!==4||positions.filter(n=>n.operator==='-=').length!==2||positions.filter(n=>n.operator==='+=').length!==2||writes.length!==7||!writes.every(n=>positions.includes(n)||n.operator==='='&&[actor+'.direction',actor+'.sprite.texture',actor+'.sprite.zIndex'].includes(path(n.left))))continue;
      if(!find(mover,n=>n.type==='VariableDeclarator'&&n.init?.name===mover.params[0].name&&n.id.type==='ObjectPattern'&&n.id.properties.some(p=>key(p.key)==='player')).length)continue;
      const callers=functions.filter(n=>n!==factory&&find(n,p=>p.type==='CallExpression'&&p.callee.name===factory.id.name).length);
      if(callers.length!==1||!find(callers[0],n=>literal(n)==='dopplezon.cast').length||!find(callers[0],n=>n.type==='CallExpression'&&n.callee.name===factory.id.name&&n.arguments[3]?.type==='ObjectExpression'&&n.arguments[3].properties.some(p=>key(p.key)==='life')).length)continue;
      decoys.push({callback:source.slice(callback.start,callback.end),factory:factory.id.name,mover:mover.id.name});
    }
    const decoy=registeredLures?one(decoys,'registered Decoy movement'):null;
    if(!Object.getOwnPropertyDescriptor(prototype,'update')?.writable)throw Error('Game update is not writable');
    const hitFlash=D2QolHitNative.prepare({module});
    return Object.freeze({Game:base.Game,original,pushCallback:push.callback,decoyCallback:decoy?.callback??null,hitFlash,evidence:{game:contract.url,module:binding.url,enemyExport:binding.name,pushHelper:push.helper,hitHelper:hitFlash.helper,hitEffect:'critical-strike star',decoy:decoy?{factory:decoy.factory,mover:decoy.mover,correction:'retain native movement before obsolete lure compensation'}:null}});
  }
  globalThis.D2QolCombatNative=Object.freeze({prepare});
})();
