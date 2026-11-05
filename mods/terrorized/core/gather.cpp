#include "gather.hpp"
namespace d2smm::terrorized {
namespace {
constexpr double pi=3.14159265358979323846;
constexpr unsigned excluded=dead|magnet|discarded|reaching|noSprite;
bool finite(double n){return __builtin_isfinite(n);}
bool finite(Point p){return finite(p.x)&&finite(p.y);}
double maximum(double a,double b){return a>b?a:b;}
double length(Point p){return __builtin_sqrt(p.x*p.x+p.y*p.y);}
Point subtract(Point a,Point b){return {a.x-b.x,a.y-b.y};}
double shortest(double angle){while(angle>pi)angle-=2*pi;while(angle<-pi)angle+=2*pi;return angle;}
bool selected(unsigned kind,unsigned flags){return flags&(kind==static_cast<unsigned>(DropKind::chest)?gatherChests:gatherEnabled);}
}
void Gather::cancel(){phase_=0;count_=0;selection_=0;deposited_=0;overflow_=false;}
unsigned Gather::observe(unsigned id,double time,Point center,Point view,double body,double pickup,unsigned flags){
    constexpr unsigned required=terror|portal|bossWon;
    if(!id||!(flags&(gatherEnabled|gatherChests))||(flags&required)!=required||(flags&(gatherTraining|timeUp|gatherDebug|gatherFrameFailed))){cancel();return 0;}
    if(id==consumed_&&(phase_==2||phase_==4))for(unsigned i=0;i<count_;++i)if(!selected(slots_[i].kind,flags))release(i+1);
    // Native choices and pause screens retain the same world/portal. Their
    // stopped game clock holds the motion without consuming or cancelling it.
    if(!(flags&playing))return 0;
    if(!finite(time)||!finite(center)||!finite(view)||view.x<=0||view.y<=0||!finite(body)||body<1||!finite(pickup)||pickup<0){cancel();return 0;}
    if(id==consumed_){
        if(phase_!=2&&phase_!=4)return 0;
        if(time<last_){cancel();return 0;}
        if(phase_==2)return 2;
        last_=time;center_=center;body_=body;
        return 4;
    }
    cancel();
    center_=center;body_=body;clearance_=maximum(body+10,pickup)+16;
    radius_=maximum((view.x<view.y?view.x:view.y)*.5,clearance_);
    if(!finite(radius_))return 0;
    consumed_=id;started_=last_=time;selection_=flags;phase_=1;return 1;
}
unsigned Gather::add(Point from,unsigned kind,unsigned flags){
    if(phase_!=1||(flags&excluded)||kind<static_cast<unsigned>(DropKind::item)||kind>static_cast<unsigned>(DropKind::mana)||!selected(kind,selection_)||!finite(from))return 0;
    const auto relative=subtract(from,center_);const auto r=length(relative);
    if(!finite(r))return 0;
    if(count_==capacity){overflow_=true;return 0;}
    auto& slot=slots_[count_];slot.from=slot.current=from;slot.fromRadius=r;
    slot.angle=math::angle(relative.y,relative.x);slot.kind=kind;slot.active=true;slot.pending=kind!=static_cast<unsigned>(DropKind::chest);slot.deposited=false;slot.depositedAt=started_;
    return ++count_;
}
bool Gather::layout(){
    if(phase_!=1||overflow_||!count_){cancel();return false;}
    bool pending=false;for(unsigned i=0;i<count_;++i)if(slots_[i].pending){slots_[i].current=center_;pending=true;}
    phase_=4;if(!pending)return spread(started_);return true;
}
bool Gather::pickupPending(unsigned slot)const{return phase_==4&&slot&&slot<=count_&&slots_[slot-1].active&&slots_[slot-1].pending;}
bool Gather::deposit(unsigned slot,Point actual){
    if(!pickupPending(slot)||!finite(actual))return false;
    auto& s=slots_[slot-1];if(actual.x!=s.current.x||actual.y!=s.current.y)return false;
    if(!s.deposited)++deposited_;s.deposited=true;s.depositedAt=last_;return true;
}
void Gather::settle(unsigned slot,Point position,unsigned flags){
    if(!slot||slot>count_||(phase_!=2&&phase_!=4))return;
    auto& s=slots_[slot-1];if(!s.active)return;
    if((flags&excluded)||!finite(position)){release(slot);return;}
    if(phase_!=4)return;
    if(!s.pending){s.current=position;return;}
    // This hook follows the verified native pickup pass. An alive, grounded
    // item inside the body had a native collection opportunity, unless this
    // is still the same game timestamp at which it was deposited.
    if(s.deposited&&last_>s.depositedAt&&!(flags&airborne)&&((flags&hidden)||length(subtract(position,center_))<=body_)){
        s.pending=false;s.current=position;return;
    }
    s.current=center_;
}
bool Gather::spread(double time){
    if(phase_!=4)return false;
    if(!finite(time)||time<last_){cancel();return false;}
    unsigned remaining=0;
    for(unsigned i=0;i<count_;++i)if(slots_[i].active){if(slots_[i].pending)return false;order_[remaining++]=i;}
    if(!remaining){phase_=3;return false;}
    // Stable angular order; ties preserve the native pickup array's order.
    for(unsigned i=1;i<remaining;++i){const auto index=order_[i];unsigned j=i;while(j&&slots_[order_[j-1]].angle>slots_[index].angle){order_[j]=order_[j-1];--j;}order_[j]=index;}
    for(unsigned i=0;i<remaining;++i){auto& s=slots_[order_[i]];s.toAngle=-pi+2*pi*i/remaining;s.toRadius=radius_;s.to={center_.x+radius_*math::cosine(s.toAngle),center_.y+radius_*math::sine(s.toAngle)};
        s.from=s.current;const auto relative=subtract(s.current,center_);s.fromRadius=length(relative);s.fromAngle=s.fromRadius>1e-7?math::angle(relative.y,relative.x):s.toAngle;
    }
    started_=last_=time;phase_=2;return true;
}
Point Gather::ideal(unsigned slot)const{return slot&&slot<=count_?slots_[slot-1].to:Point{0,0};}
bool Gather::target(unsigned slot,Point point){
    if(phase_!=2||!slot||slot>count_)return false;
    auto& s=slots_[slot-1];const auto relative=subtract(point,center_);const auto r=length(relative);
    if(!finite(point)||!finite(r)||r<clearance_-1e-7){s.active=false;return false;}
    s.to=point;s.toRadius=r;s.toAngle=math::angle(relative.y,relative.x);return true;
}
void Gather::release(unsigned slot){if(slot&&slot<=count_){slots_[slot-1].active=false;slots_[slot-1].pending=false;}}
bool Gather::moving(unsigned slot)const{return slot&&slot<=count_&&slots_[slot-1].active;}
Point Gather::position(unsigned slot)const{return slot&&slot<=count_?slots_[slot-1].current:Point{0,0};}
bool Gather::advance(double time){
    if(phase_!=2)return false;
    if(!finite(time)||time<last_){cancel();return false;}last_=time;
    const auto t=(time-started_)/duration;const auto u=t>=1?1:t*t*(3-2*t);
    for(unsigned i=0;i<count_;++i){auto& s=slots_[i];if(!s.active)continue;
        if(u>=1){s.current=s.to;continue;}
        const auto r=s.fromRadius+(s.toRadius-s.fromRadius)*u;
        const auto a=s.fromAngle+shortest(s.toAngle-s.fromAngle)*u;
        s.current={center_.x+r*math::cosine(a),center_.y+r*math::sine(a)};
    }
    if(t>=1)phase_=3;return true;
}
}
