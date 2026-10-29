import sys
S='/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/v4/p3.js'
s=open(S).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('count %d != %d for: %s'%(n,cnt,a[:100]))
    s=s.replace(a,b)
# --- talents core: per-rank value arrays, prerequisites, saved builds cleanup
rep('function tv(u,id){const r=rk(u,id);if(!r)return 0;const d=talDef(u.cls,id);return d?r*d.v:0}',
    'const talVal=(d,r)=>!r?0:Array.isArray(d.v)?d.v[Math.min(r,d.v.length)-1]:r*d.v;\nfunction tv(u,id){const r=rk(u,id);if(!r)return 0;const d=talDef(u.cls,id);return d?talVal(d,r):0}')
rep('''  return totalPts(tal)<B.general.maxTalentPoints&&(tal[id]||0)<d.max&&treePts(cls,tal,tree)>=(d.t-1)*5}''',
    '''  return totalPts(tal)<B.general.maxTalentPoints&&(tal[id]||0)<d.max&&treePts(cls,tal,tree)>=(d.t-1)*5&&(!d.req||(tal[d.req]||0)>=d.reqr)}''')
rep('''function canRemove(cls,tal,id){if(!(tal[id]>0))return false;const c={...tal};c[id]--;return validTree(cls,c,treeOf(cls,id))}''',
    '''function canRemove(cls,tal,id){if(!(tal[id]>0))return false;const c={...tal};c[id]--;const L=B.talents[cls][treeOf(cls,id)].list;
  for(const j in L)if(L[j].req===id&&(c[j]||0)>0&&c[id]<L[j].reqr)return false;
  return validTree(cls,c,treeOf(cls,id))}
/* сохранённые раскладки старых версий: убираем исчезнувшие таланты, неверную ветку сбрасываем */
function cleanTal(cls,tal){const out={};for(const id in tal)if(talDef(cls,id)&&tal[id]>0)out[id]=Math.min(tal[id],talDef(cls,id).max);
  let n=0;for(const k in out)n+=out[k];if(n>B.general.maxTalentPoints)return {};
  for(const tk in B.talents[cls]){if(!validTree(cls,out,tk))return {};const L=B.talents[cls][tk].list;for(const id in L)if(out[id]&&L[id].req&&(out[L[id].req]||0)<L[id].reqr)return {};}
  return out}''')
rep('try{const s=JSON.parse(store.get("arena-talents-v1")||"null");if(s)for(const c of CLASSES)if(s[c])myTal[c]=s[c];}catch(e){}',
    'try{const s=JSON.parse(store.get("arena-talents-v1")||"null");if(s)for(const c of CLASSES)if(s[c])myTal[c]=cleanTal(c,s[c]);}catch(e){}')
# talent info text with per-rank arrays and prerequisite
rep('''  const cur=r?`<p>${d.d.replace("{x}",fmt(d.v*r))}</p>`:"";
  const nxt=r<d.max?`<p class="next">${r?"Следующий ранг: ":""}${d.d.replace("{x}",fmt(d.v*(r+1)))}</p>`:"";
  el.innerHTML=`<h4>${d.n}</h4><div class="meta">${tree.name} · ряд ${d.t} (нужно ${(d.t-1)*5} очк. в ветке) · ранг ${r}/${d.max}</div>${cur}${nxt}`;''',
'''  const cur=r?`<p>${d.d.replace("{x}",fmt(talVal(d,r)))}</p>`:"";
  const nxt=r<d.max?`<p class="next">${r?"Следующий ранг: ":""}${d.d.replace("{x}",fmt(talVal(d,r+1)))}</p>`:"";
  const rq=d.req?talDef(talCls,d.req):null,rqOk=!rq||(myTal[talCls][d.req]||0)>=d.reqr;
  el.innerHTML=`<h4>${d.n}</h4><div class="meta">${tree.name} · ряд ${d.t} (нужно ${(d.t-1)*5} очк. в ветке) · ранг ${r}/${d.max}</div>${rq?`<div class="meta" style="color:${rqOk?"#9f9":"#ff6a5a"}">Требуется: ${rq.n}${rq.max>1?` (${d.reqr} из ${rq.max})`:""}</div>`:""}${cur}${nxt}`;''')
