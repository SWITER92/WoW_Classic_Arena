S='/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/v4/'
def R(s,a,b,n=1):
    assert s.count(a)==n,(s.count(a),a); return s.replace(a,b)
p=open(S+'p2.js').read()
st=p.index('  warrior:{armor');en=p.index('    }},',st)+len('    }},\n')
p=p[:st]+'''  warrior:{armor:5000, name:"Воин", res:"rage", hp:4400, speed:7, maxRes:100, startRes:20, crit:5, dodge:5, rageFromDamageTaken:0.025, stanceRage:0, ap:1000,
    swing:{interval:2.4, dmg:[170,220], rage:12},
    abilities:{
      battle:{name:"Боевая стойка", cd:1},
      defensive:{name:"Защитная стойка", cd:1, taken:10, dealt:10},
      berserker:{name:"Стойка берсерка", cd:1, crit:3, taken:10},
      charge:{name:"Рывок", minRange:8, range:25, cd:15, rageGain:15, stun:1},
      intercept:{name:"Перехват", minRange:8, range:25, cd:30, cost:10, dmg:65, stun:3},
      mortal:{name:"Смертельный удар", range:5, cd:6, cost:30, bonus:160, healReduce:50, healDur:10},
      bloodthirst:{name:"Кровожадность", range:5, cd:6, cost:30, apPct:45, healHit:20, healCharges:5, healDur:8},
      shieldslam:{name:"Мощный удар щитом", range:5, cd:6, cost:20, dmg:[342,358], dispel:50},
      heroic:{name:"Удар героя", range:5, cost:15, bonus:157},
      cleave:{name:"Рассекающий удар", range:5, cost:20, bonus:50, targets:2},
      overpower:{name:"Превосходство", range:5, cd:5, cost:5, bonus:35, window:5},
      execute:{name:"Казнь", range:5, cost:15, base:600, perRage:15, hp:20},
      slam:{name:"Мощный удар", range:5, cast:1.5, cost:15, bonus:87},
      whirlwind:{name:"Вихрь", radius:8, cd:10, cost:25, targets:4},
      rend:{name:"Кровопускание", range:5, cost:10, total:147, dur:21},
      hamstring:{name:"Подрезать сухожилия", range:5, cost:10, dmg:45, slow:50, dur:15},
      sunder:{name:"Раскол брони", range:5, cost:15, armor:450, dur:30, stacks:5},
      thunderclap:{name:"Удар грома", radius:8, cd:4, cost:20, dmg:103, targets:4, slow:10, dur:30},
      revenge:{name:"Ответный удар", range:5, cd:5, cost:5, dmg:[81,99], window:5},
      pummel:{name:"Зуботычина", range:5, cd:10, cost:10, dmg:50, lockout:4},
      shieldbash:{name:"Удар щитом", range:5, cd:12, cost:10, dmg:45, lockout:6},
      disarm:{name:"Обезоруживание", range:5, cd:60, cost:20, dur:10, pct:60},
      shout:{name:"Устрашающий крик", radius:8, cd:180, cost:25, dur:8},
      demoshout:{name:"Деморализующий крик", radius:10, cost:10, ap:146, dur:30},
      battleshout:{name:"Боевой крик", radius:20, cost:10, ap:232, dur:120},
      howl:{name:"Пронзительный вой", radius:10, cost:10, slow:50, dur:6},
      concussion:{name:"Оглушающий удар", range:5, cd:45, cost:15, stun:5},
      zerkrage:{name:"Ярость берсерка", cd:30, dur:10, rage:0, rageTaken:100},
      bloodrage:{name:"Кровавая ярость", cd:60, rageGain:10, over:10, hpCost:338},
      sweeping:{name:"Размашистые удары", cd:30, cost:30, dur:20, charges:5},
      deathwish:{name:"Смертельное желание", cd:180, cost:10, dur:30, pct:20, armor:20},
      reckless:{name:"Безрассудство", cd:1800, dur:15, crit:100, taken:20},
      retaliation:{name:"Возмездие", cd:1800, dur:15, charges:30},
      shieldwall:{name:"Глухая оборона", cd:1800, dur:10, reduce:75},
      shieldblock:{name:"Блок щитом", cd:5, cost:10, dur:5, block:75, charges:1},
      laststand:{name:"Последний рубеж", cd:600, dur:20, pct:30}
    }},
'''+p[en:]
open(S+'p2.js','w').write(p)

