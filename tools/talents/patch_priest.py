S='/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/v4/'
def R(s,a,b,n=1):
    assert s.count(a)==n,(s.count(a),a); return s.replace(a,b)
p=open(S+'p2.js').read()
st=p.index('  priest:{armor');st=p.index('    abilities:{',st);en=p.index('    }},',st)+len('    }},\n')
p=p[:st]+'''    abilities:{
      swp:{name:"Слово Тьмы: Боль", range:30, cost:470, dmg:852, dur:18},
      mindblast:{name:"Взрыв разума", range:30, cast:1.5, cd:8, cost:350, dmg:[508,536]},
      flay:{name:"Пытка разума", range:20, channel:3, ticks:3, cost:205, dmg:[142,142], slow:50},
      manaburn:{name:"Сожжение маны", range:30, cast:3, cost:270, burn:[746,788], pct:50},
      smite:{name:"Кара", range:30, cast:2.5, cost:280, dmg:[384,428]},
      holyfire:{name:"Святой огонь", range:30, cast:3.5, cost:255, dmg:[355,449], dot:145, dotDur:10},
      pws:{name:"Слово силы: Щит", range:40, cd:4, cost:500, absorb:942, dur:30, ws:15},
      flash:{name:"Быстрое исцеление", range:40, cast:1.5, cost:380, heal:[828,974]},
      heal:{name:"Исцеление", range:40, cast:3, cost:305, heal:[734,826]},
      gheal:{name:"Великое исцеление", range:40, cast:3, cost:710, heal:[1966,2194]},
      renew:{name:"Обновление", range:40, cost:410, heal:970, dur:15},
      prayerheal:{name:"Молитва исцеления", cast:3, cost:1070, radius:30, heal:[1041,1099]},
      holynova:{name:"Кольцо света", cost:750, radius:10, dmg:[181,209], heal:[302,350]},
      scream:{name:"Ментальный крик", radius:8, cd:30, cost:210, dur:8},
      dispel:{name:"Рассеивание заклинаний", range:30, cost:258, count:2},
      innerfire:{name:"Внутренний огонь", cost:315, armor:1395, charges:20},
      fortitude:{name:"Слово силы: Стойкость", range:30, cost:1695, stamina:54},
      divinespirit:{name:"Божественный дух", range:30, cost:970, spirit:40},
      innerfocus:{name:"Внутреннее сосредоточение", cd:180, crit:25},
      pi:{name:"Придание сил", range:30, cd:180, cost:287, dur:15, dmg:20},
      silence:{name:"Безмолвие", range:20, cd:45, cost:225, dur:5},
      vampiric:{name:"Объятия вампира", range:30, cd:10, cost:40, dur:60, pct:20},
      shadowform:{name:"Облик Тьмы", cd:1.5, cost:574, dmg:15, reduce:15}
    }},
'''+p[en:]
open(S+'p2.js','w').write(p)

s=open(S+'p3.js').read()
s=R(s,'''  priest:["swp","mindblast","flay","smite","holyfire","manaburn","flash","gheal","renew","pws","scream","dispel",
          "silence","cap","innerfire","trinket","food"]''','''  priest:["swp","mindblast","flay","smite","holyfire","manaburn","flash","heal","gheal","renew","pws","scream",
          "dispel","silence","prayerheal","cap","fortitude","innerfire","trinket","food"]''')
