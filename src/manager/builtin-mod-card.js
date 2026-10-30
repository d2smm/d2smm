(() => {
  'use strict';
  function create({id,name,open,configure,report,options=[]}){
    const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
    const node=el('section',undefined,{class:'d2mods__card d2mods__builtin','data-builtin-mod':id});
    const heading=el('div',undefined,{class:'d2mods__card-heading'}),identity=el('div'),metadata=el('div','',{class:'d2mods__metadata'});
    identity.append(el('div',name,{class:'d2mods__name'}),metadata);
    const launch=open?el('button','Open',{class:'d2mods__button','data-builtin-action':'open','aria-label':'Open '+name}):null;
    heading.append(identity);if(launch){launch.addEventListener('click',()=>Promise.resolve().then(open).catch(report));heading.append(launch);}
    const row=el('label',undefined,{class:'d2mods__row'}),enabled=el('input',undefined,{type:'checkbox','data-builtin-enabled':id,'aria-label':name+' enabled'});
    const problem=el('p','',{class:'d2mods__notice',role:'status'});problem.hidden=true;
    enabled.addEventListener('change',()=>configure(id,enabled.checked).catch(report));row.append(el('span','Enabled',{class:'d2mods__row-label'}),enabled);node.append(heading,row,problem);
    const optionInputs=[];
    if(options.length){const details=el('details',undefined,{class:'d2mods__details d2mods__options','data-builtin-options':id});details.append(el('summary','Options'));
      for(const option of options){const row=el('label',undefined,{class:'d2mods__row'}),input=el('input',undefined,{type:'checkbox','data-builtin-option':option.key,'aria-label':option.label});input.addEventListener('change',()=>option.configure(input.checked).catch(report));row.append(el('span',option.label,{class:'d2mods__row-label'}),input);details.append(row);optionInputs.push({key:option.key,input});}node.append(details);}
    return Object.freeze({id,node,paint(mod,{busy,checking,updates}){enabled.checked=mod.enabled;enabled.disabled=busy;if(launch)launch.disabled=busy||!mod.enabled;for(const{key,input}of optionInputs){input.checked=!!mod.options?.[key];input.disabled=busy||!mod.enabled;}problem.textContent=mod.problem||'';problem.hidden=!mod.problem;metadata.textContent='Current '+mod.version+' · '+(updates?.latestManager?'Latest '+updates.latestManager.version:checking?'Checking latest…':'Latest not checked');}});
  }
  globalThis.D2BuiltinModCard=Object.freeze({create});
})();