# talent grid: prerequisite arrows
rep('''      const open=tp>=(d.t-1)*5;b.className="tal"+(open?" open":" lock")''','''      const open=tp>=(d.t-1)*5&&(!d.req||(tal[d.req]||0)>=d.reqr);b.className="tal"+(open?" open":" lock")''')
rep('''    sec.appendChild(grid);wrap.appendChild(sec);}''','''    for(const id in tree.list){const d=tree.list[id];if(!d.req)continue;const q=tree.list[d.req];if(!q)continue;const ok=(tal[d.req]||0)>=d.reqr;
      const ar=document.createElement("div");ar.className="tarrow"+(ok?" ok":"");
      if(q.t===d.t){ar.classList.add("h");ar.style.gridRow=d.t;ar.style.gridColumn=`${Math.min(q.c,d.c)} / ${Math.max(q.c,d.c)+1}`;}
      else{ar.style.gridRow=`${q.t} / ${d.t+1}`;ar.style.gridColumn=d.c;}
      grid.insertBefore(ar,grid.firstChild);}
    sec.appendChild(grid);wrap.appendChild(sec);}''')
# --- abilities bar
rep('''  mage:["frostbolt","fireball","fireblast","missiles","cone","nova","poly","counter","blink","explosion","cap","iceblock",
        "manashield","frostarmor","evocation","trinket","food"],''','''  mage:["frostbolt","fireball","fireblast","scorch","missiles","cone","nova","poly","counter","blink","explosion","cap",
        "flamestrike","blizzard","manashield","frostarmor","evocation","trinket","fireward","frostward","food"],''')
# eff(): mage talents
rep('''    case "frostbolt":a.cast=Math.max(.5,a.cast-tv(u,"impFrostbolt"));a.range*=1+tv(u,"arcticReach")/100;a.slow+=tv(u,"permafrost");a.slowDur+=rk(u,"permafrost");break;
    case "cone":a.slow+=tv(u,"permafrost");break;
    case "nova":a.cd-=tv(u,"impNova");a.radius*=1+tv(u,"arcticReach")/100;break;
    case "fireblast":a.cd-=tv(u,"impFireBlast");a.range+=tv(u,"flameThrowing");break;
    case "poly":a.cast=Math.max(.5,a.cast-tv(u,"impPoly"));break;
    case "blink":a.cd-=tv(u,"impBlink");break;''','''    case "frostbolt":a.cast=Math.max(.5,a.cast-tv(u,"impFrostbolt"));a.range*=1+tv(u,"arcticReach")/100;break;
    case "blizzard":a.range*=1+tv(u,"arcticReach")/100;break;
    case "cone":a.range*=1+tv(u,"arcticReach")/100;break;
    case "nova":a.cd-=tv(u,"impNova");a.radius*=1+tv(u,"arcticReach")/100;break;
    case "fireball":a.cast=Math.max(.5,a.cast-tv(u,"impFireball"));break;
    case "fireblast":a.cd-=tv(u,"impFireBlast");break;''')
rep('''  if(u.K)for(const [aid,f,x] of u.K.add)if(aid===id&&typeof a[f]==="number")a[f]+=x;''','''  if(u.cls==="mage"){const sc=META[id]&&META[id].school;
    if(sc==="fire"&&a.range)a.range+=tv(u,"flameThrowing");
    if(sc==="frost"&&a.cost)a.cost*=1-tv(u,"frostChanneling")/100;}
  if(u.K)for(const [aid,f,x] of u.K.add)if(aid===id&&typeof a[f]==="number")a[f]+=x;''')
# PoM is now an active ability
rep('const pomReady=u=>rk(u,"pom")&&now>=(u.pomAt||0);','const pomReady=u=>has(u,"pom");')
rep('''    if(pomReady(u)){u.pomAt=now+tv(u,"pom");statusText(u,"Присутствие разума","#d7b0ff");finish(u,id,t);return true}''',
    '''    if(pomReady(u)&&a.cast<10){u.auras=u.auras.filter(x=>x.type!=="pom");statusText(u,"Присутствие разума","#d7b0ff");finish(u,id,t);return true}''')
