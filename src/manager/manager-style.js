(() => {
  'use strict';
  globalThis.D2ModStyle=`
:host{font:18px/1.5 system-ui,-apple-system,sans-serif;color:#eee5d3;color-scheme:dark}
*{box-sizing:border-box}[hidden]{display:none!important}
button,input,a,summary{-webkit-tap-highlight-color:transparent}
button{font:inherit;color:inherit;cursor:pointer}a{color:#e6c589;text-underline-offset:4px}
button:focus-visible,input:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #e8c477;outline-offset:4px}
button:disabled,input:disabled{opacity:.45;cursor:wait}
.d2mods__launcher{position:absolute;left:0;top:0;z-index:2147483646;width:70px;height:70px;min-height:44px;padding:2px;border:0;border-image:none;border-radius:50%;background:transparent;box-shadow:none;cursor:pointer;transform:scale(var(--d2mods-gem-scale,1));transform-origin:0 0}
.d2mods__launcher img{display:block;position:absolute;left:2px;top:2px;width:66px;height:66px;filter:drop-shadow(0 3px 2px #000) drop-shadow(0 1px 5px #000e);pointer-events:none}
.d2mods__launcher:focus-visible{outline:2px solid #e6ca8a;outline-offset:3px}.d2mods__launcher:hover:not(:disabled){background:transparent;filter:brightness(1.08)}
.d2mods__beacon{position:fixed;left:0;top:0;width:var(--d2mods-gem-size,70px);height:var(--d2mods-gem-size,70px);z-index:2147483646}
.d2mods__launcher .d2mods__attention-gem,.d2mods__launcher[data-state=on] .d2mods__attention-gem{clip-path:circle(8px at 33px 35px);filter:grayscale(1) brightness(3);z-index:2}
.d2mods__attention-halo{position:absolute;left:35px;top:37px;width:15px;height:15px;transform:translate(-50%,-50%);border-radius:50%;background:#fff;box-shadow:0 0 10px 5px #fff,0 0 27px 11px #e8eeffc9;z-index:1;pointer-events:none;animation:d2mods-attention-glow 2.2s ease-in-out infinite alternate}
@keyframes d2mods-attention-glow{from{opacity:.72;box-shadow:0 0 8px 4px #fff,0 0 23px 9px #e8eeffb0}to{opacity:1;box-shadow:0 0 12px 6px #fff,0 0 30px 13px #e8eeffe0}}
.d2mods__attention{position:absolute;left:50%;bottom:calc(var(--d2mods-gem-size,70px) - 3px);transform:translateX(-50%);width:min(380px,calc(100vw - 20px));padding:18px 20px 22px;isolation:isolate;color:#e8e5de;font:16px/1.45 system-ui,-apple-system,sans-serif}
.d2mods__attention::before{content:'';position:absolute;inset:0;z-index:-1;background:#000e;box-shadow:0 0 17px 8px #000b;mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent),linear-gradient(transparent,#000 9%,#000 91%,transparent);mask-composite:intersect;pointer-events:none}
.d2mods__attention-list{list-style:none;margin:0;padding:0 5px;max-height:min(380px,calc(100svh - var(--d2mods-gem-size,70px) - 62px));overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#8b816e #13110d}
.d2mods__attention-list:focus-visible{outline:1px solid #9e8a61;outline-offset:3px}
.d2mods__attention-entry{padding:12px 0;border-bottom:1px solid #ffffff16;overflow-wrap:anywhere}.d2mods__attention-entry:last-child{border-bottom:0}
.d2mods__attention-title{display:block;color:#faf6e9;font:600 18px/1.35 D2ModHeading,Georgia,serif}.d2mods__attention-detail{display:block;margin-top:5px;color:#c9c6bf;font-size:14px}.d2mods__attention-source{display:block;margin-top:5px;color:#9d927d;font-size:12px}
@media(prefers-reduced-motion:reduce){.d2mods__attention-halo{animation:none}}
.d2mods__panel{width:min(640px,calc(100vw - 32px));max-height:calc(100svh - 64px);padding:30px;border:1px solid #8b7348;border-radius:2px;background:linear-gradient(145deg,#252628,#121315);color:#eee5d3;box-shadow:0 24px 100px #000b;font:18px/1.5 system-ui,-apple-system,sans-serif}
.d2mods__panel::backdrop{background:#0008}
.d2mods__header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:26px}
.d2mods__title{font:600 30px/1.15 Georgia,serif;margin:0;color:#f2dcb3}
.d2mods__header-actions{display:flex;align-items:center;gap:12px}
.d2mods__key{font:13px system-ui;color:#b5a88f;border:1px solid #514834;padding:3px 7px;border-radius:4px;white-space:nowrap}
.d2mods__close{width:44px;height:44px;border:0;background:transparent;font-size:30px;line-height:1;color:#bdb098;border-radius:6px}.d2mods__close:hover{background:#ffffff0a;color:#fff0d1}
.d2mods__card{border:1px solid #514733;border-radius:2px;padding:24px;background:#101214b0}
.d2mods__button[data-action=characters]{width:100%;margin-bottom:20px;text-align:left;font:22px Georgia,serif;padding:16px 18px}
.d2mods__card-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:19px}
.d2mods__name{font-size:21px;font-weight:650}.d2mods__metadata{font-size:14px;color:#b9aa8d;margin-top:3px}
.d2mods__update-requirement{font-size:15px;color:#e8c68a;margin:0 0 16px}
.d2mods__status{font-size:13px;border:1px solid #776039;background:#a0772320;padding:3px 9px;border-radius:999px;white-space:nowrap;color:#efce8e}
.d2mods__options{margin-top:0}.d2mods__row{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:56px;cursor:pointer}
.d2mods__row input{width:23px;height:23px;accent-color:#d5b26d;flex:none;cursor:pointer}.d2mods__row-label{display:block}.d2mods__hint{display:block;color:#a99c83;font-size:14px;margin-top:2px}
.d2mods__details{border-top:1px solid #433b2c;margin-top:18px;padding-top:2px}.d2mods__details summary{min-height:48px;padding:14px 0 10px;cursor:pointer;color:#d1bea0;font-size:16px}
.d2mods__rules{padding-left:24px;margin:4px 0 12px;max-height:250px;overflow:auto;font-size:16px}.d2mods__rules li{margin:10px 0;padding-left:3px}
.d2mods__actions{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0}
.d2mods__button{min-height:44px;padding:9px 16px;border:1px solid #6d5c3e;border-radius:2px;background:#332b1d;font-size:16px;color:#ecd5aa}.d2mods__button:hover{background:#42351f;border-color:#b89a5f}
.d2mods__button--quiet{background:transparent;border-color:#514835;color:#c6b69a}.d2mods__button--danger{color:#ddab9a}.d2mods__button--primary{background:#6a4c24;border-color:#be9350;color:#ffe1a4}
.d2mods__footer{margin-top:22px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.d2mods__version{font-size:14px;color:#a99c83}
.d2mods__notice{font-size:16px;line-height:1.5;color:#e8c68a;margin:16px 0 0}.d2mods__notice[role=alert]{color:#f1b3a0}
.d2mods__empty p{font-size:17px;color:#c7b99d;margin:10px 0 20px}
.d2mods__bookmark{font-size:16px;margin-top:14px;display:block}
@media(max-width:600px){.d2mods__panel{padding:22px;max-height:calc(100svh - 28px)}.d2mods__title{font-size:26px}.d2mods__card{padding:18px}.d2mods__key{display:none}.d2mods__header{margin-bottom:20px}.d2mods__row{font-size:17px}.d2mods__filter{font-size:18px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`+D2GameSkin.css;
})();
