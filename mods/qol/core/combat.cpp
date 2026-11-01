#include "combat.hpp"

namespace d2smm::qol {
namespace {
bool validColor(double n){return n>=0&&n<=16777215&&n==static_cast<unsigned>(n);}
bool validTime(double n){return n>=0&&n<1e12;}
void advance(unsigned& generation){generation=generation==0xfffff?1:generation+1;}
}
void Combat::configure(bool enabled){if(enabled_!=enabled){reset();enabled_=enabled;}}
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
        e.live=true;e.color=static_cast<unsigned>(color);e.observed=now;e.admitted=now-holdSeconds;
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
