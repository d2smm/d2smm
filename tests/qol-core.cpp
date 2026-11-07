#include "qol.hpp"
#include "zoom.hpp"
#include "badges.hpp"
#include <iostream>
#include <cstring>
#include <limits>
#include <string_view>
int main(int argc,char** argv){
    if(argc==2&&std::string_view(argv[1])=="--version"){std::cout<<"d2smm-qol-checks 1.0.0\n";return 0;}
    using namespace d2smm;unsigned checks=0;
    const auto check=[&](bool ok,const char* label){++checks;if(!ok)std::cerr<<label<<'\n';return ok;};
    qol::Zoom zoom;
    if(!check(!zoom.wheel(100,0,1400,15)&&zoom.scale(2)==2,"Disabled zoom preserves native layout"))return 1;
    zoom.configure(true);
    for(unsigned bits:{0u,7u,11u,13u,14u})if(!check(!zoom.wheel(100,0,1400,bits),"Wheel requires canvas, play state, clear panels and no modifiers"))return 1;
    for(double delta:{0.,std::numeric_limits<double>::infinity(),std::numeric_limits<double>::quiet_NaN()})if(!check(!zoom.wheel(delta,0,1400,15),"Invalid wheel values are ignored"))return 1;
    if(!check(!zoom.wheel(100,3,1400,15),"Unknown delta units are ignored"))return 1;
    for(int i=0;i<20;++i)zoom.wheel(100,0,1400,15);
    if(!check(zoom.distance()==4&&zoom.scale(2)==.5&&zoom.halfExtent(2500,2)==2500,"Fourfold view has matching scale and world extents"))return 1;
    if(!check(zoom.scale(3)==.75&&zoom.halfExtent(1500,3)==1000,"Resize uses new native scale without accumulating transforms"))return 1;
    for(int i=0;i<20;++i)zoom.wheel(-100,0,1400,15);
    if(!check(zoom.distance()==1&&zoom.halfExtent(2500,2)==625,"Reverse wheel returns precisely to native scale"))return 1;
    zoom.wheel(6.25,1,1400,15);
    if(!check(zoom.distance()==1.25,"Line-mode wheel matches pixel-mode distance"))return 1;
    zoom.configure(false);zoom.configure(true);zoom.wheel(1,2,100,15);
    if(!check(zoom.distance()==1.25,"Page-mode wheel uses viewport height"))return 1;
    zoom.configure(false);
    if(!check(zoom.distance()==1,"Master or option disable resets zoom"))return 1;
    constexpr unsigned flags=qol::enabled|qol::pickedUp|qol::sameWorld|qol::sameClass|qol::cursorClear|qol::nativeAllowed|qol::notificationsReady|qol::notSwapping;
    qol::Placement p{1,0,3,2,0,1,5,4,flags};
    if(!check(qol::admit(p),"Native approved placement is admitted"))return 1;
    for(unsigned bit=1;bit<=128;bit*=2){auto q=p;q.flags&=~bit;if(!check(!qol::admit(q),"Every admission fact is required"))return 1;}
    for(double value:{-1.,.5,5.,std::numeric_limits<double>::quiet_NaN()}){auto q=p;q.x=value;if(!check(!qol::admit(q),"Invalid or absent destination is rejected"))return 1;}
    auto q=p;q.bagCopies=2;if(!check(!qol::admit(q),"Ambiguous source is rejected"))return 1;q=p;q.charmCopies=1;if(!check(!qol::admit(q),"Already equipped item cannot reverse direction"))return 1;
    if(!check(qol::transferred(3,2,2,3,0,1,true)&&!qol::transferred(3,2,2,4,0,2,true)&&!qol::transferred(3,2,2,3,0,1,false),"Successful native transfer preserves one identity"))return 1;
    auto key=[](const char* s){badges::Key k{};badges::key(s,unsigned(std::strlen(s)),k);return k;};
    badges::Ledger ledger;badges::Mark a{key("qol"),key("charms"),key("amazon")},b{key("another-mod"),a.target,a.context},c{a.source,a.target,key("sorceress")};
    if(!check(ledger.mark(a,false)==1&&ledger.mark(a,false)==0&&ledger.count()==1,"Duplicate marks are idempotent"))return 1;
    ledger.mark(b,false);ledger.mark(c,false);ledger.clear(a);
    if(!check(ledger.unread(a.target,a.context)&&ledger.count()==2,"One source cannot clear another source"))return 1;
    ledger.read(a.target,a.context);if(!check(!ledger.unread(a.target,a.context)&&ledger.unread(c.target,c.context),"Reading clears a target context without leaking across classes"))return 1;
    if(!check(ledger.mark(c,true)==1&&!ledger.count()&&ledger.mark(a,true)==0,"Already visible content is marked read"))return 1;
    ledger.load(a);if(!check(ledger.load(a)<0&&ledger.count()==1,"Corrupt duplicate saved marks reject"))return 1;
    badges::Key invalid;const char* bad="bad key";if(!check(!badges::key(bad,7,invalid)&&!badges::key("",0,invalid)&&!badges::key(bad,65,invalid),"Unread keys are bounded and validated"))return 1;
    std::cout<<checks<<" QoL and unread policy checks passed\n";return 0;
}
