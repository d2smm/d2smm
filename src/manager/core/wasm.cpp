#include "badges.hpp"
#include "controls.hpp"
#include "qol.hpp"
#include "combat.hpp"
#include "stash.hpp"
#include "zoom.hpp"
#include "perfection.hpp"
namespace d2smm {
namespace {badges::Ledger ledger;char input[3][badges::keyLimit+1];unsigned lengths[3];
bool decode(badges::Mark& m){return badges::key(input[0],lengths[0],m.source)&&badges::key(input[1],lengths[1],m.target)&&badges::key(input[2],lengths[2],m.context);}}
extern "C" {
static qol::Combat combat;
static qol::Zoom zoom;
void d2smm_zoom_configure(unsigned enabled) { zoom.configure(enabled == 1); }
unsigned d2smm_zoom_wheel(double delta, unsigned mode, double height, unsigned context) { return zoom.wheel(delta, mode, height, context); }
double d2smm_zoom_scale(double nativeScale) { return zoom.scale(nativeScale); }
double d2smm_zoom_half_extent(double pixels, double nativeScale) { return zoom.halfExtent(pixels, nativeScale); }
double d2smm_zoom_distance() { return zoom.distance(); }
static manager::Controls controls;
static qol::stash::ImportFence stashImport;
static char stashPrefix[8];
unsigned d2smm_stash_validate(double version,double a,double b,double c,unsigned facts){return unsigned(qol::stash::validate(version,a,b,c,facts));}
unsigned d2smm_stash_has_items(double a,double b,double c){return qol::stash::hasItems(a,b,c);}
unsigned d2smm_stash_configure(unsigned enabled,unsigned cursor){return qol::stash::canConfigure(enabled!=0,cursor,stashImport.busy());}
unsigned d2smm_stash_selected(unsigned current,unsigned enabled){return qol::stash::selected(current,enabled!=0);}
char* d2smm_stash_prefix(){return stashPrefix;}
unsigned d2smm_stash_code(unsigned length,unsigned bytes){return unsigned(qol::stash::code(stashPrefix,length,bytes));}
double d2smm_stash_left(unsigned slot,double left,double span,double personal,double unique,double gap){return qol::stash::tabLeft(slot,left,span,personal,unique,gap);}
double d2smm_stash_width(unsigned slot,double span,double personal,double unique,double gap){return qol::stash::tabWidth(slot,span,personal,unique,gap);}
unsigned d2smm_stash_import_begin(){return stashImport.begin();}
unsigned d2smm_stash_import_current(unsigned ticket){return stashImport.current(ticket);}
unsigned d2smm_stash_import_finish(unsigned ticket){return stashImport.finish(ticket);}
void d2smm_stash_import_cancel(){stashImport.cancel();}
unsigned d2smm_manager_configure(unsigned master,unsigned loot,unsigned characters,unsigned gear,unsigned terror,unsigned qol){return controls.configure(master,loot,characters,gear,terror,qol);}
unsigned d2smm_manager_enabled(){return controls.masterEnabled();}
unsigned d2smm_manager_next_enabled(){return controls.nextEnabled();}
unsigned d2smm_manager_feature(unsigned feature){return controls.enabled(static_cast<manager::Feature>(feature));}
void d2smm_qol_combat_configure(unsigned enabled,unsigned hideHitStars){combat.configure(enabled==1,hideHitStars==1);}
unsigned d2smm_qol_effect_visible(unsigned kind){return combat.effectVisible(kind);}
unsigned d2smm_qol_effect_profile(double life,double c0,double c1,double c2,double a0,double a1,double a2,double width){return combat.effectProfile(life,c0,c1,c2,a0,a1,a2,width);}
void d2smm_qol_effect_begin(double life,unsigned additive,unsigned count){combat.effectBegin(life,additive!=0,count);}
void d2smm_qol_effect_part(unsigned index,unsigned kind,double color,double alpha,double width,unsigned polygons,unsigned points,unsigned circles,unsigned moves,unsigned other){combat.effectPart(index,kind,color,alpha,width,polygons,points,circles,moves,other);}
unsigned d2smm_qol_effect_end(){return combat.effectEnd();}
unsigned d2smm_qol_query_mode(unsigned kind){return static_cast<unsigned>(combat.queryMode(static_cast<qol::QueryKind>(kind)));}
void d2smm_qol_tint_reset(){combat.reset();}
unsigned d2smm_qol_tint_open(double color,double now){return combat.open(color,now);}
int d2smm_qol_tint(unsigned handle,double color,double now){return combat.tint(handle,color,now);}
void d2smm_qol_tint_release(unsigned handle){combat.release(handle);}
static characters::perfection::Score perfection;
static char perfectionNames[2][128];
void d2smm_perfection_begin(unsigned available){perfection.begin(available!=0);}
void d2smm_perfection_property(double low,double high,double parameter){perfection.property(low,high,parameter);}
char* d2smm_perfection_input(unsigned index){return index<2?perfectionNames[index]:nullptr;}
void d2smm_perfection_member(unsigned expectedLength,unsigned actualLength,unsigned function,double value,double parameter){perfection.member(perfectionNames[0],expectedLength,perfectionNames[1],actualLength,function,value,parameter);}
void d2smm_perfection_end(){perfection.endProperty();}
int d2smm_perfection_finish(){return perfection.finish();}
unsigned d2smm_perfection_rolls(){return perfection.rolls();}
double d2smm_perfection_value(unsigned index){return perfection.value(index);}
void d2smm_perfection_observe(unsigned length){perfection.observe(perfectionNames[0],length);}
void d2smm_perfection_armor(unsigned bounds,double low,double high,double value,unsigned ethereal){perfection.armor(bounds!=0,low,high,value,ethereal!=0);}
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
