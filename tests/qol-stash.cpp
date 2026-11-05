#include "stash.hpp"
#include <iostream>
#include <limits>
#include <string_view>
int main(int argc,char** argv){
  if(argc==2&&std::string_view(argv[1])=="--version"){std::cout<<"d2smm-qol-stash-checks 1.0.0\n";return 0;}
  using namespace d2smm::qol::stash;unsigned checks=0;
  const auto check=[&](bool ok,const char* label){++checks;if(!ok)std::cerr<<label<<'\n';return ok;};
  if(!check(validate(1,120,120,120,15)==Error::none,"Three full native-sized extra grids are admitted"))return 1;
  if(!check(validate(2,1,0,0,15)==Error::schema,"Unknown versions are retained as unsupported"))return 1;
  for(double n:{-1.,.5,131.,std::numeric_limits<double>::quiet_NaN()})if(!check(validate(1,n,0,0,15)==Error::capacity,"Invalid counts cannot truncate storage"))return 1;
  for(unsigned bit=1;bit<=8;bit*=2)if(!check(validate(1,1,2,3,15&~bit)!=Error::none,"All native validation facts are required"))return 1;
  if(!check(!hasItems(0,0,0)&&hasItems(0,1,0),"Empty views do not create persistent data"))return 1;
  if(!check(!canConfigure(false,4,false)&&canConfigure(false,3,false)&&!canConfigure(true,0,true),"Held items and imports fence toggles"))return 1;
  if(!check(selected(6,false)==1&&selected(6,true)==6&&selected(7,false)==7,"Disable falls back without changing Unique"))return 1;
  if(!check(code("D2S1:",5,100)==Code::native&&code("D2SMM1:",7,100)==Code::extended&&code("D2SMM2:",7,100)==Code::invalid&&code("D2SMM1:",7,encodedLimit+1)==Code::invalid,"Backup codes have an explicit bounded format"))return 1;
  double end=10;for(unsigned i=0;i<8;++i){const auto x=tabLeft(i,10,500,90,90,2),w=tabWidth(i,500,90,90,2);if(!check(x>=end&&w>=18,"Tabs never overlap"))return 1;end=x+w;}
  if(!check(end==510&&tabWidth(1,100,90,90,2)<0,"Layout fits its native bar or rejects"))return 1;
  ImportFence fence;auto first=fence.begin();if(!check(first&&!fence.begin(),"Only one import is admitted"))return 1;
  fence.cancel();if(!check(!fence.begin()&&!fence.current(first)&&fence.busy()&&fence.finish(first),"Cancel invalidates publication but retains the async lease until settled"))return 1;
  auto second=fence.begin();if(!check(second!=first&&!fence.current(first)&&!fence.finish(first)&&fence.finish(second)&&!fence.busy(),"Cancelled and stale imports cannot publish"))return 1;
  std::cout<<checks<<" extra-stash policy checks passed\n";return 0;
}
