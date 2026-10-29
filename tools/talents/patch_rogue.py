S='/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/'
p=S+'v4/p3.js';s=open(p).read()
def R(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a)
    s=s.replace(a,b)
# bar
R('"stealth","blind","vanish","evasion","sprint","cap","trinket","food"]','"stealth","blind","vanish","evasion","sprint","cap","trinket","food"]')
# eff
R('    case "fireblast":a.cd-=tv(u,"impFireBlast");break;\n','''    case "fireblast":a.cd-=tv(u,"impFireBlast");break;
    case "sprint":case "evasion":a.cd-=tv(u,"endurance");break;
    case "vanish":case "blind":a.cd-=tv(u,"elusiveness");break;
    case "stealth":a.cd-=rk(u,"camouflage");break;
    case "cheapshot":case "garrote":a.cost-=tv(u,"dirtyDeeds");break;
''')
# relentless
R('function spendCp(u){const c=u.cp||0;u.cp=0;','function spendCp(u){const c=u.cp||0;u.cp=0;if(c&&rk(u,"relentless")&&Math.random()*100<tv(u,"relentless")*c)u.res=Math.min(u.maxRes,u.res+25);')
R('function addCp(u,n){u.cp=Math.min(5,(u.cp||0)+n);}','''function addCp(u,n){u.cp=Math.min(5,(u.cp||0)+n);}
/* приём серии за попадание; Печать судьбы даёт второй при крите */
function cpBuild(u){if(!u.lastHit.dodged){addCp(u,1);if(u.lastHit.crit&&Math.random()*100<tv(u,"sealFate"))addCp(u,1);}}''')
# vile poisons
R('per:p.total/p.dur*st,stacks:st','per:p.total*(1+tv(u,"vilePoisons")/100)/p.dur*st,stacks:st')
# heightened + setup on resist
R('if(Math.random()*100>=Math.max(0,B.general.spellMiss-spellHitBonus(src,school)))return false;','if(Math.random()*100>=Math.max(0,B.general.spellMiss-spellHitBonus(src,school)+tv(t,"heightened")))return false;\n  if(rk(t,"setup")&&Math.random()*100<tv(t,"setup"))addCp(t,1);')
# dmgMult
R('''    const ap=aura(s,"apower");if(ap)m*=1+ap.pct/100;}''','''    const ap=aura(s,"apower");if(ap)m*=1+ap.pct/100;}
  else if(s.cls==="rogue"){if(o.id==="sinister"||o.id==="eviscerate")m*=1+tv(s,"aggression")/100;if(o.id==="backstab"||o.id==="garrote"||o.id==="ambush")m*=1+tv(s,"opportunity")/100;
    if(o.id==="rupture")m*=1+tv(s,"serrated")/100;if(school==="phys")m*=1+rk(s,"serrated")/100;if(o.auto&&s.ohNext)m*=1+tv(s,"dwSpec")/100;}''')
# crit
R('  if(o.ability&&has(s,"coldblood"))c=100;','''  else if(s.cls==="rogue"){if(o.id==="backstab")c+=tv(s,"impBackstab");if(o.id==="ambush")c+=tv(s,"impAmbush");if(o.id==="backstab"||o.id==="ambush"||(o.auto&&s.ohNext))c+=tv(s,"daggerSpec");}
  if((o.melee||o.auto)&&t)c-=tv(t,"sleight");
  if(o.ability&&has(s,"coldblood"))c=100;''')
R('if(o.melee||o.auto)return B.general.meleeCritMult+(tv(s,"impale")+s.K.critMult)/100;','if(o.melee||o.auto)return B.general.meleeCritMult+(tv(s,"impale")+s.K.critMult+(["sinister","gouge","backstab","ghostly","hemo"].includes(o.id)?tv(s,"lethality"):0))/100;')
# dodge with ghostly
R('function dodgeChance(t){const ev=aura(t,"evasion");return (B[t.cls].dodge||0)+t.K.dodge+(ev?ev.pct:0)}','''function dodgeChance(t){const ev=aura(t,"evasion"),gs=aura(t,"ghostly");return (B[t.cls].dodge||0)+t.K.dodge+(ev?ev.pct:0)+(gs?gs.pct:0)}
/* промах и парирование в ближнем бою: базово 5% промаха, парируют воин, разбойник и паладин, только спереди и с оружием в руках */
function meleeHit(s){return tv(s,"rPrecision")+tv(s,"weaponExp")}
function parryChance(t){if(has(t,"disarm"))return 0;return (B.general.parry[t.cls]||0)+tv(t,"rDeflection")}''')
# damage: flurry wrapper + miss/parry
R('''function damage(src,t,base,name,school,o){
  o=o||{};src.lastHit={};''','''function damage(src,t,base,name,school,o){
  o=o||{};
  if(!o.echo&&(o.melee||o.auto)&&!o.dot&&has(src,"bflurry")){const r=damage(src,t,base,name,school,{...o,echo:1}),lh=src.lastHit;
    const t2=foes(src).find(e=>e!==t&&e.alive&&!stealthed(e)&&dist(src,e)<=B.general.meleeRange+2);
    if(t2&&!lh.dodged)damage(src,t2,base,name,school,{...o,echo:1,noProc:true});src.lastHit=lh;return r}
  src.lastHit={};''')
