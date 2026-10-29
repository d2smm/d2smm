'use strict';
const byId=id=>document.getElementById(id);
async function invoke(action){
  const [active]=await chrome.tabs.query({active:true,currentWindow:true});
  const matches=await chrome.tabs.query({url:'https://d2survivors.lol/play/*'});
  const tab=active?.url?.startsWith('https://d2survivors.lol/play/')?active:matches.length===1?matches[0]:null;
  if(!tab)throw Error(matches.length?'Select the D2 Survivors tab first':'Open D2 Survivors first');
  let value;
  try{value=await chrome.tabs.sendMessage(tab.id,{action});}
  catch(error){
    console.info('[D2 Mods] attaching loader',error.message);
    const result=await chrome.runtime.sendMessage({action:'attach',tabId:tab.id});if(!result.ok)throw Error(result.error);
    value=await chrome.tabs.sendMessage(tab.id,{action});
  }
  if(value.error)throw Error(value.error);return value;
}
function report(error){byId('status').textContent='Unavailable';byId('detail').textContent=error.message;}
invoke('status').then(s=>{byId('status').textContent=s.runtime.status;byId('mod').textContent=s.mod?`${s.mod.name} ${s.mod.version}`:'No mods installed';}).catch(report);
byId('open').addEventListener('click',()=>invoke('open').then(()=>window.close()).catch(report));
