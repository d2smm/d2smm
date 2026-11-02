#include "badges.hpp"
#include "qol.hpp"
#include "combat.hpp"
#include "perfection.hpp"
extern "C" {
__attribute__((import_module("game"),import_name("point_open"))) unsigned host_point_open(double,double);
__attribute__((import_module("game"),import_name("segment_clear"))) unsigned host_segment_clear(double,double,double,double);
}
namespace d2smm {
namespace {badges::Ledger ledger;char input[3][badges::keyLimit+1];unsigned lengths[3];
bool decode(badges::Mark& m){return badges::key(input[0],lengths[0],m.source)&&badges::key(input[1],lengths[1],m.target)&&badges::key(input[2],lengths[2],m.context);}}
extern "C" {
static qol::Combat combat;
static bool terrainPoint(void*,qol::NavPoint p){return host_point_open(p.x,p.y)!=0;}
static bool terrainSegment(void*,qol::NavPoint a,qol::NavPoint b){return host_segment_clear(a.x,a.y,b.x,b.y)!=0;}
void d2smm_qol_combat_configure(unsigned enabled,unsigned hideHitStars){combat.configure(enabled==1,hideHitStars==1);}
unsigned d2smm_qol_effect_visible(unsigned kind){return combat.effectVisible(kind);}
unsigned d2smm_qol_effect_profile(double life,double c0,double c1,double c2,double a0,double a1,double a2,double width){return combat.effectProfile(life,c0,c1,c2,a0,a1,a2,width);}
void d2smm_qol_effect_begin(double life,unsigned additive,unsigned count){combat.effectBegin(life,additive!=0,count);}
void d2smm_qol_effect_part(unsigned index,unsigned kind,double color,double alpha,double width,unsigned polygons,unsigned points,unsigned circles,unsigned moves,unsigned other){combat.effectPart(index,kind,color,alpha,width,polygons,points,circles,moves,other);}
unsigned d2smm_qol_effect_end(){return combat.effectEnd();}
unsigned d2smm_qol_motion_frame(unsigned walls,double now,double dt){return combat.frame(walls!=0,now,dt,{nullptr,terrainPoint,terrainSegment});}
unsigned d2smm_qol_motion_observe(unsigned handle,double x,double y,double radius,unsigned melee,unsigned ranged,unsigned special,unsigned target,double tx,double ty,double tr,double life,unsigned animated,double speed,double animation,double facing,double directions){return combat.observe(handle,x,y,radius,melee,ranged,special,target,tx,ty,tr,life,animated,speed,animation,facing,directions);}
unsigned d2smm_qol_motion_prop(double x,double y,double radius){return combat.scenery(x,y,radius);}
unsigned d2smm_qol_motion_begin(unsigned handle,double x,double y,unsigned target,double tx,double ty,double radius,double life,double reach){return combat.beginMotion(handle,x,y,target,tx,ty,radius,life,reach);}
unsigned d2smm_qol_motion_neighbor(unsigned handle,unsigned other,double x,double y,double radius,unsigned same,unsigned dead,unsigned nativeDisplaced,unsigned animated){return combat.neighbor(handle,other,x,y,radius,same!=0,dead!=0,nativeDisplaced!=0,animated!=0);}
unsigned d2smm_qol_motion_needs_route(unsigned handle){return combat.needsRoute(handle);}
unsigned d2smm_qol_motion_geometry_begin(unsigned handle){return combat.geometryBegin(handle);}
unsigned d2smm_qol_motion_pose(unsigned handle,double x,double y,double radius,unsigned dead,unsigned animated){return combat.pose(handle,x,y,radius,dead!=0,animated!=0);}
void d2smm_qol_motion_resolve(unsigned handle){combat.resolve(handle);}
unsigned d2smm_qol_motion_guided(unsigned handle){auto* m=combat.motion(handle);return m&&m->guided&&!m->idle;}
double d2smm_qol_motion_velocity(unsigned handle,unsigned axis){auto* m=combat.motion(handle);if(!m||m->dt<=0)return 0;return (axis?m->dy:m->dx)/m->dt;}
double d2smm_qol_motion_walk_phase(unsigned handle,double direction,double directions){auto* m=combat.motion(handle);return m?m->walkPhase(direction,directions):-1;}
unsigned d2smm_qol_navigation_count(unsigned status){return combat.navigationCount(status);}
double d2smm_qol_motion_coordinate(unsigned handle,unsigned axis){auto* m=combat.motion(handle);return m?m->coordinate(axis!=0):0;}
unsigned d2smm_qol_motion_idle(unsigned handle,unsigned animated){auto* m=combat.motion(handle);return m&&m->idle&&!animated;}
void d2smm_qol_motion_finish(unsigned handle){if(auto* m=combat.motion(handle))m->finish();}
unsigned d2smm_qol_query_allowed(unsigned kind){return combat.allows(static_cast<qol::QueryKind>(kind));}
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
