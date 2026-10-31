(() => {
  'use strict';
  // A display adapter only: native game functions own all statistics and item text.
  function create({getGame,getInformation,getPresentation,armory,status}){
    function itemView(item,cls,level,worn,wearer){
      if(!item)return null;
      const p=getPresentation(),copy=structuredClone(item),info=p.describe(copy,cls,level,wearer,worn);
      if(typeof info?.name!=='string'||!Array.isArray(info.lines)||info.lines.some(l=>typeof l.text!=='string'))throw Error('Item details are unavailable for this game update.');
      const icon=p.icon(getGame().art.items,copy);
      return {id:item.id,name:p.name(info.name,item.rarity,item.base),base:info.base?p.name(info.base):'',rarity:item.rarity,perfection:D2ItemPerfection.rate(item,p.catalog?.()),
        lines:info.lines.map(l=>({text:l.text,tone:l.unusable?'unusable':l.inert?'inert':l.tone??(l.implicit?'implicit':'mod')})),
        icon:icon&&typeof icon.url==='string'&&['https:','blob:','data:'].includes(new URL(icon.url,location.href).protocol)?{url:icon.url,width:icon.width,height:icon.height}:null};
    }
    async function read(cls,id){
      await D2ItemPerfection.ready;
      const g=getGame(),native=getInformation(),p=getPresentation(),s=status(),c=s.classes.find(c=>c.classId===cls),loadout=c?.loadouts.find(l=>l.id===id);
      if(!g?.world?.player||g.kit.id!==cls||!p||!loadout)throw Error('Select this character in the game to view build details.');
      if(!native)throw Error('Build details are unavailable for this game update.');
      const last=g.hud?.d2?.last;
      if(last?.cls!==cls)throw Error('Character information is updating. Try again.');
      // Keep native player/world identity for the game's private read-side state,
      // but isolate any lazy save-container initialization from the real save.
      const receiver=Object.create(g);receiver.save=structuredClone(g.save);
      const numbers=native.numbers.call(receiver,g.world.player,g.build,receiver.save.equippedByClass?.[cls]??{},true),merc=native.merc.call(receiver,cls);
      if(!Array.isArray(numbers?.stats)||numbers.stats.some(r=>typeof r.label!=='string'||typeof r.value!=='string'))throw Error('Character statistics are unavailable for this game update.');
      const gear=armory(cls,id,true),hero=c.characters.find(c=>c.active),level=g.world.player.level;
      if(!gear)throw Error('Loadout items are unavailable.');
      const charms=(g.save.charmsByClass?.[cls]??[]).map(i=>itemView(i,cls,level,structuredClone(g.save.equippedByClass?.[cls]??{})));
      const hud=g.hud.d2,learned=last.loadout??[],options=hud.mods,chosen=g.save.skillMods?.[cls]?.on??{};
      const treeDisplay={ui:{manifest:hud.ui.manifest},treeView:{dataset:{}}};
      hud.useTreeKit.call(treeDisplay,g.kit);
      const skillRows=(definitions,kind)=>Object.entries(definitions??{}).map(([key,def])=>{
        const rank=learned.find(s=>s.id===key&&s.kind===kind),selected=chosen[key],choice=selected?options?.options?.(key)?.find(o=>o.id===selected):null;
        return {id:key,name:def.name,tree:treeDisplay.treeSlots?.get(key)?.page??def.tree??null,kind,level:rank?.level??0,bonus:rank?.bonus??0,rested:!!rank?.rested,evolved:!!def.evolved,
          choice:choice?{name:choice.name,description:choice.describe}:selected?{name:'Option details unavailable',description:''}:null};
      });
      const skills=[...skillRows(g.kit.skills,'skill'),...skillRows(g.kit.passives,'passive')];
      for(const rank of learned){
        if(skills.some(s=>s.id===rank.id&&s.kind===rank.kind))continue;
        const lines=hud.slotLines(rank),selected=chosen[rank.id],choice=selected?options?.options?.(rank.id)?.find(o=>o.id===selected):null;
        if(typeof lines?.[0]?.text!=='string')throw Error('Skill details are unavailable for this game update.');
        skills.push({id:rank.id,name:lines[0].text,tree:treeDisplay.treeSlots?.get(rank.id)?.page??null,kind:rank.kind,level:rank.level,bonus:rank.bonus,rested:!!rank.rested,choice:choice?{name:choice.name,description:choice.describe}:null});
      }
      const progress=native.progress(receiver.save,cls);
      return {classId:cls,className:g.kit.name,hero:hero?.name??g.kit.name,level,loadout:loadout.name,
        terror:progress?{cleared:progress.cleared,open:progress.open,current:g.inRun&&g.world.terror?{tier:g.world.terror.tier,act:g.world.act+1,training:!!g.training}:null}:null,
        preview:!(id===c.selectedLoadout&&loadout.matches),stats:numbers.stats.map(r=>({label:r.label,value:r.value,low:!!r.low,tree:r.tree})),
        gear,locations:loadout.items,charms,
        skills,
        trees:numbers.stats.filter(r=>r.tree).map(r=>({id:r.tree,name:r.label})),
        merc:merc?{name:merc.name,type:merc.typeName,level:merc.level,dead:merc.dead,stats:merc.stats,picks:merc.picks.map(pick=>({id:pick.id,lines:hud.mercPickLines(merc,pick,null)})),
          items:Object.entries(merc.worn??{}).map(([slot,i])=>({slot,item:itemView(i,cls,merc.level,merc.worn,{level:merc.level,strength:merc.stats.strength,dexterity:merc.stats.dexterity})}))}:null};
    }
    return Object.freeze({read});
  }
  globalThis.D2BuildInformation=Object.freeze({create});
})();
