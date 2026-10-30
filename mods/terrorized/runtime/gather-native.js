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
    const wait=method('waitForPortal'),refilter=method('refilter');
    if(!['portal','portalAt','tierVictory'].every(k=>find(wait,n=>member(n,k)).length))throw Error('Native boss portal changed');
    const dependency=one(D2SourceBindings.references(refilter),'label refresh binding'),binding=imports.get(dependency);
    if(!binding)throw Error('Native drop module is unavailable');
    const pickupSource=await read(binding.url),pickups=parse(pickupSource);
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
      evidence:{game:contract.url,pickups:binding.url,mover:mover.id.name,refilter:binding.name}
    });
  }
  globalThis.D2GatherNative=Object.freeze({prepare});
})();
