#pragma once
namespace d2smm::terrorized {
enum GatherFlag : unsigned { gatherEnabled=1, terror=2, playing=4, portal=8, bossWon=16, gatherTraining=32, timeUp=64, gatherDebug=128, gatherChests=256 };
enum DropFlag : unsigned { dead=1, magnet=2, discarded=4, reaching=8, noSprite=16 };
enum class DropKind : unsigned { item=1, chest, potion, rejuvenation, scroll, gold, xp };
struct Point { double x,y; };
class Gather {
public:
    static constexpr unsigned capacity=4096;
    static constexpr double duration=1.5;
    // 0: idle, 1: supply the existing drops, 2: animate the accepted snapshot.
    unsigned observe(unsigned portalId,double time,Point center,Point halfView,double bodyRadius,double pickupRadius,unsigned flags);
    unsigned add(Point from,unsigned kind,unsigned flags);
    bool layout();
    Point ideal(unsigned slot) const;
    bool target(unsigned slot,Point point);
    void release(unsigned slot);
    bool advance(double time);
    Point position(unsigned slot) const;
    bool moving(unsigned slot) const;
    void cancel();
    unsigned phase() const {return phase_;}
    unsigned count() const {return count_;}
    double radius() const {return radius_;}
private:
    struct Slot {Point from,to,current;double angle,fromRadius,toAngle,toRadius;unsigned kind;bool active;};
    Slot slots_[capacity];
    unsigned order_[capacity];
    unsigned consumed_=0,phase_=0,count_=0,selection_=0;
    double started_=0,last_=0,radius_=0,clearance_=0;
    Point center_{0,0};
    bool overflow_=false;
};
namespace math {double sine(double);double cosine(double);double angle(double,double);}
}
