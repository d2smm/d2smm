#pragma once

namespace d2smm::terrorized {
enum Flag : unsigned {
    enabled=1, victory=2, currentHero=4, keptHero=8,
    debug=16, training=32, cow=64, activeRun=128,
    completion=256, numericFacts=512
};
struct Facts {
    double tier, worldTier, act, actCount, cleared;
    unsigned flags;
};
class Session {
    unsigned generation_=0, tier_=0, act_=0;
    bool offered_=false, consumed_=false;
public:
    unsigned offer(const Facts&);
    bool begin(unsigned ticket,const Facts&,bool sameContext);
    void invalidate();
    unsigned tier() const { return tier_; }
    unsigned act() const { return act_; }
};
}
