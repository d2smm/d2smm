(() => {
  'use strict';
  const skin=globalThis.D2ModSkin,font=new FontFace('D2ModHeading',`url(${skin.font})`);document.fonts.add(font);
  const ready=font.load().catch(error=>console.warn('[D2 Mods] heading font',error));
  const css=`
:host{--d2-panel:url("${skin.panel}");--d2-button:url("${skin.button}");color:#efe2c4;font-size:18px}
dialog,.d2mods__panel{isolation:isolate;border:26px solid transparent;border-image:var(--d2-panel) 10% / 26px / 0 stretch;background:#080706;border-radius:0;box-shadow:0 20px 90px #000d;padding:22px 24px;color:#efe2c4}
dialog::before,.item-tooltip::before{content:'';position:absolute;inset:0;border:0 solid transparent;border-image:var(--d2-panel) 10% fill / 0 / 0 stretch;filter:contrast(1.2) brightness(.7);z-index:-1;pointer-events:none}
dialog[data-modal-surface=black]{background:#000}dialog[data-modal-surface=black]::before{display:none}
h2,h3,.d2mods__title,.characters__rename{font-family:D2ModHeading,Georgia,serif;color:#e9cb84;font-weight:600;text-shadow:0 2px 2px #000}
h2,.d2mods__title{font-size:29px;line-height:1.25}h3{font-size:21px}
button,.d2mods__button{border:10px solid transparent;border-image:var(--d2-button) 20% 14% 24% 14% fill / 10px / 0 stretch;background:none;border-radius:0;box-shadow:none;min-height:48px;padding:5px 13px;color:#ebd6a4;font-size:17px;text-shadow:0 2px 2px #000}
button:hover:not(:disabled),.d2mods__button:hover{background:none;filter:brightness(1.22)}button:active:not(:disabled){filter:brightness(.85)}button:disabled{opacity:.47;cursor:not-allowed}
button:focus-visible{outline:2px solid #e2bf71;outline-offset:2px}
.characters__rename,.characters__close,.d2mods__close,.item-tooltip__close{border:0;border-image:none;background:none;box-shadow:none;filter:none;min-height:36px}
.characters__rename{font-size:21px;padding:0}.characters__close,.d2mods__close{font-family:Georgia,serif;font-size:30px;width:42px;flex:none;padding:0;color:#e9cb84}
.characters__card,.d2mods__card{border:2px solid #9c885d;border-image:none;background:#05050580;padding:16px;border-radius:0;box-shadow:none}
.characters__card[data-active=true]{border-color:#d1b778;box-shadow:none}
.characters__status,.characters__subtle,.d2mods__metadata{color:#c1b294}.characters__notice{border-left:2px solid #ae4a3c;background:#170808c9;color:#f1aa91}
.characters__tabs{gap:3px}.characters__tab{font-size:16px;padding:5px 4px;min-height:72px;background:none}.characters__tab[aria-selected=true]{border-color:transparent;background:none;filter:brightness(1.25);color:#ffe6a9;box-shadow:inset 0 -2px #b28c43}
.characters__actions .characters__primary,.d2mods__button--primary{border-color:transparent;background:none;color:#ffe1a0;filter:brightness(1.15)}.characters__actions button{font-size:16px}
.equipment__slot{border:1px solid #6c6046;border-image:none;background:linear-gradient(#060707e8,#131310d9);box-shadow:inset 0 0 0 2px #000,inset 0 0 14px #000;min-height:0;padding:3px;filter:none!important}
.equipment__slot:hover{background:#15130e;box-shadow:inset 0 0 0 2px #000,0 0 6px #ac7c3544}.equipment__empty{font-size:13px;color:#a79779}
.item-tooltip{isolation:isolate;border:12px solid transparent;border-image:var(--d2-panel) 10% / 12px / 0 stretch;background:#080706;padding:20px 14px 14px;box-shadow:0 16px 40px #000e}.item-tooltip__close{font-size:23px;min-height:28px;right:0;top:0;padding:0 3px}
.d2mods__status{border-radius:1px;background:#19150e;color:#e2c07d}.d2mods__row input{accent-color:#c8a762}
@media(max-width:600px){dialog,.d2mods__panel{border-width:18px;border-image-width:18px;padding:18px 12px;width:calc(100vw - 20px);max-height:96svh}h2,.d2mods__title{font-size:24px}.characters__card,.d2mods__card{padding:12px}.characters__tab{font-size:14px}.characters__tabs{margin-bottom:16px}.characters__name button[data-name-confirm],.characters__name button[data-name-cancel]{padding:2px 5px;min-height:38px}.characters__rename{font-size:19px}}
`;
  globalThis.D2GameSkin=Object.freeze({css,ready,dispose:()=>document.fonts.delete(font)});
})();