# chill helper (frostbite, permafrost) and spell resist helper
rep('function slowAura(src,t,name,pct,dur,dt){','''/* эффект охлаждения мага: Вечная мерзлота удлиняет и усиливает, Обморожение может заморозить */
function chill(src,t,name,pct,dur){if(!t.alive||isImmune(t))return;const pf=rk(src,"permafrost");if(pf){dur+=pf;pct+=[4,7,10][pf-1];}
  slowAura(src,t,name,pct,dur,"magic");if(Math.random()*100<tv(src,"frostbite"))cc(src,t,"root",5,"Обморожение");}
/* сопротивление заклинанию: базово 4% против игрока своего уровня, таланты на меткость снижают */
function spellHitBonus(s,school){if(s.cls==="mage")return school==="arcane"?tv(s,"arcaneFocus"):(school==="fire"||school==="frost")?tv(s,"elemPrecision"):0;return 0}
function spellResisted(src,t,school){
  if(school==="phys"||src===t||src.team===t.team)return false;
  if(Math.random()*100>=Math.max(0,B.general.spellMiss-spellHitBonus(src,school)))return false;
  src.lastHit={resisted:true};combatMiss(src,t,"Сопротивление");logRaw(`<b>${src.name}</b>: ${t.name} сопротивляется`);
  if(rk(t,"magicAbsorption")&&t.resType==="mana")t.res=Math.min(t.maxRes,t.res+t.maxRes*tv(t,"magicAbsorption")/100);
  return true}
function slowAura(src,t,name,pct,dur,dt){''')
# --- mage spells
rep('''      if(t.alive&&!isImmune(t)){slowAura(u,t,a.name,a.slow,a.slowDur,"magic");if(Math.random()*100<tv(u,"frostbite"))cc(u,t,"root",4,"Обморожение");}});}},''',
    '''      if(t.alive&&!u.lastHit.resisted&&!isImmune(t))chill(u,t,a.name,a.slow,a.slowDur);});}},''')
rep('''      if(t.alive)addDot(t,u,a.name,a.dot*dmgMult(u,"fire",{id:"fireball"}),a.dotDur,"fire");});}},''',
    '''      if(t.alive&&!u.lastHit.resisted)addDot(t,u,a.name,a.dot*dmgMult(u,"fire",{id:"fireball"}),a.dotDur,"fire");});}},''')
rep('''    exec(u,t,a){castFx(u);burstFx(t.pos,0xff8c3f);damage(u,t,roll(a.dmg),a.name,"fire",{spell:true,id:"fireblast",cost:a.cost});
      if(t.alive&&rk(u,"blastWave")&&!isImmune(t))slowAura(u,t,"Взрывная волна",tv(u,"blastWave"),3,"magic");}},''',
    '''    exec(u,t,a){castFx(u);burstFx(t.pos,0xff8c3f);damage(u,t,roll(a.dmg),a.name,"fire",{spell:true,id:"fireblast",cost:a.cost});}},''')
rep('''      for(const t of foes(u))if(dist(u,t)<=a.range&&inCone(u,t,Math.PI/3)){damage(u,t,roll(a.dmg),a.name,"frost",{spell:true,cost:a.cost});if(t.alive)slowAura(u,t,a.name,a.slow,a.dur,"magic");}}},''',
    '''      for(const t of foes(u))if(dist(u,t)<=a.range&&inCone(u,t,Math.PI/3)){damage(u,t,roll(a.dmg)*(1+tv(u,"impCone")/100),a.name,"frost",{spell:true,cost:a.cost});if(t.alive&&!u.lastHit.resisted)chill(u,t,a.name,a.slow,a.dur);}}},''')