s=open(S+'p3.js').read()
st=s.index('  /* воин: стойки */');en=s.index('  /* маг */')
s=s[:st]+r'''  /* воин: стойки */
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
'''+s[en:]
# стойки, ярость, общий откат
s=R(s,'u.res=Math.min(u.res,B.warrior.stanceRage+tv(u,"tactical"));','u.res=Math.min(u.res,B.warrior.stanceRage+tv(u,"tacticalMastery"));')
s=R(s,'const STANCE_NAME=','''/* сила атаки воина: базовая из класса плюс крики. Урон автоатаки в swing.dmg уже учитывает базовую силу атаки */
function apDelta(u){let d=0;for(const x of u.auras)if(x.until>now&&(x.type==="bshout"||x.type==="demo"))d+=x.type==="bshout"?x.ap:-x.ap;return d}
function apOf(u){return (B[u.cls].ap||0)+apDelta(u)}
function swingDmg(u){const sw=B[u.cls].swing;return Math.max(1,roll(sw.dmg)+apDelta(u)/14*sw.interval)}
/* урон оружия для приёмов; нормализованные (Смертельный удар, Превосходство, Вихрь) считают силу атаки по скорости 3,3 */
function wpn(u,norm){const sw=B[u.cls].swing;return swingDmg(u)+(norm?(B[u.cls].ap||0)/14*(3.3-sw.interval):0)}
function warShared(u,a){for(const k of ["reckless","shieldwall","retaliation"])u.cds[k]=Math.max(u.cds[k]||0,now+a.cd);}
const STANCE_NAME=''')
# BAR_ORDER и способность вершины
s=R(s,'''  warrior:["charge","intercept","cap","heroic","overpower","execute","rend","hamstring","pummel","shieldbash","disarm","shout",
           "battle","defensive","berserker","zerkrage","reckless","shieldwall","bloodrage","trinket","food"],''','''  warrior:["charge","intercept","cap","heroic","overpower","execute","rend","hamstring","pummel","shieldbash","disarm","shout",
           "cleave","slam","whirlwind","sunder","thunderclap","revenge","demoshout","battleshout","shieldblock",
           "battle","defensive","berserker","zerkrage","reckless","retaliation","shieldwall","bloodrage","trinket","food"],''')
s=R(s,'if(id==="cap"){if(u.cls==="warrior"){const s=strikeId(u);if(s)l.push(s);}else for(const [t,c] of CAPS[u.cls])if(rk(u,t))l.push(c);}','if(id==="cap"){for(const [t,c] of CAPS[u.cls])if(rk(u,t))l.push(c);}')
s=R(s,'function strikeId(u){return rk(u,"tMortal")?"mortal":rk(u,"tBloodthirst")?"bloodthirst":rk(u,"tShieldSlam")?"shieldslam":null}','function strikeId(u){return rk(u,"mortalStrike")?"mortal":rk(u,"bloodthirst")?"bloodthirst":rk(u,"shieldSlam")?"shieldslam":null}')
s=R(s,'const CAPS={mage:','const CAPS={warrior:[],mage:')
# eff
s=R(s,'''    case "heroic":a.cost=Math.max(0,a.cost-tv(u,"impHeroic"));break;
    case "charge":a.rageGain+=tv(u,"impCharge");break;
    case "pummel":a.cd-=tv(u,"impPummel");break;
    case "shieldwall":a.dur+=tv(u,"impShieldWall");a.cd-=tv(u,"unbreak");break;
''','''    case "rend":a.total*=1+tv(u,"improvedRend")/100;break;
    case "cleave":a.bonus*=1+tv(u,"improvedCleave")/100;break;
    case "shieldblock":if(rk(u,"improvedShieldBlock"))a.charges+=1;break;
    case "demoshout":a.ap*=1+tv(u,"improvedDemoralizingShout")/100;a.dur*=1+tv(u,"boomingVoice")/100;a.radius*=1+tv(u,"boomingVoice")/100;break;
    case "battleshout":a.ap*=1+tv(u,"improvedBattleShout")/100;a.dur*=1+tv(u,"boomingVoice")/100;a.radius*=1+tv(u,"boomingVoice")/100;break;
''')
# usability
s=R(s,'  if(id==="overpower"&&now>=u.opUntil)return "Цель не уклонялась";','  if(id==="overpower"&&now>=u.opUntil)return "Цель не уклонялась";\n  if(id==="revenge"&&now>=(u.revUntil||0))return "Сначала нужно заблокировать, уклониться или парировать";')
# maxHp: Стойкость теперь броня
s=R(s,'this.maxHp=Math.round(c.hp*(1+(tv(this,"toughness")+tv(this,"arcaneFort")+this.K.hp)/100));','this.maxHp=Math.round(c.hp*(1+(tv(this,"arcaneFort")+this.K.hp)/100));')
s=R(s,'this.opUntil=0;this.ohNext=false;','this.opUntil=0;this.revUntil=0;this.lsAmt=0;this.ohNext=false;')
s=R(s,'return m*(1-tv(u,"hardened")/100)}','return m}')
s=R(s,'function armorOf(t,src){const ex=aura(t,"expose"),inf=aura(t,"innerfire"),ins=aura(t,"inspire");return Math.max(0,(B[t.cls].armor||0)*(1+tv(t,"pTough")/100+(ins?ins.pct/100:0))+(inf?inf.armor:0)+devArmor(t)-(ex?ex.amount:0)-(src?rk(src,"serrated")*187:0))}',
 'function armorOf(t,src){const ex=aura(t,"expose"),inf=aura(t,"innerfire"),ins=aura(t,"inspire"),su=aura(t,"sunder"),dw=aura(t,"dwish");return Math.max(0,((B[t.cls].armor||0)*(1+(tv(t,"pTough")+tv(t,"toughness"))/100+(ins?ins.pct/100:0))+(inf?inf.armor:0)+devArmor(t))*(dw?1-dw.armor/100:1)-(ex?ex.amount:0)-(su?su.stacks*su.armor:0)-(src?rk(src,"serrated")*187:0))}')
