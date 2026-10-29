// Controlled native-action receivers exercise cancellation without a user save.
async function checkGameExit(source){
  const frame=document.createElement('iframe');frame.hidden=true;document.body.append(frame);const w=frame.contentWindow;w.eval(source);
  const checks=[],check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
  let bridge;
  try{
    let exits=0,campExits=0,confirmations=0;
    const frontend={surface:{screen:null},gameMenu(actions){this.actions=actions;this.surface.screen={native:true};},exitNote(note,actions,label){confirmations++;this.note=note;this.confirm=actions;this.label=label;this.surface.screen={confirmation:true};}};
    const originalMenu=frontend.gameMenu,originalConfirm=frontend.exitNote;
    class NativeReceiver{
      state='playing';camp=false;frontend=frontend;
      pause(){this.state='paused';this.showMenu();}
      showMenu(){this.state='paused';this.frontend.gameMenu({exit:()=>this.saveAndExit(),resume:()=>this.resume()});}
      campMenu(){this.state='paused';this.frontend.gameMenu({exit:()=>{campExits++;this.camp=false;this.state='select';w.document.body.classList.add('no-run');},resume:()=>this.resume()});}
      saveAndExit(){this.frontend.exitNote({text:'Native save warning'}, {exit:()=>this.leaveRun(),resume:()=>this.resume()},'EXIT ANYWAY');}
      leaveRun(){exits++;this.camp=true;this.state='camp';}
      resume(){this.state=this.camp?'camp':'playing';}
    }
    const game=new NativeReceiver(),screens=new WeakSet();
    bridge=w.D2ModGameMenu.create(()=>{}, {currentGame:()=>game,connectGame:async()=>({Game:NativeReceiver,url:'controlled-receiver'}),prepareMenu:async()=>({methodSource:originalMenu.toString(),screens,isNativeMenu:s=>!!s?.native,render:function(...args){const value=originalMenu.apply(this,args);screens.add(this.surface.screen);return value;},dispose:()=>{},evidence:{fixture:true}})});
    for(let i=0;i<30&&!bridge.status().connected;i++)await wait(10);
    check('Exit bridge connects to the controlled native boundary',bridge.status().connected);
    const first=bridge.exitToMenu();await wait(30);
    check('Native warning and confirmation are preserved',confirmations===1&&frontend.note.text==='Native save warning'&&frontend.label==='EXIT ANYWAY'&&exits===0);
    check('Temporary confirmation hook is already restored',frontend.exitNote===originalConfirm);
    let duplicate=false;try{await bridge.exitToMenu();}catch(error){duplicate=true;}
    check('A second request cannot bypass confirmation',duplicate&&exits===0&&confirmations===1);
    frontend.confirm.resume();check('Cancel resolves without exiting or updating',await first===false&&game.state==='playing'&&exits===0);
    const second=bridge.exitToMenu();await wait(30);frontend.confirm.exit();
    check('Confirmed run exit continues through native camp exit to title',await second===true&&exits===1&&campExits===1&&game.state==='select');
    game.state='playing';game.camp=false;w.document.body.classList.remove('no-run');
    const third=bridge.exitToMenu();await wait(30);const retained=frontend.confirm;await bridge.dispose();
    check('Disposal cancels only the mod continuation',await third===false&&exits===1);
    retained.exit();check('Native confirmation still works after disposal',exits===2&&game.state==='camp'&&campExits===1);
    check('Native menu property is restored',frontend.gameMenu===originalMenu&&frontend.exitNote===originalConfirm);
    return{passed:true,checks,scope:'Real exit helper with controlled native-action receivers; native save warning is never bypassed'};
  }finally{await bridge?.dispose();frame.remove();}
}
