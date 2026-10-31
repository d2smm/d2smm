#include "perfection.hpp"
#ifdef NDEBUG
#undef NDEBUG
#endif
#include <cassert>
#include <cstring>
#include <iostream>
using d2smm::characters::perfection::Score;
void member(Score& s,const char* name,double value,unsigned function=1,double parameter=0){s.member(name,std::strlen(name),name,std::strlen(name),function,value,parameter);}
void roll(Score& s,double low,double high,double value,const char* name="stat"){s.property(low,high,0);member(s,name,value);s.endProperty();}
int main(int argc,char**argv){
 if(argc==2&&std::strcmp(argv[1],"--version")==0){std::cout<<"d2smm-perfection-checks 1.0.0\n";return 0;}
 Score s;s.begin(true);roll(s,30,50,40);roll(s,150,190,170);roll(s,5,10,5);assert(s.finish()==33&&s.rolls()==3);
 assert(s.value(0)==40&&s.value(1)==170&&s.value(2)==5);
 s.begin(true);roll(s,5,10,5);roll(s,20,30,30);assert(s.finish()==50&&s.rolls()==2&&s.value(0)==5&&s.value(1)==30);
 s.begin(true);roll(s,10,40,40);roll(s,5,15,15);assert(s.finish()==100&&s.value(0)==40&&s.value(1)==15);
 s.begin(true);roll(s,30,50,50);roll(s,150,190,190);roll(s,5,10,10);s.property(15,25,0);member(s,"mindamage",15,15);member(s,"maxdamage",25,16);s.endProperty();assert(s.finish()==100&&s.rolls()==3);
 s.begin(true);roll(s,1,2,1);roll(s,100,10000,10000);roll(s,42,42,42);assert(s.finish()==50&&s.rolls()==2);
 s.begin(true);s.property(10,20,0);member(s,"fireresist",15);member(s,"coldresist",15);member(s,"lightresist",15);member(s,"poisonresist",15);s.endProperty();roll(s,1,2,2);assert(s.finish()==75&&s.rolls()==2);
 assert(s.value(0)==15&&s.value(1)==2&&__builtin_isnan(s.value(2)));
 s.begin(true);roll(s,-30,-10,-30,"item_req_percent");assert(s.finish()==100);
 s.begin(true);s.property(1,3,5);member(s,"randomskill",5,12,2);s.endProperty();assert(s.finish()==50);
 s.begin(true);s.property(1,100,5);member(s,"fixed",5,17);s.endProperty();assert(s.finish()==100&&s.rolls()==0);
 s.begin(true);roll(s,0,1000,999);assert(s.finish()==99);
 s.begin(true);roll(s,0,100,0);assert(s.finish()==0);
 s.begin(false);assert(s.finish()==-1);
 s.begin(true);s.armor(true,98,141,98,false);assert(s.finish()==0&&s.rolls()==1);
 s.begin(true);s.armor(true,98,141,141,false);assert(s.finish()==100);
 s.begin(true);s.observe("item_armor_percent",18);roll(s,150,190,170);s.armor(true,39,47,48,false);assert(s.finish()==50&&s.rolls()==1);
 s.begin(true);s.armor(true,10,20,30,true);assert(s.finish()==100&&s.value(0)==30);
 s.begin(true);s.armor(true,39,47,60,true);assert(s.finish()==13);
 s.begin(true);roll(s,1,2,3);assert(s.finish()==-1);
 s.begin(true);s.property(1,2,0);s.member("a",1,"b",1,1,1,0);s.endProperty();assert(s.finish()==-1);
 s.begin(true);s.property(1,2,0);member(s,"a",1);member(s,"b",2);s.endProperty();assert(s.finish()==-1);
 s.begin(true);roll(s,1,2,__builtin_nan(""));assert(s.finish()==-1);
 assert(__builtin_isnan(s.value(0)));s.begin(true);assert(__builtin_isnan(s.value(0)));
 std::cout<<"Perfection normalization, independent-roll weighting, fixed endpoints, invalid inputs, and rounding passed\n";
}
