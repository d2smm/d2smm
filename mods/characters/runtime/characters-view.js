(() => {
  'use strict';
  function el(tag,text,attrs={}){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
  function create(actions){
    const host=el('div',undefined,{id:'d2-characters'}),root=host.attachShadow({mode:'open'}),css=el('style',D2CharacterStyle),panel=el('dialog',undefined,{'aria-label':'Characters and gear'});
    const infoView=D2BuildInfoView.create(root);
    panel.addEventListener('close',()=>{++infoRequest;infoView.close();globalThis.D2Mods?.focusGame();});
    let selected=null,current=null,lastArchive='',section='characters',intent='',preview=null,creationRequested=false,infoRequest=0,disposed=false;
    const run=fn=>()=>Promise.resolve().then(fn).catch(actions.report);
    const command=async a=>{const result=await actions.perform(selected,a);if(['switch','new'].includes(a.kind)){preview=null;if(section==='characters')panel.close();}paint(actions.status());return result;};
    const button=(text,key,fn)=>{const b=el('button',text,{'data-character-action':key});b.addEventListener('click',run(fn));return b;};
    const selectCurrent=async()=>{await actions.selectClass(selected);panel.close();};
    const nameEditor=(label,id,save)=>D2CharacterNameEditor.create({label,id,save,report:actions.report});
    const close=button('×','close',()=>panel.close());close.className='characters__close';close.setAttribute('aria-label','Close Characters');
    const header=el('header'),title=el('h2','Characters & gear');header.append(title,close);
    const toolbar=el('div',undefined,{class:'characters__toolbar'});
    const context=el('span','',{class:'characters__subtle'});
    toolbar.append(context);
    const notice=el('p','',{class:'characters__notice',role:'status'}),setup=el('section',undefined,{class:'characters__card'}),setupText=el('p','');
    const enable=button('Enable loadouts','enable',()=>command({kind:'enable'}));setup.append(el('h3','Set up loadouts'),setupText,enable);
    const layout=el('div',undefined,{class:'characters__layout'}),left=el('section',undefined,{class:'characters__roster','data-character-section':'characters'}),right=el('section',undefined,{'data-character-section':'gear'}),leftHeading=el('h3','Characters'),rightHeading=el('h3','Gear loadouts');left.append(leftHeading);right.append(rightHeading);layout.append(left,right);
    const characterRows=[];
    const nativeCard=el('div',undefined,{class:'characters__card','data-native-character':''}),nativeName=el('h3'),nativeInfo=el('p','',{class:'characters__status'}),nativePick=button('Select','select-current',selectCurrent);nativeCard.append(nativeName,nativeInfo,nativePick);left.append(nativeCard);
    for(let i=0;i<3;i++){
      const card=el('div',undefined,{class:'characters__card','data-character-index':String(i)}),name=nameEditor('Character '+(i+1)+' name','character-'+i,value=>command({kind:'rename',target:'character',id:current.characters[i].id,name:value})),info=el('p','',{class:'characters__status'}),pick=button('Switch','switch-'+i,()=>current.characters[i].active?selectCurrent():command({kind:'switch',character:current.characters[i].id}));
      card.append(name.node,info,pick);left.append(card);characterRows.push({card,name,info,pick});
    }
    const add=el('div',undefined,{class:'characters__add'}),archives=el('details'),archive=el('select',undefined,{'aria-label':'Archived hero'}),adopt=button('Add hero','adopt',()=>command({kind:'adopt',index:Number(archive.value),archive:current.archived.find(h=>h.index===Number(archive.value))?.key})),fresh=button('New character','new',()=>{creationRequested=true;if(current.hasSavedRun||!current.enabled&&current.personalItems>0){paint(actions.status());return;}return command({kind:'new'});});fresh.className='characters__new';
    const newRequirement=el('p','Reach level 99 to create another character.',{class:'characters__subtle','data-character-requirement':'level'}),limit=el('p','All 3 character slots are in use.',{class:'characters__subtle','data-character-requirement':'capacity'});
    archives.append(el('summary','Archived heroes'),archive,adopt);add.append(fresh,newRequirement,limit,archives);left.append(add);
    const tabs=el('div',undefined,{class:'characters__tabs',role:'tablist','aria-label':'Gear loadout'}),tabRows=[];
    for(let id=1;id<=3;id++){
      const b=button('','view-loadout-'+id,()=>{preview=id;gearName.reset();paint(actions.status());}),name=el('span'),state=el('span','',{class:'characters__tab-state'});b.className='characters__tab';b.setAttribute('role','tab');b.setAttribute('data-loadout-id',String(id));b.setAttribute('aria-controls','d2-armory-pane');b.id='d2-loadout-'+id;b.append(name,state);
      b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?1:e.key==='End'?3:(id-1+(e.key==='ArrowRight'?1:2))%3+1;preview=next;gearName.reset();paint(actions.status());tabRows[next-1].b.focus();}});
      tabs.append(b);tabRows.push({b,name,state});
    }
    const pane=el('div',undefined,{role:'tabpanel',id:'d2-armory-pane'}),gearTitle=el('div',undefined,{class:'characters__gear-heading'}),gearName=nameEditor('Loadout name','loadout',value=>command({kind:'rename',target:'loadout',id:preview,name:value})),gearState=el('span','',{class:'characters__gear-state'});
    gearTitle.append(gearName.node,gearState);const equipment=D2EquipmentView.create(panel),gearActions=el('div',undefined,{class:'characters__actions characters__gear-actions'});
    const equip=button('Equip','equip',()=>command({kind:'equip',loadout:preview})),save=button('Save equipped','save',()=>{
      const target=current.loadouts.find(l=>l.id===preview);
      if(!target.matches&&target.items.length&&!confirm('Replace '+target.name+' with your equipped items?'))return;
      return command({kind:'saveLoadout',loadout:preview,makeDefault:true});
    }),preferred=button('Make default','default',()=>command({kind:'default',loadout:preview}));equip.className='characters__primary';
    const info=button('ⓘ','info',async()=>{const request=++infoRequest,cls=selected,id=preview;info.disabled=true;try{const data=await actions.information(cls,id);if(!disposed&&request===infoRequest&&panel.open&&selected===cls&&preview===id)infoView.show(data,info);}finally{info.disabled=false;}});info.className='characters__info';info.setAttribute('aria-label','Build details');
    gearActions.append(info,equip,save,preferred);const gearNote=el('p','',{class:'characters__subtle characters__gear-note'});
    pane.append(gearTitle,equipment.node,gearActions,gearNote);right.append(tabs,pane);
    const vault=el('details',undefined,{class:'characters__vault'}),vaultList=el('ul');vault.append(el('summary','Stored equipment'),vaultList);right.append(vault);let vaultKey='';
    const footer=el('footer'),details=el('details'),extras=el('div',undefined,{class:'characters__actions'});
    const returnUnused=button('Return unused gear','return-unused',()=>command({kind:'returnUnused'})),release=button('Release personal stash','release',()=>{if(confirm('Release this gear vault? Items stay in the personal stash and native heroes are kept. Loadout assignments and names for this class will be removed.'))return command({kind:'release'});}),backup=button('Export backups','backups',actions.exportBackups);
    details.append(el('summary','More options'),extras);extras.append(returnUnused,backup,release);footer.append(details);
    panel.prepend(header,toolbar,notice,setup,layout,footer);root.append(css,panel);document.body.append(host);
    for(const n of ['keydown','keyup','click','pointerdown','pointerup'])host.addEventListener(n,e=>e.stopPropagation());
    function paint(s){
      selected??=s.currentClass;current=s.classes.find(c=>c.classId===selected);if(!current)return;
      const ready=s.canChange&&!s.busy&&!s.pending,canSelect=s.canSelect&&!s.busy&&!s.pending,active=current.characters.find(c=>c.active),className=selected[0].toUpperCase()+selected.slice(1);preview??=current.selectedLoadout??1;
      panel.dataset.section=section;panel.dataset.classId=selected;panel.dataset.intent=intent;title.textContent=section==='gear'?className+' loadouts':({amazon:'Amazons',sorceress:'Sorceresses',necromancer:'Necromancers',paladin:'Paladins',barbarian:'Barbarians',druid:'Druids',assassin:'Assassins'})[selected];panel.setAttribute('aria-label',title.textContent);
      context.textContent=section==='gear'&&active?active.name+' · Level '+active.level:'';toolbar.hidden=!context.textContent;
      left.hidden=section==='gear';right.hidden=section==='characters';leftHeading.hidden=true;rightHeading.hidden=true;
      const nextVault=JSON.stringify(current.vault??[]);if(vaultKey!==nextVault){vaultList.replaceChildren(...(current.vault??[]).map(i=>el('li',i.name)));vaultKey=nextVault;}vault.hidden=!current.vault?.length;
      notice.textContent=s.problem||(section==='characters'&&!s.canSelect?'Return to camp and put down any held item.':'');notice.hidden=!notice.textContent;
      setup.hidden=section==='characters'||current.enabled;layout.hidden=section==='gear'&&!current.enabled;footer.hidden=section==='characters'||!current.enabled;setupText.textContent=current.personalItems?'Move '+current.personalItems+' items from Personal stash to Shared first.':'Personal stash will store your unequipped loadouts. Shared stash stays available.';enable.disabled=!ready||current.personalItems>0;
      nativeCard.hidden=current.enabled;nativeName.textContent=className;nativeInfo.textContent='Level '+current.nativeLevel;nativePick.textContent=selected===s.currentClass?'Selected':'Select';nativePick.disabled=!canSelect||selected===s.currentClass;nativeCard.dataset.active=String(selected===s.currentClass);
      characterRows.forEach((row,i)=>{const c=current.characters[i];row.card.hidden=!c;if(!c)return;row.name.paint(c.name,ready);row.info.textContent='Level '+c.level+(c.active&&selected===s.currentClass?' · Selected':!c.active&&current.hasSavedRun?' · Unavailable during this run':'');row.card.dataset.active=String(c.active&&selected===s.currentClass);row.pick.disabled=c.active?!canSelect||selected===s.currentClass:!ready||current.hasSavedRun;row.pick.hidden=false;row.pick.textContent=c.active?(selected===s.currentClass?'Selected':'Select'):'Switch';});
      fresh.hidden=current.characters.length>=3;limit.hidden=current.characters.length<3;newRequirement.textContent=current.hasSavedRun?'New character is unavailable while this hero has saved progress.':current.creationLevel<99?'New characters unlock at level 99.':!current.enabled&&current.personalItems?'Move '+current.personalItems+' items from Personal stash to Shared to make room for another character.':'';newRequirement.hidden=(!creationRequested&&current.creationLevel>=99)||!newRequirement.textContent||current.characters.length>=3;fresh.disabled=!ready||current.creationLevel<99;
      const archiveKey=JSON.stringify(current.archived);if(archiveKey!==lastArchive){archive.replaceChildren(...current.archived.map(h=>el('option','Level '+h.level+' hero',{value:String(h.index)})));lastArchive=archiveKey;}archives.hidden=!current.enabled||!current.archived.length||current.characters.length>=3;adopt.disabled=!ready;
      tabRows.forEach((row,i)=>{const l=current.loadouts[i];if(!l)return;row.name.textContent=l.name;row.state.textContent=[l.id===current.selectedLoadout?'Equipped':'',active?.defaultLoadout===l.id?'Default':''].filter(Boolean).join(' · ');row.b.setAttribute('aria-selected',String(l.id===preview));row.b.tabIndex=l.id===preview?0:-1;});
      const l=current.loadouts.find(l=>l.id===preview);
      if(l){pane.setAttribute('aria-labelledby','d2-loadout-'+preview);gearName.paint(l.name,ready);gearState.textContent=l.id===current.selectedLoadout&&!l.matches?'Unsaved changes':'';if(section!=='characters')equipment.paint(actions.armory(selected,preview),l.items);equip.disabled=!ready||l.id===current.selectedLoadout&&l.matches;equip.textContent=l.id===current.selectedLoadout&&l.matches?'Equipped':'Equip';save.disabled=!ready;save.textContent=active?.defaultLoadout===l.id?'Save equipped':'Save for character';preferred.disabled=!ready;preferred.hidden=active?.defaultLoadout===l.id;gearNote.textContent=active?.defaultLoadout===l.id?'Default for '+active.name:'';gearNote.hidden=!gearNote.textContent;}
      release.disabled=!ready;returnUnused.disabled=!ready;backup.disabled=s.busy;
    }
    return Object.freeze({paint,isOpen:()=>panel.open,section:()=>section,show:(options={})=>{infoView.close();const status=actions.status();section=options.section==='gear'?'gear':'characters';intent=section==='characters'&&options.intent==='create'?'create':'';selected=D2CharacterCore.classes.includes(options.classId)?options.classId:status.currentClass;preview=null;creationRequested=false;gearName.reset();characterRows.forEach(r=>r.name.reset());paint(status);if(!panel.open)panel.showModal();panel.scrollTop=0;},close:()=>panel.close(),dispose:()=>{disposed=true;++infoRequest;infoView.dispose();equipment.dispose();host.remove();}});
  }
  globalThis.D2CharacterView=Object.freeze({create});
})();