R('''  if((o.melee||o.auto)&&!o.dot&&!o.noDodge&&Math.random()*100<dodgeChance(t)){''','''  if((o.melee||o.auto)&&!o.dot&&!o.noDodge&&Math.random()*100<B.general.meleeMiss-meleeHit(src)){src.lastHit={dodged:true,missed:true};combatMiss(src,t,"Промах");logRaw(`<b>${src.name}</b>: ${name} — промах`);return 0}
  if((o.melee||o.auto)&&!o.dot&&!o.noDodge&&!incap(t)&&inFront(t,src)&&Math.random()*100<parryChance(t)){src.lastHit={dodged:true,parried:true};combatMiss(src,t,"Парирование");logRaw(`<b>${src.name}</b>: ${name} — ${t.name} парирует`);
    sfx("parry",t,{vol:.7});if(rk(t,"tRiposte"))t.opUntil=now+ab("rogue","riposte").window;return 0}
  if((o.melee||o.auto)&&!o.dot&&!o.noDodge&&!incap(t)&&Math.random()*100<dodgeChance(t)-tv(src,"weaponExp")){''')
R('''  if(school==="fire"){const fv=aura(t,"firevuln");if(fv)amt*=1+fv.pct/100;}''','''  if(school==="fire"){const fv=aura(t,"firevuln");if(fv)amt*=1+fv.pct/100;}
  {const ks=t.auras.find(x=>x.ikPct&&x.until>now);if(ks)amt*=1+ks.ikPct/100;}
  if(school==="phys"&&!o.dot){const hm=aura(t,"hemo");if(hm){amt+=hm.bonus;if(--hm.charges<=0)hm.until=0;}}''')
# swing haste + sword spec main hand
R('      const sl=aura(u,"slice");if(sl)iv/=1+sl.pct/100;','      const sl=aura(u,"slice");if(sl)iv/=1+sl.pct/100;const bf=aura(u,"bflurry");if(bf)iv/=1+bf.pct/100;')
R('      if(t.alive&&Math.random()*100<tv(u,"swordSpec"))','      if(t.alive&&hit&&(u.cls!=="rogue"||u.ohNext)&&Math.random()*100<tv(u,"swordSpec"))')
# canUse riposte
R('  if(id==="overpower"&&now>=u.opUntil)return "Цель не уклонялась";','  if(id==="overpower"&&now>=u.opUntil)return "Цель не уклонялась";\n  if(id==="riposte"&&now>=u.opUntil)return "Сначала нужно парировать удар";')
# stealth detection, speed
R('const G=B.general.stealth,d=dist(o,s);return d<G.back||(d<G.front&&inFront(o,s))}','const G=B.general.stealth,d=dist(o,s),k=1-tv(s,"masterDec")/100;return d<G.back*k||(d<G.front*k&&inFront(o,s))}')
R('if(stealthed(u))sp*=1-B.general.stealth.speed/100;','if(stealthed(u))sp*=1-(B.general.stealth.speed-tv(u,"camouflage"))/100;')
# META changes
R('''    exec(u,t,a){swingFx(u,"kick");cc(u,t,"incap",a.dur,a.name,{noCombat:true});}},''','''    exec(u,t,a){swingFx(u,"kick");cc(u,t,"incap",a.dur,a.name,{noCombat:true});
      if(Math.random()*100<tv(u,"impSap")){if(!stealthed(u))addAura(u,{type:"stealth",name:ab("rogue","stealth").name,until:Infinity,good:true});}else breakStealth(u);}},''')
