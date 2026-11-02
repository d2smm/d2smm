#include "navigation.hpp"
#include "motion.hpp"
#include <cmath>
#include <iostream>
#include <limits>
#include <string_view>

using namespace d2smm::qol;
namespace {
double distance(NavPoint a,NavPoint b){return std::hypot(a.x-b.x,a.y-b.y);}
bool pointOpen(void*,NavPoint p){return !(p.x>=45&&p.x<=50&&p.y>=-64&&p.y<=64);}
bool segmentOpen(void*,NavPoint a,NavPoint b){const unsigned steps=static_cast<unsigned>(std::ceil(distance(a,b)))+1;for(unsigned i=0;i<=steps;++i){const double t=static_cast<double>(i)/steps;if(!pointOpen(nullptr,{a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t}))return false;}return true;}
}
int main(int argc,char** argv){
    if(argc==2&&std::string_view(argv[1])=="--version"){std::cout<<"d2smm-qol-navigation-checks 1.0.0\n";return 0;}
    unsigned checks=0;const auto check=[&](bool ok,const char* message){++checks;if(!ok)std::cerr<<message<<'\n';return ok;};
    static Navigation nav;
    const NavPoint blockers[]={{31,0},{19.9264159,23.7489777},{19.9264159,-23.7489777},{55,0},{55,24},{55,-24},{79,24},{79,-24}};
    NavRequest request{{100,0},{0,0},11,16,33,1.5,0,7,1};NavRoute route;
    nav.frame(false,{});nav.begin(request);for(auto p:blockers)nav.body(p,11);
    auto result=nav.advance(route);
    if(!check(result.ownsStep&&route.status==RouteStatus::following&&route.goal.x<0,"Find a route to the open back side of a blocked target"))return 1;
    const NavPoint firstGoal=route.goal;
    if(!check(distance(result.position,request.start)<=1.500001,"Guided movement preserves the native step budget"))return 1;
    bool reached=false;
    for(unsigned frame=0;frame<400;++frame){
        nav.frame(false,{});nav.begin(request);for(auto p:blockers)nav.body(p,11);result=nav.advance(route);
        if(!check(result.ownsStep,"The retained gap route continues to make progress"))return 1;
        if(!check(distance(result.position,request.start)<=1.500001,"Every route step respects the movement budget"))return 1;
        for(auto p:blockers)if(!check(distance(result.position,p)>=21.999,"Route does not cross stationary monster bodies"))return 1;
        request.start=result.position;request.time+=1.0/60;
        if(result.status==RouteStatus::atTarget){reached=true;break;}
    }
    if(!check(reached&&request.start.x<0&&distance(request.start,request.target)<=33,"Rear actor reaches an actual native melee position"))return 1;
    NavRoute second;request={{100,5},{0,0},11,16,33,1.5,0,7,2};nav.frame(false,{});nav.begin(request);for(auto p:blockers)nav.body(p,11);nav.body(firstGoal,11,true);result=nav.advance(second);
    if(!check(result.ownsStep&&distance(second.goal,firstGoal)>=22,"Approachers choose distinct available attack positions"))return 1;
    NavRoute surrounded;nav.frame(false,{});nav.begin(request);
    for(unsigned i=0;i<8;++i){const double a=i*6.283185307179586/8;nav.body({31*std::cos(a),31*std::sin(a)},11);}
    result=nav.advance(surrounded);
    if(!check(!result.ownsStep&&result.status==RouteStatus::waitingForGap,"A genuinely surrounded target produces a safe wait"))return 1;
    NavRoute wall;request={{100,0},{0,0},11,16,33,1.5,0,7,3};reached=false;
    for(unsigned frame=0;frame<400;++frame){
        nav.frame(true,{nullptr,pointOpen,segmentOpen});nav.begin(request);result=nav.advance(wall);
        if(!check(result.ownsStep&&segmentOpen(nullptr,request.start,result.position),"Native terrain callbacks constrain every guided segment"))return 1;
        request.start=result.position;request.time+=1.0/60;if(result.status==RouteStatus::atTarget){reached=true;break;}
    }
    if(!check(reached,"Route passes around a terrain barrier through its opening"))return 1;
    request={{100,0},{0,0},11,16,33,1.5,0,9,1};nav.frame(false,{});nav.begin(request);result=nav.advance(route);
    if(!check(route.target==9&&result.ownsStep,"A replacement target at the same coordinates invalidates old ownership"))return 1;
    request.target={80,80};request.time=1;nav.frame(false,{});nav.begin(request);result=nav.advance(route);
    if(!check(route.targetAt.x==80&&route.targetAt.y==80&&result.ownsStep,"A moving native target replans its attack position"))return 1;
    request.budget=-1;nav.begin(request);result=nav.advance(route);
    if(!check(!result.ownsStep&&result.status==RouteStatus::unavailable,"Invalid movement cannot use a cached route"))return 1;
    request.budget=1.5;nav.frame(false,{});nav.begin(request);nav.body({std::numeric_limits<double>::quiet_NaN(),0},11);result=nav.advance(route);
    if(!check(!result.ownsStep&&result.status==RouteStatus::limited,"Invalid body observations do not create phantom openings"))return 1;
    Motion walk;walk.animationBefore=7;walk.facingBefore=0;walk.facingCountBefore=32;
    if(!check(walk.walkPhase(1,32)==7&&!walk.walkRestarted,"Small facing changes preserve the native walk cycle"))return 1;
    if(!check(walk.walkPhase(2,32)==0&&walk.walkRestarted,"Accumulated turns beyond twenty degrees restart the cycle"))return 1;
    walk.walkAnchorValid=false;walk.facingBefore=31;walk.facingCountBefore=32;
    if(!check(walk.walkPhase(0,32)==7&&!walk.walkRestarted,"Walk turn comparison wraps across the direction boundary"))return 1;
    if(!check(walk.walkPhase(1,32)==0&&walk.walkRestarted,"A larger wrapped turn restarts the native cycle"))return 1;
    if(!check(walk.walkPhase(99,8)<0,"Invalid native facing data is rejected"))return 1;
    std::cout<<checks<<" navigation checks passed\n";
}