s=R(s,'''if(id==="flay"){if(rk(u,"tMindFlay"))l.push(id);}''','''if(id==="flay"){if(rk(u,"mindFlay"))l.push(id);}''')
s=R(s,'''if(id==="silence"){if(rk(u,"tSilence"))l.push(id);}''','''if(id==="silence"){if(rk(u,"silence"))l.push(id);}''')
# eff: таланты жреца
s=R(s,'''    case "bop":a.cd-=tv(u,"guardFavor");break;\n''','''    case "bop":a.cd-=tv(u,"guardFavor");break;
    case "smite":case "holyfire":a.cast-=tv(u,"divineFury");a.range*=1+tv(u,"holyReach")/100;break;
    case "heal":case "gheal":a.cast-=tv(u,"divineFury");a.cost*=1-tv(u,"improvedHealing")/100;break;
    case "prayerheal":a.cost*=1-tv(u,"improvedPrayerOfHealing")/100;a.radius*=1+tv(u,"holyReach")/100;break;
    case "holynova":a.radius*=1+tv(u,"holyReach")/100;break;
    case "pws":a.absorb*=1+tv(u,"improvedPowerWordShield")/100;break;
    case "renew":a.heal*=1+tv(u,"improvedRenew")/100;break;
    case "fortitude":a.stamina*=1+tv(u,"improvedPowerWordFortitude")/100;break;
    case "innerfire":a.armor*=1+tv(u,"improvedInnerFire")/100;break;
    case "vampiric":a.pct+=tv(u,"improvedVampiricEmbrace");break;
''')
s=R(s,'''  if(u.K)for(const [aid,f,x] of u.K.add)if(aid===id&&typeof a[f]==="number")a[f]+=x;''','''  if(u.cls==="priest"){const sc=META[id]&&META[id].school;
    if(sc==="shadow"&&a.range)a.range*=1+tv(u,"shadowReach")/100;
    if(!a.cast&&!a.channel&&a.cost)a.cost*=1-tv(u,"mentalAgility")/100;
    if(a.cost&&has(u,"ifocus")&&id!=="innerfocus")a.cost=0;}
  if(u.K)for(const [aid,f,x] of u.K.add)if(aid===id&&typeof a[f]==="number")a[f]+=x;''')
# исцеление: Придание сил, Вдохновение на цель (броня), крит Внутреннего сосредоточения
s=R(s,'''  let amt=roll(a.heal)*(1+u.K.heal/100)*(blessOf(u,"kings")?1.03:1);const df=''','''  let amt=roll(a.heal)*(1+u.K.heal/100)*(blessOf(u,"kings")?1.03:1);{const pi=aura(u,"pi");if(pi)amt*=1+pi.pct/100;}const df=''')
s=R(s,'''    if(rk(u,"inspiration"))addAura(u,{type:"inspire",name:"Вдохновение",pct:tv(u,"inspiration"),until:now+10,good:true});}''','''    if(rk(u,"inspiration")&&f.alive)addAura(f,{type:"inspire",name:"Вдохновение",pct:tv(u,"inspiration"),until:now+15,good:true});}''')
s=R(s,'''  const ins=aura(t,"inspire");if(ins)amt*=1-ins.pct/100;\n''','')
s=R(s,'''function armorOf(t,src){const ex=aura(t,"expose");return Math.max(0,(B[t.cls].armor||0)*(1+tv(t,"pTough")/100)+devArmor(t)''','''function armorOf(t,src){const ex=aura(t,"expose"),inf=aura(t,"innerfire"),ins=aura(t,"inspire");return Math.max(0,(B[t.cls].armor||0)*(1+tv(t,"pTough")/100+(ins?ins.pct/100:0))+(inf?inf.armor:0)+devArmor(t)''')
# урон/крит
s=R(s,'''  const inf=aura(s,"innerfire");if(inf)m*=1+inf.dmg/100;\n''','''  if(s.cls==="priest"&&school!=="phys"){m*=1+tv(s,"forceOfWill")/100;if(o.id==="smite"||o.id==="holyfire")m*=1+tv(s,"searingLight")/100;}
''')
s=R(s,'''  else if(s.cls==="paladin"){if(school==="holy"&&o.spell)c+=tv(s,"holyPower");''','''  else if(s.cls==="priest"&&o.spell){if(school==="holy")c+=tv(s,"holySpecialization");if(t&&t.team!==s.team)c+=tv(s,"forceOfWill");if(s.ifNow)c+=ab("priest","innerfocus").crit;}
  else if(s.cls==="paladin"){if(school==="holy"&&o.spell)c+=tv(s,"holyPower");''')
s=R(s,'''function spellHitBonus(s,school){if(s.cls==="mage")''','''function spellHitBonus(s,school){if(s.cls==="priest"&&school==="shadow")return tv(s,"shadowFocus");if(s.cls==="mage")''')
# Внутреннее сосредоточение: тратится на первое заклинание с ценой
s=R(s,'''  if(!m.costOnHit)u.res-=(a.cost||0);''','''  if(u.cls==="priest"&&id!=="innerfocus"&&has(u,"ifocus")&&ab(u.cls,id).cost){u.auras=u.auras.filter(x=>x.type!=="ifocus");u.ifNow=true;}
  if(!m.costOnHit)u.res-=(a.cost||0);''')
s=R(s,'''  u.allyNow=null;
  if(u.isPlayer)flashBtn(id);''','''  u.allyNow=null;u.ifNow=false;
  if(u.isPlayer)flashBtn(id);''')
