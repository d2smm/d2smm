'use strict';
async function attach(tabId){
  await chrome.scripting.executeScript({target:{tabId},world:'MAIN',files:['generated/bootstrap.js']});
  await chrome.scripting.executeScript({target:{tabId},world:'ISOLATED',files:['bridge.js']});
}
chrome.runtime.onInstalled.addListener(async()=>{
  const tabs=await chrome.tabs.query({url:'https://d2survivors.lol/play/*'});
  for(const tab of tabs){try{await attach(tab.id);}catch(error){console.error('[D2 Mods loader]',error);}}
});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||message?.action!=='attach'||!Number.isInteger(message.tabId))return;
  chrome.tabs.get(message.tabId).then(tab=>{
    if(!tab.url?.startsWith('https://d2survivors.lol/play/'))throw Error('Open D2 Survivors first');
    return attach(tab.id);
  }).then(()=>reply({ok:true}),error=>{console.error('[D2 Mods loader]',error);reply({ok:false,error:error.message});});
  return true;
});
