// Shared lexical-binding inspection for native UI method adapters.
(() => {
  'use strict';
  function names(n,set){if(!n)return;if(n.type==='Identifier')set.add(n.name);else if(n.type==='RestElement')names(n.argument,set);else if(n.type==='AssignmentPattern')names(n.left,set);else if(n.type==='ArrayPattern')n.elements.forEach(p=>names(p,set));else if(n.type==='ObjectPattern')n.properties.forEach(p=>names(p.type==='RestElement'?p.argument:p.value,set));}
  function references(root){
    const out=new Set();
    function defaults(n,scopes){if(!n)return;if(n.type==='AssignmentPattern'){visit(n.right,scopes);defaults(n.left,scopes);}else if(n.type==='ObjectPattern')n.properties.forEach(p=>defaults(p.value??p.argument,scopes));else if(n.type==='ArrayPattern')n.elements.forEach(p=>defaults(p,scopes));}
    function visit(n,scopes=[]){
      if(!n)return;if(Array.isArray(n)){n.forEach(p=>visit(p,scopes));return;}if(typeof n!=='object'||!n.type)return;
      if(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(n.type)){
        const own=new Set();names(n.id,own);n.params.forEach(p=>names(p,own));
        function vars(p){if(!p||typeof p!=='object')return;if(Array.isArray(p)){p.forEach(vars);return;}if(p!==n&&/Function/.test(p.type??''))return;if(p.type==='VariableDeclaration'&&p.kind==='var')p.declarations.forEach(d=>names(d.id,own));for(const v of Object.values(p))vars(v);}
        vars(n.body);const next=[...scopes,own];n.params.forEach(p=>defaults(p,next));visit(n.body,next);return;
      }
      if(n.type==='BlockStatement'){const own=new Set();for(const p of n.body){if(p.type==='VariableDeclaration'&&p.kind!=='var')p.declarations.forEach(d=>names(d.id,own));if(p.type==='FunctionDeclaration'||p.type==='ClassDeclaration')names(p.id,own);}visit(n.body,[...scopes,own]);return;}
      if(['ForStatement','ForOfStatement','ForInStatement'].includes(n.type)){const own=new Set(),init=n.init??n.left;if(init?.type==='VariableDeclaration')init.declarations.forEach(d=>names(d.id,own));const next=[...scopes,own];for(const k of ['init','left','right','test','update','body'])visit(n[k],next);return;}
      if(n.type==='CatchClause'){const own=new Set();names(n.param,own);visit(n.body,[...scopes,own]);return;}
      if(n.type==='VariableDeclarator'){defaults(n.id,scopes);visit(n.init,scopes);return;}
      if(n.type==='Identifier'){if(!scopes.some(s=>s.has(n.name)))out.add(n.name);return;}
      if(n.type==='MemberExpression'){visit(n.object,scopes);if(n.computed)visit(n.property,scopes);return;}
      if(n.type==='Property'||n.type==='MethodDefinition'){if(n.computed)visit(n.key,scopes);visit(n.value,scopes);return;}
      for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')visit(v,scopes);
    }
    visit(root);return [...out];
  }
  globalThis.D2SourceBindings=Object.freeze({references});
})();
