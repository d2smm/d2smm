(() => {
  'use strict';
  const parser=globalThis.D2JavaScriptParser;
  const parse=source=>parser.parse(source,{ecmaVersion:'latest',sourceType:'module'});
  function walk(node,visit){if(!node||typeof node!=='object')return;if(Array.isArray(node)){for(const n of node)walk(n,visit);return;}if(typeof node.type!=='string')return;visit(node);for(const [k,v]of Object.entries(node))if(k!=='start'&&k!=='end')walk(v,visit);}
  function find(node,predicate){const out=[];walk(node,n=>{if(predicate(n))out.push(n);});return out;}
  const literal=n=>n?.type==='Literal'?n.value:n?.type==='TemplateLiteral'&&n.expressions.length===0?n.quasis[0].value.cooked:undefined;
  const key=n=>n?.type==='Identifier'?n.name:literal(n);
  const member=(n,name)=>n?.type==='MemberExpression'&&key(n.property)===name;
  const save=n=>member(n,'save')&&n.object.type==='ThisExpression';
  function fnAst(fn){
    const source=Function.prototype.toString.call(fn);
    try{return parse('('+source+')').body[0].expression;}
    catch(first){try{return parse('({'+source+'})').body[0].expression.properties[0].value;}catch(second){throw Error('Cannot inspect the native function syntax: '+second.message);}}
  }
  function names(pattern,out){if(!pattern)return;if(pattern.type==='Identifier')out.add(pattern.name);else if(pattern.type==='RestElement')names(pattern.argument,out);else if(pattern.type==='AssignmentPattern')names(pattern.left,out);else if(pattern.type==='ArrayPattern')pattern.elements.forEach(p=>names(p,out));else if(pattern.type==='ObjectPattern')pattern.properties.forEach(p=>names(p.type==='RestElement'?p.argument:p.value,out));}
  function locals(ast){const out=new Set();walk(ast,n=>{if(n.params)n.params.forEach(p=>names(p,out));if(n.type==='VariableDeclarator')names(n.id,out);if(n.type==='CatchClause')names(n.param,out);if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')names(n.id,out);});return out;}
  function one(values,label){const unique=[...new Set(values)];if(unique.length!==1)throw Error('Cannot uniquely identify '+label);return unique[0];}
  async function readSource(url){const response=await fetch(url,{cache:'force-cache',credentials:'same-origin'});if(!response.ok)throw Error('Game module source is unavailable');const source=await response.text();if(source.length>8*1024*1024)throw Error('Game module source exceeds the inspection limit');return source;}
  async function analyze(gameURL,{load=url=>import(url),read=readSource}={}){
    const url=new URL(gameURL);if(url.origin!==globalThis.origin)throw Error('Game modules must use the game origin');
    const [{Game},source]=await Promise.all([load(url.href),read(url.href)]);
    if(typeof Game!=='function')throw Error('The observed module does not expose Game');
    const imports=new Map(),module=parse(source),modules=new Map();
    for(const node of module.body)if(node.type==='ImportDeclaration')for(const s of node.specifiers)if(s.type==='ImportSpecifier'){
      const target=new URL(node.source.value,url).href;if(new URL(target).origin!==url.origin)continue;
      imports.set(s.local.name,{url:target,name:key(s.imported)});
    }
    function method(name){const fn=Game.prototype[name];if(typeof fn!=='function')throw Error('The game no longer exposes '+name);if(!source.includes(Function.prototype.toString.call(fn)))throw Error('Loaded '+name+' differs from its module source');return fnAst(fn);}
    function calls(ast){const bound=locals(ast);return find(ast,n=>n.type==='CallExpression'&&n.callee.type==='Identifier'&&imports.has(n.callee.name)&&!bound.has(n.callee.name));}
    async function binding(call){const d=imports.get(call.callee.name);if(!d)throw Error('The native function is not an imported binding');let ns=modules.get(d.url);if(!ns){ns=await load(d.url);modules.set(d.url,ns);}return{...d,value:ns[d.name],namespace:ns};}
    async function select(candidates,predicate,label){const resolved=await Promise.all(candidates.map(binding));const matches=resolved.filter(predicate),value=one(matches.map(d=>d.value),label);return matches.find(d=>d.value===value);}
    async function characterBindings(){
      const own=method('ownGear'),dollProperty=one(find(own,n=>n.type==='Property'&&key(n.key)==='doll'),'equipment doll property');
      const doll=await binding(one(calls(own).filter(n=>n===dollProperty.value),'equipment doll'));
      if(typeof doll.value!=='function')throw Error('Equipment doll is unavailable');
      const writer=await select(calls(method('changeGear')).filter(n=>n.arguments.length>=1&&save(n.arguments[0])),d=>typeof d.value==='function'&&find(fnAst(d.value),n=>n.type==='CallExpression'&&member(n.callee,'setItem')&&n.callee.object.type==='Identifier'&&n.callee.object.name==='localStorage').length>0,'native save writer');
      const gear=method('gearActions'),unequip=one(find(gear,n=>n.type==='Property'&&key(n.key)==='unequip'),'unequip action');
      const allowed=new Set(calls(gear));const placementCandidates=find(unequip.value,n=>allowed.has(n)&&n.arguments.length===3&&n.arguments[2].type==='Identifier');
      const positions=[];
      for(const c of placementCandidates){const dimension=imports.get(c.arguments[2].name);if(!dimension)continue;const ns=await load(dimension.url),size=ns[dimension.name];if(size?.columns===10&&size.rows===4)positions.push(c);}
      const space=await binding(one(positions,'inventory placement'));
      const akara=method('openAkara'),nativeCalls=calls(akara);
      const restartBranches=find(akara,n=>n.type==='IfStatement'&&find(n.test,t=>literal(t)==='restart').length>0);
      const restartCalls=restartBranches.flatMap(b=>find(b.consequent,n=>nativeCalls.includes(n)&&n.arguments.length===2&&save(n.arguments[0])));
      const restart=await binding(one(restartCalls,'native restart action'));
      const swap=await select(nativeCalls.filter(n=>n.arguments.length===3&&save(n.arguments[0])),d=>typeof d.value==='function'&&['heroes','retired'].every(p=>find(fnAst(d.value),n=>member(n,p)).length>0),'native archived-hero switch');
      for(const d of [space,restart,swap])if(typeof d.value!=='function')throw Error('Native character operation is unavailable');
      return{doll,writer,space,restart,swap};
    }
    async function lootBindings(){
      method('loot');method('tick');
      const refilter=await binding(one(calls(method('refilter')),'loot refilter'));
      const functions=[...new Set(Object.values(refilter.namespace).filter(v=>typeof v==='function'))];
      const text=one(functions.filter(fn=>{
        const s=Function.prototype.toString.call(fn);if(!s.includes('scaleMode')||!s.includes('anchor'))return false;
        const ast=fnAst(fn);if(!['FunctionExpression','ArrowFunctionExpression'].includes(ast.type))return false;
        return find(ast,n=>n.type==='AssignmentExpression'&&member(n.left,'scaleMode')&&literal(n.right)==='nearest').length>0&&find(ast,n=>n.type==='CallExpression'&&member(n.callee,'set')&&member(n.callee.object,'anchor')&&literal(n.arguments[0])===.5&&literal(n.arguments[1])===1).length>0;
      }),'raster item-label renderer');
      const name=await binding(one(calls(method('autoSell')).filter(n=>n.arguments.length===3&&['name','rarity','base'].every((p,i)=>member(n.arguments[i],p))),'localized item name'));
      const sound=await binding(one(calls(method('swapHero')).filter(n=>n.arguments[0]?.type==='TemplateLiteral'&&n.arguments[0].quasis[0].value.cooked==='select.'),'native sound playback'));
      const preload=one([...new Set(Object.values(sound.namespace).filter(fn=>typeof fn==='function'))].filter(fn=>{
        const s=Function.prototype.toString.call(fn);if(!s.includes('sounds')||!s.includes('variants'))return false;
        const ast=fnAst(fn);return ast.params?.length===1&&['sounds','variants','filter'].every(p=>find(ast,n=>member(n,p)).length>0)&&find(ast,n=>n.type==='CallExpression'&&member(n.callee,'filter')&&n.arguments[0]?.type==='Identifier'&&n.arguments[0].name===ast.params[0].name).length>0;
      }),'native sound preload');
      return{text,name:name.value,playSound:sound.value,preloadSound:()=>preload(k=>k==='taunt.baal'),evidence:{rendererModule:refilter.url,name:name.name,sound:sound.name}};
    }
    async function presentationBindings(){
      const ware=method('gearWare'),property=one(find(ware,n=>n.type==='Property'&&key(n.key)==='icon'),'item picture property');
      const icon=await binding(one(calls(ware).filter(n=>n===property.value),'item picture'));
      const descriptions=[...new Set(Object.values(icon.namespace).filter(fn=>typeof fn==='function'))].filter(fn=>{
        const source=Function.prototype.toString.call(fn);
        if(!['lines','price','implicit','unusable'].every(word=>source.includes(word)))return false;
        const ast=fnAst(fn),item=ast.params?.[0];
        return item?.type==='Identifier'&&find(ast,n=>member(n,'mods')&&n.object?.name===item.name).length>0&&
          find(ast,n=>n.type==='ObjectExpression'&&['name','base','lines','price'].every(p=>n.properties.some(v=>key(v.key)===p))).length>0;
      });
      const describe=one(descriptions,'item description model');
      const name=await binding(one(calls(method('autoSell')).filter(n=>n.arguments.length===3&&['name','rarity','base'].every((p,i)=>member(n.arguments[i],p))),'localized item name'));
      if(typeof icon.value!=='function'||typeof name.value!=='function')throw Error('Item presentation is unavailable');
      const catalogs=Object.values(icon.namespace).filter(fn=>typeof fn==='function'&&fn.length===0&&['uniques','bases','setItems','runewords','runes'].every(p=>find(fnAst(fn),n=>member(n,p)).length>0));
      const catalog=catalogs.length===1?catalogs[0]:null;
      return{icon:icon.value,describe,name:name.value,catalog,evidence:{module:icon.url,icon:icon.name,description:Object.keys(icon.namespace).find(k=>icon.namespace[k]===describe)}};
    }
    async function informationBindings(){
      method('characterView');method('mercViewOf');
      const enter=method('enterTier'),progress=await binding(one(calls(enter).filter(n=>n.arguments.length===2&&save(n.arguments[0])),'Terror progress'));
      if(typeof progress.value!=='function')throw Error('Terror progress is unavailable for this game update.');
      return{numbers:Game.prototype.characterView,merc:Game.prototype.mercViewOf,progress:progress.value};
    }
    return{Game,url:url.href,characterBindings,lootBindings,presentationBindings,informationBindings,imports,method,calls,binding};
  }
  async function isolate(bindings){
    const frame=document.createElement('iframe');frame.hidden=true;frame.dataset.d2Preparation='';
    const loaded=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));frame.srcdoc='<!doctype html><title>Mod preparation</title>';document.documentElement.append(frame);await loaded;
    const w=frame.contentWindow;let active=false,attempts=[],closed=false;
    const deny=operation=>{if(active)attempts.push(operation);throw new DOMException('Persistent effects are forbidden during preparation','InvalidStateError');};
    const storage={getItem:()=>null,setItem:()=>deny('storage write'),removeItem:()=>deny('storage removal'),clear:()=>deny('storage clear'),key:()=>null,length:0};
    Object.defineProperty(w,'localStorage',{value:storage});Object.defineProperty(w,'sessionStorage',{value:storage});
    Object.defineProperty(w,'indexedDB',{value:{open:()=>deny('database open'),deleteDatabase:()=>deny('database removal')}});
    Object.defineProperty(w.navigator,'storage',{value:{getDirectory:()=>deny('file storage'),persist:()=>deny('persistent storage')}});
    Object.defineProperty(w.navigator,'sendBeacon',{value:()=>deny('beacon')});
    w.WebSocket=class{constructor(){deny('WebSocket');}};w.XMLHttpRequest=class{constructor(){deny('XMLHttpRequest');}};
    const fetch=w.fetch.bind(w);w.fetch=(input,options)=>{if(active)return deny('network request');return fetch(input,options);};
    for(const name of ['setTimeout','setInterval','queueMicrotask','requestAnimationFrame']){const original=w[name].bind(w);w[name]=(...args)=>active?deny('asynchronous preparation'):original(...args);}
    function run(fn,args){if(closed)throw Error('Preparation context closed');attempts=[];active=true;try{const result=fn(...args);if(result&&typeof result.then==='function')throw Error('Asynchronous native preparation is unsupported');return result;}finally{active=false;if(attempts.length)throw Error('Native preparation attempted '+attempts.join(', '));}}
    try{
      const namespaces=new Map(),functions={};
      for(const name of ['swap','restart','space','doll']){const d=bindings[name];let ns=namespaces.get(d.url);if(!ns){ns=await w.eval('import('+JSON.stringify(d.url)+')');namespaces.set(d.url,ns);}const fn=ns[d.name];if(typeof fn!=='function'||fn.toString()!==d.value.toString())throw Error('Preparation module differs from the loaded game');functions[name]=fn;}
      const native={swap:(...a)=>run(functions.swap,a),restart:(...a)=>run(functions.restart,a),space:(...a)=>run(functions.space,a),doll:cls=>{
        const doll=run(functions.doll,[cls]),wrapped={...doll};for(const name of ['fits','canWear','slotFor','displaced','active']){if(typeof doll[name]!=='function')throw Error('Equipment doll contract changed');wrapped[name]=(...a)=>run(doll[name],a);}return wrapped;
      },savedRun:(s,c)=>s.heroes?.[c]?.run??null,write:bindings.writer.value};
      const item={id:'placement-probe',base:'Ring',type:'ring',rarity:'normal',name:'Ring',level:1,mods:[]},at=native.space([],item,{columns:10,rows:5});
      if(at?.x!==0||at?.y!==0||!native.doll('amazon').fits(item,'ring1'))throw Error('Native equipment contract failed its isolated check');
      return{native,evidence:Object.fromEntries(Object.entries(bindings).map(([k,d])=>[k,{url:d.url,export:d.name}])),dispose:()=>{closed=true;frame.remove();}};
    }catch(error){frame.remove();throw error;}
  }
  let pending=null,record=null,closed=false;
  function gameURL(){const urls=[...new Set(performance.getEntriesByType('resource').map(e=>e.name).filter(s=>{const u=new URL(s);return u.origin===globalThis.origin&&/\/Game(?:-[\w-]+)?\.m?js$/.test(u.pathname);}))];if(urls.length>1)throw Error('Multiple Game modules are loaded; the running module is ambiguous');return urls[0];}
  async function build(){
    const url=gameURL();if(!url)return null;
    const base=await analyze(url);let characters=null,loot=null,presentation=null,information=null,characterError='',lootError='',presentationError='',informationError='',preparation=null;
    try{const bindings=await base.characterBindings();preparation=await isolate(bindings);characters=preparation.native;}catch(error){characterError=error.message;console.warn('[D2 contract] characters',error);}
    try{loot=await base.lootBindings();}catch(error){lootError=error.message;console.warn('[D2 contract] loot',error);}
    try{presentation=await base.presentationBindings();}catch(error){presentationError=error.message;console.warn('[D2 contract] item presentation',error);}
    try{information=await base.informationBindings();}catch(error){informationError=error.message;console.warn('[D2 contract] build information',error);}
    if(closed){preparation?.dispose();return null;}
    return{Game:base.Game,url,characters,loot,presentation,information,characterError,lootError,presentationError,informationError,evidence:preparation?.evidence,dispose:()=>preparation?.dispose()};
  }
  function connect(){if(closed)return Promise.resolve(null);if(record)return Promise.resolve(record);if(pending)return pending;pending=build().then(r=>{record=r;return r;}).finally(()=>{pending=null;});return pending;}
  async function dispose(){closed=true;if(pending)await pending.catch(error=>console.info('[D2 contract] connection ended',error.message));record?.dispose();record=null;}
  globalThis.D2GameContract=Object.freeze({connect,dispose,analyze,isolate});
})();
