#include "combat.hpp"
#include <iostream>
#include <cmath>
#include <limits>
#include <string_view>

int main(int argc,char** argv){
    if(argc==2&&std::string_view(argv[1])=="--version"){std::cout<<"d2smm-qol-combat-checks 1.0.0\n";return 0;}
    using namespace d2smm::qol;
    Combat c;unsigned checks=0;
    const auto check=[&](bool value,const char* label){++checks;if(!value)std::cerr<<label<<'\n';return value;};
    constexpr unsigned white=0xffffff,green=0x40aa40,red=0xff4040,orange=0xffaa00;
    if(!check(c.allows(QueryKind::passiveSummonPush)&&!c.open(white,0),"Disabled combat preserves native behavior"))return 1;
    c.configure(true);
    if(!check(!c.allows(QueryKind::passiveSummonPush)&&c.allows(QueryKind::ordinary),"Only passive summon pushing is suppressed"))return 1;
    const auto h=c.open(white,0);
    if(!check(h&&c.tint(h,white,0)==white&&c.tint(h,green,.25)==green,"Initial status change is immediate"))return 1;
    if(!check(c.tint(h,red,1)==green&&c.tint(h,orange,3.249)==green,"Color holds for the complete three seconds"))return 1;
    if(!check(c.tint(h,orange,3.25)==orange,"Exact boundary admits the latest request without blending"))return 1;
    if(!check(c.tint(h,red,3.25)==orange&&c.tint(h,green,3.25)==orange,"Paused time cannot consume the hold"))return 1;
    if(!check(c.tint(h,green,6.25)==green,"Intermediate red is discarded, not queued"))return 1;
    if(!check(c.tint(h,green,10)==green&&c.tint(h,red,10)==red,"Unchanged samples do not postpone the next change"))return 1;
    if(!check(c.tint(h,white,0)==white&&c.tint(h,green,.1)==green,"Backwards clock resets the presentation lifecycle"))return 1;
    const auto other=c.open(white,1);
    if(!check(c.tint(other,orange,1)==orange&&c.tint(h,red,.2)==green,"Actors have independent holds"))return 1;
    c.release(h);const auto replacement=c.open(white,2);
    if(!check(replacement!=h&&c.tint(h,orange,2)==orange&&c.tint(replacement,red,2)==red,"Released handles cannot affect a replacement actor"))return 1;
    c.reset();
    if(!check(c.tint(replacement,orange,2)==orange,"Reset invalidates old world handles"))return 1;
    for(unsigned i=0;i<Combat::capacity;++i)if(!check(c.open(white,0)!=0,"Bounded table admits its declared capacity"))return 1;
    if(!check(!c.open(white,0),"Full table fails safely without eviction"))return 1;
    c.configure(false);
    if(!check(c.allows(QueryKind::passiveSummonPush)&&c.tint(other,red,0)==red,"Disabling restores native color and push policy"))return 1;
    c.configure(true);
    const auto nan=std::numeric_limits<double>::quiet_NaN();
    if(!check(!c.open(nan,0)&&!c.open(-1,0)&&!c.open(1.5,0)&&!c.open(white,nan)&&!c.open(white,-1),"Invalid raw inputs cannot enter state"))return 1;
    if(!check(c.tint(0,nan,0)==-1&&c.tint(0,orange,0)==orange,"Invalid handles have explicit native fallback"))return 1;
    Motion m;
    const auto near=[](double a,double b){return std::abs(a-b)<.0001;};
    m.observe(0,0,10,true,false,false);m.begin(1,0,24,0,10,26);
    if(!check(m.held&&m.idle&&m.coordinate(false)==0,"Melee actor holds inside native reach"))return 1;
    m.finish();m.observe(0,0,10,true,false,false);m.begin(1,0,25,0,10,26);
    if(!check(m.held&&m.coordinate(false)==0,"Hold hysteresis stays inside attack reach"))return 1;
    m.finish();m.observe(0,0,10,true,false,false);m.begin(1,0,27,0,10,26);
    if(!check(!m.held&&m.coordinate(false)==1,"Leaving attack reach resumes pursuit"))return 1;
    for(unsigned kind=0;kind<3;++kind){m.observe(0,0,10,true,kind==0,kind==1);m.begin(kind==2?-1:1,0,24,0,10,26);
        if(!check(!m.held,"Ranged, special and retreating movement are not held"))return 1;}
    m.observe(0,0,10,false,false,false);m.begin(20,0,100,0,10,26);m.neighbor(30,0,10);
    if(!check(near(m.coordinate(false),10)&&m.coordinate(true)==0,"Contact clips the intended segment without sideways displacement"))return 1;
    m.observe(0,0,10,false,false,false);m.begin(1,0,100,0,10,26);m.neighbor(15,0,10);
    if(!check(m.coordinate(false)==0,"A voluntary step cannot deepen existing overlap"))return 1;
    m.observe(0,0,10,false,false,false);m.begin(-1,0,100,0,10,26);m.neighbor(15,0,10);
    if(!check(m.coordinate(false)==-1,"An overlapping actor can walk out under its own motion"))return 1;
    m.observe(0,0,10,false,false,false);m.begin(1,0,100,0,10,26);m.neighbor(0,0,10);
    if(!check(m.coordinate(false)==1,"Coincident spawns can separate without a random push"))return 1;
    m.observe(0,0,10,false,false,false);m.begin(0,0,100,0,10,26);m.neighbor(1,0,10);
    if(!check(m.coordinate(false)==0&&m.coordinate(true)==0,"Stationary overlapping monsters are never shoved"))return 1;
    m.observe(0,0,10,false,false,false);m.begin(1,0,100,0,10,26);m.neighbor(15,0,10,true);m.neighbor(15,0,10,false,true);
    if(!check(m.coordinate(false)==1,"Self and dead actors do not obstruct movement"))return 1;
    if(!check(!m.observe(nan,0,10,true,false,false)&&!m.begin(1,0,100,0,10,26),"Invalid observations fail closed"))return 1;
    m.observe(0,0,10,true,false,false);
    if(!check(!m.begin(nan,0,100,0,10,26),"Invalid movement candidate is rejected"))return 1;
    const auto moving=c.open(white,0);c.motion(moving)->observe(0,0,10,true,false,false);c.release(moving);
    if(!check(c.motion(moving)==nullptr,"Released movement handles cannot alter replacement actors"))return 1;
    c.configure(true,true);
    if(!check(!c.effectVisible(1)&&c.effectVisible(0)&&c.effectVisible(2),"Only the selected hit-star category is hidden"))return 1;
    c.configure(false,true);
    if(!check(c.effectVisible(1),"Disabling QoL restores the native hit visual"))return 1;
    Motion leader,follower;
    leader.observe(10,0,10,true,false,false,100,0,false,90,1);
    follower.observe(0,0,10,true,false,false,100,0,false,90,2);
    if(!check(follower.yieldsTo(leader)&&!leader.yieldsTo(follower),"Mobile followers yield to the closer native pursuer"))return 1;
    follower.observe(10,0,10,true,false,false,100,0,false,90,2);
    if(!check(follower.yieldsTo(leader)&&!leader.yieldsTo(follower),"Equal-distance movement uses stable actor order"))return 1;
    follower.held=true;
    if(!check(!follower.yieldsTo(leader),"Established melee actors remain solid between attacks"))return 1;
    follower.held=false;follower.animated=true;
    if(!check(!follower.yieldsTo(leader),"An attacking actor never yields its ground"))return 1;
    follower.animated=false;follower.targetY=1;
    if(!check(!follower.yieldsTo(leader),"Unrelated target flows retain solid contact"))return 1;
    follower.targetY=0;follower.melee=false;
    if(!check(!follower.yieldsTo(leader),"Ranged and special actors do not enter melee right of way"))return 1;
    m.observe(0,0,10,false,false,false);m.begin(1,0,100,0,10,26);m.neighbor(15,0,10,false,false,nullptr,true,false);
    if(!check(m.coordinate(false)==1,"Native private pair exclusions survive contact admission"))return 1;
    c.configure(true,true);
    if(!check(c.effectProfile(.28,16766282,16774864,16761402,.95,1,.8,2),"Verified native critical profile admitted"))return 1;
    const auto effect=[&](unsigned changed){
        c.effectBegin(changed==1?.29:.28,changed!=2,changed==3?4:3);
        c.effectPart(0,1,changed==4?0:16766282,changed==5?.9:.95,0,1,changed==6?12:16,0,0,0);
        c.effectPart(1,changed==7?2:1,16774864,1,0,1,16,0,1,0);
        c.effectPart(2,2,16761402,.8,changed==8?3:2,0,0,changed==9?0:1,1,changed==10?1:0);
        return c.effectEnd();
    };
    if(!check(!effect(0),"Matching native critical-star geometry is hidden"))return 1;
    for(unsigned i=1;i<=10;++i)if(!check(effect(i),"Different native effects remain visible"))return 1;
    c.configure(true,false);if(!check(effect(0),"Turning the option off restores the star"))return 1;
    c.configure(false,true);if(!check(effect(0),"Master disable restores the star"))return 1;
    std::cout<<checks<<" combat QoL checks passed\n";return 0;
}