s=R(s,'return (B.general.parry[t.cls]||0)+tv(t,"rDeflection")+tv(t,"pDeflect")}','return (B.general.parry[t.cls]||0)+tv(t,"rDeflection")+tv(t,"pDeflect")+tv(t,"deflection")}')
s=R(s,'+tv(t,"anticip")*.04}','+(tv(t,"anticip")+tv(t,"anticipation"))*.04}')
# cc: Железная воля — шанс сопротивления оглушению
s=R(s,'  if(type==="stun")dur*=1-tv(t,"ironWill")/100;','  if(type==="stun"&&rk(t,"ironWill")&&Math.random()*100<tv(t,"ironWill")){statusText(t,"Сопротивление","#cfd6df");logRaw(`${t.name} сопротивляется: ${name}`);return false}')
s=R(s,'  if(type==="fear"&&has(t,"reckless")){','  if(type==="fear"&&(has(t,"reckless")||has(t,"dwish"))){')
# dmgMult
s=R(s,'''  if(s.cls==="warrior"){if(o.melee)m*=1+(tv(s,"twoHand")+tv(s,"oneHand"))/100;if(o.auto)m*=1+tv(s,"dualWield")/100;
    const en=aura(s,"enrage");if(en)m*=1+en.pct/100;if(rk(s,"deathWish")&&s.hp<s.maxHp*.35)m*=1+tv(s,"deathWish")/100;''','''  if(s.cls==="warrior"){if(o.melee||o.auto)m*=1+(tv(s,"twoHandedWeaponSpecialization")+tv(s,"oneHandedWeaponSpecialization"))/100;
    const en=aura(s,"enrage");if(en&&(o.melee||o.auto))m*=1+en.pct/100;const dw=aura(s,"dwish");if(dw&&school==="phys")m*=1+dw.pct/100;''')
s=R(s,'c+=tv(s,"axeSpec")+tv(s,"cruelty");if(s.stance','if(o.id==="overpower")c+=tv(s,"improvedOverpower");if(s.stance')
s=R(s,'return B.general.meleeCritMult+(tv(s,"impale")+s.K.critMult','return B.general.meleeCritMult+((o.ability&&s.cls==="warrior"?tv(s,"impale"):0)+s.K.critMult')
# damage(): Размашистые удары, блок щитом, отражение
s=R(s,'''  if(!o.echo&&(o.melee||o.auto)&&!o.dot&&has(src,"bflurry")){const r=damage(src,t,base,name,school,{...o,echo:1}),lh=src.lastHit;
    const t2=foes(src).find(e=>e!==t&&e.alive&&!stealthed(e)&&dist(src,e)<=B.general.meleeRange+2);
    if(t2&&!lh.dodged)damage(src,t2,base,name,school,{...o,echo:1,noProc:true});src.lastHit=lh;return r}''','''  const swp=!o.echo&&(o.melee||o.auto)&&!o.dot&&aura(src,"sweep");
  if(!o.echo&&(o.melee||o.auto)&&!o.dot&&(swp||has(src,"bflurry"))){const r=damage(src,t,base,name,school,{...o,echo:1}),lh=src.lastHit;
    const t2=foes(src).find(e=>e!==t&&e.alive&&!stealthed(e)&&dist(src,e)<=B.general.meleeRange+2);
    if(t2&&!lh.dodged){damage(src,t2,base,name,school,{...o,echo:1,noProc:true});if(swp&&--swp.charges<=0)swp.until=0;}src.lastHit=lh;return r}''')
