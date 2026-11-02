(() => {
  'use strict';
  async function create({getGame}){
    if(typeof getGame!=='function')throw Error('Native game provider is required');
    const walls=()=>{const world=getGame()?.world;if(!world)throw Error('Native navigation world is unavailable');return world.walls;};
    const game={point_open:(x,y)=>{const w=walls();return w?Number(!w.blocked(x,y)):1;},segment_clear:(x,y,tx,ty)=>{const w=walls();return w?Number(w.clearWay(x,y,tx,ty)):1;}};
    const bytes=Uint8Array.from(atob(D2ManagerKernel.wasm),c=>c.charCodeAt(0));const {instance}=await WebAssembly.instantiate(bytes,{game});return instance.exports;
  }
  globalThis.D2ManagerNative=Object.freeze({create});
})();
