#include "../mods/terrorized/core/gather.hpp"
#include <cmath>
#include <iostream>
#include <limits>
int gatherChecks(){
    using namespace d2smm::terrorized;
    constexpr unsigned flags=gatherEnabled|terror|playing|portal|bossWon;
    Gather g;unsigned checks=0;
    auto check=[&](bool ok,const char* name){++checks;if(!ok)std::cerr<<name<<'\n';return ok;};
    auto begin=[&](unsigned id,unsigned bits=flags){return g.observe(id,10,{95000,95000},{540,300},12,70,bits);};
    if(!check(!begin(1,flags&~gatherEnabled)&&begin(1)==1,"Disabled gathering does not consume the portal"))return 1;
    if(!check(!g.add({95400,95000},unsigned(DropKind::chest),0),"Gather Run Drops excludes chests by default"))return 1;
    if(!check(g.radius()==150,"Ring diameter is half the shorter view dimension"))return 1;
    for(unsigned f:{dead,magnet,discarded,reaching,noSprite})if(!check(!g.add({95400,95000},1,f),"Native collection and discarded objects stay untouched"))return 1;
    for(unsigned i=0;i<12;++i){const double a=i*6.283185307179586/12;if(!check(g.add({95000+400*std::cos(a),95000+400*std::sin(a)},1,0)==i+1,"Each real drop gets one stable slot"))return 1;}
    if(!check(g.layout(),"Complete snapshot accepts layout"))return 1;
    for(unsigned i=1;i<=12;++i)if(!check(g.target(i,g.ideal(i)),"Native unchanged ground target accepted"))return 1;
    for(unsigned step=0;step<90;++step){if(!check(g.advance(10+step/60.0),"Movement stays active for 1.5 seconds"))return 1;for(unsigned i=1;i<=12;++i){const auto p=g.position(i);if(!check(std::hypot(p.x-95000,p.y-95000)>=150-1e-7,"Curved motion never crosses the character"))return 1;}}
    if(!check(g.advance(11.5)&&g.phase()==3&&!g.advance(11.6),"Final frame applies once"))return 1;
    double angles[12];for(unsigned i=1;i<=12;++i){const auto p=g.position(i),target=g.ideal(i);angles[i-1]=std::atan2(p.y-95000,p.x-95000);if(!check(p.x==target.x&&p.y==target.y&&std::abs(std::hypot(p.x-95000,p.y-95000)-150)<1e-7,"Exact destination survives large world coordinates"))return 1;}
    for(unsigned i=0;i<12;++i)for(unsigned j=i+1;j<12;++j)if(angles[j]<angles[i])std::swap(angles[i],angles[j]);
    for(unsigned i=1;i<12;++i)if(!check(std::abs(angles[i]-angles[i-1]-6.283185307179586/12)<1e-7,"Angular slots are evenly spaced"))return 1;
    g.cancel();if(!check(!begin(1)&&begin(2)==1,"Reenable cannot gather the same portal twice"))return 1;
    g.add({95400,95000},1,0);g.add({95450,95000},1,0);g.layout();
    if(!check(!begin(2,flags&~playing)&&g.phase()==2&&g.count()==2&&begin(2)==2,"A native choice holds the same ring until play resumes"))return 1;
    if(!check(!g.target(1,{95000,95000})&&!g.moving(1),"Unsafe native ground adjustment leaves its drop alone"))return 1;
    g.release(2);if(!check(!g.moving(2)&&g.advance(10.5),"A picked-up object is released without moving another slot"))return 1;
    if(!check(!g.advance(9)&&!g.phase(),"A reset game clock cancels movement"))return 1;
    for(unsigned flag:{gatherTraining,timeUp,gatherDebug})if(!check(!begin(3,flags|flag),"Only a genuine boss portal admits movement"))return 1;
    if(!check(!g.observe(3,10,{0,0},{0,300},12,70,flags)&&!g.observe(3,10,{std::numeric_limits<double>::infinity(),0},{500,300},12,70,flags),"Invalid geometry never starts"))return 1;
    begin(3);for(unsigned i=0;i<Gather::capacity+1;++i)g.add({95400,95000},1,0);
    if(!check(!g.layout()&&!g.count(),"Oversized snapshot fails before any partial move"))return 1;
    const auto chest=unsigned(DropKind::chest),item=unsigned(DropKind::item);
    begin(4,(flags&~gatherEnabled)|gatherChests);
    if(!check(!g.add({95400,95000},item,0)&&g.add({95450,95000},chest,0)==1&&g.layout(),"Gather Chests works independently of loose drops"))return 1;
    begin(5,flags|gatherChests);
    if(!check(g.add({95400,95000},item,0)==1&&g.add({95450,95000},chest,0)==2&&g.layout(),"Both categories share one ring when selected"))return 1;
    if(!check(begin(5)==2&&g.moving(1)&&!g.moving(2),"Disabling chests releases only the chest"))return 1;
    if(!check(begin(5,flags|gatherChests)==2&&!g.moving(2),"Reenabling chests does not restart a consumed snapshot"))return 1;
    begin(6,flags|gatherChests);g.add({95400,95000},item,0);g.add({95450,95000},chest,0);g.layout();
    if(!check(begin(6,(flags&~gatherEnabled)|gatherChests)==2&&!g.moving(1)&&g.moving(2),"Disabling loose drops preserves selected chest motion"))return 1;
    std::cout<<checks<<" Gather Run Drops checks passed\n";return 0;
}
