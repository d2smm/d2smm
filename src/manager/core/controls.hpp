#pragma once

namespace d2smm::manager {
enum class Feature : unsigned { lootGuard,characters,gearLoadouts,terrorized,qol,count };
class Controls {
    bool master_=true;
    unsigned selected_=0;
public:
    bool configure(unsigned master,unsigned loot,unsigned characters,unsigned gear,unsigned terror,unsigned qol){
        const unsigned values[]={master,loot,characters,gear,terror,qol};for(unsigned value:values)if(value>1)return false;
        master_=master!=0;selected_=loot|(characters<<1)|(gear<<2)|(terror<<3)|(qol<<4);return true;
    }
    bool masterEnabled()const{return master_;}
    bool nextEnabled()const{return !master_;}
    bool enabled(Feature feature)const{const auto index=static_cast<unsigned>(feature);return master_&&index<static_cast<unsigned>(Feature::count)&&(selected_&(1u<<index));}
};
}
