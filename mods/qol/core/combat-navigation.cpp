#include "combat.hpp"

namespace d2smm::qol {
bool Combat::frame(bool walls,double now,double dt,NavTerrain terrain){
    if(!(now>=0&&now<1e12&&dt>=0&&dt<=100))return false;
    if(++frame_==0){frame_=1;for(auto& e:entries_)e.movement.frame=0;}
    now_=now;dt_=dt;propCount_=0;activeHandle_=0;navigation_.frame(walls,terrain);return true;
}
bool Combat::observe(unsigned handle,double x,double y,double radius,unsigned melee,unsigned ranged,unsigned special,unsigned target,double tx,double ty,double tr,double life,unsigned animated,double speed,double animation,double facing,double directions){
    auto* m=motion(handle);if(!m||!m->observe(x,y,radius,melee!=0,ranged!=0,special!=0,tx,ty,animated!=0,speed,handle&0xfff)||!m->observeTarget(target,{tx,ty},tr,life))return false;
    m->frame=frame_;m->now=now_;m->dt=dt_;m->animationBefore=animation;m->facingBefore=facing;m->facingCountBefore=directions;return true;
}
bool Combat::scenery(double x,double y,double radius){
    if(propCount_==capacity||!(x>=-1e12&&x<=1e12&&y>=-1e12&&y<=1e12&&radius>=0&&radius<=10000))return false;
    props_[propCount_++]={{x,y},radius};return true;
}
bool Combat::beginMotion(unsigned handle,double x,double y,unsigned target,double tx,double ty,double tr,double life,double reach){
    auto* m=motion(handle);if(!m||m->frame!=frame_||!m->observeTarget(target,{tx,ty},tr,life)||!m->begin(x,y,tx,ty,tr,reach))return false;
    activeHandle_=handle;if(++query_==0){query_=1;for(auto& e:entries_)e.excludedQuery=0;}return true;
}
bool Combat::neighbor(unsigned handle,unsigned other,double x,double y,double radius,bool same,bool dead,bool nativeDisplaced,bool animated){
    auto* m=motion(handle);if(!m||activeHandle_!=handle)return false;
    auto* entry=find(other);auto* otherMotion=entry?&entry->movement:nullptr;
    if(entry&&!same){otherMotion->x=x;otherMotion->y=y;otherMotion->radius=radius;otherMotion->animated=animated;otherMotion->dead=dead;if(m->excludes(x,y,radius,nativeDisplaced)||dead)entry->excludedQuery=query_;}
    return m->neighbor(x,y,radius,same,dead,otherMotion,true,nativeDisplaced);
}
bool Combat::needsRoute(unsigned handle){
    auto* m=motion(handle);return m&&activeHandle_==handle&&m->active&&m->melee&&!m->animated&&m->approaching&&m->speed>0&&m->targetId&&!m->held&&m->dx*m->dx+m->dy*m->dy>=1e-12&&(m->fraction<=.99999||m->route.status==RouteStatus::following);
}
bool Combat::geometryBegin(unsigned handle){if(!needsRoute(handle))return false;propCount_=0;return true;}
bool Combat::pose(unsigned handle,double x,double y,double radius,bool dead,bool animated){
    auto* m=motion(handle);if(!m)return false;m->dead=dead;m->animated=animated;if(dead||handle==activeHandle_)return true;
    if(!(x>=-1e12&&x<=1e12&&y>=-1e12&&y<=1e12&&radius>=0&&radius<=10000))return false;
    m->x=x;m->y=y;m->radius=radius;return true;
}
void Combat::resolve(unsigned handle){
    if(!needsRoute(handle))return;auto* m=motion(handle);
    const double budget=__builtin_sqrt(m->dx*m->dx+m->dy*m->dy);
    navigation_.begin({{m->x,m->y},{m->targetX,m->targetY},m->radius,m->targetRadius,m->reach,budget,now_,m->targetId,handle&0xfff});
    for(const auto& e:entries_){const auto& o=e.movement;if(!e.live||o.dead||&o==m||o.frame!=frame_||e.excludedQuery==query_)continue;
        navigation_.body({o.x,o.y},o.radius);
        if(o.targetId==m->targetId&&o.route.status==RouteStatus::following&&now_-o.route.plannedAt<3&&
           (o.route.targetAt.x-m->targetX)*(o.route.targetAt.x-m->targetX)+(o.route.targetAt.y-m->targetY)*(o.route.targetAt.y-m->targetY)<=64)navigation_.body(o.route.goal,o.radius,true);
    }
    for(unsigned i=0;i<propCount_;++i)navigation_.body(props_[i].at,props_[i].radius);
    const auto result=navigation_.advance(m->route);
    if(result.ownsStep){m->dx=result.position.x-m->x;m->dy=result.position.y-m->y;m->fraction=1;m->guided=true;m->idle=m->dx*m->dx+m->dy*m->dy<1e-10;}
}
unsigned Combat::navigationCount(unsigned status)const{
    unsigned count=0;for(const auto& e:entries_)if(e.live&&!e.movement.dead&&e.movement.frame==frame_){const auto& m=e.movement;
        if(status==8?m.guided:status==9?m.walkRestarted:static_cast<unsigned>(m.route.status)==status)++count;}
    return count;
}
}
