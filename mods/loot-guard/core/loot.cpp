#include "loot.hpp"
namespace d2smm::loot {
namespace {
unsigned length(const char* s){unsigned n=0;while(s[n])++n;return n;}
bool same(const char* a,unsigned n,const char* b,unsigned m){if(n!=m)return false;for(unsigned i=0;i<n;++i)if(a[i]!=b[i])return false;return true;}
bool same(const Text& a,const Text& b){return a.present&&b.present&&same(a.bytes,a.length,b.bytes,b.length);}
bool assign(Text& out,const char* value,unsigned n,bool present=true){if(n>textLimit||(!value&&n))return false;for(unsigned i=0;i<n;++i)out.bytes[i]=value[i];out.bytes[n]=0;out.length=n;out.present=present;return true;}
int find(const char* value,unsigned n,const char* const* keys,unsigned count){for(unsigned i=0;i<count;++i)if(same(value,n,keys[i],length(keys[i])))return static_cast<int>(i);return -1;}
double maximum(double a,double b){return a>b?a:b;}
bool compare(double actual,unsigned op,double wanted){switch(op){case eq:return actual==wanted;case gte:return actual>=wanted;case gt:return actual>wanted;case lte:return actual<=wanted;default:return false;}}
}
bool Engine::addBase(const char* name,unsigned n,const char* kind,unsigned k){
    if(baseCount_==baseLimit||!n||!k||n>textLimit||k>textLimit){error_=Error::base;return false;}
    for(unsigned i=0;i<baseCount_;++i)if(same(name,n,bases_[i].name.bytes,bases_[i].name.length)){error_=Error::base;return false;}
    assign(bases_[baseCount_].name,name,n);assign(bases_[baseCount_].kind,kind,k);++baseCount_;return true;
}
void Engine::beginProgram(){auto& p=candidate();p.nodeCount=p.ruleCount=p.textUsed=depthCount_=0;error_=none;compiling_=compileValid_=true;openRule_=false;}
bool Engine::beginRule(bool explicitRarities,bool testing){
    auto& p=candidate();if(!compiling_||!compileValid_||openRule_)return fail(Error::program);
    if(p.ruleCount==ruleLimit)return fail(Error::capacity);
    p.rules[p.ruleCount]={p.nodeCount,0,explicitRarities?0u:3u,testing};depthCount_=0;openRule_=true;return true;
}
bool Engine::allowRarity(unsigned id){
    if(!compileValid_||!openRule_||id>=4)return fail(Error::scope);auto& r=candidate().rules[candidate().ruleCount];
    const auto bit=1u<<id;if(r.mask&bit)return fail(Error::scope);r.mask|=bit;return true;
}
bool Engine::append(Node node,unsigned depth){
    if(!compileValid_||!openRule_)return fail(Error::program);auto& p=candidate();
    if(p.nodeCount==nodeLimit||depthCount_==stackLimit)return fail(Error::capacity);
    p.nodes[p.nodeCount++]=node;depths_[depthCount_++]=depth;return true;
}
bool Engine::number(unsigned kind,unsigned index,unsigned op,double value){
    if((kind!=stat&&kind!=metric)||index>=(kind==stat?statCount:metricCount)||op>lte||!__builtin_isfinite(value)||value>100000||value< -100000)return fail(Error::selector);
    Node n{};n.kind=kind;n.index=index;n.op=op;n.value=value;return append(n,0);
}
bool Engine::text(unsigned id,unsigned op,const char* value,unsigned size){
    auto& p=candidate();if(id>=fieldCount||op!=eq||size>textLimit||(!value&&size))return fail(Error::selector);
    if(size>textCapacity-p.textUsed)return fail(Error::capacity);
    Node n{};n.kind=field;n.index=id;n.offset=p.textUsed;n.length=size;
    for(unsigned i=0;i<size;++i)p.texts[p.textUsed++]=value[i];return append(n,0);
}
bool Engine::combine(unsigned kind,unsigned count,double minimum){
    if(!compileValid_||!openRule_||kind<all||kind>atLeast||count<1||count>12||count>depthCount_)return fail(Error::group);
    if(kind==all)minimum=count;else if(kind==any)minimum=1;
    if(!__builtin_isfinite(minimum)||minimum<1||minimum>count||minimum!=static_cast<unsigned>(minimum))return fail(Error::group);
    unsigned depth=0;for(unsigned i=0;i<count;++i){const auto d=depths_[--depthCount_];if(d>depth)depth=d;}
    if(depth>=6)return fail(Error::group);Node n{};n.kind=kind;n.count=count;n.minimum=minimum;return append(n,depth+1);
}
bool Engine::endRule(){
    auto& p=candidate();if(!compileValid_||!openRule_||depthCount_!=1)return fail(Error::program);
    auto& r=p.rules[p.ruleCount];if(!r.mask)return fail(Error::scope);r.end=p.nodeCount;++p.ruleCount;openRule_=false;return true;
}
bool Engine::commit(){if(!compiling_||!compileValid_||openRule_)return fail(Error::program);active_=1-active_;compiling_=false;return true;}
void Engine::beginItem(bool valid){
    itemValid_=valid;error_=none;specificCount_=modifierCount_=0;
    for(auto& f:itemFields_)f.present=false;for(auto& v:values_)v=0;for(auto& v:derived_)v=0;for(auto& m:matches_)m=false;
}
bool Engine::itemText(unsigned id,const char* value,unsigned n,bool present){
    if(id>=fieldCount||id==3||!assign(itemFields_[id],value,n,present))return invalidItem();return itemValid_;
}
bool Engine::modifier(const char* key,unsigned n,double value,bool implicit,bool typed){
    if(!itemValid_||!typed||n>textLimit||(!key&&n)||!__builtin_isfinite(value)||++modifierCount_>modifierLimit)return invalidItem();
    if(implicit)return true;const int id=find(key,n,stats,statCount);
    if(id>=0){values_[id]+=value;if(!__builtin_isfinite(values_[id]))return invalidItem();return true;}
    if(n<6||!same(key,6,"skill:",6))return true;
    for(unsigned i=0;i<specificCount_;++i)if(same(key,n,specific_[i].name.bytes,specific_[i].name.length)){specific_[i].value+=value;return __builtin_isfinite(specific_[i].value)?true:invalidItem();}
    if(specificCount_==modifierLimit)return invalidItem();assign(specific_[specificCount_].name,key,n);specific_[specificCount_++].value=value;return true;
}
double Engine::get(const char* key)const{const auto i=find(key,length(key),stats,statCount);return i<0?0:values_[i];}
void Engine::derive(){
    const double resist[]={get("fireResist"),get("coldResist"),get("lightningResist"),get("poisonResist")};
    derived_[2]=derived_[5]=resist[0];
    for(unsigned i=0;i<4;++i){derived_[0]+=resist[i];derived_[1]+=resist[i]>=30;derived_[2]=resist[i]<derived_[2]?resist[i]:derived_[2];derived_[5]=maximum(derived_[5],resist[i]);if(i<3){derived_[3]+=resist[i];derived_[4]+=resist[i]>=30;}}
    const unsigned classStart=34,treeStart=41;
    derived_[6]=values_[classStart];derived_[7]=values_[treeStart];derived_[8]=values_[treeStart]+values_[classStart];
    for(unsigned i=0;i<7;++i)derived_[6]=maximum(derived_[6],values_[classStart+i]);
    for(unsigned i=0;i<21;++i){derived_[7]=maximum(derived_[7],values_[treeStart+i]);derived_[8]=maximum(derived_[8],values_[treeStart+i]+values_[classStart+i/3]);}
    for(unsigned i=6;i<=8;++i)derived_[i]+=get("allSkills");
    for(unsigned i=0;i<specificCount_;++i)derived_[9]=maximum(derived_[9],specific_[i].value);
    derived_[10]=get("strength")+get("dexterity");
    derived_[11]=maximum(maximum(get("skilltab18"),get("skilltab19")),get("skilltab20"))+get("classskills6");
    derived_[12]=get("classskills0")+get("skilltab2");derived_[13]=get("classskills0")+get("skilltab0");
    assign(itemFields_[3],"",0);for(unsigned i=0;i<baseCount_;++i)if(same(itemFields_[2],bases_[i].name)){itemFields_[3]=bases_[i].kind;break;}
}
bool Engine::execute(const Rule& r,unsigned mask,bool testing)const{
    if(!(r.mask&mask)||(r.testing&&!testing))return false;const auto& p=programs_[active_];bool stack[stackLimit];unsigned size=0;
    for(unsigned i=r.start;i<r.end;++i){const auto& n=p.nodes[i];bool result=false;
        if(n.kind>=all){unsigned matched=0;for(unsigned j=0;j<n.count;++j)matched+=stack[--size];result=matched>=n.minimum;}
        else if(n.kind==field){const auto& f=itemFields_[n.index];result=f.present&&same(f.bytes,f.length,p.texts+n.offset,n.length);}
        else result=compare(n.kind==stat?values_[n.index]:derived_[n.index],n.op,n.value);
        stack[size++]=result;
    }return size==1&&stack[0];
}
bool Engine::evaluate(bool testing){
    for(auto& m:matches_)m=false;if(!itemValid_||!itemFields_[1].present)return false;
    const auto rarity=find(itemFields_[1].bytes,itemFields_[1].length,rarities,4);if(rarity<0)return false;
    derive();for(double v:derived_)if(!__builtin_isfinite(v))return invalidItem();
    for(unsigned i=0;i<programs_[active_].ruleCount;++i)matches_[i]=execute(programs_[active_].rules[i],1u<<rarity,testing);return true;
}
}