s=R(s,'''    sfx("parry",t,{vol:.7});if(rk(t,"tRiposte"))''','''    sfx("parry",t,{vol:.7});if(t.cls==="warrior")t.revUntil=now+B.warrior.abilities.revenge.window;if(rk(t,"tRiposte"))''')
s=R(s,'''    if(src.cls==="warrior")src.opUntil=now+B.warrior.abilities.overpower.window;''','''    if(src.cls==="warrior")src.opUntil=now+B.warrior.abilities.overpower.window;if(t.cls==="warrior")t.revUntil=now+B.warrior.abilities.revenge.window;''')
s=R(s,'''  const hs=aura(t,"holyshield"),rd=aura(t,"redoubt");
  if((o.melee||o.auto)&&!o.noBlock&&Math.random()*100<tv(t,"shieldSpec")+t.K.block+(hs?hs.pct:0)+(rd?rd.pct:0)){blocked=true;amt*=1-B.general.blockReduce/100;if(rd&&--rd.charges<=0)rd.until=0;}
  if(school==="phys"){amt*=1-tv(t,"deflection")/100;for''','''  const hs=aura(t,"holyshield"),rd=aura(t,"redoubt"),sbk=aura(t,"sblock");
  if((o.melee||o.auto)&&!o.noBlock&&Math.random()*100<tv(t,"shieldSpecialization")+t.K.block+(hs?hs.pct:0)+(rd?rd.pct:0)+(sbk?sbk.pct:0)){blocked=true;amt*=1-B.general.blockReduce/100;if(rd&&--rd.charges<=0)rd.until=0;if(sbk&&--sbk.charges<=0)sbk.until=0;if(t.cls==="warrior")t.revUntil=now+B.warrior.abilities.revenge.window;}
  if(school==="phys"){for''')
s=R(s,'if(t.cls==="warrior")t.res=Math.min(t.maxRes,t.res+amt*B.warrior.rageFromDamageTaken);','if(t.cls==="warrior"){const zk=aura(t,"zerk");t.res=Math.min(t.maxRes,t.res+amt*B.warrior.rageFromDamageTaken*(zk?1+zk.rt/100:1));}')
s=R(s,'''      if(src.cls==="warrior"&&(o.melee||o.auto)){if(rk(src,"deepWounds"))addDot(t,src,"Глубокие раны",(amt+absorbed)*tv(src,"deepWounds")/100,6,"phys");''','''      if(src.cls==="warrior"&&(o.melee||o.auto)){if(rk(src,"deepWounds")){const w=B.warrior.swing.dmg;addDot(t,src,"Глубокие раны",(w[0]+w[1])/2*tv(src,"deepWounds")/100,12,"phys");}''')
s=R(s,'if(rk(t,"enrage"))addAura(t,{type:"enrage",name:"Исступление",pct:tv(t,"enrage"),until:now+8,good:true});','if(rk(t,"enrage"))addAura(t,{type:"enrage",name:"Исступление",pct:tv(t,"enrage"),until:now+12,good:true});')
s=R(s,'''  if(rk(t,"lastStand")&&!t.lastStandUsed&&t.hp<t.maxHp*.2){t.lastStandUsed=true;heal(t,t.maxHp*tv(t,"lastStand")/100,"Последний рубеж");logRaw(`<b>${t.name}</b>: Последний рубеж`);}
  if(blocked&&rk(t,"revenge")&&src.alive)damage(t,src,tv(t,"revenge"),"Ответный удар","phys",{noCrit:true,noProc:true});
''','''  if((o.melee||o.auto)&&!o.dot&&amt>0&&src.alive&&src!==t){const bt=aura(src,"btheal");if(bt){heal(src,bt.per,bt.name);if(--bt.charges<=0)bt.until=0;}
    const rt=aura(t,"retal");if(rt&&!o.retal&&inFront(t,src)&&dist(t,src)<=B.general.meleeRange+B.general.reach&&!incap(t)){if(--rt.charges<=0)rt.until=0;const tt=t;setTimeout(()=>{if(tt.alive&&src.alive)damage(tt,src,swingDmg(tt),rt.name,"phys",{melee:true,retal:true,noProc:true});},120);}}
''')
# тики: Последний рубеж, Управление гневом
s=R(s,'''  if(u.cls==="warrior"&&state==="fight"){if(ooc&&!u.charging)u.res=Math.max(0,u.res-G.rageDecay*dt);else u.res=Math.min(u.maxRes,u.res+tv(u,"angerMgmt")*dt);}''','''  if(u.cls==="warrior"&&state==="fight"){if(ooc&&!u.charging)u.res=Math.max(0,u.res-G.rageDecay*dt*(1-tv(u,"angerManagement")/100));else if(rk(u,"angerManagement"))u.res=Math.min(u.maxRes,u.res+dt/3);
    if(u.lsAmt&&!has(u,"laststand")){u.maxHp-=u.lsAmt;u.lsAmt=0;u.hp=Math.max(1,Math.min(u.hp,u.maxHp));}}''')
