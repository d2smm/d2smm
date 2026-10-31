(() => {
  'use strict';
  function el(tag,text,attrs={}){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
  function create(panel){
    const node=el('div',undefined,{class:'equipment','aria-label':'Equipment'}),tip=el('section',undefined,{class:'item-tooltip',id:'d2-item-tooltip',role:'tooltip'}),close=el('button','×',{class:'item-tooltip__close','aria-label':'Close item details'}),content=el('div');
    tip.append(close,content);tip.hidden=true;panel.append(tip);
    const scope=new AbortController(),options={signal:scope.signal};let last='',anchor=null,pinned=false,timer=null,restoringFocus=false;
    const listen=(n,event,fn)=>n.addEventListener(event,fn,options);
    function hide(){clearTimeout(timer);if(anchor){anchor.setAttribute('aria-expanded','false');anchor.removeAttribute('aria-describedby');}anchor=null;pinned=false;tip.hidden=true;}
    function dismiss(){const target=anchor;hide();if(target?.isConnected){restoringFocus=true;target.focus({preventScroll:true});restoringFocus=false;}}
    function position(){if(!anchor)return;const a=anchor.getBoundingClientRect(),b=tip.getBoundingClientRect(),margin=12;
      let x=a.right+14;if(x+b.width>innerWidth-margin)x=a.left-b.width-14;
      const zoom=Number(getComputedStyle(panel).zoom)||1;
      tip.style.left=Math.max(margin,Math.min(x,innerWidth-b.width-margin))/zoom+'px';tip.style.top=Math.max(margin,Math.min(a.top,innerHeight-b.height-margin))/zoom+'px';
    }
    function show(button,item,location,pin=false){
      clearTimeout(timer);if(pin&&anchor===button&&pinned){hide();return;}
      if(!pin&&anchor===button&&pinned)return;
      if(anchor&&anchor!==button){anchor.setAttribute('aria-expanded','false');anchor.removeAttribute('aria-describedby');}anchor=button;pinned=pin;tip.setAttribute('role',pin?'dialog':'tooltip');tip.setAttribute('aria-label',item.name);close.hidden=!pin;
      const name=el('div',item.name,{class:'item-tooltip__name','data-rarity':item.rarity??'normal'}),children=[name];
      if(item.base)children.push(el('div',item.base,{class:'item-tooltip__base','data-rarity':item.rarity??'normal'}));
      for(const l of item.lines??[])children.push(el('div',l.text,{class:'item-tooltip__line','data-tone':l.unusable?'unusable':l.inert?'inert':l.tone??(l.implicit?'implicit':'mod')}));
      if(item.error||item.missing)children.push(el('p',item.error??'Item unavailable',{class:'equipment__unavailable'}));
      children.push(el('div',location,{class:'item-tooltip__location'}));content.replaceChildren(...children);tip.hidden=false;button.setAttribute('aria-expanded','true');button.setAttribute('aria-describedby',tip.id);position();
    }
    const later=()=>{if(!pinned)timer=setTimeout(hide,180);};
    listen(tip,'pointerenter',()=>clearTimeout(timer));listen(tip,'pointerleave',later);listen(close,'click',dismiss);
    listen(panel,'cancel',e=>{if(!tip.hidden){e.preventDefault();dismiss();}});
    listen(panel,'pointerdown',e=>{if(!tip.contains(e.target)&&!e.target.closest('[data-equipment-slot]'))hide();});
    listen(panel,'scroll',hide);listen(panel,'close',hide);listen(window,'resize',position);
    function paint(data,locations){
      const key=JSON.stringify([data,locations]);if(key===last)return;last=key;hide();node.replaceChildren();
      if(!data){node.append(el('p','Equipment preview unavailable',{class:'characters__subtle'}));return;}
      for(const s of data.slots){
        const item=data.items[s.slot],b=el('button',undefined,{class:'equipment__slot','data-equipment-slot':s.slot,'data-filled':String(!!item),'aria-label':s.label+(item?': '+item.name:': Empty'),'aria-expanded':'false'});
        b.style.gridArea=`${s.row} / ${s.col} / span ${s.h} / span ${s.w}`;
        if(item?.icon){const img=el('img',undefined,{src:item.icon.url,alt:'',draggable:'false'});img.style.width=item.icon.width*1.45+'px';img.addEventListener('error',()=>b.replaceChildren(el('span',item.name,{class:'equipment__fallback'})),{once:true});b.append(img);}
        else b.append(el('span',item?.name??s.label,{class:item?'equipment__fallback':'equipment__empty'}));
        if(item){const location=locations.find(i=>i.slot===s.slot)?.location??'';
          b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show(b,item,location);});b.addEventListener('pointerleave',later);
          b.addEventListener('focus',()=>{if(!restoringFocus)show(b,item,location);});b.addEventListener('blur',()=>{if(!pinned)hide();});b.addEventListener('click',()=>show(b,item,location,true));
        }
        node.append(b);
      }
    }
    return Object.freeze({node,paint,hide,dispose:()=>{hide();scope.abort();tip.remove();node.remove();}});
  }
  globalThis.D2EquipmentView=Object.freeze({create});
})();
