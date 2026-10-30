#include "../mods/terrorized/core/core.hpp"
#include <iostream>
#include <limits>
#include <string_view>
int gatherChecks();

int main(int argc,char**argv){
    if(argc==2&&std::string_view(argv[1])=="--version"){std::cout<<"d2smm-terrorized-checks 1.0.0\n";return 0;}
    using namespace d2smm::terrorized;
    constexpr unsigned ready=enabled|victory|currentHero|keptHero|completion|numericFacts;
    Session session;Facts facts{25,25,1,5,25,ready};unsigned checks=0;
    auto check=[&](bool passed,const char* name){++checks;if(!passed){std::cerr<<name<<"\n";return false;}return true;};
    auto ticket=session.offer(facts);
    if(!check(ticket&&session.tier()==25&&session.act()==1,"Terror 25 Act II is offered exactly"))return 1;
    if(!check(session.begin(ticket,facts,true)&&!session.begin(ticket,facts,true),"A double click starts once"))return 1;
    ticket=session.offer(facts);auto latest=session.offer(facts);
    if(!check(!session.begin(ticket,facts,true)&&session.begin(latest,facts,true),"A stale callback does not consume the new offer"))return 1;
    ticket=session.offer(facts);session.invalidate();
    if(!check(!session.begin(ticket,facts,true),"Disabling invalidates the ticket"))return 1;
    ticket=session.offer(facts);
    if(!check(!session.begin(ticket,facts,false)&&!session.begin(ticket,facts,true),"Changed context invalidates the offer"))return 1;
    for(unsigned flag:{debug,training,cow,activeRun}){auto bad=facts;bad.flags|=flag;if(!check(!session.offer(bad),"Special or unfinished runs are excluded"))return 1;}
    for(unsigned flag:{enabled,victory,currentHero,keptHero,completion,numericFacts}){auto bad=facts;bad.flags&=~flag;if(!check(!session.offer(bad),"Missing required native facts rejects the offer"))return 1;}
    for(double value:{0.0,25.5,2147483648.0,std::numeric_limits<double>::quiet_NaN()}){auto bad=facts;bad.tier=value;bad.worldTier=value;if(!check(!session.offer(bad),"Malformed tiers cannot be coerced into an offer"))return 1;}
    for(double value:{-1.0,1.5,5.0}){auto bad=facts;bad.act=value;if(!check(!session.offer(bad),"Act bounds are exact"))return 1;}
    auto bad=facts;bad.cleared=24;if(!check(!session.offer(bad),"Locked tiers are not offered"))return 1;
    bad=facts;bad.worldTier=26;if(!check(!session.offer(bad),"Finished and current tier must agree"))return 1;
    ticket=session.offer(facts);bad=facts;bad.act=2;
    if(!check(!session.begin(ticket,bad,true),"The selected act cannot change at activation"))return 1;
    std::cout<<checks<<" Terrorized policy checks passed\n";return gatherChecks();
}
