// Regression for native binding discovery, using the actual loaded game modules.
// Inspection and a synthetic tooltip only: no replay, inventory or save mutation.
async function checkGameContract(){
  'use strict';
  if(!globalThis.__D2GalleryLease?.contextId||!__D2GalleryLease.targetId||location.origin!=='https://d2survivors.lol')throw Error('Verified isolated game required');
  const checks=[],before=localStorage.getItem('d2-survivors/save/v1');
  const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error(name);};
  const reader=D2GameContract.isClassSaveReader;
  check('Terror getter is selected by returned field',reader((save,cls)=>save.terror?.[cls]??null,'terror'));
  check('Other save/class getters are rejected',!reader((save,cls)=>save.clones?.[cls]??null,'terror'));
  check('Mutating lookalikes are rejected',!reader((save,cls)=>{save.touched=true;return save.terror?.[cls]??null;},'terror'));
  const contract=await D2GameContract.connect();
  check('Character bindings resolve',!!contract?.characters);
  check('Loot bindings resolve',!!contract?.loot);
  check('Item presentation resolves',!!contract?.presentation);
  check('Build information resolves',!!contract?.information);
  const item={id:'contract-tooltip',base:'Ring',type:'ring',rarity:'magic',name:'Test Ring',level:1,mods:[{stat:'strength',value:5}],forge:{t:{m0:1}}};
  const original=JSON.stringify(item),tooltip=contract.presentation.describe(item,'amazon',99);
  check('Forge tooltip includes tempering count',tooltip.lines.some(line=>line.text==='Tempered (1)'));
  check('Tooltip keeps the input item unchanged',JSON.stringify(item)===original);
  check('Terror progress stays class-specific',contract.information.progress({terror:{amazon:{open:7}}},'amazon')?.open===7);
  // The running manager already owns its hooks; preparing a second adapter
  // would correctly reject those wrapped methods as foreign native source.
  let status;
  for(let attempt=0;attempt<250;attempt++){
    status=D2Mods.status();
    if(status.terrorized.connected&&status.terrorized.gather?.connected&&status.qol.connected&&status.qol.combat.connected)break;
    if(status.terrorized.problem||status.terrorized.gather?.problem||status.qol.problem||status.qol.combat.problem)break;
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  check('Replay adapter is connected',status.terrorized.connected&&!status.terrorized.problem);
  check('Gather adapter is connected',status.terrorized.gather?.connected&&!status.terrorized.gather.problem);
  check('Charm adapter is connected',status.qol.connected&&!status.qol.problem);
  check('Combat and hit-effect adapters are connected',status.qol.combat.connected&&!status.qol.combat.problem);
  check('Save storage is unchanged',localStorage.getItem('d2-survivors/save/v1')===before);
  return {passed:true,game:contract.url,checks,errors:{characters:contract.characterError,loot:contract.lootError,presentation:contract.presentationError,information:contract.informationError}};
}
