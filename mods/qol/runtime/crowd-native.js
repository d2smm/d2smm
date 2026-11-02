// Discover native movement/presentation bindings without evaluating the gameplay module again.
(() => {
  'use strict';
  const key=n=>n?.name??n?.value;
  const value=n=>n?.type==='Literal'?n.value:n?.type==='TemplateLiteral'&&!n.expressions.length?n.quasis[0].value.cooked:undefined;
  const member=(n,k)=>n?.type==='MemberExpression'&&key(n.property)===k;
  function find(node,test){const out=[];function visit(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(visit);return;}if(!n.type)return;if(test(n))out.push(n);for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')visit(v);}visit(node);return out;}
  function one(a,label){if(a.length!==1)throw Error('Unsupported crowd contract: '+label+' ('+a.length+')');return a[0];}
  function prepare({source,module,namespace}){
    const functions=module.body.filter(n=>n.type==='FunctionDeclaration'),byName=new Map(functions.map(n=>[n.id.name,n]));
    const exports=new Map(module.body.filter(n=>n.type==='ExportNamedDeclaration').flatMap(n=>n.specifiers).map(n=>[n.local.name,namespace[key(n.exported)]]));
    const constants=new Map(module.body.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations).filter(n=>n.id.type==='Identifier'&&value(n.init)!==undefined).map(n=>[n.id.name,value(n.init)]));
    const declarations=new Map(module.body.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations).filter(n=>n.id.type==='Identifier').map(n=>[n.id.name,n.init])),resolved=new Map([...exports,...constants]);resolved.set('Math',Math);
    const separates=[];
    for(const fn of functions){
      if(fn.params.length!==2||fn.body.body.length!==2||fn.body.body[1].type!=='ForOfStatement')continue;
      const enemy=fn.params[1].name,queries=find(fn,n=>n.type==='CallExpression'&&member(n.callee,'query')&&member(n.callee.object,'grid')&&n.arguments.length===4);
      if(queries.length!==1)continue;
      const q=queries[0],radius=q.arguments[2],callback=q.arguments[3];
      if(radius.type!=='BinaryExpression'||radius.operator!=='+'||value(radius.right)!==40||!member(radius.left,'radius')||radius.left.object.name!==enemy||callback.type!=='ArrowFunctionExpression'||callback.params.length!==1)continue;
      const call=callback.body;if(call.type!=='CallExpression'||call.callee.type!=='Identifier'||call.arguments.length!==2||call.arguments[0].name!==enemy||call.arguments[1].name!==callback.params[0].name)continue;
      const pair=byName.get(call.callee.name);if(!pair||pair.params.length!==2)continue;
      const writes=find(pair,n=>n.type==='AssignmentExpression');
      if(writes.length!==3||!writes.every(n=>n.operator==='+='&&n.left.object?.name===pair.params[0].name&&['x','y'].includes(key(n.left.property)))||!['x','y'].every(axis=>writes.some(n=>member(n.left,axis)))||!find(pair,n=>member(n,'dead')).length)continue;
      const calls=find(pair,n=>n.type==='CallExpression');
      if(!calls.every(n=>(n.callee.object?.name==='Math'&&['sqrt','random'].includes(key(n.callee.property)))||(member(n.callee,'get')&&n.arguments.length===1&&n.arguments[0].name===pair.params[1].name)))continue;
      const callers=functions.filter(n=>find(n,p=>p.type==='CallExpression'&&p.callee.name===fn.id.name).length);
      if(callers.length!==1||callers[0].params.length!==6||!['heading','retiring','slide'].every(k=>find(callers[0],n=>member(n,k)).length)||!find(callers[0],n=>value(n)==='actBoss').length)continue;
      separates.push({callback:source.slice(callback.start,callback.end),helper:fn.id.name,mover:callers[0].id.name,pair:pair.id.name});
    }
    const separation=one(separates,'ordinary separation');
    const reach=one(functions.filter(n=>n.params.length===2&&n.body.body.length===1&&n.body.body[0].type==='ReturnStatement'&&find(n,p=>member(p,'radius')).length===2&&find(n,p=>value(p)==='tentacle').length),'melee reach');
    const idle=one(functions.filter(n=>n.params.length===4&&['NU','WL','direction','animTime','texture'].every(k=>find(n,p=>member(p,k)).length)&&!find(n,p=>p.type==='AssignmentExpression'&&(member(p.left,'x')||member(p.left,'y'))).length),'native idle animation');
    function resolve(name,stack=[]){
      if(resolved.has(name))return resolved.get(name);
      if(stack.includes(name)||stack.length>=6)throw Error('Native presentation dependency cycle');
      const fn=byName.get(name)??declarations.get(name);
      if(!fn||!['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(fn.type)||find(fn,n=>['AssignmentExpression','UpdateExpression','NewExpression','AwaitExpression','YieldExpression'].includes(n.type)||n.type==='UnaryExpression'&&n.operator==='delete').length)throw Error('Unsupported native presentation dependency: '+name);
      const names=D2SourceBindings.references(fn),values=names.map(n=>resolve(n,[...stack,name])),result=Function(...names,'"use strict";return ('+source.slice(fn.start,fn.end)+');')(...values);resolved.set(name,result);return result;
    }
    function bind(fn,text=source.slice(fn.start,fn.end)){const names=D2SourceBindings.references(fn);return Function(...names,'"use strict";return ('+text+');')(...names.map(n=>resolve(n)));}
    const mover=byName.get(separation.mover),tail=mover.body.body.slice(-2);
    if(tail[0]?.type!=='VariableDeclaration'||tail[1]?.type!=='ExpressionStatement'||!find(tail[0],n=>member(n,'WL')).length)throw Error('Native walking presentation changed');
    const facing=one(find(tail[1],n=>n.type==='AssignmentExpression'&&member(n.left,'direction')&&n.left.object.name===mover.params[1].name),'walking direction');
    if(facing.right.type!=='CallExpression'||facing.right.callee.type!=='Identifier')throw Error('Native walking direction changed');
    const walking='function('+mover.params.slice(1).map(n=>n.name).join(',')+'){'+source.slice(tail[0].start,tail[1].end)+'}',walkingAst=D2JavaScriptParser.parse('('+walking+')',{ecmaVersion:'latest',sourceType:'module'}).body[0].expression;
    const walk=bind(walkingAst,walking),direction=resolve(facing.right.callee.name);
    const stars=[];
    for(const fn of functions){
      if(fn.params.length!==2||!find(fn,n=>member(n,'flashes')).length||!find(fn,n=>member(n,'radius')).length)continue;
      const calls=find(fn,n=>n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.arguments[4]?.type==='ArrowFunctionExpression');if(calls.length!==1)continue;
      const call=calls[0],draw=call.arguments[4],fills=find(draw,n=>n.type==='CallExpression'&&member(n.callee,'fill')),strokes=find(draw,n=>n.type==='CallExpression'&&member(n.callee,'stroke'));
      if(fills.length!==2||strokes.length!==1||find(draw,n=>n.type==='CallExpression'&&member(n.callee,'poly')).length!==2||find(draw,n=>n.type==='CallExpression'&&member(n.callee,'circle')).length!==1||!find(draw,n=>n.type==='AssignmentExpression'&&member(n.left,'blendMode')&&value(n.right)==='add').length)continue;
      const factory=byName.get(call.callee.name);if(!factory||!['flashes','push'].every(k=>find(factory,n=>member(n,k)).length)||!['maxLife','gfx'].every(k=>find(factory,n=>n.type==='Property'&&key(n.key)===k).length))continue;
      const callers=functions.filter(n=>find(n,p=>p.type==='CallExpression'&&p.callee.name===fn.id.name).length);if(callers.length!==1||!find(callers[0],n=>n.type==='CallExpression'&&member(n.callee,'random')&&n.callee.object.name==='Math').length)continue;
      const field=(object,name,fallback)=>{const p=object?.properties?.find(p=>key(p.key)===name);return p?value(p.value):fallback;};
      const styles=[...fills, ...strokes].map(n=>n.arguments[0]),life=value(call.arguments[1])??constants.get(call.arguments[1].name);
      stars.push({life,colors:styles.map(s=>field(s,'color')),alphas:styles.map(s=>field(s,'alpha',1)),width:field(styles[2],'width'),helper:fn.id.name});
    }
    const hitFlash=one(stars,'critical-hit star');
    return Object.freeze({callback:separation.callback,queryPadding:40,reach:bind(reach),idle:bind(idle),walk,direction,hitFlash,evidence:{separation:separation.helper,movement:separation.mover,pair:separation.pair,reach:reach.id.name,idle:idle.id.name,walking:'native movement presentation tail',hit:hitFlash.helper,hitEffect:'critical-strike star'}});
  }
  globalThis.D2QolCrowdNative=Object.freeze({prepare});
})();
