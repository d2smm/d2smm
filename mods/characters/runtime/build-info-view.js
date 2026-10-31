(() => {
  'use strict';
  const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
  function itemCard(item,label){
    const card=el('article',undefined,{class:'build-info__item'});
    if(label)card.append(el('div',label,{class:'build-info__slot'}));
    if(!item){card.append(el('span','Empty',{class:'build-info__muted'}));return card;}
    const heading=el('div',undefined,{class:'build-info__item-heading'});
    if(item.icon){const img=el('img',undefined,{src:item.icon.url,alt:'',draggable:'false'});img.addEventListener('error',()=>img.remove(),{once:true});heading.append(img);}
    const names=el('div');names.append(el('h4',item.name,{'data-rarity':item.rarity??'normal'}));if(item.base&&item.base!==item.name)names.append(el('div',item.base,{class:'build-info__base'}));heading.append(names);card.append(heading);
    if(item.perfection){const percent=item.perfection.percent;card.append(el('div',percent===null?'Roll data unavailable':percent+'%',{class:'build-info__perfection','aria-label':percent===null?'Roll data unavailable':percent+' percent perfect',title:'Average of independent variable rolls within their native min/max ranges'}));}
    else for(const line of item.lines??[])card.append(el('div',line.text,{class:'build-info__item-line','data-tone':line.unusable?'unusable':line.inert?'inert':line.tone??(line.implicit?'implicit':'mod')}));
    if(item.error||item.missing)card.append(el('p',item.error??'Item unavailable',{class:'build-info__error'}));
    return card;
  }
  function section(title,key){const node=el('section',undefined,{'data-build-section':key});node.append(el('h3',title));return node;}
  function pairs(rows){const dl=el('dl',undefined,{class:'build-info__stats'});for(const r of rows){const pair=el('div');pair.append(el('dt',r.label),el('dd',r.value,r.low?{class:'build-info__error'}:{}));dl.append(pair);}return dl;}
  function create(root){
    const panel=el('dialog',undefined,{class:'build-info','data-build-info':'','aria-label':'Build details'}),style=el('style',D2BuildInfoStyle);
    let origin=null;const scope=new AbortController();
    root.append(style,panel);
    for(const event of ['keydown','keyup','click','pointerdown','pointerup'])panel.addEventListener(event,e=>e.stopPropagation(),{signal:scope.signal});
    panel.addEventListener('close',()=>{if(origin?.isConnected)origin.focus({preventScroll:true});else globalThis.D2Mods?.focusGame();origin=null;},{signal:scope.signal});
    function show(data,anchor){
      origin=anchor;
      const header=el('header'),title=el('div'),close=el('button','×',{'data-build-action':'close','aria-label':'Close build details',class:'build-info__close'});
      close.addEventListener('click',()=>panel.close());title.append(el('h2',data.hero===data.className?data.className:data.hero+' · '+data.className),el('p','Level '+data.level+' · '+data.loadout,{class:'build-info__context'}));header.append(title,close);
      const layout=el('div',undefined,{class:'build-info__layout'}),left=el('div',undefined,{class:'build-info__left'}),right=el('div',undefined,{class:'build-info__right'});
      const character=section('Character','character');
      if(data.preview)character.append(el('p','Current equipped stats',{class:'build-info__context'}));
      character.append(pairs(data.stats));
      const terror=section('Terror','terror');
      if(data.terror){
        const run=data.terror.current;if(run)terror.append(el('p',(run.training?'Training · ':'')+'Terror '+run.tier+' · Act '+run.act,{class:'build-info__current-run'}));
        terror.append(pairs([{label:'Cleared',value:data.terror.cleared},{label:'Unlocked',value:data.terror.open}]));
      }else terror.append(el('p','Not unlocked',{class:'build-info__muted'}));
      const merc=section('Mercenary','mercenary'),m=data.merc;
      if(!m)merc.append(el('p','No mercenary',{class:'build-info__muted'}));
      else{
        const mercLayout=el('div',undefined,{class:'build-info__merc-layout'}),summary=el('div');
        summary.append(el('h4',m.name+' · '+m.type),el('p','Level '+m.level+(m.dead?' · Fallen':''),{class:'build-info__context'}));
        const s=m.stats;summary.append(pairs([{label:'Strength',value:s.strength},{label:'Dexterity',value:s.dexterity},{label:'Life',value:s.life+' / '+s.lifeMax},{label:'Damage',value:Array.isArray(s.damage)?s.damage.join('–'):s.damage},{label:'Defense',value:s.defense},...Object.entries(s.resist??{}).map(([k,v])=>({label:k[0].toUpperCase()+k.slice(1)+' resist',value:v+'%'}))]));
        const mercSkills=el('div',undefined,{class:'build-info__merc-skills'}),mercGear=el('div',undefined,{class:'build-info__merc-gear'});
        for(const pick of m.picks??[]){const row=el('div',undefined,{class:'build-info__merc-skill'});for(const [index,line]of pick.lines.entries())row.append(el('div',line.text,{class:index===0?'build-info__choice':'build-info__choice-description'}));mercSkills.append(row);}
        for(const row of m.items)mercGear.append(itemCard(row.item,row.slot));mercLayout.append(summary,mercSkills,mercGear);merc.append(mercLayout);
      }
      left.append(character,terror);
      const gear=section(data.preview?'Equipment · Preview':'Equipment','equipment'),gearGrid=el('div',undefined,{class:'build-info__gear'});
      for(const slot of data.gear.slots)gearGrid.append(itemCard(data.gear.items[slot.slot],slot.label));gear.append(gearGrid);
      const skills=section('Skills','skills'),trees=el('div',undefined,{class:'build-info__trees'}),groups=[...data.trees,{id:null,name:'Passives'}];
      for(const group of groups){
        const rows=data.skills.filter(s=>s.tree===group.id&&s.level>0);if(!rows.length)continue;
        const tree=el('section',undefined,{class:'build-info__tree'});tree.append(el('h4',group.name));
        for(const s of rows){
          const row=el('div',undefined,{class:'build-info__skill','data-skill-id':s.id,'data-selected':String(s.level>0||s.bonus>0||!!s.choice)});
          const label=el('div',undefined,{class:'build-info__skill-label'});label.append(el('span',s.name),el('span',s.level>0||s.bonus>0?'Rank '+s.level+(s.bonus?' + '+s.bonus:''):'—'));row.append(label);
          if(s.level>0&&(s.evolved||s.rested))row.append(el('div',[s.evolved?'Evolved':'',s.rested?'Rested':''].filter(Boolean).join(' · '),{class:'build-info__context'}));
          if(s.choice){row.append(el('div','✓ '+s.choice.name,{class:'build-info__choice'}));if(s.choice.description)row.append(el('div',s.choice.description,{class:'build-info__choice-description'}));}
          tree.append(row);
        }
        trees.append(tree);
      }
      if(!trees.childElementCount)trees.append(el('p','No skills chosen',{class:'build-info__muted'}));
      skills.append(trees);right.append(gear,merc);layout.append(left,right,skills);
      const charms=section('Charms','charms'),charmGrid=el('div',undefined,{class:'build-info__charms'});
      if(!data.charms.length)charmGrid.append(el('p','No charms equipped',{class:'build-info__muted'}));
      for(const item of data.charms)charmGrid.append(itemCard(item));charms.append(charmGrid);
      panel.replaceChildren(header,layout,charms);panel.dataset.classId=data.classId;
      if(!panel.open)panel.showModal();panel.scrollTop=0;close.focus({preventScroll:true});
    }
    return Object.freeze({show,close:()=>panel.close(),isOpen:()=>panel.open,dispose:()=>{scope.abort();panel.remove();style.remove();}});
  }
  globalThis.D2BuildInfoView=Object.freeze({create});
})();