rep('''for(const t of foes(u))if(dist(u,t)<=a.radius){damage(u,t,roll(a.dmg),a.name,"frost",{spell:true,cost:a.cost});if(t.alive)cc(u,t,"root",a.root,a.name);}}},''',
    '''for(const t of foes(u))if(dist(u,t)<=a.radius){damage(u,t,roll(a.dmg),a.name,"frost",{spell:true,cost:a.cost});if(t.alive&&!u.lastHit.resisted)cc(u,t,"root",a.root,a.name);}}},''')
rep('''    exec(u,t,a){castFx(u);burstFx(t.pos,0xc792ff);cc(u,t,"incap",a.dur,a.name);}},''',
    '''    exec(u,t,a){castFx(u);burstFx(t.pos,0xc792ff);if(!isImmune(t)&&spellResisted(u,t,"arcane"))return;cc(u,t,"incap",a.dur,a.name);}},''')
rep('''    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"frostarmor",name:a.name,pct:a.reduce,slow:a.slow,''',
    '''    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"frostarmor",name:a.name,pct:a.reduce*(1+tv(u,"frostWarding")/100),slow:a.slow,''')
rep('''addAura(u,{type:"manashield",name:a.name,amount:a.absorb,ratio:a.ratio,''','''addAura(u,{type:"manashield",name:a.name,amount:a.absorb,ratio:a.ratio*(1-tv(u,"impManaShield")/100),''')
rep('''    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"combust",name:a.name,charges:a.charges,pct:a.crit,until:now+60,good:true,mb:true});log(u,a.name);}},''',
    '''    exec(u,t,a){castFx(u,"castomni");addAura(u,{type:"combust",name:a.name,charges:a.charges,pct:a.crit,step:a.crit,until:Infinity,good:true,mb:true});log(u,a.name);}},''')
rep('''    desc:a=>`+${a.crit}% к шансу крита для следующих ${a.charges} огненных заклинаний.`,''',
    '''    desc:a=>`Каждое попадание огненным заклинанием повышает шанс крита огнём на ${a.crit}% (начиная с ${a.crit}%). После ${a.charges} критов эффект проходит.`,''')
rep('''  /* разбойник */
  stealth:''','''  pyroblast:{school:"fire",target:true,
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
  stealth:''')
# zones: school, id, position
rep('''function addZone(u,a){
  const m=new THREE.Mesh(tileGeo(FXT.rune),fxMat(0xffc040,.5));m.scale.setScalar(a.radius);
  m.rotation.x=-Math.PI/2;m.position.set(u.pos.x,GY(u.pos.x,u.pos.z)+.06,u.pos.z);scene.add(m);
  zones.push({x:u.pos.x,z:u.pos.z,r:a.radius,dps:a.dps,src:u,name:a.name,next:now+1,until:now+a.dur,mesh:m});''',
'''function addZone(u,a){const x=a.x??u.pos.x,z=a.z??u.pos.z;
  const m=new THREE.Mesh(tileGeo(FXT.rune),fxMat(a.color||0xffc040,.5));m.scale.setScalar(a.radius);
  m.rotation.x=-Math.PI/2;m.position.set(x,GY(x,z)+.06,z);scene.add(m);
  zones.push({x,z,r:a.radius,dps:a.dps,src:u,name:a.name,school:a.school||"holy",id:a.id||"consecration",next:now+1,until:now+a.dur,mesh:m});''')
rep('''for(const t of foes(z.src))if(Math.hypot(t.pos.x-z.x,t.pos.z-z.z)<=z.r)damage(z.src,t,z.dps,z.name,"holy",{spell:true,id:"consecration",noProc:true});}}''',
    '''for(const t of foes(z.src))if(Math.hypot(t.pos.x-z.x,t.pos.z-z.z)<=z.r)damage(z.src,t,z.dps,z.name,z.school||"holy",{spell:true,id:z.id||"consecration",noProc:true,noResist:true});}}''')