# Ослабленная душа
s=R(s,'''  if(m.needSeal&&!has(u,"seal"))return "Нет активной печати";''','''  if(m.needSeal&&!has(u,"seal"))return "Нет активной печати";
  if(id==="pws"&&has(ft,"ws"))return "Ослабленная душа: пока нельзя";''')
# пушбэк: Щит, Мученичество, Средоточие исцеления
s=R(s,'''function pushback(u){const c=u.cast,m=META[c.id],sc=m.school;if(sc==="phys")return;''','''function pushback(u){const c=u.cast,m=META[c.id],sc=m.school;if(sc==="phys")return;
  if(u.cls==="priest"&&(aura(u,"absorb")||has(u,"fcast")||(m.ally&&Math.random()*100<tv(u,"healingFocus"))))return;''')
# получаемый урон: Защита от заклинаний, Плетение Тьмы
s=R(s,'''  amt*=1-t.K.taken/100;\n''','''  amt*=1-t.K.taken/100;
  if(school!=="phys")amt*=1-tv(t,"spellWarding")/100;
  if(school==="shadow"){const sw=aura(t,"sweave");if(sw)amt*=1+.03*sw.stacks;}
''')
# Внутренний огонь: заряды тратятся от ударов ближнего боя
s=R(s,'''  if((o.melee||o.auto)&&!o.dot){const fa=aura(t,"frostarmor");''','''  if((o.melee||o.auto)&&!o.dot&&amt+absorbed>0){const inf=aura(t,"innerfire");if(inf&&--inf.charges<=0)inf.until=0;}
  if((o.melee||o.auto)&&!o.dot){const fa=aura(t,"frostarmor");''')
# Объятия вампира: урон Тьмой по проклятой цели лечит команду жреца
s=R(s,'''  if(school==="shadow"&&rk(src,"vampiric")&&amt>0)heal(src,amt*tv(src,"vampiric")/100,"Вампирские объятия");''','''  if(school==="shadow"&&amt>0){const ve=t.auras.find(x=>x.type==="ve"&&x.src===src&&x.until>now);if(ve)for(const f of units)if(f.alive&&f.team===src.team&&(f===src||dist(f,src)<=40))heal(f,amt*ve.pct/100,"Объятия вампира",false,src);}''')
# криты по жрецу: Мученичество, Благословенное восстановление
s=R(s,'''      if(rk(t,"redoubt"))addAura''','''      if((o.melee||o.auto)&&t.cls==="priest"){if(rk(t,"martyrdom")&&Math.random()*100<tv(t,"martyrdom"))addAura(t,{type:"fcast",name:"Сосредоточенное колдовство",until:now+6,good:true});
        if(rk(t,"blessedRecovery"))addAura(t,{type:"hot",name:"Благословенное восстановление",per:(amt+absorbed)*tv(t,"blessedRecovery")/100/6,next:now+1,until:now+6.05,good:true});}
      if(rk(t,"redoubt"))addAura''')
s=R(s,'''    if(school==="shadow"&&o.spell&&!o.dot&&o.id!=="flay"&&t.hp>0&&Math.random()*100<tv(src,"blackout"))cc(src,t,"stun",3,"Затмение",{drc:"rstun"});''','''    if(school==="shadow"&&o.spell&&!o.dot&&o.id!=="flay"&&t.hp>0&&Math.random()*100<tv(src,"blackout"))cc(src,t,"stun",3,"Затмение",{drc:"rstun"});
    if(school==="shadow"&&o.spell&&!o.dot&&t.hp>0&&Math.random()*100<tv(src,"shadowWeaving")){const ex=aura(t,"sweave"),st=ex?Math.min(5,ex.stacks+1):1;addAura(t,{type:"sweave",name:"Плетение Тьмы",stacks:st,until:now+15,dt:"magic"});}''')
s=R(s,'''  if(rk(t,"spiritRedemption")&&!t.srUsed&&t.hp<t.maxHp*.2){t.srUsed=true;heal(t,t.maxHp*tv(t,"spiritRedemption")/100,"Дух воздаяния");logRaw(`<b>${t.name}</b>: Дух воздаяния`);}\n''','')
# Несокрушимая воля: сопротивление оглушению и страху
s=R(s,'''  if(type==="stun")dur*=1-tv(t,"ironWill")/100;''','''  if((type==="stun"||type==="fear")&&rk(t,"unbreakableWill")&&Math.random()*100<tv(t,"unbreakableWill")){statusText(t,"Сопротивление","#cfd6df");logRaw(`${t.name} сопротивляется: ${name}`);return false}
  if(type==="stun")dur*=1-tv(t,"ironWill")/100;''')
