#pragma once

namespace d2smm::qol {
enum class QueryKind : unsigned { ordinary, passiveSummonPush };
class Combat {
public:
    static constexpr unsigned capacity=2048;
    static constexpr double holdSeconds=3;
    void configure(bool enabled);
    bool allows(QueryKind kind) const;
    void reset();
    unsigned open(double color,double now);
    int tint(unsigned handle,double requested,double now);
    void release(unsigned handle);
private:
    struct Entry {unsigned generation=0,color=0;double admitted=0,observed=0;bool live=false;};
    Entry entries_[capacity]{};
    bool enabled_=false;
    Entry* find(unsigned handle);
};
}
