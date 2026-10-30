#pragma once
namespace d2smm::qol {
enum Flag : unsigned { enabled=1,pickedUp=2,sameWorld=4,sameClass=8,cursorClear=16,nativeAllowed=32,notificationsReady=64,notSwapping=128 };
struct Placement {double bagCopies,charmCopies,bagCount,charmCount,x,y,columns,rows;unsigned flags;};
bool candidate(unsigned flags);
bool admit(const Placement&);
bool transferred(double beforeBag,double beforeCharms,double afterBag,double afterCharms,double bagCopies,double charmCopies,bool sameItem);
}
