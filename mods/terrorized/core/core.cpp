#include "core.hpp"

namespace d2smm::terrorized {
static_assert(sizeof(unsigned)==4);
static bool whole(double value,double low,double high) {
    return value>=low&&value<=high&&value==static_cast<unsigned>(value);
}
static bool eligible(const Facts& facts) {
    constexpr unsigned required=enabled|victory|currentHero|keptHero|completion|numericFacts;
    constexpr unsigned forbidden=debug|training|cow|activeRun;
    return (facts.flags&required)==required&&!(facts.flags&forbidden)&&
        whole(facts.tier,1,2147483647)&&facts.worldTier==facts.tier&&
        whole(facts.cleared,1,2147483647)&&facts.tier<=facts.cleared&&
        whole(facts.actCount,1,32)&&whole(facts.act,0,facts.actCount-1);
}
void Session::invalidate() {
    if(++generation_==0)++generation_;
    offered_=false;consumed_=false;
}
unsigned Session::offer(const Facts& facts) {
    invalidate();
    if(!eligible(facts))return 0;
    tier_=static_cast<unsigned>(facts.tier);act_=static_cast<unsigned>(facts.act);
    offered_=true;return generation_;
}
bool Session::begin(unsigned ticket,const Facts& facts,bool sameContext) {
    if(ticket!=generation_||!offered_||consumed_)return false;
    if(!sameContext||!eligible(facts)||facts.tier!=tier_||facts.act!=act_){offered_=false;return false;}
    consumed_=true;return true;
}
}
