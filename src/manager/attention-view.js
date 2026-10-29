(() => {
  'use strict';
  function create(launcher){
    const el=(tag,className)=>{const n=document.createElement(tag);n.className=className;return n;};
    const host=el('div','d2mods__beacon'),popover=el('section','d2mods__attention'),list=el('ul','d2mods__attention-list');
    host.hidden=true;popover.hidden=true;popover.dataset.attentionLog='';popover.setAttribute('aria-label','Important events');
    list.tabIndex=0;list.setAttribute('aria-label','Important events');list.setAttribute('role','log');list.setAttribute('aria-live','polite');list.setAttribute('aria-relevant','additions');
    const halo=el('span','d2mods__attention-halo'),jewel=el('img','d2mods__attention-gem');halo.setAttribute('aria-hidden','true');jewel.alt='';jewel.src=D2ModSkin.gemOn;jewel.width=66;jewel.height=66;jewel.draggable=false;
    launcher.append(halo,jewel);popover.append(list);host.append(launcher,popover);
    const rows=new Map();let entries=[],hovered=false,focused=false,dismissed=false,managerOpen=false,covered=null,oldVisibility='';
    function uncover(){if(covered?.style.visibility==='hidden')covered.style.visibility=oldVisibility;covered=null;}
    function visibility(){const open=entries.length>0&&!host.hidden&&!managerOpen&&!dismissed&&(hovered||focused);popover.hidden=!open;launcher.setAttribute('aria-describedby',open?'d2mods-attention-log':'');}
    popover.id='d2mods-attention-log';
    host.addEventListener('pointerenter',()=>{hovered=true;dismissed=false;visibility();});host.addEventListener('pointerleave',()=>{hovered=false;visibility();});
    host.addEventListener('focusin',()=>{focused=true;dismissed=false;visibility();});host.addEventListener('focusout',()=>queueMicrotask(()=>{focused=host.contains(host.getRootNode().activeElement);visibility();}));
    host.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popover.hidden){dismissed=true;visibility();event.preventDefault();event.stopPropagation();}});
    popover.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
    launcher.addEventListener('click',()=>{dismissed=true;visibility();});
    function paint(next){
      entries=next;launcher.dataset.attention=String(!!entries.length);halo.hidden=jewel.hidden=!entries.length;
      const wanted=new Set(entries.map(e=>e.key));for(const[key,row]of rows)if(!wanted.has(key)){row.remove();rows.delete(key);}
      let cursor=list.firstElementChild;
      for(const entry of entries){
        let row=rows.get(entry.key);if(!row){row=el('li','d2mods__attention-entry');row.dataset.attentionKey=entry.key;row.append(el('strong','d2mods__attention-title'),el('span','d2mods__attention-detail'),el('span','d2mods__attention-source'));rows.set(entry.key,row);}
        for(const[node,text]of [[row.children[0],entry.title],[row.children[1],entry.detail],[row.children[2],entry.sourceName]]){if(node.textContent!==text)node.textContent=text;node.hidden=!text;}
        if(row!==cursor)list.insertBefore(row,cursor);cursor=row.nextElementSibling;
      }
      launcher.dataset.attentionCount=String(entries.length);visibility();
      launcher.setAttribute('aria-label',entries.length?'Open Mod Manager — '+entries.length+' important '+(entries.length===1?'event':'events'):'Open Mod Manager — mods '+launcher.dataset.state);
      launcher.title=entries.length?'':'Mod Manager (M) · Mods '+launcher.dataset.state;
    }
    function display({visible,open,anchor}){
      host.hidden=!visible||!anchor;managerOpen=open;
      if(anchor){const size=anchor.size;host.style.setProperty('--d2mods-gem-size',size+'px');host.style.setProperty('--d2mods-gem-scale',String(size/70));host.style.left=Math.max(0,Math.min(innerWidth-size,anchor.x-size/2))+'px';host.style.top=Math.max(0,Math.min(innerHeight-size,anchor.y-size/2))+'px';}
      const mini=!host.hidden?document.getElementById('mini-toggle'):null;if(mini!==covered){uncover();if(mini){covered=mini;oldVisibility=mini.style.visibility;mini.style.visibility='hidden';}}visibility();
    }
    paint([]);return Object.freeze({host,paint,display,dispose:uncover});
  }
  globalThis.D2AttentionView=Object.freeze({create});
})();
