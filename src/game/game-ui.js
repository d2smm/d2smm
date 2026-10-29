(() => {
  'use strict';
  function create(getGame,changed){
    let closed=false,last='';const canvases=new Map();
    function snapshot(){
      const g=getGame(),atTitle=document.body.classList.contains('no-run')&&(!g||g.state==='select'),inGame=!!g&&!document.body.classList.contains('no-run')&&!['select','loading','travel','dead'].includes(g.state);
      const r=document.getElementById('mini-toggle')?.getBoundingClientRect();
      return{atTitle,inGame,canExit:!!g&&['playing','camp','paused'].includes(g.state),anchor:r?.width&&r.height?{x:r.x+r.width/2,y:r.y+r.height/2}:null};
    }
    function observe(){if(closed)return;const s=snapshot(),key=JSON.stringify(s);if(key!==last){last=key;changed(s);}}
    const observer=new MutationObserver(observe);observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    const interval=setInterval(observe,250);window.addEventListener('resize',observe);
    function focus(){
      if(closed)return;queueMicrotask(()=>{
        if(closed||document.querySelector('dialog[open]')||['d2-mod-system','d2-characters'].some(id=>document.getElementById(id)?.shadowRoot?.querySelector('dialog[open]')))return;
        const g=getGame(),canvas=g?.frontend?.surface?.open?g.frontend.surface.canvas:g?.app?.canvas;
        if(!canvas?.isConnected)return;
        if(!canvases.has(canvas))canvases.set(canvas,{tabindex:canvas.getAttribute('tabindex'),outline:canvas.style.outline});
        canvas.setAttribute('tabindex','-1');canvas.style.outline='none';canvas.focus({preventScroll:true});
      });
    }
    return Object.freeze({snapshot,focus,release:()=>getGame()?.input?.release?.(),dispose(){closed=true;observer.disconnect();clearInterval(interval);window.removeEventListener('resize',observe);for(const[canvas,value]of canvases){if(canvas.getAttribute('tabindex')==='-1')value.tabindex===null?canvas.removeAttribute('tabindex'):canvas.setAttribute('tabindex',value.tabindex);if(canvas.style.outline==='none')canvas.style.outline=value.outline;}canvases.clear();}});
  }
  globalThis.D2ModGameUI=Object.freeze({create});
})();
