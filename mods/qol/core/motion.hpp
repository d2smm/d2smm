#pragma once
#include "navigation.hpp"

namespace d2smm::qol {
// One actor's voluntary movement. Neighbors are observations, never writable bodies.
struct Motion {
    double x=0,y=0,radius=0,dx=0,dy=0,fraction=0;
    double targetX=0,targetY=0,speed=0;
    double targetRadius=0,reach=0,reachPadding=0,dt=0,now=0,animationBefore=0,facingBefore=0,facingCountBefore=0,walkAnchor=0;
    unsigned priority=0,targetId=0,frame=0;
    bool observed=false,melee=false,held=false,idle=false,active=false,animated=false,dead=false,approaching=false,guided=false,walkAnchorValid=false,walkRestarted=false;
    NavRoute route;
    bool observeTarget(unsigned id,NavPoint position,double radius,double life);
    bool observe(double px,double py,double r,bool hasMelee,bool hasRanged,bool special,double tx=0,double ty=0,bool anim=false,double nativeSpeed=1,unsigned order=0);
    bool begin(double proposedX,double proposedY,double targetX,double targetY,double targetRadius,double reach);
    bool neighbor(double px,double py,double r,bool same=false,bool dead=false,const Motion* other=nullptr,bool nativeChecked=false,bool nativeDisplaced=true);
    bool yieldsTo(const Motion& leader)const;
    bool excludes(double px,double py,double r,bool nativeDisplaced)const;
    double walkPhase(double direction,double directions);
    double coordinate(bool vertical)const;
    void finish();
};
}
