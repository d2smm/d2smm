#include "combat.hpp"

namespace d2smm::qol {
namespace {
bool validColor(double n){return n>=0&&n<=16777215&&n==static_cast<unsigned>(n);}
bool validTime(double n){return n>=0&&n<1e12;}
void advance(unsigned& generation){generation=generation==0xfffff?1:generation+1;}
}
void Combat::configure(bool enabled,bool hideHitStars){if(enabled_!=enabled){reset();enabled_=enabled;}hideHitStars_=hideHitStars;}
bool Combat::effectVisible(unsigned kind)const{return !enabled_||!hideHitStars_||kind!=1;}
bool Combat::effectProfile(double life,double c0,double c1,double c2,double a0,double a1,double a2,double width){
    effectProfileValid_=life>0&&life<=10&&validColor(c0)&&validColor(c1)&&validColor(c2)&&a0>=0&&a0<=1&&a1>=0&&a1<=1&&a2>=0&&a2<=1&&width>0&&width<=50;
    if(effectProfileValid_){effectLife_=life;effectColors_[0]=c0;effectColors_[1]=c1;effectColors_[2]=c2;effectAlphas_[0]=a0;effectAlphas_[1]=a1;effectAlphas_[2]=a2;effectWidth_=width;}
    return effectProfileValid_;
}
void Combat::effectBegin(double life,bool additive,unsigned count){effectParts_=0;effectMatches_=effectProfileValid_&&life==effectLife_&&additive&&count==3;}
void Combat::effectPart(unsigned index,unsigned kind,double color,double alpha,double width,unsigned polygons,unsigned points,unsigned circles,unsigned moves,unsigned other){
    if(index>=3||index!=effectParts_){effectMatches_=false;return;}
    ++effectParts_;
    effectMatches_=effectMatches_&&color==effectColors_[index]&&alpha==effectAlphas_[index]&&moves==(index?1u:0u)&&other==0;
    if(index<2)effectMatches_=effectMatches_&&kind==1&&polygons==1&&points==16&&circles==0;
    else effectMatches_=effectMatches_&&kind==2&&polygons==0&&circles==1&&width==effectWidth_;
}
bool Combat::effectEnd()const{return effectVisible(effectMatches_&&effectParts_==3?1:0);}
Motion* Combat::motion(unsigned handle){auto* entry=find(handle);return enabled_&&entry?&entry->movement:nullptr;}
bool Combat::allows(QueryKind kind)const{return !enabled_||kind!=QueryKind::passiveSummonPush;}
Combat::Entry* Combat::find(unsigned handle){
    const unsigned slot=handle&0xfff,generation=handle>>12;
    if(!slot||slot>capacity)return nullptr;
    auto& entry=entries_[slot-1];return entry.live&&entry.generation==generation?&entry:nullptr;
}
void Combat::reset(){for(auto& entry:entries_){entry.live=false;advance(entry.generation);}}
unsigned Combat::open(double color,double now){
    if(!enabled_||!validColor(color)||!validTime(now))return 0;
    for(unsigned i=0;i<capacity;++i){auto& e=entries_[i];if(e.live)continue;
        e.live=true;e.color=static_cast<unsigned>(color);e.observed=now;e.admitted=now-holdSeconds;e.movement={};
        return (e.generation<<12)|(i+1);
    }
    return 0;
}
int Combat::tint(unsigned handle,double requested,double now){
    if(!validColor(requested))return -1;
    const auto color=static_cast<unsigned>(requested);auto* e=find(handle);
    if(!enabled_||!e||!validTime(now))return static_cast<int>(color);
    if(now<e->observed){e->color=color;e->admitted=now-holdSeconds;}
    else if(color!=e->color&&now-e->admitted>=holdSeconds){e->color=color;e->admitted=now;}
    e->observed=now;return static_cast<int>(e->color);
}
void Combat::release(unsigned handle){if(auto* e=find(handle)){e->live=false;advance(e->generation);}}
}
