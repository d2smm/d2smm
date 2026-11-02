#include "navigation.hpp"

namespace d2smm::qol {
namespace {
double abs(double n){return n<0?-n:n;}
double min(double a,double b){return a<b?a:b;}
double max(double a,double b){return a>b?a:b;}
double square(double x){return x*x;}
double distance2(NavPoint a,NavPoint b){return square(a.x-b.x)+square(a.y-b.y);}
double distance(NavPoint a,NavPoint b){return __builtin_sqrt(distance2(a,b));}
bool finitePoint(NavPoint p){return p.x>=-1e12&&p.x<=1e12&&p.y>=-1e12&&p.y<=1e12;}
bool clearCircle(NavPoint a,NavPoint b,NavPoint c,double radius){
    const double dx=b.x-a.x,dy=b.y-a.y,mx=a.x-c.x,my=a.y-c.y;
    const double length=dx*dx+dy*dy,dot=mx*dx+my*dy,initial=mx*mx+my*my,rr=radius*radius;
    // An existing overlap may be exited under the actor's own motion, never deepened.
    if(initial<rr-1e-6)return dot>=-1e-8&&distance2(b,c)>=initial-1e-6;
    if(length<=1e-16)return true;
    const double t=max(0,min(1,-dot/length));
    return square(mx+dx*t)+square(my+dy*t)>=rr-1e-6;
}
}
void Navigation::frame(bool walls,NavTerrain terrain){walls_=walls;terrain_=terrain;frameBudget_=8192;}
void Navigation::begin(NavRequest request){request_=request;bodyCount_=0;overflow_=false;expanded_=0;exhausted_=false;}
bool Navigation::body(NavPoint at,double radius,bool reservation){
    if(!finitePoint(at)||!(radius>=0&&radius<=10000)){overflow_=true;return false;}
    if(bodyCount_==bodyLimit){overflow_=true;return false;}
    bodies_[bodyCount_++]={at,radius,reservation};return true;
}
bool Navigation::pointClear(NavPoint p,bool goal)const{
    if(distance2(p,request_.target)<square(request_.radius+request_.targetRadius+.1))return false;
    for(unsigned i=0;i<bodyCount_;++i){const auto& body=bodies_[i];if(body.reservation&&!goal)continue;
        const double rr=square(request_.radius+body.radius+.15),d=distance2(p,body.at);
        if(d>=rr)continue;
        if(!goal&&!body.reservation){const double initial=distance2(request_.start,body.at);if(initial<rr&&d>=initial-1e-6)continue;}
        return false;
    }
    return !walls_||terrain_.pointOpen(terrain_.context,p);
}
bool Navigation::segmentClear(NavPoint a,NavPoint b)const{
    if(!clearCircle(a,b,request_.target,request_.radius+request_.targetRadius+.1))return false;
    for(unsigned i=0;i<bodyCount_;++i){const auto& body=bodies_[i];if(!body.reservation&&!clearCircle(a,b,body.at,request_.radius+body.radius+.15))return false;}
    return !walls_||(terrain_.pointOpen(terrain_.context,b)&&terrain_.segmentClear(terrain_.context,a,b));
}
NavPoint Navigation::point(unsigned index)const{return {origin_.x+(index%width_)*spacing,origin_.y+(index/width_)*spacing};}
double Navigation::estimate(NavPoint p)const{return max(0,distance(p,request_.target)-(request_.reach-2));}
bool Navigation::allowed(unsigned index){
    auto& n=nodes_[index];if(n.open)return n.open==1;
    if(!frameBudget_){exhausted_=true;return false;}
    --frameBudget_;n.open=pointClear(point(index),false)?1:2;return n.open==1;
}
bool Navigation::before(unsigned a,unsigned b)const{
    const auto& x=nodes_[a];const auto& y=nodes_[b];const double f=x.cost+x.estimate,g=y.cost+y.estimate;
    return f<g||(f==g&&(x.cost>y.cost||(x.cost==y.cost&&a<b)));
}
void Navigation::push(unsigned index){
    auto& node=nodes_[index];unsigned at=node.heap?node.heap-1:heapCount_++;
    heap_[at]=index;node.heap=at+1;
    while(at){const unsigned parent=(at-1)/2;if(!before(index,heap_[parent]))break;heap_[at]=heap_[parent];nodes_[heap_[at]].heap=at+1;at=parent;heap_[at]=index;node.heap=at+1;}
}
unsigned Navigation::pop(){
    const unsigned result=heap_[0],last=heap_[--heapCount_];nodes_[result].heap=0;
    if(!heapCount_)return result;
    unsigned at=0;heap_[0]=last;nodes_[last].heap=1;
    while(at*2+1<heapCount_){unsigned child=at*2+1;if(child+1<heapCount_&&before(heap_[child+1],heap_[child]))++child;if(!before(heap_[child],last))break;heap_[at]=heap_[child];nodes_[heap_[at]].heap=at+1;at=child;heap_[at]=last;nodes_[last].heap=at+1;}
    return result;
}
RouteStatus Navigation::search(NavRoute& route){
    if(overflow_)return RouteStatus::limited;
    if(walls_&&(!terrain_.pointOpen||!terrain_.segmentClear))return RouteStatus::unavailable;
    if(!finitePoint(request_.start)||!finitePoint(request_.target)||!request_.targetId||!(request_.radius>=0&&request_.targetRadius>=0)||!(request_.budget>0))return RouteStatus::unavailable;
    if(distance(request_.start,request_.target)>localRange)return RouteStatus::outOfRange;
    const double lower=request_.radius+request_.targetRadius+.5,upper=request_.reach-2;
    if(!(upper>lower))return RouteStatus::unavailable;
    origin_={request_.start.x+__builtin_floor((min(request_.start.x,request_.target.x)-padding-request_.start.x)/spacing)*spacing,request_.start.y+__builtin_floor((min(request_.start.y,request_.target.y)-padding-request_.start.y)/spacing)*spacing};
    width_=static_cast<unsigned>(__builtin_ceil((max(request_.start.x,request_.target.x)+padding-origin_.x)/spacing))+1;
    height_=static_cast<unsigned>(__builtin_ceil((max(request_.start.y,request_.target.y)+padding-origin_.y)/spacing))+1;
    if(width_>sideLimit||height_>sideLimit)return RouteStatus::outOfRange;
    const unsigned count=width_*height_;heapCount_=0;
    for(unsigned i=0;i<count;++i){nodes_[i]={};nodes_[i].cost=1e30;nodes_[i].parent=-1;}
    unsigned goals=0;
    for(unsigned i=0;i<count;++i){const auto p=point(i);const double d=distance2(p,request_.target);if(d<lower*lower||d>upper*upper)continue;
        if(allowed(i)&&pointClear(p,true)){nodes_[i].goal=true;++goals;}
        if(exhausted_)return RouteStatus::limited;
    }
    if(!goals)return RouteStatus::waitingForGap;
    const auto sx=static_cast<unsigned>((request_.start.x-origin_.x)/spacing+.5),sy=static_cast<unsigned>((request_.start.y-origin_.y)/spacing+.5);
    const unsigned start=sy*width_+sx;nodes_[start].open=1;nodes_[start].cost=0;nodes_[start].estimate=estimate(request_.start);push(start);
    constexpr int offsets[8][2]={{1,0},{0,1},{-1,0},{0,-1},{1,1},{-1,1},{-1,-1},{1,-1}};
    int finish=-1;
    while(heapCount_&&expanded_<4096&&!exhausted_){
        const unsigned here=pop();auto& current=nodes_[here];if(current.closed)continue;current.closed=true;++expanded_;
        if(current.goal){finish=static_cast<int>(here);break;}
        const int x=static_cast<int>(here%width_),y=static_cast<int>(here/width_);const auto a=point(here);
        for(const auto& offset:offsets){const int nx=x+offset[0],ny=y+offset[1];if(nx<0||ny<0||nx>=static_cast<int>(width_)||ny>=static_cast<int>(height_))continue;
            const unsigned next=static_cast<unsigned>(ny)*width_+static_cast<unsigned>(nx);auto& cell=nodes_[next];if(cell.closed||!allowed(next))continue;
            const auto b=point(next);if(!segmentClear(a,b))continue;const double cost=current.cost+distance(a,b);
            if(cost>=cell.cost)continue;cell.cost=cost;cell.estimate=estimate(b);cell.parent=static_cast<int>(here);push(next);
        }
    }
    if(finish<0)return exhausted_||expanded_>=4096?RouteStatus::limited:RouteStatus::unreachable;
    unsigned length=0;for(int i=finish;i>=0&&length<nodeLimit;i=nodes_[i].parent){reverse_[length++]=static_cast<unsigned>(i);if(static_cast<unsigned>(i)==start)break;}
    if(!length||reverse_[length-1]!=start)return RouteStatus::unreachable;
    route.count=route.next=0;NavPoint from=request_.start;unsigned at=length-1;
    while(at>0&&route.count<NavRoute::pointLimit){unsigned chosen=at-1;
        // Bounded look-ahead removes grid stair steps while retaining exact clearance.
        const unsigned first=at>24?at-24:0;
        for(unsigned candidate=first;candidate<at;++candidate)if(segmentClear(from,point(reverse_[candidate]))){chosen=candidate;break;}
        from=point(reverse_[chosen]);route.points[route.count++]=from;at=chosen;
    }
    route.goal=point(static_cast<unsigned>(finish));route.target=request_.targetId;route.targetAt=request_.target;route.plannedAt=request_.time;
    return RouteStatus::following;
}
bool Navigation::follow(NavRoute& route,NavPoint& output)const{
    while(route.next<route.count&&distance2(request_.start,route.points[route.next])<.25)++route.next;
    if(route.next==route.count)return false;
    unsigned chosen=route.next;bool clear=false;
    for(unsigned i=route.count;i>route.next;--i)if(segmentClear(request_.start,route.points[i-1])){chosen=i-1;clear=true;break;}
    if(!clear)return false;route.next=chosen;
    const auto target=route.points[chosen];const double length=distance(request_.start,target);if(length<1e-8)return false;
    const double scale=min(1,request_.budget/length);output={request_.start.x+(target.x-request_.start.x)*scale,request_.start.y+(target.y-request_.start.y)*scale};
    return segmentClear(request_.start,output);
}
NavResult Navigation::advance(NavRoute& route){
    NavPoint output=request_.start;
    if(!finitePoint(request_.start)||!finitePoint(request_.target)||!request_.targetId||!(request_.radius>=0&&request_.radius<=10000&&request_.targetRadius>=0&&request_.targetRadius<=10000&&request_.reach>0&&request_.reach<=20000&&request_.budget>0&&request_.budget<1e12&&request_.time>=0&&request_.time<1e12)){route.clear();route.status=RouteStatus::unavailable;return {false,output,route.status};}
    const double goalDistance=distance(route.goal,request_.target);
    if(route.target!=request_.targetId||distance2(route.targetAt,request_.target)>64||request_.time<route.plannedAt||(route.status==RouteStatus::following&&(goalDistance>request_.reach-1||goalDistance<request_.radius+request_.targetRadius+.25)))route.clear();
    if(route.status==RouteStatus::following&&follow(route,output))return {true,output,route.status};
    if(route.status==RouteStatus::following){
        const double d=distance(request_.start,request_.target);
        if(d<=request_.reach-1&&d>=request_.radius+request_.targetRadius){route.status=RouteStatus::atTarget;route.count=route.next=0;return {true,output,route.status};}
        route.count=route.next=0;route.status=RouteStatus::none;
    }
    if(request_.time<route.retryAt)return {false,output,route.status};
    route.status=search(route);route.target=request_.targetId;route.targetAt=request_.target;route.plannedAt=request_.time;route.retryAt=request_.time+.15+(request_.actor%11)*.01;
    if(route.status==RouteStatus::following&&follow(route,output))return {true,output,route.status};
    return {false,request_.start,route.status};
}
}
