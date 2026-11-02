#pragma once

namespace d2smm::qol {
enum class QueryKind : unsigned { ordinary, passiveSummonPush, legacyDecoyMovement };
enum class QueryMode : unsigned { native, suppress, retainNativePose };
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
    QueryMode queryMode(QueryKind kind) const;
    void reset();
    unsigned open(double color,double now);
    int tint(unsigned handle,double requested,double now);
    void release(unsigned handle);
private:
    struct Entry {unsigned generation=0,color=0;double admitted=0,observed=0;bool live=false;};
    Entry entries_[capacity]{};
    bool enabled_=false;
    bool hideHitStars_=false;
    double effectLife_=0,effectColors_[3]{},effectAlphas_[3]{},effectWidth_=0;
    unsigned effectParts_=0;
    bool effectProfileValid_=false,effectMatches_=false;
    Entry* find(unsigned handle);
};
}
