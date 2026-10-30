#include "qol.hpp"
#include "badges.hpp"
#include <iostream>
#include <cstring>
#include <limits>
#include <string_view>
int main(int argc,char** argv){
    if(argc==2&&std::string_view(argv[1])=="--version"){std::cout<<"d2smm-qol-checks 1.0.0\n";return 0;}
    using namespace d2smm;unsigned checks=0;
    const auto check=[&](bool ok,const char* label){++checks;if(!ok)std::cerr<<label<<'\n';return ok;};
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