# dmgMult: Burning Soul no longer adds damage
rep('''m*=1+(tv(s,"instability")+tv(s,"burningSoul"))/100;''','''m*=1+tv(s,"instability")/100;''')
# critChance
rep('''  else if(s.cls==="mage"){c+=tv(s,"instability");if(school==="fire")c+=tv(s,"criticalMass");if(o.id==="fireblast")c+=tv(s,"incinerate");const cb=aura(s,"combust");if(cb&&school==="fire")c+=cb.pct;}''',
    '''  else if(s.cls==="mage"){c+=tv(s,"instability");if(school==="fire")c+=tv(s,"criticalMass");if(o.id==="fireblast"||o.id==="scorch")c+=tv(s,"incinerate");
    if(o.id==="explosion")c+=tv(s,"impExplosion");if(o.id==="flamestrike")c+=tv(s,"impFlamestrike");
    const cb=aura(s,"combust");if(cb&&school==="fire"&&o.spell)c+=cb.pct;const wc=aura(t,"wchill");if(wc&&school==="frost")c+=2*wc.stacks;}''')
rep('''  return B.general.spellCritMult+(tv(s,"potency")+s.K.critMult)/100+(school==="frost"?tv(s,"iceShards")/100:0);''',
    '''  return B.general.spellCritMult+s.K.critMult/100+(school==="frost"?tv(s,"iceShards")/100*(B.general.spellCritMult-1):0);''')
# damage(): resist, combustion, wards, fire vulnerability, pushback, winter's chill
rep('''  let amt=o.dot?base:base*dmgMult(src,school,o),crit=false,blocked=false;''',
    '''  if(o.spell&&!o.dot&&!o.noResist&&spellResisted(src,t,school))return 0;
  let amt=o.dot?base:base*dmgMult(src,school,o),crit=false,blocked=false;''')
rep('''  if(o.spell&&!o.dot&&school==="fire"){const cb=aura(src,"combust");if(cb&&--cb.charges<=0)cb.until=0;}''',
    '''  if(o.spell&&!o.dot&&school==="fire"){const cb=aura(src,"combust");if(cb){if(crit){if(--cb.charges<=0)cb.until=0;}else cb.pct+=cb.step;}}''')
rep('''  amt*=1-tv(t,"frozenCore")/100;''','''  if(school==="phys")amt*=1-(t.K.phys||0)/100;
  if(school==="fire"){const fv=aura(t,"firevuln");if(fv)amt*=1+fv.pct/100;}''')
rep('''  const abs=aura(t,"absorb");''','''  const wd=t.auras.find(a=>a.type==="ward"&&a.school===school&&a.until>now);
  if(wd&&amt>0&&o.spell&&!o.dot&&src!==t){const rf=school==="fire"?tv(t,"impFireWard"):school==="frost"?10*rk(t,"frostWarding"):0;
    if(rf&&Math.random()*100<rf){statusText(t,"Отражено","#ffd100");logRaw(`<b>${t.name}</b>: ${wd.name} отражает «${name}»`);damage(t,src,amt,name,school,{spell:true,noProc:true,noResist:true,noCrit:true});return 0}}
  if(wd&&amt>0){const x=Math.min(wd.amount,amt);wd.amount-=x;amt-=x;absorbed+=x;if(wd.amount<=0)wd.until=0;}
  const abs=aura(t,"absorb");''')
rep('''  if(t.cast&&META[t.cast.id].breakOnDmg&&amt>0)cancelCast(t,"Прервано уроном");''',
    '''  if(t.cast&&META[t.cast.id].breakOnDmg&&amt>0)cancelCast(t,"Прервано уроном");
  else if(t.cast&&amt>0)pushback(t);''')
rep('''      if(src.cls==="mage"){if(school==="fire"&&rk(src,"ignite"))addDot(t,src,"Воспламенение",(amt+absorbed)*tv(src,"ignite")/100,4,"fire");
        if(rk(src,"moe")&&o.cost)src.res=Math.min(src.maxRes,src.res+o.cost*tv(src,"moe")/100);}''',
    '''      if(src.cls==="mage"){if(school==="fire"&&rk(src,"ignite"))addDot(t,src,"Воспламенение",(amt+absorbed)*tv(src,"ignite")/100,4,"fire");
        if(rk(src,"moe")&&o.cost&&(school==="fire"||school==="frost"))src.res=Math.min(src.maxRes,src.res+o.cost*tv(src,"moe")/100);}''')
