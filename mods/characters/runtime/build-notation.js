(() => {
  'use strict';
  const table=t=>Object.fromEntries(t.split('\n').map(row=>row.split('=')));
  const terms=table(`maximum damage=MAX
minimum damage=MIN
maximum=MAX
minimum=MIN
attack rating=AR
bonus to attack rating=AR
enhanced damage=ED
enhanced defense=EDEF
attack damage=ATTACK DMG
defense=DEF
faster cast rate=FCR
faster hit recovery=FHR
faster run/walk=FRW
increased attack speed=IAS
faster block rate=FBR
increased chance of blocking=ICB
chance to block=CTB
chance of crushing blow=CB
crushing blow=CB
deadly strike=DS
chance of open wounds=OW
open wounds=OW
strength=STR
dexterity=DEX
vitality=VIT
energy=ENE
all resistances=@
fire resistance=FR
cold resistance=CR
lightning resistance=LR
poison resistance=PR
fire resist=FR
cold resist=CR
lightning resist=LR
poison resist=PR
life stolen per hit=LL
mana stolen per hit=ML
replenish life=REP LIFE
regenerate mana=REGEN MANA
life after each kill=LAEK
mana after each kill=MAEK
better chance of getting magic items=MF
magic find=MF
extra gold from monsters=GF
gold find=GF
magic damage reduced=MDR
damage reduced=DR
poison length reduced=PLR
damage taken goes to mana=DTM
cannot be frozen=CBF
ignore target defense=ITD
knockback=KB
hit blinds target=HBT
fire damage=FIRE DMG
cold damage=COLD DMG
lightning damage=LIGHT DMG
poison damage=PSN DMG
chance to cast level=CTC LVL`);
  const pattern=new RegExp('\\b('+Object.keys(terms).sort((a,b)=>b.length-a.length).join('|')+')\\b','gi');
  const names=table(`Heart of the Oak=HOTO
Call to Arms=CTA
Breath of the Dying=BOTD
Chains of Honor=COH
The Stone of Jordan=SOJ
Bul-Kathos' Wedding Band=BK
Crown of Ages=COA
Herald of Zakarum=HOZ
Harlequin Crest=SHAKO
Arachnid Mesh=ARACH
Mara's Kaleidoscope=MARA'S
Guardian Angel=GA
Gheed's Fortune=GHEED'S
War Traveler=WT
Gore Rider=GORES
Sandstorm Trek=TREKS
Stormshield=SS`);
  const number=value=>String(value).replace(/\d+(?:,\d{3})*(?:\.\d+)?[kKmM]?/g,t=>{const u=t.slice(-1).toLowerCase(),n=parseFloat(t.replaceAll(',',''))*(u==='k'?1e3:u==='m'?1e6:1);return n<1e3?t:(n>=1e5?(n/1e6).toFixed(1)+'M':(n/1e3).toFixed(n<1e4?1:0)+'K').replace('.0','');});
  const label=name=>name==='Damage'?'ED':terms[name.toLowerCase()]??name.toUpperCase();
  function stat(text){return number(text.replace(pattern,m=>terms[m.toLowerCase()]).replace(/^\+/,'').replace(/\bto /gi,'').replace(/@ \+?([\d.]+)%?/,'$1@').replace(/\b(MAX )?(FR|CR|LR|PR) \+?(-?[\d.]+)%?/gi,'$3% $1$2').replace(/\b(MDR|DR|PLR)(?: by)? (\d+%?)/gi,'$2 $1')).toUpperCase();}
  function item(name){const m=name.match(/^Jeweler['’]s (Monarch|Ward) of (Blocking|Deflecting|(?:the )?Colossus|(?:the )?Mammoth|Stability)$/i);return m?('J'+m[1][0]+'O'+m[2].replace(/^the /i,'')[0]).toUpperCase():names[name]??name;}
  globalThis.D2BuildNotation=Object.freeze({number,label,stat,item});
})();
