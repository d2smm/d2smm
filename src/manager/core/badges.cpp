#include "badges.hpp"
namespace d2smm::badges {
namespace {
bool equal(const Key& a,const Key& b){for(unsigned i=0;i<=keyLimit;++i){if(a.text[i]!=b.text[i])return false;if(!a.text[i])return true;}return false;}
bool equal(const Mark& a,const Mark& b){return equal(a.source,b.source)&&equal(a.target,b.target)&&equal(a.context,b.context);}
}
bool key(const char* bytes,unsigned length,Key& result){
    if(!length||length>keyLimit)return false;
    for(unsigned i=0;i<length;++i){const char c=bytes[i];if(!((c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='-'))return false;}
    for(unsigned i=0;i<length;++i)result.text[i]=bytes[i];result.text[length]=0;return true;
}
void Ledger::erase(unsigned i){for(unsigned n=i+1;n<count_;++n)marks_[n-1]=marks_[n];--count_;}
int Ledger::load(const Mark& value){for(unsigned i=0;i<count_;++i)if(equal(marks_[i],value))return -1;if(count_==capacity)return -2;marks_[count_++]=value;return 1;}
int Ledger::mark(const Mark& value,bool visible){if(visible)return read(value.target,value.context)?1:0;for(unsigned i=0;i<count_;++i)if(equal(marks_[i],value))return 0;return load(value);}
bool Ledger::clear(const Mark& value){for(unsigned i=0;i<count_;++i)if(equal(marks_[i],value)){erase(i);return true;}return false;}
bool Ledger::read(const Key& target,const Key& context){bool changed=false;for(unsigned i=0;i<count_;)if(equal(marks_[i].target,target)&&equal(marks_[i].context,context)){erase(i);changed=true;}else ++i;return changed;}
bool Ledger::unread(const Key& target,const Key& context)const{for(unsigned i=0;i<count_;++i)if(equal(marks_[i].target,target)&&equal(marks_[i].context,context))return true;return false;}
}
