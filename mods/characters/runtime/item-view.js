(() => {
  'use strict';
  function read(p,art,item,cls,level,worn,wearer,score=true){
    const copy=structuredClone(item),info=p.describe(copy,cls,level,wearer,worn);
    if(typeof info?.name!=='string'||!Array.isArray(info.lines)||info.lines.some(l=>typeof l.text!=='string'))throw Error('Item details are unavailable for this game update.');
    const icon=p.icon(art,copy);
    return {id:item.id,name:p.name(info.name,item.rarity,item.base),base:p.name(info.base??item.base),rarity:item.rarity,
      perfection:score?D2ItemPerfection.rate(item,p.catalog?.()):null,
      lines:info.lines.map(l=>({text:l.text,implicit:!!l.implicit,inert:!!l.inert,unusable:!!l.unusable,tone:l.tone})),
      icon:icon&&typeof icon.url==='string'&&['https:','blob:','data:'].includes(new URL(icon.url,location.href).protocol)?icon:null};
  }
  function worn(save,cls,loadout,selected){
    if(loadout.id===selected)return save.equippedByClass?.[cls]??{};
    const pool=[...Object.values(save.equippedByClass?.[cls]??{}),...(save.inventoryByClass?.[cls]??[]),...(save.stashTabs?.[cls]??[]),...['shared1','shared2','shared3'].flatMap(tab=>save.stashTabs?.[tab]??[])];
    return Object.fromEntries(Object.entries(loadout.items).filter(([,id])=>id).map(([slot,id])=>[slot,pool.find(i=>i?.id===id)]));
  }
  globalThis.D2ItemView=Object.freeze({read,worn});
})();