# автоатака
s=R(s,'      if(fl){iv*=1-tv(u,"flurry")/100;if(--fl.charges<=0)fl.until=0;}','      if(fl){iv/=1+tv(u,"flurry")/100;if(--fl.charges<=0)fl.until=0;}const tcl=aura(u,"tclap");if(tcl)iv*=1+tcl.pct/100;')
s=R(s,'''      if(hq&&u.res>=hq.cost){u.res-=hq.cost;hq.until=0;damage(u,t,roll(sw.dmg)+hq.bonus,hq.name,"phys",{melee:true,id:"heroic"});
        if(t.alive&&rk(u,"concussion")&&now>=(u.concAt||0)&&!u.lastHit.dodged){u.concAt=now+tv(u,"concussion");cc(u,t,"stun",1.5,"Оглушающий удар",{drc:"rstun"});}}
      else{if(u.cls==="warrior")u.res=Math.min(u.maxRes,u.res+sw.rage+tv(u,"unbridled"));
        const cr=u.cls==="paladin"&&aura(u,"seal");damage(u,t,cr&&cr.kind==="Cr"?roll(sw.dmg)/(1+cr.haste/100)+cr.ap:roll(sw.dmg),"Автоатака","phys",{auto:true});}''','''      if(hq&&u.res>=hq.cost){u.res-=hq.cost;hq.until=0;damage(u,t,swingDmg(u)+hq.bonus,hq.name,"phys",{melee:true,id:hq.id,ability:true});
        if(hq.targets>1){const lh=u.lastHit;for(const e of foes(u).filter(e=>e!==t&&e.alive&&!stealthed(e)&&dist(u,e)<=B.general.meleeRange+2).slice(0,hq.targets-1))damage(u,e,swingDmg(u)+hq.bonus,hq.name,"phys",{melee:true,id:hq.id,ability:true,echo:1});u.lastHit=lh;}}
      else{if(u.cls==="warrior")u.res=Math.min(u.maxRes,u.res+sw.rage+(Math.random()*100<tv(u,"unbridledWrath")?1:0));
        const cr=u.cls==="paladin"&&aura(u,"seal");damage(u,t,cr&&cr.kind==="Cr"?swingDmg(u)/(1+cr.haste/100)+cr.ap:swingDmg(u),"Автоатака","phys",{auto:true});}''')
s=R(s,'''      if(t.alive&&hit&&(u.cls!=="rogue"||u.ohNext)&&Math.random()*100<tv(u,"swordSpec"))''','''      if(t.alive&&hit&&u.cls==="warrior"&&Math.random()*100<tv(u,"maceSpecialization"))cc(u,t,"stun",3,"Специализация на дробящем оружии",{drc:"rstun"});
      if(t.alive&&hit&&(u.cls!=="rogue"||u.ohNext)&&Math.random()*100<tv(u,"swordSpec")+tv(u,"swordSpecialization"))''')
# перехват наносит урон при касании
open(S+'p3.js','w').write(s)
print('ok')
