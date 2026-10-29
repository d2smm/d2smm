(() => {
  'use strict';
  const root=document.querySelector('[data-gallery]');if(!root)return;
  const stack=root.querySelector('[data-gallery-stack]'),cards=[...root.querySelectorAll('[data-gallery-card]')],counter=root.querySelector('[data-gallery-counter]'),viewer=root.querySelector('[data-gallery-viewer]'),large=viewer.querySelector('img'),title=viewer.querySelector('[data-gallery-title]');
  if(!cards.length)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let index=0,hoverPaused=false,timer=null;
  function clock(){clearTimeout(timer);timer=null;const paused=reduced.matches||hoverPaused||root.contains(document.activeElement)||viewer.open||document.hidden;root.dataset.paused=String(paused);if(!paused)timer=setTimeout(()=>{if(!root.isConnected)return;step(1);},5200);}
  function paint(){
    cards.forEach((card,i)=>{const distance=(i-index+cards.length)%cards.length;card.dataset.position=['front','middle','back'][distance]??'hidden';card.tabIndex=distance===0?0:-1;card.inert=distance!==0;card.setAttribute('aria-hidden',String(distance!==0));});
    counter.textContent=(index+1)+' / '+cards.length;root.dataset.index=String(index);
    if(viewer.open){const img=cards[index].querySelector('img');large.src=img.src;large.alt=img.alt;title.textContent=cards[index].dataset.title;}
    clock();
  }
  function step(amount){const cardFocused=cards.includes(document.activeElement);index=(index+amount+cards.length)%cards.length;paint();if(cardFocused)cards[index].focus({preventScroll:true});}
  for(const button of root.querySelectorAll('[data-gallery-step]'))button.addEventListener('click',()=>step(Number(button.dataset.galleryStep)));
  stack.addEventListener('pointerenter',()=>{hoverPaused=true;clock();});stack.addEventListener('pointerleave',()=>{hoverPaused=false;clock();});
  root.addEventListener('focusin',clock);
  root.addEventListener('focusout',()=>queueMicrotask(clock));
  cards.forEach((card,i)=>card.addEventListener('click',()=>{index=i;viewer.showModal();paint();}));
  viewer.querySelector('[data-gallery-close]').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('close',()=>{cards[index].focus({preventScroll:true});paint();});
  root.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}});
  document.addEventListener('visibilitychange',clock);window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',clock);
  reduced.addEventListener('change',paint);paint();
})();
