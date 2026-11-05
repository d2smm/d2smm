#include "../mods/terrorized/core/gather.hpp"
#include <cmath>
#include <iostream>
#include <limits>
int gatherChecks(){
    using namespace d2smm::terrorized;
    constexpr unsigned flags=gatherEnabled|terror|playing|portal|bossWon;
    constexpr auto item=unsigned(DropKind::item),chest=unsigned(DropKind::chest);
    const Point hero{95000,95000};Gather g;unsigned checks=0;
    const auto check=[&](bool ok,const char* name){++checks;if(!ok)std::cerr<<name<<'\n';return ok;};
    const auto begin=[&](unsigned id,unsigned bits=flags){return g.observe(id,10,hero,{540,300},12,70,bits);};
    const auto pass=[&](unsigned id,double time,Point center=Point{95000,95000},unsigned bits=flags){return g.observe(id,time,center,{540,300},12,70,bits);};
    const auto deposit=[&](){for(unsigned i=1;i<=g.count();++i)if(g.pickupPending(i)&&!g.deposit(i,g.position(i)))return false;return true;};
    if(!check(!begin(1,flags&~gatherEnabled)&&begin(1)==1,"Disabled option does not consume the portal"))return 1;
    if(!check(!g.add({95400,95000},chest,0),"Loose drops exclude chests by default"))return 1;
    for(unsigned f:{dead,magnet,discarded,reaching,noSprite})if(!check(!g.add({95400,95000},item,f),"Native-owned or discarded objects stay untouched"))return 1;
    for(unsigned i=0;i<12;++i){const double a=i*6.283185307179586/12;if(!check(g.add({hero.x+400*std::cos(a),hero.y+400*std::sin(a)},item,0)==i+1,"Each real drop gets one stable slot"))return 1;}
    if(!check(g.layout()&&g.phase()==4&&g.radius()==150,"Loose drops enter native-pickup phase before ring layout"))return 1;
    for(unsigned i=1;i<=12;++i)if(!check(g.pickupPending(i)&&g.position(i).x==hero.x&&g.position(i).y==hero.y,"Deposit directly at the hero in double precision"))return 1;
    if(!check(!g.deposit(1,{0,0})&&deposit()&&g.deposited()==12,"Only actual native mover coordinates acknowledge deposits"))return 1;
    g.settle(1,hero,0);if(!check(g.pickupPending(1)&&!g.spread(10),"Same timestamp is not a collection opportunity"))return 1;
    if(!check(pass(1,10.1)==4,"Later successful native pass is observed"))return 1;
    for(unsigned i=1;i<=8;++i)g.release(i);
    for(unsigned i=9;i<=12;++i)g.settle(i,hero,0);
    if(!check(g.spread(10.1)&&g.phase()==2,"Only actual leftovers enter spreading"))return 1;
    for(unsigned i=1;i<=8;++i)if(!check(!g.moving(i),"Collected slots can never be moved again"))return 1;
    double angles[4];
    for(unsigned i=9;i<=12;++i){const auto p=g.ideal(i);angles[i-9]=std::atan2(p.y-hero.y,p.x-hero.x);if(!check(g.target(i,p),"Existing native ground target is admitted"))return 1;}
    for(unsigned i=0;i<4;++i)for(unsigned j=i+1;j<4;++j)if(angles[j]<angles[i])std::swap(angles[i],angles[j]);
    for(unsigned i=1;i<4;++i)if(!check(std::abs(angles[i]-angles[i-1]-1.5707963267948966)<1e-7,"Collected drops leave no empty ring slots"))return 1;
    if(!check(g.advance(10.85)&&std::abs(std::hypot(g.position(9).x-hero.x,g.position(9).y-hero.y)-75)<1e-6,"Leftovers fan outward using the existing animation"))return 1;
    if(!check(g.advance(11.6)&&g.phase()==3&&!g.advance(11.7),"Final movement frame applies once"))return 1;
    for(unsigned i=9;i<=12;++i)if(!check(g.position(i).x==g.ideal(i).x&&g.position(i).y==g.ideal(i).y,"Exact final coordinates survive large world positions"))return 1;
    g.cancel();if(!check(!begin(1)&&begin(2)==1,"Repeat enable cannot regather the same portal"))return 1;
    g.add({95400,95000},item,0);g.layout();pass(2,10.1);g.release(1);
    if(!check(!g.spread(10.1)&&g.phase()==3,"Room for every drop completes without a ring"))return 1;
    begin(3);g.add({95400,95000},item,airborne);g.add({95450,95000},item,hidden);g.layout();deposit();
    if(!check(!pass(3,10,hero,flags&~playing)&&g.phase()==4,"Pause retains the native-pickup phase"))return 1;
    pass(3,10.1,{95100,95000});g.settle(1,hero,0);g.settle(2,hero,hidden);
    if(!check(g.pickupPending(1)&&g.position(1).x==95100&&!g.pickupPending(2)&&!g.spread(10.1),"Moving hero retries deposit; hidden loot stays filtered"))return 1;
    deposit();
    pass(3,10.2,{95100,95000});g.settle(1,{95100,95000},airborne);
    if(!check(g.pickupPending(1)&&!g.spread(10.2),"Unfinished drop animation is not failed pickup"))return 1;
    deposit();
    pass(3,10.3,{95100,95000});g.settle(1,{95100,95000},0);
    if(!check(g.spread(10.3),"Grounded survivor has completed its native opportunity"))return 1;
    if(!check(!g.target(1,{95100,95000})&&!g.moving(1),"Unsafe prop adjustment never forces a destination"))return 1;
    if(!check(!g.advance(9)&&!g.phase(),"Backward clock cancels ring motion"))return 1;
    begin(4,(flags&~gatherEnabled)|gatherChests);g.add({95400,95000},chest,airborne);
    if(!check(g.layout()&&g.phase()==2&&!g.pickupPending(1)&&g.position(1).x==95400,"Independent chest setting retains ring-only behavior"))return 1;
    begin(5,flags|gatherChests);g.add({95400,95000},item,0);g.add({95450,95000},chest,0);g.layout();deposit();
    if(!check(g.pickupPending(1)&&!g.pickupPending(2),"Chest waits untouched while loose item is offered"))return 1;
    pass(5,10.1);g.settle(1,hero,0);
    if(!check(!g.moving(2)&&g.spread(10.1)&&pass(5,10.2,hero,flags|gatherChests)==2&&!g.moving(2),"Category disable releases only its objects and cannot restart them"))return 1;
    begin(6,flags|gatherChests);g.add({95400,95000},item,0);g.add({95450,95000},chest,0);g.layout();
    pass(6,10.1,hero,(flags&~gatherEnabled)|gatherChests);
    if(!check(!g.pickupPending(1)&&!g.moving(1)&&g.spread(10.1)&&g.moving(2),"Disabling loose drops preserves the selected chest path"))return 1;
    for(unsigned flag:{gatherTraining,timeUp,gatherDebug,gatherFrameFailed})if(!check(!begin(7,flags|flag),"Unsafe or failed native frame never admits collection"))return 1;
    if(!check(!g.observe(7,10,hero,{0,300},12,70,flags)&&!g.observe(7,10,{std::numeric_limits<double>::infinity(),0},{500,300},12,70,flags),"Invalid geometry never starts"))return 1;
    begin(7);for(unsigned i=0;i<Gather::capacity+1;++i)g.add({95400,95000},item,0);
    if(!check(!g.layout()&&!g.count(),"Oversized snapshot fails before moving anything"))return 1;
    begin(8);g.add({95400,95000},unsigned(DropKind::mana),0);g.layout();pass(8,10.1);g.settle(1,hero,magnet);
    if(!check(!g.pickupPending(1)&&!g.spread(10.1)&&g.phase()==3,"Native magnet owns the admitted mana pickup"))return 1;
    begin(9);g.add({95400,95000},item,0);g.layout();
    if(!check(!pass(9,9)&&!g.phase()&&!pass(9,11),"Backward clock cancels pending pickup without replay"))return 1;
    begin(10);g.add({95400,95000},item,0);g.layout();
    if(!check(!pass(10,10.1,hero,flags|gatherFrameFailed)&&!g.phase(),"Native frame error cancels an active deposit"))return 1;
    std::cout<<checks<<" Gather Run Drops checks passed\n";return 0;
}
