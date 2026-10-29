'use strict';
const bookmark=document.getElementById('bookmark'),feedback=document.querySelector('.setup__feedback');
fetch('/updates/stable.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Release unavailable');return r.json();}).then(feed=>{
  const d=feed.manager,url=new URL(d.url);if(url.origin!==location.origin||!/^\/manager\/\d+\.\d+\.\d+\/bootstrap\.js$/.test(url.pathname)||!/^[a-f0-9]{64}$/.test(d.sha256))throw Error('Invalid release descriptor');
  const sri='sha256-'+btoa(String.fromCharCode(...d.sha256.match(/../g).map(v=>parseInt(v,16))));
  const code=`void(()=>{if(location.origin!=='https://d2survivors.lol'||!location.pathname.startsWith('/play/')){alert('Open D2 Survivors, then click this bookmark again.');return;}if(globalThis.D2Mods){D2Mods.show();return;}globalThis.D2ModsBootstrap=${JSON.stringify(d)};const s=document.createElement('script');s.src=${JSON.stringify(d.url)};s.integrity=${JSON.stringify(sri)};s.crossOrigin='anonymous';s.onload=async()=>{await globalThis.D2ModsStartup;globalThis.D2Mods?.show();s.remove();};s.onerror=()=>alert('The mod manager could not be loaded.');document.head.append(s);})()`;
  bookmark.href='javascript:'+encodeURIComponent(code);bookmark.removeAttribute('aria-disabled');
  document.querySelector('[data-manager-version]').textContent=d.version;
}).catch(error=>{console.error('[D2S]',error);feedback.hidden=false;feedback.textContent='The bookmark is unavailable. Reload this page to try again.';});
const guide=document.querySelector('[data-bookmark-guide]'),instructions=guide.querySelector('.bookmark-guide__instructions');
function placeGuide(fitButton=false){
  if(guide.hidden)return;
  let b=bookmark.getBoundingClientRect();
  if(fitButton){const top=Math.max(16,innerHeight-instructions.offsetHeight-b.height-66);if(b.top>top||b.top<16){window.scrollBy({top:b.top-Math.min(top,Math.max(16,b.top)),behavior:'instant'});b=bookmark.getBoundingClientRect();}}
  const arrow=guide.querySelector('.bookmark-guide__arrow');arrow.style.left=(b.left+b.width/2-arrow.offsetWidth/2)+'px';arrow.style.top=Math.max(0,b.top*.1)+'px';arrow.style.height=Math.max(0,b.top*.8)+'px';instructions.style.left=Math.max(16,Math.min(b.left+(b.width-instructions.offsetWidth)/2,innerWidth-instructions.offsetWidth-16))+'px';instructions.style.top=(b.bottom+50)+'px';
}
function closeGuide(restore=false){guide.hidden=true;bookmark.classList.remove('setup__bookmark--guided');bookmark.setAttribute('aria-describedby','bookmark-instruction');if(restore)bookmark.focus({preventScroll:true});}
bookmark.addEventListener('click',event=>{event.preventDefault();feedback.hidden=true;guide.hidden=false;bookmark.classList.add('setup__bookmark--guided');bookmark.setAttribute('aria-describedby','bookmark-guide-title');placeGuide(true);});
bookmark.addEventListener('dragstart',()=>{feedback.hidden=true;closeGuide();});
guide.querySelectorAll('[data-guide-dismiss]').forEach(n=>n.addEventListener('click',()=>closeGuide(true)));guide.querySelector('[data-guide-game]').addEventListener('click',()=>closeGuide());
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!guide.hidden){e.preventDefault();closeGuide(true);}});window.addEventListener('resize',()=>placeGuide(true));window.addEventListener('scroll',()=>placeGuide(),{passive:true});
