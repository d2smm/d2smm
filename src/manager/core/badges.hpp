#pragma once
namespace d2smm::badges {
constexpr unsigned keyLimit=64,capacity=256;
enum class Operation : unsigned {load,mark,clear,read,unread};
struct Key {char text[keyLimit+1];};
struct Mark {Key source,target,context;};
bool key(const char* bytes,unsigned length,Key& result);
class Ledger {
    Mark marks_[capacity];unsigned count_=0;
    void erase(unsigned index);
public:
    void reset(){count_=0;}
    unsigned count()const{return count_;}
    const Mark* row(unsigned index)const{return index<count_?&marks_[index]:nullptr;}
    int load(const Mark&); // Duplicate/capacity failures do not invent a mark.
    int mark(const Mark&,bool visible);
    bool clear(const Mark&);
    bool read(const Key& target,const Key& context);
    bool unread(const Key& target,const Key& context)const;
};
}
