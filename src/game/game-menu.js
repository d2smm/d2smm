// Extends only the native menu factory; never reexecutes the screens module.
(() => {
  'use strict';
  const parse=source=>D2JavaScriptParser.parse(source,{ecmaVersion:'latest',sourceType:'module'});
  const key=n=>n?.name??n?.value;
  const literal=n=>n?.type==='Literal'?n.value:n?.type==='TemplateLiteral'&&!n.expressions.length?n.quasis[0].value.cooked:undefined;
  function walk(n,fn){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(x=>walk(x,fn));return;}if(!n.type)return;fn(n);for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')walk(v,fn);}
  function find(n,fn){const a=[];walk(n,x=>{if(fn(x))a.push(x);});return a;}
  function one(values,label){if(values.length!==1)throw Error('Native menu: ambiguous '+label);return values[0];}
  const references=D2SourceBindings.references;
  function rows(node){return find(node,n=>n.type==='ArrayExpression'&&n.elements.some(e=>e?.type==='ArrayExpression'&&literal(e.elements[0])==='RESUME'&&key(e.elements[1]?.property)==='resume')&&n.elements.some(e=>e?.type==='ArrayExpression'&&literal(e.elements[0])==='SAVE AND EXIT'&&key(e.elements[1]?.property)==='exit'));}
  async function prepare(gameURL,open,signal){
    async function source(url){if(new URL(url).origin!==location.origin)throw Error('Native menu module is outside the game origin');const r=await fetch(url,{cache:'force-cache',signal});if(!r.ok)throw Error('Native menu source unavailable');const text=await r.text();if(text.length>8*1024*1024)throw Error('Native menu source too large');return text;}
    const gameSource=await source(gameURL),gameAST=parse(gameSource),method=one(find(gameAST,n=>n.type==='MethodDefinition'&&key(n.key)==='gameMenu'),'gameMenu method');
    const imports=new Map();for(const n of gameAST.body)if(n.type==='ImportDeclaration')for(const s of n.specifiers)if(s.type==='ImportSpecifier')imports.set(s.local.name,{url:new URL(n.source.value,gameURL).href,name:key(s.imported)});
    const methodSource=gameSource.slice(method.start,method.end),deps=references(method.value),bindings={},candidates=[];
    for(const id of deps){const d=imports.get(id);if(!d)throw Error('Unsupported game menu dependency '+id);const ns=await import(d.url),value=ns[d.name];bindings[id]=value;if(typeof value==='function'&&rows(parse('('+value.toString()+')')).length)candidates.push({id,...d,value});}
    const selected=one(candidates,'pause screen factory'),screenSource=await source(selected.url),screenAST=parse(screenSource),declarations=new Map(),nativeImports=new Map(),resolved=new Map(),resolving=new Set();
    for(const n of screenAST.body){
      if(n.type==='ImportDeclaration')for(const s of n.specifiers){if(s.type!=='ImportSpecifier')continue;nativeImports.set(s.local.name,{url:new URL(n.source.value,selected.url).href,name:key(s.imported)});}
      else if(n.type==='FunctionDeclaration')declarations.set(n.id.name,n);
      else if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')declarations.set(d.id.name,d.init);
    }
    const nativeSource=selected.value.toString(),factory=one([...declarations.values()].filter(n=>n&&screenSource.slice(n.start,n.end)===nativeSource),'factory source');
    const array=one(rows(factory),'menu rows'),last=array.elements.at(-1);
    if(literal(last?.elements?.[0])!=='SAVE AND EXIT')throw Error('Native exit row moved');
    const insertion=last.start-factory.start,patched=nativeSource.slice(0,insertion)+'["MODS",__d2ModsOpen],'+nativeSource.slice(insertion);
    const screenShape=one(find(factory,n=>n.type==='ObjectExpression'&&['draw','key'].every(k=>n.properties.some(p=>key(p.key)===k))),'pause screen methods');
    const signatures=Object.fromEntries(['draw','key'].map(k=>{const p=screenShape.properties.find(p=>key(p.key)===k);return[k,screenSource.slice(p.start,p.end)];}));
    const globals=new Set(['Math','Object','Array','Number','String','Boolean','undefined','Infinity','NaN','document','window','navigator','performance','devicePixelRatio','Map','Set','console']);
    function pure(n){return n&&(['Literal','Identifier'].includes(n.type)||n.type==='TemplateLiteral'&&n.expressions.every(pure)||n.type==='ArrayExpression'&&n.elements.every(e=>!e||pure(e))||n.type==='ObjectExpression'&&n.properties.every(p=>p.type==='Property'&&!p.computed&&p.kind==='init'&&pure(p.value))||n.type==='UnaryExpression'&&pure(n.argument)||['BinaryExpression','LogicalExpression'].includes(n.type)&&pure(n.left)&&pure(n.right));}
    async function compile(code){const expression=parse('('+code+')').body[0].expression,needed=references(expression).filter(n=>!globals.has(n)),values=[];for(const id of needed)values.push(await resolve(id));return Function(...needed,'"use strict";return ('+code+');')(...values);}
    async function resolve(id){
      if(id==='__d2ModsOpen')return open;if(resolved.has(id))return resolved.get(id);if(resolving.has(id))throw Error('Cyclic native menu dependency '+id);resolving.add(id);let value;
      const imported=nativeImports.get(id),node=declarations.get(id);
      if(imported)value=(await import(imported.url))[imported.name];
      else if(node&&(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type)||pure(node)))value=await compile(screenSource.slice(node.start,node.end));
      else throw Error('Unsupported native menu dependency '+id);
      resolving.delete(id);resolved.set(id,value);return value;
    }
    const amended=await compile(patched),screens=new WeakSet();let disposed=false;
    bindings[selected.id]=(...args)=>{const screen=(disposed?selected.value:amended)(...args);if(!disposed)screens.add(screen);return screen;};
    const render=Function(...deps,'"use strict";return (function '+methodSource+');')(...deps.map(n=>bindings[n]));
    return{render,methodSource,screens,isNativeMenu:s=>!!s&&Object.entries(signatures).every(([k,v])=>typeof s[k]==='function'&&s[k].toString()===v),dispose:()=>{disposed=true;},evidence:{gameModule:gameURL,screenModule:selected.url,screenExport:selected.name,privateDependencies:[...resolved.keys()],sourceHash:await D2ModUpdates.digest(new TextEncoder().encode(nativeSource))}};
  }
  function create(open,{connectGame=()=>D2GameContract.connect(),currentGame=()=>globalThis.D2Characters?.currentGame?.()??globalThis.D2LootGuard?.connection().instance,prepareMenu=prepare}={}){
    let closed=false,pending=null,prepared=null,problem='',connected=false,instance=null,exitOperation=null;const patches=[],frontends=new Map(),buttons=new Set(),abort=new AbortController();
    const getGame=()=>closed?null:currentGame()??instance;
    function installFrontend(frontend){
      if(frontends.has(frontend))return;
      const original=frontend.gameMenu;if(typeof original!=='function'||original.toString()!==prepared.methodSource)throw Error('Native menu method changed');
      const entry={original,descriptor:Object.getOwnPropertyDescriptor(frontend,'gameMenu'),args:null,wrapper:null};
      entry.wrapper=function(...args){entry.args=args;return prepared.render.apply(this,args);};frontend.gameMenu=entry.wrapper;frontends.set(frontend,entry);
    }
    function fallback(){const exit=document.getElementById('pause-exit');if(!exit||exit.parentElement.querySelector('[data-d2mods-menu]'))return;const b=document.createElement('button');b.type='button';b.className=exit.className;b.textContent='MODS';b.dataset.d2modsMenu='';b.addEventListener('click',open);exit.before(b);buttons.add(b);}
    function settleExit(value,error){const op=exitOperation;if(!op)return;exitOperation=null;error?op.reject(error):op.resolve(value);}
    function invokeExit(g,track){
      if(g.camp)g.campMenu();else if(g.state==='playing')g.pause();else g.showMenu();
      const action=g.frontend?frontends.get(g.frontend)?.args?.[0]?.exit:()=>document.getElementById('pause-exit')?.click();
      if(typeof action!=='function')throw Error('Open the game menu and use Save and Exit, then update.');
      const owner=g.frontend??g.hud,key=g.frontend?'exitNote':'confirmExit',index=g.frontend?1:0,original=owner?.[key],descriptor=owner&&Object.getOwnPropertyDescriptor(owner,key);
      const wrapper=function(...args){const native=args[index],op=exitOperation;if(!native||typeof native.exit!=='function'||typeof native.resume!=='function')throw Error('Native exit confirmation changed');if(op)op.phase='confirmation';args[index]={...native,exit:(...values)=>{if(op&&exitOperation===op)op.phase='leaving';return native.exit(...values);},resume:(...values)=>{if(op&&exitOperation===op)settleExit(false);return native.resume(...values);}};return original.apply(this,args);};
      if(track&&typeof original!=='function')throw Error('Native exit confirmation is unavailable');
      if(track)owner[key]=wrapper;
      try{action();}finally{if(track&&owner[key]===wrapper){descriptor?Object.defineProperty(owner,key,descriptor):delete owner[key];}}
    }
    function observe(){
      if(closed)return;const g=getGame();if(!g)return;
      try{
        if(connected&&g.frontend){installFrontend(g.frontend);const screen=g.frontend.surface?.screen;if(g.state==='paused'&&!exitOperation&&!prepared.screens.has(screen)&&prepared.isNativeMenu(screen)){g.camp?g.campMenu():g.showMenu();}}
        const op=exitOperation;if(!op)return;if(g!==op.game)throw Error('The active game changed before exit completed');
        if(g.state==='select'&&document.body.classList.contains('no-run')){settleExit(true);return;}
        if(g.state==='playing'||g.state==='camp'){
          if(op.phase==='confirmation'||op.wasCamp){settleExit(false);return;}
          if(g.camp&&op.phase!=='leaving-camp'){op.phase='leaving-camp';invokeExit(g,false);}
        }
      }catch(error){if(exitOperation)settleExit(false,error);else if(problem!==error.message){problem=error.message;console.warn('[D2 Mods] menu observation',error);}}
    }
    async function exitToMenu(){
      if(exitOperation)throw Error('An exit is already pending');await connect();const g=getGame();
      if(g?.state==='select'&&document.body.classList.contains('no-run'))return true;
      if(!connected||!g)throw Error('The game menu is not ready. Try again shortly.');
      if(!['playing','camp','paused'].includes(g.state))throw Error('Close the current game panel or finish its choice first.');
      return new Promise((resolve,reject)=>{exitOperation={game:g,phase:'requested',wasCamp:!!g.camp,resolve,reject};try{invokeExit(g,true);observe();}catch(error){settleExit(false,error);}});
    }
    async function connect(){
      if(closed||connected||problem||pending)return;pending=(async()=>{
        const contract=await connectGame();if(!contract||closed)return;
        const candidate=await prepareMenu(contract.url,()=>{if(!closed)open();},abort.signal);if(closed){candidate.dispose();return;}prepared=candidate;
        const prototype=contract.Game.prototype,entries=['showMenu','campMenu'].map(name=>({name,original:prototype[name]}));
        if(entries.some(e=>typeof e.original!=='function'))throw Error('Native menu entry point unavailable');
        for(const{name,original}of entries){
          const wrapper=function(...args){instance=this;if(this.frontend)try{installFrontend(this.frontend);}catch(error){console.warn('[D2 Mods] menu entry',error);}const result=original.apply(this,args);if(!this.frontend)fallback();return result;};
          prototype[name]=wrapper;patches.push(()=>{if(prototype[name]===wrapper)prototype[name]=original;});
        }
        connected=true;observe();
      })().catch(error=>{if(!closed){problem=error.message;console.warn('[D2 Mods] native menu unavailable',error);}}).finally(()=>{pending=null;});await pending;
    }
    const observer=new PerformanceObserver(()=>void connect());observer.observe({type:'resource',buffered:true});const interval=setInterval(()=>{void connect();observe();},250);void connect();
    return Object.freeze({getGame,exitToMenu,status:()=>({connected,problem,exitPending:!!exitOperation,evidence:prepared?.evidence??null}),async dispose(){closed=true;settleExit(false);abort.abort();observer.disconnect();clearInterval(interval);if(pending)await pending;prepared?.dispose();for(const[frontend,e]of frontends)if(frontend.gameMenu===e.wrapper){e.descriptor?Object.defineProperty(frontend,'gameMenu',e.descriptor):delete frontend.gameMenu;if(e.args&&prepared.screens.has(frontend.surface?.screen))e.original.apply(frontend,e.args);}patches.reverse().forEach(fn=>fn());buttons.forEach(b=>b.remove());frontends.clear();}});
  }
  globalThis.D2ModGameMenu=Object.freeze({create,prepare});
})();
