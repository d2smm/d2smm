(() => {
  'use strict';
  function el(tag,text,attrs={}){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
  function create({label,id,save,report}){
    const run=fn=>()=>Promise.resolve().then(fn).catch(report);
    const button=(text,key,fn)=>{const b=el('button',text,{'data-character-action':key});b.addEventListener('click',run(fn));return b;};
    const node=el('div',undefined,{class:'characters__name'}),name=button('',id+'-rename',()=>{editing=true;name.hidden=true;input.hidden=false;done.hidden=false;discard.hidden=false;input.value=original;input.focus();input.select();}),input=el('input',undefined,{'aria-label':label,maxlength:'40',hidden:''});name.className='characters__rename';
    let original='',editing=false;
    const reset=()=>{editing=false;input.value=original;input.hidden=true;done.hidden=true;discard.hidden=true;name.hidden=false;},cancel=()=>{reset();name.focus();};
    const commit=async()=>{if(input.value.trim()&&input.value.trim()!==original)await save(input.value);cancel();};
    const done=button('✓',id+'-rename-save',commit);done.setAttribute('data-name-confirm','');done.setAttribute('aria-label','Save name');done.hidden=true;
    const discard=button('×',id+'-rename-cancel',cancel);discard.setAttribute('data-name-cancel','');discard.setAttribute('aria-label','Cancel rename');discard.hidden=true;
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run(commit)();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}});
    node.append(name,input,done,discard);
    function paint(value,ready){original=value;name.setAttribute('aria-label','Rename '+value);name.replaceChildren(document.createTextNode(value),el('span','✎',{'aria-hidden':'true'}));if(!editing)input.value=value;name.disabled=!ready;input.disabled=!ready;done.disabled=!ready;}
    return Object.freeze({node,paint,reset});
  }
  globalThis.D2CharacterNameEditor=Object.freeze({create});
})();
