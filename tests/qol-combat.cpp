#include "combat.hpp"
#include <iostream>
#include <limits>
#include <string_view>

int main(int argc,char** argv){
    if(argc==2&&std::string_view(argv[1])=="--version"){std::cout<<"d2smm-qol-combat-checks 1.0.0\n";return 0;}
    using namespace d2smm::qol;
    Combat c;unsigned checks=0;
    const auto check=[&](bool value,const char* label){++checks;if(!value)std::cerr<<label<<'\n';return value;};
    constexpr unsigned white=0xffffff,green=0x40aa40,red=0xff4040,orange=0xffaa00;
    if(!check(c.queryMode(QueryKind::passiveSummonPush)==QueryMode::native&&c.queryMode(QueryKind::legacyDecoyMovement)==QueryMode::native&&!c.open(white,0),"Disabled combat preserves native behavior"))return 1;
    c.configure(true);
    if(!check(c.queryMode(QueryKind::passiveSummonPush)==QueryMode::suppress&&c.queryMode(QueryKind::ordinary)==QueryMode::native,"Only passive summon pushing is suppressed"))return 1;
    if(!check(c.queryMode(QueryKind::legacyDecoyMovement)==QueryMode::retainNativePose,"Decoy keeps native targeting and facing bookkeeping without a second displacement"))return 1;
    if(!check(c.queryMode(static_cast<QueryKind>(99))==QueryMode::native,"Unrelated query kinds retain native execution"))return 1;
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
    if(!check(c.queryMode(QueryKind::passiveSummonPush)==QueryMode::native&&c.tint(other,red,0)==red,"Disabling restores native color and push policy"))return 1;
    c.configure(true);
    const auto nan=std::numeric_limits<double>::quiet_NaN();
    if(!check(!c.open(nan,0)&&!c.open(-1,0)&&!c.open(1.5,0)&&!c.open(white,nan)&&!c.open(white,-1),"Invalid raw inputs cannot enter state"))return 1;
    if(!check(c.tint(0,nan,0)==-1&&c.tint(0,orange,0)==orange,"Invalid handles have explicit native fallback"))return 1;
    c.configure(true,true);
    if(!check(!c.effectVisible(1)&&c.effectVisible(0)&&c.effectVisible(2),"Only the selected hit-star category is hidden"))return 1;
    c.configure(false,true);
    if(!check(c.effectVisible(1),"Disabling QoL restores the native hit visual"))return 1;
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
