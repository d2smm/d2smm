(() => {
  'use strict';
  const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(typeof attrs==='string')attrs={class:'build__'+attrs};for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
  const {number:compact,label,stat:shortStat,item:shortName}=D2BuildNotation;
  function stat(row,name=row?.label,value=row?.value){
  const node=el('div',undefined,'stat');
  if(row){node.dataset.buildStat=row.label;node.dataset.statValue=row.value;}
  node.append(el('dt',label(name??'')),el('dd',compact(value??'—'),row?.low?'negative':{}));return node;
  }
  function heading(text){return el('h3',text);}
  function icon(item){
  const node=el('span',undefined,'item-icon');
  if(item?.icon){const img=el('img',undefined,{src:item.icon.url,alt:'',draggable:'false'});img.addEventListener('error',()=>img.remove(),{once:true});node.append(img);}return node;
  }
  function statLines(lines){const node=el('div',undefined,'item-line');for(const line of lines){if(!line.unusable&&(line.implicit||line.tone==='implicit'))continue;if(node.childNodes.length)node.append(' · ');node.append(el('span',shortStat(line.text),{'data-tone':line.unusable?'unusable':line.inert?'inert':line.tone??'mod'}));}return node;}
  function itemRow(item,slot='',charm=false){
  const row=el('article',undefined,{class:'build__item'+(charm?' build__item--charm':'')});
  if(slot)row.append(el('div',item?.base||slot,'slot'));
  row.append(icon(item));const text=el('div',undefined,'item-text');
  if(!item){text.append(el('span','Empty','muted'));row.append(text);return row;}
  const rolled=['magic','rare'].includes(item.rarity);row.setAttribute('aria-label',item.name);
  if(!charm||!rolled)text.append(el('h4',shortName(item.name),{'data-rarity':item.rarity??'normal',title:item.name}));
  if(!item.perfection)text.append(statLines(item.lines??[]));
  if(item.error||item.missing)text.append(el('span',item.error??'Item unavailable','negative'));row.append(text);
  if(item.perfection){const {percent,values}=item.perfection,score=el('span',percent===null?'—':percent+'%',{class:'build__perfection','aria-label':percent===null?'Roll data unavailable':percent+' percent perfect'});if(values?.length)score.append(el('div',values.join('/'),'slot'));(charm?text:row).append(score);}
  return row;
  }
  function skillIcon(skill){
  const box=el('span',undefined,{class:'build__skill-icon','aria-hidden':'true'}),data=skill.icon;
  if(data?.image&&data.size>0){const sprite=el('span');Object.assign(sprite.style,{backgroundImage:data.image,backgroundPosition:data.position,width:data.size+'px',height:data.size+'px',transform:'scale('+30/data.size+')'});box.append(sprite);}
  return box;
  }
  function create(root){
  const panel=el('dialog',undefined,{class:'build','data-build-info':'','data-modal-surface':'black','aria-label':'Build details'}),style=el('style',D2BuildInfoStyle);
  let origin=null;const scope=new AbortController();root.append(style,panel);
  for(const event of ['keydown','keyup','click','pointerdown','pointerup'])panel.addEventListener(event,e=>e.stopPropagation(),{signal:scope.signal});
  panel.addEventListener('close',()=>{if(origin?.isConnected)origin.focus({preventScroll:true});else globalThis.D2Mods?.focusGame();origin=null;},{signal:scope.signal});
  function show(data,anchor){
    origin=anchor;const used=new Set(),get=name=>{const row=data.stats.find(r=>r.label===name&&!used.has(r));if(row)used.add(row);return row;};
    const header=el('header'),identity=el('div',undefined,'identity'),terror=el('div',undefined,{'data-build-section':'terror',class:'build__terror'}),close=el('button','×',{'data-build-action':'close','aria-label':'Close build details',class:'characters__close'});
    identity.append(el('h2',data.hero===data.className?data.className:data.hero+' · '+data.className),el('span','Level '+data.level+' · '+data.loadout+(data.preview?' · Gear preview':''),'context'));
    const t=data.terror;terror.append(el('span',compact(t?.current?'Terror '+t.current.tier+' · Act '+t.current.act+(t.current.training?' · Training':''):t?'Terror: '+t.open+' unlocked':'Terror: Locked')));if(t)terror.append(el('small',compact(t.cleared)+' cleared'));
    close.addEventListener('click',()=>panel.close());header.append(identity,terror,close);
    const overview=el('div',undefined,'overview'),summary=el('dl',undefined,'summary'),resists=el('dl',undefined,'resists');
    for(const [key,name]of [['Life','Life'],['Mana','Mana'],['Damage','DMG'],['Faster Cast Rate','FCR'],['Damage Reduced','DR'],['Magic Find','MF']]){
      const row=get(key),value=key==='Faster Cast Rate'?row?.value.replace(/^\+/,'').replace(/ · (.+)% shorter cooldowns/,' · CD −$1%').replace('−0%','0%'):row?.value;summary.append(stat(row,name,value));
    }
    for(const element of ['Fire','Cold','Lightning','Poison'])resists.append(stat(get(element+' Resistance'),element[0]+'R'));overview.append(summary,resists);
    const layout=el('div',undefined,'layout'),character=el('section',undefined,{'data-build-section':'character'}),attributes=el('dl',undefined,'attributes'),numbers=el('dl',undefined,'stats');
    character.append(heading('Character Stats'));if(data.preview)character.append(el('p','Current equipped stats','muted'));
    for(const key of ['Strength','Dexterity','Vitality','Energy'])attributes.append(stat(get(key),label(key)));
    const goldFind=get('Gold Find'),gold=get('Gold');
    for(const row of data.stats.filter(r=>!used.has(r)))numbers.append(stat(row,label(row.label)));
    character.append(attributes,numbers);const wealth=el('dl',undefined,'wealth');if(goldFind)wealth.append(stat(goldFind));if(gold)wealth.append(stat(gold));character.append(wealth);
    const gear=el('section',undefined,{'data-build-section':'equipment'}),gearHeader=el('div',undefined,'section-heading');gearHeader.append(heading('Equipment'),el('span','%'));gear.append(gearHeader);
    for(const slot of data.gear.slots)gear.append(itemRow(data.gear.items[slot.slot],slot.slot==='ring1'?'Ring 1':slot.slot==='ring2'?'Ring 2':slot.label));
    const skills=el('section',undefined,{'data-build-section':'skills'}),skillHeader=el('div',undefined,'section-heading');skillHeader.append(heading('Skills'),el('span','Learned + bonus','muted'));skills.append(skillHeader);
    for(const group of [...data.trees,{id:null,name:'Passive Ranks'}]){
      const rows=data.skills.filter(s=>s.tree===group.id&&s.level>0);if(!rows.length)continue;
      const tree=el('section',undefined,'tree');tree.append(el('h4',group.name));
      for(const s of rows){
        const row=el('div',undefined,{class:'build__skill','data-skill-id':s.id,'data-selected':'true'}),name=el('div',undefined,'skill-name');name.append(el('span',label(s.name)));
        if(s.evolved)name.append(el('span','Evolved','evolved'));if(s.rested)name.append(el('span','Rested','muted'));if(s.choice)name.append(el('small',s.choice.name,'choice'));
        row.append(skillIcon(s),name,el('span',compact(s.level+(s.bonus?' + '+s.bonus:'')),'rank'));tree.append(row);
      }
      skills.append(tree);
    }
    if(!data.skills.some(s=>s.level>0))skills.append(el('p','No skills chosen','muted'));layout.append(character,gear,skills);
    const merc=el('section',undefined,{'data-build-section':'mercenary',class:'build__merc'}),mercHeader=el('div',undefined,'merc-heading'),m=data.merc;mercHeader.append(heading('Mercenary'));
    if(!m)mercHeader.append(el('span','None','muted'));
    else{
      mercHeader.append(el('strong',m.name+' · '+m.type),el('span','Level '+m.level+(m.dead?' · Fallen':''),'context'));
      const s=m.stats,values=[['LIFE',s.life+' / '+s.lifeMax],['DMG',Array.isArray(s.damage)?s.damage.join('–'):s.damage]];
      const details=el('div',undefined,'merc-details');for(const pick of m.picks??[])details.append(el('span',(pick.lines[0]?.text??pick.id)+' '+compact(pick.level),'merc-pick'));for(const[k,v]of values)details.append(el('span',k+' '+compact(v)));mercHeader.append(details);
    }
    merc.append(mercHeader);if(m){const equipment=el('div',undefined,'merc-gear');for(const row of m.items)equipment.append(itemRow(row.item));merc.append(equipment);}skills.append(merc);
    const charms=el('section',undefined,{'data-build-section':'charms',class:'build__charm-section'}),charmGrid=el('div',undefined,'charms'),charmHeader=el('div',undefined,'section-heading');charmHeader.append(heading('Charms'),statLines(data.charmLines));charms.append(charmHeader);
    if(!data.charms.length)charmGrid.append(el('span','None','muted'));for(const item of data.charms)charmGrid.append(itemRow(item,'',true));charms.append(charmGrid);
    panel.replaceChildren(header,overview,layout,charms);panel.dataset.classId=data.classId;
    if(!panel.open)panel.showModal();panel.scrollTop=0;close.focus({preventScroll:true});
  }
  return Object.freeze({show,close:()=>panel.close(),isOpen:()=>panel.open,dispose:()=>{scope.abort();panel.remove();style.remove();}});
  }
  globalThis.D2BuildInfoView=Object.freeze({create});
})();
