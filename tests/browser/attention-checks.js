(() => {
  const checks=[],check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);};
  let time=0,timer=null,updates=0;
  const attention=D2ModAttention.create({now:()=>time,schedule:(fn,delay)=>{timer={fn,at:time+delay};return timer;},cancel:()=>{timer=null;},onChange:()=>updates++});
  const loot=attention.source('loot','Loot Guard'),other=attention.source('other','Other Mod');
  loot.raise('ring',{title:'Rare ring',untilResolved:true});other.raise('ready',{title:'Ready'});
  check('Independent mods share the attention list',attention.snapshot().length===2);
  const emitted=updates;time=30000;other.raise('ready',{title:'Ready'});
  check('Repeated unchanged notices do not repaint or extend lifetime',updates===emitted&&attention.snapshot().find(e=>e.source==='other').expiresAt===60000);
  time=60000;const due=timer;timer=null;due.fn();
  check('Ordinary notices expire at sixty seconds',attention.snapshot().length===1&&attention.snapshot()[0].source==='loot');
  check('Unresolved loot survives expiration',attention.snapshot()[0].expiresAt===null&&timer===null);
  other.raise('ring',{title:'Different event'});loot.resolve('ring');
  check('Resolving one mod cannot clear another',attention.snapshot().length===1&&attention.snapshot()[0].source==='other');
  other.clear();check('Disabled source clears its notices',attention.snapshot().length===0&&timer===null);
  loot.raise('two',{title:'Another item',untilResolved:true});loot.dispose();
  check('Source disposal removes unresolved notices',attention.snapshot().length===0);
  check('Disposed source cannot resurrect its notices',loot.raise('late',{title:'Late'})===false);
  let duplicate=false;try{attention.source('other','Duplicate');}catch(error){duplicate=true;}
  check('Duplicate live source ownership is rejected',duplicate);
  other.raise('last',{title:'Last'});attention.dispose();
  check('Manager disposal cancels expiration and removes everything',attention.snapshot().length===0&&timer===null);
  return{passed:true,checks};
})()
