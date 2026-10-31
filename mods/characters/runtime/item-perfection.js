(() => {
  'use strict';
  let core=null;
  const ready=D2ManagerNative.create().then(value=>{core=value;});
  const utf8=new TextEncoder(),number=value=>typeof value==='number'?value:NaN;
  function rate(item,catalog){
    if(!['unique','set','runeword'].includes(item.rarity))return null;
    const definition=({unique:catalog?.uniques,set:catalog?.setItems,runeword:catalog?.runewords})[item.rarity]?.[item.name];
    if(!core)return {percent:null,rolls:0};
    core.d2smm_perfection_begin(!!definition&&Array.isArray(definition.props)&&Array.isArray(item.stats));
    function name(index,value){
      const bytes=utf8.encode(typeof value==='string'?value:'');
      if(bytes.length>128)return bytes.length;
      new Uint8Array(core.memory.buffer,core.d2smm_perfection_input(index),128).set(bytes);return bytes.length;
    }
    function group(props,records){
      let index=0;
      for(const prop of props??[]){
        core.d2smm_perfection_property(number(prop.min),number(prop.max),number(prop.par));
        for(const expected of prop.stats??[]){
          const actual=records?.[index++];
          core.d2smm_perfection_member(name(0,expected.stat),name(1,actual?.stat),expected.func,number(actual?.value),number(actual?.param));
        }
        core.d2smm_perfection_end();
      }
    }
    group(definition?.props,item.stats);
    for(const [index,props]of (definition?.bonus??[]).entries())group(props,item.bonus?.[index]);
    for(const stat of item.stats??[])core.d2smm_perfection_observe(name(0,stat.stat));
    const defense=catalog?.bases?.[item.base]?.defense;
    core.d2smm_perfection_armor(Array.isArray(defense),number(defense?.[0]),number(defense?.[1]),number(item.defense),item.rarity==='runeword'&&!!item.ethereal);
    const percent=core.d2smm_perfection_finish();
    return {percent:percent<0?null:percent,rolls:core.d2smm_perfection_rolls()};
  }
  globalThis.D2ItemPerfection=Object.freeze({ready,rate});
})();
