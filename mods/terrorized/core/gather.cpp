#include "gather.hpp"
namespace d2smm::terrorized {
namespace {
constexpr double pi=3.14159265358979323846;
bool finite(double n){return __builtin_isfinite(n);}
bool finite(Point p){return finite(p.x)&&finite(p.y);}
double maximum(double a,double b){return a>b?a:b;}
double length(Point p){return __builtin_sqrt(p.x*p.x+p.y*p.y);}
Point subtract(Point a,Point b){return {a.x-b.x,a.y-b.y};}
double shortest(double angle){while(angle>pi)angle-=2*pi;while(angle<-pi)angle+=2*pi;return angle;}
bool selected(unsigned kind,unsigned flags){return flags&(kind==static_cast<unsigned>(DropKind::chest)?gatherChests:gatherEnabled);}
}
void Gather::cancel(){phase_=0;count_=0;selection_=0;overflow_=false;}
unsigned Gather::observe(unsigned id,double time,Point center,Point view,double body,double pickup,unsigned flags){
    constexpr unsigned required=terror|portal|bossWon;
    if(!id||!(flags&(gatherEnabled|gatherChests))||(flags&required)!=required||(flags&(gatherTraining|timeUp|gatherDebug))){cancel();return 0;}
    if(id==consumed_&&phase_==2)for(unsigned i=0;i<count_;++i)if(!selected(slots_[i].kind,flags))slots_[i].active=false;
    // Native choices and pause screens retain the same world/portal. Their
    // stopped game clock holds the motion without consuming or cancelling it.
    if(!(flags&playing))return 0;
    if(id==consumed_)return phase_==2?2:0;
    cancel();
    if(!finite(time)||!finite(center)||!finite(view)||view.x<=0||view.y<=0||!finite(body)||body<0||!finite(pickup)||pickup<0)return 0;
    center_=center;clearance_=maximum(body+10,pickup)+16;
    radius_=maximum((view.x<view.y?view.x:view.y)*.5,clearance_);
    if(!finite(radius_))return 0;
    consumed_=id;started_=last_=time;selection_=flags;phase_=1;return 1;
}
unsigned Gather::add(Point from,unsigned kind,unsigned flags){
    if(phase_!=1||flags||kind<static_cast<unsigned>(DropKind::item)||kind>static_cast<unsigned>(DropKind::xp)||!selected(kind,selection_)||!finite(from))return 0;
    const auto relative=subtract(from,center_);const auto r=length(relative);
    if(!finite(r))return 0;
    if(count_==capacity){overflow_=true;return 0;}
    auto& slot=slots_[count_];slot.from=slot.current=from;slot.fromRadius=r;
    slot.angle=math::angle(relative.y,relative.x);slot.kind=kind;slot.active=true;order_[count_]=count_;
    return ++count_;
}
bool Gather::layout(){
    if(phase_!=1||overflow_||!count_){cancel();return false;}
    // Stable angular order; ties preserve the native pickup array's order.
    for(unsigned i=1;i<count_;++i){const auto index=order_[i];unsigned j=i;while(j&&slots_[order_[j-1]].angle>slots_[index].angle){order_[j]=order_[j-1];--j;}order_[j]=index;}
    for(unsigned i=0;i<count_;++i){auto& s=slots_[order_[i]];s.toAngle=-pi+2*pi*i/count_;s.toRadius=radius_;s.to={center_.x+radius_*math::cosine(s.toAngle),center_.y+radius_*math::sine(s.toAngle)};}
    phase_=2;return true;
}
Point Gather::ideal(unsigned slot)const{return slot&&slot<=count_?slots_[slot-1].to:Point{0,0};}
bool Gather::target(unsigned slot,Point point){
    if(phase_!=2||!slot||slot>count_)return false;
    auto& s=slots_[slot-1];const auto relative=subtract(point,center_);const auto r=length(relative);
    if(!finite(point)||!finite(r)||r<clearance_-1e-7){s.active=false;return false;}
    s.to=point;s.toRadius=r;s.toAngle=math::angle(relative.y,relative.x);return true;
}
void Gather::release(unsigned slot){if(slot&&slot<=count_)slots_[slot-1].active=false;}
bool Gather::moving(unsigned slot)const{return slot&&slot<=count_&&slots_[slot-1].active;}
Point Gather::position(unsigned slot)const{return slot&&slot<=count_?slots_[slot-1].current:Point{0,0};}
bool Gather::advance(double time){
    if(phase_!=2)return false;
    if(!finite(time)||time<last_){cancel();return false;}last_=time;
    const auto t=(time-started_)/duration;const auto u=t>=1?1:t*t*(3-2*t);
    for(unsigned i=0;i<count_;++i){auto& s=slots_[i];if(!s.active)continue;
        if(u>=1){s.current=s.to;continue;}
        const auto r=s.fromRadius+(s.toRadius-s.fromRadius)*u;
        const auto a=s.angle+shortest(s.toAngle-s.angle)*u;
        s.current={center_.x+r*math::cosine(a),center_.y+r*math::sine(a)};
    }
    if(t>=1)phase_=3;return true;
}
}
