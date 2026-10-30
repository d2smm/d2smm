#include "loot.hpp"
#include <cstring>
#include <iostream>
#include <limits>
using namespace d2smm::loot;
namespace {Engine engine;unsigned checks=0;
bool check(bool value,const char* name){++checks;if(!value)std::cerr<<name<<'\n';return value;}
unsigned index(const char* key,const char* const* list,unsigned count){for(unsigned i=0;i<count;++i)if(std::strcmp(key,list[i])==0)return i;return count;}
bool fieldEquals(unsigned field,const char* value){return engine.text(field,eq,value,std::strlen(value));}
bool statEquals(const char* key,double value){return engine.number(stat,index(key,stats,statCount),eq,value);}
void itemText(unsigned field,const char* value){engine.itemText(field,value,std::strlen(value));}
void mod(const char* key,double value,bool implicit=false){engine.modifier(key,std::strlen(key),value,implicit);}
void prepareItem(const char* rarity,const char* name){engine.beginItem(true);itemText(0,"boots");itemText(1,rarity);itemText(2,"Battle Boots");itemText(4,name);}
}
int main(int argc,char** argv){
    if(argc==2&&std::strcmp(argv[1],"--version")==0){std::cout<<"d2smm-loot-checks 1.0.0\n";return 0;}
    engine.beginProgram();engine.beginRule(true,false);engine.allowRarity(2);
    fieldEquals(4,"War Traveler");statEquals("magicFind",50);statEquals("enhancedDefense",190);statEquals("thorns",10);engine.combine(all,4,0);engine.endRule();
    engine.beginRule(true,false);engine.allowRarity(3);fieldEquals(4,"Enigma");engine.endRule();
    engine.beginRule(false,false);engine.number(stat,index("magicFind",stats,statCount),gte,7);engine.endRule();
    if(!check(engine.commit(),"Complete program commits"))return 1;
    prepareItem("unique","War Traveler");mod("magicFind",50);mod("enhancedDefense",190);mod("thorns",10);
    if(!check(engine.evaluate(false)&&engine.matched(0)&&!engine.matched(2),"Perfect unique matches only its explicit scope"))return 1;
    for(unsigned roll=0;roll<3;++roll){prepareItem("unique","War Traveler");mod("magicFind",roll==0?49:50);mod("enhancedDefense",roll==1?189:190);mod("thorns",roll==2?9:10);if(!check(engine.evaluate(false)&&!engine.matched(0)&&!engine.matched(2),"Each imperfect roll rejects without ordinary-rule leakage"))return 1;}
    prepareItem("rare","War Traveler");mod("magicFind",50);mod("enhancedDefense",190);mod("thorns",10);
    if(!check(engine.evaluate(false)&&!engine.matched(0)&&engine.matched(2),"A matching name cannot impersonate a unique"))return 1;
    prepareItem("runeword","Enigma");if(!check(engine.evaluate(false)&&engine.matched(1),"Selected runeword needs no perfect-roll condition"))return 1;
    prepareItem("runeword","Spirit");mod("magicFind",500);if(!check(engine.evaluate(false)&&!engine.matched(1)&&!engine.matched(2),"Unlisted runewords cannot match old magic/rare rules"))return 1;
    engine.beginProgram();engine.beginRule(false,false);engine.number(stat,statCount,eq,1);
    if(!check(!engine.endRule()&&!engine.commit()&&engine.ruleCount()==3,"Invalid import preserves accepted program"))return 1;
    prepareItem("runeword","Enigma");if(!check(engine.evaluate(false)&&engine.matched(1),"Accepted program still runs after rejection"))return 1;
    mod("life",std::numeric_limits<double>::quiet_NaN());if(!check(!engine.evaluate(false)&&!engine.matched(1),"Malformed item cannot inherit a previous match"))return 1;
    prepareItem("unique","War Traveler");mod("magicFind",50,true);mod("enhancedDefense",190);mod("thorns",10);
    if(!check(engine.evaluate(false)&&!engine.matched(0),"Implicit modifiers cannot complete a perfect roll"))return 1;
    engine.beginProgram();engine.beginRule(false,true);engine.number(metric,index("combined",metrics,metricCount),eq,3);engine.endRule();engine.commit();
    prepareItem("magic","Claws");mod("classskills0",1);mod("skilltab20",2);
    if(!check(engine.evaluate(true)&&!engine.matched(0),"Unrelated classes and trees do not combine"))return 1;
    mod("classskills6",1);if(!check(engine.evaluate(true)&&engine.matched(0)&&engine.evaluate(false)&&!engine.matched(0),"Related skill metric and testing switch remain native"))return 1;
    engine.beginProgram();engine.beginRule(true,false);engine.allowRarity(3);
    if(!check(!engine.allowRarity(3)&&!engine.commit(),"Duplicate rarity scope rejected atomically"))return 1;
    engine.beginProgram();engine.beginRule(false,false);statEquals("life",1);
    if(!check(!engine.combine(all,2,0)&&!engine.commit(),"Invalid postfix child count rejected"))return 1;
    engine.beginProgram();if(!check(engine.commit(),"An empty rule set is allowed"))return 1;
    prepareItem("magic","Empty");if(!check(engine.evaluate(false)&&!engine.matched(0),"Empty rules never match"))return 1;
    std::cout<<checks<<" loot policy checks passed\n";return 0;
}
