#include "loot.hpp"
namespace {constinit d2smm::loot::Engine engine{};char input[2][d2smm::loot::textLimit+1];}
extern "C" {
char* loot_input(unsigned slot){return slot<2?input[slot]:nullptr;}
unsigned loot_base(unsigned a,unsigned b){return engine.addBase(input[0],a,input[1],b);}
void loot_begin(){engine.beginProgram();}
unsigned loot_rule(unsigned scope,unsigned testing){return engine.beginRule(scope!=0,testing!=0);}
unsigned loot_rarity(unsigned id){return engine.allowRarity(id);}
unsigned loot_number(unsigned kind,unsigned index,unsigned op,double value){return engine.number(kind,index,op,value);}
unsigned loot_text(unsigned field,unsigned op,unsigned length){return engine.text(field,op,input[0],length);}
unsigned loot_group(unsigned kind,unsigned count,double minimum){return engine.combine(kind,count,minimum);}
unsigned loot_end(){return engine.endRule();}
unsigned loot_commit(){return engine.commit();}
void loot_item(unsigned valid){engine.beginItem(valid!=0);}
unsigned loot_field(unsigned field,unsigned length,unsigned present){return engine.itemText(field,input[0],length,present!=0);}
unsigned loot_modifier(unsigned length,double value,unsigned implicit,unsigned typed){return engine.modifier(input[0],length,value,implicit!=0,typed!=0);}
unsigned loot_evaluate(unsigned testing){return engine.evaluate(testing!=0);}
unsigned loot_match(unsigned index){return engine.matched(index);}
unsigned loot_error(){return engine.error();}
}
