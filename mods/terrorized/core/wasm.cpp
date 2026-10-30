#include "core.hpp"
#include "gather.hpp"
namespace d2smm::terrorized::math {
extern "C" {
__attribute__((import_module("math"),import_name("sin"))) double host_sin(double);
__attribute__((import_module("math"),import_name("cos"))) double host_cos(double);
__attribute__((import_module("math"),import_name("atan2"))) double host_atan2(double,double);
}
double sine(double n){return host_sin(n);}
double cosine(double n){return host_cos(n);}
double angle(double y,double x){return host_atan2(y,x);}
}
namespace d2smm::terrorized {
static Session session;
static Gather gather;
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
unsigned gather_observe(unsigned id,double time,double x,double y,double halfW,double halfH,double body,double pickup,unsigned flags){return gather.observe(id,time,{x,y},{halfW,halfH},body,pickup,flags);}
unsigned gather_add(double x,double y,unsigned kind,unsigned flags){return gather.add({x,y},kind,flags);}
unsigned gather_layout(){return gather.layout();}
double gather_ideal_x(unsigned slot){return gather.ideal(slot).x;}
double gather_ideal_y(unsigned slot){return gather.ideal(slot).y;}
unsigned gather_target(unsigned slot,double x,double y){return gather.target(slot,{x,y});}
void gather_release(unsigned slot){gather.release(slot);}
unsigned gather_advance(double time){return gather.advance(time);}
double gather_x(unsigned slot){return gather.position(slot).x;}
double gather_y(unsigned slot){return gather.position(slot).y;}
unsigned gather_moving(unsigned slot){return gather.moving(slot);}
void gather_cancel(){gather.cancel();}
unsigned gather_phase(){return gather.phase();}
unsigned gather_count(){return gather.count();}
double gather_radius(){return gather.radius();}
}
}
