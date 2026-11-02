#pragma once
#include "motion.hpp"

namespace d2smm::qol {
enum class QueryKind : unsigned { ordinary, passiveSummonPush };
class Combat {
public:
    static constexpr unsigned capacity=2048;
    static constexpr double holdSeconds=3;
    void configure(bool enabled,bool hideHitStars=false);
    bool effectVisible(unsigned kind)const;
    bool effectProfile(double life,double c0,double c1,double c2,double a0,double a1,double a2,double width);
    void effectBegin(double life,bool additive,unsigned count);
    void effectPart(unsigned index,unsigned kind,double color,double alpha,double width,unsigned polygons,unsigned points,unsigned circles,unsigned moves,unsigned other);
    bool effectEnd()const;
    bool allows(QueryKind kind) const;
    void reset();
    unsigned open(double color,double now);
    int tint(unsigned handle,double requested,double now);
    void release(unsigned handle);
    Motion* motion(unsigned handle);
    bool frame(bool walls,double now,double dt,NavTerrain terrain);
    bool observe(unsigned handle,double x,double y,double radius,unsigned melee,unsigned ranged,unsigned special,unsigned target,double tx,double ty,double tr,double life,unsigned animated,double speed,double animation,double facing,double directions);
    bool scenery(double x,double y,double radius);
    bool beginMotion(unsigned handle,double x,double y,unsigned target,double tx,double ty,double tr,double life,double reach);
    bool neighbor(unsigned handle,unsigned other,double x,double y,double radius,bool same,bool dead,bool nativeDisplaced,bool animated);
    bool needsRoute(unsigned handle);
    bool geometryBegin(unsigned handle);
    bool pose(unsigned handle,double x,double y,double radius,bool dead,bool animated);
    void resolve(unsigned handle);
    unsigned navigationCount(unsigned status)const;
private:
    struct Entry {unsigned generation=0,color=0;double admitted=0,observed=0;bool live=false;Motion movement;unsigned long long excludedQuery=0;};
    Entry entries_[capacity]{};
    bool enabled_=false;
    bool hideHitStars_=false;
    double effectLife_=0,effectColors_[3]{},effectAlphas_[3]{},effectWidth_=0;
    unsigned effectParts_=0;
    bool effectProfileValid_=false,effectMatches_=false;
    struct Prop {NavPoint at;double radius=0;};
    Prop props_[capacity]{};unsigned propCount_=0,frame_=0,activeHandle_=0;
    unsigned long long query_=0;
    double now_=0,dt_=0;
    Navigation navigation_;
    Entry* find(unsigned handle);
};
}
