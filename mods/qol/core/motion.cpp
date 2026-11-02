#include "motion.hpp"

namespace d2smm::qol {
namespace {
bool coordinateValid(double v){return v>=-1e12&&v<=1e12;}
bool radiusValid(double v){return v>=0&&v<=10000;}
}
bool Motion::observe(double px,double py,double r,bool hasMelee,bool hasRanged,bool special,double tx,double ty,bool anim,double nativeSpeed,unsigned order){
    observed=coordinateValid(px)&&coordinateValid(py)&&radiusValid(r)&&coordinateValid(tx)&&coordinateValid(ty)&&nativeSpeed>=0&&nativeSpeed<=100000;
    active=false;idle=false;
    if(!observed){held=false;return false;}
    x=px;y=py;radius=r;melee=hasMelee&&!hasRanged&&!special;
    targetX=tx;targetY=ty;animated=anim;speed=nativeSpeed;priority=order;
    if(!melee)held=false;
    return true;
}
bool Motion::begin(double px,double py,double tx,double ty,double tr,double reach){
    active=false;
    if(!observed||!coordinateValid(px)||!coordinateValid(py)||!coordinateValid(tx)||!coordinateValid(ty)||!radiusValid(tr)||!radiusValid(reach))return false;
    dx=px-x;dy=py-y;fraction=1;active=true;
    targetX=tx;targetY=ty;
    const double towardX=tx-x,towardY=ty-y,distance2=towardX*towardX+towardY*towardY;
    const double body=radius+tr,outer=reach>body?reach:body,inner=outer>body+2?outer-2:body;
    const bool toward=dx*towardX+dy*towardY>=0;
    held=melee&&toward&&distance2<=(held?outer*outer:inner*inner);
    if(held)fraction=0;
    idle=held;
    return true;
}
bool Motion::yieldsTo(const Motion& leader)const{
    if(!observed||!melee||held||animated||speed<=0||!leader.melee||targetX!=leader.targetX||targetY!=leader.targetY)return false;
    const double ownX=x-targetX,ownY=y-targetY,leadX=leader.x-targetX,leadY=leader.y-targetY;
    const double own=ownX*ownX+ownY*ownY,lead=leadX*leadX+leadY*leadY,difference=own-lead;
    return difference>1e-6||(difference>=-1e-6&&leader.priority<priority);
}
bool Motion::neighbor(double px,double py,double r,bool same,bool dead,const Motion* other,bool nativeChecked,bool nativeDisplaced){
    if(same||dead)return true;
    if(!active||!coordinateValid(px)||!coordinateValid(py)||!radiusValid(r))return false;
    if(other&&other->yieldsTo(*this))return true;
    // Preserve native private exclusions (for example, a rider attached to this actor).
    const double endX=x+dx-px,endY=y+dy-py,sum=radius+r;
    if(nativeChecked&&!nativeDisplaced&&endX*endX+endY*endY<sum*sum)return true;
    if(fraction==0)return true;
    const double mx=x-px,my=y-py,rr=radius+r;
    const double a=dx*dx+dy*dy,b=mx*dx+my*dy,c=mx*mx+my*my-rr*rr;
    if(a<=1e-18||b>=0)return true; // stationary, separating, or coincident: no invented push
    if(c<=0){fraction=0;idle=true;return true;} // overlapping actors may leave, never deepen overlap
    const double discriminant=b*b-a*c;
    if(discriminant<0)return true;
    const double contact=(-b-__builtin_sqrt(discriminant))/a;
    if(contact>=0&&contact<fraction){fraction=contact>1e-6?contact-1e-6:0;idle=fraction<1e-5;}
    return true;
}
double Motion::coordinate(bool vertical)const{return vertical?y+dy*fraction:x+dx*fraction;}
void Motion::finish(){if(active){x=coordinate(false);y=coordinate(true);}active=false;}
}
