(() => {
  'use strict';
  function create(){
    const nodes=new Map(),style=document.createElement('style');
    style.id='d2smm-control-badges-style';style.textContent='.d2smm-control-badges__dot{position:absolute;top:2px;right:2px;width:6px;height:6px;border-radius:50%;background:#ed3229;box-shadow:0 0 0 1px #360b09;z-index:3;pointer-events:none}.d2smm-control-badges__dot[hidden]{display:none!important}';document.head.append(style);
    function remove(button,record){record.dot.remove();if(button.getAttribute('aria-description')===record.description)record.previous===null?button.removeAttribute('aria-description'):button.setAttribute('aria-description',record.previous);nodes.delete(button);}
    function update(target,elements,unread,description='Updated'){
      const controls=new Set(elements);
      for(const[button,record]of nodes)if(record.target===target&&(!controls.has(button)||!button.isConnected))remove(button,record);
      for(const button of controls){let record=nodes.get(button);if(record&&record.target!==target)throw Error('A badge target already owns this control');
        if(!record){const dot=document.createElement('span');dot.className='d2smm-control-badges__dot';dot.dataset.d2smmBadge=target;dot.setAttribute('aria-hidden','true');dot.hidden=true;record={target,description,dot,previous:button.getAttribute('aria-description')};nodes.set(button,record);button.append(dot);}
        record.dot.hidden=!unread;
        if(unread)button.setAttribute('aria-description',description);else if(button.getAttribute('aria-description')===record.description)record.previous===null?button.removeAttribute('aria-description'):button.setAttribute('aria-description',record.previous);
      }
    }
    return Object.freeze({update,dispose(){for(const[button,record]of nodes)remove(button,record);style.remove();}});
  }
  globalThis.D2ControlBadgeView=Object.freeze({create});
})();
