(() => {
  'use strict';
  function create({id,name,open,configure,report}){
    const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
    const node=el('section',undefined,{class:'d2mods__card d2mods__builtin','data-builtin-mod':id});
    const heading=el('div',undefined,{class:'d2mods__card-heading'}),identity=el('div'),metadata=el('div','',{class:'d2mods__metadata'});
    identity.append(el('div',name,{class:'d2mods__name'}),metadata);
    const launch=el('button','Open',{class:'d2mods__button','data-builtin-action':'open','aria-label':'Open '+name});
    launch.addEventListener('click',()=>Promise.resolve().then(open).catch(report));heading.append(identity,launch);
    const row=el('label',undefined,{class:'d2mods__row'}),enabled=el('input',undefined,{type:'checkbox','data-builtin-enabled':id,'aria-label':name+' enabled'});
    enabled.addEventListener('change',()=>configure(id,enabled.checked).catch(report));row.append(el('span','Enabled',{class:'d2mods__row-label'}),enabled);node.append(heading,row);
    return Object.freeze({id,node,paint(mod,{busy,checking,updates}){enabled.checked=mod.enabled;enabled.disabled=busy;launch.disabled=busy||!mod.enabled;metadata.textContent='Current '+mod.version+' · '+(updates?.latestManager?'Latest '+updates.latestManager.version:checking?'Checking latest…':'Latest not checked');}});
  }
  globalThis.D2BuiltinModCard=Object.freeze({create});
})();
