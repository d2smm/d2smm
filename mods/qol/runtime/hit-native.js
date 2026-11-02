// Bind the native critical-star drawing profile; visibility policy stays in C++.
(() => {
  'use strict';
  const key=n=>n?.name??n?.value;
  const value=n=>n?.type==='Literal'?n.value:n?.type==='TemplateLiteral'&&!n.expressions.length?n.quasis[0].value.cooked:undefined;
  const member=(n,k)=>n?.type==='MemberExpression'&&key(n.property)===k;
  function find(node,test){const out=[];function visit(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(visit);return;}if(!n.type)return;if(test(n))out.push(n);for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')visit(v);}visit(node);return out;}
  function one(a,label){if(a.length!==1)throw Error('Unsupported hit-effect contract: '+label+' ('+a.length+')');return a[0];}
  function prepare({module}){
    const functions=module.body.filter(n=>n.type==='FunctionDeclaration'),byName=new Map(functions.map(n=>[n.id.name,n]));
    const constants=new Map(module.body.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations).filter(n=>n.id.type==='Identifier'&&value(n.init)!==undefined).map(n=>[n.id.name,value(n.init)]));
    const stars=[];
    for(const fn of functions){
      if(fn.params.length!==2||!find(fn,n=>member(n,'flashes')).length||!find(fn,n=>member(n,'radius')).length)continue;
      const calls=find(fn,n=>n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.arguments[4]?.type==='ArrowFunctionExpression');if(calls.length!==1)continue;
      const call=calls[0],draw=call.arguments[4],fills=find(draw,n=>n.type==='CallExpression'&&member(n.callee,'fill')),strokes=find(draw,n=>n.type==='CallExpression'&&member(n.callee,'stroke'));
      if(fills.length!==2||strokes.length!==1||find(draw,n=>n.type==='CallExpression'&&member(n.callee,'poly')).length!==2||find(draw,n=>n.type==='CallExpression'&&member(n.callee,'circle')).length!==1||!find(draw,n=>n.type==='AssignmentExpression'&&member(n.left,'blendMode')&&value(n.right)==='add').length)continue;
      const factory=byName.get(call.callee.name);if(!factory||!['flashes','push'].every(k=>find(factory,n=>member(n,k)).length)||!['maxLife','gfx'].every(k=>find(factory,n=>n.type==='Property'&&key(n.key)===k).length))continue;
      const callers=functions.filter(n=>find(n,p=>p.type==='CallExpression'&&p.callee.name===fn.id.name).length);if(callers.length!==1||!find(callers[0],n=>n.type==='CallExpression'&&member(n.callee,'random')&&n.callee.object.name==='Math').length)continue;
      const field=(object,name,fallback)=>{const p=object?.properties?.find(p=>key(p.key)===name);return p?value(p.value):fallback;};
      const styles=[...fills,...strokes].map(n=>n.arguments[0]),life=value(call.arguments[1])??constants.get(call.arguments[1].name);
      stars.push({life,colors:styles.map(s=>field(s,'color')),alphas:styles.map(s=>field(s,'alpha',1)),width:field(styles[2],'width'),helper:fn.id.name});
    }
    return Object.freeze(one(stars,'critical-hit star'));
  }
  globalThis.D2QolHitNative=Object.freeze({prepare});
})();
