const clone=o=>JSON.parse(JSON.stringify(o));
function merge(a,b){for(const k in b){if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==="object")merge(a[k],b[k]);else a[k]=b[k];}return a}
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
let B=clone(DEF);
/* баланс с сервера (админка): частичные правки поверх DEF, применяются только между боями */
let SRV_BAL={version:0,data:{}};
function safeMerge(a,b){for(const k in b){if(k==="__proto__"||k==="constructor"||k==="prototype")continue;if(!(k in a))continue;const v=b[k];
  if(v&&typeof v==="object"&&!Array.isArray(v)&&a[k]&&typeof a[k]==="object")safeMerge(a[k],v);else if(typeof v===typeof a[k]||Array.isArray(v)&&Array.isArray(a[k]))a[k]=v;}return a}
let SRV_PENDING=false;
function applyServerBalance(){if(typeof state!=="undefined"&&(state==="fight"||state==="countdown")){SRV_PENDING=true;return}SRV_PENDING=false;B=safeMerge(clone(DEF),SRV_BAL.data||{});}
function loadServerBalance(){if(location.protocol==="file:")return;fetch("https://wowarena92.duckdns.org/arena/api/balance",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{
  if(!j||typeof j.version!=="number"||j.version===SRV_BAL.version)return;SRV_BAL=j;applyServerBalance();}).catch(()=>{});}
loadServerBalance();setInterval(loadServerBalance,60000);
/* «я онлайн» раз в 30 с: админка считает, сколько людей сейчас в игре, в бою и в коопе. Только случайный номер вкладки, без данных игрока */
const ONLINE_SID=Math.random().toString(36).slice(2,12)+Math.random().toString(36).slice(2,8);
function pingOnline(){if(location.protocol==="file:")return;try{fetch("https://wowarena92.duckdns.org/arena/api/ping",{method:"POST",body:JSON.stringify({sid:ONLINE_SID,fight:state==="fight"||state==="countdown",net:!!(typeof NET!=="undefined"&&NET.role)})}).catch(()=>{});}catch(e){}}
setTimeout(pingOnline,3000);setInterval(pingOnline,30000);

const CLASSES=["warrior","mage","rogue","paladin","priest"];
const MELEE={warrior:true,rogue:true,paladin:true};
const SCHOOL_HEX={phys:0xddd3bd,frost:0x86ccff,fire:0xff8c3f,arcane:0xc792ff,holy:0xffe9a0,shadow:0x9b6bff,nature:0x7bd35a};
const SCHOOL_NAME={phys:"Физический",frost:"Лёд",fire:"Огонь",arcane:"Тайная магия",holy:"Свет",shadow:"Тьма",nature:"Природа"};
const RES_NAME={rage:"ярости",mana:"маны",energy:"энергии"};
const RES_COLOR={rage:"#e00000",mana:"#1a3cff",energy:"#ffe000"};
const roll=r=>r[0]+Math.random()*(r[1]-r[0]);
const ICON=/*ICONMAP*/;const GAME_VER="/*BUILDVER*/",APP_VER="/*APPVER*/";
const ICON_COLS=16;
function iconBg(key,size){const i=ICON[key]??ICON.a_q;return `background-size:${ICON_COLS*size}px auto;background-position:${-(i%ICON_COLS)*size}px ${-Math.floor(i/ICON_COLS)*size}px`}

/* ================= ТАЛАНТЫ ================= */
function talDef(cls,id){for(const k in B.talents[cls]){const d=B.talents[cls][k].list[id];if(d)return d}return null}
const rk=(u,id)=>(u.talents&&u.talents[id])||0;
const talVal=(d,r)=>!r?0:Array.isArray(d.v)?d.v[Math.min(r,d.v.length)-1]:r*d.v;
function tv(u,id){const r=rk(u,id);if(!r)return 0;const d=talDef(u.cls,id);return d?talVal(d,r):0}
function treePts(cls,tal,tree){let s=0;for(const id in B.talents[cls][tree].list)s+=tal[id]||0;return s}
function totalPts(tal){let s=0;for(const k in tal)s+=tal[k];return s}
function treeOf(cls,id){for(const k in B.talents[cls])if(B.talents[cls][k].list[id])return k}
function validTree(cls,tal,tree){const L=B.talents[cls][tree].list;
  for(const id in L){if(!(tal[id]>0))continue;const t=L[id].t;let below=0;for(const j in L)if(L[j].t<t)below+=tal[j]||0;if(below<(t-1)*5)return false}return true}
function canAdd(cls,tal,id){const d=talDef(cls,id),tree=treeOf(cls,id);if(!d)return false;
  return totalPts(tal)<B.general.maxTalentPoints&&(tal[id]||0)<d.max&&treePts(cls,tal,tree)>=(d.t-1)*5&&(!d.req||(tal[d.req]||0)>=d.reqr)}
function canRemove(cls,tal,id){if(!(tal[id]>0))return false;const c={...tal};c[id]--;const L=B.talents[cls][treeOf(cls,id)].list;
  for(const j in L)if(L[j].req===id&&(c[j]||0)>0&&c[id]<L[j].reqr)return false;
  return validTree(cls,c,treeOf(cls,id))}
/* сохранённые раскладки старых версий: убираем исчезнувшие таланты, неверную ветку сбрасываем */
function cleanTal(cls,tal){const out={};if(!tal||typeof tal!=="object")return out;for(const id in tal){const v=Math.floor(Number(tal[id]));if(talDef(cls,id)&&v>0)out[id]=Math.min(v,talDef(cls,id).max);}
  let n=0;for(const k in out)n+=out[k];if(n>B.general.maxTalentPoints)return {};
  for(const tk in B.talents[cls]){if(!validTree(cls,out,tk))return {};const L=B.talents[cls][tk].list;for(const id in L)if(out[id]&&L[id].req&&(out[L[id].req]||0)<L[id].reqr)return {};}
  return out}
function autoBuild(cls,order){const tal={};for(const [id,n] of order)for(let i=0;i<n;i++)if(canAdd(cls,tal,id))tal[id]=(tal[id]||0)+1;return tal}
/* общие эффекты талантов (поле k): шанс крита, урон, здоровье и т.д. — считаются один раз на раунд */
function buildK(u){
  const K={crit:0,dmg:0,school:{},ap:{},critMult:0,hp:0,res:0,resPct:0,regen:0,heal:0,taken:0,phys:0,dodge:0,block:0,speed:0,ccDur:0,costPct:0,add:[]};
  const T=B.talents[u.cls];
  for(const tk in T)for(const id in T[tk].list){const d=T[tk].list[id],r=u.talents[id]||0;if(!r||!d.k)continue;const x=talVal(d,r);
    if(d.k==="school")K.school[d.s]=(K.school[d.s]||0)+x;else if(d.k==="ap")K.ap[d.a]=(K.ap[d.a]||0)+x;
    else if(d.k==="add")K.add.push([d.a,d.f,(d.sg||1)*x]);else if(d.k in K)K[d.k]+=x;}
  return K;
}
const PRESETS={
  warrior:{
    "Оружие":[["improvedHeroicStrike", 3], ["improvedRend", 3], ["tacticalMastery", 5], ["improvedCharge", 2], ["improvedOverpower", 2], ["angerManagement", 1], ["deepWounds", 3], ["twoHandedWeaponSpecialization", 5], ["impale", 2], ["axeSpecialization", 5], ["sweepingStrikes", 1], ["improvedHamstring", 3], ["mortalStrike", 1], ["cruelty", 5], ["unbridledWrath", 5], ["improvedBattleShout", 5], ["piercingHowl", 1], ["improvedDemoralizingShout", 5]],
    "Неистовство":[["cruelty", 5], ["unbridledWrath", 5], ["improvedBattleShout", 5], ["piercingHowl", 1], ["improvedDemoralizingShout", 5], ["enrage", 5], ["improvedExecute", 2], ["deathWish", 1], ["flurry", 5], ["improvedBerserkerRage", 2], ["bloodCraze", 3], ["bloodthirst", 1], ["improvedHeroicStrike", 3], ["improvedRend", 3], ["tacticalMastery", 5]],
    "Защита":[["shieldSpecialization", 5], ["anticipation", 5], ["toughness", 5], ["improvedBloodrage", 2], ["lastStand", 1], ["improvedShieldBlock", 3], ["improvedRevenge", 3], ["improvedShieldBash", 2], ["improvedShieldWall", 2], ["defiance", 5], ["concussionBlow", 1], ["oneHandedWeaponSpecialization", 5], ["shieldSlam", 1], ["ironWill", 5], ["improvedHeroicStrike", 3], ["tacticalMastery", 5], ["deflection", 5], ["improvedCharge", 2]]
  },
  mage:{
    "Лёд":[["arcaneFocus", 5], ["clearcast", 5], ["arcaneResilience", 1], ["impExplosion", 3], ["impMissiles", 1], ["impCounter", 2], ["impFrostbolt", 5], ["elemPrecision", 3], ["iceShards", 5], ["frostbite", 3], ["impNova", 2], ["permafrost", 2], ["piercingIce", 3], ["tColdSnap", 1], ["arcticReach", 2], ["shatter", 5], ["tIceBlock", 1], ["wintersChill", 1], ["tIceBarrier", 1]],
    "Огонь":[["arcaneFocus", 5], ["clearcast", 5], ["arcaneResilience", 1], ["impExplosion", 3], ["impMissiles", 1], ["impCounter", 2], ["impFireball", 1], ["impact", 5], ["ignite", 5], ["flameThrowing", 2], ["impFireBlast", 3], ["incinerate", 2], ["tPyroblast", 1], ["burningSoul", 2], ["moe", 3], ["criticalMass", 3], ["tBlastWave", 1], ["firePower", 5], ["tCombustion", 1]],
    "Тайная магия":[["arcaneFocus", 5], ["clearcast", 5], ["arcaneResilience", 1], ["impExplosion", 3], ["impMissiles", 1], ["impCounter", 2], ["meditation", 3], ["tPom", 1], ["arcaneMind", 5], ["instability", 3], ["magicAbsorption", 1], ["tArcanePower", 1], ["impFrostbolt", 5], ["elemPrecision", 3], ["iceShards", 2], ["frostbite", 3], ["impNova", 2], ["tColdSnap", 1], ["piercingIce", 3], ["arcticReach", 1]]
  },
  rogue:{
    "Бой":[["impSinister", 2], ["impGouge", 3], ["rDeflection", 5], ["rPrecision", 5], ["endurance", 2], ["tRiposte", 1], ["impSprint", 2], ["impKick", 2], ["dwSpec", 3], ["tBladeFlurry", 1], ["swordSpec", 4], ["tAdrenaline", 1], ["impEvisc", 3], ["malice", 5], ["ruthless", 3], ["murder", 2], ["relentless", 1], ["lethality", 5], ["vilePoisons", 1]],
    "Ликвидация":[["impEvisc", 3], ["malice", 5], ["ruthless", 3], ["murder", 2], ["impSlice", 2], ["relentless", 1], ["lethality", 5], ["poison", 3], ["tColdBlood", 1], ["impKidney", 3], ["sealFate", 5], ["vigor", 1], ["impSinister", 2], ["impGouge", 3], ["rPrecision", 5], ["lightReflex", 3], ["endurance", 2], ["impKick", 2]],
    "Скрытность":[["opportunity", 5], ["elusiveness", 2], ["camouflage", 3], ["initiative", 3], ["tGhostly", 1], ["impAmbush", 1], ["serrated", 3], ["setup", 2], ["tPrep", 1], ["dirtyDeeds", 2], ["tHemo", 1], ["heightened", 1], ["deadliness", 5], ["tPremed", 1], ["impSinister", 2], ["impGouge", 3], ["rPrecision", 5], ["rDeflection", 1], ["endurance", 2], ["impSprint", 2], ["impKick", 2], ["malice", 3]]
  },
  paladin:{
    "Свет":[["divineInt", 5], ["spFocus", 5], ["healingLight", 3], ["tConsec", 1], ["unyielding", 2], ["illumination", 5], ["tDivineFavor", 1], ["holyPower", 5], ["tHolyShock", 1], ["impSoR", 5], ["impBoM", 5], ["benediction", 5], ["impJudge", 2], ["pDeflect", 5], ["conviction", 5], ["divStr", 2]],
    "Защита":[["impDevotion", 5], ["redoubt", 5], ["pPrecision", 3], ["guardFavor", 2], ["pTough", 5], ["tKings", 1], ["anticip", 5], ["impHammer", 3], ["tSanct", 1], ["reckoning", 5], ["tHolyShield", 1], ["impBoM", 5], ["benediction", 5], ["impJudge", 2], ["pDeflect", 3]],
    "Воздаяние":[["impBoM", 5], ["benediction", 5], ["impJudge", 2], ["impSotC", 3], ["pDeflect", 5], ["vindication", 3], ["conviction", 5], ["tSoC", 1], ["pursuit", 2], ["eyeForEye", 2], ["pTwoHand", 3], ["tSanctity", 1], ["vengeance", 5], ["tRepentance", 1], ["divStr", 5], ["divineInt", 5], ["spFocus", 1], ["tConsec", 1]]
  },
  priest:{
    "Послушание":[["unbreakableWill", 5], ["improvedPowerWordShield", 3], ["improvedPowerWordFortitude", 2], ["martyrdom", 2], ["innerFocus", 1], ["meditation", 3], ["improvedInnerFire", 3], ["mentalAgility", 5], ["mentalStrength", 5], ["divineSpirit", 1], ["forceOfWill", 5], ["powerInfusion", 1], ["healingFocus", 2], ["improvedRenew", 3], ["holySpecialization", 5], ["spellWarding", 5], ["divineFury", 5]],
    "Свет":[["healingFocus", 2], ["improvedRenew", 3], ["holySpecialization", 5], ["spellWarding", 5], ["divineFury", 5], ["holyNova", 1], ["blessedRecovery", 3], ["inspiration", 3], ["improvedHealing", 3], ["holyReach", 1], ["spiritualHealing", 5], ["searingLight", 2], ["unbreakableWill", 5], ["improvedPowerWordShield", 3], ["improvedPowerWordFortitude", 2], ["martyrdom", 2], ["innerFocus", 1], ["meditation", 3]],
    "Тьма":[["blackout", 5], ["improvedShadowWordPain", 2], ["shadowFocus", 3], ["improvedPsychicScream", 2], ["improvedMindBlast", 5], ["mindFlay", 1], ["shadowReach", 3], ["shadowWeaving", 2], ["silence", 1], ["vampiricEmbrace", 1], ["improvedVampiricEmbrace", 2], ["darkness", 5], ["shadowform", 1], ["unbreakableWill", 5], ["improvedPowerWordShield", 3], ["improvedPowerWordFortitude", 2], ["martyrdom", 2], ["innerFocus", 1], ["meditation", 3], ["improvedInnerFire", 3]]
  }
};
const BOT_PRESET={warrior:"Оружие",mage:"Лёд",rogue:"Бой",paladin:"Воздаяние",priest:"Тьма"};
let myTal={};for(const c of CLASSES)myTal[c]={};
try{const s=JSON.parse(store.get("arena-talents-v1")||"null");if(s)for(const c of CLASSES)if(s[c])myTal[c]=cleanTal(c,s[c]);}catch(e){}
function saveTal(){store.set("arena-talents-v1",JSON.stringify(myTal));}
function buildSummary(cls,tal){return Object.keys(B.talents[cls]).map(k=>treePts(cls,tal,k)).join(" / ")}

/* ================= СПОСОБНОСТИ ================= */
const ab=(cls,id)=>B[cls].abilities[id]||B.common.abilities[id];
function strikeId(u){return rk(u,"mortalStrike")?"mortal":rk(u,"bloodthirst")?"bloodthirst":rk(u,"shieldSlam")?"shieldslam":null}
const CAPS={warrior:[["mortalStrike","mortal"],["bloodthirst","bloodthirst"],["shieldSlam","shieldslam"],["sweepingStrikes","sweeping"],["piercingHowl","howl"],["deathWish","deathwish"],["lastStand","laststand"],["concussionBlow","concussion"]],mage:[["tPom", "pom"], ["tArcanePower", "apower"], ["tPyroblast", "pyroblast"], ["tBlastWave", "blastwave"], ["tCombustion", "combust"], ["tColdSnap", "coldsnap"], ["tIceBlock", "iceblock"], ["tIceBarrier", "barrier"]],rogue:[["tColdBlood", "coldblood"], ["tRiposte", "riposte"], ["tBladeFlurry", "bladeflurry"], ["tAdrenaline", "adrenaline"], ["tGhostly", "ghostly"], ["tPrep", "prep"], ["tHemo", "hemo"], ["tPremed", "premed"]],
  paladin:[["tConsec", "consecration"], ["tDivineFavor", "dfavor"], ["tHolyShock", "holyshock"], ["tHolyShield", "holyshield"], ["tSoC", "sealC"], ["tRepentance", "repentance"]],priest:[["innerFocus", "innerfocus"], ["divineSpirit", "divinespirit"], ["powerInfusion", "pi"], ["holyNova", "holynova"], ["vampiricEmbrace", "vampiric"], ["shadowform", "shadowform"]]};
/* раскладка панелей по умолчанию: 12 ячеек нижней панели и 12 верхней; "cap" — способность вершины ветки */
const BAR_ORDER={
  warrior:["charge","intercept","cap","heroic","overpower","execute","rend","hamstring","pummel","shieldbash","disarm","shout",
           "cleave","slam","whirlwind","sunder","thunderclap","revenge","demoshout","battleshout","shieldblock",
           "battle","defensive","berserker","zerkrage","reckless","retaliation","shieldwall","bloodrage","trinket","food"],
  mage:["frostbolt","fireball","fireblast","scorch","missiles","cone","nova","poly","counter","blink","explosion","cap",
        "flamestrike","blizzard","manashield","frostarmor","evocation","trinket","fireward","frostward","food"],
  rogue:["sinister","eviscerate","kidney","gouge","kick","backstab","slice","rupture","expose","cheapshot","garrote","ambush","sap",
         "stealth","blind","vanish","evasion","sprint","cap","trinket","food"],
  paladin:["judgement","sealR","sealCr","sealJ","hammer","wrath","flashlight","holylight","cap","cleanse","freedom","bubble",
           "bop","dprot","loh","sealL","sealW","bom","bow","sacrifice","trinket","food"],
  priest:["swp","mindblast","flay","smite","holyfire","manaburn","flash","heal","gheal","renew","pws","scream",
          "dispel","silence","prayerheal","cap","fortitude","innerfire","trinket","food"]
};
function abilityList(u){
  const l=[];
  for(const id of BAR_ORDER[u.cls]){
    if(id==="cap"){for(const [t,c] of CAPS[u.cls])if(rk(u,t))l.push(c);}
    else if(id==="flay"){if(rk(u,"mindFlay"))l.push(id);}
    else if(id==="silence"){if(rk(u,"silence"))l.push(id);}
    else l.push(id);
  }
  return l;
}
function eff(u,id){
  const a={...ab(u.cls,id)};
  switch(id){
    case "rend":a.total*=1+tv(u,"improvedRend")/100;break;
    case "cleave":a.bonus*=1+tv(u,"improvedCleave")/100;break;
    case "shieldblock":if(rk(u,"improvedShieldBlock"))a.charges+=1;break;
    case "demoshout":a.ap*=1+tv(u,"improvedDemoralizingShout")/100;a.dur*=1+tv(u,"boomingVoice")/100;a.radius*=1+tv(u,"boomingVoice")/100;break;
    case "battleshout":a.ap*=1+tv(u,"improvedBattleShout")/100;a.dur*=1+tv(u,"boomingVoice")/100;a.radius*=1+tv(u,"boomingVoice")/100;break;
    case "frostbolt":a.cast=Math.max(.5,a.cast-tv(u,"impFrostbolt"));a.range*=1+tv(u,"arcticReach")/100;break;
    case "blizzard":a.range*=1+tv(u,"arcticReach")/100;break;
    case "cone":a.range*=1+tv(u,"arcticReach")/100;break;
    case "nova":a.cd-=tv(u,"impNova");a.radius*=1+tv(u,"arcticReach")/100;break;
    case "fireball":a.cast=Math.max(.5,a.cast-tv(u,"impFireball"));break;
    case "fireblast":a.cd-=tv(u,"impFireBlast");break;
    case "sprint":case "evasion":a.cd-=tv(u,"endurance");break;
    case "vanish":case "blind":a.cd-=tv(u,"elusiveness");break;
    case "stealth":a.cd-=rk(u,"camouflage");break;
    case "cheapshot":case "garrote":a.cost-=tv(u,"dirtyDeeds");break;
    case "bop":a.cd-=tv(u,"guardFavor");break;
    case "smite":case "holyfire":a.cast-=tv(u,"divineFury");a.range*=1+tv(u,"holyReach")/100;break;
    case "heal":case "gheal":a.cast-=tv(u,"divineFury");a.cost*=1-tv(u,"improvedHealing")/100;break;
    case "prayerheal":a.cost*=1-tv(u,"improvedPrayerOfHealing")/100;a.radius*=1+tv(u,"holyReach")/100;break;
    case "holynova":a.radius*=1+tv(u,"holyReach")/100;break;
    case "pws":a.absorb*=1+tv(u,"improvedPowerWordShield")/100;break;
    case "renew":a.heal*=1+tv(u,"improvedRenew")/100;break;
    case "fortitude":a.stamina*=1+tv(u,"improvedPowerWordFortitude")/100;break;
    case "innerfire":a.armor*=1+tv(u,"improvedInnerFire")/100;break;
    case "vampiric":a.pct+=tv(u,"improvedVampiricEmbrace");break;
    case "freedom":a.dur+=3*rk(u,"guardFavor");break;
    case "sealCr":a.ap*=1+tv(u,"impSotC")/100;a.holyBonus*=1+tv(u,"impSotC")/100;
    case "sealR":case "sealJ":case "sealC":case "judgement":a.cost*=1-tv(u,"benediction")/100;break;
  }
  if(u.cls==="mage"){const sc=META[id]&&META[id].school;
    if(sc==="fire"&&a.range)a.range+=tv(u,"flameThrowing");
    if(sc==="frost"&&a.cost)a.cost*=1-tv(u,"frostChanneling")/100;}
  if(u.cls==="priest"){const sc=META[id]&&META[id].school;
    if(sc==="shadow"&&a.range)a.range*=1+tv(u,"shadowReach")/100;
    if(!a.cast&&!a.channel&&a.cost)a.cost*=1-tv(u,"mentalAgility")/100;
    if(a.cost&&has(u,"ifocus")&&id!=="innerfocus")a.cost=0;}
  if(u.K)for(const [aid,f,x] of u.K.add)if(aid===id&&typeof a[f]==="number")a[f]+=x;
  if(a.cd!==undefined)a.cd=Math.max(0,a.cd);if(a.cast!==undefined)a.cast=Math.max(.3,a.cast);
  if(a.cost){if(u.K&&u.K.costPct)a.cost*=1-u.K.costPct/100;a.cost=Math.max(0,Math.round(a.cost));}
  if(a.cost&&u.cls==="mage"){if(has(u,"apower"))a.cost=Math.round(a.cost*(1+ab("mage","apower").costUp/100));if(has(u,"clearcast"))a.cost=0;}
  return a;
}
/* исцеление заклинанием: таланты на силу исцеления, крит ×1.5 */
function healSpell(u,a,id,f){f=f||u;
  let amt=(roll(a.heal)+(B[u.cls].sp||0)*spCoef(u,id))*(1+u.K.heal/100)*(blessOf(u,"kings")?1.03:1);{const pi=aura(u,"pi");if(pi)amt*=1+pi.pct/100;}const df=aura(u,"dfavor");if(df)df.until=0;const crit=!!df||Math.random()*100<critChance(u,"holy",u,{spell:true});
  if(crit)amt*=B.general.spellCritMult;
  heal(f,amt,a.name,crit,u);healFx(f,a.heal[1]>900);if(f!==u){if(inCombat(f))enterCombat(u);log(u,a.name,f);}
  if(crit){if(rk(u,"illumination")&&Math.random()*100<tv(u,"illumination")&&a.cost){u.res=Math.min(u.maxRes,u.res+a.cost);statusText(u,"Озарение","#ffe9a0");}
    if(rk(u,"inspiration")&&f.alive)addAura(f,{type:"inspire",name:"Вдохновение",pct:tv(u,"inspiration"),until:now+15,good:true});}
}
function addCp(u,n){u.cp=Math.min(5,(u.cp||0)+n);}
/* приём серии за попадание; Печать судьбы даёт второй при крите */
function cpBuild(u){if(!u.lastHit.dodged){addCp(u,1);if(u.lastHit.crit&&Math.random()*100<tv(u,"sealFate"))addCp(u,1);}}
function spendCp(u){const c=u.cp||0;u.cp=0;if(c&&rk(u,"relentless")&&Math.random()*100<tv(u,"relentless")*c)u.res=Math.min(u.maxRes,u.res+25);if(rk(u,"ruthless")&&Math.random()*100<tv(u,"ruthless"))u.cp=1;return c}
/* яды разбойника: основная рука срабатывает от приёмов и чётных автоатак, левая — от нечётных */
function poisonProc(u,t,slot){
  const P=B.rogue.poisons,k=slot==="oh"?u.poisonOH:u.poisonMH,p=P[k];
  if(!p||!t.alive||isImmune(t))return;
  if(Math.random()*100>=p.chance+tv(u,"poison"))return;
  if(k==="crip")slowAura(u,t,p.name,p.slow,p.dur,"poison");
  else if(k==="numb")addAura(t,{type:"numb",name:p.name,pct:p.pct,until:now+p.dur,dt:"poison"});
  else{const ex=t.auras.find(a=>a.name===p.name&&a.until>now),st=ex?Math.min(p.stacks,ex.stacks+1):1;
    addAura(t,{type:"dot",name:p.name,src:u,school:"nature",per:p.total*(1+tv(u,"vilePoisons")/100)/p.dur*3*st,period:3,stacks:st,next:ex?ex.next:now+3,until:now+p.dur+.05,dt:"poison"});}
}
function rogueHit(u,t,slot){if(u.cls==="rogue"&&u.lastHit.amt!==undefined&&!u.lastHit.dodged)poisonProc(u,t,slot||"mh");}
/* эффект охлаждения мага: Вечная мерзлота удлиняет и усиливает, Обморожение может заморозить */
function chill(src,t,name,pct,dur,icd){if(!t.alive||isImmune(t))return;const pf=rk(src,"permafrost");if(pf){dur+=pf;pct+=[4,7,10][pf-1];}
  slowAura(src,t,name,pct,dur,"magic");if(!(icd&&(src.fbIcd||0)>now)&&Math.random()*100<tv(src,"frostbite")&&(!icd||(src.fbIcd=now+15)))cc(src,t,"root",5,"Обморожение",{noDr:true});}
/* сопротивление заклинанию: базово 4% против игрока своего уровня, таланты на меткость снижают */
function spellHitBonus(s,school){if(s.cls==="priest"&&school==="shadow")return tv(s,"shadowFocus");if(s.cls==="mage")return school==="arcane"?tv(s,"arcaneFocus"):(school==="fire"||school==="frost")?tv(s,"elemPrecision"):0;return 0}
function spellResisted(src,t,school){
  if(school==="phys"||src===t||src.team===t.team)return false;
  if(Math.random()*100>=Math.max(0,B.general.spellMiss-spellHitBonus(src,school)+tv(t,"heightened")))return false;
  if(rk(t,"setup")&&Math.random()*100<tv(t,"setup"))addCp(t,1);
  src.lastHit={resisted:true};combatMiss(src,t,"Сопротивление");logRaw(`<b>${src.name}</b>: ${t.name} сопротивляется`);
  if(rk(t,"magicAbsorption")&&t.resType==="mana")t.res=Math.min(t.maxRes,t.res+t.maxRes*tv(t,"magicAbsorption")/100);
  return true}
function slowAura(src,t,name,pct,dur,dt){if(!t.alive||isImmune(t))return;addAura(t,{type:"slow",name,pct,until:now+dur,dt:dt||"magic",phys:dt==="none"});enterCombat(src,t);}
/* выбор стойки воина: смена сжигает ярость сверх порога */
function setStance(u,s){
  if(u.stance===s)return;u.stance=s;u.res=Math.min(u.res,B.warrior.stanceRage+tv(u,"tacticalMastery"));
  for(const k of ["battle","defensive","berserker"])u.cds[k]=now+1;
  statusText(u,ab("warrior",s).name,"#ffd100");
}
/* сила атаки воина: базовая из класса плюс крики. Урон автоатаки в swing.dmg уже учитывает базовую силу атаки */
function apDelta(u){let d=0;for(const x of u.auras)if(x.until>now&&(x.type==="bshout"||x.type==="demo"))d+=x.type==="bshout"?x.ap:-x.ap;return d}
function apOf(u){return (B[u.cls].ap||0)+apDelta(u)}
function swingDmg(u){const sw=B[u.cls].swing;return Math.max(1,roll(sw.dmg)+apDelta(u)/14*sw.interval)}
/* урон оружия для приёмов; нормализованные (Смертельный удар, Превосходство, Вихрь) считают силу атаки по скорости 3,3 */
function wpn(u,norm){const sw=B[u.cls].swing;return swingDmg(u)+(norm?(B[u.cls].ap||0)/14*(3.3-sw.interval):0)}
function warShared(u,a){for(const k of ["reckless","shieldwall","retaliation"])u.cds[k]=Math.max(u.cds[k]||0,now+a.cd);}
const STANCE_NAME={battle:"Боевая",defensive:"Защитная",berserker:"Берсерк"};
const DISPEL_COL={magic:"#3399ff",poison:"#009900",disease:"#996600",curse:"#9900ff",none:"#cc0000"};
const CC_DT={"Превращение":"magic","Покаяние":"magic","Молот правосудия":"magic","Ментальный крик":"magic","Кольцо льда":"magic","Обморожение":"magic",
  "Сотрясение":"magic","Затмение":"magic","Печать справедливости":"magic"};

const META={
  /* общие */
  trinket:{school:"phys",target:false,gcd:false,freeCC:["stun","incap","fear","silence"],keepStealth:true,
    desc:a=>`Снимает оглушение, страх, превращение, обездвиживание и замедление. Работает под контролем, не тратит ГКД.`,
    exec(u,t,a){const n=u.auras.length;u.auras=u.auras.filter(x=>!["stun","incap","fear","root","slow"].includes(x.type));burstFx(u.pos,0xffe27a);log(u,a.name+(n>u.auras.length?"":" — снимать нечего"));}},
  food:{school:"phys",target:false,ooc:true,noCombat:true,
    desc:a=>`Только вне боя, ${a.charges} раза за бой. Сесть и восстанавливать по ${a.hp}% здоровья и маны в секунду до ${a.dur} с. Движение или урон прерывают.`,
    exec(u,t,a){u.foodUsed=(u.foodUsed||0)+1;u.eating={until:now+a.dur};addAura(u,{type:"eat",name:a.name,until:now+a.dur,good:true});log(u,a.name);}},
  /* воин: стойки */
  battle:{school:"phys",target:false,gcd:false,stanceSwap:true,noCombat:true,
    desc:a=>`Обычная стойка. Открывает Рывок, Превосходство, Кровопускание и Удар грома. При смене стойки ярость сгорает (Тактическое превосходство сохраняет часть).`,
    exec(u,t,a){setStance(u,"battle");}},
  defensive:{school:"phys",target:false,gcd:false,stanceSwap:true,noCombat:true,
    desc:a=>`Получаемый урон −${a.taken}%, ваш урон −${a.dealt}%. Открывает Обезоруживание, Ответный удар, Блок щитом и Глухую оборону.`,
    exec(u,t,a){setStance(u,"defensive");}},
  berserker:{school:"phys",target:false,gcd:false,stanceSwap:true,noCombat:true,
    desc:a=>`Шанс крита +${a.crit}%, получаемый урон +${a.taken}%. Открывает Перехват, Зуботычину, Вихрь и Ярость берсерка.`,
    exec(u,t,a){setStance(u,"berserker");}},
  charge:{abbr:"Рв",school:"phys",target:true,gcd:false,st:["battle"],ooc:true,
    desc:a=>`Только вне боя. Бросок к цели на ${a.minRange}–${a.range} м, оглушение на ${a.stun} с и ${a.rageGain} ярости.`,
    exec(u,t,a){u.charging={t,until:now+1.4,stun:a.stun,name:"Оглушение (Рывок)"};u.res=Math.min(u.maxRes,u.res+a.rageGain);log(u,a.name);}},
  intercept:{school:"phys",target:true,gcd:false,st:["berserker"],
    desc:a=>`Бросок к цели на ${a.minRange}–${a.range} м прямо в бою: ${a.dmg} урона и оглушение на ${a.stun} с.`,
    exec(u,t,a){u.charging={t,until:now+1.4,stun:a.stun,name:"Перехват",dmg:a.dmg};log(u,a.name);}},
  mortal:{school:"phys",target:true,cap:true,
    desc:a=>`Урон оружия + ${a.bonus}, исцеление цели снижено на ${a.healReduce}% на ${a.healDur} с.`,
    exec(u,t,a){swingFx(u);damage(u,t,wpn(u,1)+a.bonus,a.name,"phys",{melee:true,id:"mortal",ability:true});if(t.alive&&!u.lastHit.dodged)addAura(t,{type:"healred",name:"Смертельная рана",pct:a.healReduce,until:now+a.healDur,dt:"none"});}},
  bloodthirst:{school:"phys",target:true,cap:true,
    desc:a=>`Урон, равный ${a.apPct}% силы атаки (${Math.round(apOf(player||{cls:"warrior",auras:[]})*a.apPct/100)}). Следующие ${a.healCharges} попаданий за ${a.healDur} с лечат вас на ${a.healHit}.`,
    exec(u,t,a){swingFx(u);damage(u,t,apOf(u)*a.apPct/100,a.name,"phys",{melee:true,id:"bloodthirst",ability:true});if(!u.lastHit.dodged)addAura(u,{type:"btheal",name:a.name,per:a.healHit,charges:a.healCharges,until:now+a.healDur,good:true});}},
  shieldslam:{school:"phys",target:true,cap:true,
    desc:a=>`${a.dmg[0]}–${a.dmg[1]} урона щитом и с шансом ${a.dispel}% снимает с цели один магический эффект.`,
    exec(u,t,a){swingFx(u,"shieldbash");damage(u,t,roll(a.dmg),a.name,"phys",{melee:true,id:"shieldslam",ability:true});
      if(t.alive&&!u.lastHit.dodged&&Math.random()*100<a.dispel){const i=t.auras.findIndex(x=>x.good&&x.mb&&x.until>now&&x.until!==Infinity);if(i>=0){statusText(t,"Рассеяно: "+t.auras[i].name,"#cfd6df");t.auras.splice(i,1);}}}},
  heroic:{school:"phys",target:true,gcd:false,costOnHit:true,
    desc:a=>`Следующая автоатака наносит на ${a.bonus} урона больше и не даёт ярости. Ярость (${a.cost}) тратится при ударе.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="hsq");addAura(u,{type:"hsq",id:"heroic",name:a.name,cost:a.cost,bonus:a.bonus,until:now+6,good:true});}},
  cleave:{school:"phys",target:true,gcd:false,costOnHit:true,
    desc:a=>`Следующая автоатака бьёт до ${a.targets} врагов рядом с уроном оружия + ${Math.round(a.bonus)} и не даёт ярости. Ярость (${a.cost}) тратится при ударе.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="hsq");addAura(u,{type:"hsq",id:"cleave",name:a.name,cost:a.cost,bonus:a.bonus,targets:a.targets,until:now+6,good:true});}},
  overpower:{school:"phys",target:true,st:["battle"],
    desc:a=>`Доступно ${a.window} с после того, как цель уклонилась. Урон оружия + ${a.bonus}, от удара нельзя уклониться, парировать или заблокировать.`,
    exec(u,t,a){u.opUntil=0;swingFx(u,"special");damage(u,t,wpn(u,1)+a.bonus,a.name,"phys",{melee:true,id:"overpower",ability:true,noDodge:true,noBlock:true});}},
  execute:{school:"phys",target:true,st:["battle","berserker"],
    desc:a=>`Только по цели ниже ${a.hp}% здоровья. ${a.base} урона и ещё ${a.perRage} за каждую оставшуюся единицу ярости. Тратит всю ярость.`,
    exec(u,t,a){const extra=Math.floor(u.res);u.res=0;swingFx(u,"special");damage(u,t,a.base+a.perRage*extra,a.name,"phys",{melee:true,id:"execute",ability:true});}},
  slam:{school:"phys",target:true,
    desc:a=>`Подготовка ${a.cast.toFixed(1)} с. Урон оружия + ${a.bonus}. Сбрасывает таймер автоатаки.`,
    exec(u,t,a){swingFx(u,"special");damage(u,t,wpn(u)+a.bonus,a.name,"phys",{melee:true,id:"slam",ability:true});u.swingAt=now+B.warrior.swing.interval;}},
  whirlwind:{school:"phys",target:false,hostile:true,st:["berserker"],
    desc:a=>`Удар оружием по ${a.targets} ближайшим врагам в радиусе ${a.radius} м.`,
    exec(u,t,a){swingFx(u,"special");novaFx(u.pos,a.radius,0xd8d8d8);log(u,a.name);for(const e of foes(u).filter(e=>e.alive&&!stealthed(e)&&dist(u,e)<=a.radius).sort((x,y)=>dist(u,x)-dist(u,y)).slice(0,a.targets))damage(u,e,wpn(u,1),a.name,"phys",{melee:true,id:"whirlwind",ability:true});}},
  rend:{school:"phys",target:true,st:["battle","defensive"],
    desc:a=>`Кровотечение: ${Math.round(a.total)} урона за ${a.dur} с.`,
    exec(u,t,a){swingFx(u);if(Math.random()*100<dodgeChance(t)){u.lastHit={dodged:true};combatMiss(u,t,"Уклонение");u.opUntil=now+ab("warrior","overpower").window;return}
      addDot(t,u,a.name,a.total*dmgMult(u,"phys",{melee:true}),a.dur,"phys");log(u,a.name,t);}},
  hamstring:{school:"phys",target:true,st:["battle","berserker"],
    desc:a=>`${a.dmg} урона и замедление цели на ${a.slow}% на ${a.dur} с.`,
    exec(u,t,a){swingFx(u);damage(u,t,a.dmg,a.name,"phys",{melee:true,id:"hamstring",ability:true});if(!t.alive||u.lastHit.dodged||isImmune(t))return;slowAura(u,t,a.name,a.slow,a.dur,"none");
      if(Math.random()*100<tv(u,"improvedHamstring"))cc(u,t,"root",5,"Улучшенное подрезание",{noDr:true});}},
  sunder:{school:"phys",target:true,
    desc:a=>`Броня цели −${a.armor} на ${a.dur} с, до ${a.stacks} раз.`,
    exec(u,t,a){swingFx(u);if(Math.random()*100<dodgeChance(t)){u.lastHit={dodged:true};combatMiss(u,t,"Уклонение");u.opUntil=now+ab("warrior","overpower").window;return}
      const ex=aura(t,"sunder"),n=ex?Math.min(a.stacks,ex.stacks+1):1;addAura(t,{type:"sunder",name:a.name,stacks:n,armor:a.armor,until:now+a.dur,dt:"none"});enterCombat(u,t);log(u,a.name+" ×"+n,t);}},
  thunderclap:{school:"phys",target:false,hostile:true,st:["battle"],
    desc:a=>`${a.dmg} урона до ${a.targets} врагам в радиусе ${a.radius} м, их атаки на ${a.dur} с медленнее на ${a.slow}%.`,
    exec(u,t,a){roarFx(u);novaFx(u.pos,a.radius,0xc8d8ff);log(u,a.name);for(const e of foes(u).filter(e=>e.alive&&dist(u,e)<=a.radius).slice(0,a.targets)){damage(u,e,a.dmg,a.name,"phys",{id:"thunderclap",noCrit:false});if(e.alive&&!isImmune(e))addAura(e,{type:"tclap",name:a.name,pct:a.slow,until:now+a.dur,dt:"none"});}}},
  revenge:{school:"phys",target:true,st:["defensive"],
    desc:a=>`Доступно ${a.window} с после вашего блока, уклонения или парирования. ${a.dmg[0]}–${a.dmg[1]} урона.`,
    exec(u,t,a){u.revUntil=0;swingFx(u,"special");damage(u,t,roll(a.dmg),a.name,"phys",{melee:true,id:"revenge",ability:true});
      if(t.alive&&!u.lastHit.dodged&&Math.random()*100<tv(u,"improvedRevenge"))cc(u,t,"stun",3,"Улучшенный ответный удар",{drc:"rstun"});}},
  pummel:{school:"phys",target:true,st:["berserker"],
    desc:a=>`${a.dmg} урона, прерывает заклинание и блокирует его школу на ${a.lockout} с.`,
    exec(u,t,a){swingFx(u,"kick");interrupt(u,t,a);damage(u,t,a.dmg,a.name,"phys",{melee:true,id:"pummel",noDodge:true});u.cds.shieldbash=Math.max(u.cds.shieldbash||0,now+6);}},
  shieldbash:{school:"phys",target:true,st:["battle","defensive"],
    desc:a=>`Удар щитом: ${a.dmg} урона, прерывает заклинание и блокирует его школу на ${a.lockout} с.`,
    exec(u,t,a){swingFx(u,"shieldbash");interrupt(u,t,a);damage(u,t,a.dmg,a.name,"phys",{melee:true,id:"shieldbash",noDodge:true});u.cds.pummel=Math.max(u.cds.pummel||0,now+6);
      if(t.alive&&!isImmune(t)&&Math.random()*100<tv(u,"improvedShieldBash"))addAura(t,{type:"silence",name:"Улучшенный удар щитом",until:now+3,dt:"none"});}},
  disarm:{school:"phys",target:true,st:["defensive"],
    desc:a=>`${a.dur} с без оружия: автоатака и физические удары цели слабее на ${a.pct}%.`,
    exec(u,t,a){swingFx(u);addAura(t,{type:"disarm",name:a.name,pct:a.pct,until:now+a.dur,dt:"none"});statusText(t,a.name,"#ffd100");log(u,a.name,t);}},
  shout:{school:"phys",target:false,hostile:true,
    desc:a=>`Страх на ${a.dur} с у врагов в радиусе ${a.radius} м.`,
    exec(u,t,a){roarFx(u);novaFx(u.pos,a.radius,0xff6a3a);log(u,a.name);for(const t of foes(u))if(dist(u,t)<=a.radius)cc(u,t,"fear",a.dur,a.name);}},
  demoshout:{school:"phys",target:false,hostile:true,
    desc:a=>`Сила атаки врагов в радиусе ${a.radius.toFixed(0)} м −${Math.round(a.ap)} на ${a.dur.toFixed(0)} с.`,
    exec(u,t,a){roarFx(u);novaFx(u.pos,a.radius,0xb04020);log(u,a.name);for(const e of foes(u))if(e.alive&&dist(u,e)<=a.radius&&!isImmune(e)){addAura(e,{type:"demo",name:a.name,ap:a.ap,until:now+a.dur,dt:"none"});enterCombat(u,e);}}},
  battleshout:{school:"phys",target:false,noCombat:true,
    desc:a=>`Сила атаки группы в радиусе ${a.radius.toFixed(0)} м +${Math.round(a.ap)} на ${(a.dur/60).toFixed(0)} мин.`,
    exec(u,t,a){roarFx(u);log(u,a.name);for(const f of units)if(f.alive&&f.team===u.team&&dist(u,f)<=a.radius)addAura(f,{type:"bshout",name:a.name,ap:a.ap,until:now+a.dur,good:true});}},
  howl:{school:"phys",target:false,hostile:true,
    desc:a=>`Замедляет врагов в радиусе ${a.radius} м на ${a.slow}% на ${a.dur} с.`,
    exec(u,t,a){roarFx(u);novaFx(u.pos,a.radius,0xd0d0ff);log(u,a.name);for(const e of foes(u))if(e.alive&&dist(u,e)<=a.radius)slowAura(u,e,a.name,a.slow,a.dur,"none");}},
  concussion:{school:"phys",target:true,
    desc:a=>`Оглушает цель на ${a.stun} с.`,
    exec(u,t,a){swingFx(u,"special");if(Math.random()*100<dodgeChance(t)){u.lastHit={dodged:true};combatMiss(u,t,"Уклонение");u.opUntil=now+ab("warrior","overpower").window;return}cc(u,t,"stun",a.stun,a.name);}},
  zerkrage:{school:"phys",target:false,st:["berserker"],freeCC:["fear","incap"],
    desc:a=>`Снимает страх и выведение из строя и защищает от них ${a.dur} с. Полученный урон даёт больше ярости.${a.rage?` Сразу ${a.rage} ярости.`:""}`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="fear"&&x.type!=="incap");addAura(u,{type:"zerk",name:a.name,rt:a.rageTaken,until:now+a.dur,good:true});u.res=Math.min(u.maxRes,u.res+a.rage);roarFx(u);log(u,a.name);}},
  reckless:{school:"phys",target:false,st:["berserker"],
    desc:a=>`${a.dur} с: шанс крита +${a.crit}%, получаемый урон +${a.taken}%, иммунитет к страху. Общее восстановление с Глухой обороной и Возмездием.`,
    exec(u,t,a){warShared(u,a);u.auras=u.auras.filter(x=>x.type!=="fear");addAura(u,{type:"reckless",name:a.name,crit:a.crit,taken:a.taken,until:now+a.dur,good:true});roarFx(u);log(u,a.name);}},
  retaliation:{school:"phys",target:false,st:["battle"],
    desc:a=>`${a.dur} с: отвечает ударом оружия на каждую атаку ближнего боя спереди, до ${a.charges} раз. Общее восстановление с Безрассудством и Глухой обороной.`,
    exec(u,t,a){warShared(u,a);addAura(u,{type:"retal",name:a.name,icon:"retaliation",charges:a.charges,until:now+a.dur,good:true});roarFx(u);log(u,a.name);}},
  shieldwall:{school:"phys",target:false,st:["defensive"],
    desc:a=>`Получаемый урон снижен на ${a.reduce}% на ${a.dur} с. Общее восстановление с Безрассудством и Возмездием.`,
    exec(u,t,a){warShared(u,a);addAura(u,{type:"reduce",name:a.name,pct:a.reduce,until:now+a.dur,good:true});log(u,a.name);}},
  shieldblock:{school:"phys",target:false,gcd:false,st:["defensive"],
    desc:a=>`Шанс блока +${a.block}% на ${a.dur} с или ${a.charges} ${a.charges>1?"удара":"удар"}.`,
    exec(u,t,a){addAura(u,{type:"sblock",name:a.name,pct:a.block,charges:a.charges,until:now+a.dur,good:true});log(u,a.name);}},
  bloodrage:{school:"phys",target:false,gcd:false,
    desc:a=>`Сразу ${a.rageGain} ярости и ещё ${a.over} за 10 с. Стоит ${a.hpCost} здоровья и вводит в бой.`,
    exec(u,t,a){u.hp=Math.max(1,u.hp-a.hpCost);u.res=Math.min(u.maxRes,u.res+a.rageGain);addAura(u,{type:"bloodrage",name:a.name,per:a.over/10,next:now+1,until:now+10.05,good:true});enterCombat(u);log(u,a.name);}},
  sweeping:{school:"phys",target:false,gcd:false,st:["battle"],
    desc:a=>`${a.dur} с: следующие ${a.charges} атак ближнего боя задевают ещё одного врага рядом.`,
    exec(u,t,a){addAura(u,{type:"sweep",name:a.name,charges:a.charges,until:now+a.dur,good:true});roarFx(u);log(u,a.name);}},
  deathwish:{school:"phys",target:false,
    desc:a=>`${a.dur} с: физический урон +${a.pct}%, броня −${a.armor}%, иммунитет к страху.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="fear");addAura(u,{type:"dwish",name:a.name,pct:a.pct,armor:a.armor,until:now+a.dur,good:true});roarFx(u);log(u,a.name);}},
  laststand:{school:"phys",target:false,gcd:false,noCombat:true,
    desc:a=>`${a.dur} с: запас и текущее здоровье +${a.pct}% от максимума. Потом прибавка снимается.`,
    exec(u,t,a){const x=Math.round(u.maxHp*a.pct/100);u.lsAmt=(u.lsAmt||0)+x;u.maxHp+=x;u.hp+=x;addAura(u,{type:"laststand",name:a.name,until:now+a.dur,good:true});log(u,a.name);}},
  /* маг */
  frostbolt:{school:"frost",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. ${a.dmg[0]}–${a.dmg[1]} урона и замедление на ${a.slow}% на ${a.slowDur} с.`,
    exec(u,t,a){castFx(u);projectile(u,t,a.speed,"frost",()=>{damage(u,t,roll(a.dmg),a.name,"frost",{spell:true,cost:a.cost});
      if(t.alive&&!u.lastHit.resisted&&!isImmune(t))chill(u,t,a.name,a.slow,a.slowDur);});}},
  fireball:{school:"fire",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. ${a.dmg[0]}–${a.dmg[1]} урона огнём и горение: ${a.dot} за ${a.dotDur} с.`,
    exec(u,t,a){castFx(u);projectile(u,t,a.speed,"fire",()=>{damage(u,t,roll(a.dmg),a.name,"fire",{spell:true,id:"fireball",cost:a.cost});
      if(t.alive&&!u.lastHit.resisted)addDot(t,u,a.name,a.dot*dmgMult(u,"fire",{id:"fireball"}),a.dotDur,"fire",2);});}},
  fireblast:{school:"fire",target:true,
    desc:a=>`Мгновенно: ${a.dmg[0]}–${a.dmg[1]} урона огнём. Можно на бегу.`,
    exec(u,t,a){castFx(u);burstFx(t.pos,0xff8c3f);damage(u,t,roll(a.dmg),a.name,"fire",{spell:true,id:"fireblast",cost:a.cost});}},
  missiles:{school:"arcane",target:true,
    desc:a=>`Канал ${a.channel} с: ${a.ticks} стрел по ${a.dmg[0]}–${a.dmg[1]} урона тайной магией. Движение обрывает канал.`,
    tick(u,t,a){projectile(u,t,40,"arcane",()=>damage(u,t,roll(a.dmg),a.name,"arcane",{spell:true,id:"missiles"}));}},
  cone:{school:"frost",target:false,hostile:true,
    desc:a=>`Конус перед магом на ${a.range} м: ${a.dmg[0]}–${a.dmg[1]} урона льдом и замедление на ${a.slow}% на ${a.dur} с.`,
    exec(u,t,a){castFx(u,"castomni");coneFx(u,a.range,0xaee6ff);log(u,a.name);
      for(const t of foes(u))if(dist(u,t)<=a.range&&inCone(u,t,Math.PI/3)){damage(u,t,roll(a.dmg)*(1+tv(u,"impCone")/100),a.name,"frost",{spell:true,cost:a.cost});if(t.alive&&!u.lastHit.resisted)chill(u,t,a.name,a.slow,a.dur);}}},
  nova:{school:"frost",target:false,hostile:true,
    desc:a=>`Вокруг мага в радиусе ${a.radius.toFixed(0)} м: ${a.dmg[0]}–${a.dmg[1]} урона и обездвиживание на ${a.root} с.`,
    exec(u,t,a){castFx(u,"castomni");novaFx(u.pos,a.radius,0xaee6ff);log(u,a.name);for(const t of foes(u))if(dist(u,t)<=a.radius){damage(u,t,roll(a.dmg),a.name,"frost",{spell:true,cost:a.cost});if(t.alive&&!u.lastHit.resisted)cc(u,t,"root",a.root,a.name);}}},
  poly:{school:"arcane",target:true,
    desc:a=>`Каст ${a.cast.toFixed(2)} с. Превращает цель в овцу на ${a.dur} с. Любой урон снимает эффект.`,
    exec(u,t,a){castFx(u);burstFx(t.pos,0xc792ff);if(!isImmune(t)&&spellResisted(u,t,"arcane"))return;
      /* Превращение держится только на одной цели мага */
      for(const x of units)if(x!==t)x.auras=x.auras.filter(q=>!(q.type==="incap"&&q.src===u&&q.name===a.name));cc(u,t,"incap",a.dur,a.name,{drc:"poly"});}},
  counter:{school:"arcane",target:true,gcd:false,
    desc:a=>`Прерывает заклинание и блокирует его школу на ${a.lockout} с.`,
    exec(u,t,a){castFx(u);interrupt(u,t,a);}},
  blink:{school:"arcane",target:false,freeCC:["stun"],noCombat:true,
    desc:a=>`Телепорт на ${a.dist} м вперёд. Снимает оглушение и обездвиживание.`,
    exec(u,t,a){blink(u,a.dist);log(u,a.name);}},
  iceblock:{school:"frost",target:false,gcd:false,freeCC:["stun","incap","fear","silence","lockout"],noCombat:true,
    desc:a=>`Неуязвимость на ${a.dur} с, снимает все отрицательные эффекты, можно применить под любым контролем. Действовать в глыбе нельзя. Повторное нажатие выводит из глыбы.`,
    exec(u,t,a){u.cast=null;u.charging=null;u.auras=u.auras.filter(x=>x.good);addAura(u,{type:"iceblock",name:a.name,until:now+a.dur,good:true});log(u,a.name);}},
  manashield:{school:"arcane",target:false,noCombat:true,
    desc:a=>`Поглощает до ${a.absorb} урона, тратя ${a.ratio} маны за каждую единицу. ${a.dur} с.`,
    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"manashield",name:a.name,amount:a.absorb,ratio:a.ratio*(1-tv(u,"impManaShield")/100),until:now+a.dur,good:true,mb:true});log(u,a.name);}},
  frostarmor:{school:"frost",target:false,noCombat:true,
    desc:a=>`Бафф на весь бой: физический урон по вам −${a.reduce}%, ударивший в ближнем бою замедлен на ${a.slow}% на ${a.slowDur} с.`,
    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"frostarmor",name:a.name,pct:a.reduce*(1+tv(u,"frostWarding")/100),slow:a.slow,slowDur:a.slowDur,until:Infinity,good:true,mb:true});}},
  explosion:{school:"arcane",target:false,hostile:true,
    desc:a=>`Урон тайной магией ${a.dmg[0]}–${a.dmg[1]} вокруг мага в радиусе ${a.radius} м. Выбивает из скрытности.`,
    exec(u,t,a){castFx(u,"castomni");novaFx(u.pos,a.radius,0xc792ff);log(u,a.name);for(const t of foes(u))if(dist(u,t)<=a.radius)damage(u,t,roll(a.dmg),a.name,"arcane",{spell:true,cost:a.cost});}},
  evocation:{school:"arcane",target:false,breakOnDmg:true,noCombat:true,
    desc:a=>`Канал ${a.channel} с: восстанавливает ${a.pct}% маны. Урон прерывает.`,
    tick(u,t,a){u.res=Math.min(u.maxRes,u.res+u.maxRes*a.pct/100/a.ticks);}},
  apower:{school:"arcane",target:false,gcd:false,cap:true,noCombat:true,
    desc:a=>`+${a.dmg}% урона заклинаний на ${a.dur} с, стоимость заклинаний выше на ${a.costUp}%.`,
    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"apower",name:a.name,pct:a.dmg,until:now+a.dur,good:true,mb:true});log(u,a.name);}},
  combust:{school:"fire",target:false,gcd:false,cap:true,noCombat:true,
    desc:a=>`Каждое попадание огненным заклинанием повышает шанс крита огнём на ${a.crit}% (начиная с ${a.crit}%). После ${a.charges} критов эффект проходит.`,
    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"combust",name:a.name,charges:a.charges,pct:a.crit,step:a.crit,until:Infinity,good:true,mb:true});log(u,a.name);}},
  barrier:{school:"frost",target:false,cap:true,noCombat:true,
    desc:a=>`Щит, поглощающий ${a.absorb} урона, на ${a.dur} с.`,
    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"absorb",name:a.name,amount:a.absorb,max:a.absorb,until:now+a.dur,good:true,mb:true});log(u,a.name);}},
  pyroblast:{school:"fire",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. ${a.dmg[0]}–${a.dmg[1]} урона огнём и горение: ${a.dot} за ${a.dotDur} с.`,
    exec(u,t,a){castFx(u);projectile(u,t,a.speed,"fire",()=>{damage(u,t,roll(a.dmg),a.name,"fire",{spell:true,id:"pyroblast",cost:a.cost});
      if(t.alive&&!u.lastHit.resisted)addDot(t,u,a.name,a.dot*dmgMult(u,"fire",{id:"pyroblast"}),a.dotDur,"fire");});}},
  blastwave:{school:"fire",target:false,hostile:true,
    desc:a=>`Волна огня вокруг мага в радиусе ${a.radius} м: ${a.dmg[0]}–${a.dmg[1]} урона и замедление на ${a.slow}% на ${a.dur} с.`,
    exec(u,t,a){castFx(u,"castomni");novaFx(u.pos,a.radius,0xff6a3a);log(u,a.name);
      for(const t of foes(u))if(dist(u,t)<=a.radius){damage(u,t,roll(a.dmg),a.name,"fire",{spell:true,id:"blastwave",cost:a.cost});if(t.alive&&!u.lastHit.resisted)slowAura(u,t,a.name,a.slow,a.dur,"magic");}}},
  pom:{school:"arcane",target:false,gcd:false,cap:true,noCombat:true,
    desc:a=>`Следующее заклинание мага с временем чтения меньше 10 с читается мгновенно.`,
    exec(u,t,a){addAura(u,{type:"pom",name:a.name,until:Infinity,good:true});statusText(u,a.name,"#d7b0ff");log(u,a.name);}},
  coldsnap:{school:"frost",target:false,gcd:false,cap:true,noCombat:true,
    desc:a=>`Сразу восстанавливает Кольцо льда, Конус холода, Ледяную глыбу, Ледяную преграду и Защиту от льда.`,
    exec(u,t,a){for(const k of ["nova","cone","iceblock","barrier","frostward"])u.cds[k]=0;castFx(u,"castomni");statusText(u,a.name,"#9fdcff");log(u,a.name);}},
  scorch:{school:"fire",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. ${a.dmg[0]}–${a.dmg[1]} урона огнём.`,
    exec(u,t,a){castFx(u);burstFx(t.pos,0xff8c3f);damage(u,t,roll(a.dmg),a.name,"fire",{spell:true,id:"scorch",cost:a.cost});
      if(t.alive&&!u.lastHit.resisted&&Math.random()*100<tv(u,"impScorch")){const ex=aura(t,"firevuln"),st=ex?Math.min(5,ex.stacks+1):1;
        addAura(t,{type:"firevuln",name:"Уязвимость к огню",stacks:st,pct:3*st,until:now+30,dt:"magic"});}}},
  flamestrike:{school:"fire",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Столб огня под целью: ${a.dmg[0]}–${a.dmg[1]} урона всем врагам в радиусе ${a.radius} м, потом пламя горит ${a.dotDur} с (${a.dot} урона).`,
    exec(u,t,a){castFx(u);const p={x:t.pos.x,z:t.pos.z};novaFx(p,a.radius,0xff6a3a);log(u,a.name);
      for(const f of foes(u))if(Math.hypot(f.pos.x-p.x,f.pos.z-p.z)<=a.radius)damage(u,f,roll(a.dmg),a.name,"fire",{spell:true,id:"flamestrike",cost:a.cost});
      addZone(u,{radius:a.radius,dps:a.dot/a.dotDur*dmgMult(u,"fire",{id:"flamestrike"}),dur:a.dotDur,name:a.name,school:"fire",id:"flamestrike",x:p.x,z:p.z,color:0xff7a30});}},
  blizzard:{school:"frost",target:true,
    desc:a=>`Канал ${a.channel} с: ледяной дождь в радиусе ${a.radius} м там, где стоит цель. Каждую секунду ${a.dmg[0]}–${a.dmg[1]} урона всем врагам в зоне.`,
    tick(u,t,a){const c=u.cast;if(!c.pt){c.pt={x:t.pos.x,z:t.pos.z};}const p=c.pt;novaFx(p,a.radius,0xaee6ff);
      for(const f of foes(u))if(Math.hypot(f.pos.x-p.x,f.pos.z-p.z)<=a.radius){damage(u,f,roll(a.dmg),a.name,"frost",{spell:true,id:"blizzard",noResist:true});
        if(f.alive&&rk(u,"impBlizzard"))chill(u,f,"Улучшенная снежная буря",tv(u,"impBlizzard"),1.5);}}},
  fireward:{school:"fire",target:false,noCombat:true,
    desc:a=>`Поглощает ${a.absorb} урона огнём, ${a.dur} с. Общее восстановление с Защитой от льда.`,
    exec(u,t,a){castFx(u,"castomni");u.cds.frostward=now+a.cd;addAura(u,{type:"ward",school:"fire",name:a.name,amount:a.absorb,until:now+a.dur,good:true,mb:true});log(u,a.name);}},
  frostward:{school:"frost",target:false,noCombat:true,
    desc:a=>`Поглощает ${a.absorb} урона льдом, ${a.dur} с. Общее восстановление с Защитой от огня.`,
    exec(u,t,a){castFx(u,"castomni");u.cds.fireward=now+a.cd;addAura(u,{type:"ward",school:"frost",name:a.name,amount:a.absorb,until:now+a.dur,good:true,mb:true});log(u,a.name);}},
  /* разбойник */
  stealth:{school:"phys",target:false,ooc:true,noCombat:true,keepStealth:true,cdOnBreak:true,
    desc:a=>`Только вне боя. Невидимость, скорость −${B.general.stealth.speed}%. Противник замечает вас ближе ${B.general.stealth.front} м спереди и ${B.general.stealth.back} м сзади. Восстановление ${a.cd} с после выхода.`,
    exec(u,t,a){if(stealthed(u)){breakStealth(u);return}addAura(u,{type:"stealth",name:a.name,until:Infinity,good:true});log(u,a.name);}},
  sap:{school:"phys",target:true,stealthOnly:true,noCombat:true,
    desc:a=>`Из скрытности, по цели вне боя. Выводит из строя на ${a.dur} с, урон снимает эффект. Не вводит в бой.`,
    exec(u,t,a){swingFx(u,"kick");cc(u,t,"incap",a.dur,a.name,{noCombat:true,drc:"sap"});
      if(Math.random()*100<tv(u,"impSap")){if(!stealthed(u))addAura(u,{type:"stealth",name:ab("rogue","stealth").name,until:Infinity,good:true});}else breakStealth(u);}},
  cheapshot:{school:"phys",target:true,stealthOnly:true,
    desc:a=>`Из скрытности. Оглушение на ${a.stun} с и ${a.cp} приёма серии.`,
    exec(u,t,a){swingFx(u,"kick");if(cc(u,t,"stun",a.stun,a.name)){addCp(u,a.cp);if(Math.random()*100<tv(u,"initiative"))addCp(u,1);}}},
  garrote:{school:"phys",target:true,stealthOnly:true,behind:true,
    desc:a=>`Из скрытности, со спины. Кровотечение: ${a.total} урона за ${a.dur} с. 1 приём серии.`,
    exec(u,t,a){swingFx(u);addDot(t,u,a.name,a.total*dmgMult(u,"phys",{id:"garrote"}),a.dur,"phys");addCp(u,1);if(Math.random()*100<tv(u,"initiative"))addCp(u,1);log(u,a.name,t);}},
  ambush:{school:"phys",target:true,stealthOnly:true,behind:true,
    desc:a=>`Из скрытности, со спины. ${a.dmg[0]}–${a.dmg[1]} урона и 1 приём серии.`,
    exec(u,t,a){swingFx(u,"special");damage(u,t,roll(a.dmg),a.name,"phys",{melee:true,id:"ambush",ability:true});cpBuild(u);if(!u.lastHit.dodged&&Math.random()*100<tv(u,"initiative"))addCp(u,1);rogueHit(u,t);}},
  sinister:{school:"phys",target:true,
    desc:a=>`${a.dmg[0]}–${a.dmg[1]} урона и 1 приём серии.`,
    exec(u,t,a){swingFx(u);damage(u,t,roll(a.dmg),a.name,"phys",{melee:true,id:"sinister",ability:true});
      cpBuild(u);rogueHit(u,t);}},
  backstab:{school:"phys",target:true,behind:true,
    desc:a=>`Со спины: ${a.dmg[0]}–${a.dmg[1]} урона и 1 приём серии.`,
    exec(u,t,a){swingFx(u,"special");damage(u,t,roll(a.dmg),a.name,"phys",{melee:true,id:"backstab",ability:true});
      cpBuild(u);rogueHit(u,t);}},
  eviscerate:{school:"phys",target:true,finisher:true,
    desc:a=>`Завершающий приём: ${a.base} + ${a.perCp} урона за каждый приём серии.`,
    exec(u,t,a){swingFx(u,"special");const cp=spendCp(u);damage(u,t,(a.base+a.perCp*cp)*(.9+Math.random()*.2),a.name,"phys",{melee:true,id:"eviscerate",ability:true});rogueHit(u,t);}},
  slice:{school:"phys",target:false,finisher:true,noCombat:true,
    desc:a=>`Завершающий приём: скорость атаки +${a.haste}% на ${a.base}+${a.perCp} с за приём серии.`,
    exec(u,t,a){const cp=spendCp(u);addAura(u,{type:"slice",name:a.name,pct:a.haste,until:now+(a.base+a.perCp*cp)*(1+tv(u,"impSlice")/100),good:true});log(u,a.name);}},
  rupture:{school:"phys",target:true,finisher:true,
    desc:a=>`Завершающий приём: кровотечение ${a.perSec} урона в секунду на ${a.base}+${a.perCp} с за приём серии.`,
    exec(u,t,a){swingFx(u);if(Math.random()*100<dodgeChance(t)){u.lastHit={dodged:true};combatMiss(u,t,"Уклонение");return}
      const cp=spendCp(u),dur=a.base+a.perCp*cp;addDot(t,u,a.name,a.perSec*dur*dmgMult(u,"phys",{id:"rupture"}),dur,"phys",2);log(u,a.name,t);}},
  kidney:{school:"phys",target:true,finisher:true,
    desc:a=>`Завершающий приём: оглушение на ${a.base}+${a.perCp} с за каждый приём серии.`,
    exec(u,t,a){swingFx(u,"special");const cp=spendCp(u);if(cc(u,t,"stun",a.base+a.perCp*cp,a.name,{drc:"kidney"})&&rk(u,"impKidney")){const x=t.auras.find(z=>z.type==="stun"&&z.name===a.name&&z.until>now);if(x)x.ikPct=tv(u,"impKidney");}}},
  gouge:{school:"phys",target:true,
    desc:a=>`Выводит цель из строя на ${a.dur.toFixed(1)} с. Любой урон снимает эффект, ваша автоатака ждёт.`,
    exec(u,t,a){swingFx(u);damage(u,t,roll(a.dmg),a.name,"phys",{melee:true,id:"gouge",noProc:true});
      if(t.alive&&!u.lastHit.dodged){cc(u,t,"incap",a.dur,a.name,{drc:"gouge"});addCp(u,1);}}},
  kick:{school:"phys",target:true,gcd:false,
    desc:a=>`Прерывает заклинание и блокирует его школу на ${a.lockout} с.`,
    exec(u,t,a){swingFx(u,"kick");interrupt(u,t,a);if(t.alive&&!isImmune(t)&&Math.random()*100<tv(u,"impKick")){addAura(t,{type:"silence",name:"Пинок — немота",until:now+2,dt:"none"});statusText(t,"Немота","#ffd100");}}},
  blind:{school:"phys",target:true,
    desc:a=>`Цель бродит вслепую ${a.dur} с. Любой урон снимает эффект.`,
    exec(u,t,a){castFx(u,"castomni");cc(u,t,"fear",a.dur,a.name,{breakAny:true,drc:"blind"});}},
  vanish:{school:"phys",target:false,gcd:false,keepStealth:true,noCombat:true,
    desc:a=>`Мгновенно уходите в скрытность даже в бою и снимаете с себя все негативные эффекты. Заклинания, которые читали в вас, срываются.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.good);addAura(u,{type:"stealth",name:ab("rogue","stealth").name,until:Infinity,good:true});
      burstFx(u.pos,0x555566);for(const e of foes(u)){if(e.cast&&e.cast.target===u)cancelCast(e,"Цель исчезла");if(e.charging&&e.charging.t===u)e.charging=null;}
      for(let i=projectiles.length-1;i>=0;i--)if(projectiles[i].t===u){scene.remove(projectiles[i].m);projectiles.splice(i,1);}
      log(u,a.name);}},
  evasion:{school:"phys",target:false,gcd:false,keepStealth:true,noCombat:true,
    desc:a=>`Шанс уклонения +${a.dodge}% на ${a.dur} с.`,
    exec(u,t,a){addAura(u,{type:"evasion",name:a.name,pct:a.dodge,until:now+a.dur,good:true});log(u,a.name);}},
  sprint:{school:"phys",target:false,gcd:false,keepStealth:true,noCombat:true,
    desc:a=>`Скорость бега +${a.speed}% на ${a.dur} с.`,
    exec(u,t,a){if(Math.random()*100<tv(u,"impSprint"))u.auras=u.auras.filter(x=>x.type!=="root"&&x.type!=="slow");addAura(u,{type:"sprint",name:a.name,pct:a.speed,until:now+a.dur,good:true});log(u,a.name);}},
  coldblood:{school:"phys",target:false,gcd:false,cap:true,keepStealth:true,noCombat:true,
    desc:a=>`Следующий приём гарантированно наносит критический урон.`,
    exec(u,t,a){addAura(u,{type:"coldblood",name:a.name,until:now+60,good:true});log(u,a.name);}},
  adrenaline:{school:"phys",target:false,gcd:false,cap:true,noCombat:true,
    desc:a=>`Энергия восстанавливается на ${a.regen}% быстрее ${a.dur} с.`,
    exec(u,t,a){addAura(u,{type:"adren",name:a.name,pct:a.regen,until:now+a.dur,good:true});log(u,a.name);}},
  prep:{school:"phys",target:false,gcd:false,cap:true,keepStealth:true,noCombat:true,
    desc:a=>`Сбрасывает восстановление всех остальных способностей разбойника.`,
    exec(u,t,a){for(const k in u.cds)if(k!=="prep"&&k!=="trinket"&&k in B.rogue.abilities)u.cds[k]=0;log(u,a.name);}},
  riposte:{school:"phys",target:true,
    desc:a=>`Только после парирования, ${a.window} с. ${a.pct}% урона оружия и обезоруживание на ${a.disarm} с.`,
    exec(u,t,a){u.opUntil=0;swingFx(u,"special");damage(u,t,roll(B.rogue.swing.dmg)*a.pct/100,a.name,"phys",{melee:true,id:"riposte",ability:true});
      if(t.alive&&!u.lastHit.dodged&&!isImmune(t)){addAura(t,{type:"disarm",name:"Обезоружен",pct:B.warrior.abilities.disarm.pct,until:now+a.disarm,dt:"none"});statusText(t,"Обезоружен","#ffd100");}rogueHit(u,t);}},
  expose:{school:"phys",target:true,finisher:true,
    desc:a=>`Завершающий приём: броня цели ниже на ${a.perCp} за каждый приём серии, ${a.dur} с.`,
    exec(u,t,a){swingFx(u,"special");if(Math.random()*100<dodgeChance(t)){u.lastHit={dodged:true};combatMiss(u,t,"Уклонение");return}
      const cp=spendCp(u);addAura(t,{type:"expose",name:a.name,amount:Math.round(a.perCp*cp*(1+tv(u,"impExpose")/100)),until:now+a.dur,dt:"none"});statusText(t,a.name,"#ffd100");log(u,a.name,t);}},
  bladeflurry:{school:"phys",target:false,
    desc:a=>`${a.dur} с: скорость атаки +${a.haste}%, удары задевают ещё одного противника рядом.`,
    exec(u,t,a){addAura(u,{type:"bflurry",name:a.name,pct:a.haste,until:now+a.dur,good:true});log(u,a.name);}},
  ghostly:{school:"phys",target:true,
    desc:a=>`${a.pct}% урона оружия, уклонение +${a.dodge}% на ${a.dur} с, 1 приём серии.`,
    exec(u,t,a){swingFx(u,"special");damage(u,t,roll(B.rogue.swing.dmg)*a.pct/100,a.name,"phys",{melee:true,id:"ghostly",ability:true});
      if(!u.lastHit.dodged)addAura(u,{type:"ghostly",name:a.name,pct:a.dodge,until:now+a.dur,good:true});cpBuild(u);rogueHit(u,t);}},
  hemo:{school:"phys",target:true,
    desc:a=>`${a.pct}% урона оружия, 1 приём серии. Следующие ${a.charges} физических ударов по цели наносят на ${a.bonus} больше урона, ${a.dur} с.`,
    exec(u,t,a){swingFx(u);damage(u,t,roll(B.rogue.swing.dmg)*a.pct/100,a.name,"phys",{melee:true,id:"hemo",ability:true});
      if(t.alive&&!u.lastHit.dodged)addAura(t,{type:"hemo",name:a.name,bonus:a.bonus,charges:a.charges,until:now+a.dur,dt:"none"});cpBuild(u);rogueHit(u,t);}},
  premed:{school:"phys",target:true,stealthOnly:true,gcd:false,keepStealth:true,noCombat:true,
    desc:a=>`Из скрытности: ${a.cp} приёма серии.`,
    exec(u,t,a){addCp(u,a.cp);log(u,a.name);}},
  /* паладин */
  sealR:{school:"holy",target:false,noCombat:true,
    desc:a=>`${a.dur} с: каждый удар оружием наносит ещё ${a.dmg} урона Светом. Правосудие раскрывает печать: ${a.judge[0]}–${a.judge[1]} урона Светом.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="seal");addAura(u,{type:"seal",kind:"R",name:a.name,dmg:a.dmg,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name);}},
  sealJ:{school:"holy",target:false,noCombat:true,
    desc:a=>`${a.dur} с: удары оружием с шансом ${a.chance}% оглушают на ${a.stun} с. Правосудие раскрывает печать: цель не может ускоряться ${a.judgeDur} с.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="seal");addAura(u,{type:"seal",kind:"J",name:a.name,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name);}},
  sealCr:{school:"holy",target:false,noCombat:true,
    desc:a=>`${a.dur} с: удары оружием на ${a.haste}% чаще, но каждый слабее, плюс ${Math.round(a.ap)} урона за удар от силы атаки. Правосудие раскрывает печать: цель ${a.judgeDur} с получает на ${Math.round(a.holyBonus)} больше урона от каждого удара Светом.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="seal");addAura(u,{type:"seal",kind:"Cr",name:a.name,haste:a.haste,ap:a.ap,bonus:a.holyBonus,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name);}},
  sealC:{school:"holy",target:false,noCombat:true,cap:true,
    desc:a=>`${a.dur} с: удары оружием примерно ${a.ppm} раз в минуту наносят ещё ${a.pct}% урона оружия Светом. Правосудие раскрывает печать: ${a.judge[0]}–${a.judge[1]} урона Светом, вдвое больше по оглушённой или выведенной из строя цели.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="seal");addAura(u,{type:"seal",kind:"C",name:a.name,ppm:a.ppm,pct:a.pct,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name);}},
  wrath:{school:"holy",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Бросает молот: ${a.dmg[0]}–${a.dmg[1]} урона Светом. Только по цели, у которой ${a.hpPct}% здоровья или меньше.`,
    exec(u,t,a){castFx(u);projectile(u,t,a.speed,"holy",()=>damage(u,t,roll(a.dmg),a.name,"holy",{spell:true,id:"wrath",cost:a.cost}));}},
  dfavor:{school:"holy",target:false,gcd:false,cap:true,noCombat:true,
    desc:a=>`Следующие Вспышка Света, Свет небес или Шок небес гарантированно критические.`,
    exec(u,t,a){addAura(u,{type:"dfavor",name:a.name,until:now+3600,good:true});castFx(u,"castomni");log(u,a.name);}},
  sealL:{school:"holy",target:false,noCombat:true,
    desc:a=>`${a.dur} с: удары оружием с шансом ${a.chance}% исцеляют вас на ${a.heal}. Правосудие раскрывает печать: ${a.judgeDur} с каждый удар оружием по цели исцеляет атакующего на ${a.judgeHeal}.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="seal");addAura(u,{type:"seal",kind:"L",name:a.name,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name);}},
  sealW:{school:"holy",target:false,noCombat:true,
    desc:a=>`${a.dur} с: удары оружием с шансом ${a.chance}% восстанавливают вам ${a.mana} маны. Правосудие раскрывает печать: ${a.judgeDur} с каждый удар оружием по цели даёт атакующему ${a.judgeMana} маны.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="seal");addAura(u,{type:"seal",kind:"W",name:a.name,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name);}},
  dprot:{school:"holy",target:false,gcd:false,freeCC:["stun"],forbear:true,noCombat:true,
    desc:a=>`${a.dur} с неуязвимости к любому урону, но вы не можете атаковать оружием и применять физические приёмы. Вызывает Воздержанность на ${B.general.forbearance} с.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.good);addAura(u,{type:"immune",name:a.name,until:now+a.dur,good:true,noAtk:true});forbear(u);log(u,a.name);}},
  devotion:{school:"holy",target:false,gcd:false,paura:true,noCombat:true,desc:a=>`Аура: +${Math.round(a.armor)} брони вам и союзникам в радиусе ${a.radius} м.`,exec(u,t,a){setPAura(u,"devotion");}},
  retaura:{school:"holy",target:false,gcd:false,paura:true,noCombat:true,desc:a=>`Аура: каждый, кто бьёт оружием вас или союзника в радиусе ${a.radius} м, получает ${Math.round(a.dmg)} урона Светом.`,exec(u,t,a){setPAura(u,"retaura");}},
  conc:{school:"holy",target:false,gcd:false,paura:true,noCombat:true,desc:a=>`Аура: с шансом ${Math.round(a.pct)}% урон не сбивает заклинания у вас и союзников в радиусе ${a.radius} м.`,exec(u,t,a){setPAura(u,"conc");}},
  sanctaura:{school:"holy",target:false,gcd:false,paura:true,cap:true,noCombat:true,desc:a=>`Аура: урон от Света у вас и союзников в радиусе ${a.radius} м выше на ${a.pct}%.`,exec(u,t,a){setPAura(u,"sanctaura");}},
  shadowres:{school:"holy",target:false,gcd:false,paura:true,noCombat:true,desc:a=>`Аура: +${a.resist} к сопротивлению тёмной магии (урон Тьмой ниже на ${a.pct}%) вам и союзникам в радиусе ${a.radius} м.`,exec(u,t,a){setPAura(u,"shadowres");}},
  frostres:{school:"holy",target:false,gcd:false,paura:true,noCombat:true,desc:a=>`Аура: +${a.resist} к сопротивлению магии льда (урон льдом ниже на ${a.pct}%) вам и союзникам в радиусе ${a.radius} м.`,exec(u,t,a){setPAura(u,"frostres");}},
  fireres:{school:"holy",target:false,gcd:false,paura:true,noCombat:true,desc:a=>`Аура: +${a.resist} к сопротивлению огню (урон огнём ниже на ${a.pct}%) вам и союзникам в радиусе ${a.radius} м.`,exec(u,t,a){setPAura(u,"fireres");}},
  bom:{school:"holy",target:false,ally:true,noCombat:true,desc:a=>`Благословение на вас или союзника на весь бой: +${Math.round(a.ap)} к силе атаки (удары оружием сильнее). От одного паладина на цели одно благословение.`,exec(u,t,a){bless(u,F(u),"bom",a);}},
  bow:{school:"holy",target:false,ally:true,noCombat:true,desc:a=>`Благословение на вас или союзника на весь бой: ${Math.round(a.mana)} маны каждые 5 с. От одного паладина на цели одно благословение.`,exec(u,t,a){bless(u,F(u),"bow",a);}},
  kings:{school:"holy",target:false,ally:true,cap:true,noCombat:true,desc:a=>`Благословение на вас или союзника на весь бой: все характеристики +${a.pct}% (урон и исцеление +3%, получаемый урон −5%, мана +5%).`,exec(u,t,a){bless(u,F(u),"kings",a);}},
  sanctbless:{school:"holy",target:false,ally:true,cap:true,noCombat:true,desc:a=>`Благословение на вас или союзника на весь бой: каждый удар по цели слабее на ${a.reduce}, заблокированный удар наносит атакующему ${a.dmg} урона Светом.`,exec(u,t,a){bless(u,F(u),"sanct",a);}},
  sacrifice:{school:"holy",target:false,ally:true,noCombat:true,desc:a=>`Только на союзника, ${a.dur} с: до ${a.amount} урона каждого удара по нему переходит на вас.`,exec(u,t,a){const f=F(u);if(f===u){showErr("Нужен союзник");return}bless(u,f,"sac",a,now+a.dur);}},
  judgement:{school:"holy",target:true,needSeal:true,
    desc:a=>`Раскрывает активную печать. Без печати не работает.`,
    exec(u,t,a){const s=aura(u,"seal");u.auras=u.auras.filter(x=>x.type!=="seal");castFx(u,"castomni");burstFx(t.pos,0xffe9a0);
      if(s.kind==="R")damage(u,t,roll(ab("paladin","sealR").judge)*(1+tv(u,"impSoR")/100),a.name,"holy",{spell:true,id:"judgement",cost:a.cost});
      else if(s.kind==="C")damage(u,t,roll(ab("paladin","sealC").judge)*(has(t,"stun")||incap(t)?2:1),a.name,"holy",{spell:true,id:"judgement",cost:a.cost});
      else if(s.kind==="L"||s.kind==="W"){if(isImmune(t))return;const j=ab("paladin",s.kind==="L"?"sealL":"sealW");addAura(t,{type:s.kind==="L"?"jol":"jow",name:s.kind==="L"?"Правосудие Света":"Правосудие мудрости",amount:s.kind==="L"?j.judgeHeal:j.judgeMana,until:now+j.judgeDur+tv(u,"lastingJ"),dt:"magic"});enterCombat(u,t);statusText(t,"Правосудие","#ffe9a0");log(u,a.name,t);}
      else if(s.kind==="Cr"){if(isImmune(t))return;addAura(t,{type:"jotc",name:"Правосудие крестоносца",bonus:s.bonus,until:now+ab("paladin","sealCr").judgeDur,dt:"magic"});enterCombat(u,t);statusText(t,"Правосудие","#ffe9a0");log(u,a.name,t);}
      else{const j=ab("paladin","sealJ");if(isImmune(t))return;t.auras=t.auras.filter(x=>x.type!=="sprint");addAura(t,{type:"justice",name:"Правосудие справедливости",until:now+j.judgeDur,dt:"magic"});enterCombat(u,t);statusText(t,"Правосудие","#ffe9a0");log(u,a.name,t);}}},
  hammer:{school:"holy",target:true,
    desc:a=>`Бросает молот: оглушение на ${a.stun} с.`,
    exec(u,t,a){castFx(u);projectile(u,t,a.speed,"holy",()=>cc(u,t,"stun",a.stun,a.name),"hammer");}},
  flashlight:{school:"holy",target:false,ally:true,icon:"pflash",noCombat:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Исцеляет вас или союзника на ${a.heal[0]}–${a.heal[1]}.`,
    exec(u,t,a){castFx(u,"castomni");healSpell(u,a,0,F(u));}},
  holylight:{school:"holy",target:false,ally:true,noCombat:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Исцеляет вас или союзника на ${a.heal[0]}–${a.heal[1]}.`,
    exec(u,t,a){castFx(u,"castomni");healSpell(u,a,0,F(u));}},
  bubble:{school:"holy",target:false,gcd:false,freeCC:["stun","incap","fear","silence","lockout"],forbear:true,noCombat:true,
    desc:a=>`Неуязвимость к урону и контролю на ${a.dur} с, снимает отрицательные эффекты. После него ${B.general.forbearance} с нельзя применять Божественный щит, Благословение защиты и Возложение рук.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.good);addAura(u,{type:"immune",name:a.name,until:now+a.dur,good:true});forbear(u);log(u,a.name);}},
  freedom:{school:"holy",target:false,ally:true,noCombat:true,
    desc:a=>`Снимает замедление и обездвиживание и защищает от них ${a.dur} с.`,
    exec(u,t,a){const f=F(u);f.auras=f.auras.filter(x=>x.type!=="root"&&x.type!=="slow");addAura(f,{type:"freedom",name:a.name,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name,f!==u?f:0);}},
  bop:{school:"holy",target:false,ally:true,freeCC:["stun"],forbear:true,noCombat:true,
    desc:a=>`${a.dur} с иммунитета к физическому урону и физическим приёмам, но вы тоже не бьёте оружием. Вызывает Воздержанность на ${B.general.forbearance} с.`,
    exec(u,t,a){const f=F(u);f.auras=f.auras.filter(x=>!(x.dt==="none"&&["stun","incap","root","slow","dot","disarm"].includes(x.type)));addAura(f,{type:"bop",name:a.name,until:now+a.dur,good:true,mb:true});forbear(f);castFx(u,"castomni");log(u,a.name,f!==u?f:0);}},
  cleanse:{school:"holy",target:false,ally:true,noCombat:true,
    desc:a=>`Снимает с вас или союзника по одному эффекту магии, яда и болезни.`,
    exec(u,t,a){const f=F(u);let n=0;for(const dt of ["magic","poison","disease"]){const x=pickDispel(f.auras.filter(z=>!z.good&&z.dt===dt&&z.until>now));if(x){f.auras=f.auras.filter(z=>z!==x);n++;}}
      castFx(u,"castomni");log(u,`${a.name}${n?"":" — снимать нечего"}`);}},
  loh:{school:"holy",target:false,ally:true,forbear:true,once:true,noCombat:true,
    desc:a=>`Раз за бой. Полностью восстанавливает здоровье, мана падает до нуля. Вызывает Воздержанность.`,
    exec(u,t,a){const f=F(u);u.lohUsed=true;castFx(u,"castomni");heal(f,f.maxHp,a.name,false,u);healFx(f,true);u.res=0;forbear(f);}},
  consecration:{school:"holy",target:false,hostile:true,cap:true,
    desc:a=>`Земля под вами ${a.dur} с жжёт Светом: ${a.dps} урона в секунду врагам в радиусе ${a.radius} м. Выбивает из скрытности.`,
    exec(u,t,a){castFx(u,"castomni");addZone(u,a);log(u,a.name);}},
  holyshock:{school:"holy",target:true,cap:true,
    desc:a=>`Мгновенно: ${a.dmg[0]}–${a.dmg[1]} урона Светом противнику или столько же исцеления союзнику (выберите себя или союзника: щелчок, F1/F2).`,
    exec(u,t,a){castFx(u);if(u.healMode||!t){healSpell(u,{...a,heal:a.dmg},0,healTarget(u));return}const df=aura(u,"dfavor");if(df)df.until=0;damage(u,t,roll(a.dmg),a.name,"holy",{spell:true,id:"holyshock",cost:a.cost,forceCrit:!!df});}},
  holyshield:{school:"holy",target:false,cap:true,noCombat:true,
    desc:a=>`+${a.block}% к шансу блока на ${a.dur} с (${a.charges} блока). Каждый блок наносит ${a.dmg} урона Светом.`,
    exec(u,t,a){addAura(u,{type:"holyshield",name:a.name,pct:a.block,charges:a.charges,dmg:a.dmg,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name);}},
  repentance:{school:"holy",target:true,cap:true,
    desc:a=>`Цель выведена из строя на ${a.dur} с. Любой урон снимает эффект.`,
    exec(u,t,a){castFx(u);burstFx(t.pos,0xffe9a0);cc(u,t,"incap",a.dur,a.name,{drc:"repent"});}},
  /* жрец */
  swp:{school:"shadow",target:true,sfOk:true,
    desc:a=>`${Math.round(a.dmg*a.dur/18)} урона Тьмой за ${a.dur} с.`,
    exec(u,t,a){castFx(u);addDot(t,u,a.name,a.dmg*(a.dur/18)*dmgMult(u,"shadow",{id:"swp"}),a.dur,"shadow");blackoutProc(u,t);if(t.alive&&Math.random()*100<tv(u,"shadowWeaving")){const ex=aura(t,"sweave"),st=ex?Math.min(5,ex.stacks+1):1;addAura(t,{type:"sweave",name:"Плетение Тьмы",stacks:st,until:now+15,dt:"magic"});}log(u,a.name,t);}},
  mindblast:{school:"shadow",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. ${a.dmg[0]}–${a.dmg[1]} урона Тьмой.`,
    exec(u,t,a){castFx(u);burstFx(t.pos,0x9b6bff);damage(u,t,roll(a.dmg),a.name,"shadow",{spell:true,id:"mindblast",cost:a.cost});}},
  flay:{school:"shadow",target:true,
    desc:a=>`Канал ${a.channel} с: ${a.ticks} раза по ${a.dmg[0]} урона Тьмой, цель замедлена на ${a.slow}%. Движение обрывает канал.`,
    tick(u,t,a){burstFx(t.pos,0x9b6bff);damage(u,t,roll(a.dmg),a.name,"shadow",{spell:true,id:"flay"});if(t.alive)slowAura(u,t,a.name,a.slow,a.channel/a.ticks+.3,"magic");}},
  manaburn:{school:"shadow",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Сжигает ${a.burn[0]}–${a.burn[1]} маны цели и наносит урон, равный ${a.pct}% сожжённого.`,
    exec(u,t,a){castFx(u);burstFx(t.pos,0x6b8bff);if(isImmune(t)){statusText(t,"Невосприимчив","#cfd6df");return}
      if(spellResisted(u,t,"shadow"))return;
      const b=Math.min(t.res,roll(a.burn));t.res-=b;statusText(t,`−${Math.round(b)} маны`,"#6b8bff");damage(u,t,b*a.pct/100,a.name,"shadow",{spell:true,id:"manaburn",noCrit:true,noResist:true});}},
  smite:{school:"holy",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. ${a.dmg[0]}–${a.dmg[1]} урона Светом.`,
    exec(u,t,a){castFx(u);burstFx(t.pos,0xffe9a0);damage(u,t,roll(a.dmg),a.name,"holy",{spell:true,id:"smite",cost:a.cost});}},
  holyfire:{school:"holy",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. ${a.dmg[0]}–${a.dmg[1]} урона Светом и ещё ${a.dot} за ${a.dotDur} с.`,
    exec(u,t,a){castFx(u);projectile(u,t,30,"holy",()=>{damage(u,t,roll(a.dmg),a.name,"holy",{spell:true,id:"holyfire",cost:a.cost});if(t.alive&&!u.lastHit.resisted)addDot(t,u,a.name,a.dot*dmgMult(u,"holy",{id:"holyfire"}),a.dotDur,"holy",2);});}},
  pws:{school:"holy",target:false,ally:true,sfOk:true,noCombat:true,
    desc:a=>`Щит на вас или союзника: поглощает ${Math.round(a.absorb)} урона ${a.dur} с, пока он держится, урон не замедляет ваши заклинания. Потом ${a.ws} с Ослабленная душа: повторно щит на эту цель нельзя.`,
    exec(u,t,a){const f=F(u);castFx(u,"castomni");addAura(f,{type:"absorb",name:a.name,amount:a.absorb,max:a.absorb,until:now+a.dur,good:true,mb:true});addAura(f,{type:"ws",name:"Ослабленная душа",icon:"a_weakened",until:now+a.ws,dt:"none"});log(u,a.name,f!==u?f:0);}},
  flash:{school:"holy",target:false,ally:true,noCombat:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Исцеляет вас или союзника на ${a.heal[0]}–${a.heal[1]}.`,
    exec(u,t,a){castFx(u,"castomni");healSpell(u,a,0,F(u));}},
  heal:{school:"holy",target:false,ally:true,noCombat:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Исцеляет вас или союзника на ${a.heal[0]}–${a.heal[1]}. Дешевле Великого исцеления.`,
    exec(u,t,a){castFx(u,"castomni");healSpell(u,a,0,F(u));}},
  gheal:{school:"holy",target:false,ally:true,noCombat:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Исцеляет вас или союзника на ${a.heal[0]}–${a.heal[1]}.`,
    exec(u,t,a){castFx(u,"castomni");healSpell(u,a,0,F(u));}},
  renew:{school:"holy",target:false,ally:true,noCombat:true,
    desc:a=>`Исцеляет на ${Math.round(a.heal)} за ${a.dur} с (раз в 3 с).`,
    exec(u,t,a){const f=F(u);castFx(u,"castomni");let h=a.heal*(1+u.K.heal/100);{const pi=aura(u,"pi");if(pi)h*=1+pi.pct/100;}addAura(f,{type:"hot",name:a.name,src:u,per:h/(a.dur/3),period:3,next:now+3,until:now+a.dur+.05,good:true,mb:true});log(u,a.name,f!==u?f:0);}},
  prayerheal:{school:"holy",target:false,noCombat:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Исцеляет вас и союзников в радиусе ${Math.round(a.radius)} м на ${a.heal[0]}–${a.heal[1]}.`,
    exec(u,t,a){castFx(u,"castomni");for(const f of units)if(f.alive&&f.team===u.team&&dist(u,f)<=a.radius)healSpell(u,a,0,f);}},
  holynova:{school:"holy",target:false,noCombat:true,
    desc:a=>`Мгновенно: ${a.dmg[0]}–${a.dmg[1]} урона Светом врагам в радиусе ${Math.round(a.radius)} м и исцеление на ${a.heal[0]}–${a.heal[1]} вам и союзникам рядом.`,
    exec(u,t,a){castFx(u,"castomni");novaFx(u.pos,a.radius,0xffe9a0);for(const e of foes(u))if(dist(u,e)<=a.radius&&canSee(u,e))damage(u,e,roll(a.dmg),a.name,"holy",{spell:true,id:"holynova"});
      for(const f of units)if(f.alive&&f.team===u.team&&dist(u,f)<=a.radius)healSpell(u,a,0,f);}},
  scream:{school:"shadow",target:false,hostile:true,sfOk:true,
    desc:a=>`Враги в радиусе ${a.radius} м в страхе бегут ${a.dur} с. Урон может снять страх.`,
    exec(u,t,a){castFx(u,"castomni");novaFx(u.pos,a.radius,0x9b6bff);log(u,a.name);for(const t of foes(u))if(dist(u,t)<=a.radius)cc(u,t,"fear",a.dur,a.name);}},
  dispel:{school:"holy",target:false,ally:true,sfOk:true,noCombat:true,
    desc:a=>`Снимает с вас или союзника ${a.count} магических эффекта. Если снимать нечего, снимает ${a.count} магических баффа с противника в радиусе ${a.range} м (Божественный щит и Ледяная глыба не снимаются).`,
    exec(u,t,a){castFx(u,"castomni");
      const f=F(u);let n=0;for(let i=0;i<a.count;i++){const x=pickDispel(f.auras.filter(z=>!z.good&&z.dt==="magic"&&z.until>now));if(!x)break;f.auras=f.auras.filter(z=>z!==x);n++;}
      if(n){log(u,`${a.name}: снято ${f===u?"с себя":"с союзника"} ${n}`);return}
      if(t&&t.alive&&canSee(u,t)&&dist(u,t)<=a.range&&los(u.pos,t.pos)){
        for(let i=0;i<a.count;i++){const x=t.auras.find(z=>z.good&&z.mb&&z.until>now);if(!x)break;t.auras=t.auras.filter(z=>z!==x);n++;statusText(t,`−${x.name}`,"#9fd0ff");}
        if(n){enterCombat(u,t);burstFx(t.pos,0x9fd0ff);}}
      log(u,`${a.name}${n?`: снято с противника ${n}`:" — снимать нечего"}`);}},
  innerfire:{school:"holy",target:false,noCombat:true,sfOk:true,
    desc:a=>`Бафф: +${Math.round(a.armor)} брони, ${a.charges} зарядов. Каждый удар ближнего боя по вам тратит заряд.`,
    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"innerfire",name:a.name,armor:a.armor,charges:a.charges,until:Infinity,good:true,mb:true});}},
  fortitude:{school:"holy",target:false,ally:true,noCombat:true,sfOk:true,
    desc:a=>`Вам или союзнику +${Math.round(a.stamina)} выносливости (+${Math.round(a.stamina*10)} здоровья) на весь бой.`,
    exec(u,t,a){castFx(u,"castomni");fortitude(u,F(u),a);}},
  divinespirit:{school:"holy",target:false,ally:true,noCombat:true,sfOk:true,
    desc:a=>`Вам или союзнику +${a.spirit} духа на весь бой: мана восстанавливается быстрее (+${a.spirit/8} в секунду).`,
    exec(u,t,a){const f=F(u);castFx(u,"castomni");addAura(f,{type:"dspirit",name:a.name,regen:a.spirit/8,until:Infinity,good:true,mb:true});log(u,a.name,f!==u?f:0);}},
  innerfocus:{school:"holy",target:false,gcd:false,cap:true,sfOk:true,noCombat:true,
    desc:a=>`Следующее заклинание бесплатно и получает +${a.crit}% к шансу крита.`,
    exec(u,t,a){addAura(u,{type:"ifocus",name:a.name,until:Infinity,good:true});castFx(u,"castomni");log(u,a.name);}},
  pi:{school:"holy",target:false,ally:true,gcd:false,cap:true,sfOk:true,noCombat:true,
    desc:a=>`Вам или союзнику: урон и исцеление заклинаниями +${a.dmg}% на ${a.dur} с.`,
    exec(u,t,a){const f=F(u);addAura(f,{type:"pi",name:a.name,pct:a.dmg,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name,f!==u?f:0);}},
  silence:{school:"shadow",target:true,gcd:false,sfOk:true,
    desc:a=>`Прерывает заклинание и накладывает безмолвие на ${a.dur} с.`,
    exec(u,t,a){castFx(u);if(isImmune(t))return;if(rk(t,"unbreakableWill")&&Math.random()*100<tv(t,"unbreakableWill")){statusText(t,"Сопротивление","#cfd6df");return}const was=t.cast;if(t.cast){t.cast=null;u.stats.interrupts++;castFailU(t,"Прервано");}
      addAura(t,{type:"silence",name:a.name,until:now+a.dur,dt:"magic"});enterCombat(u,t);statusText(t,a.name,"#d7b0ff");logRaw(`<b>${u.name}</b>: ${a.name}${was?" сбивает заклинание":""}`);}},
  vampiric:{school:"shadow",target:true,cap:true,sfOk:true,
    desc:a=>`Проклятие на враге на ${a.dur} с: ваш урон Тьмой по нему исцеляет вас и союзников на ${a.pct}% нанесённого.`,
    exec(u,t,a){castFx(u);if(isImmune(t))return;if(spellResisted(u,t,"shadow"))return;addAura(t,{type:"ve",name:a.name,src:u,pct:a.pct,until:now+a.dur,dt:"curse"});enterCombat(u,t);log(u,a.name,t);}},
  shadowform:{school:"shadow",target:false,gcd:false,cap:true,noCombat:true,sfOk:true,
    desc:a=>`Включает и выключает облик: +${a.dmg}% урона Тьмой, −${a.reduce}% физического урона по вам. В облике нельзя исцелять и применять Кару и Святой огонь.`,
    exec(u,t,a){if(has(u,"shadowform")){u.auras=u.auras.filter(x=>x.type!=="shadowform");log(u,a.name+": выход");return}
      addAura(u,{type:"shadowform",name:a.name,dmg:a.dmg,pct:a.reduce,until:Infinity,good:true});castFx(u,"castomni");log(u,a.name);}}
};
function pickDispel(list){if(!list.length)return null;const pr=["incap","fear","stun","silence","root","slow","numb","justice","dot"];list.sort((a,b)=>{const i=pr.indexOf(a.type),j=pr.indexOf(b.type);return (i<0?99:i)-(j<0?99:j)});return list[0]}
/* ауры паладина: одна на паладина, действует на него и союзников рядом */
const PAURAS=["devotion","retaura","conc","sanctaura","shadowres","frostres","fireres"];
function setPAura(u,id){u.paura=id;if(u.isPlayer&&!SRV&&state!=="menu"){settings.paura=id;store.set("arena-settings",JSON.stringify(settings));}u.auras=u.auras.filter(x=>x.type!=="paura");addAura(u,{type:"paura",name:ab("paladin",id).name,icon:id,until:Infinity,good:true,mb:true});castFx(u,"castomni");}
function pauraOn(t,id){for(const p of units)if(p.cls==="paladin"&&p.alive&&p.paura===id&&p.team===t.team&&(p===t||dist(p,t)<=ab("paladin",id).radius))return p;return null}
/* благословения: на весь бой, от одного паладина на цели одно */
function bless(u,f,kind,a,until){f.auras=f.auras.filter(x=>!(x.type==="bless"&&x.src===u));addAura(f,{type:"bless",kind,src:u,name:a.name,icon:{bom:"bom",bow:"bow",kings:"kings",sanct:"sanctbless",sac:"sacrifice"}[kind],
  ap:kind==="bom"?a.ap*(1+tv(u,"impBoM")/100):0,mana:kind==="bow"?a.mana*(1+tv(u,"impBoW")/100):0,reduce:a.reduce||0,dmg:a.dmg||0,amount:a.amount||0,until:until||Infinity,good:true,mb:true});
  castFx(u,"castomni");log(u,a.name,f!==u?f:0);}
const blessOf=(t,kind)=>t.auras.find(x=>x.type==="bless"&&x.kind===kind&&x.until>now);
/* Слово силы: Стойкость: +10 здоровья за единицу выносливости */
function fortitude(u,f,a){const add=Math.round(a.stamina*10),ex=aura(f,"fort");if(ex){f.maxHp-=ex.hp;f.hp=Math.min(f.hp,f.maxHp);}
  addAura(f,{type:"fort",name:a.name,hp:add,until:Infinity,good:true});f.maxHp+=add;f.hp+=add;if(u!==f)log(u,a.name,f);}
function forbear(u){addAura(u,{type:"forbear",name:"Воздержанность",until:now+B.general.forbearance,dt:"none"});}
const ICON_BY_NAME={"Глубокие раны":"deepWounds","Шквал":"flurry","Исступление":"enrage","Кровавое безумие":"bloodCraze","Воспламенение":"ignite","Ясность мысли":"clearcast","Обезоружен":"riposte","Пинок — немота":"kick",
  "Смертельная рана":"mortal","Безмолвие":"a_silence","Обморожение":"frostbite","Сотрясение":"impact","Оглушение (Рывок)":"charge","Оглушающий удар":"concussion",
  "Улучшенное подрезание":"impHamstring","Взрывная волна":"blastWave","Затмение":"blackout","Вдохновение":"inspiration","Отмщение":"vengeance","Возмездие":"vindication",
  "Воздержанность":"a_forbear","Правосудие справедливости":"a_justice","Калечащий яд":"crip","Дурманящий яд":"numb","Смертельный яд":"deadly","Уязвимость к огню":"a_firevuln","Зимняя стужа":"a_wchill","Улучшенная снежная буря":"impBlizzard"};
for(const c of [...CLASSES,"common"])for(const id in DEF[c].abilities)ICON_BY_NAME[DEF[c].abilities[id].name]=META[id].icon||id;
const auraIcon=a=>a.icon||ICON_BY_NAME[a.name]||("a_"+a.type in ICON?"a_"+a.type:"a_q");

/* ================= СЦЕНА ================= */
const canvas=$("#c");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
/* сглаживание: MSAA + рендер в увеличенном разрешении (суперсэмплинг) */
const AA_K={off:1,normal:1,high:1.5,ultra:2};
function applyAA(){const dpr=window.devicePixelRatio||1,k=(()=>{try{return AA_K[settings.aa||"normal"]||1.5}catch(e){return 1.5}})();renderer.setPixelRatio(Math.min(2.5,Math.min(2,dpr)*k));}
applyAA();
/* прозрачные края (волосы, бахрома, решётки) сглаживаем через alpha-to-coverage; текстурам — анизотропная фильтрация */

/* FXAA: сцена рисуется в текстуру (с MSAA на WebGL2), затем полноэкранный проход сглаживает оставшиеся ступеньки */
let FX=null;
function renderFXAA(){const sz=renderer.getDrawingBufferSize(new THREE.Vector2());
  if(!FX){const RT=renderer.capabilities.isWebGL2&&THREE.WebGLMultisampleRenderTarget?THREE.WebGLMultisampleRenderTarget:THREE.WebGLRenderTarget;
    const rt=new RT(sz.x,sz.y,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat});rt.texture.encoding=THREE.sRGBEncoding;if(rt.samples!==undefined)rt.samples=4;
    const mat=new THREE.ShaderMaterial({uniforms:{t:{value:rt.texture},px:{value:new THREE.Vector2()}},depthTest:false,depthWrite:false,
      vertexShader:"varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader:`uniform sampler2D t;uniform vec2 px;varying vec2 v;
float L(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){vec3 cM=texture2D(t,v).rgb;float m=L(cM),nw=L(texture2D(t,v+vec2(-1.,-1.)*px).rgb),ne=L(texture2D(t,v+vec2(1.,-1.)*px).rgb),sw=L(texture2D(t,v+vec2(-1.,1.)*px).rgb),se=L(texture2D(t,v+vec2(1.,1.)*px).rgb);
float mn=min(m,min(min(nw,ne),min(sw,se))),mx=max(m,max(max(nw,ne),max(sw,se)));
vec2 d=vec2(-((nw+ne)-(sw+se)),((nw+sw)-(ne+se)));float r=max((nw+ne+sw+se)*.25*.125,1./128.);float k=1./(min(abs(d.x),abs(d.y))+r);
d=clamp(d*k,vec2(-8.),vec2(8.))*px;
vec3 a=.5*(texture2D(t,v+d*(1./3.-.5)).rgb+texture2D(t,v+d*(2./3.-.5)).rgb);vec3 b=a*.5+.25*(texture2D(t,v-d*.5).rgb+texture2D(t,v+d*.5).rgb);
float lb=L(b);gl_FragColor=vec4((lb<mn||lb>mx)?a:b,1.);}`});
    const q=new THREE.Mesh(new THREE.PlaneBufferGeometry(2,2),mat);q.frustumCulled=false;const s2=new THREE.Scene();s2.add(q);FX={rt,mat,s2,cam:new THREE.Camera()};}
  if(FX.rt.width!==sz.x||FX.rt.height!==sz.y)FX.rt.setSize(sz.x,sz.y);FX.mat.uniforms.px.value.set(1/sz.x,1/sz.y);
  renderer.setRenderTarget(FX.rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(FX.s2,FX.cam);}
const AA_ANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());
function aaFixScene(root){root.traverse(o=>{if(!o.material)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.__aa)continue;m.__aa=1;
  if(m.alphaTest>0&&!m.transparent){m.alphaToCoverage=true;m.needsUpdate=true;}
  for(const t of [m.map,m.normalMap])if(t&&t.anisotropy<AA_ANISO){t.anisotropy=AA_ANISO;t.needsUpdate=true;}}});}
setInterval(()=>{try{aaFixScene(scene)}catch(e){}},1500);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const SKY=new THREE.Color(0x8fb4c9),FOG=new THREE.Fog(0x8fb4c9,90,260);
scene.background=SKY;scene.fog=FOG;
const camera=new THREE.PerspectiveCamera(55,1,0.1,600);
const hemi=new THREE.HemisphereLight(0xdfeeff,0x5a4a2c,0.85);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe6c0,1.15);sun.position.set(40,70,25);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:200});sun.shadow.bias=-0.0006;scene.add(sun);
for(const l of [hemi,sun])for(let i=1;i<=7;i++)l.layers.enable(i);
/* портреты в рамках рисуются живыми: отдельный маленький рендерер смотрит на голову модели (слои 1 и 2) */
let porR=null;try{porR=new THREE.WebGLRenderer({alpha:true,antialias:true});porR.setPixelRatio(1);porR.setSize(128,128,false);porR.outputEncoding=THREE.sRGBEncoding;}catch(e){porR=null}
const porCam=new THREE.PerspectiveCamera(30,1,.05,30);

const ARENA_R=37;
const ASSETS={human:null,arena:null,floor:null,pillar:null,tex:{},gear:{},cm:{}};
let arenaGroup=null,PILLARS=[];
/* настоящая карта арены из клиента (сейчас Награнд): геометрия, высота пола, стены, линия обзора.
   Сетка 0.5 ярда: floor — высота пола, block — до какой высоты клетка закрывает обзор, ceil — потолок (для камеры),
   sdf — расстояние до ближайшей стены (внутри арены плюс, в стене минус) */
let MAP=null;
function mapLoad(url){
  return fetch(url).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer()}).then(buf=>{
    const n=new DataView(buf).getUint32(0,true),H=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,n))),B0=4+n;
    const arr=(T,o)=>new T(buf.slice(B0+o[0],B0+o[0]+o[1]));
    const g=H.grid,cv=a=>{const f=new Float32Array(a.length);for(let i=0;i<a.length;i++)f[i]=a[i]/100;return f};
    const M={base:url.replace(/[^/]*$/,""),H,groups:H.groups.map(q=>({...q,P:arr(Float32Array,q.pos),N:arr(Int8Array,q.nrm),T:arr(Float32Array,q.uv),I:arr(q.it==="u16"?Uint16Array:Uint32Array,q.idx)})),
      x0:g.x0,z0:g.z0,res:g.res,w:g.w,h:g.h,floor:cv(arr(Int16Array,g.floor)),block:cv(arr(Int16Array,g.block)),ceil:cv(arr(Int16Array,g.ceil)),sdf:cv(arr(Int16Array,g.sdf)),spawns:H.spawns};
    return M;});
}
function mapMesh(M,T){
  const grp=new THREE.Group(),texs={};
  const tex=f=>texs[f]||(texs[f]=new Promise(res=>T.load(M.base+f,t=>{t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());res(t)},undefined,()=>res(null))));
  for(const q of M.groups){
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(q.P,3));geo.setAttribute("normal",new THREE.BufferAttribute(q.N,3,true));
    geo.setAttribute("uv",new THREE.BufferAttribute(q.T,2));geo.setIndex(new THREE.BufferAttribute(q.I,1));
    const add=q.mode===2;
    const mat=add?new THREE.MeshBasicMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})
      :new THREE.MeshLambertMaterial({side:q.side?THREE.DoubleSide:THREE.FrontSide,alphaTest:q.mode===1?.5:0});
    if(q.mode===3)mat.side=THREE.DoubleSide;
    const m=new THREE.Mesh(geo,mat);m.receiveShadow=!add;m.castShadow=q.mode!==3&&!add;m.matrixAutoUpdate=false;grp.add(m);
    tex(q.tex).then(t=>{mat.map=t;mat.needsUpdate=true;});
  }
  return grp;
}
const MAPI=(x,z)=>{const M=MAP;let i=Math.floor((x-M.x0)/M.res),j=Math.floor((z-M.z0)/M.res);if(i<0||j<0||i>=M.w||j>=M.h)return -1;return j*M.w+i};
function mapBil(a,x,z){const M=MAP,fx=(x-M.x0)/M.res-.5,fz=(z-M.z0)/M.res-.5;let i=Math.floor(fx),j=Math.floor(fz);const tx=fx-i,tz=fz-j;
  i=Math.max(0,Math.min(M.w-2,i));j=Math.max(0,Math.min(M.h-2,j));const k=j*M.w+i;
  return (a[k]*(1-tx)+a[k+1]*tx)*(1-tz)+(a[k+M.w]*(1-tx)+a[k+M.w+1]*tx)*tz;}
/* высота пола под точкой: 0 на старой арене */
function groundAt(x,z){if(!MAP)return 0;const k=MAPI(x,z);if(k<0)return 0;
  /* у стены берём только клетки пола, чтобы не залезать на стену */
  if(MAP.sdf[k]<.9){const f=MAP.floor[k];return MAP.sdf[k]>0?f:mapNearFloor(x,z)}
  return mapBil(MAP.floor,x,z);}
function mapNearFloor(x,z){const M=MAP;let best=0,bd=1e9;const i0=Math.floor((x-M.x0)/M.res),j0=Math.floor((z-M.z0)/M.res);
  for(let dj=-4;dj<=4;dj++)for(let di=-4;di<=4;di++){const i=i0+di,j=j0+dj;if(i<0||j<0||i>=M.w||j>=M.h)continue;const k=j*M.w+i;if(M.sdf[k]>0&&di*di+dj*dj<bd){bd=di*di+dj*dj;best=M.floor[k];}}
  return best;}
const GY=(x,z)=>groundAt(x,z);
function mapSdf(x,z){return MAPI(x,z)<0?-50:mapBil(MAP.sdf,x,z)}
/* линия обзора по сетке: луч от груди до груди, клетка закрывает всё ниже своей высоты block */
function mapLos(ax,ay,az,bx,by,bz){
  const dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz),n=Math.ceil(L/.35);
  for(let s=1;s<n;s++){const t=s/n,x=ax+dx*t,z=az+dz*t,y=ay+(by-ay)*t,k=MAPI(x,z);if(k<0)return false;if(y<MAP.block[k])return false;}
  return true;}
/* путь для ботов: A* по сетке 1 ярд по клеткам с запасом от стен */
function mapPath(ax,az,bx,bz){
  const M=MAP,S=2,W=Math.floor(M.w/S),H=Math.floor(M.h/S),cl=1.0;
  const ok=(i,j)=>i>=0&&j>=0&&i<W&&j<H&&M.sdf[(j*S+1)*M.w+i*S+1]>cl;
  const ci=x=>Math.floor((x-M.x0)/(M.res*S)),cx=i=>M.x0+(i+.5)*M.res*S;
  let si=ci(ax),sj=ci(az);const gi=ci(bx),gj=ci(bz);
  if(!ok(si,sj)){/* стоим у стены: ищем ближайшую свободную клетку */let f=null;for(let r=1;r<4&&!f;r++)for(let a=-r;a<=r&&!f;a++)for(const b of [-r,r]){if(ok(si+a,sj+b)){f=[si+a,sj+b];break}if(ok(si+b,sj+a)){f=[si+b,sj+a];break}}if(!f)return null;[si,sj]=f;}
  const N=W*H,gs=new Float32Array(N).fill(1e9),from=new Int32Array(N).fill(-1),open=[];const hh=(i,j)=>Math.hypot(i-gi,j-gj);
  const push=(k,f)=>{open.push([f,k]);let c=open.length-1;while(c>0){const p=(c-1)>>1;if(open[p][0]<=open[c][0])break;[open[p],open[c]]=[open[c],open[p]];c=p;}};
  const pop=()=>{const top=open[0],last=open.pop();if(open.length){open[0]=last;let c=0;for(;;){const l=2*c+1,r=l+1;let m=c;if(l<open.length&&open[l][0]<open[m][0])m=l;if(r<open.length&&open[r][0]<open[m][0])m=r;if(m===c)break;[open[m],open[c]]=[open[c],open[m]];c=m;}}return top};
  const s0=sj*W+si;gs[s0]=0;push(s0,hh(si,sj));let best=s0,bh=hh(si,sj),it=0;
  while(open.length&&it++<20000){const [,k]=pop(),i=k%W,j=(k/W)|0;const h=hh(i,j);if(h<bh){bh=h;best=k;}if(i===gi&&j===gj){best=k;break}
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(!ok(a,b))continue;if(di&&dj&&(!ok(i+di,j)||!ok(i,j+dj)))continue;
      const nk=b*W+a,g=gs[k]+(di&&dj?1.414:1);if(g<gs[nk]){gs[nk]=g;from[nk]=k;push(nk,g+hh(a,b));}}}
  const pts=[];for(let k=best;k>=0&&k!==s0;k=from[k])pts.push({x:cx(k%W),z:cx((k/W)|0)});pts.reverse();return pts;}
function mapClear(ax,az,bx,bz,cl){const dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz),n=Math.ceil(L/.5);for(let s=0;s<=n;s++){const t=n?s/n:0;if(mapSdf(ax+dx*t,az+dz*t)<cl)return false}return true}
/* случайная точка на полу арены (для блуждания ботов) */
function mapRandomPoint(r){for(let k=0;k<60;k++){const a=Math.random()*6.283,d=Math.sqrt(Math.random())*r,x=Math.cos(a)*d,z=Math.sin(a)*d;if(mapSdf(x,z)>2)return {x,z}}return {x:0,z:0}}
function floorTextureFallback(){
  const c=document.createElement("canvas");c.width=c.height=512;const g=c.getContext("2d");g.fillStyle="#9a8360";g.fillRect(0,0,512,512);
  g.strokeStyle="rgba(60,40,20,.5)";g.lineWidth=3;for(let i=0;i<40;i++){g.beginPath();g.moveTo(Math.random()*512,Math.random()*512);g.lineTo(Math.random()*512,Math.random()*512);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
}
/* за воротами тёмный проход вместо неба и травы снаружи */
function gateBackdrops(){if(arenaGroup.userData.gb)return;arenaGroup.userData.gb=1;const mat=new THREE.MeshBasicMaterial({color:0x0b0806});
  /* сплошные ворота Терамора поверх решётки: ширина туннеля, тонкие, стоят на полу */
  const grp=arenaGroup;try{new THREE.GLTFLoader().load("assets/gate/gate.gltf",gl=>{if(grp!==arenaGroup)return;const src=gl.scene,bb=new THREE.Box3().setFromObject(src),sz=bb.getSize(new THREE.Vector3()),c=bb.getCenter(new THREE.Vector3());
    /* прячем решётку из модели арены: её место занимают новые ворота */
    if(MAP.mesh)MAP.mesh.traverse(o=>{if(!o.isMesh)return;const b=new THREE.Box3().setFromObject(o);if(Math.min(Math.abs(b.min.z),Math.abs(b.max.z))>69&&b.max.x-b.min.x<30&&b.min.y<-1&&b.max.y<14)o.visible=false;});
    for(const [z,f] of [[-73.0,0],[72.5,Math.PI]]){const inner=src.clone(true);inner.position.set(-c.x,-bb.min.y,-c.z);inner.traverse(o=>{if(o.isMesh){o.receiveShadow=true;const mm=o.material;o.material=new THREE.MeshLambertMaterial({map:mm.map,side:THREE.DoubleSide,alphaTest:mm.alphaTest||0,transparent:false});}});
      const g=new THREE.Group(),r=new THREE.Group();r.add(inner);r.rotation.y=Math.PI/2;r.scale.set(.6/sz.x,17.6/sz.z,17.6/sz.z);g.add(r);
      g.rotation.y=f;g.position.set(0,GY(0,z+(z<0?1.5:-1.5))-.1,z);grp.add(g);}},undefined,()=>{});}catch(e){}}
function buildArena(){
  if(arenaGroup)scene.remove(arenaGroup);
  arenaGroup=new THREE.Group();const r=ARENA_R;
  if(MAP){PILLARS=[];if(!MAP.mesh)MAP.mesh=mapMesh(MAP,new THREE.TextureLoader());arenaGroup.add(MAP.mesh);gateBackdrops();scene.add(arenaGroup);return}
  const ftex=(ASSETS.floor||floorTextureFallback()).clone();ftex.needsUpdate=true;ftex.wrapS=ftex.wrapT=THREE.RepeatWrapping;ftex.repeat.set(9,9);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(r+3,72),new THREE.MeshStandardMaterial({map:ftex,roughness:.95}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;arenaGroup.add(floor);
  const ring=new THREE.Mesh(new THREE.RingGeometry(5.6,6.1,64),new THREE.MeshBasicMaterial({color:0x9b6b2a,transparent:true,opacity:.55}));ring.rotation.x=-Math.PI/2;ring.position.y=.02;arenaGroup.add(ring);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(400,48),new THREE.MeshStandardMaterial({color:0x4d6b34,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-8.5;arenaGroup.add(ground);
  if(ASSETS.arena){const a=ASSETS.arena.scene;a.position.y=-0.9;a.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});arenaGroup.add(a);}
  else{const wallMat=new THREE.MeshStandardMaterial({color:0x8a7656,roughness:.9,side:THREE.DoubleSide});
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(r+1.5,r+1.5,8,72,1,true),wallMat);wall.position.y=4;arenaGroup.add(wall);}
  PILLARS=[];
  let pmat;
  if(ASSETS.pillar){const t=ASSETS.pillar.clone();t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,2);pmat=new THREE.MeshStandardMaterial({map:t,roughness:.9});}
  else pmat=new THREE.MeshStandardMaterial({color:0x8a7656,roughness:.85});
  for(let i=0;i<4;i++){const an=Math.PI/4+i*Math.PI/2,pr=r*0.43;const p={x:Math.cos(an)*pr,z:Math.sin(an)*pr,r:2.3};PILLARS.push(p);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(p.r,p.r*1.15,10,16),pmat);m.position.set(p.x,5,p.z);m.castShadow=true;m.receiveShadow=true;arenaGroup.add(m);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(p.r*1.35,p.r*1.1,1,16),pmat);cap.position.set(p.x,10.4,p.z);cap.castShadow=true;arenaGroup.add(cap);
    const fire=new THREE.Mesh(new THREE.SphereGeometry(.55,10,8),new THREE.MeshBasicMaterial({color:0xffa040}));fire.position.set(p.x,11.3,p.z);arenaGroup.add(fire);
    const pl=new THREE.PointLight(0xff9a40,.6,22);pl.position.set(p.x,11.5,p.z);arenaGroup.add(pl);}
  scene.add(arenaGroup);
}

function std(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.7},o||{}))}
const BODY_COL={warrior:0x9097a1,mage:0x2f4f9e,rogue:0x2b2b30,paladin:0xc9a74a,priest:0xe8e4da};
function proceduralBody(cls,body){
  const plate=cls==="warrior"||cls==="paladin";
  const skin=std(0xd9a77f),main=plate?std(BODY_COL[cls],{metalness:.6,roughness:.4}):std(BODY_COL[cls]),trim=std(cls==="warrior"?0x9b2c2c:0xc9b26b,{metalness:.4});
  const mk=(geo,mat,x,y,z,parent)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;(parent||body).add(m);return m};
  const legs=[],arms=[];
  for(const s of [-1,1]){const hip=new THREE.Group();hip.position.set(s*.2,.95,0);body.add(hip);mk(new THREE.BoxGeometry(.28,.95,.3),plate||cls==="rogue"?main:std(0x2a2a30),0,-.47,0,hip);legs.push(hip);}
  if(plate||cls==="rogue"){mk(new THREE.BoxGeometry(.85,.85,.48),main,0,1.4,0);mk(new THREE.BoxGeometry(.6,.7,.05),trim,0,1.3,.26);}
  else{mk(new THREE.CylinderGeometry(.32,.6,1.35,14),main,0,.72,0);mk(new THREE.BoxGeometry(.7,.75,.42),main,0,1.42,0);}
  for(const s of [-1,1]){const sh=new THREE.Group();sh.position.set(s*.52,1.72,0);body.add(sh);mk(new THREE.BoxGeometry(.22,.8,.24),main,0,-.4,0,sh);arms.push(sh);}
  mk(new THREE.SphereGeometry(.24,16,12),skin,0,2.03,0);
  const w=new THREE.Group();w.position.set(0,-.8,.1);arms[1].add(w);w.add(weaponMesh(cls));
  return {legs,arms};
}
function weaponMesh(cls){
  const g=new THREE.Group();
  if(cls==="warrior"){const blade=new THREE.Mesh(new THREE.BoxGeometry(.09,1.25,.025),std(0xd8dde3,{metalness:.9,roughness:.25}));blade.position.y=.8;blade.castShadow=true;g.add(blade);
    const guard=new THREE.Mesh(new THREE.BoxGeometry(.36,.07,.08),std(0x8a6a32,{metalness:.5}));guard.position.y=.16;g.add(guard);
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.3,8),std(0x3a2414));g.add(grip);}
  else if(cls==="rogue"){const blade=new THREE.Mesh(new THREE.ConeGeometry(.05,.6,4),std(0xcfd6dd,{metalness:.9,roughness:.2}));blade.position.y=.42;blade.castShadow=true;g.add(blade);
    const guard=new THREE.Mesh(new THREE.BoxGeometry(.2,.05,.06),std(0x333333,{metalness:.6}));guard.position.y=.1;g.add(guard);
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.2,8),std(0x1d140c));g.add(grip);}
  else if(cls==="paladin"){const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.0,8),std(0x5a3f22));shaft.position.y=.35;shaft.castShadow=true;g.add(shaft);
    const head=new THREE.Mesh(new THREE.BoxGeometry(.32,.22,.22),std(0xd9c27a,{metalness:.8,roughness:.3}));head.position.y=.9;head.castShadow=true;g.add(head);}
  else{const staff=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,2.0,8),std(cls==="priest"?0xe6dcc4:0x6b4a2b));staff.position.y=.35;staff.castShadow=true;g.add(staff);
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.11,12,10),new THREE.MeshBasicMaterial({color:cls==="priest"?0xfff2b0:0x9fdcff}));orb.position.y=1.4;g.add(orb);}
  return g;
}
/* перекраска фиолетовой мантии из модели: свой цвет на каждый класс */
const TINT={warrior:{h:358,s:1.1,l:1},rogue:{h:250,s:.15,l:.5},paladin:{h:44,s:1,l:1.15},priest:{h:40,s:.08,l:1.75}};
function hueShiftTexture(src,T){
  try{
    const img=src.image;const w=img.width,h=img.height;const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");
    g.drawImage(img,0,0);const d=g.getImageData(0,0,w,h),p=d.data;
    for(let i=0;i<p.length;i+=4){const r=p[i]/255,gg=p[i+1]/255,b=p[i+2]/255;const mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);let l=(mx+mn)/2;const dd=mx-mn;if(dd<.08)continue;
      const s0=dd/(1-Math.abs(2*l-1));let hh;if(mx===r)hh=((gg-b)/dd)%6;else if(mx===gg)hh=(b-r)/dd+2;else hh=(r-gg)/dd+4;hh*=60;if(hh<0)hh+=360;
      if(hh<235||hh>335)continue;const nh=(hh-285)*.4+T.h;l=Math.min(.95,l*T.l);const s=Math.min(1,s0*T.s);
      const C=(1-Math.abs(2*l-1))*s,X=C*(1-Math.abs(((nh/60)%2)-1)),m=l-C/2;
      const seg=Math.floor(((nh%360)+360)%360/60);const rgb=[[C,X,0],[X,C,0],[0,C,X],[0,X,C],[X,0,C],[C,0,X]][seg];
      p[i]=(rgb[0]+m)*255;p[i+1]=(rgb[1]+m)*255;p[i+2]=(rgb[2]+m)*255;}
    g.putImageData(d,0,0);const t=new THREE.CanvasTexture(c);t.flipY=src.flipY;t.encoding=src.encoding;t.wrapS=src.wrapS;t.wrapT=src.wrapT;return t;
  }catch(e){return null}
}
/* смещения точек крепления экипировки от костей модели (подобраны по снимкам) */
/* раса по классу: андед у разбойника, мага и жреца, остальные люди */
const CM_FILES=["rogue"];/* готовые персонажи из wow.export: тело с бронёй, шлем и наплечники уже на точках крепления */
const UNDEAD_CLS=["rogue","mage","priest"];
const raceSrc=cls=>ASSETS.cm[cls]||(UNDEAD_CLS.includes(cls)&&ASSETS.undead?ASSETS.undead:ASSETS.human);
/* экипировка снята с костей человека: для андеда переводим её в оси и масштаб его костей */
const GEARFIX={};
/* хват андеда: рукоять в кулаке, клинок вдоль линии костяшек от указательного к мизинцу */
function gearFix(slot,bn){if(slot in GEARFIX)return GEARFIX[slot];
  /* сравниваем кости в одной и той же позе (первый кадр стойки), а не в исходной: так оружие у андеда лежит в руке как у человека */
  const pose=A=>{const sc=THREE.SkeletonUtils.clone(A.scene),mx=new THREE.AnimationMixer(sc),c=A.animations.find(x=>x.name==="stand");/* наплечники берут поворот кости плеча андеда (наклон со спиной), оружие — подгон под хват человека */
  if(c&&!/shoulder/.test(slot)){mx.clipAction(c).play();mx.update(0);}sc.updateMatrixWorld(true);return sc};
  const H=pose(ASSETS.human),U=pose(ASSETS.undead);
  const hb=H.getObjectByName(bn),ub=U.getObjectByName(bn);if(!hb||!ub)return GEARFIX[slot]=null;
  const qh=hb.getWorldQuaternion(new THREE.Quaternion()),qu=ub.getWorldQuaternion(new THREE.Quaternion());
  let off=null;if(/Hand/.test(bn)){const f=ub.children.filter(c=>/(Index|Middle|Ring|Pinky)Finger[RL]_p$/.test(c.name));if(f.length){off=new THREE.Vector3();for(const c of f)off.add(c.position);off.multiplyScalar(.45/f.length);}}
  return GEARFIX[slot]={q:qu.invert().multiply(qh),s:hb.getWorldScale(new THREE.Vector3()).x/ub.getWorldScale(new THREE.Vector3()).x,off};}
/* точки крепления наплечников из .skel (SKA1) обеих HD-моделей, в осях кости плеча (исходная поза) */
const ATT_POS={human:{shoulderR:[-.056,.0479,.165],shoulderL:[-.056,.0478,-.165]},undead:{shoulderR:[-.0215,.0773,.1187],shoulderL:[-.0215,.0773,-.1187]}};
const GEAR_OFF={helm:[.02,.17,0],shoulderL:[-.04,-.02,-.14],shoulderR:[-.04,-.02,.14],mainhand:[0,-.05,0],offhand:[0,-.05,0]};
function buildModel(cls,isPlayer,layer){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const m={g,body,legs:null,arms:null,mixer:null,acts:null,base:null,once:null,onceUntil:0,walk:0,swing:0,swingN:0,head:null};
  if(ASSETS.human){
    const SRC=raceSrc(cls),ch=THREE.SkeletonUtils.clone(SRC.scene);ch.rotation.y=-Math.PI/2;body.add(ch);let hand=null,handL=null,spell=null;const bones={};
    const CM=SRC===ASSETS.cm[cls],G=ASSETS.gear[cls],tex=CM?null:(G&&G.tex)||ASSETS.tex[cls];let hair=null;
    m.mats=[];
    ch.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;
      o.material=o.material.clone();if(tex&&o.material.map&&o.material.name==="data-1")o.material.map=tex;m.mats.push(o.material);}
      if(o.name==="humanmale_hd_Hair11")hair=o;
      if(o.name==="bone_HandR")hand=o;if(o.name==="bone_HandL")handL=o;if(o.name==="bone_ShoulderL")bones.shoulderL=o;if(o.name==="bone_ShoulderR")bones.shoulderR=o;if(o.name==="bone_SpellHandR")spell=o;if(o.name==="bone_Head")m.head=o;});
    bones.helm=m.head;bones.mainhand=hand;bones.offhand=handL;
    if(G&&G.scene){
      /* комплект класса: шлем, наплечники и оружие крепятся к костям со смещением точки крепления */
      for(const slot in GEAR_OFF){if(CM&&!/hand/.test(slot))continue;const src=G.scene.getObjectByName(slot),b=bones[slot];if(!src||!b)continue;
        const it=THREE.SkeletonUtils.clone(src);it.position.fromArray(GEAR_OFF[slot]);const race=SRC===ASSETS.human?"human":"undead",ap=!window.NOATT&&ATT_POS[race]&&ATT_POS[race][slot]&&new THREE.Vector3().fromArray(ATT_POS[race][slot]);if(SRC!==ASSETS.human){const k=gearFix(slot,b.name);if(k){it.position.applyQuaternion(k.q).multiplyScalar(k.s);if(k.off)it.position.add(k.off);it.quaternion.premultiply(k.q);it.scale.multiplyScalar(k.s);}}if(ap)it.position.copy(ap);
        it.traverse(o=>{if(o.isMesh){o.castShadow=true;o.material=o.material.clone();m.mats.push(o.material);}});b.add(it);}
      if(hair&&cls!=="rogue")hair.visible=false;
    }else{
      if(hand){const w=weaponMesh(cls);w.rotation.set(0,0,-Math.PI/2);hand.add(w);}
      if(handL&&cls==="rogue"){const w=weaponMesh(cls);w.rotation.set(0,0,-Math.PI/2);handL.add(w);}
    }
    m.spellBone=spell||hand;m.handL=handL;
    m.mixer=new THREE.AnimationMixer(ch);m.acts={};for(const c of SRC.animations)m.acts[c.name]=m.mixer.clipAction(c);
    setBase(m,"stand");
  }else{Object.assign(m,proceduralBody(cls,body));}
  const sheep=new THREE.Group();sheep.visible=false;g.add(sheep);
  {const wool=std(0xf2efe8,{roughness:1});const m1=new THREE.Mesh(new THREE.SphereGeometry(.7,14,12),wool);m1.scale.set(1,.8,1.3);m1.position.y=.9;m1.castShadow=true;sheep.add(m1);
   const h=new THREE.Mesh(new THREE.SphereGeometry(.28,10,10),std(0x2a2522));h.position.set(0,1.15,.9);sheep.add(h);
   for(const s of [-1,1])for(const z of [-.5,.5]){const l=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.5),std(0x2a2522));l.position.set(s*.35,.25,z);sheep.add(l);}}
  layer=layer||(isPlayer?1:2);m.layer=layer;g.traverse(o=>o.layers.enable(layer));
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.0,1.25,40),new THREE.MeshBasicMaterial({color:isPlayer?0x5fd36e:0xe05a4f,transparent:true,opacity:.85,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.04;g.add(ring);
  const stars=new THREE.Group();stars.position.y=2.45;stars.visible=false;g.add(stars);
  {const sw=new THREE.Mesh(tileGeo(FXT.swirl),fxMat(0xffd85a,.9));sw.rotation.x=-Math.PI/2;sw.scale.setScalar(.6);stars.add(sw);}
  const ice=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.05,.9,10),new THREE.MeshStandardMaterial({color:0x9fe0ff,transparent:true,opacity:.5,roughness:.1}));ice.position.y=.45;ice.visible=false;g.add(ice);
  /* кристаллы кольца льда и ледяная глыба из клиента, если загрузились */
  const iceM=fxModel("nova",1.5),blockM=fxModel("iceblock",.62);
  if(iceM){iceM.visible=false;g.add(iceM);}if(blockM){blockM.position.y=.56;blockM.visible=false;g.add(blockM);}
  /* щиты и пузыри — плоские картинки, всегда повёрнутые к камере */
  const fx=new THREE.Group();scene.add(fx);
  const wall=billboard(FXT.rune,3.2,0x5f8fff,.7),shield=billboard(FXT.bubble,3.1,0xffc040,.6),bubble=billboard(FXT.bubble,3.6,0xffe090,.5),glow=billboard(FXT.glow,.9,0x86ccff,1);
  for(const b of [wall,shield,bubble,glow]){scene.remove(b);fx.add(b);}
  const fear=new THREE.Group();fear.visible=false;g.add(fear);
  const castRune=new THREE.Mesh(tileGeo(FXT.rune),fxMat(0x86ccff,.8));castRune.rotation.x=-Math.PI/2;castRune.position.y=.07;castRune.scale.setScalar(1.3);castRune.visible=false;g.add(castRune);
  m.fx=fx;m.iceM=iceM;m.blockM=blockM;m.castRune=castRune;
  Object.assign(m,{sheep,stars,ice,wall,shield,bubble,fear,glow});
  return m;
}
/* анимации. Базовая петля (стойка, бег, прыжок, сидя) играет всегда с весом 1, разовые движения ложатся поверх с большим весом.
   На бегу и в прыжке удары и касты берутся в «верхней» версии: только кости от поясницы вверх, ноги продолжают бежать */
const ONCE_W=12;
function setBase(m,name){
  if(!m.acts||m.base===name||!m.acts[name])return;
  const prev=m.base&&m.acts[m.base],a=m.acts[name];
  if(m.once===a){m.once=null;m.onceUp=false;}
  a.reset().setLoop(THREE.LoopRepeat,Infinity);a.weight=1;a.fadeIn(.18);a.play();
  if(prev)prev.fadeOut(.18);
  m.base=name;
}
function playOnce(m,name,speed,hold,layer){
  if(!m.acts)return;const nm=layer&&m.acts[name+"_up"]?name+"_up":name;const a=m.acts[nm];if(!a||a===m.acts[m.base])return; /* та же анимация, что и базовая: не трогаем, иначе endOnce погасит базу (Т-поза) */
  if(m.once&&m.once!==a)m.once.fadeOut(.08);
  a.reset().setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.setEffectiveTimeScale(speed||1);a.weight=ONCE_W;a.fadeIn(.08);a.play();
  m.once=a;m.onceUp=nm!==name;m.onceUntil=hold?Infinity:now+a.getClip().duration/(speed||1)-.12;
}
function endOnce(m){if(!m.once)return;if(m.once!==m.acts[m.base])m.once.fadeOut(.15);m.once=null;m.onceUp=false;}
const UPPER_CLIPS=["attack","attack2","attackoff","kick","cast","castomni","roar","shieldbash","special","attackpierce","specialunarmed","attackunarmed","emoteroar","usestandend","shieldblock","throw"];
function makeUpperClips(g){
  let root=null;g.scene.traverse(o=>{if(o.name==="bone_SpineLow")root=o;});if(!root)return;
  const set=new Set();root.traverse(o=>set.add(o.name));
  for(const n of UPPER_CLIPS){const c=g.animations.find(a=>a.name===n);if(!c)continue;
    g.animations.push(new THREE.AnimationClip(n+"_up",c.duration,c.tracks.filter(t=>set.has(t.name.slice(0,t.name.lastIndexOf("."))))));}
}
function setOpacity(m,op){if(!m.mats||m.op===op)return;m.op=op;for(const x of m.mats){x.transparent=op<1;x.opacity=op;x.depthWrite=op>=1;x.needsUpdate=true;}}

/* ================= СОСТОЯНИЕ ================= */
let now=0,state="menu",player=null,enemy=null,bot=null,units=[],bots=[],countEnd=0,roundStart=0,roundEnd=0;
const projectiles=[],fxs=[],texts=[],zones=[];
/* SRV: страница запущена на нашем сервере без графики и сама ведёт бой как хост; людей в ней нет, все игроки — гости */
const SRVQ=new URLSearchParams(location.search),SRV=SRVQ.has("srv");
/* форматы боя: размер команды и сдвиг бойцов поперёк туннеля */
const MODES=[["1v1","1 на 1"],["2v2","2 на 2"],["3v3","3 на 3"]];
const normMode=m=>MODES.some(x=>x[0]===m)?m:"1v1";
const TSIZE=m=>m==="3v3"?3:m==="2v2"?2:1;
const modeName=m=>(MODES.find(x=>x[0]===m)||MODES[0])[1];
const latOf=(slot,S)=>S===1?0:S===2?(slot?2.5:-2.5):[-3.5,0,3.5][slot]||0;
const settings={nick:"",mode:"1v1",acls:"priest",acls2:"mage",ecls2:"rogue",ecls3:"paladin",pcls:"warrior",ecls:"mage",diff:"normal",poisonMH:"deadly",poisonOH:"crip"};
try{if(!SRV)Object.assign(settings,JSON.parse(store.get("arena-settings")||"{}"));}catch(e){}
if(SRV){settings.mode=normMode(SRVQ.get("mode"));settings.nick=SRVQ.get("nick")||"Сервер";}
if(!CLASSES.includes(settings.pcls))settings.pcls="warrior";if(!CLASSES.includes(settings.ecls))settings.ecls="mage";if(!CLASSES.includes(settings.acls))settings.acls="priest";if(!CLASSES.includes(settings.ecls2))settings.ecls2="rogue";if(!CLASSES.includes(settings.acls2))settings.acls2="mage";if(!CLASSES.includes(settings.ecls3))settings.ecls3="paladin";settings.mode=normMode(settings.mode);
const DIFF={easy:{label:"Новичок",react:.85,think:.35,talents:false},normal:{label:"Гладиатор",react:.45,think:.2,talents:true},hard:{label:"Чемпион",react:.2,think:.1,talents:true},dummy:{label:"Манекен",react:1,think:1,talents:false,dummy:true}};
let wins={w:0,l:0};try{Object.assign(wins,JSON.parse(store.get("arena-wins")||"{}"));}catch(e){}
function botTalents(cls){return DIFF[settings.diff].talents?autoBuild(cls,PRESETS[cls][BOT_PRESET[cls]]):{}}

class Unit{
  constructor(cls,isPlayer,x,z,talents,o={}){
    const c=B[cls];this.cls=cls;this.isPlayer=isPlayer;this.team=o.team??(isPlayer?0:1);this.talents=talents||{};this.K=buildK(this);this.resType=c.res;
    this.name=isPlayer?(cleanNick(settings.nick)||"Вы"):c.name+" (бот)";
    this.maxHp=Math.round(c.hp*(1+(tv(this,"arcaneFort")+this.K.hp)/100));this.hp=this.maxHp;
    this.maxRes=Math.round((c.maxRes+this.K.res)*(1+(tv(this,"arcaneMind")+this.K.resPct)/100));this.res=c.res==="rage"?c.startRes:this.maxRes;
    this.pos=new THREE.Vector3(x,0,z);this.vel=new THREE.Vector2();this.y=GY(x,z);this.pos.y=this.y;this.vy=0;this.air=false;this.airVel=new THREE.Vector2();
    this.facing=0;this.moveDir=new THREE.Vector2();this.moving=false;this.moveLocal="run";this.cp=0;this.lastHit={};
    this.auras=[];this.cds={};this.gcdUntil=0;this.cast=null;this.dr={};this.swingAt=0;this.foodUsed=0;this.alive=true;this.charging=null;
    this.combatUntil=0;this.eating=null;this.stance=cls==="warrior"?"battle":null;this.opUntil=0;this.revUntil=0;this.lsAmt=0;this.ohNext=false;
    this.stats={dmg:0,cc:0,interrupts:0,crits:0,heal:0};this.model=buildModel(cls,o.friendly??isPlayer,o.layer||(isPlayer?1:2));scene.add(this.model.g);
    this.abilities=abilityList(this);
  }
  dispose(){scene.remove(this.model.g);scene.remove(this.model.glow);if(this.model.fx)scene.remove(this.model.fx);}
}
/* враги юнита: живые из другой команды. Цель держится, пока жива; иначе берётся ближайший живой враг */
const foes=u=>units.filter(x=>x.team!==u.team&&x.alive);
const allies=u=>units.filter(x=>x.team===u.team);
function setTarget(u,t){u.target=t;if(u===player)enemy=t;}
function other(u){
  if(!u)return null;const t=u.target;if(t&&t.alive&&t.team!==u.team)return t;
  let best=null,bd=1e9;for(const f of units)if(f.team!==u.team&&f.alive){const d=dist(u,f)+(u===player||canSee(u,f)?0:100);if(d<bd){bd=d;best=f;}}
  if(best){setTarget(u,best);return best}
  return t||units.find(f=>f.team!==u.team)||null;
}
/* цель для лечения и защиты: союзник, выбранный игроком или ботом, иначе вы сами */
function healTarget(u){const f=u.friend;return f&&f!==u&&f.alive&&f.team===u.team?f:u}
const F=u=>u.allyNow||u;
const ALLY_RANGE=()=>B.general.allyRange||40;
function teamDead(team){return !units.some(x=>x.team===team&&x.alive&&!x.spirit)}
const dist=(a,b)=>Math.hypot(a.pos.x-b.pos.x,a.pos.z-b.pos.z);
const aura=(u,type)=>u.auras.find(a=>a.type===type&&a.until>now);
const has=(u,type)=>!!aura(u,type);
const auraNamed=(u,name)=>u.auras.find(a=>a.name===name&&a.until>now);
const incap=u=>has(u,"stun")||has(u,"incap")||has(u,"fear")||has(u,"iceblock");
const rooted=u=>!!u.spirit||has(u,"root")&&!has(u,"freedom");
const isImmune=u=>!!u.spirit||has(u,"immune")||has(u,"iceblock");
const stealthed=u=>has(u,"stealth");
const inCombat=u=>now<(u.combatUntil||0);
function enterCombat(...us){for(const u of us)if(u)u.combatUntil=now+B.general.combatDrop;}
function breakStealth(u){if(!stealthed(u))return;u.auras=u.auras.filter(a=>a.type!=="stealth");u.cds.stealth=now+eff(u,"stealth").cd;}
/* видит ли наблюдатель o юнита s: разбойника в скрытности замечают только вблизи, спереди дальше, чем сзади */
function canSee(o,s){if(!stealthed(s)||o.team===s.team)return true;const G=B.general.stealth,d=dist(o,s),k=1-tv(s,"masterDec")/100;return d<G.back*k||(d<G.front*k&&inFront(o,s))}
function slowPct(u){if(has(u,"freedom"))return 0;let m=0;for(const a of u.auras)if(a.type==="slow"&&a.until>now)m=Math.max(m,a.pct);return m}
function addAura(u,a){u.auras=u.auras.filter(x=>x.name!==a.name);if(!a.good&&a.dt===undefined)a.dt="magic";u.auras.push(a);}
function lockedSchool(u,school){return u.auras.some(a=>a.type==="lockout"&&a.until>now&&a.school===school)}
function inFront(u,t){const an=Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z);let d=an-u.facing;d=Math.atan2(Math.sin(d),Math.cos(d));return Math.abs(d)<=Math.PI/2+.05}
function inCone(u,t,half){const an=Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z);let d=an-u.facing;d=Math.atan2(Math.sin(d),Math.cos(d));return Math.abs(d)<=half}
const behind=(u,t)=>!inFront(t,u);
function dodgeChance(t){const ev=aura(t,"evasion"),gs=aura(t,"ghostly");return (B[t.cls].dodge||0)+t.K.dodge+(ev?ev.pct:0)+(gs?gs.pct:0)+(tv(t,"anticip")+tv(t,"anticipation"))*.04}
/* промах и парирование в ближнем бою: базово 5% промаха, парируют воин, разбойник и паладин, только спереди и с оружием в руках */
/* броня: снижение физического урона как в 1.12, броня/(броня+5500); кровотечения броню игнорируют */
function devArmor(t){const p=pauraOn(t,"devotion");return p?ab("paladin","devotion").armor*(1+tv(p,"impDevotion")/100):0}
function armorOf(t,src){const ex=aura(t,"expose"),inf=aura(t,"innerfire"),ins=aura(t,"inspire"),su=aura(t,"sunder"),dw=aura(t,"dwish");return Math.max(0,((B[t.cls].armor||0)*(1+(tv(t,"pTough")+tv(t,"toughness"))/100+(ins?ins.pct/100:0))+(inf?inf.armor:0)+devArmor(t))*(dw?1-dw.armor/100:1)-(ex?ex.amount:0)-(su?su.stacks*su.armor:0)-(src?rk(src,"serrated")*187:0))}
function meleeHit(s){return tv(s,"rPrecision")+tv(s,"weaponExp")+tv(s,"pPrecision")}
function parryChance(t){if(has(t,"disarm"))return 0;return (B.general.parry[t.cls]||0)+tv(t,"rDeflection")+tv(t,"pDeflect")+tv(t,"deflection")}

function segBlocked(ax,az,bx,bz){
  for(const p of PILLARS){const dx=bx-ax,dz=bz-az,L=dx*dx+dz*dz;let t=L?((p.x-ax)*dx+(p.z-az)*dz)/L:0;t=Math.max(0,Math.min(1,t));
    if(Math.hypot(ax+dx*t-p.x,az+dz*t-p.z)<p.r+.15)return p;}
  return null;
}
const los=(a,b)=>MAP?mapLos(a.x,(a.y||0)+1.5,a.z,b.x,(b.y||0)+1.5,b.z):!segBlocked(a.x,a.z,b.x,b.z);
function collide(p){
  if(MAP){/* выталкиваем из стен по градиенту расстояния до стены */const R=.7,e=.25;
    for(let k=0;k<3;k++){const d=mapSdf(p.x,p.z);if(d>=R)return;let gx=mapSdf(p.x+e,p.z)-mapSdf(p.x-e,p.z),gz=mapSdf(p.x,p.z+e)-mapSdf(p.x,p.z-e);const gl=Math.hypot(gx,gz);
      if(gl<1e-5){p.x*=.98;p.z*=.98;continue}p.x+=gx/gl*(R-d);p.z+=gz/gl*(R-d);}
    return}
  for(const pl of PILLARS){const dx=p.x-pl.x,dz=p.z-pl.z,d=Math.hypot(dx,dz),m=pl.r+.7;if(d<m&&d>1e-4){p.x=pl.x+dx/d*m;p.z=pl.z+dz/d*m;}}
  const r=Math.hypot(p.x,p.z),M=ARENA_R-1;if(r>M){p.x*=M/r;p.z*=M/r;}
}
const inside=(x,z)=>MAP?mapSdf(x,z)>1.2:Math.hypot(x,z)<ARENA_R-1.5&&!PILLARS.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+.9);

/* ================= БОЙ ================= */
/* ворота открылись: здоровье и мана полные, траты на бафы в подготовке бесплатны */
function prepEnd(){for(const u of units)if(u.alive){u.hp=u.maxHp;if(u.resType==="mana")u.res=u.maxRes;}}
function blackoutProc(src,t){if(t.hp>0&&t.alive&&Math.random()*100<tv(src,"blackout"))cc(src,t,"stun",3,"Затмение",{drc:"rstun"});}
const PREP_BAN=["blink","charge","intercept","vanish","sprint","iceblock","divineshield","fear","psychicscream","frostnova","howl","thunderclap","whirlwind","cleave","consecration","holynova"];
function canUse(u,id,ui){
  const a=eff(u,id),m=META[id],t=other(u),free=m.freeCC||[];
  /* подготовка перед боем: можно только бафы без цели и лечение союзников, без перемещений */
  if(state==="countdown"){if(m.target||a.dmg||a.radius&&!m.ally||PREP_BAN.includes(id))return "Бой ещё не начался";}
  else if(state!=="fight")return "Бой ещё не начался";
  if(!u.alive)return "Вы погибли";
  if(u.spirit&&!(m.ally||a.heal))return "Дух может только лечить";
  if(has(u,"iceblock")&&id!=="iceblock")return "Вы в ледяной глыбе";
  if(has(u,"incap")&&!free.includes("incap"))return "Вы выведены из строя";
  if(has(u,"fear")&&!free.includes("fear"))return "Вы в страхе";
  if(has(u,"stun")&&!free.includes("stun"))return "Вы оглушены";
  if(m.school!=="phys"&&has(u,"silence")&&!free.includes("silence"))return "Вы под безмолвием";
  if(m.school!=="phys"&&lockedSchool(u,m.school)&&!free.includes("lockout"))return `Школа «${SCHOOL_NAME[m.school]}» заблокирована`;
  if(m.school==="holy"&&!m.sfOk&&has(u,"shadowform"))return "Нельзя в Облике Тьмы";
  if(m.school==="phys"&&u.auras.some(x=>x.noAtk&&x.until>now))return "Нельзя под Божественной защитой";
  if(m.paura&&u.paura===id)return "Аура уже активна";
  if(!ui&&u.cast)return "Вы уже произносите заклинание";
  if(!ui&&u.charging)return "Вы в рывке";
  if(m.st&&!m.st.includes(u.stance))return "Нужна стойка: "+m.st.map(s=>STANCE_NAME[s]).join(" или ");
  if(!ui&&(u.cds[id]||0)>now)return "Способность ещё не готова";
  if(!ui&&m.gcd!==false&&u.gcdUntil>now)return "Способность ещё не готова";
  if((a.cost||0)>u.res)return "Не хватает "+RES_NAME[u.resType];
  if(m.finisher&&!(u.cp>0))return "Нет приёмов серии";
  if(m.ooc&&inCombat(u))return "Только вне боя";
  if(m.once&&u.lohUsed)return "Уже использовано в этом бою";
  if(id==="food"&&(u.foodUsed||0)>=B.common.abilities.food.charges)return "Еда закончилась";
  const ft=m.ally?healTarget(u):u;
  if(m.forbear&&has(ft,"forbear"))return ft===u?"Воздержанность: пока нельзя":"На союзнике Воздержанность";
  if(ft!==u){if(dist(u,ft)>ALLY_RANGE())return "Союзник слишком далеко";if(!los(u.pos,ft.pos))return "Союзник вне поля зрения";}
  if(m.needSeal&&!has(u,"seal"))return "Нет активной печати";
  if(id==="pws"&&has(ft,"ws"))return "Ослабленная душа: пока нельзя";
  if(m.stealthOnly&&!stealthed(u))return "Нужна скрытность";
  if(id==="food"&&(u.moving||u.air))return "Нельзя есть на ходу";
  if(id==="overpower"&&now>=u.opUntil)return "Цель не уклонялась";
  if(id==="revenge"&&now>=(u.revUntil||0))return "Сначала нужно заблокировать, уклониться или парировать";
  if(id==="riposte"&&now>=u.opUntil)return "Сначала нужно парировать удар";
  if((a.cast||a.channel)&&(u.moving||u.air)&&!B.general.castWhileMoving&&!(a.cast&&pomReady(u)))return u.air?"Нельзя читать заклинание в прыжке":"Нельзя читать заклинание на ходу";
  if(m.target&&!(id==="holyshock"&&u.healMode)){
    if(!t||!t.alive||!canSee(u,t))return "Нет цели";
    const d=dist(u,t);
    if(a.range&&d>a.range+B.general.reach)return "Слишком далеко";
    if(a.minRange&&d<a.minRange)return "Слишком близко";
    if(!los(u.pos,t.pos))return "Цель вне поля зрения";
    if(u.isPlayer&&!u.bot&&(a.cast||a.channel||!a.range||a.range<=B.general.meleeRange)&&!inFront(u,t))return "Цель должна быть перед вами";
    if(m.behind&&!behind(u,t))return "Нужно быть за спиной цели";
    if(id==="sap"&&inCombat(t))return "Цель в бою";
    if(id==="execute"&&t.hp/t.maxHp*100>=a.hp)return "Цель ещё слишком здорова";
    if(id==="wrath"&&t.hp/t.maxHp*100>a.hpPct)return "Цель ещё слишком здорова";
    if(id==="manaburn"&&t.resType!=="mana")return "У цели нет маны";
    if(m.school==="phys"&&id!=="blind"&&has(u,"bop"))return "Под Благословением защиты нельзя бить";
  }
  if((id==="charge"||id==="intercept")&&rooted(u))return "Вы обездвижены";
  return null;
}
const pomReady=u=>has(u,"pom");
function tryUse(u,id){
  if(NET.role==="client"&&u===player){if(!(id==="iceblock"&&has(u,"iceblock"))){const err=canUse(u,id);if(err){showErr(err);return false}}if(NET.tx)NET.tx.send({t:"use",id});return true}
  if(id==="iceblock"&&has(u,"iceblock")){u.auras=u.auras.filter(a=>a.type!=="iceblock");log(u,"Выход из ледяной глыбы");return true}
  let err=canUse(u,id);
  /* бот сам останавливается, чтобы начать каст */
  if(err&&u.bot&&u.moving&&!u.air){u.moving=false;u.moveDir.set(0,0);err=canUse(u,id);}
  if(err){if(u.isPlayer)showErr(err);return false}
  const a=eff(u,id),m=META[id],t=other(u);
  if(m.gcd!==false)u.gcdUntil=now+B.general.gcd;
  if(u.eating&&id!=="food"){u.eating=null;u.auras=u.auras.filter(x=>x.type!=="eat");}
  if(a.channel){pay(u,id,a,m,t);u.cast={id,start:now,end:now+a.channel,target:t,channel:true,tick:0,nextTick:now+a.channel/a.ticks};sfxUse(u,id);castFx(u,m.target?"channel":"channelomni");return true}
  if(a.cast){
    if(pomReady(u)&&a.cast<10){u.auras=u.auras.filter(x=>x.type!=="pom");statusText(u,"Присутствие разума","#d7b0ff");finish(u,id,t);return true}
    const nb=aura(u,"numb");const ct=a.cast*(nb?1+nb.pct/100:1);
    u.cast={id,start:now,end:now+ct,target:t,ally:m.ally?healTarget(u):null};return true}
  finish(u,id,t);return true;
}
/* оплата способности: ресурс, восстановление, выход из скрытности, вход в бой */
function pay(u,id,a,m,t){
  if(u.cls==="mage"&&a.cost===0&&has(u,"clearcast")&&ab(u.cls,id).cost)u.auras=u.auras.filter(x=>x.type!=="clearcast");
  if(u.cls==="priest"&&id!=="innerfocus"&&has(u,"ifocus")&&ab(u.cls,id).cost){u.auras=u.auras.filter(x=>x.type!=="ifocus");u.ifNow=true;}
  if(!m.costOnHit&&!u.spirit)u.res-=(a.cost||0);
  /* правило пяти секунд 1.12: после траты маны дух не восстанавливает её 5 с */
  if(u.resType==="mana"&&a.cost>0)u.fsrUntil=now+B.general.fsr;
  if(a.cd&&!m.cdOnBreak)u.cds[id]=now+a.cd;
  if(!m.keepStealth)breakStealth(u);
  if((m.target||m.hostile)&&!m.noCombat){enterCombat(u);if(m.target&&t)enterCombat(t);}
}
function finish(u,id,t,ally){
  const a=eff(u,id),m=META[id];u.allyNow=m.ally?(ally&&ally.alive?ally:healTarget(u)):null;
  pay(u,id,a,m,t);u.lastHit={};
  if(m.target&&m.school==="phys"&&t&&has(t,"bop")&&id!=="blind"){statusText(t,"Невосприимчив","#cfd6df");logRaw(`<b>${u.name}</b>: ${a.name} — цель под защитой от физического урона`);}
  else{fxSpell=id;fxLaunched=false;try{m.exec(u,t,a);}finally{fxSpell=null;}sfxUse(u,id);useFx(u,id);
    spellVis(u,id,"cast");if(!fxLaunched){const it=m.ally?(u.allyNow||u):m.target?t:u;if(it)spellVis(it,id,"impact");}}
  if(u.cls==="mage"&&ab(u.cls,id).cost&&Math.random()*100<tv(u,"clearcast"))addAura(u,{type:"clearcast",name:"Ясность мысли",until:now+15,good:true});
  u.allyNow=null;u.ifNow=false;
  if(u.isPlayer)flashBtn(id);
}
/* урон сбивает время чтения: каст откладывается (1 с, потом меньше), канал теряет четверть длительности */
function pushback(u){const c=u.cast,m=META[c.id],sc=m.school;if(sc==="phys")return;
  if(u.cls==="priest"&&(aura(u,"absorb")||has(u,"fcast")||(m.ally&&Math.random()*100<tv(u,"healingFocus"))))return;if((c.id==="flashlight"||c.id==="holylight")&&Math.random()*100<tv(u,"spFocus"))return;{const ca=pauraOn(u,"conc");if(ca&&Math.random()*100<ab("paladin","conc").pct+tv(ca,"impConc"))return;}
  if(u.cls==="mage"&&((sc==="fire"&&Math.random()*100<tv(u,"burningSoul"))||(c.id==="missiles"&&Math.random()*100<tv(u,"impMissiles"))))return;
  const G=B.general;c.pb=(c.pb||0)+1;
  if(c.channel){const a=eff(u,c.id);c.end-=a.channel*G.channelPushback/100;if(c.end<=now)u.cast=null;}
  else{const d=G.pushback[Math.min(c.pb,G.pushback.length)-1]||0;c.end=Math.min(c.end+d,now+(c.end-c.start));}}
function cancelCast(u,why){if(!u.cast)return;const nm=ab(u.cls,u.cast.id).name;u.cast=null;castFailU(u,why||"Прервано");if(why){log(u,`${nm}: ${why}`);if(u.isPlayer)showErr(why);}}
function interrupt(u,t,a){
  if(t.cast&&META[t.cast.id].school!=="phys"){
    const sc=META[t.cast.id].school,nm=ab(t.cls,t.cast.id).name;t.cast=null;castFailU(t,"Прервано");
    addAura(t,{type:"lockout",school:sc,name:`Блокировка: ${SCHOOL_NAME[sc]}`,until:now+a.lockout,dt:"none"});
    if(rk(u,"impCounter")&&Math.random()*100<tv(u,"impCounter"))addAura(t,{type:"silence",name:"Безмолвие",until:now+4,dt:"magic"});
    u.stats.interrupts++;statusText(t,"Прервано","#ffd100");logRaw(`<b>${u.name}</b>: ${a.name} сбивает «${nm}»`);
  }else{logRaw(`<b>${u.name}</b>: ${a.name}, но прерывать нечего`);}
}
const CC_NAME={poly:"Превращение",sap:"Ошеломление",gouge:"Парализующий удар",kidney:"Удар по почкам",blind:"Ослепление",repent:"Покаяние",rstun:"Случ. оглушение",stun:"Оглушение",root:"Обездвиж.",incap:"Выведен из строя",fear:"Страх"};
function cc(src,t,type,dur,name,o){
  o=o||{};
  if(isImmune(t)){statusText(t,"Невосприимчив","#cfd6df");return false}
  if(type==="root"&&has(t,"freedom")){statusText(t,"Невосприимчив","#cfd6df");return false}
  if((type==="fear"||type==="incap")&&has(t,"zerk")){statusText(t,"Невосприимчив","#cfd6df");return false}
  if(type==="fear"&&(has(t,"reckless")||has(t,"dwish"))){statusText(t,"Невосприимчив","#cfd6df");return false}
  if((type==="fear"||type==="incap")&&rk(t,"unyielding")&&Math.random()*100<tv(t,"unyielding")){statusText(t,"Сопротивление","#cfd6df");logRaw(`${t.name} сопротивляется: ${name}`);return false}
  if((type==="stun"||type==="fear")&&rk(t,"unbreakableWill")&&Math.random()*100<tv(t,"unbreakableWill")){statusText(t,"Сопротивление","#cfd6df");logRaw(`${t.name} сопротивляется: ${name}`);return false}
  if(type==="stun"&&rk(t,"ironWill")&&Math.random()*100<tv(t,"ironWill")){statusText(t,"Сопротивление","#cfd6df");logRaw(`${t.name} сопротивляется: ${name}`);return false}
  dur*=1-(t.K.ccDur||0)/100;
  const G=B.general,dk=o.drc||type,d=t.dr[dk],lvl=(!o.noDr&&d&&now<d.reset)?d.level:0;
  const mult=G.drSteps[Math.min(lvl,G.drSteps.length-1)];
  if(!(mult>0)){statusText(t,"Иммунитет","#cfd6df");logRaw(`${name}: ${t.name} невосприимчив (убывание)`);return false}
  const real=dur*mult;
  addAura(t,{type,name,until:now+real,breakOnDmg:type==="incap",src,left:type==="fear"?(o.breakAny?1:t.maxHp*G.fearBreak):0,blind:!!o.breakAny,dt:o.dt||CC_DT[name]||"none"});
  if(!o.noDr)t.dr[dk]={level:lvl+1,reset:now+real+G.drWindow};
  src.stats.cc+=real;
  if(type!=="root"){cancelCast(t);t.charging=null;t.eating=null;}
  breakStealth(t);
  if(!o.noCombat)enterCombat(src,t);
  statusText(t,name,"#ffd100");
  logRaw(`<b>${src.name}</b>: ${name} на ${t.name}, ${real.toFixed(1)} с${mult<1?` (${Math.round(mult*100)}%)`:""}`);
  return true;
}
function dmgMult(s,school,o){
  let m=1;const K=s.K;
  if(s.cls==="warrior"){if(o.melee||o.auto)m*=1+(tv(s,"twoHandedWeaponSpecialization")+tv(s,"oneHandedWeaponSpecialization"))/100;
    const en=aura(s,"enrage");if(en&&(o.melee||o.auto))m*=1+en.pct/100;const dw=aura(s,"dwish");if(dw&&school==="phys")m*=1+dw.pct/100;
    if(s.stance==="defensive")m*=1-B.warrior.abilities.defensive.dealt/100;}
  else if(s.cls==="mage"){m*=1+tv(s,"instability")/100;if(school==="fire")m*=1+tv(s,"firePower")/100;if(school==="frost")m*=1+tv(s,"piercingIce")/100;
    const ap=aura(s,"apower");if(ap)m*=1+ap.pct/100;}
  else if(s.cls==="rogue"){if(o.id==="sinister"||o.id==="eviscerate")m*=1+tv(s,"aggression")/100;if(o.id==="backstab"||o.id==="garrote"||o.id==="ambush")m*=1+tv(s,"opportunity")/100;
    if(o.id==="rupture")m*=1+tv(s,"serrated")/100;if(o.auto&&s.ohNext)m*=1+tv(s,"dwSpec")/100;}
  m*=(1+K.dmg/100)*(1+(K.school[school]||0)/100)*(1+(K.ap[o.auto?"auto":o.id]||0)/100);
  const pi=aura(s,"pi");if(pi&&school!=="phys")m*=1+pi.pct/100;
  if(school==="holy"&&pauraOn(s,"sanctaura"))m*=1+ab("paladin","sanctaura").pct/100;if(blessOf(s,"kings"))m*=1.03;
  const vg=aura(s,"veng");if(vg&&(school==="phys"||school==="holy"))m*=1+vg.pct/100;
  const wk=aura(s,"weak");if(wk)m*=1-wk.pct/100;
  const sf=aura(s,"shadowform");if(sf&&school==="shadow")m*=1+sf.dmg/100;
  if(s.cls==="priest"&&school!=="phys"){m*=1+tv(s,"forceOfWill")/100;if(o.id==="smite"||o.id==="holyfire")m*=1+tv(s,"searingLight")/100;}
  const dis=aura(s,"disarm");if(dis&&school==="phys"&&(o.auto||o.melee))m*=1-dis.pct/100;
  return m;
}
function critChance(s,school,t,o){
  let c=B[s.cls].crit+s.K.crit;
  if(s.cls==="warrior"){if(o.id==="overpower")c+=tv(s,"improvedOverpower");if(s.stance==="berserker")c+=B.warrior.abilities.berserker.crit;const rc=aura(s,"reckless");if(rc)c+=rc.crit;}
  else if(s.cls==="mage"){c+=tv(s,"instability");if(school==="fire")c+=tv(s,"criticalMass");if(o.id==="fireblast"||o.id==="scorch")c+=tv(s,"incinerate");
    if(o.id==="explosion")c+=tv(s,"impExplosion");if(o.id==="flamestrike")c+=tv(s,"impFlamestrike");
    const cb=aura(s,"combust");if(cb&&school==="fire"&&o.spell)c+=cb.pct;const wc=aura(t,"wchill");if(wc&&school==="frost")c+=2*wc.stacks;}
  else if(s.cls==="rogue"){if(o.id==="backstab")c+=tv(s,"impBackstab");if(o.id==="ambush")c+=tv(s,"impAmbush");if(o.id==="backstab"||o.id==="ambush"||(o.auto&&s.ohNext))c+=tv(s,"daggerSpec");}
  else if(s.cls==="priest"&&o.spell){if(school==="holy")c+=tv(s,"holySpecialization");if(t&&t.team!==s.team)c+=tv(s,"forceOfWill");if(s.ifNow)c+=ab("priest","innerfocus").crit;}
  else if(s.cls==="paladin"){if(school==="holy"&&o.spell)c+=tv(s,"holyPower");if((o.melee||o.auto)&&school==="phys")c+=tv(s,"conviction");}
  if((o.melee||o.auto)&&t)c-=tv(t,"sleight");
  if(o.ability&&has(s,"coldblood"))c=100;
  if(rooted(t)||has(t,"stun"))c+=tv(s,"shatter");
  return c;
}
function critMult(s,school,o){
  if(o.melee||o.auto)return B.general.meleeCritMult+((o.ability&&s.cls==="warrior"?tv(s,"impale"):0)+s.K.critMult+(["sinister","gouge","backstab","ghostly","hemo"].includes(o.id)?tv(s,"lethality"):0))/100;
  return B.general.spellCritMult+s.K.critMult/100+(school==="frost"?tv(s,"iceShards")/100*(B.general.spellCritMult-1):0);
}
function dampenPct(){const G=B.general,t=now-roundStart-G.dampenStart;return state==="fight"&&t>0?Math.min(G.dampenMax,Math.floor(t*G.dampenPerSec)):0}
function heal(u,amt,name,crit,src){if(!u.alive)return;const hr=aura(u,"healred");if(hr)amt*=1-hr.pct/100;amt*=1-dampenPct()/100;amt=Math.round(amt);if(amt<=0)return;u.hp=Math.min(u.maxHp,u.hp+amt);(src||u).stats.heal+=amt;healText(u,amt,crit);}
function addDot(t,src,name,total,dur,school,per){per=per||3;if(school!=="phys"&&B[src.cls].sp&&!DOT_NO_SP.has(name))total+=B[src.cls].sp*Math.min(1,dur/15);if(total<1||!t.alive||isImmune(t))return;if(school==="phys"&&has(t,"bop"))return;
  addAura(t,{type:"dot",name,src,school,per:total/Math.max(1,Math.round(dur/per)),period:per,next:now+per,until:now+dur+.05,phys:school==="phys",dt:school==="phys"?"none":"magic"});enterCombat(src,t);}
function addZone(u,a){const x=a.x??u.pos.x,z=a.z??u.pos.z;
  const m=new THREE.Mesh(tileGeo(FXT.rune),fxMat(a.color||0xffc040,.5));m.scale.setScalar(a.radius);
  m.rotation.x=-Math.PI/2;m.position.set(x,GY(x,z)+.06,z);scene.add(m);
  zones.push({x,z,r:a.radius,dps:a.dps,src:u,name:a.name,school:a.school||"holy",id:a.id||"consecration",next:now+1,until:now+a.dur,mesh:m});
}
/* сила заклинаний (1.12): каст/3,5, мгновенные 1,5/3,5, канал делится на тики, АоЕ треть, доты длительность/15 */
const DOT_NO_SP=new Set(["Воспламенение","Глубокие раны"]);
function spCoef(u,id){const a=eff(u,id);if(!a)return 0;let c;if(a.channel)c=Math.min(a.channel,3.5)/3.5/(a.ticks||Math.round(a.channel)||1);else c=Math.max(1.5,Math.min(3.5,a.cast||1.5))/3.5;if(a.radius&&!a.target)c/=3;return c}
const SP_NO=new Set(["manaburn"]);
function damage(src,t,base,name,school,o){
  o=o||{};
  const swp=!o.echo&&(o.melee||o.auto)&&!o.dot&&aura(src,"sweep");
  if(!o.echo&&(o.melee||o.auto)&&!o.dot&&(swp||has(src,"bflurry"))){const r=damage(src,t,base,name,school,{...o,echo:1}),lh=src.lastHit;
    const t2=foes(src).find(e=>e!==t&&e.alive&&!stealthed(e)&&dist(src,e)<=B.general.meleeRange+2);
    if(t2&&!lh.dodged){damage(src,t2,base,name,school,{...o,echo:1,noProc:true});if(swp&&--swp.charges<=0)swp.until=0;}src.lastHit=lh;return r}
  src.lastHit={};
  if(!t.alive||state!=="fight")return 0;
  if(!o.dot)enterCombat(src,t);
  if(isImmune(t)||(school==="phys"&&has(t,"bop"))){statusText(t,"Невосприимчив","#cfd6df");return 0}
  if((o.melee||o.auto)&&!o.dot&&!o.noDodge&&Math.random()*100<B.general.meleeMiss+(o.auto&&B[src.cls].ohSwing?B.general.dwMiss:0)-meleeHit(src)){src.lastHit={dodged:true,missed:true};combatMiss(src,t,"Промах");logRaw(`<b>${src.name}</b>: ${name} — промах`);return 0}
  if((o.melee||o.auto)&&!o.dot&&!o.noDodge&&!incap(t)&&inFront(t,src)&&Math.random()*100<parryChance(t)){src.lastHit={dodged:true,parried:true};combatMiss(src,t,"Парирование");logRaw(`<b>${src.name}</b>: ${name} — ${t.name} парирует`);
    sfx("parry",t,{vol:.7});if(t.cls==="warrior")t.revUntil=now+B.warrior.abilities.revenge.window;if(rk(t,"tRiposte"))t.opUntil=now+ab("rogue","riposte").window;return 0}
  if((o.melee||o.auto)&&!o.dot&&!o.noDodge&&!incap(t)&&Math.random()*100<dodgeChance(t)-tv(src,"weaponExp")){src.lastHit={dodged:true};combatMiss(src,t,"Уклонение");logRaw(`<b>${src.name}</b>: ${name} — ${t.name} уклоняется`);
    if(src.cls==="warrior")src.opUntil=now+B.warrior.abilities.overpower.window;if(t.cls==="warrior")t.revUntil=now+B.warrior.abilities.revenge.window;
    if(t.model.acts&&!t.moving&&!t.cast)playOnce(t.model,"dodge",1.4);sfx("parry",t,{vol:.7});
    if(rk(t,"setup")&&Math.random()*100<tv(t,"setup"))addCp(t,1);return 0}
  if(o.spell&&!o.dot&&!o.noResist&&spellResisted(src,t,school))return 0;
  {const bm=(o.melee||o.auto)&&!o.dot&&school==="phys"&&blessOf(src,"bom");if(bm&&B[src.cls].swing)base+=bm.ap/14*B[src.cls].swing.interval;}
  if(o.spell&&!o.dot&&school!=="phys"&&o.id&&!SP_NO.has(o.id)&&B[src.cls].sp&&!o.noProc)base+=B[src.cls].sp*spCoef(src,o.id);
  let amt=o.dot?base:base*dmgMult(src,school,o),crit=false,blocked=false;
  if(!o.noCrit&&!o.dot&&(o.forceCrit||Math.random()*100<critChance(src,school,t,o))){crit=true;amt*=critMult(src,school,o);src.stats.crits++;}
  if(!o.dot){if(o.auto&&HIT_SND[src.cls])sfx(src.cls==="rogue"&&src.ohNext?"hit_dagger":HIT_SND[src.cls],t,{vol:crit?1:.75});else if(o.id&&SND.map[o.id+"_i"])sfx(o.id+"_i",t);}
  if(!o.dot)impactFx(t,school,crit,false);else if(Math.random()<.7)schoolBurst(t.pos.x,t.y+1.1,t.pos.z,school,4,2,.4);
  if(o.ability){const cb=aura(src,"coldblood");if(cb)cb.until=0;}
  if(o.spell&&!o.dot&&school==="fire"){const cb=aura(src,"combust");if(cb){if(crit){if(--cb.charges<=0)cb.until=0;}else cb.pct+=cb.step;}}
  if(school==="holy"&&!o.dot){const jc=aura(t,"jotc");if(jc)amt+=jc.bonus;}
  const hs=aura(t,"holyshield"),rd=aura(t,"redoubt"),sbk=aura(t,"sblock");
  if((o.melee||o.auto)&&!o.noBlock&&Math.random()*100<tv(t,"shieldSpecialization")+t.K.block+(hs?hs.pct:0)+(rd?rd.pct:0)+(sbk?sbk.pct:0)){blocked=true;amt*=1-B.general.blockReduce/100;if(rd&&--rd.charges<=0)rd.until=0;if(sbk&&--sbk.charges<=0)sbk.until=0;if(t.cls==="warrior")t.revUntil=now+B.warrior.abilities.revenge.window;}
  if(school==="phys"){for(const ty of ["frostarmor","shadowform"]){const x=aura(t,ty);if(x)amt*=1-x.pct/100;}}
  if(school==="phys")amt*=1-(t.K.phys||0)/100;
  if(school==="phys"&&!o.dot)amt*=B.general.physMult*(1-armorOf(t,src)/(armorOf(t,src)+B.general.armorK));
  if(school==="fire"){const fv=aura(t,"firevuln");if(fv)amt*=1+fv.pct/100;}
  {const ks=t.auras.find(x=>x.ikPct&&x.until>now);if(ks)amt*=1+ks.ikPct/100;}
  if(school==="phys"&&!o.dot){const hm=aura(t,"hemo");if(hm){amt+=hm.bonus;if(--hm.charges<=0)hm.until=0;}}
  amt*=1-t.K.taken/100;
  if(school!=="phys")amt*=1-tv(t,"spellWarding")/100;
  if(school==="shadow"){const sw=aura(t,"sweave");if(sw)amt*=1+.03*sw.stacks;}
  {const rs={shadow:"shadowres",frost:"frostres",fire:"fireres"}[school];if(rs&&pauraOn(t,rs))amt*=1-ab("paladin",rs).pct/100;}
  if(blessOf(t,"kings"))amt*=.95;
  {const sb=blessOf(t,"sanct");if(sb&&!o.dot)amt=Math.max(0,amt-sb.reduce);}
  {const sc=blessOf(t,"sac");if(sc&&sc.src!==t&&sc.src.alive&&amt>0&&src!==sc.src){const x=Math.min(sc.amount,amt);amt-=x;sc.src.hp=Math.max(1,sc.src.hp-Math.round(x));combatText(src,sc.src,Math.round(x),false,{},school,false,0);}}
  if(t.stance==="defensive")amt*=1-B.warrior.abilities.defensive.taken/100;
  if(t.stance==="berserker")amt*=1+B.warrior.abilities.berserker.taken/100;
  const rc=aura(t,"reckless");if(rc)amt*=1+rc.taken/100;
  const red=aura(t,"reduce");if(red)amt*=1-red.pct/100;
  amt=Math.round(amt);
  let absorbed=0;
  const ms=aura(t,"manashield");
  if(ms&&amt>0){const x=Math.min(ms.amount,amt,Math.floor(t.res/ms.ratio));ms.amount-=x;t.res-=x*ms.ratio;amt-=x;absorbed+=x;if(ms.amount<=0||t.res<ms.ratio)ms.until=0;}
  const wd=t.auras.find(a=>a.type==="ward"&&a.school===school&&a.until>now);
  if(wd&&amt>0&&o.spell&&!o.dot&&src!==t){const rf=school==="fire"?tv(t,"impFireWard"):school==="frost"?10*rk(t,"frostWarding"):0;
    if(rf&&Math.random()*100<rf){statusText(t,"Отражено","#ffd100");logRaw(`<b>${t.name}</b>: ${wd.name} отражает «${name}»`);damage(t,src,amt,name,school,{spell:true,noProc:true,noResist:true,noCrit:true});return 0}}
  if(wd&&amt>0){const x=Math.min(wd.amount,amt);wd.amount-=x;amt-=x;absorbed+=x;if(wd.amount<=0)wd.until=0;}
  const abs=aura(t,"absorb");
  if(abs&&amt>0){const x=Math.min(abs.amount,amt);abs.amount-=x;amt-=x;absorbed+=x;if(abs.amount<=0)abs.until=0;}
  amt=Math.round(amt);t.hp=Math.max(0,t.hp-amt);src.stats.dmg+=amt;src.lastHit={crit,amt};
  if(t.cls==="warrior"){const zk=aura(t,"zerk");t.res=Math.min(t.maxRes,t.res+amt*B.warrior.rageFromDamageTaken*(zk?1+zk.rt/100:1));}
  breakStealth(t);
  if(t.eating){t.eating=null;t.auras=t.auras.filter(a=>a.type!=="eat");}
  if(t.cast&&META[t.cast.id].breakOnDmg&&amt>0)cancelCast(t,"Прервано уроном");
  else if(t.cast&&amt>0&&!o.dot)pushback(t);
  if(t.auras.some(a=>a.breakOnDmg&&a.until>now)){const br=t.auras.find(a=>a.breakOnDmg&&a.until>now);t.auras=t.auras.filter(a=>!a.breakOnDmg);logRaw(`Урон снимает «${br.name}» с ${t.name}`);}
  const fe=aura(t,"fear");if(fe&&amt+absorbed>0){fe.left-=fe.blind?1:amt;if(fe.left<=0){fe.until=0;logRaw(`Урон снимает «${fe.name}» с ${t.name}`);}}
  combatText(src,t,amt,crit,o,school,blocked,absorbed);
  logRaw(`<b>${src.name}</b>: ${name} → ${amt}${crit?" (крит)":""}${blocked?" (блок)":""}${absorbed?`, поглощено ${absorbed}`:""}`);
  if(school==="shadow"&&amt>0){const ve=t.auras.find(x=>x.type==="ve"&&x.src===src&&x.until>now);if(ve)for(const f of units)if(f.alive&&f.team===src.team&&(f===src||dist(f,src)<=40))heal(f,amt*ve.pct/100,"Объятия вампира",false,src);}
  if((o.melee||o.auto)&&!o.dot&&amt+absorbed>0){const inf=aura(t,"innerfire");if(inf&&--inf.charges<=0)inf.until=0;}
  if((o.melee||o.auto)&&!o.dot){const fa=aura(t,"frostarmor");if(fa&&src.alive)chill(t,src,fa.name,fa.slow,fa.slowDur,1);}
  if(!o.dot&&!o.noProc){
    if(crit){
      if(src.cls==="warrior"&&(o.melee||o.auto)){if(rk(src,"deepWounds")){const w=B.warrior.swing.dmg;addDot(t,src,"Глубокие раны",(w[0]+w[1])/2*tv(src,"deepWounds")/100,12,"phys");}
        if(rk(src,"flurry"))addAura(src,{type:"flurry",name:"Шквал",charges:3,until:now+15,good:true});}
      if(src.cls==="mage"){if(school==="fire"&&rk(src,"ignite"))addDot(t,src,"Воспламенение",(amt+absorbed)*tv(src,"ignite")/100,4,"fire",2);
        if(rk(src,"moe")&&o.cost&&(school==="fire"||school==="frost"))src.res=Math.min(src.maxRes,src.res+o.cost*tv(src,"moe")/100);}
      if(rk(src,"vengeance"))addAura(src,{type:"veng",name:"Отмщение",pct:tv(src,"vengeance"),until:now+8,good:true});
      if((o.melee||o.auto)&&t.cls==="priest"){if(rk(t,"martyrdom")&&Math.random()*100<tv(t,"martyrdom"))addAura(t,{type:"fcast",name:"Сосредоточенное колдовство",until:now+6,good:true});
        if(rk(t,"blessedRecovery"))addAura(t,{type:"hot",name:"Благословенное восстановление",per:(amt+absorbed)*tv(t,"blessedRecovery")/100/6,next:now+1,until:now+6.05,good:true});}
      if(rk(t,"redoubt"))addAura(t,{type:"redoubt",name:"Несгибаемость",pct:tv(t,"redoubt"),charges:5,until:now+10,good:true});
      if(rk(t,"eyeForEye")&&o.spell&&src.alive&&src!==t){const x=Math.min(t.maxHp*.5,(amt+absorbed)*tv(t,"eyeForEye")/100),ss=src,tt=t;setTimeout(()=>{if(ss.alive&&tt.alive)damage(tt,ss,x,"Око за око","holy",{noCrit:true,noProc:true,noResist:true,spell:true});},100);}
      if(rk(t,"enrage"))addAura(t,{type:"enrage",name:"Исступление",pct:tv(t,"enrage"),until:now+12,good:true});
      if(rk(t,"bloodCraze"))addAura(t,{type:"hot",name:"Кровавое безумие",per:t.maxHp*tv(t,"bloodCraze")/100/6,next:now+1,until:now+6.05,good:true});
      if(rk(t,"reckoning")&&t.alive&&src.alive&&dist(src,t)<=B.general.meleeRange+1&&Math.random()*100<tv(t,"reckoning")){const tt=t;setTimeout(()=>{if(tt.alive&&src.alive)damage(tt,src,roll(B[tt.cls].swing.dmg),"Расплата","phys",{auto:true,noProc:true});},150);}
    }
    if(school==="fire"&&o.spell&&t.hp>0&&Math.random()*100<tv(src,"impact"))cc(src,t,"stun",2,"Сотрясение",{drc:"rstun"});
    if(school==="frost"&&o.spell&&t.hp>0&&Math.random()*100<tv(src,"wintersChill")){const ex=aura(t,"wchill"),st=ex?Math.min(5,ex.stacks+1):1;addAura(t,{type:"wchill",name:"Зимняя стужа",stacks:st,until:now+15,dt:"magic"});}
    /* Затмение (1.12): прямые заклинания Тьмы и каждый тик Истощения разума; Слово Тьмы: Боль — при наложении, не от тиков */
    if(school==="shadow"&&o.spell&&!o.dot)blackoutProc(src,t);
    if(school==="shadow"&&o.spell&&!o.dot&&t.hp>0&&Math.random()*100<tv(src,"shadowWeaving")){const ex=aura(t,"sweave"),st=ex?Math.min(5,ex.stacks+1):1;addAura(t,{type:"sweave",name:"Плетение Тьмы",stacks:st,until:now+15,dt:"magic"});}
    if(rk(src,"vindication")&&(o.melee||o.auto||o.id==="judgement")&&Math.random()<.2)addAura(t,{type:"weak",name:"Возмездие",icon:"vindication",vis:"none",pct:tv(src,"vindication")/3,until:now+10,dt:"magic"});
  }
  /* Дух искупления: жрец с живым союзником на 10 с становится неуязвимым неподвижным духом и бесплатно лечит */
  if(t.hp<=0&&t.cls==="priest"&&rk(t,"spiritOfRedemption")&&!t.spirit&&units.some(x=>x!==t&&x.team===t.team&&x.alive&&!x.spirit)){
    t.spirit=now+10;t.hp=t.maxHp;t.cast=null;t.auras=t.auras.filter(a=>a.type==="dampen"||a.good);addAura(t,{type:"sor",name:"Дух искупления",until:now+10,good:true});log(t,"становится духом искупления");return amt}
  if(t.hp<=0){t.alive=false;t.cast=null;t.auras=t.auras.filter(a=>a.type==="dampen");log(t,"погибает");if(teamDead(t.team))endRound(src);return amt}
  if((o.melee||o.auto)&&!o.dot&&amt>0&&src.alive&&src!==t){const bt=aura(src,"btheal");if(bt){heal(src,bt.per,bt.name);if(--bt.charges<=0)bt.until=0;}
    const rt=aura(t,"retal");if(rt&&!o.retal&&inFront(t,src)&&dist(t,src)<=B.general.meleeRange+B.general.reach&&!incap(t)){if(--rt.charges<=0)rt.until=0;const tt=t;setTimeout(()=>{if(tt.alive&&src.alive)damage(tt,src,swingDmg(tt),rt.name,"phys",{melee:true,retal:true,noProc:true});},120);}}
  {const sb=blessOf(t,"sanct");if(blocked&&sb&&src.alive)damage(t,src,sb.dmg,sb.name,"holy",{noCrit:true,noProc:true});}
  if((o.melee||o.auto)&&!o.dot&&amt>0&&src.alive&&src!==t){const ra=pauraOn(t,"retaura");if(ra&&src.team!==t.team)damage(ra,src,ab("paladin","retaura").dmg*(1+tv(ra,"impRetAura")/100),ab("paladin","retaura").name,"holy",{noCrit:true,noProc:true,noResist:true});
    const jl=aura(t,"jol");if(jl)heal(src,jl.amount,jl.name);const jw=aura(t,"jow");if(jw&&src.resType==="mana")src.res=Math.min(src.maxRes,src.res+jw.amount);}
  if(blocked&&hs&&src.alive){if(--hs.charges<=0)hs.until=0;damage(t,src,hs.dmg,"Щит небес","holy",{noCrit:true,noProc:true});}
  return amt;
}
function blink(u,d){
  u.auras=u.auras.filter(a=>a.type!=="stun"&&a.type!=="root");
  const dx=Math.sin(u.facing),dz=Math.cos(u.facing),from=u.pos.clone();let x=u.pos.x,z=u.pos.z;
  for(let s=0;s<d;s+=.5){const nx=x+dx*.5,nz=z+dz*.5;if(!inside(nx,nz))break;x=nx;z=nz;}
  u.pos.x=x;u.pos.z=z;collide(u.pos);burstFx(from,0xc792ff);burstFx(u.pos,0xc792ff);
}

function updateUnit(u,dt){
  u.auras=u.auras.filter(a=>a.until>now);
  if(dampenPct()>0&&!has(u,"dampen")){addAura(u,{type:"dampen",name:"Усталость",until:Infinity,icon:"a_weakened",dt:"none"});if(u===player)logRaw("Усталость: получаемое исцеление слабеет на 1% в секунду");}
  if(!u.alive)return;
  for(const a of u.auras.slice()){
    if(a.type==="dot"&&now>=a.next){a.next+=a.period||3;damage(a.src,u,a.per,a.name,a.school,{dot:true});if(!u.alive)return;}
    if(a.type==="hot"&&now>=a.next){a.next+=a.period||1;heal(u,a.per,a.name,false,a.src&&a.src.alive!==undefined?a.src:u);schoolBurst(u.pos.x,u.y+1,u.pos.z,"holy",5,1.5,.35);}
    if(a.type==="bloodrage"&&now>=a.next){a.next+=1;u.res=Math.min(u.maxRes,u.res+a.per);}
  }
  const G=B.general,ooc=!inCombat(u);
  {const bw=blessOf(u,"bow");if(bw&&u.resType==="mana")u.res=Math.min(u.maxRes,u.res+bw.mana/5*dt);}
  if(u.resType==="mana")u.res=Math.min(u.maxRes,u.res+((aura(u,"dspirit")?aura(u,"dspirit").regen:0)+B[u.cls].manaRegen)*(now<(u.fsrUntil||0)?(G.fsrManaPct+tv(u,"meditation"))/100:1)*(1+u.K.regen/100)*(ooc?G.oocManaMult:1)*dt);
  if(u.resType==="energy"){const ad=aura(u,"adren");u.res=Math.min(u.maxRes,u.res+B[u.cls].energyRegen*(1+u.K.regen/100)*(ad?1+ad.pct/100:1)*dt);}
  if(u.cls==="warrior"&&state==="fight"){if(ooc&&!u.charging)u.res=Math.max(0,u.res-G.rageDecay*dt*(1-tv(u,"angerManagement")/100));else if(rk(u,"angerManagement"))u.res=Math.min(u.maxRes,u.res+dt/3);
    if(u.lsAmt&&!has(u,"laststand")){u.maxHp-=u.lsAmt;u.lsAmt=0;u.hp=Math.max(1,Math.min(u.hp,u.maxHp));}}
  if(state==="fight")u.hp=Math.min(u.maxHp,u.hp+u.maxHp*(ooc?G.oocHpRegen:G.combatHpRegen)/100*dt);
  /* в овце цель быстро восстанавливает здоровье, как в 1.12 */
  if(state==="fight"&&u.alive&&u.auras.some(a=>a.type==="incap"&&a.name===B.mage.abilities.poly.name&&a.until>now))u.hp=Math.min(u.maxHp,u.hp+u.maxHp*G.polyHpRegen/100*dt);
  if(u.eating){
    if(now>=u.eating.until||inCombat(u)||u.moving||u.air||incap(u)){u.eating=null;u.auras=u.auras.filter(a=>a.type!=="eat");}
    else{const F=B.common.abilities.food;u.hp=Math.min(u.maxHp,u.hp+u.maxHp*F.hp/100*dt);if(u.resType==="mana")u.res=Math.min(u.maxRes,u.res+u.maxRes*F.mana/100*dt);}
  }
  const t=other(u);
  if(u.charging){
    const c=u.charging,d=dist(u,c.t);
    if(!c.t.alive||now>c.until||incap(u)||!canSee(u,c.t)){u.charging=null;}
    else if(d<=2.2){u.charging=null;if(has(c.t,"bop"))statusText(c.t,"Невосприимчив","#cfd6df");else{cc(u,c.t,"stun",c.stun,c.name);if(c.dmg)damage(u,c.t,c.dmg,"Перехват","phys",{id:"intercept",noDodge:true});}enterCombat(u,c.t);u.swingAt=Math.min(u.swingAt,now);}
    else{const st=Math.min(d-2,40*dt);u.pos.x+=(c.t.pos.x-u.pos.x)/d*st;u.pos.z+=(c.t.pos.z-u.pos.z)/d*st;u.facing=Math.atan2(c.t.pos.x-u.pos.x,c.t.pos.z-u.pos.z);collide(u.pos);}
  }
  if(u.cast){
    const c=u.cast,a=eff(u,c.id),m=META[c.id],tt=c.target;
    if(incap(u)||(m.school!=="phys"&&(has(u,"silence")||lockedSchool(u,m.school))))u.cast=null;
    else if(c.channel){
      if(now>=c.nextTick){c.tick++;c.nextTick+=a.channel/a.ticks;
        if(m.target&&(!tt.alive||!canSee(u,tt)))u.cast=null;
        else if(m.target&&dist(u,tt)>a.range+2){cancelCast(u,"Цель слишком далеко");}
        else if(m.target&&!los(u.pos,tt.pos)){cancelCast(u,"Цель вне поля зрения");}
        else m.tick(u,tt,a,c.tick);}
      if(u.cast===c&&(c.tick>=a.ticks||now>c.end+.05)){u.cast=null;}
    }
    else if(now>=c.end){
      u.cast=null;
      if(m.target&&(!tt.alive||!canSee(u,tt))){castFailU(u,"Нет цели");}
      else if(m.target&&dist(u,tt)>a.range+2){log(u,`${a.name}: цель слишком далеко`);if(u.isPlayer){showErr("Слишком далеко");castFail("Слишком далеко");}}
      else if(m.target&&!los(u.pos,tt.pos)){log(u,`${a.name}: цель скрылась за колонной`);if(u.isPlayer){showErr("Цель вне поля зрения");castFail("Цель вне поля зрения");}}
      else if(c.ally&&c.ally!==u&&(!c.ally.alive||dist(u,c.ally)>ALLY_RANGE()+2||!los(u.pos,c.ally.pos))){castFailU(u,"Союзник недоступен");}
      else if((a.cost||0)>u.res){if(u.isPlayer){showErr("Не хватает "+RES_NAME[u.resType]);castFail("Не хватает "+RES_NAME[u.resType]);}}
      else{finish(u,c.id,tt,c.ally);castOkU(u,a.name);}
    }
  }
  /* автоатака: воин, разбойник, паладин. Ждёт, пока цель выведена из строя вашим же эффектом, который снимается уроном */
  const sw=B[u.cls].swing;
  if(sw&&t&&t.alive&&state==="fight"&&!incap(u)&&!u.charging&&!stealthed(u)&&canSee(u,t)&&!has(u,"bop")&&!u.auras.some(x=>x.noAtk&&x.until>now)){
    const brk=t.auras.some(a=>(a.breakOnDmg||a.blind)&&a.until>now);
    if(dist(u,t)<=B.general.meleeRange+B.general.reach&&!brk&&(!u.isPlayer||u.bot||inFront(u,t))){if(now>=u.swingAt||(B[u.cls].ohSwing&&now>=(u.ohAt||0))){
      /* два оружия: правая и левая рука бьют по своим таймерам, левая слабее */
      const oh=!!B[u.cls].ohSwing&&now<u.swingAt;u.ohNext=oh;let iv=oh?B[u.cls].ohSwing.interval:sw.interval;const fl=aura(u,"flurry");
      if(fl){iv/=1+tv(u,"flurry")/100;if(--fl.charges<=0)fl.until=0;}const tcl=aura(u,"tclap");if(tcl)iv*=1+tcl.pct/100;
      const sl=aura(u,"slice");if(sl)iv/=1+sl.pct/100;const sc=u.cls==="paladin"&&aura(u,"seal");if(sc&&sc.kind==="Cr")iv/=1+sc.haste/100;const bf=aura(u,"bflurry");if(bf)iv/=1+bf.pct/100;
      if(oh)u.ohAt=now+iv;else u.swingAt=now+iv;swingFx(u,oh?"attackoff":undefined);
      const hq=aura(u,"hsq");
      if(hq&&u.res>=hq.cost){u.res-=hq.cost;hq.until=0;damage(u,t,swingDmg(u)+hq.bonus,hq.name,"phys",{melee:true,id:hq.id,ability:true});
        if(hq.targets>1){const lh=u.lastHit;for(const e of foes(u).filter(e=>e!==t&&e.alive&&!stealthed(e)&&dist(u,e)<=B.general.meleeRange+2).slice(0,hq.targets-1))damage(u,e,swingDmg(u)+hq.bonus,hq.name,"phys",{melee:true,id:hq.id,ability:true,echo:1});u.lastHit=lh;}}
      else{if(u.cls==="warrior")u.res=Math.min(u.maxRes,u.res+sw.rage+(Math.random()*100<tv(u,"unbridledWrath")?1:0));
        const cr=u.cls==="paladin"&&aura(u,"seal");damage(u,t,oh?roll(B[u.cls].ohSwing.dmg)*B[u.cls].ohSwing.pct/100:cr&&cr.kind==="Cr"?swingDmg(u)/(1+cr.haste/100)+cr.ap:swingDmg(u),oh?"Автоатака (левая рука)":"Автоатака","phys",{auto:true});}
      const hit=!u.lastHit.dodged&&u.lastHit.amt!==undefined;
      if(u.cls==="rogue")rogueHit(u,t,oh?"oh":"mh");
      if(u.cls==="paladin"&&hit&&t.alive){const s=aura(u,"seal");
        if(s&&s.kind==="R")damage(u,t,s.dmg*(1+tv(u,"impSoR")/100),ab("paladin","sealR").name,"holy",{noProc:true,noCrit:true});
        else if(s&&(s.kind==="L"||s.kind==="W")){const j=ab("paladin",s.kind==="L"?"sealL":"sealW");if(Math.random()*100<j.chance){if(s.kind==="L")heal(u,j.heal,s.name,false,u);else u.res=Math.min(u.maxRes,u.res+j.mana);}}
        else if(s&&s.kind==="C"){if(Math.random()<s.ppm*sw.interval/60)damage(u,t,roll(sw.dmg)*s.pct/100,s.name,"holy",{melee:true,noDodge:true,noBlock:true,noProc:true});}
        else if(s&&s.kind==="J"){const j=ab("paladin","sealJ");if(Math.random()*100<j.chance)cc(u,t,"stun",j.stun,j.name);}}
      if(t.alive&&hit&&u.cls==="warrior"&&Math.random()*100<tv(u,"maceSpecialization"))cc(u,t,"stun",3,"Специализация на дробящем оружии",{drc:"rstun"});
      if(t.alive&&hit&&!oh&&Math.random()*100<tv(u,"swordSpec")+tv(u,"swordSpecialization"))damage(u,t,roll(sw.dmg),"Специализация на мечах","phys",{auto:true});u.ohNext=false;}}
    else{u.swingAt=Math.max(u.swingAt,now);if(u.ohAt!==undefined)u.ohAt=Math.max(u.ohAt,now+.2);}
  }
}
function jump(u){
  if(!u.alive||u.air||incap(u)||rooted(u)||u.charging||!(state==="fight"||state==="countdown"))return;
  if(u.cast)cancelCast(u,"Прервано прыжком");
  u.air=true;u.vy=B.general.jumpSpeed;u.airVel.set(u.moving?u.vel.x:0,u.moving?u.vel.y:0);u.jumpAt=now;
}
function moveUnit(u,dt){
  if(!u.vel)u.vel=new THREE.Vector2();
  if(u.charging){u.moving=false;return}
  if(u.net&&NET.role==="host"&&netRemoteMove(u,dt))return;
  if(u.air){
    u.pos.x+=u.airVel.x*dt;u.pos.z+=u.airVel.y*dt;collide(u.pos);
    u.vy-=B.general.gravity*dt;u.y+=u.vy*dt;{const g=GY(u.pos.x,u.pos.z);if(u.y<=g){u.y=g;u.air=false;u.vy=0;u.landAt=now;}}
    return;
  }
  const fe=aura(u,"fear");
  if(fe&&u.alive){
    const s=fe.src||other(u);let an=Math.atan2(u.pos.x-s.pos.x,u.pos.z-s.pos.z)+Math.sin(now*1.7+u.pos.x)*.8;
    /* ослеплённый бредёт короткими отрезками в случайные стороны, не дальше ~5 м от места ослепления */
    if(fe.blind){const h=u.blindHome??={x:u.pos.x,z:u.pos.z};if(!(now<u.blindNext)){u.blindNext=now+1.4+Math.random()*1.2;const dx=h.x-u.pos.x,dz=h.z-u.pos.z;
        u.blindAn=Math.hypot(dx,dz)>4?Math.atan2(dx,dz)+(Math.random()-.5):Math.random()*Math.PI*2;}an=u.blindAn;}
    for(const off of [0,.6,-.6,1.2,-1.2,2,-2]){const a2=an+off;if(inside(u.pos.x+Math.sin(a2)*2,u.pos.z+Math.cos(a2)*2)){an=a2;break}}
    if(fe.blind&&an!==u.blindAn){u.blindAn=an;}
    const sp=B[u.cls].speed*(fe.blind?.4:.75)*(1-slowPct(u)/100);u.facing=an;u.moving=!rooted(u);u.moveLocal=fe.blind?"walk":"run";u.speedNow=sp;
    if(u.moving){u.pos.x+=Math.sin(an)*sp*dt;u.pos.z+=Math.cos(an)*sp*dt;collide(u.pos);}u.vel.set(Math.sin(an)*sp,Math.cos(an)*sp);return;
  }
  u.blindAn=undefined;u.blindHome=undefined;u.blindNext=0;
  let mx=u.moveDir.x,mz=u.moveDir.y;const len=Math.hypot(mx,mz);
  const can=u.alive&&!incap(u)&&!rooted(u)&&state==="fight";
  u.moving=len>.05&&can;
  if(!u.moving){u.vel.set(0,0);return}
  const k=Math.min(1,len)/len;mx*=k;mz*=k;
  if(u.cast&&!B.general.castWhileMoving)cancelCast(u,"Прервано движением");
  const spr=has(u,"justice")?null:aura(u,"sprint");
  let sp=B[u.cls].speed*(1-slowPct(u)/100)*(has(u,"justice")?1:1+u.K.speed/100)*(spr?1+spr.pct/100:1);
  if(stealthed(u))sp*=1-(B.general.stealth.speed-tv(u,"camouflage"))/100;
  if(u.isPlayer&&!u.bot&&!touchMode){
    const n=Math.hypot(mx,mz)||1,fx=Math.sin(u.facing),fz=Math.cos(u.facing),f=(mx*fx+mz*fz)/n,s=(mx*fz-mz*fx)/n;
    if(f<-.3){sp*=B.general.backpedal;u.moveLocal="back";}else u.moveLocal="run";
    /* стрейф как в клиенте 1.12: своей анимации нет, тело разворачивается на 90° (по диагонали на 45°, при беге назад зеркально) и бежит */
    u.bodyOff=Math.abs(s)>.3?angDiff(f<-.3?Math.atan2(-mx,-mz):Math.atan2(mx,mz),u.facing):0;
    if(u.walking){sp=Math.min(sp,2.5);if(u.moveLocal==="run")u.moveLocal="walk";}
  }else{u.facing=Math.atan2(mx,mz);u.moveLocal="run";u.bodyOff=0;}
  u.speedNow=sp;
  u.vel.set(mx*sp,mz*sp);
  u.pos.x+=mx*sp*dt;u.pos.z+=mz*sp*dt;collide(u.pos);
}
/* стоим на полу; если пол ушёл вниз больше чем на ступеньку, падаем */
function floorSnap(u){if(!MAP){u.pos.y=u.y;return}if(u.air){u.pos.y=u.y;return}
  const g=GY(u.pos.x,u.pos.z);if(u.y>g+.9){u.air=true;u.vy=0;u.airVel.set(u.vel?u.vel.x:0,u.vel?u.vel.y:0);}else u.y=g;u.pos.y=u.y;}
function separate(a,b){if(stealthed(a)||stealthed(b))return;const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,d=Math.hypot(dx,dz),m=1.4;if(d<m&&d>1e-4){const p=(m-d)/2;a.pos.x-=dx/d*p;a.pos.z-=dz/d*p;b.pos.x+=dx/d*p;b.pos.z+=dz/d*p;}}
function updateZones(){
  for(let i=zones.length-1;i>=0;i--){const z=zones[i];
    if(now>=z.until||state!=="fight"){scene.remove(z.mesh);zones.splice(i,1);continue}
    z.mesh.material.opacity=.3+.1*Math.sin(now*5);z.mesh.rotation.z+=.004;
    if(Math.random()<.6){const a=Math.random()*6.283,r=Math.sqrt(Math.random())*z.r,zx=z.x+Math.cos(a)*r,zz=z.z+Math.sin(a)*r;pfx(zx,GY(zx,zz)+.15,zz,{t:Math.random()<.5?FXT.flame:FXT.star,v:[0,rnd(1,2.2),0],life:rnd(.5,.9),s0:.45,s1:.15,c0:0xfff0a0,c1:0xff8a10,spin:2});}
    if(now>=z.next){z.next+=1;for(const t of foes(z.src))if(Math.hypot(t.pos.x-z.x,t.pos.z-z.z)<=z.r)damage(z.src,t,z.dps,z.name,z.school||"holy",{spell:true,id:z.id||"consecration",noProc:true,noResist:true});}}
}

/* ================= БОТ ================= */
const LOSS={stun:1,incap:1,fear:1};
class Bot{
  get e(){return other(this.u)}
  constructor(u,e,diff){this.u=u;if(e)setTarget(u,e);u.bot=this;this.D=DIFF[diff];this.next=0;this.seen=null;this.seenAt=0;this.lastPos=null;this.wander=null;
    if(u.cls==="rogue"){const caster=!MELEE[e.cls];u.poisonMH=caster?"numb":"deadly";u.poisonOH="crip";}}
  ready(id){const u=this.u;if(!u.abilities.includes(id))return false;const m=u.moving;if(!u.air)u.moving=false;const r=canUse(u,id);u.moving=m;return !r}
  use(id){return this.ready(id)&&tryUse(this.u,id)}
  update(){
    const u=this.u,e=this.e;
    if(!u.alive||state!=="fight"||this.D.dummy){u.moveDir.set(0,0);return}
    if(units.length>2&&now>=(this.tgtAt||0)){this.tgtAt=now+1.5;this.pickTarget();}
    if(e.cast){if(this.seen!==e.cast){this.seen=e.cast;this.seenAt=now+this.D.react*(.7+Math.random()*.6);}}else this.seen=null;
    if(canSee(u,e)){this.lastPos={x:e.pos.x,z:e.pos.z};this.lastSeenAt=now;this.lastSeenPos=this.lastPos;}
    if(now<this.next)return;this.next=now+this.D.think;
    if(this.trinket())return;
    if(this.healAlly())return;
    this[u.cls]();
  }
  /* 2 на 2: добиваем самого слабого видимого врага, цель меняем неохотно */
  pickTarget(){const u=this.u,cur=other(u);let best=null,bs=1e9;
    for(const f of foes(u)){let s=f.hp/f.maxHp+dist(u,f)/60;if(!canSee(u,f))s+=3;if(isImmune(f))s+=2;if(f.auras.some(a=>a.breakOnDmg&&a.until>now))s+=1.5;if(f===cur)s-=.2;if(s<bs){bs=s;best=f;}}
    if(best&&best!==cur){setTarget(u,best);this.lastPos=null;this.seen=null;}}
  /* 2 на 2: жрец и паладин лечат и защищают союзника, если сами не в большей опасности */
  healAlly(){
    const u=this.u;u.friend=null;if(units.length<3||(u.cls!=="priest"&&u.cls!=="paladin"))return false;
    if(u.cast||incap(u)||has(u,"silence"))return false;
    const al=allies(u).find(x=>x!==u&&x.alive);if(!al)return false;
    const p=al.hp/al.maxHp,me=u.hp/u.maxHp,d=dist(u,al),near=d<=ALLY_RANGE()-2&&los(u.pos,al.pos);
    const ccd=al.auras.some(x=>!x.good&&x.until>now&&x.dt==="magic"&&["incap","fear","root","silence","stun"].includes(x.type)&&x.until-now>1.5);
    if(me<p-.1||me<.3)return false;
    if(!near){if(p<.6){this.moveTo(al.pos);return true}return false}
    u.friend=al;const use=id=>this.ready(id)&&tryUse(u,id);
    const hot=foes(u).some(e=>MELEE[e.cls]&&dist(u,e)<7);
    if(u.cls==="priest"){
      if(ccd&&use("dispel"))return true;
      if(p<.9&&!has(al,"absorb")&&use("pws"))return true;
      if(p<.8&&!has(al,"hot")&&use("renew"))return true;
      if(p<.45&&use("flash")){this.stop();return true}
      if(p<.6&&!hot&&use("gheal")){this.stop();return true}
    }else{
      if(p<.2&&use("loh"))return true;
      if(p<.3&&foes(u).some(e=>MELEE[e.cls]&&dist(al,e)<6)&&use("bop"))return true;
      if(ccd&&use("cleanse"))return true;
      if(rooted(al)&&use("freedom"))return true;
      if(p<.35&&!hot&&use("holylight")){this.stop();return true}
      if(p<.6&&use("flashlight")){this.stop();return true}
    }
    u.friend=null;return false;
  }
  /* знак отличия: под долгим контролем, когда это опасно */
  trinket(){
    const u=this.u,e=this.e;if(!this.ready("trinket"))return false;
    const cc=u.auras.find(a=>LOSS[a.type]&&a.until>now);
    if(cc&&cc.until-now>2.2&&(u.hp<u.maxHp*.6||e.hp<e.maxHp*.35)){tryUse(u,"trinket");return true}
    return false;
  }
  wantsKick(){const c=this.e.cast;return c&&now>=this.seenAt&&META[c.id].school!=="phys"&&canSee(this.u,this.e)}
  stop(){this.u.moveDir.set(0,0);this.u.moving=false}
  moveTo(p){
    const u=this.u;let dx=p.x-u.pos.x,dz=p.z-u.pos.z;const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
    if(MAP){if(!mapClear(u.pos.x,u.pos.z,p.x,p.z,.9)){
        if(!this.path||now>this.pathAt+.6||Math.hypot(this.pathGoal.x-p.x,this.pathGoal.z-p.z)>3){this.path=mapPath(u.pos.x,u.pos.z,p.x,p.z)||[];this.pathAt=now;this.pathGoal={x:p.x,z:p.z};}
        while(this.path.length>1&&mapClear(u.pos.x,u.pos.z,this.path[1].x,this.path[1].z,.9))this.path.shift();
        const w=this.path[0];if(w){if(Math.hypot(w.x-u.pos.x,w.z-u.pos.z)<.6)this.path.shift();dx=w.x-u.pos.x;dz=w.z-u.pos.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;}}
      u.moveDir.set(dx,dz);return}
    const bl=segBlocked(u.pos.x,u.pos.z,p.x,p.z);
    if(bl){const px=bl.x-u.pos.x,pz=bl.z-u.pos.z;let tx=-pz,tz=px;if(tx*dx+tz*dz<0){tx=-tx;tz=-tz;}const tl=Math.hypot(tx,tz)||1;dx=dx*.4+tx/tl;dz=dz*.4+tz/tl;}
    u.moveDir.set(dx,dz);
  }
  awayDir(){
    const u=this.u,e=this.e;const base=Math.atan2(u.pos.x-e.pos.x,u.pos.z-e.pos.z);
    for(const off of [0,.5,-.5,1,-1,1.5,-1.5,2.2,-2.2]){const an=base+off*(this.side||1);const x=u.pos.x+Math.sin(an)*7,z=u.pos.z+Math.cos(an)*7;if(inside(x,z))return an;}
    return base+Math.PI/2;
  }
  kite(){const an=this.awayDir();this.u.moveDir.set(Math.sin(an),Math.cos(an));}
  locked(){const e=this.e;return rooted(e)||incap(e)}
  face(){const u=this.u,e=this.e;u.facing=Math.atan2(e.pos.x-u.pos.x,e.pos.z-u.pos.z);}
  /* противник в скрытности: идём к месту, где видели его последним, и иногда бьём по площади наугад */
  hunt(aoe){
    const u=this.u,e=this.e,p=this.lastPos;
    /* невидимую цель бот не чует: идёт к месту, где видел её в последний раз, потом бродит */
    if(!this.huntLast||now-this.huntLast>1)this.huntFrom=now;this.huntLast=now;
    if(p&&Math.hypot(p.x-u.pos.x,p.z-u.pos.z)>2.5)this.moveTo(p);
    else{this.lastPos=null;if(!this.wander||Math.hypot(this.wander.x-u.pos.x,this.wander.z-u.pos.z)<2){if(MAP)this.wander=mapRandomPoint(30);else{const an=Math.random()*Math.PI*2,r=Math.random()*ARENA_R*.55;this.wander={x:Math.cos(an)*r,z:Math.sin(an)*r};}}this.moveTo(this.wander);}
    /* АоЕ вслепую только сразу после пропажи цели и только по месту, где её видели (настоящую позицию бот не знает) */
    const lp=this.lastSeenPos,d=lp&&now-(this.lastSeenAt||-9)<3?Math.hypot(lp.x-u.pos.x,lp.z-u.pos.z):99;
    if(aoe&&d<9&&Math.random()<.3)for(const id of aoe)if(this.ready(id)&&d<=(eff(u,id).radius||eff(u,id).range||0)){tryUse(u,id);break}
  }
  prebuff(){const u=this.u;
    for(const [id,ty] of [["frostarmor","frostarmor"],["innerfire","innerfire"]])if(!has(u,ty)&&this.ready(id)){tryUse(u,id);return true}
    return false}
  mage(){
    const u=this.u,e=this.e,A=eff(u,"frostbolt"),N=eff(u,"nova"),d=dist(u,e),see=los(u.pos,e.pos)&&canSee(u,e);
    if(!this.side)this.side=Math.random()<.5?1:-1;
    if(has(u,"iceblock")){if(u.hp>u.maxHp*.7||(now-aura(u,"iceblock").until+B.mage.abilities.iceblock.dur>7&&!MELEE[e.cls]))tryUse(u,"iceblock");return}
    if(u.cast){if(u.cast.id==="evocation"&&d<12&&!this.locked())u.cast=null;else{this.stop();return}}
    if(has(u,"incap")||has(u,"fear"))return;
    if(u.hp<u.maxHp*.22&&!isImmune(e)&&this.ready("iceblock")){tryUse(u,"iceblock");return}
    if(has(u,"stun")||rooted(u)){if(this.ready("blink")){u.facing=this.awayDir();tryUse(u,"blink");}return}
    if(this.prebuff())return;
    if(!canSee(u,e)){this.hunt(["explosion","nova","cone"]);return}
    if(this.wantsKick()&&this.ready("counter"))tryUse(u,"counter");
    if(this.ready("barrier")&&!has(u,"absorb"))tryUse(u,"barrier");
    if(!this.u.abilities.includes("barrier")&&u.hp<u.maxHp*.55&&!has(u,"manashield")&&u.res>1500&&this.ready("manashield")){tryUse(u,"manashield");return}
    const eLocked=this.locked(),melee=MELEE[e.cls];
    if(melee&&d<N.radius-1.5&&!eLocked&&!isImmune(e)&&this.ready("nova")){tryUse(u,"nova");return}
    if(melee&&d<9&&!eLocked&&!isImmune(e)&&this.ready("blastwave")){tryUse(u,"blastwave");return}
    if(u.cds.nova>now&&u.cds.iceblock>now&&this.ready("coldsnap"))tryUse(u,"coldsnap");
    if(melee&&d<8&&!eLocked&&!isImmune(e)&&this.ready("cone")){this.face();tryUse(u,"cone");return}
    if(melee&&d<6&&!eLocked&&this.ready("blink")){u.facing=this.awayDir();tryUse(u,"blink");return}
    if(melee&&d<(eLocked?17:10)&&!has(e,"incap")){this.kite();if(this.ready("fireblast"))tryUse(u,"fireblast");return}
    if(u.res<u.maxRes*.2&&(has(e,"incap")||d>25)&&this.ready("evocation")){this.stop();tryUse(u,"evocation");return}
    if(!see||d>A.range-1){this.moveTo(e.pos);return}
    this.stop();
    if(!has(e,"incap")&&(u.hp<u.maxHp*.6||e.cast&&META[e.cast.id].school==="holy")&&!drImmune(e,"poly")&&this.ready("poly")){tryUse(u,"poly");return}
    if(has(e,"incap")||isImmune(e))return;
    if(this.ready("apower"))tryUse(u,"apower");
    if(this.ready("combust"))tryUse(u,"combust");
    if(this.ready("fireblast")&&Math.random()<.5){tryUse(u,"fireblast");return}
    if(eLocked&&d>15&&this.ready("pyroblast")){tryUse(u,"pyroblast");return}
    if(eLocked&&d>12&&this.ready("fireball")){tryUse(u,"fireball");return}
    if(!melee&&Math.random()<.25&&this.ready("missiles")){tryUse(u,"missiles");return}
    if(this.ready("frostbolt"))tryUse(u,"frostbolt");
  }
  stance(s){const u=this.u;if(u.stance===s)return true;if(this.ready(s)){tryUse(u,s);return true}return false}
  warrior(){
    const u=this.u,e=this.e,d=dist(u,e),S=strikeId(u);
    if((has(u,"fear")||has(u,"incap"))&&u.stance==="berserker"&&this.ready("zerkrage")){tryUse(u,"zerkrage");return}
    if(incap(u)||u.charging||u.cast)return;
    if(!canSee(u,e)){this.hunt(["shout"]);return}
    if(this.wantsKick()&&d<=5){if(u.stance!=="berserker"&&this.ready("shieldbash"))tryUse(u,"shieldbash");else if(this.stance("berserker")&&this.ready("pummel"))tryUse(u,"pummel");}
    if(u.hp<u.maxHp*.3&&this.ready("laststand")){tryUse(u,"laststand");return}
    if(u.hp<u.maxHp*.3&&(!u.cds.shieldwall||u.cds.shieldwall<=now)){if(this.stance("defensive")&&this.ready("shieldwall")){tryUse(u,"shieldwall");return}}
    if(!inCombat(u)&&!has(u,"bshout")&&this.ready("battleshout")){tryUse(u,"battleshout");return}
    if(!inCombat(u)&&d>8&&d<25&&(u.cds.charge||0)<=now){if(this.stance("battle")&&this.ready("charge")){this.stop();tryUse(u,"charge");return}}
    if(inCombat(u)&&d>9&&d<25&&(u.cds.intercept||0)<=now&&u.res>=10&&!rooted(u)){if(this.stance("berserker")&&this.ready("intercept")){this.stop();tryUse(u,"intercept");return}}
    if(u.res<15&&inCombat(u)&&this.ready("bloodrage"))tryUse(u,"bloodrage");
    if(d>3.2)this.moveTo(e.pos);else this.stop();
    if(d>5||e.auras.some(a=>a.breakOnDmg&&a.until>now)||isImmune(e)||has(e,"bop"))return;
    if(u.stance==="defensive"&&!has(u,"reduce"))this.stance("battle");
    if(this.ready("deathwish")&&e.hp<e.maxHp*.6){tryUse(u,"deathwish");return}
    if(e.hp<e.maxHp*.2&&this.ready("execute")){tryUse(u,"execute");return}
    if(this.ready("overpower")){tryUse(u,"overpower");return}
    if(!auraNamed(e,B.warrior.abilities.hamstring.name)&&!has(e,"freedom")&&this.ready("hamstring")){tryUse(u,"hamstring");return}
    if(S&&this.ready(S)){tryUse(u,S);return}
    if(u.stance==="berserker"&&this.ready("whirlwind")&&u.res>=25+(S?30:0)){tryUse(u,"whirlwind");return}
    if(u.hp<u.maxHp*.45&&this.ready("shout")&&!drImmune(e,"fear")){tryUse(u,"shout");return}
    if(!auraNamed(e,B.warrior.abilities.rend.name)&&u.res>=10+(S?30:0)&&this.ready("rend")){tryUse(u,"rend");return}
    if(u.res>55&&!has(u,"hsq")&&this.ready("heroic"))tryUse(u,"heroic");
  }
  rogue(){
    const u=this.u,e=this.e,d=dist(u,e);
    if(incap(u))return;
    if(!inCombat(u)&&!stealthed(u)&&this.ready("stealth")){tryUse(u,"stealth");return}
    if(u.hp<u.maxHp*.25&&!stealthed(u)&&this.ready("vanish")){tryUse(u,"vanish");this.restealthAt=now;return}
    if(!canSee(u,e)){this.hunt(null);return}
    if(stealthed(u)){
      /* подкрадываемся и открываем бой; со спины — Гаррота, иначе Подлый трюк */
      const back={x:e.pos.x-Math.sin(e.facing)*2.2,z:e.pos.z-Math.cos(e.facing)*2.2};
      if(d>6)this.moveTo(e.pos);else if(!behind(u,e)&&d>1.6&&!incap(e))this.moveTo(back);else this.stop();
      if(d<=5){if(!drImmune(e,"stun")&&this.ready("cheapshot")){tryUse(u,"cheapshot");return}if(this.ready("garrote")){tryUse(u,"garrote");return}if(this.ready("ambush")){tryUse(u,"ambush");return}}
      return;
    }
    if(this.wantsKick()&&d<=5){if(this.ready("kick")){tryUse(u,"kick");return}if(this.ready("gouge")&&!drImmune(e,"gouge")){tryUse(u,"gouge");return}}
    if(d>7&&d<20&&(!MELEE[e.cls]||slowPct(u)>0||rooted(u))&&this.ready("sprint"))tryUse(u,"sprint");
    if(u.hp<u.maxHp*.5&&MELEE[e.cls]&&this.ready("evasion"))tryUse(u,"evasion");
    if(u.hp<u.maxHp*.4&&!incap(e)&&!drImmune(e,"blind")&&!e.auras.some(a=>a.type==="dot"&&a.until>now)&&d<=10&&this.ready("blind")){tryUse(u,"blind");return}
    if(d>3.2)this.moveTo(e.pos);else this.stop();
    if(this.ready("prep")&&(u.cds.vanish||0)>now+20&&u.hp<u.maxHp*.4)tryUse(u,"prep");
    if(d>5||e.auras.some(a=>a.breakOnDmg&&a.until>now)||isImmune(e)||has(e,"bop"))return;
    if(this.ready("adrenaline"))tryUse(u,"adrenaline");
    if(this.ready("riposte")){tryUse(u,"riposte");return}
    if(this.ready("bladeflurry"))tryUse(u,"bladeflurry");
    if(u.cp>=2&&!has(u,"slice")&&e.hp>e.maxHp*.35&&this.ready("slice")){tryUse(u,"slice");return}
    if(u.cp>=4&&this.ready("kidney")&&!drImmune(e,"kidney")&&!incap(e)){tryUse(u,"kidney");return}
    if(u.cp>=5||(u.cp>=3&&e.hp<e.maxHp*.25)){if(this.ready("coldblood"))tryUse(u,"coldblood");if(this.ready("eviscerate")){tryUse(u,"eviscerate");return}}
    if(u.cp<5&&behind(u,e)&&this.ready("backstab")){tryUse(u,"backstab");return}
    if(u.cp<5&&MELEE[e.cls]&&this.ready("ghostly")){tryUse(u,"ghostly");return}
    if(u.cp<5&&this.ready("hemo")){tryUse(u,"hemo");return}
    if(u.cp<5&&this.ready("sinister"))tryUse(u,"sinister");
  }
  paladin(){
    const u=this.u,e=this.e,d=dist(u,e),eCC=incap(e);
    if(u.cast){this.stop();return}
    if(has(u,"incap")||has(u,"fear"))return;
    if(u.hp<u.maxHp*.3&&this.ready("bubble")){tryUse(u,"bubble");return}
    if(u.hp<u.maxHp*.3&&MELEE[e.cls]&&!has(u,"immune")&&this.ready("bop")){tryUse(u,"bop");return}
    if(u.hp<u.maxHp*.18&&!has(u,"immune")&&this.ready("loh")){tryUse(u,"loh");return}
    if(has(u,"stun"))return;
    if(has(u,"immune")&&u.hp<u.maxHp*.9){this.stop();if(this.ready("holylight"))tryUse(u,"holylight");else if(this.ready("flashlight"))tryUse(u,"flashlight");return}
    if((rooted(u)||slowPct(u)>30)&&this.ready("freedom")){tryUse(u,"freedom");return}
    /* корни, безмолвие и замедления снимаем сразу; яды и доты — не чаще раза в 6 с, иначе паладин тратит весь бой на Очищение */
    const urgent=u.auras.some(a=>!a.good&&a.until>now&&(a.dt==="magic"||a.dt==="poison")&&(a.type==="slow"&&a.until-now>3||a.type==="root"||a.type==="silence"));
    const dots=u.auras.some(a=>!a.good&&a.until>now&&a.dt!=="none"&&(a.type==="dot"||a.dt==="poison"||a.dt==="disease"));
    if((urgent||dots&&now>=(this.cleanseAt||0))&&this.ready("cleanse")){tryUse(u,"cleanse");this.cleanseAt=now+6;return}
    if(!has(u,"seal")&&u.res>600){const sl=this.ready("sealC")?"sealC":"sealR";if(this.ready(sl)){tryUse(u,sl);return}}
    if(e.hp<=e.maxHp*.2&&d<=30&&this.ready("wrath")&&!u.moving){this.stop();tryUse(u,"wrath");return}
    if(!canSee(u,e)){this.hunt(["consecration"]);return}
    if(this.wantsKick()&&d<=10&&!drImmune(e,"stun")&&this.ready("hammer")){tryUse(u,"hammer");return}
    if(u.hp<u.maxHp*.45&&!eCC){if(d<=10&&this.ready("repentance")&&!drImmune(e,"repent")){tryUse(u,"repentance");return}if(d<=10&&this.ready("hammer")&&!drImmune(e,"stun")){tryUse(u,"hammer");return}}
    const left=Math.max(...e.auras.filter(a=>LOSS[a.type]&&a.until>now).map(a=>a.until-now),0);
    if(u.hp<u.maxHp*.5&&this.ready("dfavor"))tryUse(u,"dfavor");
    if(u.hp<u.maxHp*.7&&(left>1.6||d>16&&!MELEE[e.cls]&&!e.cast)){this.stop();if(left>2.6&&this.ready("holylight"))tryUse(u,"holylight");else if(this.ready("flashlight"))tryUse(u,"flashlight");return}
    if(this.ready("holyshield")&&MELEE[e.cls]&&d<8)tryUse(u,"holyshield");
    if(d>3.2)this.moveTo(e.pos);else this.stop();
    if(isImmune(e)||e.auras.some(a=>a.breakOnDmg&&a.until>now))return;
    if(d<6&&e.cls==="rogue"&&u.res>u.maxRes*.5&&this.ready("consecration")){tryUse(u,"consecration");return}
    if(this.ready("judgement")){tryUse(u,"judgement");return}
    if(this.ready("holyshock"))tryUse(u,"holyshock");
  }
  priest(){
    const u=this.u,e=this.e,d=dist(u,e),see=los(u.pos,e.pos)&&canSee(u,e),melee=MELEE[e.cls],sf=has(u,"shadowform");
    if(!this.side)this.side=Math.random()<.5?1:-1;
    if(u.cast){this.stop();return}
    if(incap(u))return;
    if(this.prebuff())return;
    if(u.auras.some(a=>!a.good&&a.dt==="magic"&&a.until>now&&(a.type==="root"&&melee||a.type==="silence"||a.type==="slow"&&melee&&d<10))&&this.ready("dispel")){tryUse(u,"dispel");return}
    if(this.ready("pws")&&!has(u,"absorb")){tryUse(u,"pws");return}
    if(u.hp<u.maxHp*.3&&this.ready("desperate")){tryUse(u,"desperate");return}
    const S=eff(u,"scream");
    if(melee&&d<S.radius-1&&!this.locked()&&!drImmune(e,"fear")&&!isImmune(e)&&canSee(u,e)&&this.ready("scream")){tryUse(u,"scream");return}
    if(!canSee(u,e)){this.hunt(["scream"]);return}
    if(this.wantsKick()&&d<=20&&this.ready("silence"))tryUse(u,"silence");
    if(u.abilities.includes("shadowform")){
      if(!sf&&u.hp>u.maxHp*.55&&this.ready("shadowform")){tryUse(u,"shadowform");return}
      if(sf&&(u.hp<u.maxHp*.35&&(incap(e)||d>14)||lockedSchool(u,"shadow")&&u.hp<u.maxHp*.8)&&this.ready("shadowform")){tryUse(u,"shadowform");return}
    }
    if(this.ready("pi"))tryUse(u,"pi");
    if(see&&d<=30&&!e.auras.some(x=>x.type==="ve"&&x.src===u)&&this.ready("vampiric")){tryUse(u,"vampiric");return}
    if(this.ready("innerfocus")&&u.res<u.maxRes*.6)tryUse(u,"innerfocus");
    const eCC=incap(e);
    if(!sf&&u.hp<u.maxHp*.85&&!has(u,"hot")&&this.ready("renew")){tryUse(u,"renew");return}
    if(!sf&&u.hp<u.maxHp*.5&&eCC&&Math.max(...e.auras.filter(a=>LOSS[a.type]).map(a=>a.until-now),0)>3.2&&this.ready("gheal")){this.stop();tryUse(u,"gheal");return}
    if(!sf&&u.hp<u.maxHp*.7&&(eCC||d>14&&melee&&rooted(e))&&this.ready("flash")){this.stop();tryUse(u,"flash");return}
    if(!sf&&u.hp<u.maxHp*.5&&(has(u,"absorb")||!melee||d>8)&&this.ready("flash")){this.stop();tryUse(u,"flash");return}
    if(melee&&d<9&&!this.locked()){
      if(d<7&&this.ready("flay")&&!has(u,"root")&&slowPct(e)<40&&Math.random()<.25){this.stop();this.face();tryUse(u,"flay");return}
      this.kite();if(see&&!auraNamed(e,ab("priest","swp").name)&&this.ready("swp"))tryUse(u,"swp");return}
    if(!see||d>28){this.moveTo(e.pos);return}
    this.stop();
    if(isImmune(e))return;
    if(e.auras.some(a=>a.good&&a.mb&&a.until>now&&["absorb","manashield","bop","freedom","hot"].includes(a.type))&&!u.auras.some(a=>!a.good&&a.dt==="magic")&&Math.random()<.3&&this.ready("dispel")){tryUse(u,"dispel");return}
    if(!sf&&u.hp<u.maxHp*.5&&this.ready("flash")){tryUse(u,"flash");return}
    if(!auraNamed(e,ab("priest","swp").name)&&this.ready("swp")){tryUse(u,"swp");return}
    if(this.ready("mindblast")){tryUse(u,"mindblast");return}
    if(e.resType==="mana"&&e.res>e.maxRes*.35&&!melee&&Math.random()<.5&&this.ready("manaburn")){tryUse(u,"manaburn");return}
    if(this.ready("flay")&&Math.random()<.5){tryUse(u,"flay");return}
    if(!sf&&this.ready("holyfire")){tryUse(u,"holyfire");return}
    if(!sf&&u.hp<u.maxHp*.85&&this.ready("flash")){tryUse(u,"flash");return}
    if(!sf&&this.ready("smite"))tryUse(u,"smite");
  }
}
function drImmune(t,type){const d=t.dr[type];if(!d||now>=d.reset)return false;const s=B.general.drSteps;return !(s[Math.min(d.level,s.length-1)]>0)}

/* ================= ЧАСТИЦЫ И СПЕЦЭФФЕКТЫ ================= */
/* атлас 4×4 из текстур частиц WoW; все частицы рисуются одним облаком точек со сложением цвета */
const FXT={glow:0,flame:1,snow:2,star:3,smoke:4,burst:5,ring:6,bubble:7,swirl:8,rune:9,holyrune:10,zap:11,starburst:12,wisp:13,spiky:14,flare:15};
const ATLAS=new THREE.TextureLoader().load("assets/fx/atlas.webp");
const PF={N:1500,i:0,live:0};
{const N=PF.N;PF.pos=new Float32Array(N*3);PF.col=new Float32Array(N*3);PF.sz=new Float32Array(N);PF.tl=new Float32Array(N*2);
 PF.vel=new Float32Array(N*3);PF.age=new Float32Array(N).fill(9);PF.life=new Float32Array(N).fill(1);PF.s0=new Float32Array(N);PF.s1=new Float32Array(N);
 PF.c0=new Float32Array(N*3);PF.c1=new Float32Array(N*3);PF.grav=new Float32Array(N);PF.drag=new Float32Array(N);PF.spin=new Float32Array(N);
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(PF.pos,3));g.setAttribute("pcol",new THREE.BufferAttribute(PF.col,3));
 g.setAttribute("psize",new THREE.BufferAttribute(PF.sz,1));g.setAttribute("ptile",new THREE.BufferAttribute(PF.tl,2));
 PF.mat=new THREE.ShaderMaterial({uniforms:{map:{value:ATLAS},scale:{value:500}},
  vertexShader:"attribute float psize;attribute vec2 ptile;attribute vec3 pcol;varying vec3 vC;varying vec2 vT;uniform float scale;"+
   "void main(){vC=pcol;vT=ptile;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=psize*scale/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}",
  fragmentShader:"uniform sampler2D map;varying vec3 vC;varying vec2 vT;"+
   "void main(){vec2 p=gl_PointCoord-.5;float c=cos(vT.y),s=sin(vT.y);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+.5;if(p.x<0.||p.x>1.||p.y<0.||p.y>1.)discard;"+
   "vec2 uv=(vec2(mod(vT.x,4.),3.-floor(vT.x/4.))+vec2(p.x,1.-p.y))/4.;gl_FragColor=vec4(texture2D(map,uv).rgb*vC,1.);}",
  blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
 PF.pts=new THREE.Points(g,PF.mat);PF.pts.frustumCulled=false;PF.pts.renderOrder=5;scene.add(PF.pts);}
const _c=new THREE.Color();
function hexRGB(h,arr,o){_c.setHex(h);arr[o]=_c.r;arr[o+1]=_c.g;arr[o+2]=_c.b;}
/* одна частица: t — ячейка атласа, v — скорость, s0→s1 — размер, c0→c1 — цвет, g — тяжесть, d — торможение */
function pfx(x,y,z,o){
  const i=PF.i;PF.i=(i+1)%PF.N;const i3=i*3,v=o.v||[0,0,0];
  PF.pos[i3]=x;PF.pos[i3+1]=y;PF.pos[i3+2]=z;PF.vel[i3]=v[0];PF.vel[i3+1]=v[1];PF.vel[i3+2]=v[2];
  PF.age[i]=0;PF.life[i]=o.life||.6;PF.s0[i]=o.s0||.5;PF.s1[i]=o.s1!=null?o.s1:PF.s0[i];
  hexRGB(o.c0||0xffffff,PF.c0,i3);hexRGB(o.c1!=null?o.c1:(o.c0||0xffffff),PF.c1,i3);const a=o.a!=null?o.a:1;for(let k=0;k<3;k++){PF.c0[i3+k]*=a;PF.c1[i3+k]*=a;}
  PF.grav[i]=o.g||0;PF.drag[i]=o.d||0;PF.spin[i]=o.spin||0;PF.tl[i*2]=o.t||0;PF.tl[i*2+1]=o.rot!=null?o.rot:Math.random()*6.28;PF.sz[i]=0;
}
function updatePfx(dt){
  let live=0;
  for(let i=0;i<PF.N;i++){if(PF.age[i]>=PF.life[i]){if(PF.sz[i])PF.sz[i]=0;continue}
    live++;const a=(PF.age[i]+=dt),k=Math.min(1,a/PF.life[i]),i3=i*3;
    if(k>=1){PF.sz[i]=0;continue}
    PF.vel[i3+1]-=PF.grav[i]*dt;const dr=Math.max(0,1-PF.drag[i]*dt);PF.vel[i3]*=dr;PF.vel[i3+1]*=dr;PF.vel[i3+2]*=dr;
    PF.pos[i3]+=PF.vel[i3]*dt;PF.pos[i3+1]+=PF.vel[i3+1]*dt;PF.pos[i3+2]+=PF.vel[i3+2]*dt;
    PF.sz[i]=PF.s0[i]+(PF.s1[i]-PF.s0[i])*k;PF.tl[i*2+1]+=PF.spin[i]*dt;
    const f=k<.12?k/.12:1-(k-.12)/.88;for(let j=0;j<3;j++)PF.col[i3+j]=(PF.c0[i3+j]+(PF.c1[i3+j]-PF.c0[i3+j])*k)*f;}
  if(live||PF.live){const at=PF.pts.geometry.attributes;at.position.needsUpdate=at.pcol.needsUpdate=at.psize.needsUpdate=at.ptile.needsUpdate=true;}
  PF.live=live;
  PF.mat.uniforms.scale.value=renderer.domElement.height/(2*Math.tan(camera.fov*Math.PI/360));
}
/* оформление школ магии: ячейки атласа и цвета от вспышки к затуханию */
const SCH_FX={fire:{t:[FXT.flame,FXT.glow],c0:0xffa040,c1:0xc01800},frost:{t:[FXT.snow,FXT.glow],c0:0x90ccff,c1:0x2050d0},
  arcane:{t:[FXT.spiky,FXT.glow],c0:0xd890ff,c1:0x5020c0},holy:{t:[FXT.star,FXT.glow],c0:0xffe080,c1:0xd07810},
  shadow:{t:[FXT.wisp,FXT.smoke],c0:0xc090ff,c1:0x2a0a50},nature:{t:[FXT.glow,FXT.star],c0:0xc0ffa0,c1:0x208010},
  phys:{t:[FXT.flare,FXT.spiky],c0:0xffffff,c1:0x8a7a60}};
const rnd=(a,b)=>a+Math.random()*(b-a);
function sphereV(sp){const u=Math.random()*2-1,th=Math.random()*6.283,r=Math.sqrt(1-u*u);return [r*Math.cos(th)*sp,u*sp,r*Math.sin(th)*sp];}
/* взрыв частиц школы в точке */
function schoolBurst(x,y,z,sch,n,sp,size){const S=SCH_FX[sch]||SCH_FX.phys;size=size||.6;
  pfx(x,y,z,{t:FXT.glow,life:.35,s0:size*3,s1:size*4.5,c0:S.c0,c1:S.c1});
  for(let i=0;i<n;i++)pfx(x,y,z,{t:S.t[i%S.t.length],v:sphereV(rnd(sp*.4,sp)),life:rnd(.35,.7),s0:size*rnd(.6,1.1),s1:size*.2,c0:S.c0,c1:S.c1,d:3,g:sch==="fire"?-2:sch==="frost"?3:0,spin:rnd(-4,4)});}
/* плоские наземные метки (кольца, руны) из той же текстуры */
const TILE_GEO={};
function tileGeo(t){if(TILE_GEO[t])return TILE_GEO[t];const g=new THREE.PlaneGeometry(2,2),uv=g.attributes.uv,cx=t%4,cy=3-Math.floor(t/4);
  for(let i=0;i<uv.count;i++)uv.setXY(i,(cx+uv.getX(i))/4,(cy+uv.getY(i))/4);return TILE_GEO[t]=g;}
function fxMat(color,op){return new THREE.MeshBasicMaterial({map:ATLAS,color,transparent:true,opacity:op==null?1:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});}
function groundFx(x,z,t,color,r0,r1,dur,spin,y){const m=new THREE.Mesh(tileGeo(t),fxMat(color));m.rotation.x=-Math.PI/2;m.position.set(x,(y||.08)+GY(x,z),z);m.renderOrder=4;
  addFx(m,dur,k=>{m.scale.setScalar(r0+(r1-r0)*(1-(1-k)*(1-k)));m.rotation.z=k*(spin||0);m.material.opacity=k<.15?k/.15:1-(k-.15)/.85;});}
/* щит или пузырь, всегда повёрнутый к камере */
function billboard(t,size,color,op){const m=new THREE.Mesh(tileGeo(t),fxMat(color,op));m.scale.setScalar(size/2);m.visible=false;m.renderOrder=6;scene.add(m);return m;}
/* модели снарядов и состояний из клиента */
const FXM={};
function fxModel(name,scale){const src=ASSETS.fxm&&ASSETS.fxm.getObjectByName(name);if(!src)return null;
  const o=THREE.SkeletonUtils.clone(src);o.position.set(0,0,0);if(scale)o.scale.setScalar(scale);
  o.traverse(x=>{if(x.isMesh){x.frustumCulled=false;const map=x.material.map;
    const solid=name==="hammer"||(name==="iceblock"&&/ice3b/.test(x.material.name||""));
    x.material=solid?new THREE.MeshStandardMaterial({map,roughness:.25,metalness:.1,transparent:name==="iceblock",opacity:name==="iceblock"?.72:1,depthWrite:name!=="iceblock"})
      :new THREE.MeshBasicMaterial({map,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});}});
  return o;}
/* отклик на применение способности без цели: кольцо и искры своей школы */
const OWN_FX={cone:1,nova:1,explosion:1,scream:1,consecration:1,blink:1,food:1,flashlight:1,holylight:1,flash:1,gheal:1,loh:1};
function useFx(u,id){const m=META[id];if(!m||m.target||OWN_FX[id]||m2Has(id,"cast")||m2Has(id,"impact"))return;
  if(id==="stealth"||id==="vanish"){for(let i=0;i<(id==="vanish"?22:10);i++)pfx(u.pos.x+rnd(-.5,.5),u.y+rnd(.2,1.8),u.pos.z+rnd(-.5,.5),{t:FXT.smoke,v:sphereV(1.2),life:rnd(.7,1.1),s0:.8,s1:1.8,c0:0x6a6a7a,c1:0x101014,d:1});return}
  const sch=m.school||"phys",S=SCH_FX[sch],col=sch==="phys"?0xff6a30:S.c1,c0=sch==="phys"?0xffc890:S.c0;
  groundFx(u.pos.x,u.pos.z,FXT.ring,col,.5,2.2,.6,0);
  for(let i=0;i<14;i++){const a=i/14*6.283;pfx(u.pos.x+Math.cos(a)*.8,u.y+.2,u.pos.z+Math.sin(a)*.8,{t:sch==="phys"?FXT.glow:S.t[0],v:[0,rnd(2,3.5),0],life:.6,s0:.4,s1:.1,c0,c1:col,spin:3});}}
function impactFx(t,sch,crit,big){if(m2Skip())return;const y=t.y+1.2;
  if(sch==="phys"){const n=crit?12:5;pfx(t.pos.x,y,t.pos.z,{t:FXT.starburst,life:.18,s0:crit?1.6:.9,s1:crit?2.4:1.3,c0:0xfff0d0});
    for(let i=0;i<n;i++)pfx(t.pos.x,y,t.pos.z,{t:FXT.flare,v:sphereV(rnd(3,7)),life:rnd(.15,.3),s0:.35,s1:.05,c0:0xffe8b0,c1:0xff7020,d:4,g:6});return}
  schoolBurst(t.pos.x,y,t.pos.z,sch,big?26:crit?20:12,big?7:5,big||crit?.75:.55);
  if(sch==="frost")for(let i=0;i<6;i++)pfx(t.pos.x+rnd(-.4,.4),y+rnd(-.3,.4),t.pos.z+rnd(-.4,.4),{t:FXT.snow,v:[rnd(-1,1),rnd(-1,.5),rnd(-1,1)],life:1,s0:.35,s1:.15,c0:0xe8f8ff,c1:0x6aa0ff,g:1.5,spin:3});
  if(sch==="shadow")for(let i=0;i<6;i++)pfx(t.pos.x,y,t.pos.z,{t:FXT.smoke,v:sphereV(1.5),life:.9,s0:.6,s1:1.4,c0:0x6a3a9a,c1:0x100018,d:1});
}
function healFx(u,big){if(m2Skip())return;const S=SCH_FX.holy,n=big?24:12;
  groundFx(u.pos.x,u.pos.z,FXT.holyrune,0xffe090,1.2,1.8,1.1,1.5);
  for(let i=0;i<n;i++){const a=Math.random()*6.283,r=rnd(.2,.9);pfx(u.pos.x+Math.cos(a)*r,u.y+rnd(.1,1.6),u.pos.z+Math.sin(a)*r,{t:i%3?FXT.star:FXT.glow,v:[0,rnd(1.5,3.2),0],life:rnd(.6,1.1),s0:rnd(.3,.55),s1:.1,c0:S.c0,c1:S.c1,spin:rnd(-2,2)});}}
function emitCastHands(u,dt){const m=u.model,id=u.cast.id,sch=META[id].school||"arcane",S=SCH_FX[sch]||SCH_FX.arcane;
  m.fxAcc=(m.fxAcc||0)+dt*28;const p=tmp;
  while(m.fxAcc>=1){m.fxAcc--;
    for(const b of [m.spellBone,m.handL]){if(!b)continue;b.getWorldPosition(p);
      const a=Math.random()*6.283,r=rnd(.05,.25);
      pfx(p.x+Math.cos(a)*r,p.y+rnd(-.05,.15),p.z+Math.sin(a)*r,{t:S.t[Math.random()<.65?0:1],v:[-Math.cos(a)*.6,rnd(.5,1.4),-Math.sin(a)*.6],life:rnd(.3,.55),s0:rnd(.2,.36),s1:.05,c0:S.c0,c1:S.c1,spin:rnd(-5,5)});}}}

/* ================= ЭФФЕКТЫ ================= */
function addFx(mesh,dur,fn){scene.add(mesh);fxs.push({mesh,t0:now,dur,fn});}
function burstFx(p,color){const by=GY(p.x,p.z)+1.2;pfx(p.x,by,p.z,{t:FXT.glow,life:.4,s0:2.2,s1:3.4,c0:color});
  for(let i=0;i<14;i++)pfx(p.x,by,p.z,{t:i%2?FXT.spiky:FXT.glow,v:sphereV(rnd(2,5)),life:rnd(.35,.6),s0:.5,s1:.1,c0:0xffffff,c1:color,d:3,spin:rnd(-4,4)});}
const COLOR_SCH={0xaee6ff:"frost",0xc792ff:"arcane",0x9b6bff:"shadow",0xff6a3a:"fire"};
function novaFx(p,r,color){const sch=COLOR_SCH[color]||"phys",S=SCH_FX[sch];
  _c.setHex(color).multiplyScalar(.55);const dim=_c.getHex();groundFx(p.x,p.z,FXT.ring,dim,.6,r,.55,0);const ny=GY(p.x,p.z);
  for(let i=0;i<40;i++){const a=i/40*6.283,sp=r/.45*rnd(.7,1);pfx(p.x+Math.cos(a)*.5,ny+.4+rnd(0,.7),p.z+Math.sin(a)*.5,{t:S.t[i%2],v:[Math.cos(a)*sp,rnd(0,1),Math.sin(a)*sp],life:.5,s0:.7,s1:.3,c0:S.c0,c1:S.c1,a:.7,d:1.5,spin:3});}}
/* анимации способностей из SpellVisualKit.dbc 1.12 (каст/подготовка); kidney оставлен по правке Сергея */
const ORIG_ANIM={"cleave":"special","slam":"special","whirlwind":"special","sunder":"special","thunderclap":"roar","revenge":"special","demoshout":"roar","battleshout":"roar","howl":"roar","concussion":"special","retaliation":"emoteroar","deathwish":"emoteroar","sweeping":"emoteroar","mortal":"special","bloodthirst":"special","shieldslam":"shieldbash","heroic":"special","overpower":"special","execute":"special","rend":"special","hamstring":"special","pummel":"specialunarmed","shieldbash":"shieldbash","disarm":"special","shout":"roar","reckless":"emoteroar","battle":"roar","defensive":"roar","berserker":"roar","frostbolt":"cast","fireball":"cast","fireblast":"cast","cone":"cast","nova":"castomni","poly":"cast","counter":"cast","blink":"castomni","iceblock":"castomni","manashield":"castomni","frostarmor":"castomni","explosion":"castomni","apower":"castomni","combust":"castomni","barrier":"castomni","crip":"usestandend","numb":"cast","deadly":"usestandend","sap":"attack","cheapshot":"attack","garrote":"special","ambush":"attackpierce","sinister":"attack","backstab":"attackpierce","eviscerate":"special","slice":"attackunarmed","rupture":"special","gouge":"special","kick":"kick","blind":"throw","vanish":"castomni","evasion":"castomni","adrenaline":"roar","judgement":"cast","hammer":"specialunarmed","holylight":"castomni","bubble":"castomni","freedom":"castomni","bop":"castomni","cleanse":"castomni","loh":"cast","consecration":"castomni","holyshock":"cast","holyshield":"shieldblock","repentance":"cast","swp":"castomni","mindblast":"castomni","flay":"channel","manaburn":"castomni","smite":"cast","holyfire":"castomni","pws":"castomni","flash":"castomni","gheal":"castomni","renew":"castomni","scream":"roar","dispel":"castomni","innerfire":"castomni","pi":"castomni","desperate":"castomni","silence":"cast","dfavor":"castomni","pyroblast":"cast","blastwave":"castomni","coldsnap":"castomni","scorch":"cast","flamestrike":"castomni","blizzard":"channelomni","fireward":"castomni","frostward":"castomni","riposte":"special","bladeflurry":"castomni","ghostly":"special","hemo":"special","expose":"special","dprot":"castomni","bom":"castomni","bow":"castomni","kings":"castomni","sanctbless":"castomni","sacrifice":"castomni"},ORIG_PRE={"frostbolt":"castloop","fireball":"castloop","cone":"readyomni","nova":"readyomni","poly":"readyomni","counter":"readyomni","blink":"readyomni","iceblock":"readyomni","manashield":"readyomni","frostarmor":"castloop","explosion":"readyomni","apower":"readyomni","combust":"readyomni","barrier":"readyomni","crip":"usestandloop","numb":"castloop","deadly":"usestandloop","evasion":"readyomni","flashlight":"readyomni","holylight":"readyomni","bubble":"readyomni","freedom":"readyomni","bop":"readyomni","cleanse":"readyomni","loh":"castloop","holyshock":"castloop","swp":"readyomni","mindblast":"castloop","manaburn":"readyomni","smite":"castloop","holyfire":"readyomni","pws":"readyomni","flash":"readyomni","gheal":"readyomni","renew":"readyomni","dispel":"readyomni","innerfire":"readyomni","pi":"readyomni","silence":"castloop","dfavor":"readyomni","pyroblast":"castloop","blastwave":"readyomni","scorch":"castloop","flamestrike":"readyomni","blizzard":"readyomni","fireward":"readyomni","frostward":"readyomni","bladeflurry":"readyomni","dprot":"readyomni","bom":"readyomni","bow":"readyomni","kings":"readyomni","sanctbless":"readyomni","sacrifice":"readyomni"};
function oAnim(m,anim){const o=fxSpell&&ORIG_ANIM[fxSpell];return o&&m.acts&&m.acts[o]?o:anim}
function swingFx(u,anim){const m=u.model;m.swing=1;sfx(u.cls==="rogue"?"swing":"swing2h",u,{vol:.45});if(m.acts){m.swingN++;playOnce(m,oAnim(m,anim||(m.swingN%2?"attack":"attack2")),1.4,false,u.moving||u.air);}}
function castFx(u,anim){if(u.model.acts)playOnce(u.model,oAnim(u.model,anim||"cast"),1.3,false,u.moving||u.air);}
function roarFx(u){if(u.model.acts)playOnce(u.model,oAnim(u.model,"roar"),1.3,false,u.moving||u.air);}
function coneFx(u,r,color){const fx=Math.sin(u.facing),fz=Math.cos(u.facing);
  for(let i=0;i<54;i++){const a=u.facing+rnd(-1,1)*Math.PI/3*.85,sp=rnd(.55,1)*r/.5;
    pfx(u.pos.x+fx*.8,u.y+1.1+rnd(-.3,.3),u.pos.z+fz*.8,{t:i%3?FXT.snow:FXT.smoke,v:[Math.sin(a)*sp,rnd(-.6,.4),Math.cos(a)*sp],life:.5,s0:.4,s1:i%3?.3:1.6,c0:0xe8f6ff,c1:0x3a7aff,d:2,spin:4});}}
/* снаряд: ядро из модели клиента, свечение и след из частиц */
const PROJ_MODEL={frost:"frostbolt",fire:"fireball",arcane:"arcane"};
function projectile(u,t,speed,school,onHit,kind){const vid=fxSpell,mis=vid&&M2.vis&&M2.vis[vid]&&M2.vis[vid].missile;if(mis&&M2.defs&&M2.defs[mis])return projectileM2(u,t,speed,onHit,vid,mis);
  const g=new THREE.Group(),S=SCH_FX[school]||SCH_FX.arcane,mk=kind||PROJ_MODEL[school];
  const core=mk?fxModel(mk,mk==="hammer"?1.5:mk==="arcane"?.7:1):null;if(core){core.rotation.y=-Math.PI/2;g.add(core);}
  const gl=new THREE.Mesh(tileGeo(FXT.glow),fxMat(S.c0,.95));gl.scale.setScalar(school==="arcane"?.55:mk==="hammer"?.6:.85);g.add(gl);g.userData.glow=gl;
  g.position.set(u.pos.x,1.5,u.pos.z);if(u.model.spellBone){u.model.g.updateMatrixWorld(true);u.model.spellBone.getWorldPosition(g.position);}
  scene.add(g);projectiles.push({m:g,t,speed,onHit,school,kind,acc:0,vid});fxLaunched=true;}
function projectileM2(u,t,speed,onHit,vid,mis){const g=new THREE.Group();g.position.set(u.pos.x,1.5,u.pos.z);if(u.model.spellBone){u.model.g.updateMatrixWorld(true);u.model.spellBone.getWorldPosition(g.position);}
  scene.add(g);fxLaunched=true;const p={m:g,t,speed,onHit,vid,acc:0,m2:true};p.fx=m2Play(mis,fx=>{fx.pos.copy(g.position);fx.yaw=Math.atan2(p.t.pos.x-g.position.x,p.t.pos.z-g.position.z);return p.done?false:undefined});projectiles.push(p);}
const _q=new THREE.Quaternion();
function projFx(p,dt){const S=SCH_FX[p.school]||SCH_FX.arcane,q=p.m.position;p.m.lookAt(tmp);
  const gl=p.m.userData.glow;gl.quaternion.copy(_q.copy(p.m.quaternion).invert()).multiply(camera.quaternion);
  p.acc+=dt*(p.kind==="hammer"?40:90);
  while(p.acc>=1){p.acc--;pfx(q.x+rnd(-.12,.12),q.y+rnd(-.12,.12),q.z+rnd(-.12,.12),{t:S.t[Math.random()<.6?0:1],v:[rnd(-.5,.5),rnd(-.2,.7),rnd(-.5,.5)],life:rnd(.25,.45),s0:rnd(.35,.55),s1:.08,c0:S.c0,c1:S.c1,spin:rnd(-5,5),g:p.school==="frost"?2:-1});}}

/* ================= ИНТЕРФЕЙС ================= */
/* потеря контроля над своим персонажем: самый сильный эффект и сколько осталось */
const LOC_PRI={stun:5,incap:5,fear:5,silence:3,lockout:3,disarm:2,root:1};
function updateLoc(u){const el=$("#loc");let best=null;
  if(u&&u.alive)for(const a of u.auras)if(LOC_PRI[a.type]&&a.until>now&&(!best||LOC_PRI[a.type]>LOC_PRI[best.type]||(LOC_PRI[a.type]===LOC_PRI[best.type]&&a.until>best.until)))best=a;
  if(!best){if(!el.hidden)el.hidden=true;return}
  el.style.setProperty("--ls",B.general.locScale||1);
  el.hidden=false;const ic=auraIcon(best);if(el._ic!==ic){el.querySelector(".locic").style.cssText=iconBg(ic,52);el._ic=ic;}
  el.querySelector("b").textContent=best.name;el.querySelector("span").textContent=(best.until-now).toFixed(1)+" с";}
function renderFrame(u,id){if(id==="p")updateLoc(u);
  $("#"+id+"n").textContent=u.name;$("#"+id+"c").textContent=`${B[u.cls].name} · ${buildSummary(u.cls,u.talents)}`;
  $("#"+id+"hp").style.width=(u.hp/u.maxHp*100)+"%";
  const ab_=aura(u,"absorb");$("#"+id+"ab").style.width=ab_?(Math.min(1,ab_.amount/u.maxHp)*100)+"%":"0";
  $("#"+id+"hpt").textContent=`${Math.ceil(u.hp)} / ${u.maxHp}`;
  const r=$("#"+id+"r");r.style.width=(u.res/u.maxRes*100)+"%";r.style.setProperty("--c",RES_COLOR[u.resType]);
  $("#"+id+"rt").textContent=`${Math.floor(u.res)} / ${u.maxRes}`;
  $("#"+id+"lv").classList.toggle("combat",inCombat(u));
  if(id==="t"){
    const vis=canSee(player,u);$("#tf").style.visibility=vis?"":"hidden";$("#tauras").style.visibility=vis?"":"hidden";
    const cb=$("#tcast");
    if(u.cast&&vis){cb.hidden=false;const a=ab(u.cls,u.cast.id);let k=(now-u.cast.start)/(u.cast.end-u.cast.start);if(u.cast.channel)k=1-k;cb.querySelector("i").style.width=(Math.max(0,Math.min(1,k))*195)+"px";cb.querySelector("span").textContent=a.name;}else cb.hidden=true;
    let c="";if(player.resType==="energy")for(let i=0;i<5;i++)c+=`<i class="${i<player.cp?"on":""}" style="left:${[0,7,10,7,0][i]}px;top:${i*15}px"></i>`;
    const co=$("#combo");if(co._h!==c){co.innerHTML=c;co._h=c;}
    let dr="";for(const k in u.dr){const d=u.dr[k];if(now<d.reset){const s=B.general.drSteps,m=s[Math.min(d.level,s.length-1)];dr+=`${CC_NAME[k]}: след. ${Math.round(m*100)}%   `;}}
    const de=$("#tdr");if(de._h!==dr){de.textContent=dr;de._h=dr;}
  }
  const big=id==="p",sz=big?30:21;
  const list=u.auras.filter(a=>a.until>now&&a.type!=="lockout"||a.type==="lockout"&&a.until>now);
  list.sort((a,b)=>(b.good?1:0)-(a.good?1:0));
  let h="";for(const a of list){const left=a.until-now;const extra=a.type==="absorb"||a.type==="manashield"?Math.round(a.amount):a.type==="dampen"?dampenPct()+"%":a.charges?a.charges:a.stacks>1?a.stacks:"";
    h+=`<div class="aura ${a.good?"":"bad"}" title="${a.name}" style="${iconBg(auraIcon(a),sz-2)}${a.good?"":";border-color:"+(DISPEL_COL[a.dt]||"#c00")}">${extra!==""?`<em class="out">${extra}</em>`:""}${left<60?`<small class="out">${left<10?left.toFixed(1):Math.ceil(left)}</small>`:""}</div>`;}
  const el=$(big?"#buffs":"#tauras");if(el._h!==h){el.innerHTML=h;el._h=h;}
}
/* ================= ПАНЕЛИ ДЕЙСТВИЙ: раскладка и клавиши ================= */
const SLOTS=24;
const BASE_KEYS=["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0","Minus","Equal"];
const DEFAULT_BINDS=[...Array(SLOTS)].map((_,i)=>(i>=12?"Shift+":"")+BASE_KEYS[i%12]);
let binds=DEFAULT_BINDS.slice();try{const s=JSON.parse(store.get("arena-binds-v1")||"null");if(Array.isArray(s)&&s.length===SLOTS)binds=s;}catch(e){}
let bars={};try{bars=JSON.parse(store.get("arena-bars-v1")||"{}")||{};}catch(e){bars={}}
const saveBinds=()=>store.set("arena-binds-v1",JSON.stringify(binds));
const saveBars=()=>store.set("arena-bars-v1",JSON.stringify(bars));
const MOVE_KEYS=new Set(["KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE","Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]);
function keyStr(e){return (e.ctrlKey?"Ctrl+":"")+(e.altKey?"Alt+":"")+(e.shiftKey?"Shift+":"")+e.code}
function keyLabel(k){if(!k)return"";let p="";const m=/^((?:Ctrl\+)?(?:Alt\+)?(?:Shift\+)?)(.*)$/.exec(k);
  if(m[1].includes("Ctrl"))p+="C";if(m[1].includes("Alt"))p+="A";if(m[1].includes("Shift"))p+="S";
  let c=m[2].replace(/^Digit/,"").replace(/^Key/,"").replace(/^Numpad/,"N").replace(/^Arrow/,"");
  c={Minus:"-",Equal:"=",Backquote:"`",BracketLeft:"[",BracketRight:"]",Semicolon:";",Quote:"'",Comma:",",Period:".",Slash:"/",Backslash:"\\",Space:"Пр",Up:"↑",Down:"↓",Left:"←",Right:"→"}[c]||c;
  return p+c}
/* клавиши движения, занятые способностями без модификаторов, перестают двигать персонажа */
let movesBound=new Set();function refreshMoveBinds(){movesBound=new Set(binds.filter(k=>k&&MOVE_KEYS.has(k)));}
refreshMoveBinds();
/* раскладка класса: сохранённая, но без недоступных способностей; новые способности занимают свободные ячейки */
function layoutFor(u,page){
  const avail=u.abilities;let L=Array.isArray(bars[u.cls])&&bars[u.cls].length===SLOTS?bars[u.cls].slice():null;
  if(!L){L=Array(SLOTS).fill(null);const ord=BAR_ORDER[u.cls];let i1=0,i2=12;
    for(let k=0;k<ord.length;k++){}
    const first=avail.filter(id=>{const i=BAR_ORDER[u.cls].indexOf(id);return i>=0&&i<12}),capIds=avail.filter(id=>BAR_ORDER[u.cls].indexOf(id)<0);
    /* «cap» стоит в списке позицией: способность вершины ветки занимает её место */
    for(const id of avail){let i=BAR_ORDER[u.cls].indexOf(id);if(i<0)i=BAR_ORDER[u.cls].indexOf("cap");if(id==="flay"||id==="silence")i=BAR_ORDER[u.cls].indexOf(id);
      if(i>=0&&i<SLOTS&&!L[i])L[i]=id;else{const f=L.indexOf(null);if(f>=0)L[f]=id;}}
  }
  L=L.map(id=>id&&avail.includes(id)?id:null);
  for(const id of avail)if(!L.includes(id)){const f=L.indexOf(null);if(f>=0)L[f]=id;}
  if(!page)return L;
  /* своя нижняя панель для стойки или скрытности, верхняя общая */
  const k=u.cls+":"+page;let P=Array.isArray(bars[k])&&bars[k].length===12?bars[k].slice():null;
  if(!P){P=L.slice(0,12);if(u.cls==="warrior"){const ok=id=>!META[id].st||META[id].st.includes(page);
      const add=avail.filter(id=>META[id].st&&META[id].st.includes(page)&&!META[id].stanceSwap&&!P.includes(id));
      P=P.map(id=>id&&!ok(id)?(add.shift()||null):id);const top=L.slice(12),more=add.concat(avail.filter(id=>ok(id)&&!META[id].stanceSwap&&!P.includes(id)&&!top.includes(id)&&!add.includes(id)));P=P.map(id=>id||more.shift()||null);}}
  P=P.map(id=>id&&avail.includes(id)?id:null);
  return P.concat(L.slice(12));
}
/* страницы нижней панели: стойки воина и скрытность разбойника, как в оригинале */
const PAGES={warrior:[[null,"Боевая стойка","battle"],["defensive","Защитная стойка","defensive"],["berserker","Стойка берсерка","berserker"]],rogue:[[null,"Обычная","sinister"],["stealth","Скрытность","stealth"]]};
function pageKey(u){if(u.cls==="warrior")return u.stance&&u.stance!=="battle"?u.stance:null;if(u.cls==="rogue")return u.auras&&stealthed(u)?"stealth":null;return null}
function storeLayout(u,page,L){if(page){bars[u.cls+":"+page]=L.slice(0,12);const b=layoutFor(u,null);bars[u.cls]=b.slice(0,12).concat(L.slice(12));}else bars[u.cls]=L.slice();saveBars();}
let curPage=null;
let layout=Array(SLOTS).fill(null);
function setSlot(i,id){if(id){const j=layout.indexOf(id);if(j>=0&&j!==i)layout[j]=layout[i];}layout[i]=id;storeLayout(player,curPage,layout);buildBar();}
function slotEl(i){return document.querySelector(`.ab[data-slot="${i}"]`)}
function buildBar(){
  curPage=pageKey(player);layout=layoutFor(player,curPage);
  for(const [wrap,from] of [[$("#slots"),0],[$("#slots2"),12]]){wrap.innerHTML="";
    for(let i=from;i<from+12;i++){const s=document.createElement("div");s.className="slot";s.style.left=(8+(i-from)*42)+"px";const id=layout[i];
      const b=document.createElement("button");b.className="ab"+(id?"":" empty");b.dataset.slot=i;
      if(id){b.style.cssText=iconBg(META[id].icon||id,36);b.setAttribute("aria-label",ab(player.cls,id).name);}else b.setAttribute("aria-label","Пустая ячейка");
      b.innerHTML=`<kbd class="out">${keyLabel(binds[i])}</kbd><span class="cd out"></span>`;
      s.appendChild(b);wrap.appendChild(s);}}
  $("#slots2").classList.toggle("allempty",layout.slice(12).every(x=>!x)&&!bindMode);
  buildStance();
}
/* панель стоек и аур над панелями, как в оригинале */
function stanceIds(u){if(!u)return[];if(u.cls==="warrior")return["battle","defensive","berserker"];if(u.cls==="rogue")return["stealth"];
  if(u.cls==="paladin")return PAURAS.filter(id=>id!=="sanctaura"||rk(u,"tSanctity"));if(u.cls==="priest"&&rk(u,"tShadowform"))return["shadowform"];return[]}
function buildStance(){const el=$("#stancebar"),ids=stanceIds(player);el.innerHTML="";el.hidden=!ids.length;
  for(const id of ids){const s=document.createElement("div");s.className="slot";s.style.left=(8+ids.indexOf(id)*42)+"px";const b=document.createElement("button");b.className="ab";b.dataset.st=id;b.style.cssText=iconBg(META[id].icon||id,36);
    b.setAttribute("aria-label",ab(player.cls,id).name);b.innerHTML=`<span class="cd out"></span>`;
    b.onclick=()=>{if(!bindMode&&player)tryUse(player,id);};b.onpointerover=()=>showTip(id);b.onpointerout=()=>{$("#tip").hidden=true;};s.appendChild(b);el.appendChild(s);}}
function renderStance(){for(const b of document.querySelectorAll("#stancebar .ab")){const id=b.dataset.st,m=META[id];
  b.classList.toggle("active",(m.stanceSwap&&player.stance===id)||(m.paura&&player.auras.some(x=>x.type==="paura"&&x.icon===id))||(id==="stealth"&&stealthed(player))||(id==="shadowform"&&has(player,"shadowform")));
  const err=canUse(player,id,1)||"";b.classList.toggle("off",!!err&&!/не готова|уже активна|^Не хватает/.test(err));
  const left=Math.max(player.cds[id]||0,m.gcd!==false?player.gcdUntil:0)-now,cd=b.querySelector(".cd");cd.textContent=left>1.6?Math.ceil(left):"";cd.style.background=left>0?"rgba(0,0,0,.5)":"none";}}
function slotAbility(i){return layout[i]}
function tipHTML(u,id){const a=eff(u,id),m=META[id];
  const cost=a.cost?`${a.cost} ${RES_NAME[u.resType]}`:"",range=a.range?`Дальность ${Math.round(a.range)} м`:m.target?"":a.radius?`Радиус ${Math.round(a.radius)} м`:"";
  const cast=a.channel?`Канал ${a.channel} с`:a.cast?`Применение: ${a.cast.toFixed(1)} с`:"Мгновенное действие",cd=a.cd?`Восстановление: ${+a.cd.toFixed(1)} с`:m.once?"Раз за бой":"";
  const req=[m.st?"Стойка: "+m.st.map(s=>STANCE_NAME[s]).join(", "):"",m.stealthOnly?"Из скрытности":"",m.behind?"Со спины":"",m.ooc?"Вне боя":"",m.finisher?"Завершающий приём":""].filter(Boolean).join(" · ");
  return `<h4>${a.name}</h4><div class="row2"><span>${cost}</span><span>${range}</span></div><div class="row2"><span>${cast}</span><span>${cd}</span></div>${req?`<div class="row2"><span style="color:#ff8a5a">${req}</span></div>`:""}<div class="row2"><span style="color:#bdbdbd">${SCHOOL_NAME[m.school]}${m.gcd===false?" · без ГКД":""}</span></div><p>${m.desc(a)}</p>`;}
function showTip(id){const tip=$("#tip");tip.innerHTML=tipHTML(player,id);tip.hidden=false;}
function renderBar(){
  if(pageKey(player)!==curPage){buildBar();if(!$("#book").hidden)renderBook();}
  renderStance();
  for(let i=0;i<SLOTS;i++){const id=layout[i];if(!id)continue;const b=slotEl(i);if(!b)continue;const a=eff(player,id),m=META[id];
    const cdEnd=Math.max(player.cds[id]||0,m.gcd!==false?player.gcdUntil:0);
    const total=(player.cds[id]||0)>now?(id==="stealth"?a.cd:(m.stanceSwap?1:a.cd)):B.general.gcd;const left=cdEnd-now;const cd=b.querySelector(".cd");
    if(left>0){const pct=Math.min(100,left/(total||1)*100);cd.style.background=`conic-gradient(rgba(0,0,0,.7) ${pct}%,transparent 0)`;cd.textContent=left>1.6?(left>60?Math.ceil(left/60)+"м":Math.ceil(left)):"";}
    else{cd.style.background="none";cd.textContent="";}
    const err=canUse(player,id,1)||"";
    b.classList.toggle("nores",/^Не хватает/.test(err));
    b.classList.toggle("off",!!err&&!/не готова|^Не хватает|далеко|близко|перед вами|поля зрения|ходу|прыжке/.test(err));
    b.classList.toggle("active",(m.stanceSwap&&player.stance===id)||(id==="stealth"&&stealthed(player))||(id==="shadowform"&&has(player,"shadowform"))||(id==="heroic"&&has(player,"hsq"))||(id==="iceblock"&&has(player,"iceblock"))||(id==="food"&&!!player.eating));
    const k=b.querySelector("kbd");k.classList.toggle("far",m.target&&enemy&&(a.range&&dist(player,enemy)>a.range+B.general.reach||!!a.minRange&&dist(player,enemy)<a.minRange));}
  const pc=$("#pcast");
  if(player.cast){pc.hidden=false;pc.className="cbar";const c=player.cast,a=ab(player.cls,c.id);let k=(now-c.start)/(c.end-c.start);if(c.channel)k=1-k;k=Math.max(0,Math.min(1,k));
    pc.querySelector("i").style.width=(k*195)+"px";pc.querySelector("em").style.left=(31+k*195)+"px";pc.querySelector("em").hidden=false;pc.querySelector("span").textContent=a.name;castHideAt=0;}
  else if(castHideAt&&now>castHideAt){pc.hidden=true;castHideAt=0;}
  else if(!castHideAt&&!pc.classList.contains("ok")&&!pc.classList.contains("fail"))pc.hidden=true;
}
/* перетаскивание иконок между ячейками, из книги способностей и за пределы панели (убрать) */
let drag2=null;
function startDrag(e,id,fromSlot){drag2={id,from:fromSlot,x:e.clientX,y:e.clientY,moved:false,el:null,pid:e.pointerId};}
addEventListener("pointermove",e=>{if(!drag2||e.pointerId!==drag2.pid)return;
  if(!drag2.moved&&Math.hypot(e.clientX-drag2.x,e.clientY-drag2.y)>10){drag2.moved=true;const g=document.createElement("div");g.className="dragghost";g.style.cssText=iconBg(META[drag2.id].icon||drag2.id,36);document.body.appendChild(g);drag2.el=g;$("#tip").hidden=true;}
  if(drag2.el){drag2.el.style.left=e.clientX+"px";drag2.el.style.top=e.clientY+"px";}});
addEventListener("pointerup",e=>{if(!drag2||e.pointerId!==drag2.pid)return;const d=drag2;drag2=null;
  if(!d.moved){if(d.from!=null&&!bindMode&&player&&layout[d.from])tryUse(player,layout[d.from]);return}
  d.el.remove();const tgt=document.elementFromPoint(e.clientX,e.clientY);const sb=tgt&&tgt.closest(".ab[data-slot]");
  if(sb){const i=+sb.dataset.slot;if(d.from!=null){const x=layout[i];layout[i]=d.id;layout[d.from]=x;storeLayout(player,curPage,layout);buildBar();}else setSlot(i,d.id);}
  else if(d.from!=null&&!(tgt&&tgt.closest("#book"))){layout[d.from]=null;storeLayout(player,curPage,layout);buildBar();}});
for(const w of ["#slots","#slots2"]){const el=$(w);
  el.addEventListener("pointerdown",e=>{const b=e.target.closest(".ab[data-slot]");if(!b||e.button!==0)return;const i=+b.dataset.slot;if(bindMode){bindHover=i;markBind();return}if(layout[i])startDrag(e,layout[i],i);});
  el.addEventListener("pointerover",e=>{const b=e.target.closest(".ab[data-slot]");if(!b)return;const i=+b.dataset.slot;if(bindMode){bindHover=i;markBind();}if(layout[i]&&!drag2)showTip(layout[i]);});
  el.addEventListener("pointerout",e=>{const b=e.target.closest(".ab[data-slot]");if(b)$("#tip").hidden=true;});}
/* режим назначения клавиш */
let bindMode=false,bindHover=null;
function markBind(){document.querySelectorAll(".ab.bindsel").forEach(x=>x.classList.remove("bindsel"));const b=bindHover!=null&&slotEl(bindHover);if(b)b.classList.add("bindsel");
  $("#bindSlot").textContent=bindHover!=null?`Ячейка ${bindHover<12?"нижней":"верхней"} панели №${bindHover%12+1}${layout[bindHover]?": "+ab(player.cls,layout[bindHover]).name:""}, клавиша ${keyLabel(binds[bindHover])||"не назначена"}`:"Наведите курсор на ячейку панели.";}
function setBindMode(on){bindMode=on;$("#bindbar").hidden=!on;document.body.classList.toggle("binding",on);bindHover=null;if(player)buildBar();markBind();}
function handleBindKey(e){
  if(e.code==="Escape"){setBindMode(false);return}
  if(bindHover==null)return;
  if(/^(Shift|Control|Alt|Meta)(Left|Right)$/.test(e.code))return;
  e.preventDefault();
  if(e.code==="Backspace"||e.code==="Delete"){binds[bindHover]="";}
  else{const k=keyStr(e);const j=binds.indexOf(k);if(j>=0&&j!==bindHover)binds[j]="";binds[bindHover]=k;}
  saveBinds();refreshMoveBinds();buildBar();markBind();
}
/* книга способностей: все способности класса, перетаскиваются на панель */
function renderBook(){
  const el=$("#bookList");el.innerHTML="";
  for(const id of player.abilities){const a=eff(player,id),m=META[id];const row=document.createElement("div");row.className="brow";
    const ic=document.createElement("button");ic.className="bicon";ic.style.cssText=iconBg(META[id].icon||id,36);ic.setAttribute("aria-label",a.name);
    ic.addEventListener("pointerdown",e=>{if(e.button===0)startDrag(e,id,null);});ic.addEventListener("pointerenter",()=>showTip(id));ic.addEventListener("pointerleave",()=>$("#tip").hidden=true);
    const on=layout.indexOf(id);
    row.innerHTML=`<div><b>${a.name}</b><small>${on>=0?`на панели${binds[on]?", "+keyLabel(binds[on]):""}`:"не на панели"}</small></div>`;row.prepend(ic);el.appendChild(row);}
}
/* ================= ПОДГОТОВКА: раскладка панели и клавиши до боя ================= */
/* лёгкая копия персонажа без модели: класс, таланты и список способностей */
function loUnit(cls){const u={cls,talents:{...myTal[cls]},auras:[],cds:{},gcdUntil:0,resType:B[cls].res,stance:cls==="warrior"?"battle":null};u.K=buildK(u);u.abilities=abilityList(u);return u;}
let lo=null,loDrag=null;
function openLoadout(){const u=loUnit(settings.pcls);lo={u,page:null,L:layoutFor(u,null),hover:null};$("#loTitle").textContent=`${B[u.cls].name}: панель и клавиши`;$("#loadout").hidden=false;renderLoadout();}
function closeLoadout(){$("#loadout").hidden=true;lo=null;renderMenuBar();}
function loSave(){storeLayout(lo.u,lo.page,lo.L);}
function loHint(){$("#loHint").textContent=lo.hover!=null?`${lo.hover<12?"Нижняя":"Верхняя"} панель, ячейка ${lo.hover%12+1}${lo.L[lo.hover]?": "+ab(lo.u.cls,lo.L[lo.hover]).name:", пусто"}. Клавиша: ${keyLabel(binds[lo.hover])||"не назначена"}. Нажмите новую клавишу, чтобы заменить.`:"Наведите курсор на ячейку панели и нажмите клавишу, чтобы назначить её.";
  document.querySelectorAll(".lslot").forEach(b=>b.classList.toggle("sel",+b.dataset.slot===lo.hover));}
function renderLoadout(){
  {const pg=PAGES[lo.u.cls],el=$("#loPages");el.hidden=!pg;el.innerHTML="";
    if(pg)for(const [k,n,ic] of pg){const b=document.createElement("button");b.className="lopage"+(k===lo.page?" on":"");b.innerHTML=`<i style="${iconBg(META[ic].icon||ic,22)}"></i>${n}`;
      b.onclick=()=>{lo.page=k;lo.u.stance=lo.u.cls==="warrior"?(k||"battle"):null;lo.L=layoutFor(lo.u,k);lo.hover=null;renderLoadout();};el.appendChild(b);}
    $("#loBotLbl").textContent=pg?`Нижняя панель: ${pg.find(x=>x[0]===lo.page)[1]}`:"Нижняя панель";}
  for(const [el,from] of [[$("#loBot"),0],[$("#loTop"),12]]){el.innerHTML="";
    for(let i=from;i<from+12;i++){const id=lo.L[i],b=document.createElement("button");b.className="lslot"+(id?"":" empty");b.dataset.slot=i;
      if(id){b.style.cssText=iconBg(META[id].icon||id,44);b.setAttribute("aria-label",ab(lo.u.cls,id).name);}else b.setAttribute("aria-label","Пустая ячейка");
      b.innerHTML=`<kbd class="out">${keyLabel(binds[i])}</kbd>`;el.appendChild(b);}}
  const bk=$("#loBook");bk.innerHTML="";
  for(const id of lo.u.abilities){const a=eff(lo.u,id),on=lo.L.indexOf(id),r=document.createElement("div");r.className="lbook"+(on<0?" off":"");r.dataset.id=id;
    r.innerHTML=`<i style="${iconBg(META[id].icon||id,36)}"></i><span><b>${a.name}</b><small>${on>=0?(binds[on]?"клавиша "+keyLabel(binds[on]):"на панели, без клавиши"):"не на панели"}</small></span>`;bk.appendChild(r);}
  loHint();
}
function loInfo(id){if(id)$("#loInfo").innerHTML=tipHTML(lo.u,id);}
$("#loadout").addEventListener("pointerdown",e=>{if(!lo||e.button!==0)return;const sl=e.target.closest(".lslot"),bk=e.target.closest(".lbook");
  if(sl){const i=+sl.dataset.slot;lo.hover=i;loHint();loInfo(lo.L[i]);if(lo.L[i])loDrag={id:lo.L[i],from:i,x:e.clientX,y:e.clientY,pid:e.pointerId,moved:false};}
  else if(bk){loInfo(bk.dataset.id);loDrag={id:bk.dataset.id,from:null,x:e.clientX,y:e.clientY,pid:e.pointerId,moved:false};}
  if(loDrag)e.preventDefault();});
$("#loadout").addEventListener("pointerover",e=>{if(!lo||loDrag&&loDrag.moved)return;const sl=e.target.closest(".lslot"),bk=e.target.closest(".lbook");
  if(sl&&e.pointerType==="mouse"){const i=+sl.dataset.slot;if(lo.hover!==i){lo.hover=i;loHint();}loInfo(lo.L[i]);}else if(bk)loInfo(bk.dataset.id);});
addEventListener("pointermove",e=>{const d=loDrag;if(!d||e.pointerId!==d.pid)return;
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>8){d.moved=true;const g=document.createElement("div");g.className="dragghost";g.style.cssText=iconBg(META[d.id].icon||d.id,36);document.body.appendChild(g);d.el=g;}
  if(d.el){d.el.style.left=e.clientX+"px";d.el.style.top=e.clientY+"px";}});
addEventListener("pointerup",e=>{const d=loDrag;if(!d||e.pointerId!==d.pid)return;loDrag=null;if(!lo)return;
  if(!d.moved){/* щелчок по способности в книге ставит её в выбранную ячейку или в первую свободную */
    if(d.from==null){const j=lo.L.indexOf(d.id),i=lo.hover!=null?lo.hover:lo.L.indexOf(null);if(i>=0){if(j>=0)lo.L[j]=lo.L[i];lo.L[i]=d.id;loSave();renderLoadout();}}return}
  d.el.remove();const tgt=document.elementFromPoint(e.clientX,e.clientY),sl=tgt&&tgt.closest(".lslot");
  if(sl){const i=+sl.dataset.slot,j=d.from!=null?d.from:lo.L.indexOf(d.id);const x=lo.L[i];lo.L[i]=d.id;if(j>=0&&j!==i)lo.L[j]=x;lo.hover=i;}
  else if(d.from!=null&&!(tgt&&tgt.closest("#loBook")))lo.L[d.from]=null;
  loSave();renderLoadout();});
/* клавиши в окне подготовки перехватываются раньше игровых */
addEventListener("keydown",e=>{if(!lo||$("#loadout").hidden)return;e.stopImmediatePropagation();
  if(e.code==="Escape"){closeLoadout();return}
  if(lo.hover==null||/^(Shift|Control|Alt|Meta)(Left|Right)$/.test(e.code))return;e.preventDefault();
  if(e.code==="Backspace"||e.code==="Delete")binds[lo.hover]="";
  else{const k=keyStr(e),j=binds.indexOf(k);if(j>=0&&j!==lo.hover)binds[j]="";binds[lo.hover]=k;}
  saveBinds();refreshMoveBinds();renderLoadout();},true);
$("#loDone").onclick=closeLoadout;
$("#loBarReset").onclick=()=>{for(const k of Object.keys(bars))if(k===lo.u.cls||k.startsWith(lo.u.cls+":"))delete bars[k];saveBars();lo.L=layoutFor(lo.u,lo.page);renderLoadout();};
$("#loKeyReset").onclick=()=>{binds=DEFAULT_BINDS.slice();saveBinds();refreshMoveBinds();renderLoadout();};
/* маленькая копия панели в меню выбора класса */
function renderMenuBar(){const el=$("#menuBar");if(!el)return;const u=loUnit(settings.pcls),L=layoutFor(u);let h="";
  for(let i=0;i<12;i++){const id=L[i];h+=id?`<i style="${iconBg(META[id].icon||id,26)}" title="${ab(u.cls,id).name}"><em class="out">${keyLabel(binds[i])}</em></i>`:`<i class="empty"><em class="out">${keyLabel(binds[i])}</em></i>`;}
  el.innerHTML=h;const hd=el.previousElementSibling,pg=PAGES[u.cls];if(hd&&hd.tagName==="H2")hd.textContent="Панель способностей"+(pg?(u.cls==="warrior"?" · своя на каждую стойку":" · своя для скрытности"):"");}
$("#menuBar").onclick=openLoadout;$("#btnLoadout").onclick=openLoadout;
function toggleBook(on){const b=$("#book");b.hidden=on===undefined?!b.hidden:!on;if(!b.hidden)renderBook();}

let castHideAt=0;
function castOk(name){const pc=$("#pcast");pc.hidden=false;pc.className="cbar ok";pc.querySelector("i").style.width="195px";pc.querySelector("em").hidden=true;pc.querySelector("span").textContent=name;castHideAt=now+.35;}
function castFail(why){const pc=$("#pcast");if(pc.hidden&&!castHideAt)return;pc.hidden=false;pc.className="cbar fail";pc.querySelector("em").hidden=true;pc.querySelector("span").textContent=why;castHideAt=now+.8;}
function flashBtn(id){const i=layout.indexOf(id);const b=i>=0&&slotEl(i);if(!b)return;b.classList.add("flash");setTimeout(()=>b.classList.remove("flash"),180);}
let errT=0;function showErr(s){const e=$("#err");e.textContent=s;e.style.opacity=1;errT=now+1.2;}
function logRaw(h){if(state!=="fight")return;const l=$("#log");const d=document.createElement("div");const t=(now-roundStart).toFixed(1);d.innerHTML=`<span>[${t}]</span> ${h}`;l.prepend(d);while(l.children.length>9)l.lastChild.remove();}
function log(u,what,t){logRaw(`<b>${u.name}</b>: ${what}${t?` → ${t.name}`:""}`);}
/* всплывающий текст по правилам клиента 1.12 (WORLDTEXTSTRING, разобран в azeroth-survivors-re):
   категории 0 число, 1 «поглощено», 2 крит, 3 слово (промах/уклонение...). Позиция фиксируется над головой в момент удара,
   число всплывает на 2 ярда за 1.5 с, крит стоит на месте и «толкается» до 2x; размер не зависит от дистанции;
   не больше 4 надписей на цель, они раздвигаются, чтобы не налезать друг на друга */
const FCT=[{rise:2,fi:150,fo:760,dur:1500,v:.018333},{rise:2,fi:150,fo:90,dur:1500,v:.018333},
  {rise:0,fi:150,fo:1000,dur:1500,v:.0275,crit:1},{rise:2,fi:150,fo:1000,dur:1500,v:.018333}];
const FCT_GOLD="#ffde00",fctCtx=document.createElement("canvas").getContext("2d");
function worldText(u,s,color,cat){cat=cat|0;let slot=-1;for(let k=0;k<4;k++)if(!texts.some(t=>t.u===u&&t.slot===k)){slot=k;break}
  if(slot<0)return;const el=document.createElement("div");el.className="ft";el.textContent=s;el.style.color=color;$("#fct").appendChild(el);
  fctCtx.font='100px "FrizQT","Philosopher",Georgia,serif';
  texts.push({el,u,slot,cat,t0:now,x:u.pos.x,y:u.y+2.2,z:u.pos.z,w100:fctCtx.measureText(s).width});}
function fctScale(c,life){if(!c.crit)return c.v;const f=life<.1?.1+(2-.1)*life/.1:life<.2?2-(life-.1)/.1:1;return c.v*f;}
function fctAlpha(c,e){if(e<c.fi){const k=Math.max(0,e/c.dur);return[k,k*127/255]}
  if(e>=c.fo){const k=1-(e-c.fo)/(c.dur-c.fo);return[k,Math.min(127/255,k)]}return[1,127/255];}
/* SmartScreenRect: первый занявший место не двигается, следующий выталкивается вверх, вправо, вниз, влево (поиск в ширину) */
function fctSeat(claimed,r,W,H){const ov=q=>claimed.find(c=>q[2]>c[0]&&q[0]<c[2]&&q[3]>c[1]&&q[1]<c[3]);
  const push=(q,k)=>{const c=ov(q);if(!c)return q;q=q.slice();let d;
    if(k===0){d=q[3]-c[1];q[1]-=d;q[3]-=d}else if(k===2){d=c[2]-q[0];q[0]+=d;q[2]+=d}else if(k===3){d=c[3]-q[1];q[1]+=d;q[3]+=d}else{d=q[2]-c[0];q[0]-=d;q[2]-=d}return q};
  const off=q=>q[0]<0||q[2]>W||q[1]<0||q[3]>H;const bound=Math.min(400,(Math.trunc(W/(r[2]-r[0]))+1)*(Math.trunc(H/(r[3]-r[1]))+1));
  const queue=[r];for(let n=0;n<bound&&queue.length;n++){const q=queue.shift();if(off(q))continue;
    for(const k of [0,2,3,1]){const c=push(q,k);if(c===q)return q;queue.push(c)}}return r;}
function updateTexts(){const W=STAGE.w,H=STAGE.h,diag=Math.hypot(W,H),claimed=[],sx=Math.round(.002*W),sy=Math.round(.002*H);
  for(let i=texts.length-1;i>=0;i--){const t=texts[i];if((now-t.t0)*1000>=FCT[t.cat].dur){t.el.remove();texts.splice(i,1)}}
  const ord=texts.slice().sort((a,b)=>(units.indexOf(a.u)-units.indexOf(b.u))||(b.slot-a.slot));
  for(const t of ord){const c=FCT[t.cat],e=(now-t.t0)*1000,life=e/c.dur;
    tmp.set(t.x,t.y+c.rise*life,t.z).project(camera);
    if(tmp.z>1||Math.abs(tmp.x)>1||Math.abs(tmp.y)>1){t.el.remove();texts.splice(texts.indexOf(t),1);continue}
    const v=fctScale(c,life),px=Math.round(v*diag),cw=(t.w100*px/100+Math.round(.002*diag))*diag/W,ch=v*diag*diag/H;
    let x=(tmp.x+1)/2*W,y=(1-tmp.y)/2*H;x=Math.min(Math.max(x,cw/2),W-cw/2);y=Math.min(Math.max(y,ch/2),H-ch/2);
    const r=fctSeat(claimed,[x-cw/2,y-ch/2,x+cw/2,y+ch/2],W,H);claimed.push(r);
    const[a,sa]=fctAlpha(c,e);const st=t.el.style;st.fontSize=px+"px";st.left=(r[0]+r[2])/2+"px";st.top=(r[1]+r[3])/2+"px";
    st.opacity=a;st.textShadow=`${sx}px ${sy}px 0 rgba(0,0,0,${a>0?Math.min(1,sa/a):0})`;}}
let fbkT=0;function portraitText(s,color,big){const e=$("#pfbk");e.textContent=s;e.style.color=color;e.style.fontSize=(big?26:19)+"px";e.style.opacity=1;fbkT=now;}
function combatText(src,t,amt,crit,o,school,blocked,absorbed){
  if(t!==player&&src===player){if(amt>0)worldText(t,String(amt),o.auto?"#ffffff":FCT_GOLD,crit?2:0);else if(absorbed)worldText(t,"Поглощено","#ffffff",1);}
  else if(t===player){portraitText(amt>0?String(amt):"Поглощено",amt>0?"#ff2020":"#ffffff",crit);}
}
function combatMiss(src,t,word){if(t!==player)worldText(t,word,"#ffffff",3);else portraitText(word,"#ffffff");}
function statusText(u,s,color){worldText(u,s,color,3);}
function healText(u,amt,crit){if(u===player)portraitText("+"+amt,"#20ff20",crit);else worldText(u,"+"+amt,"#20ff20",crit?2:0);}
/* портреты */
const porCtx={p:$("#ppor").getContext("2d"),t:$("#tpor").getContext("2d")};let porN=0;const porKey={};const headV=new THREE.Vector3();
function renderPortraits(){
  if(!porR||++porN%2)return;
  scene.background=null;scene.fog=null;
  /* портрет статичный, как в клиенте: рисуем один раз на персонажа и после смерти */
  for(const [u,k] of [[player,"p"],[enemy,"t"]]){if(!u)continue;const key=u.name+"|"+u.cls+"|"+u.alive;if(porKey[k]===key)continue;porKey[k]=key;const m=u.model,layer=m.layer;m.g.updateMatrixWorld(true);
    if(m.head&&!has(u,"incap"))m.head.getWorldPosition(headV);else headV.set(u.pos.x,u.y+(has(u,"incap")?1.1:2.0),u.pos.z);
    const f=u.facing;porCam.position.set(headV.x+Math.sin(f)*1.05,headV.y+.06,headV.z+Math.cos(f)*1.05);porCam.lookAt(headV.x,headV.y-.04,headV.z);porCam.layers.set(layer);
    const gv0=m.g.visible;if(u===player)m.g.visible=true;porR.render(scene,porCam);m.g.visible=gv0;
    const c=porCtx[k];c.clearRect(0,0,128,128);c.save();c.beginPath();c.arc(64,64,62,0,Math.PI*2);c.clip();c.fillStyle="#000";c.fillRect(0,0,128,128);c.drawImage(porR.domElement,0,0,128,128);
    if(!u.alive){c.fillStyle="rgba(80,80,80,.6)";c.fillRect(0,0,128,128);}c.restore();}
  scene.background=SKY;scene.fog=FOG;
}

/* ================= ВВОД: управление как в WoW ================= */
const keys={};let autoRun=false,walkMode=false,yaw=-Math.PI/2,pitch=.3,camDist=15,touchMode=false,lmb=false,rmb=false;
addEventListener("keydown",e=>{if(e.target.tagName==="TEXTAREA")return;
  if(bindMode&&player&&!$("#hud").hidden){handleBindKey(e);return}
  keys[e.code]=true;
  const ks=keyStr(e),si=binds.indexOf(ks);
  if(si>=0&&player&&!$("#hud").hidden){e.preventDefault();if(!e.repeat&&layout[si]&&state==="fight")tryUse(player,layout[si]);return}
  if(e.code==="KeyP"&&!e.ctrlKey&&!e.altKey&&player&&!$("#hud").hidden){toggleBook();return}
  if(e.code==="Tab"&&player&&!$("#hud").hidden){e.preventDefault();cycleTarget();return}
  if((e.code==="F1"||e.code==="F2")&&player&&!$("#hud").hidden){e.preventDefault();if(e.code==="F1")pickFriend(player);else{const a=allies(player).find(x=>x!==player);if(a)pickFriend(a);}return}
  if(e.code==="Space"&&!movesBound.has("Space")&&player&&$("#menu").hidden&&$("#result").hidden){e.preventDefault();touchMode=false;jump(player);}
  if(/^Key[WASDQE]$/.test(e.code))touchMode=false;
  if((e.code==="KeyW"||e.code==="KeyS"||e.code==="ArrowUp"||e.code==="ArrowDown")&&!movesBound.has(e.code))autoRun=false;
  if(e.code==="NumLock"&&player&&!$("#hud").hidden){autoRun=!autoRun;}
  if(e.code==="NumpadDivide"&&player&&!$("#hud").hidden){walkMode=!walkMode;}
  if(e.code==="Escape"){const open=["#settings","#balance","#help","#book"].some(k=>!$(k).hidden);
    if(!open&&player&&enemy&&!$("#hud").hidden){setTarget(player,null);return}
    $("#settings").hidden=true;$("#balance").hidden=true;$("#help").hidden=true;$("#book").hidden=true;}});
addEventListener("keyup",e=>{keys[e.code]=false;});
addEventListener("blur",()=>{for(const k in keys)keys[k]=false;lmb=rmb=false;});
let drag=null;
canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"){touchMode=true;if(e.clientX-STAGE.x<STAGE.w*.4)return;}else touchMode=false;
  drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,mv:0,id:e.pointerId,touch:e.pointerType==="touch"};canvas.setPointerCapture(e.pointerId);
  if(!drag.touch){lmb=!!(e.buttons&1);rmb=!!(e.buttons&2);if(rmb&&player&&player.alive&&!incap(player))player.facing=yaw+Math.PI;}});
function mouseLook(on){try{if(on&&document.pointerLockElement!==canvas&&canvas.requestPointerLock){const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}else if(!on&&document.pointerLockElement===canvas)document.exitPointerLock();}catch(e){}}
canvas.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return;
  if(!drag.touch){lmb=!!(e.buttons&1);rmb=!!(e.buttons&2);}
  const locked=document.pointerLockElement===canvas,mx=locked?e.movementX:e.clientX-drag.x,my=locked?e.movementY:e.clientY-drag.y;
  drag.mv+=Math.abs(mx)+Math.abs(my);if(!drag.touch&&drag.mv>4&&!locked)mouseLook(true);
  yaw-=mx*.006;pitch=Math.max(-1.2,Math.min(1.553,pitch+my*.005));drag.x=e.clientX;drag.y=e.clientY;
  if(rmb&&player&&player.alive&&!incap(player))player.facing=yaw+Math.PI;});
const endDrag=e=>{if(drag&&e.pointerId===drag.id){drag=null;lmb=rmb=false;mouseLook(false);}};
canvas.addEventListener("pointerup",e=>{if(drag&&drag.mv<6)clickTarget(drag.sx,drag.sy);if(drag&&!drag.touch){lmb=!!(e.buttons&1);rmb=!!(e.buttons&2);if(!e.buttons){drag=null;mouseLook(false);}}else endDrag(e);});
canvas.addEventListener("pointercancel",endDrag);
canvas.addEventListener("contextmenu",e=>e.preventDefault());
canvas.addEventListener("wheel",e=>{e.preventDefault();const st=e.deltaY>0?1:-1;camDist=Math.max(0,Math.min(25,Math.round(camDist)+st));},{passive:false});
const joy={x:0,y:0,id:null};const jEl=$("#joy"),kEl=$("#knob");
jEl.addEventListener("pointerdown",e=>{touchMode=true;joy.id=e.pointerId;jEl.setPointerCapture(e.pointerId);jmove(e);});
jEl.addEventListener("pointermove",e=>{if(joy.id===e.pointerId)jmove(e);});
const jend=()=>{joy.id=null;joy.x=joy.y=0;kEl.style.left="35px";kEl.style.top="35px";};
jEl.addEventListener("pointerup",jend);jEl.addEventListener("pointercancel",jend);
$("#jumpBtn").addEventListener("pointerdown",e=>{e.preventDefault();if(player)jump(player);});
function jmove(e){const r=jEl.getBoundingClientRect();let x=(e.clientX-r.left-60)/50,y=(e.clientY-r.top-60)/50;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}joy.x=x;joy.y=y;kEl.style.left=(35+x*35)+"px";kEl.style.top=(35+y*35)+"px";}
const angDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function playerInput(dt){
  const u=player;
  if(touchMode){
    let f=-joy.y,s=joy.x;if(keys.KeyW)f++;if(keys.KeyS)f--;
    const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);u.moveDir.set(fx*f+rx*s,fz*f+rz*s);return;
  }
  const canTurn=u.alive&&!incap(u)&&!u.charging;
  const K=c=>keys[c]&&!movesBound.has(c);
  let turn=0;if(!rmb){if(K("KeyA")||K("ArrowLeft"))turn++;if(K("KeyD")||K("ArrowRight"))turn--;}
  if(turn&&canTurn){/* клиент 1.12: π рад/с, на бегу и в прыжке ×0.75 */const d=turn*Math.PI*(u.moving||u.air?.75:1)*dt;u.facing+=d;if(!lmb)yaw+=d;}
  let f=0,s=0;
  if(lmb&&rmb)autoRun=false;
  if(K("KeyW")||K("ArrowUp")||(lmb&&rmb)||autoRun)f++;if(K("KeyS")||K("ArrowDown"))f--;
  if(K("KeyQ")||(rmb&&K("KeyA")))s--;if(K("KeyE")||(rmb&&K("KeyD")))s++;
  const fx=Math.sin(u.facing),fz=Math.cos(u.facing),rx=-Math.cos(u.facing),rz=Math.sin(u.facing);
  u.moveDir.set(fx*f+rx*s,fz*f+rz*s);u.walking=walkMode;
}

/* ================= ТАЛАНТЫ: ОКНО ================= */
const TREE_BG={warrior:{arms:"warriorarms",fury:"warriorfury",prot:"warriorprotection"},mage:{arcane:"magearcane",fire:"magefire",frost:"magefrost"},
  rogue:{assassination:"rogueassassination",combat:"roguecombat",subtlety:"roguesubtlety"},paladin:{holy:"paladinholy",prot:"paladinprotection",ret:"paladincombat"},
  priest:{disc:"priestdiscipline",holy:"priestholy",shadow:"priestshadow"}};
let talCls="warrior",talSel=null;
function clsOpt(c,pressed,onclick){const b=document.createElement("button");b.className="opt";b.innerHTML=`<i style="${iconBg("cls_"+c,24)}"></i>${B[c].name}`;b.setAttribute("aria-pressed",pressed);b.onclick=onclick;return b}
function renderTalents(){
  const cls=talCls,tal=myTal[cls];
  $("#talTitle").textContent=`Таланты: ${B[cls].name.toLowerCase()}`;
  $("#talPts").textContent=`Осталось очков: ${B.general.maxTalentPoints-totalPts(tal)}`;
  const co=$("#talCls");co.innerHTML="";for(const c of CLASSES)co.appendChild(clsOpt(c,c===cls,()=>{talCls=c;talSel=null;renderTalents();}));
  const pr=$("#talPresets");pr.innerHTML="";for(const name in PRESETS[cls]){const b=document.createElement("button");b.className="opt txt";b.textContent=name;b.onclick=()=>{myTal[cls]=autoBuild(cls,PRESETS[cls][name]);saveTal();renderTalents();};pr.appendChild(b);}
  const wrap=$("#trees");wrap.innerHTML="";
  for(const tk in B.talents[cls]){const tree=B.talents[cls][tk];const sec=document.createElement("section");sec.className="tree";
    if(TREE_BG[cls]&&TREE_BG[cls][tk])sec.style.backgroundImage=`url(assets/ui/tree_${TREE_BG[cls][tk]}.webp)`;
    const tp=treePts(cls,tal,tk);
    sec.innerHTML=`<header><b>${tree.name}</b><span>${tp} очк.</span></header>`;
    const grid=document.createElement("div");grid.className="tgrid";
    for(const id in tree.list){const d=tree.list[id],r=tal[id]||0;const b=document.createElement("button");
      const open=tp>=(d.t-1)*5&&(!d.req||(tal[d.req]||0)>=d.reqr);b.className="tal"+(open?" open":" lock")+(r>=d.max?" max":"")+(talSel===id?" sel":"");
      b.style.gridRow=d.t;b.style.gridColumn=d.c;b.style.cssText+=";"+iconBg(id,40);
      b.innerHTML=`<i>${r}/${d.max}</i>`;
      b.setAttribute("aria-label",`${d.n}, ${r} из ${d.max}`);
      b.onmouseenter=()=>renderTalInfo(id);b.onfocus=()=>renderTalInfo(id);
      b.onclick=()=>{talSel=id;if(canAdd(cls,tal,id)){tal[id]=r+1;saveTal();}renderTalents();renderTalInfo(id);};
      b.oncontextmenu=e=>{e.preventDefault();talSel=id;removePoint(id);};
      grid.appendChild(b);}
    for(const id in tree.list){const d=tree.list[id];if(!d.req)continue;const q=tree.list[d.req];if(!q)continue;const ok=(tal[d.req]||0)>=d.reqr;
      const ar=document.createElement("div");ar.className="tarrow"+(ok?" ok":"");
      if(q.t===d.t){ar.classList.add("h");ar.style.gridRow=d.t;ar.style.gridColumn=`${Math.min(q.c,d.c)} / ${Math.max(q.c,d.c)+1}`;}
      else{ar.style.gridRow=`${q.t} / ${d.t+1}`;ar.style.gridColumn=d.c;}
      grid.insertBefore(ar,grid.firstChild);}
    sec.appendChild(grid);wrap.appendChild(sec);}
}
function removePoint(id){const cls=talCls,tal=myTal[cls];if(canRemove(cls,tal,id)){tal[id]--;if(!tal[id])delete tal[id];saveTal();}renderTalents();renderTalInfo(id);}
function renderTalInfo(id){
  id=id||talSel;const el=$("#tinfo");if(!id)return;
  const d=talDef(talCls,id);if(!d)return;const r=myTal[talCls][id]||0;const tree=B.talents[talCls][treeOf(talCls,id)];
  const fmt=x=>+(+x).toFixed(2);
  const cur=r?`<p>${d.d.replace("{x}",fmt(talVal(d,r)))}</p>`:"";
  const nxt=r<d.max?`<p class="next">${r?"Следующий ранг: ":""}${d.d.replace("{x}",fmt(talVal(d,r+1)))}</p>`:"";
  const rq=d.req?talDef(talCls,d.req):null,rqOk=!rq||(myTal[talCls][d.req]||0)>=d.reqr;
  el.innerHTML=`<h4>${d.n}</h4><div class="meta">${tree.name} · ряд ${d.t} (нужно ${(d.t-1)*5} очк. в ветке) · ранг ${r}/${d.max}</div>${rq?`<div class="meta" style="color:${rqOk?"#9f9":"#ff6a5a"}">Требуется: ${rq.n}${rq.max>1?` (${d.reqr} из ${rq.max})`:""}</div>`:""}${cur}${nxt}`;
}
$("#talMinus").onclick=()=>{if(talSel)removePoint(talSel);};
$("#talReset").onclick=()=>{myTal[talCls]={};saveTal();renderTalents();$("#tinfo").innerHTML=`<p class="note">Очки сброшены.</p>`;};
function openTalents(){talCls=settings.pcls;talSel=null;renderTalents();$("#talents").hidden=false;}
$("#talClose").onclick=()=>{$("#talents").hidden=true;renderMenu();};
$("#btnTal").onclick=openTalents;$("#btnTal2").onclick=openTalents;

/* ================= МЕНЮ И РАУНДЫ ================= */
function setSetting(key,v){settings[key]=v;store.set("arena-settings",JSON.stringify(settings));renderMenu();try{netSendMe();renderNet();}catch(e){}}
/* ник: только буквы, цифры, пробел, _ и -, до 16 символов (он попадает в журнал боя и рамки) */
const cleanNick=s=>String(s||"").replace(/[^\p{L}\p{N} _\-]/gu,"").replace(/\s+/g," ").trim().slice(0,16);
const myNick=()=>cleanNick(settings.nick)||"Игрок";
/* экран выбора персонажа: по одному персонажу на класс, справа список, слева описание класса, в центре модель на Награнде */
const CLS_INFO={
  warrior:["Боец ближнего боя · ярость","Сильный мили с рывком и контролем. Стойки дают разные приёмы: боевая для рывка, оборонительная для щита, берсерка для перехвата. Опасен с Смертельным ударом, но уязвим к замедлениям."],
  mage:["Заклинатель · мана","Мастер контроля и урона издалека: Превращение, Кольцо льда, Скачок. Держит врага на расстоянии и взрывает его заклинаниями. Слаб, если его поймали в ближнем бою."],
  rogue:["Боец ближнего боя · энергия","Убийца из скрытности. Ошеломление, Ослепление и Удар по почкам позволяют держать врага в контроле почти весь бой. Яды на оружии замедляют и мешают лечению."],
  paladin:["Боец и лекарь · мана","Крепкий воин Света: лечит себя и союзника, снимает эффекты, ставит Божественный щит и Благословение свободы. Ауры и благословения усиливают всю команду."],
  priest:["Лекарь и заклинатель · мана","Лечение, Слово силы: Щит и массовый страх. Тёмный жрец наносит урон тенью и молчанием прерывает заклинателей."]};
function renderChars(){const el=$("#optP");el.innerHTML="";
  for(const c of CLASSES){const b=document.createElement("button");b.className="cs-char";b.setAttribute("role","option");b.setAttribute("aria-selected",settings.pcls===c);
    b.innerHTML=`<i style="${iconBg("cls_"+c,40)}"></i><b>${B[c].name}</b><span>Уровень 60 · ${B[c].name}</span>`;b.onclick=()=>setSetting("pcls",c);el.appendChild(b);}
  const c=settings.pcls,inf=CLS_INFO[c]||["",""];$("#csCls").textContent=B[c].name;$("#csRole").textContent=inf[0];$("#csDesc").textContent=inf[1];$("#csName").textContent=myNick();
  menuPreview();}
let PREV=null;
function menuPreview(){if(SRV)return;const c=settings.pcls,hd=!!ASSETS.human;if(PREV&&PREV.cls===c&&PREV.hd===hd)return;
  if(PREV){scene.remove(PREV.m.g);if(PREV.m.glow)scene.remove(PREV.m.glow);if(PREV.m.fx)scene.remove(PREV.m.fx);}
  let m;try{m=buildModel(c,true,1);}catch(e){PREV=null;return}
  for(const k of ["sheep","stars","ice","iceM","blockM","wall","shield","bubble","fear","glow","castRune","fx"])if(m[k])m[k].visible=false;
  for(const o of m.g.children)if(o.geometry&&o.geometry.type==="RingGeometry")o.visible=false;
  const x=0,z=MAP?MAP.spawns[0][1]*.0:0;m.g.position.set(x,GY(x,z),z);m.g.rotation.y=0;if(m.acts)setBase(m,"stand");PREV={cls:c,hd,m,x,z};}
function previewTick(dt){if(!PREV)return;const on=state==="menu"&&!$("#menu").hidden;PREV.m.g.visible=on;if(!on)return;
  if(!PREV.m.g.parent)scene.add(PREV.m.g);const y=GY(PREV.x,PREV.z);PREV.m.g.position.y=y;if(PREV.m.mixer)PREV.m.mixer.update(dt);
  const w=innerWidth>1100?0:0;camera.position.set(PREV.x+w,y+1.5,PREV.z+7.5);camera.lookAt(PREV.x+w,y+.45,PREV.z);}
function renderMenu(){
  const om=$("#optMode");om.innerHTML="";for(const [k,l] of MODES){const b=document.createElement("button");b.className="opt txt";b.textContent=l;b.setAttribute("aria-pressed",settings.mode===k);b.onclick=()=>{setSetting("mode",k);renderNet();};om.appendChild(b);}
  let netR=null;try{netR=NET.role;}catch(e){}const coopNet=false;
  $("#modeNote").textContent=settings.mode!=="1v1"?(netR?"По сети: состав команд в лобби ниже, пустые места занимают боты. F2 или щелчок по союзнику: лечить его, F1: себя.":(settings.mode==="3v3"?"Вы и два бота-союзника против трёх ботов.":"Вы и бот-союзник против двух ботов.")+" Tab или щелчок по врагу меняет цель. Лечение и защита идут на союзника после F2 или щелчка по нему, F1 возвращает на себя."):(netR?"По сети: дуэль, состав в лобби ниже.":"Дуэль против бота.");
  $("#duoPick").hidden=settings.mode==="1v1";$("#trioPick").hidden=settings.mode!=="3v3";$("#allyCol").style.visibility=settings.mode==="1v1"?"hidden":"";$("#optA2").hidden=settings.mode!=="3v3";
  renderChars();
  $("#csBots").hidden=!!netR;
  for(const [el,key] of [[$("#optE"),"ecls"],[$("#optA"),"acls"],[$("#optE2"),"ecls2"],[$("#optA2"),"acls2"],[$("#optE3"),"ecls3"]]){el.innerHTML="";for(const c of CLASSES)el.appendChild(clsOpt(c,settings[key]===c,()=>setSetting(key,c)));}
  const od=$("#optD");od.innerHTML="";for(const [k,v] of Object.entries(DIFF)){const b=document.createElement("button");b.className="opt txt";b.textContent=v.label;b.setAttribute("aria-pressed",settings.diff===k);b.onclick=()=>setSetting("diff",k);od.appendChild(b);}
  $("#score").textContent=`Побед ${wins.w} · поражений ${wins.l}`;
  const pt=myTal[settings.pcls],free=B.general.maxTalentPoints-totalPts(pt);$("#buildP").textContent=`Таланты: ${buildSummary(settings.pcls,pt)}${free>0?` (свободно ${free})`:""}`;
  const pz=$("#optPoison");pz.hidden=settings.pcls!=="rogue";
  if(settings.pcls==="rogue")for(const [sl,key] of [["#poisonMH","poisonMH"],["#poisonOH","poisonOH"]]){const el=$(sl);el.innerHTML="";
    for(const k in B.rogue.poisons){const b=document.createElement("button");b.className="opt";b.innerHTML=`<i style="${iconBg(k,24)}"></i>${B.rogue.poisons[k].name}`;b.setAttribute("aria-pressed",settings[key]===k);b.onclick=()=>setSetting(key,k);el.appendChild(b);}}
  renderMenuBar();
  $("#buildE").textContent=DIFF[settings.diff].talents?`Таланты бота: ${BOT_PRESET[settings.ecls]} ${buildSummary(settings.ecls,botTalents(settings.ecls))}`:"Бот без талантов";}
/* места появления: на Награнде в концах двух туннелей, на старой арене по краям */
function spawnXZ(team,lat){if(MAP){const s=MAP.spawns[team];return [s[0]+lat,s[1]-Math.sign(s[1])*7]}const off=ARENA_R*.7;return [(team===0?-1:1)*off,lat]}
const spawnFacing=team=>MAP?(team===0?0:Math.PI):(team===0?Math.PI/2:-Math.PI/2);
const spawnYaw=team=>spawnFacing(team)+Math.PI;
function startRound(){if(SRV_PENDING)applyServerBalance();
  if(NET.role==="client"){if(NET.srvRoom&&NET.tx){NET.tx.send({t:"ready",v:true});showErr("Готов. Бой начнётся, когда будут готовы все");}else showErr("Новый бой начинает хост");return}
  if(NET.role==="host"&&netGuests().length){startNetRound();return}
  clearArena();
  const S=TSIZE(settings.mode),duo=S>1;
  player=new Unit(settings.pcls,true,...spawnXZ(0,latOf(0,S)),{...myTal[settings.pcls]});
  enemy=new Unit(settings.ecls,false,...spawnXZ(1,latOf(0,S)),botTalents(settings.ecls));
  units=[player,enemy];NET.friend=null;
  const AC=[settings.acls,settings.acls2],EC=[settings.ecls2,settings.ecls3];let lay=3;
  for(let k=1;k<S;k++){
    const al=new Unit(AC[k-1],false,...spawnXZ(0,latOf(k,S)),botTalents(AC[k-1]),{team:0,friendly:true,layer:lay++});al.name=B[al.cls].name+" (союзник)";
    const e2=new Unit(EC[k-1],false,...spawnXZ(1,latOf(k,S)),botTalents(EC[k-1]),{team:1,layer:lay++});
    units.push(al,e2);}
  for(const u of units)u.facing=spawnFacing(u.team);yaw=spawnYaw(0);pitch=.3;
  setTarget(player,enemy);
  if(player.cls==="rogue"){player.poisonMH=settings.poisonMH;player.poisonOH=settings.poisonOH;}
  bots=units.filter(u=>u!==player).map(u=>new Bot(u,u.team===0?enemy:player,settings.diff));bot=bots[0];
  roundBegin();
  /* манекен для отладки: стоит в центре арены, 100 000 здоровья */
  if(DIFF[settings.diff].dummy)for(const u of units)if(u.team===1){u.maxHp=u.hp=100000;u.pos.x=0;u.pos.z=0;u.y=groundAt(0,0);u.pos.y=u.y;u.facing=spawnFacing(1);}
}
function roundBegin(){
  castHideAt=0;$("#pcast").hidden=true;$("#book").hidden=true;
  for(const u of units)prepUnit(u);prepPaladins();prepPriests();
  buildTeams();
  buildBar();$("#menu").hidden=true;$("#result").hidden=true;$("#talents").hidden=true;$("#hud").hidden=false;
  state="countdown";countEnd=now+(B.general.prep||5);}
/* сетевой бой: состав из лобби, места по порядку команда 1 / команда 2, пустые места занимают боты */
function startNetRound(){
  const L=netLobby();if(L.over){showErr("Слишком много игроков для 1 на 1");return}
  clearArena();
  const S=TSIZE(L.mode),my=NET.myTeam||0,order=[];
  for(let k=0;k<S;k++)for(const t of [0,1])order.push({...L.teams[t][k],team:t,slot:k});
  let lay=2;NET.friend=null;
  units=order.map(p=>{const mine=p.id==="host",g=!p.bot&&!mine?NET.peers[p.id]:null;
    const cls=mine?settings.pcls:g?g.cls:p.cls,tal=cleanTal(cls,mine?myTal[settings.pcls]:g?g.tal:botTalents(cls));
    const u=new Unit(cls,mine,...spawnXZ(p.team,latOf(p.slot,S)),tal,{team:p.team,friendly:p.team===my,layer:mine?1:lay++});
    if(g){u.name=g.nick;u.netId=p.id;g.unit=u;if(u.cls==="rogue"){const P=B.rogue.poisons;u.poisonMH=P[g.pmh]?g.pmh:"deadly";u.poisonOH=P[g.poh]?g.poh:"crip";}if(!NET.friend)NET.friend=u;}else if(p.bot&&p.team===my)u.name=B[cls].name+" (союзник)";
    u.facing=spawnFacing(p.team);return u;});
  player=units.find(u=>u.isPlayer);
  /* на сервере своего бойца нет: зритель вне арены, чтобы код интерфейса не ломался */
  if(SRV){player=new Unit("warrior",false,0,0,{},{team:9});player.alive=false;}
  enemy=units.find(u=>u.team!==my);
  yaw=spawnYaw(my);pitch=.3;setTarget(player,enemy);
  if(player.cls==="rogue"){player.poisonMH=settings.poisonMH;player.poisonOH=settings.poisonOH;}
  bots=units.filter(u=>u!==player).map(u=>u.netId?new NetCtl(u):new Bot(u,units.find(f=>f.team!==u.team),settings.diff));bot=bots.find(b=>b instanceof Bot)||null;
  roundBegin();
  NET.evq=[];const ros=units.map(u=>({cls:u.cls,tal:u.talents,team:u.team,host:u===player?1:0,nick:u===player?myNick():u.netId?u.name:undefined}));
  for(const u of units)if(u.netId)NET.tx.sendTo(u.netId,{t:"start",cd:B.general.prep||5,me:units.indexOf(u),ros});
  for(const id in NET.peers)NET.peers[id].ready=false;NET.myReady=false;
}
/* перед боем: бафы на весь бой и скрытность разбойника, как будто всё наложено заранее */
function prepUnit(u){
  if(u.cls==="mage")addAura(u,{type:"frostarmor",name:B.mage.abilities.frostarmor.name,pct:B.mage.abilities.frostarmor.reduce,slow:B.mage.abilities.frostarmor.slow,slowDur:B.mage.abilities.frostarmor.slowDur,until:Infinity,good:true,mb:true});
  if(u.cls==="rogue")addAura(u,{type:"stealth",name:B.rogue.abilities.stealth.name,until:Infinity,good:true});
}
/* паладины до начала боя: аура благочестия и благословения себе и союзникам (короли, если есть, иначе могущество бойцам и мудрость заклинателям) */
/* жрец перед боем: Внутренний огонь на себя, Стойкость (и Божественный дух с талантом) на себя и союзников */
function prepPriests(){for(const p of units)if(p.cls==="priest"){const a=eff(p,"innerfire");addAura(p,{type:"innerfire",name:a.name,armor:a.armor,charges:a.charges,until:Infinity,good:true,mb:true});
  for(const f of units)if(f.team===p.team&&!aura(f,"fort")){fortitude(p,f,eff(p,"fortitude"));if(rk(p,"divineSpirit")){const d=eff(p,"divinespirit");addAura(f,{type:"dspirit",name:d.name,regen:d.spirit/8,until:Infinity,good:true,mb:true});}}}}
function prepPaladins(){for(const p of units)if(p.cls==="paladin"){setPAura(p,p.isPlayer&&settings.paura&&PAURAS.includes(settings.paura)?settings.paura:"devotion");
  for(const f of units)if(f.team===p.team){const k=rk(p,"tKings")?"kings":(f.resType==="mana"&&f.cls!=="paladin"?"bow":"bom");bless(p,f,k,ab("paladin",k));}}}
function clearArena(){
  for(const u of units)u.dispose();if(player&&!units.includes(player))player.dispose();if(enemy&&!units.includes(enemy))enemy.dispose();units=[];bots=[];
  for(const p of projectiles)scene.remove(p.m);projectiles.length=0;m2Clear();
  for(const t of texts)t.el.remove();texts.length=0;$("#log").innerHTML="";
  for(const z of zones)scene.remove(z.mesh);zones.length=0;
}
function endRound(winner){
  if(state!=="fight")return;state="over";roundEnd=now;const won=winner.team===player.team;
  if(won)wins.w++;else wins.l++;store.set("arena-wins",JSON.stringify(wins));
  if(winner.model.acts)setTimeout(()=>{if(state==="over")playOnce(winner.model,"cheer",1,true);},900);
  setTimeout(()=>{
    $("#resTitle").textContent=won?"Победа":"Поражение";
    const row=(l,a,b)=>`<div>${l}</div><div>${a}</div><div>${b}</div>`;
    if(units.length>2){const A=allies(player),E=units.filter(x=>x.team!==player.team),nm=L=>L.map(x=>B[x.cls].name).join(" и "),sum=(L,k)=>L.reduce((s,x)=>s+x.stats[k],0);
      $("#resSub").textContent=`2 на 2 · ${nm(A)} против: ${nm(E).toLowerCase()} · ${NET.role==="client"?"по сети":DIFF[settings.diff].label} · ${(roundEnd-roundStart).toFixed(1)} с`;
      $("#resStats").innerHTML=row("","<b>Ваша команда</b>","<b>Противники</b>")+row("Нанесено урона",sum(A,"dmg"),sum(E,"dmg"))+row("Исцелено",sum(A,"heal"),sum(E,"heal"))+row("Критических ударов",sum(A,"crits"),sum(E,"crits"))+row("Контроль наложен, с",sum(A,"cc").toFixed(1),sum(E,"cc").toFixed(1))+row("Прерываний",sum(A,"interrupts"),sum(E,"interrupts"))+row("Выжили",A.filter(x=>x.alive).length+" из 2",E.filter(x=>x.alive).length+" из 2");
      $("#result").hidden=false;return}
    $("#resSub").textContent=`${B[player.cls].name} против: ${B[enemy.cls].name.toLowerCase()} · ${DIFF[settings.diff].label} · ${(roundEnd-roundStart).toFixed(1)} с`;
    $("#resStats").innerHTML=row("","<b>Вы</b>","<b>Противник</b>")+row("Таланты",buildSummary(player.cls,player.talents),buildSummary(enemy.cls,enemy.talents))+row("Нанесено урона",Math.round(player.stats.dmg),Math.round(enemy.stats.dmg))+row("Исцелено",Math.round(player.stats.heal),Math.round(enemy.stats.heal))+row("Критических ударов",player.stats.crits,enemy.stats.crits)+row("Контроль наложен, с",player.stats.cc.toFixed(1),enemy.stats.cc.toFixed(1))+row("Прерываний",player.stats.interrupts,enemy.stats.interrupts)+row("Осталось здоровья",Math.ceil(player.hp),Math.ceil(enemy.hp));
    $("#result").hidden=false;},2200);
}
$("#btnStart").onclick=startRound;$("#btnAgain").onclick=startRound;
$("#btnBack").onclick=()=>{for(const u of units)try{sfxStop(u.model.preSrc);}catch(e){}clearArena();player=null;enemy=null;$("#result").hidden=true;$("#hud").hidden=true;state="menu";renderMenu();$("#menu").hidden=false;};
$("#btnMenu").onclick=()=>{if(NET.role){netLeave();netStatus("Вы вышли из комнаты.");}for(const u of units)try{sfxStop(u.model.preSrc);}catch(e){}clearArena();player=null;enemy=null;state="menu";$("#hud").hidden=true;$("#result").hidden=true;renderMenu();$("#menu").hidden=false;};
const toggle=(id,on)=>{const el=$(id);el.hidden=on===undefined?!el.hidden:!on;};
$("#btnBook").onclick=()=>toggleBook();$("#bookClose").onclick=()=>toggleBook(false);
$("#btnBind").onclick=()=>setBindMode(!bindMode);$("#bindDone").onclick=()=>setBindMode(false);
$("#bindReset").onclick=()=>{binds=DEFAULT_BINDS.slice();saveBinds();refreshMoveBinds();buildBar();markBind();};
$("#barReset").onclick=()=>{for(const k of Object.keys(bars))if(k===player.cls||k.startsWith(player.cls+":"))delete bars[k];saveBars();buildBar();if(!$("#book").hidden)renderBook();};
$("#btnHelp").onclick=()=>{toggle("#balance",false);toggle("#help");};$("#btnHelp2").onclick=()=>{toggle("#help",true);};$("#helpClose").onclick=()=>toggle("#help",false);
$("#btnBal").onclick=()=>{toggle("#help",false);$("#balTxt").value=JSON.stringify(B,null,2);$("#balMsg").textContent="";toggle("#balance");};
$("#balClose").onclick=()=>toggle("#balance",false);
$("#balApply").onclick=()=>{try{const v=JSON.parse($("#balTxt").value);B=merge(clone(DEF),v);store.set("arena-balance-v1",JSON.stringify(B));$("#balMsg").textContent="Применено. Здоровье и ресурсы обновятся в следующем раунде.";renderMenu();}
  catch(e){$("#balMsg").textContent="Ошибка в таблице: "+e.message+". Проверьте запятые и кавычки.";}};
$("#balReset").onclick=()=>{B=clone(DEF);store.set("arena-balance-v1",JSON.stringify(B));$("#balTxt").value=JSON.stringify(B,null,2);$("#balMsg").textContent="Вернул значения по умолчанию.";};
$("#balCopy").onclick=()=>{const ta=$("#balTxt");const p=navigator.clipboard&&navigator.clipboard.writeText(ta.value);
  if(p)p.then(()=>$("#balMsg").textContent="Скопировано. Можно прислать в чат, чтобы закрепить баланс в коде.",()=>{ta.select();$("#balMsg").textContent="Выделил текст, нажмите Ctrl+C.";});else{ta.select();$("#balMsg").textContent="Выделил текст, нажмите Ctrl+C.";}};
renderMenu();


/* ================= НЕЙМПЛЕЙТЫ ПРОТИВНИКОВ ================= */
/* сверху крупно контроль, ниже прочие дебаффы; справа от полоски «тяжёлый» бафф (бабл, глыба, Глухая оборона и т.п.) */
const HEAVY={immune:9,iceblock:9,bop:8,reduce:7,evasion:6,reckless:6,dwish:5,retal:5,zerk:4,apower:4,pi:4,sblock:3,freedom:3,dprot:9};
const secs=t=>{const l=t-now;return l===Infinity||l>600?"":l>=10?Math.ceil(l):l>=1?Math.ceil(l):l.toFixed(1)};
function renderPlates(){const box=$("#plates");if(!box||!player)return;for(const c of [...box.children])if(!units.includes(c._u)||c._u.plEl!==c)c.remove();
  for(const u of units){if(u.team===player.team||!u.alive||!canSee(player,u)){if(u.plEl){u.plEl.remove();u.plEl=null;}continue}
    tmp.set(u.pos.x,u.y+2.55,u.pos.z).project(camera);if(tmp.z>1||Math.abs(tmp.x)>1.2||Math.abs(tmp.y)>1.2){if(u.plEl)u.plEl.style.display="none";continue}
    let el=u.plEl;if(!el){el=u.plEl=document.createElement("div");el.className="npl";el.innerHTML='<div class="cc"></div><div class="db"></div><div class="nm"></div><div class="row"><div class="hp"><i></i><span></span></div></div><div class="cb" hidden><i></i></div>';el._u=u;box.appendChild(el);}
    const d=dist(player,u),sc=Math.max(.6,Math.min(1,14/Math.max(1,d)+.45));
    el.style.display="";el.style.left=(STAGE.x+(tmp.x+1)/2*STAGE.w)+"px";el.style.top=(STAGE.y+(1-tmp.y)/2*STAGE.h)+"px";el.style.transform=`translate(-50%,-100%) scale(${sc.toFixed(2)})`;
    el.classList.toggle("tg",u===enemy);
    el.querySelector(".nm").textContent=u.name;const pct=Math.round(u.hp/u.maxHp*100);el.querySelector(".hp i").style.width=pct+"%";el.querySelector(".hp span").textContent=pct+"%";
    const live=u.auras.filter(a=>a.until>now);
    const cc=live.filter(a=>LOC_PRI[a.type]&&!a.good).sort((a,b)=>LOC_PRI[b.type]-LOC_PRI[a.type]||b.until-a.until).slice(0,3);
    const db=live.filter(a=>!a.good&&!LOC_PRI[a.type]&&a.type!=="dampen"&&(a.src===player||units.length<3||true)).slice(0,10);
    const ic=(a,cls)=>`<div class="ic" style="${iconBg(auraIcon(a),cls?34:20)}"><b>${a.stacks>1&&!cls?a.stacks:secs(a.until)}</b></div>`;
    const ch=cc.map(a=>ic(a,1)).join(""),dh=db.map(a=>ic(a)).join("");
    if(el._cc!==ch){el.querySelector(".cc").innerHTML=ch;el._cc=ch;}if(el._db!==dh){el.querySelector(".db").innerHTML=dh;el._db=dh;}
    const hv=live.filter(a=>a.good&&HEAVY[a.type]).sort((a,b)=>HEAVY[b.type]-HEAVY[a.type])[0],row=el.querySelector(".row");let he=row.querySelector(".hv");
    if(hv){if(!he){he=document.createElement("div");he.className="hv";row.appendChild(he);}he.style.cssText=iconBg(auraIcon(hv),30);he.innerHTML=`<b>${secs(hv.until)}</b>`;}else if(he)he.remove();
    const cb=el.querySelector(".cb");if(u.cast){cb.hidden=false;let k=(now-u.cast.start)/(u.cast.end-u.cast.start);if(u.cast.channel)k=1-k;cb.firstChild.style.width=Math.max(0,Math.min(100,k*100))+"%";}else cb.hidden=true;}
}
/* ================= ЦЕЛИ И РАМКИ КОМАНД (2 на 2) ================= */
function pickFriend(f){if(!player||!f)return;player.friend=f===player?null:f;player.healMode=true;renderTeams(true);statusText(f,f===player?"Цель лечения: вы":"Цель лечения","#7dff8f");}
function pickTarget(t){if(!player||!t||t.team===player.team||!t.alive||!canSee(player,t))return;setTarget(player,t);player.healMode=false;renderTeams(true);}
function cycleTarget(){const L=foes(player).filter(f=>canSee(player,f));if(!L.length)return;L.sort((a,b)=>dist(player,a)-dist(player,b));const i=L.indexOf(enemy);pickTarget(L[(i+1)%L.length]);}
function unitAt(x,y){if(!player)return null;let best=null,bd=60;
  /* попадание по силуэту: прямоугольник от ног до головы на экране (вблизи персонаж крупный) */
  for(const f of units){if(!f.alive||(f!==player&&!canSee(player,f)))continue;
    const P=yy=>{tmp.set(f.pos.x,f.y+yy,f.pos.z).project(camera);return tmp.z>1?null:[STAGE.x+(tmp.x+1)/2*STAGE.w,STAGE.y+(1-tmp.y)/2*STAGE.h]};
    const ft=P(0),hd=P(2.1),md=P(1.1);if(!md)continue;let d=Math.hypot(md[0]-x,md[1]-y);
    if(ft&&hd){const h=Math.abs(ft[1]-hd[1]),w=Math.max(30,h*.32);if(y>=Math.min(ft[1],hd[1])-10&&y<=Math.max(ft[1],hd[1])+10&&Math.abs(x-md[0])<=w)d=Math.min(d,Math.abs(x-md[0])*.5);}
    if(d<bd){bd=d;best=f;}}
  return best}
function clickTarget(x,y){const best=unitAt(x,y);if(best){if(best.team===player.team)pickFriend(best);else pickTarget(best);}}
/* курсор как в игре: над противником — меч */
canvas.addEventListener("pointermove",e=>{if(e.buttons||!player||state==="menu"){document.body.classList.remove("cur-atk");return}const u=unitAt(e.clientX,e.clientY);document.body.classList.toggle("cur-atk",!!u&&u.team!==player.team);});
$("#pf").addEventListener("click",()=>pickFriend(player));
function buildTeams(){const pa=$("#party"),ar=$("#arenaf"),on=units.length>2;pa.hidden=ar.hidden=!on;pa.innerHTML=ar.innerHTML="";if(!on)return;
  for(const u of units){if(u===player)continue;const el=document.createElement("div");el.className="tm";
    el.innerHTML=`<i style="${iconBg("cls_"+u.cls,30)}"></i><b></b><div class="fb"><i style="--c:var(--hp)"></i><span class="out"></span></div><div class="fb r"><i style="--c:${RES_COLOR[u.resType]}"></i></div><em></em>`;
    el.onclick=()=>u.team===player.team?pickFriend(u):pickTarget(u);u.tmEl=el;(u.team===player.team?pa:ar).appendChild(el);}
  renderTeams(true);}
let teamsT=0;
function renderTeams(force){if(units.length<3)return;if(!force&&now-teamsT<.1)return;teamsT=now;
  for(const u of units){const el=u.tmEl;if(!el)continue;const vis=u.team===player.team||canSee(player,u);
    el.classList.toggle("sel",u===enemy);el.classList.toggle("fr",u===player.friend);el.classList.toggle("dead",!u.alive);
    el.querySelector("b").textContent=u.name;
    const hp=el.querySelector(".fb i"),rs=el.querySelector(".fb.r i");hp.style.width=(vis||!u.alive?u.hp/u.maxHp*100:100)+"%";rs.style.width=(vis?u.res/u.maxRes*100:0)+"%";
    el.querySelector(".fb span").textContent=!u.alive?"Мёртв":vis?Math.ceil(u.hp/u.maxHp*100)+"%":"Скрыт";
    el.querySelector("em").textContent=u.cast&&vis?ab(u.cls,u.cast.id).name:"";}}

/* ================= ЗВУК ================= */
/* звуки из клиента WoW лежат одним пакетом: карта событий и сами файлы ogg в base64; разжимаются после первого нажатия (так требует браузер) */
const SND={ctx:null,master:null,bus:{},map:{},raw:null,buf:{},on:true,vol:{master:.8,spell:1,melee:1}};
try{const v=localStorage.getItem("arena-sound");if(v==="0")SND.on=false;const j=JSON.parse(localStorage.getItem("arena-volume")||"null");if(j)Object.assign(SND.vol,j);}catch(e){}
fetch("assets/sounds.json").then(r=>r.ok?r.json():null).then(j=>{if(j){SND.map=j.map;SND.raw=j.files;if(SND.ctx)sndDecode();}}).catch(()=>{});
function sndUnlock(){
  if(!SND.ctx){try{SND.ctx=new (window.AudioContext||window.webkitAudioContext)();SND.master=SND.ctx.createGain();SND.master.connect(SND.ctx.destination);for(const k of ["spell","melee"]){SND.bus[k]=SND.ctx.createGain();SND.bus[k].connect(SND.master);}sndApply();}catch(e){return}
    if(SND.raw)sndDecode();}
  if(SND.ctx.state==="suspended")SND.ctx.resume();
}
function sndDecode(){for(const k in SND.raw){if(SND.buf[k])continue;const bin=atob(SND.raw[k]),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);
  SND.buf[k]=1;SND.ctx.decodeAudioData(a.buffer,b=>{SND.buf[k]=b},()=>{delete SND.buf[k]});}}
addEventListener("pointerdown",sndUnlock);addEventListener("keydown",sndUnlock);
/* громкость падает с расстоянием до своего персонажа */
function sfx(ev,u,o){
  if(!SND.on||!SND.ctx)return null;
  const L=SND.map[ev];if(!L)return null;const b=SND.buf[L[Math.floor(Math.random()*L.length)]];if(!b||b===1)return null;
  o=o||{};const d=u&&player&&u!==player?dist(u,player):0;
  const src=SND.ctx.createBufferSource(),g=SND.ctx.createGain();src.buffer=b;src.loop=!!o.loop;
  g.gain.value=(o.vol||1)/(1+d/20);src.connect(g);g.connect(SND.bus[/^(hit_|crit_|swing|parry)/.test(ev)?"melee":"spell"]||SND.master);src.start();src.g=g;return src;
}
function sfxStop(src){if(!src)return;try{src.g.gain.setTargetAtTime(0,SND.ctx.currentTime,.06);src.stop(SND.ctx.currentTime+.3);}catch(e){}}
/* звук применения способности: свой файл, для каста — «_c», для лечения сразу и попадание */
const SND_ALIAS={battle:"stance",defensive:"stance",berserker:"stance",sealR:"seal",sealJ:"seal",sealCr:"seal",sealC:"seal",sealL:"seal",sealW:"seal",wrath:"hammer",zerkrage:"stance",bloodrage:"stance"};
function sfxUse(u,id){const k=SND_ALIAS[id]||id;if(SND.map[k])sfx(k,u);else if(SND.map[k+"_c"])sfx(k+"_c",u);
  if(["flash","gheal","flashlight","holylight"].includes(id))sfx(id+"_i",u);}
/* окно настроек: громкость по группам и формат экрана */
function sndApply(){if(!SND.master)return;SND.master.gain.value=SND.on?SND.vol.master:0;for(const k in SND.bus)SND.bus[k].gain.value=SND.vol[k];}
function sndSave(){try{localStorage.setItem("arena-volume",JSON.stringify(SND.vol));localStorage.setItem("arena-sound",SND.on?"1":"0");}catch(e){}}
const VOL_UI=[["#volMaster","master"],["#volSpell","spell"],["#volMelee","melee"]];
function renderSettings(){for(const [id,k] of VOL_UI){$(id).value=Math.round(SND.vol[k]*100);$(id+"V").textContent=Math.round(SND.vol[k]*100)+"%";}
  $("#sndOn").checked=SND.on;
  {const el=$("#optAA");el.innerHTML="";for(const [k,t] of [["off","Выкл"],["normal","Обычное"],["high","Высокое"],["ultra","Ультра"]]){const b=document.createElement("button");b.className="opt txt";b.textContent=t;b.setAttribute("aria-pressed",(settings.aa||"normal")===k);b.onclick=()=>{settings.aa=k;store.set("arena-settings",JSON.stringify(settings));applyAA();resize();renderSettings();};el.appendChild(b);}}
  {const el=$("#optFXAA");el.innerHTML="";for(const [k,t] of [[0,"Выкл"],[1,"Вкл"]]){const b=document.createElement("button");b.className="opt txt";b.textContent=t;b.setAttribute("aria-pressed",(settings.fxaa?1:0)===k);b.onclick=()=>{settings.fxaa=k;store.set("arena-settings",JSON.stringify(settings));renderSettings();};el.appendChild(b);}}
  const el=$("#optAspect");el.innerHTML="";for(const [k,t] of [["wide","16:9"],["full","Во всё окно"]]){const b=document.createElement("button");b.className="opt txt";b.textContent=t;b.setAttribute("aria-pressed",(settings.aspect||"wide")===k);b.onclick=()=>{settings.aspect=k;store.set("arena-settings",JSON.stringify(settings));resize();renderSettings();};el.appendChild(b);}}
for(const [id,k] of VOL_UI)$(id).addEventListener("input",e=>{SND.vol[k]=e.target.value/100;$(id+"V").textContent=e.target.value+"%";sndApply();sndSave();});
$("#volSpell").addEventListener("change",()=>{sndUnlock();sfx("fireball_c",null);});$("#volMelee").addEventListener("change",()=>{sndUnlock();sfx("hit_2hsword",null);});
$("#sndOn").onchange=e=>{SND.on=e.target.checked;sndApply();sndSave();};
const openSettings=()=>{renderSettings();$("#settings").hidden=false;};
{const fb=$("#fbox"),open=()=>{$("#fbMsg").textContent="";fb.hidden=false;$("#fbText").focus();};
  $("#btnFb").onclick=()=>{fb._t=Date.now();open();};$("#btnFb2").onclick=()=>{fb._t=Date.now();open();};$("#fbCancel").onclick=()=>fb.hidden=true;
  $("#fbSend").onclick=async()=>{const text=$("#fbText").value.trim(),msg=$("#fbMsg");if(text.length<3){msg.textContent="Напишите пару слов";return;}
    if(wins.w+wins.l<1){msg.textContent="Отзыв можно оставить после первого сыгранного боя.";return;}
    $("#fbSend").disabled=true;msg.textContent="Отправляю…";
    try{const r=await fetch("https://wowarena92.duckdns.org/arena/api/feedback",{method:"POST",body:JSON.stringify({kind:document.querySelector("input[name=fbk]:checked").value,text,nick:settings.nick||"",ver:APP_VER,cls:player?player.cls:(settings.pcls||""),played:wins.w+wins.l,hp:$("#fbHp").value,ms:Date.now()-(fb._t||0)})});
      const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Сервер не ответил");$("#fbText").value="";msg.textContent="Спасибо! Отзыв отправлен.";setTimeout(()=>{fb.hidden=true;},1500);}
    catch(e){msg.textContent="Не получилось: "+e.message;}$("#fbSend").disabled=false;};}
{const bx=$("#rmbox"),L=$("#rmList");$("#rmClose").onclick=()=>bx.hidden=true;
  $("#btnRm").onclick=async()=>{bx.hidden=false;L.textContent="Загружаю…";
    try{const r=await fetch("https://wowarena92.duckdns.org/arena/api/roadmap",{cache:"no-store"});const j=await r.json();const G=[["work","В работе","#ffd200"],["plan","В планах","#bbb"],["done","Готово","#6c6"]];
      const e=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
      L.innerHTML=G.map(([k,n,c])=>{const it=j.list.filter(x=>x.status===k);return it.length?`<h3 style="color:${c};margin:10px 0 4px">${n}</h3>`+it.map(x=>`<div style="margin:0 0 8px"><b>${k==="done"?"✓ ":""}${e(x.title)}</b>${x.desc?`<div style="color:#ccc;white-space:pre-wrap">${e(x.desc)}</div>`:""}</div>`).join(""):"";}).join("")||"Пока пусто.";}
    catch(err){L.textContent="Не удалось загрузить: сервер не ответил.";}};}
$("#btnSnd").onclick=openSettings;$("#btnSnd2").onclick=openSettings;$("#setDone").onclick=()=>$("#settings").hidden=true;
const HIT_SND={warrior:"hit_2hsword",paladin:"hit_2hmace",rogue:"hit_1hsword"};
/* ================= ЗАГРУЗКА МОДЕЛЕЙ ================= */
function loadAssets(){
  const btn=$("#btnStart");btn.disabled=true;
  const done=msg=>{buildArena();PREV&&(PREV.hd=null);try{menuPreview();}catch(e){}btn.disabled=false;$("#loadNote").textContent=msg;renderNet();};
  if(!THREE.GLTFLoader||!THREE.SkeletonUtils){done("Модели не загрузились, играем на простых фигурах.");return}
  const L=new THREE.GLTFLoader(),T=new THREE.TextureLoader();
  const gl=url=>fetch(url).then(r=>{if(!r.ok)throw new Error(r.status);return r.text()}).then(b64=>{const bin=atob(b64.trim()),buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
    return new Promise((res,rej)=>L.parse(buf.buffer,"",res,rej));});
  const tx=url=>new Promise(res=>T.load(url,t=>{t.encoding=THREE.sRGBEncoding;res(t)},undefined,()=>res(null)));
  Promise.all([Promise.all([gl("assets/human.glb.txt").catch(()=>null),SRV?null:gl("assets/undead.glb.txt").catch(()=>null)]),mapLoad("assets/nagrand/map.bin").then(m=>{MAP=m;return null}).catch(e=>{console.warn("карта",e);return Promise.all([gl("assets/arena.glb.txt").catch(()=>null),tx("assets/floor.webp"),tx("assets/pillar.webp")])})]).then(([[h,ud],old])=>{const [a,f,p]=old||[null,null,null];
    if(h)makeUpperClips(h);if(ud){makeUpperClips(ud);ASSETS.undead=ud;}
    ASSETS.human=h;ASSETS.arena=a;ASSETS.floor=f;ASSETS.pillar=p;
    if(h)h.scene.traverse(o=>{if(o.isMesh&&o.material&&o.material.name==="data-1"&&o.material.map&&!ASSETS.tex.warrior){for(const c in TINT)ASSETS.tex[c]=hueShiftTexture(o.material.map,TINT[c]);}});
    return Promise.all([gl("assets/fx/fx_models.glb.txt").then(f=>{ASSETS.fxm=f.scene}).catch(()=>null),m2Load().then(m2Names),...CLASSES.map(c=>Promise.all([gl(`assets/gear/gear_${c}.glb.txt`).catch(()=>null),tx(UNDEAD_CLS.includes(c)&&!SRV?`assets/gear/undead_${c}.webp`:`assets/gear/body_${c}.webp`)]).then(([g,t])=>{if(t)t.flipY=false;ASSETS.gear[c]={scene:g&&g.scene,tex:t};})),...(SRV?[]:CM_FILES).map(c=>gl(`assets/models/undead_${c}.glb.txt`).then(x=>{makeUpperClips(x);ASSETS.cm[c]=x}).catch(()=>null))]).then(()=>h);
  }).then(h=>{const a=ASSETS.arena;
    done(h&&(a||MAP)?"Модели из WoW загружены: персонаж и "+(MAP?"арена Награнда.":"арена Гурубаши."):"Часть моделей не загрузилась, вместо них простые фигуры.");
  });
}
loadAssets();

/* ================= СЕТЕВАЯ ДУЭЛЬ ================= */
/* хост считает весь бой, второй игрок присылает своё движение и нажатия, получает снимки состояния и события.
   связь: PeerJS (WebRTC) на своём хостинге, BroadcastChannel между вкладками одного браузера для проверки */
const NET={role:null,tx:null,code:"",peers:{},lobby:null,myId:"",myTeam:0,rtt:0,snapN:0,seq:0,evq:[],lastSnap:null,sendAt:0,inAt:0,round:0,rx:null};
const NET_PREFIX="wowarena-";
function netLoadPeer(){return new Promise((res,rej)=>{if(window.Peer)return res();const s=document.createElement("script");s.src="assets/peerjs.min.js";s.onload=()=>res();s.onerror=()=>rej(new Error("PeerJS не загрузился"));document.head.appendChild(s);});}
/* транспорт: у хоста несколько гостей (send всем, sendTo одному, onmsg(o,id), onopen(id), onclose(id)), у гостя один хост */
const NET_MAX_GUESTS=5;
function bcTransport(code,role){const ch=new BroadcastChannel("arena-"+code),me=Math.random().toString(36).slice(2),T={id:me,peers:new Set(),
    send(o){ch.postMessage({from:me,role,o});},sendTo(id,o){ch.postMessage({from:me,role,to:id,o});},close(){try{ch.postMessage({from:me,role,o:{t:"bye"}});}catch(e){}ch.close();}};
  T.sendFast=T.send;T.sendFastTo=T.sendTo;T.drop=id=>T.peers.delete(id);
  ch.onmessage=e=>{const d=e.data;if(d.from===me||d.role===role||(d.to&&d.to!==me))return;const o=d.o||{};
    if(role==="host"){if(o.t==="bye"){if(T.peers.delete(d.from))T.onclose&&T.onclose(d.from);return}
      if(!T.peers.has(d.from)){if(T.peers.size>=NET_MAX_GUESTS){T.sendTo(d.from,{t:"full"});return}T.peers.add(d.from);T.onopen&&T.onopen(d.from);}
      T.onmsg&&T.onmsg(o,d.from);}
    else{if(o.t==="bye"){T.open=false;T.onclose&&T.onclose();return}if(!T.open){T.open=true;T.onopen&&T.onopen();}T.onmsg&&T.onmsg(o);}};
  if(role==="client")setTimeout(()=>T.send({t:"ping"}),50);else T.open=true;return T;}
async function peerTransport(code,role){await netLoadPeer();
  const T={peers:new Map(),close(){try{T.peer.destroy()}catch(e){}}};
  return new Promise((res,rej)=>{
    const q=new URLSearchParams(location.search),opt=q.get("peerhost")?{host:q.get("peerhost"),port:+q.get("peerport")||9000,path:"/arena",secure:false}:{};
    const p=T.peer=role==="host"?new Peer(NET_PREFIX+code,opt):new Peer(opt);
    p.on("error",e=>{netStatus(e.type==="peer-unavailable"?"Комната с таким кодом не найдена.":e.type==="unavailable-id"?"Такой код уже занят, создайте комнату ещё раз.":"Ошибка связи: "+(e.type||e.message));rej(e);});
    p.on("open",()=>{T.id=p.id;
      if(role==="host"){T.open=true;
        /* у каждого гостя два канала: надёжный для событий и быстрый без очереди для снимков и движения */
        T.send=o=>{for(const g of T.peers.values())if(g.conn.open)g.conn.send(o);};
        T.sendTo=(id,o)=>{const g=T.peers.get(id);if(g&&g.conn.open)g.conn.send(o);};
        T.sendFastTo=(id,o)=>{const g=T.peers.get(id);if(!g)return;const c=g.fast&&g.fast.open?g.fast:g.conn;if(c.open)c.send(o);};
        T.sendFast=o=>{for(const id of T.peers.keys())T.sendFastTo(id,o);};
        T.drop=id=>{const g=T.peers.get(id);T.peers.delete(id);if(g){try{g.conn.close();g.fast&&g.fast.close();}catch(e){}}};
        p.on("connection",c=>{const id=c.peer;
          if(c.label==="fast"){const g=T.peers.get(id);if(!g){c.close();return}g.fast=c;c.on("data",o=>T.onmsg&&T.onmsg(o,id));return}
          if(T.peers.size>=NET_MAX_GUESTS&&!T.peers.has(id)){c.on("open",()=>{c.send({t:"full"});setTimeout(()=>c.close(),2000);});return}
          const g={conn:c,fast:null};T.peers.set(id,g);
          c.on("open",()=>T.onopen&&T.onopen(id));c.on("data",o=>T.onmsg&&T.onmsg(o,id));
          c.on("close",()=>{if(T.peers.get(id)!==g)return;T.peers.delete(id);try{g.fast&&g.fast.close()}catch(e){}T.onclose&&T.onclose(id);});});
        res(T);}
      else{const c=T.conn=p.connect(NET_PREFIX+code,{reliable:true,serialization:"json"});
        T.send=o=>{if(c.open)c.send(o);};T.sendFast=o=>{const f=T.fast;if(f&&f.open)f.send(o);else T.send(o);};
        c.on("open",()=>{T.open=true;T.fast=p.connect(NET_PREFIX+code,{reliable:false,serialization:"json",label:"fast"});T.fast.on("data",o=>T.onmsg&&T.onmsg(o));T.onopen&&T.onopen();});
        c.on("data",o=>T.onmsg&&T.onmsg(o));c.on("close",()=>{T.open=false;T.onclose&&T.onclose();});
        res(T);}});});}
function netStatus(s){const e=$("#netStatus");if(e)e.textContent=s;}
function netMakeCode(){const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<4;i++)s+=A[Math.floor(Math.random()*A.length)];return s}
function netUseBC(){const q=new URLSearchParams(location.search);if(q.has("peerhost")||q.has("ws"))return false;return location.protocol==="file:"||/^(localhost|127\.)/.test(location.hostname)||q.has("local")}
/* свой сервер комнат (server/relay.js): все игроки подключаются к нему по WebSocket, это проходит через любой роутер.
   Если сервер недоступен, игра сама переходит на прямое соединение через PeerJS, как раньше */
const NET_WS_URL="wss://wowarena92.duckdns.org/arena";
function netWsUrl(){const q=new URLSearchParams(location.search);return q.get("ws")||NET_WS_URL;}
function wsTransport(url,code,role){return new Promise((res,rej)=>{
  let done=false,ws;const fin=(ok,v)=>{if(done)return;done=true;clearTimeout(to);ok?res(v):rej(v);};
  try{ws=new WebSocket(`${url}?room=${code}&role=${role}${role==="host"&&NET.pub?"&pub=1":""}`);}catch(e){rej(e);return}
  const to=setTimeout(()=>{fin(false,{type:"timeout"});try{ws.close()}catch(e){}},5000);
  const T={peers:new Set(),close(){done=true;try{ws.close()}catch(e){}}};
  const raw=o=>{if(ws.readyState===1)ws.send(JSON.stringify(o));};
  if(role==="host"){T.info=o=>raw({info:o});T.send=o=>raw({o});T.sendTo=(id,o)=>raw({to:id,o});T.drop=id=>{T.peers.delete(id);raw({kick:id});};}
  else{T.send=o=>raw(o);}
  T.sendFast=T.send;T.sendFastTo=T.sendTo;
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(err){return}if(!m||typeof m!=="object")return;
    if(m.t==="_err"){fin(false,{type:m.e,final:role==="host"&&m.e!=="server-full"});if(m.e==="unavailable-id")netStatus("Такой код уже занят, создайте комнату ещё раз.");return}
    if(role==="host"){
      if(m.t==="_hosted"){T.open=true;fin(true,T);return}
      if(m.t==="_open"){T.peers.add(m.id);T.onopen&&T.onopen(m.id);return}
      if(m.t==="_close"){if(T.peers.delete(m.id))T.onclose&&T.onclose(m.id);return}
      if(m.t==="_m"&&T.peers.has(m.from)){T.onmsg&&T.onmsg(m.o,m.from);}return}
    if(m.t==="_open"){T.open=true;fin(true,T);setTimeout(()=>T.onopen&&T.onopen(),0);return}
    if(m.t==="full"&&!done){netStatus(`Комната ${code} заполнена: в ней уже ${NET_MAX_GUESTS+1} игроков.`);fin(false,{type:"full",final:true});return}
    if(m.t==="_close")return;
    T.onmsg&&T.onmsg(m);};
  ws.onerror=()=>fin(false,{type:"network"});
  ws.onclose=()=>{if(!done){fin(false,{type:"network"});return}if(T.open||role==="client"){T.open=false;T.onclose&&T.onclose();}};});}
/* открыть комнату: свой сервер, если он отвечает, иначе прямое соединение */
async function netOpen(code,role){
  if(netUseBC()){NET.via="local";return bcTransport(code,role);}
  const u=netWsUrl();
  if(u){try{const T=await wsTransport(u,code,role);NET.via="server";return T}catch(e){if(e&&e.final)throw e;}}
  NET.via="p2p";return await peerTransport(code,role);}
async function netHost(){netLeave();NET.pub=$("#netPub").checked;const code=netMakeCode();NET.code=code;NET.role="host";NET.peers={};NET.myTeam=0;netStatus("Создаю комнату…");
  try{NET.tx=await netOpen(code,"host");}catch(e){NET.role=null;return}
  netStatus(`Комната ${code}. Скажите друзьям этот код и ждите подключения (до ${NET_MAX_GUESTS+1} игроков).`);netWire();renderNet();}
async function netJoin(){netLeave();const code=($("#netCode").value||"").trim().toUpperCase();if(!/^[A-Z0-9]{4}$/.test(code)){netStatus("Код комнаты — четыре символа.");return}
  NET.code=code;NET.role="client";netStatus("Подключаюсь…");
  try{NET.tx=await netOpen(code,"client");}catch(e){NET.role=null;return}
  netWire();renderNet();
  clearTimeout(NET.joinT);NET.joinT=setTimeout(()=>{if(NET.role==="client"&&!NET.lobby)netStatus("Хост не отвечает. Проверьте код комнаты и что хост не закрыл вкладку.");},12000);}
/* --- состав комнаты: у хоста NET.peers[id]={nick,cls,tal,team,rtt}, сам хост в NET.myTeam --- */
const netSize=()=>TSIZE(settings.mode);
const netGuests=()=>Object.entries(NET.peers||{}).filter(([,g])=>g.cls);
function netHumans(){const L=SRV?[]:[{id:"host",nick:myNick(),cls:settings.pcls,team:NET.myTeam||0,host:1}];for(const [id,g] of netGuests())L.push({id,nick:g.nick,cls:g.cls,team:g.team,ready:!!g.ready,rtt:g.rtt||0});return L;}
/* свободное место: в 1 на 1 первый гость идёт против хоста, в 2 на 2 сначала к хосту */
function netAutoTeam(skip){const n=[0,0];for(const h of netHumans())if(h.id!==skip)n[h.team]++;const pref=settings.mode!=="1v1"?[NET.myTeam||0,1-(NET.myTeam||0)]:[1-(NET.myTeam||0),NET.myTeam||0];
  for(const t of pref)if(n[t]<netSize())return t;return n[0]<=n[1]?0:1;}
function netFixTeams(){const S=netSize();for(let pass=0;pass<2;pass++){const n=[0,0];for(const h of netHumans())n[h.team]++;
  for(const t of [0,1])if(n[t]>S&&n[1-t]<S){const g=netGuests().reverse().find(([,g])=>g.team===t);if(g){g[1].team=1-t;}}}}
/* боты занимают пустые места: у команды хоста класс союзника, у другой — классы противников */
function netBotCls(team){return team===(NET.myTeam||0)?[settings.acls,settings.acls2]:[settings.ecls,settings.ecls2,settings.ecls3];}
function netLobby(){netFixTeams();const H=netHumans(),S=netSize(),teams=[[],[]];
  for(const h of H)teams[h.team].push(h);
  for(const t of [0,1]){const bc=netBotCls(t);let k=0;while(teams[t].length<S)teams[t].push({bot:1,cls:bc[k++]||settings.ecls,team:t});}
  return{mode:settings.mode,diff:settings.diff,over:H.length>2*S,teams:teams.map(L=>L.map(p=>({id:p.id,nick:p.nick,cls:p.cls,host:p.host?1:0,bot:p.bot?1:0,ready:p.ready?1:0,rtt:p.rtt||0})))};}
function netLobbyIn(L){if(!L||typeof L!=="object"||!Array.isArray(L.teams))return null;
  const team=a=>(Array.isArray(a)?a:[]).slice(0,3).map(p=>({id:String(p&&p.id||""),nick:cleanNick(p&&p.nick)||"Игрок",cls:CLASSES.includes(p&&p.cls)?p.cls:"warrior",host:p&&p.host?1:0,bot:p&&p.bot?1:0,ready:p&&p.ready?1:0,rtt:+(p&&p.rtt)||0}));
  return{mode:normMode(L.mode),diff:DIFF[L.diff]?L.diff:"normal",over:!!L.over,teams:[team(L.teams[0]),team(L.teams[1])]};}
function netSendLobby(){if(NET.role!=="host"||!NET.tx)return;const L=netLobby();for(const id of Object.keys(NET.peers))NET.tx.sendTo(id,{t:"lobby",you:id,lobby:L});}
function netWire(){const T=NET.tx;
  if(NET.role==="host"){
    T.onopen=id=>{if(!NET.peers[id])NET.peers[id]={};T.sendTo(id,{t:"ping"});};
    T.onclose=id=>{const g=NET.peers[id];delete NET.peers[id];if(g&&g.cls)netStatus(`${g.nick} вышел из комнаты.`);if(g&&g.unit){g.unit.netId=null;}netSendLobby();renderNet();};
  }else{
    T.onopen=()=>netSendMe(true);
    T.onclose=()=>{netStatus(NET.lobby?"Связь с хостом потеряна.":`Не удалось войти: комната ${NET.code} заполнена (до ${NET_MAX_GUESTS+1} игроков) или хост вышел.`);NET.lobby=null;renderNet();};
  }
  T.onmsg=(o,id)=>{if(!o||typeof o!=="object")return;
    if(NET.role==="host"&&NET.peers[id])NET.peers[id].seen=performance.now();
    if(o.t==="ping")return;
    if(o.t==="pg"){(id?T.sendTo(id,{t:"po",ts:o.ts}):T.send({t:"po",ts:o.ts}));return}
    if(o.t==="po"){const r=performance.now()-o.ts;if(!(r>=0&&r<10000))return;if(id){const g=NET.peers[id];if(g)g.rtt=Math.round(r);}else NET.rtt=Math.round(r);return}
    if(NET.role==="host"){const g=NET.peers[id];if(!g)return;g.seen=performance.now();
      if(o.t==="hello"&&o.ver!==GAME_VER){T.sendTo(id,{t:"oldver"});netStatus("Игрок с устаревшей версией игры не пущен: ему нужно обновить страницу (Ctrl+F5).");return}
      if(o.t==="hello"&&CLASSES.includes(o.cls)){const first=!g.cls;Object.assign(g,{pmh:String(o.pmh||""),poh:String(o.poh||""),cls:o.cls,tal:o.tal&&typeof o.tal==="object"?o.tal:{},nick:cleanNick(o.nick)||"Игрок"});
        if(first){g.team=netAutoTeam(id);netStatus(`${g.nick} зашёл в комнату. Нажмите «В бой», когда все готовы.`);}netSendLobby();renderNet();}
      else if(o.t==="ready"){g.ready=!!o.v;netSendLobby();renderNet();}
      else if(o.t==="team"&&(o.team===0||o.team===1)&&state!=="fight"&&state!=="countdown"){const n=netHumans().filter(h=>h.team===o.team&&h.id!==id).length;if(n<netSize()){g.team=o.team;netSendLobby();renderNet();}}
      else if(o.t==="in"){if(o.n&&g.inN&&o.n<g.inN)return;g.inN=o.n||0;g.rx=o;const f=g.unit;if(!f||!units.includes(f))return;const t=units[o.tg],fr=units[o.fr];if(t&&t.team!==f.team&&t.alive)setTarget(f,t);else if(o.tg===-1)setTarget(f,null);f.friend=fr&&fr.team===f.team&&fr!==f?fr:null;f.healMode=!!o.hm;}
      else if(o.t==="use"&&g.unit&&units.includes(g.unit)&&typeof o.id==="string"&&META[o.id])netRemoteUse(g.unit,o.id);
      else if(o.t==="cancel"&&g.unit&&units.includes(g.unit))cancelCast(g.unit);
    }else{
      if(o.t==="oldver"){netStatus("У хоста другая версия игры. Обновите страницу (Ctrl+F5), и пусть хост тоже обновит.");const c=NET.code;netLeave();NET.code=c;return}
      if(o.t==="full"){netStatus(`Комната ${NET.code} заполнена: в ней уже ${NET_MAX_GUESTS+1} игроков.`);const c=NET.code;netLeave();NET.code=c;return}
      if(o.t==="lobby"){const first=!NET.lobby;NET.lobby=netLobbyIn(o.lobby);NET.myId=String(o.you||"");if(NET.lobby){const h=NET.lobby.teams.flat().find(p=>p.host);NET.srvRoom=!h;if(first)netStatus(h?`Вы в комнате ${NET.code} у игрока ${h.nick}. Бой начинает он.`:`Вы в комнате ${NET.code} на сервере. Бой начнётся, когда все нажмут «Готов».`);}renderNet();}
      else if(o.t==="start")netClientStart(o);
      else if(o.t==="snap"){if(o.n&&NET.snapN&&o.n<NET.snapN)return;NET.snapN=o.n||0;NET.lastSnap=o;}
      else if(o.t==="ev")for(const e of o.e)netPlay(e);
    }};}
addEventListener("pagehide",()=>{try{if(NET.tx)NET.tx.close();}catch(e){}});
function netLeave(){if(NET.tx)NET.tx.close();clearTimeout(NET.joinT);
  if(units.length&&state!=="menu"&&NET.role){state="menu";$("#hud").hidden=true;$("#result").hidden=true;$("#menu").hidden=false;}
  for(const u of units)if(u.net&&NET.role==="host"){u.netId=null;}
  Object.assign(NET,{role:null,tx:null,peers:{},lobby:null,myId:"",lastSnap:null,evq:[],rtt:0,snapN:0});renderNet();}
/* о себе: гость шлёт ник, класс и таланты; хост в ответ рассылает всем состав лобби */
function netSendMe(force){const T=NET.tx;if(!T||!NET.role)return;
  if(NET.role==="client"){if(!force&&!T.open)return;T.send({t:"hello",ver:GAME_VER,pmh:settings.poisonMH,poh:settings.poisonOH,nick:myNick(),cls:settings.pcls,tal:myTal[settings.pcls]});}else netSendLobby();}
function netPickTeam(t){if(NET.role==="host"){const n=netHumans().filter(h=>h.team===t&&h.id!=="host").length;if(n<netSize()){NET.myTeam=t;netSendLobby();renderNet();}}
  else if(NET.tx)NET.tx.send({t:"team",team:t});}
/* лобби: кто в комнате и за какую команду; у всех один и тот же состав, его считает хост */
function renderLobby(){const el=$("#lobby");if(!el)return;if(!NET.role){el.hidden=true;return}el.hidden=false;
  const host=NET.role==="host",L=host?netLobby():NET.lobby,myId=host?"host":NET.myId;
  el.innerHTML="";
  if(!L){const n=document.createElement("div");n.className="note";n.textContent=`Комната ${NET.code}: ждём ответа хоста…`;el.appendChild(n);return}
  L.teams.forEach((list,ti)=>{const col=document.createElement("div");col.className="lteam";
    const h=document.createElement("h3");h.textContent="Команда "+(ti+1);col.appendChild(h);
    const inTeam=list.some(p=>p.id===myId),free=list.filter(p=>!p.bot).length<TSIZE(L.mode);
    for(const p of list){const me=p.id===myId,row=document.createElement("div");row.className="lp"+(me?" me":"")+(p.bot?" bot":"");
      const i=document.createElement("i");i.style.cssText=iconBg("cls_"+p.cls,20);row.appendChild(i);
      const b=document.createElement("b");b.textContent=p.bot?"Бот":p.nick;row.appendChild(b);
      const s=document.createElement("span");s.textContent=" · "+B[p.cls].name.toLowerCase()+(me?" (вы)":"")+(p.host?" · хост":"")+(!p.bot&&!p.host?(p.ready?" · ✔ готов":" · не готов"):"")+(!p.bot&&!p.host&&p.rtt?` · ${p.rtt} мс`:"");row.appendChild(s);col.appendChild(row);}
    if(!inTeam&&free&&state!=="fight"&&state!=="countdown"){const bt=document.createElement("button");bt.className="opt txt";bt.textContent="Перейти сюда";bt.onclick=()=>netPickTeam(ti);col.appendChild(bt);}
    el.appendChild(col);});
  if(!host&&state!=="fight"&&state!=="countdown"){const me=L.teams.flat().find(p=>p.id===myId),rd=!!(me&&me.ready);const bt=document.createElement("button");bt.className="btn";bt.textContent=rd?"Не готов":"Готов";
    bt.onclick=()=>{if(NET.tx)NET.tx.send({t:"ready",v:!rd});};el.appendChild(bt);}
  const n=document.createElement("div");n.className="note";const cnt=L.teams.flat().filter(p=>!p.bot).length;
  n.textContent=`Комната ${NET.code} · ${modeName(L.mode)} · людей ${cnt}${L.over?` из ${netGuestsCount(L)}: игроков больше, чем мест, выберите формат побольше`:""}${!host&&NET.rtt?` · пинг до хоста ${NET.rtt} мс`:""}${NET.via==="server"?" · через сервер":NET.via==="p2p"?" · напрямую":""}`;el.appendChild(n);}
const netGuestsCount=L=>NET.role==="host"?netHumans().length:L.teams.flat().filter(p=>!p.bot).length;
function renderNet(){renderLobby();{const ls=$("#lobbyStart");if(ls){ls.hidden=!NET.role;}const bl=$("#btnLobby");if(bl)bl.textContent=NET.role?"Лобби · в комнате":"Лобби";}const on=!!NET.role;$("#netPubRow").hidden=on;$("#pubBox").hidden=on;$("#netHost").hidden=on;$("#netJoinRow").hidden=on;$("#netLeave").hidden=!on;
  const b=$("#btnStart");if(NET.role==="client"){b.disabled=true;b.textContent="Бой начинает хост";}else{const gs=netGuests(),rd=gs.filter(([,g])=>g.ready).length;b.textContent=NET.role==="host"?(gs.length?`В бой (готовы ${rd} из ${gs.length})`:"В бой (по сети)"):"На арену";if(NET.role==="host")b.disabled=!netGuests().length||netHumans().length>2*netSize();else if(!$("#loadNote").textContent.startsWith("Загружаю"))b.disabled=false;}
  $("#optE").closest(".group").style.opacity=1;}
/* пинг раз в 2 секунды в обе стороны: хост видит пинг каждого гостя в лобби, гость — свой */
setInterval(()=>{if(!NET.tx||!NET.role)return;const ts=performance.now();if(NET.role==="host"){for(const id in NET.peers){const g=NET.peers[id];if(g.seen&&ts-g.seen>45000){NET.tx.drop&&NET.tx.drop(id);NET.tx.onclose(id);}}if(netGuests().length){NET.tx.send({t:"pg",ts});if(state==="menu")renderLobby();}}else if(NET.tx.open){NET.tx.send({t:"pg",ts});if(state==="menu")renderLobby();}},2000);

/* --- запись событий на хосте: обёртки над функциями эффектов --- */
const NU=u=>units.indexOf(u),ND=i=>units[i];let netDepth=0;
function netEv(e){if(NET.role==="host"&&netDepth===0&&state!=="menu")NET.evq.push(e);}
function netWrapFn(name,enc){const f=window[name];window[name]=function(...a){if(NET.role==="host"&&netDepth===0&&state!=="menu"){const e=enc(...a);if(e)NET.evq.push(e);}netDepth++;try{return f.apply(this,a)}finally{netDepth--;}};}
netWrapFn("sfxUse",(u,id)=>["su",NU(u),id]);
netWrapFn("useFx",(u,id)=>["uf",NU(u),id]);
netWrapFn("castFx",(u,an)=>["cf",NU(u),an||0]);
netWrapFn("swingFx",(u,an)=>["sw",NU(u),an||0]);
netWrapFn("roarFx",u=>["rf",NU(u)]);
netWrapFn("projectile",(u,t,sp,sch,_,kind)=>["pj",NU(u),NU(t),sp,sch,kind||0,fxSpell||0]);
netWrapFn("spellVis",(u,id,st)=>["sv",NU(u),id,st]);
netWrapFn("novaFx",(p,r,c)=>["nv",+p.x.toFixed(2),+p.z.toFixed(2),r,c]);
netWrapFn("coneFx",(u,r,c)=>["cn",NU(u),r,c]);
netWrapFn("burstFx",(p,c)=>["bf",+p.x.toFixed(2),+p.z.toFixed(2),c]);
netWrapFn("impactFx",(t,s,cr,big)=>m2Skip()?0:["im",NU(t),s,cr?1:0,big?1:0]);
netWrapFn("healFx",(u,big)=>["hf",NU(u),big?1:0]);
netWrapFn("schoolBurst",(x,y,z,s,n,sp,sz)=>["sb",+x.toFixed(2),+y.toFixed(2),+z.toFixed(2),s,n,sp,sz]);
netWrapFn("sfx",(ev,u,o)=>o&&o.loop?null:["sx",ev,u?NU(u):-1,o&&o.vol||1]);
netWrapFn("combatText",(s,t,amt,cr,o,sch,bl,ab_)=>["ct",NU(s),NU(t),amt,cr?1:0,o&&o.auto?1:0,sch,bl?1:0,ab_||0]);
netWrapFn("combatMiss",(s,t,w)=>["cm",NU(s),NU(t),w]);
netWrapFn("statusText",(u,s,c)=>["st",NU(u),s,c]);
netWrapFn("healText",(u,amt,cr)=>["ht",NU(u),amt,cr?1:0]);
netWrapFn("addZone",(u,a)=>["zn",+u.pos.x.toFixed(2),+u.pos.z.toFixed(2),a.radius,a.dur]);
function castFailU(u,why){if(u.isPlayer)castFail(why);else if(u.net)netEv(["cfl",why,NU(u)]);}
function castOkU(u,name){if(u.isPlayer)castOk(name);else if(u.net)netEv(["cok",name,NU(u)]);}
/* --- воспроизведение событий у второго игрока --- */
function netPlay(e){const k=e[0];
  try{switch(k){
    case "su":sfxUse(ND(e[1]),e[2]);break;case "uf":useFx(ND(e[1]),e[2]);break;
    case "cf":castFx(ND(e[1]),e[2]||undefined);break;case "sw":swingFx(ND(e[1]),e[2]||undefined);break;case "rf":roarFx(ND(e[1]));break;
    case "pj":fxSpell=e[6]||null;try{projectile(ND(e[1]),ND(e[2]),e[3],e[4],()=>{},e[5]||undefined);}finally{fxSpell=null}break;case "sv":spellVis(ND(e[1]),e[2],e[3]);break;
    case "nv":novaFx({x:e[1],z:e[2]},e[3],e[4]);break;case "cn":coneFx(ND(e[1]),e[2],e[3]);break;case "bf":burstFx({x:e[1],z:e[2]},e[3]);break;
    case "im":impactFx(ND(e[1]),e[2],!!e[3],!!e[4]);break;case "hf":healFx(ND(e[1]),!!e[2]);break;
    case "sb":schoolBurst(e[1],e[2],e[3],e[4],e[5],e[6],e[7]);break;
    case "sx":sfx(e[1],e[2]<0?null:ND(e[2]),{vol:e[3]});break;
    case "ct":combatText(ND(e[1]),ND(e[2]),e[3],!!e[4],{auto:!!e[5]},e[6],!!e[7],e[8]);break;
    case "cm":combatMiss(ND(e[1]),ND(e[2]),e[3]);break;case "st":statusText(ND(e[1]),e[2],e[3]);break;case "ht":healText(ND(e[1]),e[2],!!e[3]);break;
    case "zn":{const m=new THREE.Mesh(tileGeo(FXT.rune),fxMat(0xffc040,.5));m.scale.setScalar(e[3]);m.rotation.x=-Math.PI/2;m.position.set(e[1],GY(e[1],e[2])+.06,e[2]);scene.add(m);zones.push({x:e[1],z:e[2],r:e[3],dps:0,src:null,name:"",next:Infinity,until:now+e[4],mesh:m});break;}
    case "cok":if(e[2]==null||ND(e[2])===player)castOk(e[1]);break;case "cfl":if(e[2]==null||ND(e[2])===player)castFail(e[1]);break;case "er":if(e[2]==null||ND(e[2])===player)showErr(e[1]);break;
    case "end":{const s=e[2];if(state!=="over")state="fight";units.forEach((u,i)=>{if(s[i])Object.assign(u.stats,s[i]);});endRound(ND(e[1]));break;}
  }}catch(err){console.warn("net event",k,err);}}
/* --- снимок состояния бойца --- */
const NET_T=x=>x===Infinity?-1:+Math.max(0,x-now).toFixed(2);
function netSnapU(u){const a=[];for(const x of u.auras){if(x.until<=now)continue;const o={};for(const k in x){const v=x[k];if(k==="src"||k==="next"||typeof v==="object"&&v!==null||typeof v==="function")continue;o[k]=v;}o.until=NET_T(x.until);a.push(o);}
  const cds={};for(const k in u.cds)if(u.cds[k]>now)cds[k]=NET_T(u.cds[k]);
  return {x:+u.pos.x.toFixed(3),z:+u.pos.z.toFixed(3),y:+u.y.toFixed(3),f:+u.facing.toFixed(3),hp:Math.round(u.hp),mh:u.maxHp,r:Math.round(u.res),mr:u.maxRes,a,cds,g:NET_T(u.gcdUntil),
    c:u.cast?[u.cast.id,+(now-u.cast.start).toFixed(2),NET_T(u.cast.end),u.cast.channel?1:0]:0,cp:u.cp||0,st:u.stance,al:u.alive?1:0,mv:u.moving?1:0,ml:u.moveLocal,bo:+(u.bodyOff||0).toFixed(2),sp:+(u.speedNow||0).toFixed(2),
    ch:u.charging?1:0,w:u.netWarp||0,air:u.air?1:0,eat:u.eating?NET_T(u.eating.until):0,cb:NET_T(u.combatUntil||0),op:NET_T(u.opUntil||0),loh:u.lohUsed?1:0,fz:(aura(u,"fear")||u.charging||incap(u)||rooted(u))?1:0};}
function netApplyU(u,s,own){
  if(own){if(s.fz||!s.al||s.w!==u.netWarp){u.netWarp=s.w;u.pos.x=s.x;u.pos.z=s.z;u.y=s.y;u.facing=s.f;u.moving=!!s.mv;u.moveLocal=s.ml;u.bodyOff=s.bo||0;u.air=!!s.air;}}
  else{u.netTarget={x:s.x,z:s.z,y:s.y};u.facing=s.f;u.moving=!!s.mv;u.moveLocal=s.ml;u.bodyOff=s.bo||0;u.speedNow=s.sp;
    if(s.air&&!u.air)u.jumpAt=now;if(!s.air&&u.air)u.landAt=now;u.air=!!s.air;}
  u.hp=s.hp;u.maxHp=s.mh;u.res=s.r;u.maxRes=s.mr;u.cp=s.cp;u.stance=s.st;u.alive=!!s.al;u.lohUsed=!!s.loh;
  u.auras=s.a.map(o=>({...o,until:o.until<0?Infinity:now+o.until}));
  u.cds={};for(const k in s.cds)u.cds[k]=now+s.cds[k];u.gcdUntil=now+s.g;
  if(s.c){const [id,el,left,chn]=s.c;if(!u.cast||u.cast.id!==id)u.cast={id,start:now-el,end:now+left,channel:!!chn,target:other(u)};else u.cast.end=now+left;}else u.cast=null;
  u.charging=s.ch?{}:null;u.combatUntil=now+s.cb;u.opUntil=now+s.op;
  if(s.eat>0){if(!u.eating)u.eating={until:now+s.eat};}else u.eating=null;}
/* --- хост: управление бойцом друга --- */
class NetCtl{constructor(u){this.u=u;u.net=true;}update(){}}
function netRemoteMove(u,dt){const g=u.netId&&NET.peers[u.netId],r=g&&g.rx;if(!r||aura(u,"fear"))return false;
  if((r.w||0)!==(u.netWarp||0))return true;
  if(incap(u)||rooted(u)||!u.alive){u.moving=false;return true}
  {let tx=r.x,tz=r.z,ty=r.y;
    /* проверка движения: клиент не может бежать быстрее своей скорости (+запас на пинг) и висеть выше прыжка */
    const G=B.general,sp=B[u.cls].speed*(1+(u.K.speed||0)/100)*Math.max(1,...u.auras.filter(a=>a.type==="sprint"&&a.until>now).map(a=>1+a.pct/100))*(1+G.acSlack/100);
    u.acBudget=Math.min(sp*G.acLag+1.5,(u.acBudget??sp*G.acLag+1.5)+sp*dt);
    const d=Math.hypot(tx-u.pos.x,tz-u.pos.z);
    if(d>u.acBudget){u.acSus=(u.acSus||0)+1;if(now-(u.acLogAt||0)>5){u.acLogAt=now;console.warn(`[anticheat] ${u.name} (${u.cls}): скачок ${d.toFixed(1)} м при допустимых ${u.acBudget.toFixed(1)} м, всего ${u.acSus}`);}
      if(G.antiCheat){const k=u.acBudget/d;tx=u.pos.x+(tx-u.pos.x)*k;tz=u.pos.z+(tz-u.pos.z)*k;}}
    u.acBudget=Math.max(0,u.acBudget-Math.min(d,u.acBudget));
    const gy=GY(tx,tz),top=gy+G.jumpSpeed*G.jumpSpeed/(2*G.gravity)+.6;if(ty>top){if(now-(u.acYAt||0)>5){u.acYAt=now;console.warn(`[anticheat] ${u.name} (${u.cls}): высота ${(ty-gy).toFixed(1)} м над землёй`);}ty=top;}
    const dx=tx-u.pos.x,dz=tz-u.pos.z,k=Math.hypot(dx,dz)>4?1:Math.min(1,dt*18);u.pos.x+=dx*k;u.pos.z+=dz*k;u.y+=(ty-u.y)*Math.min(1,dt*18);}collide(u.pos);u.air=!!r.air;u.facing=r.f;u.moving=!!r.mv&&state==="fight";u.moveLocal=r.ml;u.bodyOff=r.bo||0;u.speedNow=r.sp;if(r.jump&&r.jump!==u.netJump){u.netJump=r.jump;u.jumpAt=now;}
  if(u.moving&&u.cast&&!u.cast.channel&&!B.general.castWhileMoving)cancelCast(u,"Прервано движением");
  return true}
function netRemoteUse(u,id){if(id==="iceblock"&&has(u,"iceblock")){tryUse(u,id);return}
  const err=canUse(u,id);if(err){netEv(["er",err,NU(u)]);return}const x=u.pos.x,z=u.pos.z;tryUse(u,id);
  if(Math.hypot(u.pos.x-x,u.pos.z-z)>.5){u.netWarp=(u.netWarp||0)+1;u.acBudget=undefined;}}
function netHostTick(){if(NET.role!=="host"||!NET.tx||!player||!units.length)return;
  if(NET.evq.length){NET.tx.send({t:"ev",e:NET.evq});NET.evq=[];}
  const t=performance.now();if(t-NET.sendAt<50)return;NET.sendAt=t;
  NET.tx.sendFast({t:"snap",n:++NET.seq,st:state,cd:+(countEnd-now).toFixed(2),rs:+(now-roundStart).toFixed(2),u:units.map(netSnapU)});}
/* --- второй игрок --- */
function netClientStart(o){
  clearArena();
  const R0=Array.isArray(o.ros)?o.ros:[{cls:o.cls,tal:o.tal,team:0,host:1},{cls:settings.pcls,tal:myTal[settings.pcls],team:1}],R=R0.slice(0,6),me=o.me??1,my=R[me].team,S=Math.max(1,R.length>>1);let lay=2;
  units=R.map((r,i)=>{const mine=i===me,cls=CLASSES.includes(r.cls)?r.cls:"warrior";
    const u=new Unit(mine?settings.pcls:cls,mine,...spawnXZ(r.team,latOf(i>>1,S)),cleanTal(mine?settings.pcls:cls,mine?myTal[settings.pcls]:r.tal),{team:r.team,friendly:r.team===my,layer:mine?1:lay++});
    if(!mine&&r.nick)u.name=cleanNick(r.nick)||"Игрок";else if(!mine&&r.team===my)u.name=B[cls].name+" (союзник)";u.facing=spawnFacing(r.team);return u;});
  player=units[me];setTarget(player,units.find(u=>u.team!==my));yaw=spawnYaw(my);pitch=.3;buildTeams();
  if(player.cls==="rogue"){player.poisonMH=settings.poisonMH;player.poisonOH=settings.poisonOH;}
  bot=null;castHideAt=0;$("#pcast").hidden=true;$("#book").hidden=true;buildBar();
  $("#menu").hidden=true;$("#result").hidden=true;$("#talents").hidden=true;$("#hud").hidden=false;
  state="countdown";countEnd=now+(o.cd||5);NET.lastSnap=null;}
function netClientStep(dt){
  const s=NET.lastSnap;
  if(s){NET.lastSnap=null;
    if(s.st!==state&&!(s.st==="fight"&&state==="countdown")&&s.st!=="over")state=s.st;
    if(state==="countdown")countEnd=now+s.cd;roundStart=now-s.rs;
    units.forEach((u,i)=>{if(s.u[i])netApplyU(u,s.u[i],u===player);});}
  if(state==="fight"||state==="countdown"){if(state==="fight")playerInput(dt);else{playerInput(dt);player.moveDir.set(0,0);}}
  const forced=aura(player,"fear")||player.charging||incap(player)||rooted(player);
  if(!forced)moveUnit(player,dt);
  collide(player.pos);floorSnap(player);
  for(const u of units){const tg=u.netTarget;if(u===player||!tg)continue;const k=Math.min(1,dt*12);u.pos.x+=(tg.x-u.pos.x)*k;u.pos.z+=(tg.z-u.pos.z)*k;u.y+=(tg.y-u.y)*k;}
  for(const z of zones)if(now>=z.until){scene.remove(z.mesh);}
  for(let i=zones.length-1;i>=0;i--)if(now>=zones[i].until)zones.splice(i,1);else{zones[i].mesh.rotation.z+=.004;}
  for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];tmp.set(p.t.pos.x,1.4+p.t.y,p.t.pos.z);const d=p.m.position.distanceTo(tmp);
    if(d<.6||!p.t.alive){scene.remove(p.m);projectiles.splice(i,1);p.done=true;if(p.t.alive&&p.vid)m2Kit(p.t,p.vid,"impact",true);continue}if(!p.m2)projFx(p,dt);p.m.position.addScaledVector(tmp.sub(p.m.position).normalize(),Math.min(d,p.speed*dt));}
  for(const u of units)updateModel(u,dt);
  const t=performance.now();if(NET.tx&&t-NET.inAt>=40){NET.inAt=t;const u=player;
    NET.tx.sendFast({t:"in",n:++NET.seq,x:+u.pos.x.toFixed(3),z:+u.pos.z.toFixed(3),y:+u.y.toFixed(3),f:+u.facing.toFixed(3),mv:u.moving?1:0,ml:u.moveLocal,bo:+(u.bodyOff||0).toFixed(2),sp:+(u.speedNow||0).toFixed(2),air:u.air?1:0,jump:u.jumpAt||0,w:u.netWarp||0,tg:units.indexOf(enemy),hm:u.healMode?1:0,fr:units.indexOf(player.friend)});}
}
{const ni=$("#netNick");ni.value=settings.nick||"";ni.oninput=()=>{settings.nick=cleanNick(ni.value);store.set("arena-settings",JSON.stringify(settings));clearTimeout(ni._t);ni._t=setTimeout(()=>{netSendMe();renderLobby();},300);};ni.onblur=()=>{ni.value=settings.nick;};}
/* комната на нашем сервере: бой считает сервер, у всех одинаковый пинг. Если сервер не ответил — комната в браузере, как раньше */
async function netCreate(){if(netUseBC()||new URLSearchParams(location.search).has("peerhost")){netHost();return}
  netLeave();netStatus("Создаю комнату на сервере…");
  try{const r=await fetch(netWsUrl().replace(/^ws/,"http").replace(/\/arena$/,"/arena/api/create"),{method:"POST",body:JSON.stringify({mode:settings.mode,pub:$("#netPub").checked?1:0,nick:myNick()})});
    const j=await r.json();if(!j.code)throw 0;$("#netCode").value=j.code;await netJoin();}
  catch(e){netHost();}}
$("#netHost").onclick=netCreate;$("#netJoin").onclick=netJoin;$("#netLeave").onclick=()=>{netLeave();netStatus("Вы вышли из комнаты.");};
$("#netCode").addEventListener("keydown",e=>{if(e.key==="Enter")netJoin();});
/* общий список: сколько людей в игре и открытые комнаты с сервера; хост сообщает серверу состояние своей комнаты */
const PUB_URL=netWsUrl().replace(/^ws/,"http").replace(/\/arena$/,"/arena/api/lobby");
function netPubInfo(){if(NET.role==="host"&&NET.pub&&NET.tx&&NET.tx.info)NET.tx.info({nick:myNick(),fmt:settings.mode,max:2*netSize(),fight:state==="fight"||state==="countdown"});}
setInterval(netPubInfo,3000);
function pubRefresh(){if(location.protocol==="file:"||NET.role||$("#menu").hidden)return;
  fetch(PUB_URL,{cache:"no-store"}).then(r=>r.json()).then(j=>{
    $("#pubOnline").textContent=`Сейчас в игре: ${j.online}`;const el=$("#pubList");el.textContent="";
    if(!j.rooms.length){const d=document.createElement("div");d.className="note";d.textContent="Открытых комнат нет. Создайте свою.";el.appendChild(d);return}
    for(const r of j.rooms){const d=document.createElement("div");d.style.cssText="display:flex;gap:8px;align-items:center;margin:3px 0";
      const t=document.createElement("span");t.textContent=`${r.nick} · ${modeName(r.fmt)} · ${r.n}/${r.max}${r.fight?" · идёт бой":""}`;d.appendChild(t);
      const b=document.createElement("button");b.className="btn";b.textContent="Войти";b.disabled=r.n>=r.max;b.onclick=()=>{$("#netCode").value=r.code;netJoin();};d.appendChild(b);el.appendChild(d);}
  }).catch(()=>{$("#pubOnline").textContent="Сервер комнат недоступен";});}
setTimeout(pubRefresh,1500);setInterval(pubRefresh,5000);
netWrapFn("endRound",(w)=>state==="fight"?["end",NU(w),units.map(u=>u.stats)]:null);

/* ================= ЦИКЛ ================= */
/* игровое поле 16:9 по центру окна (или во всё окно в настройках) */
const STAGE={x:0,y:0,w:innerWidth,h:innerHeight};
function uiScale(){const s=Math.max(.6,Math.min(1.35,Math.min(STAGE.w/760,STAGE.h/600)));document.documentElement.style.setProperty("--s",s.toFixed(3));}
function resize(){applyAA();const iw=innerWidth,ih=innerHeight,wide=(settings.aspect||"wide")==="wide";let w=iw,h=ih;
  if(wide){w=Math.min(iw,Math.round(ih*16/9));h=Math.round(w*9/16);}
  Object.assign(STAGE,{x:Math.round((iw-w)/2),y:Math.round((ih-h)/2),w,h});const r=document.documentElement.style;
  r.setProperty("--sx",STAGE.x+"px");r.setProperty("--sy",STAGE.y+"px");r.setProperty("--sw",w+"px");r.setProperty("--sh",h+"px");document.documentElement.classList.toggle("wide",wide);
  renderer.setSize(w,h,false);camera.aspect=w/h;
  /* угол обзора как в клиенте: 90° по диагонали, на 16:9 это около 44° по вертикали */
  camera.fov=90/Math.sqrt(camera.aspect*camera.aspect+1);camera.updateProjectionMatrix();uiScale();}
addEventListener("resize",resize);resize();
const tmp=new THREE.Vector3();let last=performance.now();
function updateModel(u,dt){
  const m=u.model;u.pos.y=u.y;m.g.position.set(u.pos.x,u.y,u.pos.z);
  const t=other(u);
  if((!u.isPlayer||touchMode)&&!u.moving&&!u.charging&&!u.air&&t&&u.alive&&!incap(u)&&canSee(u,t))u.facing=Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z);
  /* разворот тела при беге по диагонали и переступание на месте при повороте стоя */
  const bo=u.moving?(u.bodyOff||0):0;m.off=(m.off||0)+(bo-(m.off||0))*(1-Math.exp(-17.26*dt));
  m.g.rotation.y=u.facing+m.off;
  const dF=angDiff(u.facing,m.lastF??u.facing);m.lastF=u.facing;m.turnT=Math.abs(dF)>dt*.8?now:(m.turnT||0);if(Math.abs(dF)>dt*.8)m.turnDir=dF>0?1:-1;
  /* скрытность: свой разбойник полупрозрачный, чужой не виден, пока его не заметили */
  const st=stealthed(u);
  if(u.team===player.team)setOpacity(m,st?.42:1);
  else{m.g.visible=canSee(player,u);setOpacity(m,st?.42:1);}
  const poly=has(u,"incap")&&auraNamed(u,B.mage.abilities.poly.name);m.body.visible=!poly;m.sheep.visible=!!poly;
  m.stars.visible=has(u,"stun")||(has(u,"incap")&&!poly);m.stars.rotation.y+=dt*4;
  const ib=has(u,"iceblock"),rt=rooted(u);
  if(m.iceM&&m.blockM){m.ice.visible=false;m.iceM.visible=rt&&!ib;m.blockM.visible=ib;}
  else{m.ice.visible=rt||ib;m.ice.scale.set(ib?1.25:1,ib?2.6:1,ib?1.25:1);}
  const gv=m.g.visible;
  m.wall.visible=gv&&has(u,"reduce");m.shield.visible=gv&&(has(u,"absorb")||has(u,"manashield"));m.bubble.visible=gv&&(has(u,"immune")||has(u,"bop"));m.fear.visible=has(u,"fear");
  if(m.shield.visible)m.shield.material.color.setHex(has(u,"manashield")?0x3a70ff:0xffb030);
  for(const b of [m.wall,m.shield,m.bubble])if(b.visible){b.position.set(u.pos.x,u.y+1.15,u.pos.z);b.quaternion.copy(camera.quaternion);b.rotateZ(now*(b===m.shield?.8:.25));
    b.material.opacity=(b===m.bubble?.7:b===m.shield?.38:.55)+.08*Math.sin(now*4);}
  if(gv&&m.fear.visible&&Math.random()<dt*14)pfx(u.pos.x+rnd(-.3,.3),u.y+2.3,u.pos.z+rnd(-.3,.3),{t:FXT.wisp,v:[rnd(-.4,.4),rnd(.6,1.2),rnd(-.4,.4)],life:.9,s0:.5,s1:.9,c0:0xb070ff,c1:0x200840,spin:2});
  if(gv&&m.stars.visible&&Math.random()<dt*6){const a=Math.random()*6.283;pfx(u.pos.x+Math.cos(a)*.45,u.y+2.5,u.pos.z+Math.sin(a)*.45,{t:FXT.star,v:[-Math.sin(a)*1.2,.2,Math.cos(a)*1.2],life:.6,s0:.35,s1:.1,c0:0xfff0a0,c1:0xffa020});}
  if(gv&&has(u,"shadowform")&&Math.random()<dt*10)pfx(u.pos.x+rnd(-.45,.45),u.y+rnd(.2,1.9),u.pos.z+rnd(-.45,.45),{t:FXT.wisp,v:[0,rnd(.3,.8),0],life:.8,s0:.5,s1:.9,c0:0x7a40c0,c1:0x100020,spin:1.5});
  m.glow.visible=gv&&!!u.cast;
  const cr=u.cast&&!u.cast.channel&&gv;m.castRune.visible=!!cr;if(cr){m.castRune.material.color.setHex((SCH_FX[META[u.cast.id].school]||SCH_FX.arcane).c1);m.castRune.rotation.z+=dt*.8;m.castRune.material.opacity=Math.min(.85,(now-u.cast.start)*3);}
  /* петля заготовки заклинания, пока идёт каст (каналы звучат своим звуком) */
  const pre=u.cast&&!u.cast.channel?"pre_"+(META[u.cast.id].school||"arcane"):null;
  if(pre!==m.preKey){sfxStop(m.preSrc);m.preSrc=pre?sfx(pre,u,{loop:true,vol:.55}):null;m.preKey=m.preSrc?pre:null;}
  if(m.acts){
    if(!u.alive){if(m.base!=="death"){m.once=null;for(const k in m.acts)m.acts[k].fadeOut(.1);const a=m.acts.death;a.reset().setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.weight=1;a.fadeIn(.1);a.play();m.base="death";}}
    else{
      let base="stand",speed=1;
      if(ib){base="stand";}
      else if(has(u,"stun")||has(u,"incap"))base="stun";
      else if(u.charging)base="charge";
      else if(u.air)base="jump";
      else if(u.moving){
        if(st){if(m.acts.stealthrun){base="stealthrun";speed=(u.speedNow||5)/B[u.cls].speed;}else{base="stealthwalk";speed=(u.speedNow||5)/4.2;}}
        else if(m.acts.sprint&&u.moveLocal==="run"&&aura(u,"sprint")){base="sprint";speed=(u.speedNow||7)/(B[u.cls].speed*1.5);}
        else{base=u.moveLocal;speed=(u.speedNow||7)/B[u.cls].speed;if(base==="back")speed=(u.speedNow||4.5)/4.5;if(base==="walk")speed=1;}}
      else if(now-(m.turnT||0)<.12&&!u.cast&&!st){base=m.turnDir>0?"left":"right";speed=.75;}
      else if(u.eating)base="sit";
      else if(u.cast&&u.cast.channel)base=META[u.cast.id].target?"channel":"channelomni";
      else if(u.cast){const o=ORIG_PRE[u.cast.id];base=o&&m.acts[o]?o:"castloop";}
      else if(st)base="stealthstand";
      else if(state==="fight"&&inCombat(u))base="ready";
      /* прыжок: толчок при отрыве, приземление стоя */
      if(u.jumpAt&&m.jumpSeen!==u.jumpAt){m.jumpSeen=u.jumpAt;playOnce(m,"jumpstart",1.6);}
      if(u.landAt&&m.landSeen!==u.landAt){m.landSeen=u.landAt;if(!u.moving)playOnce(m,"jumpend",1.4);}
      if(u.eating&&m.sitSeen!==u.eating){m.sitSeen=u.eating;playOnce(m,"sitdown",1.2);}
      if(m.once&&now>=m.onceUntil)endOnce(m);
      if(m.once&&(base==="stun"||ib||((u.moving||u.air)&&!m.onceUp&&!/^jump/.test(m.once.getClip().name))))endOnce(m);
      setBase(m,base);
      const ba=m.acts[m.base];if(ba)ba.setEffectiveTimeScale(Math.max(.4,speed));
    }
    m.mixer.timeScale=ib?0:1;
    m.mixer.update(dt);
  }else{
    const moving=u.moving||!!u.charging;m.walk+=dt*(moving?(u.charging?20:10):0);
    const sw=moving?Math.sin(m.walk)*.6:0;m.legs[0].rotation.x=sw;m.legs[1].rotation.x=-sw;m.arms[0].rotation.x=-sw*.8;
    m.swing=Math.max(0,m.swing-dt*4);m.arms[1].rotation.x=u.cast?-1.2:(m.swing>0?-2.2*Math.sin(m.swing*Math.PI):sw*.8);
    const tgt=u.alive?0:-Math.PI/2;m.body.rotation.x+=(tgt-m.body.rotation.x)*Math.min(1,dt*6);
  }
  if(u.cast&&(m2Has(u.cast.id,u.cast.channel?"channel":"precast"))){m.glow.scale.setScalar(.001);}
  else if(u.cast){m.glow.material.color.setHex((SCH_FX[META[u.cast.id].school]||SCH_FX.arcane).c0);m.glow.scale.setScalar(.45*(1+.3*Math.sin(now*14)));m.glow.quaternion.copy(camera.quaternion);
    if(m.spellBone){m.g.updateMatrixWorld(true);m.spellBone.getWorldPosition(m.glow.position);if(m.g.visible)emitCastHands(u,dt);}else m.glow.position.set(u.pos.x+.5,u.y+1.1,u.pos.z);}
}
/* камера как в WoW: точка вращения у головы, зум колесом с плавным подлётом, стены и колонны подталкивают камеру к персонажу,
   вплотную вид от первого лица. Персонаж стоит ниже центра экрана, чтобы впереди было видно больше. Сама за спину не доворачивается */
let camCur=15,camFP=false;
/* ворота Награнда: ровная стена для камеры вместо ступенек от решётки */
const gateAt=(x,z)=>Math.abs(x)<9.5&&(z<-72.6||z>72.1);
function camHit(px,py,pz,dx,dy,dz,d){
  let t=d;
  if(MAP){for(let s=.25;s<d;s+=.25){const x=px+dx*s,y=py+dy*s,z=pz+dz*s,k=MAPI(x,z);if(k<0)return s;
      if(y<MAP.block[k]+.3||(MAP.sdf[k]>0&&y>MAP.ceil[k]-.3)||gateAt(x,z))return s;}return t}
  /* колонны: вертикальные цилиндры высотой 11 м */
  for(const pl of PILLARS){const ox=px-pl.x,oz=pz-pl.z,R=pl.r+.45,a=dx*dx+dz*dz;if(a<1e-6)continue;const b=ox*dx+oz*dz,c=ox*ox+oz*oz-R*R;
    if(c<0)continue;const disc=b*b-a*c;if(disc<0)continue;const s=(-b-Math.sqrt(disc))/a;if(s>0&&s<t&&py+dy*s<11.5)t=s;}
  /* стена арены изнутри */
  {const a=dx*dx+dz*dz,b=px*dx+pz*dz,R=ARENA_R+.3,c=px*px+pz*pz-R*R;if(a>1e-6){const s=(-b+Math.sqrt(Math.max(0,b*b-a*c)))/a;if(s>0&&s<t&&py+dy*s<9)t=s;}}
  /* земля */
  if(dy<0){const s=(py-.3)/-dy;if(s<t)t=s;}
  return t;
}
function placeCamera(dt){
  {/* зум как в клиенте: шаг 1 ярд, камера едет 8.33 ярда/с */const dd=camDist-camCur,mv=8.33*(dt||.016);camCur=Math.abs(dd)<=mv?camDist:camCur+Math.sign(dd)*mv;}
  const p=player.pos,py=player.y+1.95;
  const dx=Math.sin(yaw)*Math.cos(pitch),dy=Math.sin(pitch),dz=Math.cos(yaw)*Math.cos(pitch);
  let d=camCur;const h=camHit(p.x,py,p.z,dx,dy,dz,d+.4);if(h<d+.4)d=Math.max(.2,h-.4);
  camFP=camCur<.9;player.model.g.visible=!camFP;
  if(camFP){camera.position.set(p.x,py,p.z);camera.lookAt(p.x-dx,py-dy,p.z-dz);return}
  camera.position.set(p.x+dx*d,py+dy*d,p.z+dz*d);
  /* как в клиенте: камера смотрит прямо на точку над головой персонажа, без сдвига вверх */
  camera.lookAt(p.x,py,p.z);
}
/* один шаг симуляции: ввод игрока, боты, движение, бой, снаряды, модели */
function step(dt,live,pbot){
  if(state==="fight"){if(pbot)pbot.update();else if(!SRV)playerInput(dt);for(const b of bots)b.update();}else{for(const u of units)u.moveDir.set(0,0);if(state==="countdown"&&live&&!SRV)playerInput(dt),player.moveDir.set(0,0);}
  for(const u of units)moveUnit(u,dt);
  for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++)if(units[i].alive&&units[j].alive)separate(units[i],units[j]);
  for(const u of units)collide(u.pos);
  for(const u of units)floorSnap(u);
  for(const u of units)updateUnit(u,dt);
  for(const u of units)if(u.spirit&&u.alive&&now>=u.spirit){u.spirit=0;u.hp=0;u.alive=false;u.cast=null;u.auras=u.auras.filter(a=>a.type==="dampen");log(u,"погибает");if(teamDead(u.team)&&state==="fight")endRound(foes(u)[0]||u);}
  updateZones();
  for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];tmp.set(p.t.pos.x,1.4+p.t.y,p.t.pos.z);const d=p.m.position.distanceTo(tmp);
    if(d<.6||!p.t.alive){scene.remove(p.m);projectiles.splice(i,1);p.done=true;if(p.t.alive){if(p.kind==="hammer")impactFx(p.t,"holy",false,true);fxSpell=p.vid||null;try{if(p.vid)m2Kit(p.t,p.vid,"impact",true);p.onHit();}finally{fxSpell=null}}continue}
    if(!p.m2)projFx(p,dt);p.m.position.addScaledVector(tmp.sub(p.m.position).normalize(),Math.min(d,p.speed*dt));}
  for(const u of units)updateModel(u,dt);
}
/* хост в свёрнутой вкладке: браузер не зовёт requestAnimationFrame, поэтому бой считает таймер из воркера (его не замедляют) */
let bgTick=null;try{bgTick=new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),33)"],{type:"text/javascript"})));
  bgTick.onmessage=()=>{if(!document.hidden||NET.role!=="host"||!player||state==="menu")return;const tNow=performance.now();if(tNow-last<25)return;
    const dt=Math.min(.05,(tNow-last)/1000);last=tNow;now+=dt;
    if(state==="countdown"&&countEnd-now<=0){state="fight";roundStart=now;prepEnd();$("#countdown").hidden=true;}
    step(dt,true);netHostTick();m2Update(dt);};}catch(e){}
let fpsN=0,fpsT=0;
function netInfoHud(tNow){fpsN++;if(tNow-fpsT<1000)return;const el=$("#netInfo");
  if(el){const on=!!NET.role&&state!=="menu";el.hidden=!on;
    if(on){const r=NET.role==="host"?netGuests().map(([,g])=>`${g.nick} ${g.rtt||"?"} мс`).join(" · "):`пинг ${NET.rtt||"?"} мс`;el.textContent=`FPS ${Math.round(fpsN*1000/(tNow-fpsT))} · ${r}`;}}
  fpsN=0;fpsT=tNow;}
function frame(){
  if(SRV)return;
  requestAnimationFrame(frame);
  const tNow=performance.now(),dt=Math.min(.05,(tNow-last)/1000);last=tNow;now+=dt;netInfoHud(tNow);if(PREV&&(state!=="menu"||$("#menu").hidden))PREV.m.g.visible=false;
  if(state==="countdown"){const left=countEnd-now;const cd=$("#countdown");cd.hidden=false;cd.textContent=left>0?Math.ceil(left):"В бой!";
    if(left<=0){state="fight";roundStart=now;prepEnd();setTimeout(()=>{$("#countdown").hidden=true},700);}}
  if(player&&(state==="fight"||state==="countdown"||state==="over")){
    if(NET.role==="client")netClientStep(dt);else step(dt,true);
    netHostTick();
    renderFrame(player,"p");if(enemy)renderFrame(enemy,"t");renderBar();renderTeams();renderPlates();
    placeCamera(dt);
  }else if(PREV&&!$("#menu").hidden)previewTick(dt);else{if(PREV)PREV.m.g.visible=false;const a=now*.06;camera.position.set(Math.sin(a)*30,14,Math.cos(a)*30);camera.lookAt(0,4,0);}
  for(let i=fxs.length-1;i>=0;i--){const f=fxs[i],k=(now-f.t0)/f.dur;if(k>=1){scene.remove(f.mesh);fxs.splice(i,1);continue}f.fn(k);}
  updateTexts();
  if(fbkT){const k=(now-fbkT)/1.1;const e=$("#pfbk");if(k>=1){e.style.opacity=0;fbkT=0;}else e.style.opacity=k<.6?1:1-(k-.6)/.4;}
  if(errT&&now>errT){$("#err").style.opacity=0;errT=0;}
  updatePfx(dt);m2Sync();m2Update(dt);
  if(settings.fxaa)renderFXAA();else renderer.render(scene,camera);
  if(player&&state!=="menu")renderPortraits();
}
requestAnimationFrame(frame);
/* сервер: бой 30 раз в секунду без отрисовки; новый раунд — когда все люди в комнате нажали «Готов» */
if(SRV){let st=performance.now();setInterval(()=>{const t=performance.now(),dt=Math.min(.05,(t-st)/1000);st=t;now+=dt;
    if(state==="countdown"&&countEnd-now<=0){state="fight";roundStart=now;prepEnd();}
    if(player&&(state==="fight"||state==="countdown"||state==="over")){step(dt,true);netHostTick();}
    const gs=netGuests();if(gs.length&&gs.every(([,g])=>g.ready&&g.cls)&&state!=="fight"&&state!=="countdown"&&netHumans().length<=2*netSize())startNetRound();},33);
  window.srvHost=code=>{NET.pub=SRVQ.get("pub")==="1";NET.code=code;NET.role="host";NET.peers={};return netOpen(code,"host").then(T=>{NET.tx=T;netWire();return true});};}
$("#btnLobby").onclick=()=>{$("#lobbyWin").hidden=false;try{renderNet();}catch(e){}};
$("#lobbyClose").onclick=()=>{$("#lobbyWin").hidden=true;renderMenu();};
$("#lobbyStart").onclick=()=>{$("#lobbyWin").hidden=true;$("#btnStart").click();};
/* версия игры: своя и актуальная на сервере (version.txt рядом со страницей) */
(function(){const me=document.getElementById("gverMe"),sv=document.getElementById("gverSrv");if(!me)return;me.textContent=APP_VER;
  const chk=()=>fetch("version.txt?"+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.text():Promise.reject()).then(v=>{v=v.trim();sv.textContent=v;document.getElementById("gver").classList.toggle("old",v!==APP_VER);if(v!==APP_VER)sv.textContent=v+" (обновите страницу: Ctrl+F5)";}).catch(()=>{sv.textContent="нет связи";});
  chk();setInterval(chk,120000);})();
</script>
