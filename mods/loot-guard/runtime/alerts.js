(() => {
  'use strict';
  globalThis.D2LootAlerts = Object.freeze({create({evaluate,play,now=()=>performance.now(),cooldownMs=10000}) {
    let world=null,last=-Infinity,requests=0;
    let seen=new WeakSet();
    function prime(next) {
      if(world===next)return;
      reset(next);
    }
    function reset(next) {
      world=next;seen=new WeakSet();
      for(const pickup of next?.pickups||[])seen.add(pickup);
    }
    function signal() {
      if(now()-last<cooldownMs)return false;
      last=now();requests++;play();return true;
    }
    function observe(next,enabled) {
      if(world!==next){prime(next);return false;}
      let trigger=false;
      for(const pickup of next?.pickups||[]) {
        if(seen.has(pickup))continue;
        seen.add(pickup);
        if(enabled&&!pickup.dead&&!pickup.discarded&&pickup.item&&evaluate(pickup.item).match)trigger=true;
      }
      return trigger ? signal() : false;
    }
    return Object.freeze({prime,reset,observe,signal,requests:()=>requests});
  }});
})();
