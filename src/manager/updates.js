(() => {
  'use strict';
  const origin='https://d2s.arken.gg',feedURL=`${origin}/updates/stable.json`;
  function version(value){if(typeof value!=='string'||!/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(value))throw Error('Invalid release version');return value.split('.').map(Number);}
  function newer(a,b){const x=version(a),y=version(b);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;}
  function descriptor(value,kind){
    if(!value||typeof value!=='object')throw Error('Missing release descriptor');version(value.version);
    const url=new URL(value.url);
    const pattern=kind==='manager'?/^\/manager\/\d+\.\d+\.\d+\/bootstrap\.js$/:/^\/mods\/[a-z][a-z0-9-]+\/\d+\.\d+\.\d+\.d2mod\.json$/;
    if(url.origin!==origin||url.username||url.password||url.search||url.hash||!pattern.test(url.pathname))throw Error('Update URL is outside the canonical release host');
    if(!url.pathname.includes(`/${value.version}/`)&&!url.pathname.endsWith(`/${value.version}.d2mod.json`))throw Error('Release URL/version mismatch');
    if(!/^[a-f0-9]{64}$/.test(value.sha256)||!Number.isSafeInteger(value.bytes)||value.bytes<1||value.bytes>(kind==='manager'?1048576:262144))throw Error('Invalid release size or checksum');
    return {...value};
  }
  async function bytes(url,limit,fetcher=fetch){
    const response=await fetcher(url,{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error(`Update download failed (${response.status})`);
    if(response.url&&new URL(response.url).origin!==origin)throw Error('Unexpected update origin');
    const reader=response.body.getReader(),chunks=[];let total=0;
    try{for(;;){const{value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit)throw Error('Update exceeds its size limit');chunks.push(value);}}finally{await reader.cancel();reader.releaseLock();}
    const result=new Uint8Array(total);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
  }
  async function digest(data){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');}
  async function download(entry,kind,fetcher=fetch){const d=descriptor(entry,kind),data=await bytes(d.url,d.bytes,fetcher);if(data.byteLength!==d.bytes||await digest(data)!==d.sha256)throw Error('Update checksum mismatch; current installation kept');return new TextDecoder('utf-8',{fatal:true}).decode(data);}
  async function check(mod,managerVersion,fetcher=fetch){
    const data=JSON.parse(new TextDecoder().decode(await bytes(feedURL,65536,fetcher)));
    if(data.schema!=='d2mods.updates.v1'||data.channel!=='stable'||!Array.isArray(data.mods)||data.mods.length>50)throw Error('Unsupported update manifest');
    const manager=descriptor(data.manager,'manager'),ids=new Set();
    for(const entry of data.mods){descriptor(entry,'mod');if(!/^[a-z][a-z0-9-]{1,63}$/.test(entry.id)||ids.has(entry.id)||!entry.url.includes(`/mods/${entry.id}/`))throw Error('Invalid mod update identity');ids.add(entry.id);}
    const match=mod&&data.mods.find(entry=>entry.id===mod.id);
    if(match&&match.version===mod.version&&match.sha256!==mod.sha256&&!mod.customRules)throw Error('Published mod changed without a version change');
    return{checkedAt:new Date().toISOString(),mod:match&&newer(match.version,mod.version)?match:null,manager:newer(manager.version,managerVersion)?manager:null,latestManager:manager,latestMod:match??null};
  }
  function integrity(hex){return 'sha256-'+btoa(String.fromCharCode(...hex.match(/../g).map(x=>parseInt(x,16))));}
  function loadRuntime(entry){
    const d=descriptor(entry,'manager');globalThis.D2ModsBootstrap=d;
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=d.url;script.integrity=integrity(d.sha256);script.crossOrigin='anonymous';script.type='text/javascript';
      const timeout=setTimeout(()=>{script.remove();reject(Error('Manager update activation timed out'));},15000);
      script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error('Manager update failed to load or verify'));};
      script.onload=async()=>{try{await globalThis.D2ModsStartup;await globalThis.D2Mods?.ready;if(globalThis.D2Mods?.version!==d.version)throw Error('Manager version did not match the downloaded release');clearTimeout(timeout);script.remove();resolve(globalThis.D2Mods);}catch(error){clearTimeout(timeout);script.remove();reject(error);}};
      document.head.append(script);
    });
  }
  function bookmarklet(entry){const d=descriptor(entry,'manager');return 'javascript:'+encodeURIComponent(`void(async()=>{if(location.origin!=='https://d2survivors.lol'||!location.pathname.startsWith('/play/')){alert('Open D2 Survivors first');return;}if(globalThis.D2Mods){D2Mods.show();return;}globalThis.D2ModsBootstrap=${JSON.stringify(d)};const s=document.createElement('script');s.type='text/javascript';s.src=${JSON.stringify(d.url)};s.integrity=${JSON.stringify(integrity(d.sha256))};s.crossOrigin='anonymous';s.onload=async()=>{await globalThis.D2ModsStartup;await globalThis.D2Mods?.ready;globalThis.D2Mods?.show();s.remove();};s.onerror=()=>alert('The mod manager could not be loaded.');document.head.append(s);})()`);}
  globalThis.D2ModUpdates=Object.freeze({origin,feedURL,version,newer,descriptor,digest,download,check,loadRuntime,bookmarklet});
})();