R('''    exec(u,t,a){swingFx(u,"kick");if(cc(u,t,"stun",a.stun,a.name))addCp(u,a.cp);}},''','''    exec(u,t,a){swingFx(u,"kick");if(cc(u,t,"stun",a.stun,a.name)){addCp(u,a.cp);if(Math.random()*100<tv(u,"initiative"))addCp(u,1);}}},''')
R('''addDot(t,u,a.name,a.total*dmgMult(u,"phys",{id:"garrote"}),a.dur,"phys");addCp(u,1);''','''addDot(t,u,a.name,a.total*dmgMult(u,"phys",{id:"garrote"}),a.dur,"phys");addCp(u,1);if(Math.random()*100<tv(u,"initiative"))addCp(u,1);''')
R('''{melee:true,id:"ambush",ability:true});if(!u.lastHit.dodged)addCp(u,1);rogueHit(u,t);}},''','''{melee:true,id:"ambush",ability:true});cpBuild(u);if(!u.lastHit.dodged&&Math.random()*100<tv(u,"initiative"))addCp(u,1);rogueHit(u,t);}},''')
R('''      if(!u.lastHit.dodged){addCp(u,1);if(u.lastHit.crit&&Math.random()*100<tv(u,"sealFate"))addCp(u,1);}rogueHit(u,t);}},''','''      cpBuild(u);rogueHit(u,t);}},''',2)
R('''    exec(u,t,a){const cp=spendCp(u);addAura(u,{type:"slice",name:a.name,pct:a.haste,until:now+a.base+a.perCp*cp,good:true});log(u,a.name);}},''','''    exec(u,t,a){const cp=spendCp(u);addAura(u,{type:"slice",name:a.name,pct:a.haste,until:now+(a.base+a.perCp*cp)*(1+tv(u,"impSlice")/100),good:true});log(u,a.name);}},''')
R('''    exec(u,t,a){swingFx(u,"kick");const cp=spendCp(u);cc(u,t,"stun",a.base+a.perCp*cp,a.name);}},''','''    exec(u,t,a){swingFx(u,"kick");const cp=spendCp(u);if(cc(u,t,"stun",a.base+a.perCp*cp,a.name)&&rk(u,"impKidney")){const x=t.auras.find(z=>z.type==="stun"&&z.name===a.name&&z.until>now);if(x)x.ikPct=tv(u,"impKidney");}}},''')
R('''      if(t.alive&&!u.lastHit.dodged){cc(u,t,"incap",a.dur,a.name);if(Math.random()*100<tv(u,"initiative"))addCp(u,1);}}},''','''      if(t.alive&&!u.lastHit.dodged)cc(u,t,"incap",a.dur,a.name);}},''')
R('''    exec(u,t,a){swingFx(u,"kick");interrupt(u,t,a);}},''','''    exec(u,t,a){swingFx(u,"kick");interrupt(u,t,a);if(t.alive&&!isImmune(t)&&Math.random()*100<tv(u,"impKick"))cc(u,t,"silence",2,"Пинок — немота");}},''')
R('''    desc:a=>`Скорость бега +${a.speed}% на ${a.dur} с. Снимает замедления и обездвиживание.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="root"&&x.type!=="slow");''','''    desc:a=>`Скорость бега +${a.speed}% на ${a.dur} с.`,
    exec(u,t,a){if(Math.random()*100<tv(u,"impSprint"))u.auras=u.auras.filter(x=>x.type!=="root"&&x.type!=="slow");''')
R('''    desc:a=>`Сбрасывает восстановление Исчезновения, Спринта, Ослепления и Ускользания.`,
    exec(u,t,a){for(const k of ["vanish","sprint","blind","evasion"])u.cds[k]=0;log(u,a.name);}},''','''    desc:a=>`Сбрасывает восстановление всех остальных способностей разбойника.`,
    exec(u,t,a){for(const k in u.cds)if(k!=="prep"&&k!=="trinket"&&k in B.rogue.abilities)u.cds[k]=0;log(u,a.name);}},
  riposte:{school:"phys",target:true,
    desc:a=>`Только после парирования, ${a.window} с. ${a.pct}% урона оружия и обезоруживание на ${a.disarm} с.`,
    exec(u,t,a){u.opUntil=0;swingFx(u,"special");damage(u,t,roll(B.rogue.swing.dmg)*a.pct/100,a.name,"phys",{melee:true,id:"riposte",ability:true});
      if(t.alive&&!u.lastHit.dodged&&!isImmune(t)){addAura(t,{type:"disarm",name:"Обезоружен",pct:B.warrior.abilities.disarm.pct,until:now+a.disarm,dt:"none"});statusText(t,"Обезоружен","#ffd100");}rogueHit(u,t);}},
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
    exec(u,t,a){addCp(u,a.cp);log(u,a.name);}},''')
R('"Ясность мысли":"clearcast",','"Ясность мысли":"clearcast","Обезоружен":"riposte","Пинок — немота":"kick",')
open(p,'w').write(s);print('ok')
