#include "perfection.hpp"
namespace d2smm::characters::perfection {
namespace {
bool finite(double v){return __builtin_isfinite(v);}
bool equal(const char* a,unsigned an,const char* b,unsigned bn){if(!a||!b||an!=bn||an==0||an>128)return false;for(unsigned i=0;i<an;++i)if(a[i]!=b[i])return false;return true;}
bool lowerBetter(const char* name,unsigned length){constexpr char key[]="item_req_percent";return equal(name,length,key,sizeof(key)-1);}
}
void Score::begin(bool available){valid_=available;open_=false;hasRoll_=false;total_=0;count_=0;allPerfect_=true;enhancedDefense_=false;}
void Score::observe(const char* stat,unsigned length){constexpr char ed[]="item_armor_percent";if(equal(stat,length,ed,sizeof(ed)-1))enhancedDefense_=true;}
void Score::armor(bool hasBounds,double minimum,double maximum,double value,bool etherealRuneword){
    if(!hasBounds){if(finite(value))valid_=false;return;}
    if(!finite(minimum)||!finite(maximum)||!finite(value)||minimum<0||maximum<minimum||maximum>1000000){valid_=false;return;}
    const auto scaled=[etherealRuneword](double v){return etherealRuneword?static_cast<double>(static_cast<unsigned>(v*1.5)):v;};
    if(enhancedDefense_){if(value!=scaled(maximum+1))valid_=false;return;}
    const double raw=etherealRuneword?static_cast<double>(static_cast<unsigned>((value*2+2)/3)):value;
    if(scaled(raw)!=value){valid_=false;return;}
    property(minimum,maximum,0);hasRoll_=low_!=high_;roll_=raw;if(!hasRoll_&&raw!=low_)valid_=false;endProperty();
}
void Score::property(double minimum,double maximum,double parameter){
    if(open_||!finite(minimum)||!finite(maximum)){valid_=false;return;}
    low_=minimum<maximum?minimum:maximum;high_=minimum<maximum?maximum:minimum;
    propertyParameter_=parameter;open_=true;hasRoll_=false;lower_=false;
}
void Score::member(const char* expected,unsigned expectedLength,const char* actual,unsigned actualLength,unsigned function,double value,double parameter){
    if(!valid_||!open_||!equal(expected,expectedLength,actual,actualLength)||!finite(value)){valid_=false;return;}
    if(function==15||function==16||function==11||function==19)return;
    if(function==17&&finite(propertyParameter_)&&propertyParameter_!=0)return;
    if(low_==high_)return;
    const bool lower=lowerBetter(expected,expectedLength);
    if(function==12){add(parameter,lower);return;}
    if(!hasRoll_){hasRoll_=true;roll_=value;lower_=lower;}
    else if(value!=roll_||lower!=lower_)valid_=false;
}
void Score::add(double value,bool lower){
    if(!finite(value)||value<low_||value>high_||count_>=512){valid_=false;return;}
    const double score=lower?(high_-value)/(high_-low_):(value-low_)/(high_-low_);
    total_+=score;++count_;allPerfect_=allPerfect_&&(lower?value==low_:value==high_);
}
void Score::endProperty(){if(!open_){valid_=false;return;}if(hasRoll_)add(roll_,lower_);open_=false;}
int Score::finish(){if(!valid_||open_)return -1;if(count_==0||allPerfect_)return 100;const int rounded=static_cast<int>(100*total_/count_+.5);return rounded>99?99:rounded;}
}
