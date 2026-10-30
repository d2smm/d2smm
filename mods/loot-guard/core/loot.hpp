#pragma once
namespace d2smm::loot {
inline constexpr const char* fields[]={"type","rarity","base","kind","name"};
inline constexpr const char* rarities[]={"magic","rare","unique","runeword"};
inline constexpr const char* metrics[]={"resistTotal","resistCount","allResist","elementalTotal","elementalCount","bestResist","classMax","treeMax","combined","skillMax","attributes","assassinSkills","javelinSkills","bowSkills"};
inline constexpr const char* stats[]={"fcr","attackSpeed","frw","life","mana","strength","dexterity","vitality","energy","magicFind","goldFind","fireResist","coldResist","lightningResist","poisonResist","enhancedDamage","enhancedDefense","attackRatingPoints","attackRatingPerLevel","attackRatingPercentPerLevel","maxDamage","minDamage","maxDamagePerLevel","lifeLeech","manaLeech","deadlyStrike","crushingBlow","openWounds","fhr","fasterBlock","block","damageReduced","damageReduction","allSkills","classskills0","classskills1","classskills2","classskills3","classskills4","classskills5","classskills6","skilltab0","skilltab1","skilltab2","skilltab3","skilltab4","skilltab5","skilltab6","skilltab7","skilltab8","skilltab9","skilltab10","skilltab11","skilltab12","skilltab13","skilltab14","skilltab15","skilltab16","skilltab17","skilltab18","skilltab19","skilltab20","thorns"};
inline constexpr const char* errors[]={"","Loot rules are too large","Unsupported loot-rule selector","Invalid loot-rule group","Invalid item rarity scope","Invalid loot-rule program","Invalid item data","Invalid base-category table"};
inline constexpr unsigned fieldCount=sizeof(fields)/sizeof(*fields),statCount=sizeof(stats)/sizeof(*stats),metricCount=sizeof(metrics)/sizeof(*metrics);
inline constexpr unsigned textLimit=512,ruleLimit=200,nodeLimit=32768,textCapacity=524288,stackLimit=128,baseLimit=512,modifierLimit=256;
enum Kind:unsigned {stat=0,field=1,metric=2,all=3,any=4,atLeast=5};
enum Comparison:unsigned {eq=0,gte=1,gt=2,lte=3};
enum Error:unsigned {none=0,capacity,selector,group,scope,program,item,base};
struct Text {char bytes[textLimit+1];unsigned length=0;bool present=false;};
class Engine {
public:
    bool addBase(const char*,unsigned,const char*,unsigned);
    void beginProgram();
    bool beginRule(bool explicitRarities,bool testing);
    bool allowRarity(unsigned);
    bool number(unsigned kind,unsigned index,unsigned op,double value);
    bool text(unsigned field,unsigned op,const char*,unsigned);
    bool combine(unsigned kind,unsigned count,double minimum);
    bool endRule();
    bool commit();
    void beginItem(bool modifiersArray);
    bool itemText(unsigned field,const char*,unsigned,bool present=true);
    bool modifier(const char*,unsigned,double,bool implicit,bool typed=true);
    bool evaluate(bool testing);
    bool matched(unsigned i)const{return i<programs_[active_].ruleCount&&matches_[i];}
    unsigned error()const{return error_;}
    unsigned ruleCount()const{return programs_[active_].ruleCount;}
private:
    struct Node {double value;unsigned offset;unsigned short length;unsigned char kind,index,op,count,minimum;};
    struct Rule {unsigned start,end,mask;bool testing;};
    struct Program {Node nodes[nodeLimit];Rule rules[ruleLimit];char texts[textCapacity];unsigned nodeCount=0,ruleCount=0,textUsed=0;};
    struct Base {Text name,kind;};
    struct Specific {Text name;double value;};
    Program programs_[2];Base bases_[baseLimit];Specific specific_[modifierLimit];
    Text itemFields_[fieldCount];double values_[statCount],derived_[metricCount];bool matches_[ruleLimit];
    unsigned active_=0,baseCount_=0,specificCount_=0,modifierCount_=0,error_=0,depths_[stackLimit],depthCount_=0;
    bool compiling_=false,openRule_=false,compileValid_=false,itemValid_=false;
    Program& candidate(){return programs_[1-active_];}
    bool fail(Error error){error_=error;compileValid_=false;return false;}
    bool invalidItem(){error_=Error::item;itemValid_=false;return false;}
    bool append(Node,unsigned depth);
    double get(const char*)const;
    void derive();
    bool execute(const Rule&,unsigned mask,bool testing)const;
};
}
