#include "core.hpp"
static terrorized::Session session;
extern "C" {
unsigned terrorized_offer(double tier,double worldTier,double act,double actCount,double cleared,unsigned flags) {
    return session.offer({tier,worldTier,act,actCount,cleared,flags});
}
unsigned terrorized_begin(unsigned ticket,double tier,double worldTier,double act,double actCount,double cleared,unsigned flags,unsigned sameContext) {
    return session.begin(ticket,{tier,worldTier,act,actCount,cleared,flags},sameContext==1);
}
void terrorized_invalidate(){session.invalidate();}
unsigned terrorized_tier(){return session.tier();}
unsigned terrorized_act(){return session.act();}
}