rep('''    if(school==="fire"&&t.hp>0&&Math.random()*100<tv(src,"impact"))cc(src,t,"stun",2,"Сотрясение");''',
    '''    if(school==="fire"&&o.spell&&t.hp>0&&Math.random()*100<tv(src,"impact"))cc(src,t,"stun",2,"Сотрясение");
    if(school==="frost"&&o.spell&&t.hp>0&&Math.random()*100<tv(src,"wintersChill")){const ex=aura(t,"wchill"),st=ex?Math.min(5,ex.stacks+1):1;addAura(t,{type:"wchill",name:"Зимняя стужа",stacks:st,until:now+15,dt:"magic"});}''')
rep('''  if(rk(t,"coldSnap")&&!t.coldSnapUsed&&t.hp<t.maxHp*tv(t,"coldSnap")/100){t.coldSnapUsed=true;t.cds.nova=0;statusText(t,"Холодная хватка","#9fdcff");}
''','')
rep('''function cancelCast(u,why){''','''/* урон сбивает время чтения: каст откладывается (1 с, потом меньше), канал теряет четверть длительности */
function pushback(u){const c=u.cast,m=META[c.id],sc=m.school;if(sc==="phys")return;
  if(u.cls==="mage"&&((sc==="fire"&&Math.random()*100<tv(u,"burningSoul"))||(c.id==="missiles"&&Math.random()*100<tv(u,"impMissiles"))))return;
  const G=B.general;c.pb=(c.pb||0)+1;
  if(c.channel){const a=eff(u,c.id);c.end-=a.channel*G.channelPushback/100;if(c.end<=now)u.cast=null;}
  else{const d=G.pushback[Math.min(c.pb,G.pushback.length)-1]||0;c.end=Math.min(c.end+d,now+(c.end-c.start));}}
function cancelCast(u,why){''')
# channel ends early after pushback
rep('''      if(u.cast===c&&c.tick>=a.ticks){u.cast=null;}''','''      if(u.cast===c&&(c.tick>=a.ticks||now>c.end+.05)){u.cast=null;}''')
# frost armor slow is a chill effect
rep('''if((o.melee||o.auto)&&!o.dot){const fa=aura(t,"frostarmor");if(fa&&src.alive)slowAura(t,src,fa.name,fa.slow,fa.slowDur,"magic");}''',
    '''if((o.melee||o.auto)&&!o.dot){const fa=aura(t,"frostarmor");if(fa&&src.alive)chill(t,src,fa.name,fa.slow,fa.slowDur);}''')
# K: physical damage taken
rep('''  const K={crit:0,dmg:0,school:{},ap:{},critMult:0,hp:0,res:0,resPct:0,regen:0,heal:0,taken:0,dodge:0,block:0,speed:0,ccDur:0,costPct:0,add:[]};''',
    '''  const K={crit:0,dmg:0,school:{},ap:{},critMult:0,hp:0,res:0,resPct:0,regen:0,heal:0,taken:0,phys:0,dodge:0,block:0,speed:0,ccDur:0,costPct:0,add:[]};''')
rep('''    else if(d.k==="add")K.add.push([d.a,d.f,(d.sg||1)*x]);else if(d.k in K)K[d.k]+=x;}''','''    else if(d.k==="add")K.add.push([d.a,d.f,(d.sg||1)*x]);else if(d.k in K)K[d.k]+=x;}''')
rep('''  for(const tk in T)for(const id in T[tk].list){const d=T[tk].list[id],r=u.talents[id]||0;if(!r||!d.k)continue;const x=r*d.v;''',
    '''  for(const tk in T)for(const id in T[tk].list){const d=T[tk].list[id],r=u.talents[id]||0;if(!r||!d.k)continue;const x=talVal(d,r);''')
# aura icons
rep('''"Смертельный яд":"deadly"};''','''"Смертельный яд":"deadly","Уязвимость к огню":"a_firevuln","Зимняя стужа":"a_wchill","Улучшенная снежная буря":"impBlizzard"};''')
open(S,'w').write(s);print('ok')
