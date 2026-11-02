// Raw native actor observations and returned C++ positions; no browser collision solver.
(() => {
  'use strict';
  function create({core,native,track}){
    const observed=new Map();let world=null;
    function begin(next){
      world=next;observed.clear();
      for(const enemy of world.enemies){
        if(enemy.dead||enemy.rank==='breakable')continue;
        const record=track(enemy),special=!!(enemy.heading||enemy.retiring||enemy.dummy||enemy.rank==='actBoss');
        if(!core.d2smm_qol_motion_observe(record.handle,enemy.x,enemy.y,enemy.radius,enemy.type.melee.length,enemy.type.ranged.length,Number(special),world.player.x,world.player.y,Number(!!enemy.anim),enemy.speed))throw Error('Native monster movement facts are invalid');
        observed.set(enemy,{record,x:enemy.x,y:enemy.y});
      }
    }
    function query(grid,original,x,y,r,callback){
      const matches=[];
      for(const[enemy,snapshot]of observed)if(enemy.x===x&&enemy.y===y&&enemy.radius+native.queryPadding===r)matches.push({enemy,snapshot});
      const moved=matches.filter(({snapshot})=>snapshot.x!==x||snapshot.y!==y);
      const candidates=moved.length?moved:matches;
      // Coincident stationary actors have no voluntary displacement to admit.
      if(!moved.length&&matches.length>1)return;
      if(candidates.length!==1)throw Error('Ordinary movement actor is ambiguous');
      const{enemy,snapshot}=candidates[0],handle=snapshot.record.handle,target=world.player;
      snapshot.target=target;
      if(!core.d2smm_qol_motion_begin(handle,x,y,target.x,target.y,target.radius,native.reach(world,enemy)))throw Error('Native movement candidate is invalid');
      const result=original.call(grid,x,y,r,other=>{
        // This verified native callback only writes this actor's x/y. Retain its private
        // pair exclusions, then replace its displacement with the C++ admission result.
        const beforeX=enemy.x,beforeY=enemy.y;let displaced=false;
        try{callback(other);displaced=enemy.x!==beforeX||enemy.y!==beforeY;}finally{enemy.x=beforeX;enemy.y=beforeY;}
        if(!core.d2smm_qol_motion_neighbor(handle,observed.get(other)?.record.handle??0,other.x,other.y,other.radius,Number(other===enemy),Number(!!other.dead),Number(displaced)))throw Error('Native collision neighbor is invalid');
      });
      enemy.x=core.d2smm_qol_motion_coordinate(handle,0);enemy.y=core.d2smm_qol_motion_coordinate(handle,1);core.d2smm_qol_motion_finish(handle);
      snapshot.x=enemy.x;snapshot.y=enemy.y;
      return result;
    }
    function finish(dt){for(const[enemy,{record,target}]of observed)if(core.d2smm_qol_motion_idle(record.handle,Number(enemy.dead||!!enemy.anim)))native.idle(enemy,dt,target.x-enemy.x,target.y-enemy.y);}
    function clear(){observed.clear();world=null;}
    return Object.freeze({begin,query,finish,clear});
  }
  globalThis.D2QolMotion=Object.freeze({create});
})();
