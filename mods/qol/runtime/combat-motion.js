// Native object identity/facts and C++ outcomes; routing and phase policy stay in Wasm.
(() => {
  'use strict';
  function create({core,native,track}){
    const observed=new Map();let world=null,targets=new WeakMap(),nextTarget=1;
    function targetId(target){if(!target)return 0;let id=targets.get(target);if(!id){if(nextTarget>0xffffffff)throw Error('Native target identity capacity exceeded');id=nextTarget++;targets.set(target,id);}return id;}
    function observe(enemy){
      const record=track(enemy),target=record.nativeTarget,id=targetId(target),special=!!(enemy.heading||enemy.retiring||enemy.dummy||enemy.rank==='actBoss');
      record.nativeTargetId=id;
      if(!core.d2smm_qol_motion_observe(record.handle,enemy.x,enemy.y,enemy.radius,enemy.type.melee.length,enemy.type.ranged.length,Number(special),id,target?.x??0,target?.y??0,target?.radius??0,target?.life??0,Number(!!enemy.anim),enemy.speed,enemy.animTime,enemy.direction,(enemy.anim??enemy.anims?.WL)?.directions??0))throw Error('Native monster movement facts are invalid');
      const snapshot={record,x:enemy.x,y:enemy.y};observed.set(enemy,snapshot);return snapshot;
    }
    function begin(next,dt){
      world=next;observed.clear();if(!core.d2smm_qol_motion_frame(Number(!!world.walls),world.time,dt))throw Error('Native movement frame is invalid');
      for(const enemy of world.enemies){if(enemy.dead)continue;if(enemy.rank==='breakable'){if(!core.d2smm_qol_motion_prop(enemy.x,enemy.y,enemy.radius))throw Error('Scenery observation is invalid');}else observe(enemy);}
    }
    function geometry(handle){
      if(!core.d2smm_qol_motion_geometry_begin(handle))throw Error('Navigation observation ownership changed');
      for(const[enemy,{record}]of observed)if(!core.d2smm_qol_motion_pose(record.handle,enemy.x,enemy.y,enemy.radius,Number(!!enemy.dead),Number(!!enemy.anim)))throw Error('Native body pose is invalid');
      for(const enemy of world.enemies){if(enemy.dead)continue;if(enemy.rank==='breakable'){if(!core.d2smm_qol_motion_prop(enemy.x,enemy.y,enemy.radius))throw Error('Scenery observation is invalid');}else if(!observed.has(enemy))observe(enemy);}
    }
    function query(grid,original,x,y,r,callback){
      const matches=[];
      for(const enemy of world.enemies)if(!enemy.dead&&enemy.rank!=='breakable'&&enemy.x===x&&enemy.y===y&&enemy.radius+native.queryPadding===r){const snapshot=observed.get(enemy)??observe(enemy);matches.push({enemy,snapshot});}
      const moved=matches.filter(({snapshot})=>snapshot.x!==x||snapshot.y!==y),candidates=moved.length?moved:matches;
      if(!moved.length&&matches.length>1)return;
      if(candidates.length!==1)throw Error('Ordinary movement actor is ambiguous');
      const{enemy,snapshot}=candidates[0],handle=snapshot.record.handle,target=world.player,id=targetId(target);
      snapshot.target=target;snapshot.record.nativeTarget=target;snapshot.record.nativeTargetId=id;
      if(!core.d2smm_qol_motion_begin(handle,x,y,id,target.x,target.y,target.radius,target.life,native.reach(world,enemy)))throw Error('Native movement candidate is invalid');
      const result=original.call(grid,x,y,r,other=>{
        const beforeX=enemy.x,beforeY=enemy.y;let displaced=false;
        try{callback(other);displaced=enemy.x!==beforeX||enemy.y!==beforeY;}finally{enemy.x=beforeX;enemy.y=beforeY;}
        if(!core.d2smm_qol_motion_neighbor(handle,observed.get(other)?.record.handle??0,other.x,other.y,other.radius,Number(other===enemy),Number(!!other.dead),Number(displaced),Number(!!other.anim)))throw Error('Native collision neighbor is invalid');
      });
      if(core.d2smm_qol_motion_needs_route(handle)){geometry(handle);core.d2smm_qol_motion_resolve(handle);}
      enemy.x=core.d2smm_qol_motion_coordinate(handle,0);enemy.y=core.d2smm_qol_motion_coordinate(handle,1);core.d2smm_qol_motion_finish(handle);
      snapshot.x=enemy.x;snapshot.y=enemy.y;return result;
    }
    function finish(dt){
      for(const[enemy,{record,target}]of observed){if(enemy.dead||enemy.anim)continue;
        if(core.d2smm_qol_motion_idle(record.handle,0)){native.idle(enemy,dt,target.x-enemy.x,target.y-enemy.y);continue;}
        if(!core.d2smm_qol_motion_guided(record.handle)||!enemy.anims?.WL)continue;
        const vx=core.d2smm_qol_motion_velocity(record.handle,0),vy=core.d2smm_qol_motion_velocity(record.handle,1),directions=enemy.anims.WL.directions,direction=native.direction(vx,vy,directions),phase=core.d2smm_qol_motion_walk_phase(record.handle,direction,directions);
        if(phase<0)throw Error('Native walk direction is invalid');enemy.animTime=phase;native.walk(enemy,vx,vy,1,dt);
      }
    }
    function status(){const list=new Map();for(const{record}of observed.values()){const t=record.nativeTarget,id=record.nativeTargetId;if(!t||!id)continue;const entry=list.get(id)??{id,kind:t.hireling??'hero',x:t.x,y:t.y,radius:t.radius,actors:0};entry.actors++;list.set(id,entry);}return {following:core.d2smm_qol_navigation_count(1),waiting:core.d2smm_qol_navigation_count(3),unreachable:core.d2smm_qol_navigation_count(4),limited:core.d2smm_qol_navigation_count(5),guided:core.d2smm_qol_navigation_count(8),walkRestarts:core.d2smm_qol_navigation_count(9),targets:[...list.values()]};}
    function clear(){observed.clear();world=null;targets=new WeakMap();nextTarget=1;}
    return Object.freeze({begin,query,finish,status,clear});
  }
  globalThis.D2QolMotion=Object.freeze({create});
})();
