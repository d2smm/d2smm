// Focused shortcut and read-only checks in an already-managed disposable game.
async function checkLoadoutAccess(){
  if(!globalThis.__D2GalleryLease?.contextId||location.origin!=='https://d2survivors.lol')throw Error('Verified isolated game required');
  const g=D2Characters.currentGame(),state=D2Characters.status(),cls=g?.kit.id;
  if(!g?.camp||!state.classes.find(c=>c.classId===cls)?.enabled)throw Error('Set up loadouts in the isolated camp first');
  const raw=localStorage.getItem('d2-survivors/save/v1'),save=JSON.stringify(g.save),origin=performance.timeOrigin;
  const enabled=D2Mods.status().builtinMods.find(m=>m.id==='gear-loadouts').enabled,checks=[];let previewView=null,original=null;
  const check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);};
  const key=(target,code,extra={})=>{const event=new KeyboardEvent('keydown',{code,key:code.slice(3).toLowerCase(),bubbles:true,composed:true,cancelable:true,...extra});target.dispatchEvent(event);target.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true,composed:true,cancelable:true,...extra}));return event.defaultPrevented;};
  try{
    D2Mods.close();D2Characters.close();await D2Mods.configureBuiltin('gear-loadouts',true);
    check('U opens loadouts',key(window,'KeyU'));
    const root=document.getElementById('d2-characters').shadowRoot,panel=root.querySelector('dialog[data-section=gear]'),info=root.querySelector('[data-character-action=info]');
    check('Gear view is visible at 75 percent',panel.open&&getComputedStyle(panel).zoom==='0.75');
    check('Info is immediately before Equip',info.nextElementSibling?.dataset.characterAction==='equip');
    const data=globalThis.D2BuildInfoProof?.status().data;
    if(data){
      original=panel.querySelector('.equipment');original.hidden=true;previewView=D2EquipmentView.create(panel);original.after(previewView.node);previewView.paint(data.gear,data.locations);
      const item=previewView.node.querySelector('[data-equipment-slot=body]');item.focus();const tip=[...panel.querySelectorAll('.item-tooltip')].find(n=>!n.hidden),a=item.getBoundingClientRect(),b=tip.getBoundingClientRect();
      check('Scaled item tooltip remains beside its slot',Math.abs(b.left-a.right-14)<2&&Math.abs(b.top-a.top)<2);
      previewView.dispose();previewView=null;original.hidden=false;original=null;
    }
    info.click();await new Promise(resolve=>setTimeout(resolve,0));
    const details=root.querySelector('[data-build-info]');check('Info opens the build sheet',details.open);
    check('All requested sections exist',['character','equipment','mercenary','skills','charms','terror'].every(id=>details.querySelector('[data-build-section='+id+']')));
    const native=g.characterView(true,cls,false).stats.map(r=>[r.label,r.value]),shown=[...details.querySelectorAll('[data-build-section=character] dl>div')].map(n=>[n.querySelector('dt').textContent,n.querySelector('dd').textContent]);
    check('Character rows match native C view',JSON.stringify(native)===JSON.stringify(shown));
    check('Experience and next level are omitted',!shown.some(([label])=>['Experience','Next level','Next Level'].includes(label)));
    details.close();await new Promise(resolve=>setTimeout(resolve,0));check('Closing details restores the info button',root.activeElement===info);
    const input=document.createElement('input');panel.append(input);input.focus();
    check('U remains available while editing',!key(input,'KeyU')&&panel.open);input.remove();
    check('Modified U remains a browser shortcut',!key(window,'KeyU',{ctrlKey:true})&&panel.open);
    check('Native L is not intercepted',!key(window,'KeyL')&&panel.open);
    key(window,'KeyU');await new Promise(resolve=>setTimeout(resolve,0));check('U closes loadouts and returns canvas focus',!panel.open&&document.activeElement===g.app.canvas);
    await D2Mods.configureBuiltin('gear-loadouts',false);check('Disabled loadouts leave U untouched',!key(window,'KeyU')&&!panel.open);
    check('Native save bytes and memory unchanged',localStorage.getItem('d2-survivors/save/v1')===raw&&JSON.stringify(g.save)===save);
    check('Game page retained',performance.timeOrigin===origin);
    return {passed:true,checks};
  }finally{previewView?.dispose();if(original)original.hidden=false;D2Characters.close();await D2Mods.configureBuiltin('gear-loadouts',enabled);}
}
