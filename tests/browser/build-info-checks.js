// Synthetic build data on a detached receiver. Never imports or edits a player save.
async function installBuildInfoProof(){
  'use strict';
  if(!globalThis.__D2GalleryLease?.contextId||!__D2GalleryLease.targetId||location.origin!=='https://d2survivors.lol')throw Error('Verified isolated game required');
  if(globalThis.D2BuildInfoProof||document.getElementById('d2-build-info-proof'))throw Error('Dispose the prior build-details fixture before reinstalling it');
  const original=D2Characters.currentGame(),contract=await D2GameContract.connect();
  if(!original?.world?.player||!contract?.information)throw Error('Enter the isolated game with the candidate loaded');
  const raw=localStorage.getItem('d2-survivors/save/v1'),before=JSON.stringify(original.save),timeOrigin=performance.timeOrigin,checks=[];
  function check(name,passed){checks.push({name,passed:!!passed});if(!passed)throw Error(name);}
  const cls=original.kit.id,{sprite,...player}=original.world.player,{kit,...build}=original.build;
  const game=Object.assign(Object.create(original),{save:structuredClone(original.save),kit:original.kit,art:original.art,hirelings:original.hirelings,camp:{},build:structuredClone(build),world:{...original.world,player:{...structuredClone(player),level:99}}});
  Object.defineProperty(game,'difficulty',{value:original.difficulty});
  game.campMercLevel=()=>98;
  const make=(id,name,base,type,rarity,mods)=>({id:'build-proof-'+id,name,base,type,rarity,level:40,mods:mods.flatMap(([stat,value])=>stat==='allResist'?['fireResist','coldResist','lightningResist','poisonResist'].map(stat=>({stat,value})):[{stat,value}])});
  const worn={
    weapon:make('weapon','Heart of the Oak','Flail','weapon','runeword',[['allSkills',3],['fcr',40],['allResist',40]]),
    shield:make('shield','Spirit','Monarch','shield','runeword',[['allSkills',2],['fcr',35],['vitality',22],['mana',112]]),
    head:make('head','Harlequin Crest','Shako','helm','unique',[['allSkills',2],['magicFind',50],['life',99],['mana',99]]),
    body:make('body','Guardian Angel','Templar Coat','armor','unique',[['enhancedDefense',200],['maxFireResist',15],['maxColdResist',15],['maxLightningResist',15],['maxPoisonResist',15]]),
    amulet:make('amulet',"Mara's Kaleidoscope",'Amulet','amulet','unique',[['allSkills',2],['allResist',30],['strength',5],['dexterity',5]]),
    gloves:make('gloves','Magefist','Light Gauntlets','gloves','unique',[['fcr',20],['fireSkills',1],['enhancedDefense',30]]),
    belt:make('belt','Arachnid Mesh','Spiderweb Sash','belt','unique',[['allSkills',1],['fcr',20],['slowTarget',10]]),
    boots:make('boots','War Traveler','Battle Boots','boots','unique',[['enhancedDefense',190],['magicFind',50],['thorns',10],['strength',10],['vitality',10]]),
    ring1:make('ring1','Beast Loop','Ring','ring','rare',[['fcr',10],['attackRatingPoints',120],['strength',20],['life',40],['mana',90],['lightningResist',30]]),
    ring2:make('ring2','The Stone of Jordan','Ring','ring','unique',[['allSkills',1],['mana',20],['lightningMinDamage',1],['lightningMaxDamage',12]])
  };
  game.save.equippedByClass[cls]=worn;
  game.save.terror??={};game.save.terror[cls]={open:26,cleared:25,best:30,offers:[]};
  game.save.charmsByClass??={};game.save.charmsByClass[cls]=Array.from({length:20},(_,i)=>make('charm-'+i,i%2?'Fine Small Charm of Vita':'Shimmering Small Charm of Vita','Small Charm','charm','magic',i%2?[['maxDamage',3],['attackRatingPoints',20],['life',20]]:[['allResist',5],['life',20]]));
  game.save.mercs??={};game.save.mercs[cls]={active:'desert',hired:{desert:{name:0,dead:false,worn:{weapon:make('merc-weapon','Infinity','Thresher','weapon','runeword',[['enhancedDamage',325],['crushingBlow',40]]),body:worn.body,head:worn.head}}}};
  game.save.mercs[cls].hired.desert.worn.head=make('merc-head',"Tal Rasha's Horadric Crest",'Death Mask','helm','set',[['life',60],['mana',30]]);
  const catalog=contract.presentation.catalog();
  function rawStats(props){return props.flatMap(p=>p.stats.map(s=>({stat:s.stat,value:s.func===15||s.func===11||s.func===19?p.min:s.func===17&&p.par?p.par:s.func===12?p.par||1:p.max,...[10,22,11,19].includes(s.func)?{param:p.par}:s.func===21?{param:s.val}:s.func===12?{param:p.max}:{},...[11,19].includes(s.func)?{level:1}:{}})));}
  for(const item of new Set([...Object.values(worn),...game.save.charmsByClass[cls],...Object.values(game.save.mercs[cls].hired.desert.worn)])){
    const definition=({unique:catalog.uniques,set:catalog.setItems,runeword:catalog.runewords})[item.rarity]?.[item.name];
    if(definition){item.stats=rawStats(definition.props);if(definition.bonus)item.bonus=definition.bonus.map(rawStats);const defense=catalog.bases[item.base]?.defense;if(defense)item.defense=defense[1]+(item.stats.some(s=>s.stat==='item_armor_percent')?1:0);}
  }
  await D2ItemPerfection.ready;
  const active=Object.keys(game.kit.skills).filter(id=>!game.kit.skills[id].evolved).slice(0,5),passive=Object.keys(game.kit.passives).slice(0,3);
  game.build.skills=active.map(id=>({id,level:4}));game.build.passives=Object.fromEntries(passive.map(id=>[id,3]));
  const selected=[...active,...passive].find(id=>original.hud.d2.mods.options(id)?.length),option=selected?original.hud.d2.mods.options(selected)[0]:null;
  game.save.skillMods??={};game.save.skillMods[cls]={on:option?{[selected]:option.id}:{}};
  const nativeHud=original.hud.d2,last={...nativeHud.last,cls,level:99,loadout:[...active.map(id=>({kind:'skill',id,level:4,bonus:2,cooldown:0})),...passive.map(id=>({kind:'passive',id,level:3,bonus:2,cooldown:0}))]};
  game.hud={d2:Object.assign(Object.create(Object.getPrototypeOf(nativeHud)),{ui:nativeHud.ui,mods:nativeHud.mods,last})};
  const loadout={id:1,name:'Caster',items:Object.entries(worn).map(([slot,i])=>({slot,id:i.id,location:'Equipped'})),matches:true};
  const status=()=>({classes:[{classId:cls,characters:[{name:'Stormweaver',active:true}],loadouts:[loadout],selectedLoadout:1}]});
  const p=contract.presentation;
  function armory(){
    const items={};for(const[slot,item]of Object.entries(worn)){const info=p.describe(structuredClone(item),cls,99,undefined,structuredClone(worn)),icon=p.icon(game.art.items,item);items[slot]={id:item.id,name:p.name(info.name,item.rarity,item.base),base:info.base?p.name(info.base):'',rarity:item.rarity,lines:info.lines,icon,perfection:D2ItemPerfection.rate(item,catalog)};}
    return {slots:contract.characters.doll(cls).slots,items,level:99};
  }
  const reader=D2BuildInformation.create({getGame:()=>game,getInformation:()=>contract.information,getPresentation:()=>p,armory,status});
  const data=await reader.read(cls,1);
  check('Native character rows are present',data.stats.length>=15);
  check('Every gear slot has a full native item description',Object.keys(data.gear.items).length===10&&Object.values(data.gear.items).every(i=>i.lines.length>0));
  check('All 20 equipped small charms are described with distinct identities',data.charms.length===20&&new Set(data.charms.map(i=>i.id)).size===20&&data.charms.every(i=>i.lines.length>0));
  check('Mercenary model and equipment are present',!!data.merc&&data.merc.items.length===3);
  check('Chosen skill modifier uses its native label',!!option&&data.skills.some(s=>s.choice?.name===option.name));
  check('Terror progress uses current clear rather than historical best',data.terror?.cleared===25&&data.terror.open===26&&!data.terror.current);
  check('Named equipment has calculated perfection',Object.values(data.gear.items).filter(i=>i.rarity!=='rare').every(i=>i.perfection?.percent===100));
  check('Rare and magic retain their native descriptions',!data.gear.items.ring1.perfection&&!data.charms[1].perfection&&data.gear.items.ring1.lines.length>0);
  check('Set mercenary equipment is scored',data.merc.items.some(r=>r.item.rarity==='set'&&r.item.perfection?.percent===100));
  const imperfect=structuredClone(worn.boots);for(const s of imperfect.stats){if(s.stat==='item_magicbonus')s.value=40;if(s.stat==='item_armor_percent')s.value=170;if(s.stat==='item_attackertakesdamage')s.value=5;}
  check('War Traveler excludes fixed added damage and averages three rolls',D2ItemPerfection.rate(imperfect,catalog).percent===33&&D2ItemPerfection.rate(imperfect,catalog).rolls===3);
  const near=structuredClone(worn.weapon),variable=near.stats.find(s=>s.stat==='fireresist');if(variable){for(const s of near.stats)if(['fireresist','coldresist','lightresist','poisonresist'].includes(s.stat))s.value=39;data.gear.items.weapon.perfection=D2ItemPerfection.rate(near,catalog);}
  const host=document.createElement('div');host.id='d2-build-info-proof';document.body.append(host);const root=host.attachShadow({mode:'open'}),view=D2BuildInfoView.create(root);
  const numbers=[['999','999'],['1,000','1K'],['2,470 / 2,470','2.5K / 2.5K'],['51113–56152','51K–56K'],['100000','0.1M'],['100k','0.1M'],['-1200','-1.2K'],['11,684,918','11.7M'],['1250%','1.3K%']];
  view.show({...data,stats:numbers.map(([value],i)=>({label:'number-'+i,value}))});
  check('Compact stats preserve raw values and abbreviate from 1000',numbers.every(([value,display],i)=>{const row=root.querySelector('[data-build-stat="number-'+i+'"]');return row?.dataset.statValue===value&&row.querySelector('dd').textContent===display;}));
  check('Mercenary follows Skills in the right column',root.querySelector('[data-build-section="mercenary"]').parentElement===root.querySelector('[data-build-section="skills"]'));
  view.close();
  function unchanged(){check('Native save bytes unchanged',localStorage.getItem('d2-survivors/save/v1')===raw);check('Native in-memory save unchanged',JSON.stringify(original.save)===before);check('Page retained',performance.timeOrigin===timeOrigin);}
  globalThis.D2BuildInfoProof=Object.freeze({show:()=>{view.show(data);unchanged();return {bounds:root.querySelector('dialog').getBoundingClientRect().toJSON(),checks};},status:()=>{unchanged();return {passed:true,checks,data};},dispose:()=>{view.dispose();host.remove();unchanged();delete globalThis.D2BuildInfoProof;}});
  unchanged();return {passed:true,checks};
}
