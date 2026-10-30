// Editorial layers for the promo only. No game state or browser bookmarks change.
(() => {
  if (globalThis.D2Promo) throw Error('Promo presentation already mounted');
  const style=document.createElement('style');
  style.textContent=`
.promo-browser{position:fixed;z-index:2147483645;inset:0 0 auto;height:120px;background:#121315;color:#c3c0b9;font:18px/1.3 system-ui;box-shadow:0 10px 30px #0008;pointer-events:none;border-bottom:1px solid #574a34}.promo-bookmark-hint{position:absolute;left:50%;top:88px;transform:translateX(-50%);color:#666;font:17px/1.4 system-ui;letter-spacing:2px}
.promo-tab{height:33px;padding:9px 42px;color:#a99c83;font-size:16px}.promo-address{height:44px;margin:0 40px 5px;padding:6px 42px;background:#242527;border-radius:18px;font-size:22px;box-sizing:border-box}.promo-bookmarks{height:32px;display:flex;align-items:center;padding-left:48px;gap:20px;font-size:18px}.promo-bookmark{border-radius:4px;padding:5px 12px;color:#dfd7bf;background:#272727}.promo-bookmark[hidden]{display:none}.bookmark-guide__arrow{top:155px!important;margin-top:0;height:calc(var(--promo-button-top,800px) - 210px)!important}
.promo-pointer{position:fixed;inset:0 auto auto 0;z-index:2147483647;margin:0;padding:0;border:0;width:28px;height:36px;background:#eee9dc;clip-path:polygon(0 0,0 85%,24% 64%,43% 100%,60% 92%,41% 57%,78% 57%);pointer-events:none;filter:drop-shadow(2px 3px 2px #000);transform:translate(2000px,1100px)}
.promo-chip{position:fixed;inset:0 auto auto 0;z-index:2147483647;padding:12px 20px;margin:0;border:1px solid #a48850;border-radius:5px;background:#0d0b09f5;color:#e7d5a2;font:20px/1.4 system-ui;box-shadow:0 10px 35px #000b;pointer-events:none}
.promo-drop{position:fixed;z-index:2147483645;left:calc(50% + 105px);top:47%;text-align:center;pointer-events:none;opacity:0;animation:promo-drop-in 3.4s ease-out forwards}.promo-drop__spark{width:7px;height:7px;margin:0 auto 16px;background:#fff3b4;box-shadow:0 0 12px 5px #ffdb70,0 0 45px 15px #f2a534,0 0 110px 25px #a9551c;border-radius:50%}.promo-drop__name{color:#ffea91;background:#000b;padding:6px 14px;font:22px/1.3 Georgia,serif;text-shadow:0 2px 3px #000}
@keyframes promo-drop-in{0%{opacity:0;transform:translateY(-38px) scale(.7)}15%{opacity:1;transform:translateY(0) scale(1.07)}30%,90%{opacity:1;transform:scale(1)}100%{opacity:0}}
`;
  document.head.append(style);
  const pointer=document.createElement('div');pointer.className='promo-pointer';pointer.setAttribute('popover','manual');document.body.append(pointer);pointer.showPopover();
  let x=2000,y=1100,browser=null,chip=null,drop=null;
  const front=()=>{if(pointer.matches(':popover-open'))pointer.hidePopover();pointer.showPopover();};
  function move(nx,ny,ms=700){front();pointer.animate([{transform:`translate(${x}px,${y}px)`},{transform:`translate(${nx}px,${ny}px)`}],{duration:ms,easing:'cubic-bezier(.2,.65,.25,1)',fill:'forwards'});x=nx;y=ny;}
  function moveTo(node,ms=700){if(!node)throw Error('Missing promo target');const r=node.getBoundingClientRect();move(r.x+r.width/2,r.y+r.height/2,ms);return{x:r.x+r.width/2,y:r.y+r.height/2};}
  function frame(address,bookmark=false){
    browser?.remove();browser=document.createElement('div');browser.className='promo-browser';
    const tab=document.createElement('div');tab.className='promo-tab';tab.textContent='BROWSER';
    const url=document.createElement('div');url.className='promo-address';url.textContent=address;
    const row=document.createElement('div');row.className='promo-bookmarks';
    const b=document.createElement('span');b.className='promo-bookmark';b.textContent='◈  D2SMM';b.hidden=!bookmark;row.append(b);browser.append(tab,url,row);document.body.append(browser);
    const hint=document.createElement('span');hint.className='promo-bookmark-hint';hint.textContent='BOOKMARK BAR';browser.append(hint);
    const setup=document.getElementById('bookmark');if(setup)document.documentElement.style.setProperty('--promo-button-top',setup.getBoundingClientRect().top+'px');
  }
  function dragBookmark(){
    const b=document.getElementById('bookmark'),r=b.getBoundingClientRect();move(r.x+r.width/2,r.y+r.height/2,1);
    chip=document.createElement('div');chip.className='promo-chip';chip.textContent='◈  D2SMM';document.body.append(chip);
    const a={transform:`translate(${x+22}px,${y+26}px)`,opacity:.95},z={transform:'translate(74px,84px)',opacity:.95};
    chip.animate([a,z],{duration:1800,easing:'cubic-bezier(.2,.65,.25,1)',fill:'forwards'});move(68,91,1800);
    setTimeout(()=>{chip.remove();chip=null;browser.querySelector('.promo-bookmark').hidden=false;browser.querySelector('.promo-bookmark').animate([{background:'#75613c'},{background:'#272727'}],{duration:900});window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));},1850);
  }
  function dragPackage(){
    chip=document.createElement('div');chip.className='promo-chip';chip.textContent='Loot Guard.json';document.body.append(chip);
    chip.animate([{transform:'translate(2110px,370px)',opacity:0},{transform:'translate(2020px,410px)',opacity:1,offset:.15},{transform:'translate(1272px,646px)',opacity:1}],{duration:1500,easing:'ease-in-out',fill:'forwards'});move(1250,620,1500);
    setTimeout(()=>{chip.remove();chip=null;const transfer=new DataTransfer();transfer.items.add(new File([D2ModsDefaultPackage],'Loot Guard.d2mod.json',{type:'application/json'}));document.dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,bubbles:true,cancelable:true}));},1550);
  }
  function rareDrop(){drop?.remove();drop=document.createElement('div');drop.className='promo-drop';const spark=document.createElement('div');spark.className='promo-drop__spark';const name=document.createElement('div');name.className='promo-drop__name';name.textContent='*** Beast Loop ***';drop.append(spark,name);document.body.append(drop);return D2GalleryScenes.loot();}
  globalThis.D2Promo=Object.freeze({move,moveTo,frame,dragBookmark,dragPackage,rareDrop,front,
    hideFrame:()=>browser?.remove(),
    dispose(){pointer.remove();browser?.remove();chip?.remove();drop?.remove();style.remove();delete globalThis.D2Promo;}
  });
})();
