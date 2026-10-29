(() => {
  'use strict';
  function el(tag,text,attrs={}){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;for(const[key,value]of Object.entries(attrs))node.setAttribute(key,value);return node;}
  function create(actions){
    if(document.getElementById('d2-mod-system'))throw Error('Another mod manager owns this page');
    const host=el('div',undefined,{id:'d2-mod-system'}),shadow=host.attachShadow({mode:'open'}),style=el('style',globalThis.D2ModStyle);
    const launcher=el('button',undefined,{'class':'d2mods__launcher','data-action':'open-manager','aria-label':'Open Mod Manager','aria-haspopup':'dialog','aria-expanded':'false','title':'Mod Manager (M)'});launcher.hidden=true;
    const gemOff=el('img',undefined,{src:D2ModSkin.gemOff,alt:'',width:'66',height:'66',draggable:'false'}),gemOn=el('img',undefined,{src:D2ModSkin.gemOn,alt:'',width:'66',height:'66',draggable:'false'});launcher.append(gemOff,gemOn);
    const attention=D2AttentionView.create(launcher);
    const panel=el('dialog',undefined,{'class':'d2mods__panel','aria-labelledby':'d2mods-title'});
    const run=fn=>()=>{const focused=shadow.activeElement;return Promise.resolve().then(fn).catch(actions.report).finally(()=>{if(panel.open&&focused?.isConnected&&!shadow.activeElement)focused.focus({preventScroll:true});});};
    const button=(label,id,fn,variation='')=>{const b=el('button',label,{'class':'d2mods__button '+variation,'data-action':id});b.addEventListener('click',run(fn));return b;};
    const header=el('header',undefined,{'class':'d2mods__header'}),headerActions=el('div',undefined,{'class':'d2mods__header-actions'});
    const close=el('button','×',{'class':'d2mods__close','aria-label':'Close Mod Manager','data-action':'close'});close.addEventListener('click',()=>panel.close());
    headerActions.append(el('kbd','M',{'class':'d2mods__key'}),close);header.append(el('h2','Mod Manager',{id:'d2mods-title','class':'d2mods__title'}),headerActions);
    const empty=el('section',undefined,{'class':'d2mods__card d2mods__empty','data-empty-mod':''});
    const enable=button('Enable Loot Guard','enable-default',actions.enableDefault,'d2mods__button--primary');
    empty.append(el('strong','Loot Guard',{'class':'d2mods__name'}),el('p','Highlight valuable drops for every class.'),enable);
    const card=el('section',undefined,{'class':'d2mods__card','data-installed-mod':''}),heading=el('div',undefined,{'class':'d2mods__card-heading'}),identity=el('div');
    const name=el('div','Loot Guard',{'class':'d2mods__name'}),metadata=el('div',undefined,{'class':'d2mods__metadata'}),status=el('span','',{'class':'d2mods__status','data-runtime-status':''});
    const currentVersion=el('span','',{'data-mod-version':'current'}),latestVersion=el('span','',{'data-mod-version':'latest'});
    metadata.append(currentVersion,document.createTextNode(' · '),latestVersion);
    identity.append(name,metadata);heading.append(identity,status);
    const inputs={};
    function setting(key,label,hint){
      const row=el('label',undefined,{'class':'d2mods__row'}),text=el('span',label,{'class':'d2mods__row-label'});
      if(hint)text.append(el('span',hint,{'class':'d2mods__hint'}));
      const input=el('input',undefined,{type:'checkbox','data-setting':key,'aria-label':label});inputs[key]=input;
      input.addEventListener('change',()=>actions.configure({[key]:input.checked}).catch(actions.report));row.append(text,input);return row;
    }
    const filter=setting('enabled','Loot filter');inputs.enabled.dataset.action='toggle-filter';
    const options=el('div',undefined,{'class':'d2mods__options'});
    options.append(setting('sound','[Notification] Sound on matched drops'),setting('testFcr','[Testing] Match on common items'));
    const rules=el('details',undefined,{'class':'d2mods__details','data-section':'rules'}),ruleList=el('ol',undefined,{'class':'d2mods__rules'});
    const ruleSummary=el('summary','Rules');rules.append(ruleSummary,ruleList);
    const modUpdate=button('Update Loot Guard','install-mod-update',actions.installModUpdate,'d2mods__button--primary');
    const modUpdateActions=el('div',undefined,{'class':'d2mods__actions','data-mod-update-actions':''}),managerRequired=el('p','Update Mod Manager first.',{'class':'d2mods__update-requirement','data-manager-required':''});
    modUpdateActions.append(modUpdate);modUpdateActions.hidden=true;managerRequired.hidden=true;
    card.append(heading,managerRequired,modUpdateActions,filter,options,rules);
    const more=el('details',undefined,{'class':'d2mods__details','data-section':'more'}),fileActions=el('div',undefined,{'class':'d2mods__actions'});
    const showGemRow=el('label',undefined,{class:'d2mods__row'}),showGem=el('input',undefined,{type:'checkbox','data-preference':'showGem','aria-label':'Show gem button'});showGemRow.append(el('span','Show gem button'),showGem);showGem.addEventListener('change',()=>actions.configurePreferences({showGem:showGem.checked}).catch(actions.report));
    const protection=setting('protectMatches','Protect matches from hide / auto-sell');
    const input=el('input',undefined,{type:'file',accept:'.json,.d2installer.html,application/json,text/html','data-mod-file':''});input.hidden=true;
    const install=button('Install mod file','install',()=>input.click(),'d2mods__button--quiet');
    input.addEventListener('change',()=>{if(input.files[0])actions.installFile(input.files[0]).catch(actions.report);input.value='';});
    const jsonInput=el('input',undefined,{type:'file',accept:'.json,application/json','data-loot-json':''});jsonInput.hidden=true;
    const importJSON=button('Import JSON','import-json',()=>jsonInput.click(),'d2mods__button--quiet');
    jsonInput.addEventListener('change',()=>{if(jsonInput.files[0])actions.installFile(jsonInput.files[0]).catch(actions.report);jsonInput.value='';});
    const exportButton=button('Export JSON','export',()=>{const source=actions.exportText();if(!source)return;const url=URL.createObjectURL(new Blob([source],{type:'application/json'})),a=el('a');a.href=url;a.download='loot-guard.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'d2mods__button--quiet');
    const remove=button('Remove mod','remove',actions.uninstall,'d2mods__button--quiet d2mods__button--danger');
    fileActions.append(install,remove);
    const ruleActions=el('div',undefined,{'class':'d2mods__actions'});ruleActions.append(importJSON,exportButton,jsonInput);rules.insertBefore(ruleActions,ruleList);
    const bookmark=el('a','Mod Manager bookmark',{'class':'d2mods__bookmark','data-action':'bookmark'});bookmark.title='Drag to your bookmarks bar';bookmark.hidden=true;
    more.append(el('summary','More options'),showGemRow,protection,fileActions,input,bookmark);
    const footer=el('footer',undefined,{'class':'d2mods__footer'}),check=button('Check for updates','check-updates',actions.checkUpdates),version=el('span','',{'class':'d2mods__version'});
    footer.append(check,version);
    const updateActions=el('div',undefined,{'class':'d2mods__actions','data-update-actions':''});
    const managerUpdate=button('Update Mod Manager','install-manager-update',actions.installManagerUpdate,'d2mods__button--primary');
    updateActions.append(managerUpdate);
    const notice=el('p','',{'class':'d2mods__notice',role:'status'}),error=el('p','',{'class':'d2mods__notice',role:'alert'});
    const characters=button('Characters','characters',actions.characters),gear=button('Gear loadouts','gear',actions.gear),characterActions=el('div',undefined,{class:'d2mods__character-actions'});characterActions.append(characters,gear);
    panel.append(header,characterActions,empty,card,more,footer,updateActions,notice,error);shadow.append(style,attention.host,panel);document.body.append(host);
    launcher.addEventListener('click',actions.show);
    let session={inGame:false,atTitle:false,canExit:false,anchor:null};
    panel.addEventListener('close',()=>{launcher.setAttribute('aria-expanded','false');attention.display({visible:!launcher.hidden,open:false,anchor:session.anchor});actions.focusGame();});
    for(const eventName of ['pointerdown','pointerup','click','keydown','keyup'])host.addEventListener(eventName,event=>event.stopPropagation());
    let rulesHash=null;
    function paint(s,pack,installerBootstrap){
      empty.hidden=!!s.mod;card.hidden=!s.mod;protection.hidden=!s.mod;exportButton.hidden=!s.mod;remove.hidden=!s.mod;
      session=s.session;const on=!!s.mod?.settings.enabled;launcher.hidden=!s.ready||!s.preferences.showGem||!session.inGame||!session.anchor;launcher.dataset.state=on?'on':'off';gemOn.hidden=!on;gemOff.hidden=on;launcher.setAttribute('aria-expanded',String(panel.open));launcher.setAttribute('aria-label','Open Mod Manager — mods '+(on?'on':'off'));launcher.title='Mod Manager (M) · Mods '+(on?'on':'off');showGem.checked=s.preferences.showGem;showGem.disabled=s.busy;
      attention.paint(s.attention);attention.display({visible:!launcher.hidden,open:panel.open,anchor:session.anchor});
      version.textContent='v'+s.version;
      if(s.mod){
        name.textContent=s.mod.name;currentVersion.textContent='Current '+s.mod.version+(s.mod.customRules?' · Edited':'');
        latestVersion.textContent=s.updates?.latestMod?'Latest '+s.updates.latestMod.version:s.checking?'Checking latest…':s.updates?'Latest unavailable':'Latest not checked';
        ruleSummary.textContent='Rules ('+s.mod.ruleCount+')';
        status.textContent=s.runtime.status==='Disabled'?'Off':s.runtime.status;
        for(const[key,node]of Object.entries(inputs)){node.checked=s.mod.settings[key];node.disabled=s.busy;}
        if(rulesHash!==s.mod.sha256){ruleList.replaceChildren();for(const id of pack.builtinRules){const rule=globalThis.D2LootRules.catalog.find(r=>r.id===id);ruleList.append(el('li',rule.reason));}for(const rule of pack.extraRules)ruleList.append(el('li',rule.reason));rulesHash=s.mod.sha256;}
      }
      for(const b of [enable,install,importJSON,exportButton,remove])b.disabled=s.busy;
      importJSON.disabled=s.busy||!!s.updates?.manager;modUpdate.textContent=s.mod?.customRules?'Replace edited rules':'Update Loot Guard';
      modUpdate.disabled=s.busy||s.checking||!!s.updates?.manager;managerUpdate.disabled=s.busy||s.checking||(!session.atTitle&&!session.canExit);
      check.disabled=s.checking||s.busy;check.textContent=s.checking?'Checking…':'Check for updates';
      modUpdate.hidden=!s.mod||!s.updates?.mod||!!s.updates?.manager;modUpdateActions.hidden=modUpdate.hidden;
      managerRequired.hidden=!s.mod||!s.updates?.mod||!s.updates?.manager;
      managerUpdate.hidden=!s.updates?.manager;updateActions.hidden=managerUpdate.hidden;
      if(s.updates?.manager)managerUpdate.textContent=(session.atTitle?'Update Mod Manager · ':'Save and Exit to update · ')+s.updates.manager.version;
      notice.textContent=s.notice;notice.hidden=!s.notice;
      error.textContent=s.runtime.detail;error.hidden=!s.runtime.detail;
      if(installerBootstrap){bookmark.href=globalThis.D2ModUpdates.bookmarklet(installerBootstrap);bookmark.hidden=false;}
    }
    return Object.freeze({panel,paint,paintAttention:attention.paint,dispose:attention.dispose});
  }
  globalThis.D2ModView=Object.freeze({create});
})();
