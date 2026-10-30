// Bind the loaded game's own replay method. No module is reexecuted and no
// global RNG or save writer is replaced. The C++ policy supplies only the act.
(() => {
  'use strict';
  const parse=source=>D2JavaScriptParser.parse(source,{ecmaVersion:'latest',sourceType:'module'});
  const key=n=>n?.name??n?.value;
  const member=(n,name)=>n?.type==='MemberExpression'&&key(n.property)===name;
  const save=n=>member(n,'save')&&n.object.type==='ThisExpression';
  function find(node,predicate){const result=[];function visit(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(visit);return;}if(!n.type)return;if(predicate(n))result.push(n);for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')visit(v);}visit(node);return result;}
  function one(values,label){if(values.length!==1)throw Error('Unsupported Terror replay contract: '+label);return values[0];}
  const functionAST=fn=>parse('('+fn.toString()+')').body[0].expression;
  async function prepare(contract,{read=async url=>{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw Error('Terror source is unavailable');const text=await r.text();if(text.length>8*1024*1024)throw Error('Terror source is too large');return text;},load=url=>import(url)}={}){
    const url=contract.url;if(new URL(url).origin!==location.origin)throw Error('Terror source must use the game origin');
    const source=await read(url),module=parse(source),imports=new Map(),spaces=new Map();
    for(const n of module.body)if(n.type==='ImportDeclaration')for(const s of n.specifiers)if(s.type==='ImportSpecifier')imports.set(s.local.name,{url:new URL(n.source.value,url).href,name:key(s.imported)});
    async function resolve(id){const entry=imports.get(id);if(!entry||new URL(entry.url).origin!==location.origin)throw Error('Unknown native Terror dependency');let ns=spaces.get(entry.url);if(!ns){ns=await load(entry.url);spaces.set(entry.url,ns);}return ns[entry.name];}
    const prototype=contract.Game.prototype;
    function method(name){const fn=prototype[name];if(typeof fn!=='function'||!source.includes(fn.toString()))throw Error('Native '+name+' changed');return parse('({'+fn.toString()+'})').body[0].expression.properties[0].value;}
    const start=method('startReplay'),cleared=method('showTierCleared'),ending=method('showEnding'),enter=method('enterTier');
    if(cleared.async||!find(cleared,n=>member(n,'tierDone')).length||find(cleared,n=>n.type==='CallExpression'&&member(n.callee,'showEnding')).length!==1)throw Error('Native Terror completion changed');
    if(!find(ending,n=>member(n,'ending')||member(n,'showGameOver')).length)throw Error('Native ending renderer changed');
    const importedSaveCall=(n,count)=>n?.type==='CallExpression'&&n.callee.type==='Identifier'&&imports.has(n.callee.name)&&n.arguments.length===count&&save(n.arguments[0]);
    const replayCall=one(find(start,n=>n.type==='VariableDeclarator'&&n.init?.type==='ConditionalExpression'&&importedSaveCall(n.init.consequent,3)),'replay preparation').init.consequent;
    const keptCall=one(find(start,n=>n.type==='VariableDeclarator'&&importedSaveCall(n.init,2)),'kept hero').init;
    const progressCall=one(find(enter,n=>n.type==='VariableDeclarator'&&importedSaveCall(n.init,2)),'Terror progress').init;
    const actsId=one(find(cleared,n=>member(n,'numeral')&&n.object?.type==='MemberExpression'&&n.object.computed&&n.object.object?.type==='Identifier'),'act names').object.object.name;
    const [nativeReplay,kept,progress,acts]=await Promise.all([resolve(replayCall.callee.name),resolve(keptCall.callee.name),resolve(progressCall.callee.name),resolve(actsId)]);
    if([nativeReplay,kept,progress].some(fn=>typeof fn!=='function')||!Array.isArray(acts)||!acts.length)throw Error('Native Terror bindings are unavailable');
    const replayAST=functionAST(nativeReplay);
    const returned=one(find(replayAST,n=>n.type==='ReturnStatement'&&n.argument?.type==='SequenceExpression'&&n.argument.expressions.at(-1)?.type==='Identifier'),'returned replay').argument.expressions.at(-1).name;
    const selection=one(find(replayAST,n=>n.type==='VariableDeclarator'&&n.id?.name===returned&&n.init?.type==='ObjectExpression'),'replay selection').init;
    if(!['tier','act','affixes'].every(p=>selection.properties.some(n=>key(n.key)===p))||!find(replayAST,n=>n.type==='AssignmentExpression'&&member(n.left,'replay')&&n.right?.name===returned).length)throw Error('Native replay no longer shares its stored selection');
    const frontendEnding=one(find(module,n=>n.type==='MethodDefinition'&&key(n.key)==='ending'),'ending presentation');
    const screens=[];
    for(const id of D2SourceBindings.references(frontendEnding.value).filter(id=>imports.has(id))){const value=await resolve(id);if(typeof value!=='function')continue;const ast=functionAST(value);if(find(ast,n=>member(n,'ways')).length)screens.push(value);}
    const screen=one(screens,'ending screen factory'),screenCode='('+screen.toString()+')';
    const screenShape=one(find(parse(screenCode),n=>n.type==='ObjectExpression'&&['draw','key'].every(k=>n.properties.some(p=>key(p.key)===k))),'ending screen methods');
    const signatures=Object.fromEntries(['draw','key'].map(k=>{const p=screenShape.properties.find(p=>key(p.key)===k);return[k,screenCode.slice(p.start,p.end)];}));
    const deps=D2SourceBindings.references(start),values=await Promise.all(deps.map(resolve));
    const replayIndex=deps.indexOf(replayCall.callee.name),factory=Function(...deps,'"use strict";return ({'+prototype.startReplay.toString()+'}).startReplay;');
    const original={startReplay:prototype.startReplay,showTierCleared:prototype.showTierCleared,showEnding:prototype.showEnding};
    return Object.freeze({Game:contract.Game,original,kept,progress,actCount:acts.length,
      isEnding:screen=>!!screen&&Object.entries(signatures).every(([k,s])=>typeof screen[k]==='function'&&screen[k].toString()===s),
      replay(game,tier,act){
        if(game.startReplay!==original.startReplay)throw Error('The native replay operation changed');
        const args=[...values];args[replayIndex]=(...input)=>{const choice=nativeReplay(...input);if(choice){choice.act=act;game.tierDone=null;}return choice;};
        return factory(...args).call(game,game.kit,tier);
      },
      evidence:{game:url,replay:imports.get(replayCall.callee.name),kept:imports.get(keptCall.callee.name),progress:imports.get(progressCall.callee.name),actCount:acts.length}
    });
  }
  globalThis.D2TerrorizedNative=Object.freeze({prepare});
})();
