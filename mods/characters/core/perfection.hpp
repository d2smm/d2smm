#pragma once
namespace d2smm::characters::perfection {
class Score {
public:
    void begin(bool available);
    void property(double minimum,double maximum,double parameter);
    void member(const char* expected,unsigned expectedLength,const char* actual,unsigned actualLength,
                unsigned function,double value,double parameter);
    void endProperty();
    void observe(const char* stat,unsigned length);
    void armor(bool hasBounds,double minimum,double maximum,double value,bool etherealRuneword);
    int finish();
    unsigned rolls()const{return count_;}
private:
    bool valid_=false,open_=false,hasRoll_=false,lower_=false,allPerfect_=true,enhancedDefense_=false;
    double low_=0,high_=0,propertyParameter_=0,roll_=0,total_=0;
    unsigned count_=0;
    void add(double value,bool lower);
};
}
