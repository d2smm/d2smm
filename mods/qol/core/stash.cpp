#include "stash.hpp"
namespace d2smm::qol::stash {
namespace {
bool count(double n){return n>=0&&n<=itemLimit&&n==static_cast<unsigned>(n);}
bool matches(const char* text,unsigned length,const char* wanted,unsigned n){
  if(!text||length<n)return false;
  for(unsigned i=0;i<n;++i)if(text[i]!=wanted[i])return false;
  return true;
}
double sharedWidth(double span,double personal,double unique,double gap){
  if(!(span>0&&personal>0&&unique>0&&gap>=0))return -1;
  const double width=(span-personal-unique-7*gap)/6;
  return width>=18?width:-1;
}
}
Error validate(double schema,double a,double b,double c,unsigned facts){
  if(schema!=version)return Error::schema;
  if(!(facts&shape))return Error::structure;
  if(!count(a)||!count(b)||!count(c))return Error::capacity;
  if(!(facts&itemsValid))return Error::items;
  if(!(facts&identitiesUnique))return Error::identities;
  if(!(facts&itemsFit))return Error::placement;
  return Error::none;
}
bool hasItems(double a,double b,double c){return count(a)&&count(b)&&count(c)&&(a>0||b>0||c>0);}
bool canConfigure(bool nextEnabled,unsigned cursorTab,bool importing){return !importing&&(nextEnabled||cursorTab<4||cursorTab>6);}
unsigned selected(unsigned current,bool enabled){return current>7?0:!enabled&&current>=4&&current<=6?1:current;}
Code code(const char* text,unsigned length,unsigned encodedBytes){
  if(encodedBytes>encodedLimit)return Code::invalid;
  if(matches(text,length,backupPrefix,7))return Code::extended;
  if(matches(text,length,nativePrefix,5))return Code::native;
  return Code::invalid;
}
double tabWidth(unsigned slot,double span,double personal,double unique,double gap){
  const auto width=sharedWidth(span,personal,unique,gap);
  if(slot>7||width<0)return -1;
  return slot==0?personal:slot==7?unique:width;
}
double tabLeft(unsigned slot,double left,double span,double personal,double unique,double gap){
  const auto width=sharedWidth(span,personal,unique,gap);
  if(slot>7||width<0)return -1;
  return slot==0?left:left+personal+gap+(slot-1)*(width+gap);
}
unsigned ImportFence::begin(){if(active_)return 0;if(++generation_==0)++generation_;cancelled_=false;return active_=generation_;}
void ImportFence::cancel(){cancelled_=true;}
bool ImportFence::current(unsigned ticket)const{return ticket&&ticket==active_&&!cancelled_;}
bool ImportFence::finish(unsigned ticket){if(!ticket||ticket!=active_)return false;active_=0;cancelled_=false;return true;}
}
