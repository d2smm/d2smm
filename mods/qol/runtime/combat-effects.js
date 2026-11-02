// Preserve native effect lifetimes and pooling; change only the confirmed impact's rendering.
(() => {
  'use strict';
  function create({core,profile}){
    const changed=new Map();
    if(!core.d2smm_qol_effect_profile(profile.life,...profile.colors,...profile.alphas,profile.width))throw Error('Critical-hit presentation profile is invalid');
    function restore(){for(const[sprite,value]of changed)if(!sprite.destroyed&&sprite.renderable===false)sprite.renderable=value;changed.clear();}
    function present(world){
      restore();if(!world||core.d2smm_qol_effect_visible(1))return;
      for(const flash of world.flashes){
        const sprite=flash.gfx;if(!sprite||sprite.destroyed)continue;
        const instructions=sprite.context?.instructions??[];core.d2smm_qol_effect_begin(flash.maxLife,Number(sprite.blendMode==='add'),instructions.length);
        for(let i=0;i<Math.min(3,instructions.length);i++){
          const command=instructions[i],style=command.data?.style??{},path=command.data?.path?.instructions??[],polygons=path.filter(p=>p.action==='poly'),circles=path.filter(p=>p.action==='circle'),moves=path.filter(p=>p.action==='moveTo');
          core.d2smm_qol_effect_part(i,command.action==='fill'?1:command.action==='stroke'?2:0,style.color,style.alpha,style.width??0,polygons.length,polygons[0]?.data?.[0]?.length??0,circles.length,moves.length,path.length-polygons.length-circles.length-moves.length);
        }
        if(!core.d2smm_qol_effect_end()){changed.set(sprite,sprite.renderable);sprite.renderable=false;}
      }
    }
    return Object.freeze({present,restore});
  }
  globalThis.D2QolEffects=Object.freeze({create});
})();
