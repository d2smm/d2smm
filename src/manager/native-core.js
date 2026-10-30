(() => {
  'use strict';
  async function create(){const bytes=Uint8Array.from(atob(D2ManagerKernel.wasm),c=>c.charCodeAt(0));const {instance}=await WebAssembly.instantiate(bytes,{});return instance.exports;}
  globalThis.D2ManagerNative=Object.freeze({create});
})();