# реген: Божественный дух (+40 духа ~ +5 маны/с)
s=R(s,'''  if(u.resType==="mana")u.res=Math.min(u.maxRes,u.res+B[u.cls].manaRegen*''','''  if(u.resType==="mana")u.res=Math.min(u.maxRes,u.res+(aura(u,"dspirit")?aura(u,"dspirit").regen*dt:0)+B[u.cls].manaRegen*''')
# способности
st=s.index('  swp:{school:"shadow",target:true,');en=s.index('};\nfunction pickDispel')
s=s[:st]+'''  swp:{school:"shadow",target:true,sfOk:true,
    desc:a=>`${Math.round(a.dmg*a.dur/18)} урона Тьмой за ${a.dur} с.`,
    exec(u,t,a){castFx(u);addDot(t,u,a.name,a.dmg*(a.dur/18)*dmgMult(u,"shadow",{id:"swp"}),a.dur,"shadow");if(t.alive&&Math.random()*100<tv(u,"shadowWeaving")){const ex=aura(t,"sweave"),st=ex?Math.min(5,ex.stacks+1):1;addAura(t,{type:"sweave",name:"Плетение Тьмы",stacks:st,until:now+15,dt:"magic"});}log(u,a.name,t);}},
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
'''+s[en:]
s=R(s,'''function forbear(u){''','''/* Слово силы: Стойкость: +10 здоровья за единицу выносливости */
function fortitude(u,f,a){const add=Math.round(a.stamina*10),ex=aura(f,"fort");if(ex){f.maxHp-=ex.hp;f.hp=Math.min(f.hp,f.maxHp);}
  addAura(f,{type:"fort",name:a.name,hp:add,until:Infinity,good:true});f.maxHp+=add;f.hp+=add;if(u!==f)log(u,a.name,f);}
function forbear(u){''')
open(S+'p3.js','w').write(s)
print('ok')
s=open(S+'p3.js').read()
s=R(s,'''    if(a.type==="hot"&&now>=a.next){a.next+=1;''','''    if(a.type==="hot"&&now>=a.next){a.next+=a.period||1;''')
s=R(s,'''  if(u.cls==="priest"){const a=B.priest.abilities.innerfire;addAura(u,{type:"innerfire",name:a.name,pct:a.reduce,dmg:a.dmg,until:Infinity,good:true,mb:true});}\n''','')
s=R(s,'''  for(const u of units)prepUnit(u);prepPaladins();''','''  for(const u of units)prepUnit(u);prepPaladins();prepPriests();''')
s=R(s,'''function prepPaladins(){''','''/* жрец перед боем: Внутренний огонь на себя, Стойкость (и Божественный дух с талантом) на себя и союзников */
function prepPriests(){for(const p of units)if(p.cls==="priest"){const a=eff(p,"innerfire");addAura(p,{type:"innerfire",name:a.name,armor:a.armor,charges:a.charges,until:Infinity,good:true,mb:true});
  for(const f of units)if(f.team===p.team&&!aura(f,"fort")){fortitude(p,f,eff(p,"fortitude"));if(rk(p,"divineSpirit")){const d=eff(p,"divinespirit");addAura(f,{type:"dspirit",name:d.name,regen:d.spirit/8,until:Infinity,good:true,mb:true});}}}}
function prepPaladins(){''')
# бот: Объятия вампира у тёмного жреца
s=R(s,'''    if(this.ready("pi"))tryUse(u,"pi");''','''    if(this.ready("pi"))tryUse(u,"pi");
    if(see&&d<=30&&!e.auras.some(x=>x.type==="ve"&&x.src===u)&&this.ready("vampiric")){tryUse(u,"vampiric");return}
    if(this.ready("innerfocus")&&u.res<u.maxRes*.6)tryUse(u,"innerfocus");''')
open(S+'p3.js','w').write(s)
print('ok2')
s=open(S+'p3.js').read();s=s.replace('["frostarmor","innerfire","shadowform"]','["frostarmor","shadowform"]');open(S+'p3.js','w').write(s)
