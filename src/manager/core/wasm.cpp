#include "badges.hpp"
#include "qol.hpp"
namespace d2smm {
namespace {badges::Ledger ledger;char input[3][badges::keyLimit+1];unsigned lengths[3];
bool decode(badges::Mark& m){return badges::key(input[0],lengths[0],m.source)&&badges::key(input[1],lengths[1],m.target)&&badges::key(input[2],lengths[2],m.context);}}
extern "C" {
char* d2smm_badge_input(unsigned index){return index<3?input[index]:nullptr;}
void d2smm_badge_length(unsigned index,unsigned length){if(index<3)lengths[index]=length;}
unsigned d2smm_badge_valid_key(unsigned index){badges::Key k;return index<3&&badges::key(input[index],lengths[index],k);}
void d2smm_badge_reset(){ledger.reset();}
int d2smm_badge_apply(unsigned operation,unsigned visible){badges::Mark m;if(!decode(m))return -3;switch(static_cast<badges::Operation>(operation)){case badges::Operation::load:return ledger.load(m);case badges::Operation::mark:return ledger.mark(m,visible!=0);case badges::Operation::clear:return ledger.clear(m);case badges::Operation::read:return ledger.read(m.target,m.context);case badges::Operation::unread:return ledger.unread(m.target,m.context);default:return -4;}}
unsigned d2smm_badge_count(){return ledger.count();}
const char* d2smm_badge_key(unsigned index,unsigned field){const auto* m=ledger.row(index);if(!m)return nullptr;return field==0?m->source.text:field==1?m->target.text:field==2?m->context.text:nullptr;}
unsigned d2smm_qol_candidate(unsigned flags){return qol::candidate(flags);}
unsigned d2smm_qol_admit(double bagCopies,double charmCopies,double bagCount,double charmCount,double x,double y,double columns,double rows,unsigned flags){return qol::admit({bagCopies,charmCopies,bagCount,charmCount,x,y,columns,rows,flags});}
unsigned d2smm_qol_transferred(double beforeBag,double beforeCharms,double afterBag,double afterCharms,double bagCopies,double charmCopies,unsigned sameItem){return qol::transferred(beforeBag,beforeCharms,afterBag,afterCharms,bagCopies,charmCopies,sameItem==1);}
}
}
