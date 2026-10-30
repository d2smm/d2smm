// Host must verify a newly created Incognito context before setting this lease.
// This constructs disposable progress; never run it in a player's game.
async function seedTerrorizedCompletion(){
  if(!globalThis.__D2GalleryLease?.contextId||!__D2GalleryLease.targetId||location.origin!=='https://d2survivors.lol')throw Error('Verified isolated game context required');
  const game=D2Characters.currentGame(),cls=game?.kit?.id;
  if(!game?.world||game.level!==1||!document.body.classList.contains('in-camp')||game.save.terror?.[cls])throw Error('Use a fresh disposable level-one camp');
  const status=D2Mods.status().terrorized;if(!status.connected||status.problem)throw Error('Terrorized must be connected');
  const base=await D2GameContract.analyze(status.evidence.game);
  const source='({'+game.startDebugTier.toString()+'})',ast=D2JavaScriptParser.parse(source,{ecmaVersion:'latest'});
  const candidates=[];
  function walk(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(walk);return;}if(n.type==='LogicalExpression'&&n.operator==='??'&&n.right?.type==='CallExpression'&&n.right.callee.type==='Identifier'&&base.imports.has(n.right.callee.name))candidates.push(n.right.callee.name);for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')walk(v);}
  walk(ast);if(candidates.length!==1)throw Error('Native default snapshot constructor changed');
  const binding=base.imports.get(candidates[0]),snapshot=(await import(binding.url))[binding.name](cls);
  if(snapshot?.version!==1||snapshot.cls!==cls||!snapshot.run||!snapshot.build)throw Error('Native snapshot shape changed');
  // Native replay restores this supported flag, excluding synthetic runs from
  // leaderboard submissions. We never invoke the victory/settlement routine.
  snapshot.run.tainted=true;game.tainted=true;
  const replayBinding=status.evidence.replay,replay=(await import(replayBinding.url))[replayBinding.name];
  const offers=[0,1,2].map(act=>{const temporary={terror:{[cls]:{open:27,best:26,cleared:26,offers:[]}}};const choice=replay(temporary,cls,26);if(!choice)throw Error('Native offer preparation failed');return{...choice,act};});
  game.runSaver.ended(cls);
  game.save.heroes??={};game.save.heroes[cls]={...(game.save.heroes[cls]??{}),unlocked:'hell',kept:snapshot};
  game.save.terror={...game.save.terror,[cls]:{open:26,best:25,cleared:25,offers,waves:true}};
  game.world.act=1;game.enterTier(25);game.terrorDebug=false;game.training=false;game.whose='hero';
  game.tierDone={tier:25,best:25,open:26,time:61,earned:0,taken:null};
  globalThis.__D2TerrorDemo={game,world:game.world,runId:game.runId,cls,gold:game.save.gold,origin:performance.timeOrigin,expected:{tier:25,act:1,open:26},snapshotBinding:binding};
  D2Mods.close();game.showTierCleared();
  return{tier:game.tierDone.tier,act:game.world.act,open:game.save.terror[cls].open,whose:game.whose,snapshotTainted:snapshot.run.tainted,isolated:true};
}
