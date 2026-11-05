#pragma once
namespace d2smm::qol::stash {
inline constexpr unsigned version=1, nativeTabs=3, extraTabs=3, columns=10, rows=12, itemLimit=130;
inline constexpr unsigned encodedLimit=1000000, decodedLimit=8000000;
inline constexpr const char* field="d2smmSharedStash";
inline constexpr const char* nativePrefix="D2S1:";
inline constexpr const char* backupPrefix="D2SMM1:";
inline constexpr const char* keys[]={"shared1","shared2","shared3","shared4","shared5","shared6"};
enum Fact : unsigned {shape=1,itemsValid=2,identitiesUnique=4,itemsFit=8};
enum class Error : unsigned {none,schema,structure,capacity,items,identities,placement};
enum class Code : unsigned {invalid,native,extended};
Error validate(double schema,double a,double b,double c,unsigned facts);
bool hasItems(double a,double b,double c);
bool canConfigure(bool nextEnabled,unsigned cursorTab,bool importing);
unsigned selected(unsigned current,bool enabled);
Code code(const char* prefix,unsigned length,unsigned encodedBytes);
double tabLeft(unsigned slot,double left,double span,double personal,double unique,double gap);
double tabWidth(unsigned slot,double span,double personal,double unique,double gap);
class ImportFence {
  unsigned generation_=0,active_=0;
  bool cancelled_=false;
public:
  unsigned begin();
  void cancel();
  bool current(unsigned ticket) const;
  bool finish(unsigned ticket);
  bool busy() const {return active_!=0;}
};
}
