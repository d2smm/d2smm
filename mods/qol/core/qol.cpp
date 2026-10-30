#include "qol.hpp"
namespace d2smm::qol {
namespace {bool count(double n){return n>=0&&n<=2147483647&&n==static_cast<unsigned>(n);}}
bool candidate(unsigned flags){constexpr unsigned required=enabled|pickedUp|sameWorld|sameClass|cursorClear|nativeAllowed|notificationsReady|notSwapping;return (flags&required)==required;}
bool admit(const Placement& p){return candidate(p.flags)&&p.bagCopies==1&&p.charmCopies==0&&count(p.bagCount)&&p.bagCount>=1&&count(p.charmCount)&&count(p.x)&&count(p.y)&&count(p.columns)&&count(p.rows)&&p.columns>0&&p.rows>0&&p.x<p.columns&&p.y<p.rows;}
bool transferred(double beforeBag,double beforeCharms,double afterBag,double afterCharms,double bagCopies,double charmCopies,bool sameItem){return sameItem&&count(beforeBag)&&beforeBag>=1&&count(beforeCharms)&&afterBag==beforeBag-1&&afterCharms==beforeCharms+1&&bagCopies==0&&charmCopies==1;}
}
