#include "controls.hpp"
#include <iostream>
#include <string_view>

int main(int argc,char** argv){
    if(argc==2&&std::string_view(argv[1])=="--version"){std::cout<<"d2smm-manager-controls-checks 1.0.0\n";return 0;}
    using namespace d2smm::manager;Controls control;
    const auto check=[](bool ok,const char* text){if(!ok)std::cerr<<text<<'\n';return ok;};
    if(!check(control.configure(1,1,0,1,0,1)&&control.masterEnabled()&&control.enabled(Feature::lootGuard)&&!control.enabled(Feature::characters)&&control.enabled(Feature::qol),"Selected feature flags are admitted"))return 1;
    if(!check(control.configure(control.nextEnabled(),1,0,1,0,1)&&!control.masterEnabled()&&!control.enabled(Feature::lootGuard)&&!control.enabled(Feature::qol),"Master off suspends selected features"))return 1;
    if(!check(control.configure(control.nextEnabled(),1,0,1,0,1)&&control.masterEnabled()&&control.enabled(Feature::gearLoadouts)&&!control.enabled(Feature::terrorized),"Master on restores only selected features"))return 1;
    if(!check(!control.configure(0,1,2,1,0,1)&&control.masterEnabled()&&control.enabled(Feature::qol),"Invalid input leaves the admitted state intact"))return 1;
    if(!check(control.configure(1,0,0,0,0,0)&&control.masterEnabled()&&!control.enabled(Feature::qol)&&!control.enabled(static_cast<Feature>(99)),"Empty selection and unknown features remain disabled"))return 1;
    std::cout<<"Manager master-control checks passed\n";return 0;
}
