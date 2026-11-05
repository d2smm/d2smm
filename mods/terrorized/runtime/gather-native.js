// Resolve the loaded game's pickup presentation, keeping its labels and sprites
// together. The original native mover is rebound only at its dirty-layout call.
(() => {
  'use strict';
  const parse=s=>D2JavaScriptParser.parse(s,{ecmaVersion:'latest',sourceType:'module'});
  const key=n=>n?.name??n?.value;
  const member=(n,k)=>n?.type==='MemberExpression'&&key(n.property)===k;
  function find(n,p){const out=[];function walk(v){if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(walk);return;}if(!v.type)return;if(p(v))out.push(v);for(const[k,x]of Object.entries(v))if(k!=='start'&&k!=='end')walk(x);}walk(n);return out;}
  function one(a,name){if(a.length!==1)throw Error('Native drop '+name+' changed');return a[0];}
  async function read(url){if(new URL(url).origin!==location.origin)throw Error('Drop source must use the game origin');const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw Error('Drop source is unavailable');const s=await r.text();if(s.length>8*1024*1024)throw Error('Drop source is too large');return s;}
  async function prepare(contract){
    const source=await read(contract.url),ast=parse(source),p=contract.Game.prototype;
    const imports=new Map();for(const n of ast.body)if(n.type==='ImportDeclaration')for(const s of n.specifiers)if(s.type==='ImportSpecifier')imports.set(s.local.name,{url:new URL(n.source.value,contract.url).href,name:key(s.imported)});
    function method(name){if(typeof p[name]!=='function'||!source.includes(p[name].toString()))throw Error('Native '+name+' changed');return parse('({'+p[name].toString()+'})').body[0].expression.properties[0].value;}
    const wait=method('waitForPortal'),refilter=method('refilter'),update=method('update');
    if(!['portal','portalAt','tierVictory'].every(k=>find(wait,n=>member(n,k)).length))throw Error('Native boss portal changed');
    const dependency=one(D2SourceBindings.references(refilter),'label refresh binding'),binding=imports.get(dependency);
    if(!binding)throw Error('Native drop module is unavailable');
    const pickupSource=await read(binding.url),pickups=parse(pickupSource);
    const pickupCall=one(find(update,n=>n.type==='CallExpression'&&member(n.callee,'gainXp')&&n.arguments[0]?.type==='CallExpression'&&imports.has(n.arguments[0].callee?.name)),'update consumer').arguments[0];
    const portalCall=one(find(update,n=>n.type==='CallExpression'&&member(n.callee,'waitForPortal')),'post-pickup portal boundary');
    const pickupBinding=imports.get(pickupCall.callee.name);
    if(pickupCall.start>=portalCall.start||pickupBinding.url!==binding.url||!find(update,n=>member(n,'frameGuard')).length)throw Error('Native pickup/update order changed');
    const pickupFunction=(await import(pickupBinding.url))[pickupBinding.name];
    const pickupAst=parse('('+Function.prototype.toString.call(pickupFunction)+')').body[0].expression;
    if(pickupAst.async||!pickupSource.includes(pickupFunction.toString())||!['pickups','dead','flippy','loot','carry','sell'].every(k=>find(pickupAst,n=>member(n,k)).length))throw Error('Native pickup pass changed');
    const radius=one(find(pickupAst,n=>n.type==='VariableDeclarator'&&n.init?.type==='BinaryExpression'&&n.init.operator==='+'&&member(n.init.left,'radius')&&n.init.right.type==='Identifier'),'item collection radius');
    const margin=one(pickups.body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations:[]).filter(n=>n.id?.name===radius.init.right.name&&n.init?.type==='Literal'),'radius margin').init.value;
    if(typeof margin!=='number'||!Number.isFinite(margin)||margin<=0)throw Error('Native collection margin changed');
    const accepted=one(find(pickupAst,n=>n.type==='IfStatement'&&find(n.test,v=>v.type==='CallExpression'&&member(v.callee,'carry')).length),'accepted pickup branch');
    const destroyCall=one(find(accepted.consequent,n=>n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.arguments.length===2),'accepted drop cleanup');
    const destroy=one(pickups.body.filter(n=>n.type==='FunctionDeclaration'&&n.id.name===destroyCall.callee.name),'cleanup helper');
    if(!find(accepted.consequent,n=>n.type==='ContinueStatement').length||!find(destroy,n=>n.type==='AssignmentExpression'&&member(n.left,'dead')).length||!find(destroy,n=>n.type==='CallExpression'&&member(n.callee,'destroy')).length)throw Error('Native collected-drop lifetime changed');
    const mover=one(pickups.body.filter(n=>n.type==='FunctionDeclaration'&&n.params.length===4&&find(n,v=>v.type==='AssignmentExpression'&&v.operator==='+='&&member(v.left,'labelY')).length&&['x','y'].every(k=>find(n,v=>v.type==='AssignmentExpression'&&member(v.left,k)).length)&&find(n,v=>v.type==='CallExpression'&&member(v.callee,'set')&&member(v.callee.object,'position')).length>=2),'position helper');
    const dirtyName=one(D2SourceBindings.references(mover),'layout dependency'),dirty=one(pickups.body.filter(n=>n.type==='FunctionDeclaration'&&n.id.name===dirtyName),'layout helper');
    const trueValue=n=>n?.value===true||n?.type==='UnaryExpression'&&n.operator==='!'&&n.argument?.value===0;
    if(!find(dirty,n=>n.type==='AssignmentExpression'&&member(n.left,'dirty')&&trueValue(n.right)).length)throw Error('Native label layout changed');
    let labelsDirty=false;
    const move=Function(dirtyName,'"use strict";return ('+pickupSource.slice(mover.start,mover.end)+');')(()=>{labelsDirty=true;});
    const original={waitForPortal:p.waitForPortal,refilter:p.refilter};
    return Object.freeze({Game:contract.Game,original,
      begin(){labelsDirty=false;},move,
      finish(game){if(labelsDirty){labelsDirty=false;if(game.refilter!==original.refilter)throw Error('Native label refresh ownership changed');original.refilter.call(game);}},
      evidence:{game:contract.url,pickups:binding.url,mover:mover.id.name,refilter:binding.name,pickupUpdate:pickupBinding.name,pickupBeforePortal:true,itemRadiusMargin:margin}
    });
  }
  globalThis.D2GatherNative=Object.freeze({prepare});
})();
