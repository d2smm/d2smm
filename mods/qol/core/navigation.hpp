#pragma once

namespace d2smm::qol {
struct NavPoint {double x=0,y=0;};
enum class RouteStatus : unsigned {none,following,atTarget,waitingForGap,unreachable,limited,outOfRange,unavailable};
struct NavRoute {
    static constexpr unsigned pointLimit=32;
    NavPoint points[pointLimit]{},goal{},targetAt{};
    unsigned count=0,next=0,target=0;
    double plannedAt=0,retryAt=0;
    RouteStatus status=RouteStatus::none;
    void clear(){count=next=target=0;plannedAt=retryAt=0;status=RouteStatus::none;}
};
struct NavTerrain {
    void* context=nullptr;
    bool (*pointOpen)(void*,NavPoint)=nullptr;
    bool (*segmentClear)(void*,NavPoint,NavPoint)=nullptr;
};
struct NavRequest {
    NavPoint start{},target{};
    double radius=0,targetRadius=0,reach=0,budget=0,time=0;
    unsigned targetId=0,actor=0;
};
struct NavResult {bool ownsStep=false;NavPoint position{};RouteStatus status=RouteStatus::none;};

// Bounded local search. The game supplies terrain clearance; C++ owns every
// route, goal, reservation and movement decision. Scratch storage is shared.
class Navigation {
public:
    static constexpr unsigned sideLimit=97,nodeLimit=sideLimit*sideLimit,bodyLimit=4096;
    static constexpr double spacing=4,padding=80,localRange=220;
    void frame(bool hasWalls,NavTerrain terrain);
    void begin(NavRequest request);
    bool body(NavPoint position,double radius,bool reservation=false);
    NavResult advance(NavRoute& route);
    unsigned expanded()const{return expanded_;}
private:
    struct Body {NavPoint at;double radius=0;bool reservation=false;};
    struct Node {double cost=0,estimate=0;int parent=0;unsigned heap=0;unsigned char open=0;bool closed=false,goal=false;};
    Body bodies_[bodyLimit]{};Node nodes_[nodeLimit]{};
    unsigned heap_[nodeLimit]{},reverse_[nodeLimit]{},heapCount_=0,bodyCount_=0,width_=0,height_=0,expanded_=0,frameBudget_=0;
    NavPoint origin_{};NavRequest request_{};NavTerrain terrain_{};
    bool walls_=false,overflow_=false,exhausted_=false;
    bool pointClear(NavPoint point,bool goal)const;
    bool segmentClear(NavPoint a,NavPoint b)const;
    bool allowed(unsigned index);
    NavPoint point(unsigned index)const;
    double estimate(NavPoint point)const;
    bool before(unsigned a,unsigned b)const;
    void push(unsigned index);
    unsigned pop();
    RouteStatus search(NavRoute& route);
    bool follow(NavRoute& route,NavPoint& next)const;
};
}
