(() => {
  'use strict';
  function install(hud,core,isEnabled){
    const original=hud.stashTabs,own=Object.getOwnPropertyDescriptor(hud,'stashTabs'),keys=['personal',...D2ManagerKernel.stash.keys,'uniques'];
    if(typeof original!=='function'||typeof hud.canvas!=='function')throw Error('Shared stash renderer changed');
    const wrapper=function(container,view,select,collect){
      const result=original.call(this,container,view,select,collect);if(!isEnabled())return result;
      const buttons=[...container.querySelectorAll('[data-stash-tab]')];
      const personal=buttons.find(n=>n.dataset.stashTab==='personal'),unique=buttons.find(n=>n.dataset.stashTab==='uniques'),first=buttons.find(n=>n.dataset.stashTab==='shared1');
      if(buttons.length!==5||!personal||!unique||!first)throw Error('Shared stash tab layout changed');
      const left=parseFloat(personal.style.left),pw=parseFloat(personal.style.width),uw=parseFloat(unique.style.width),span=parseFloat(unique.style.left)+uw-left,gap=parseFloat(first.style.left)-left-pw;
      const sizes=keys.map((k,i)=>({left:core.d2smm_stash_left(i,left,span,pw,uw,gap),width:core.d2smm_stash_width(i,span,pw,uw,gap)}));
      if(sizes.some(r=>r.width<0||!Number.isFinite(r.left)))throw Error('Shared stash tabs do not fit the native bar');
      const next=keys.map((k,i)=>{
        const button=i===0?personal:i===7?unique:document.createElement('button'),selected=k===view.open;
        button.className='stash-tab'+(selected?' open':'');button.dataset.stashTab=k;button.style.left=sizes[i].left+'px';button.style.width=sizes[i].width+'px';button.style.top=personal.style.top;button.style.height=personal.style.height;
        if(i>0&&i<7){const box=document.createElement('div');box.className='box';box.append(this.canvas(String(i),'font16',selected?'white':'grey',{shadow:true}));button.replaceChildren(box);button.setAttribute('aria-label','Shared '+i);button.onclick=event=>{event.stopPropagation();this.hideHover();select(k);};}
        button.setAttribute('aria-pressed',String(selected));return button;
      });
      const tail=[...container.childNodes].filter(n=>!buttons.includes(n));container.replaceChildren(...next,...tail);return result;
    };
    hud.stashTabs=wrapper;return()=>{if(hud.stashTabs===wrapper)own?Object.defineProperty(hud,'stashTabs',own):delete hud.stashTabs;};
  }
  globalThis.D2QolStashView=Object.freeze({install});
})();
