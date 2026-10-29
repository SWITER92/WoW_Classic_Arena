S='/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/v4/'
def R(s,a,b,n=1):
    assert s.count(a)==n,(s.count(a),a); return s.replace(a,b)
p=open(S+'p2.js').read()
old=p[p.index('    abilities:{\n      sealR:'):p.index('  priest:{armor')]
new='''    abilities:{
      sealR:{name:"Печать праведности", cost:90, dur:30, dmg:55, judge:[250,300]},
      sealJ:{name:"Печать справедливости", cost:120, dur:30, chance:12, stun:2, judgeDur:10},
      sealCr:{name:"Печать крестоносца", cost:110, dur:30, haste:40, ap:66, judgeDur:10, holyBonus:60},
      sealC:{name:"Печать повеления", cost:140, dur:30, ppm:7, pct:70, judge:[190,210]},
      judgement:{name:"Правосудие", range:10, cd:10, cost:120},
      hammer:{name:"Молот правосудия", range:10, cd:60, cost:250, stun:6, speed:30},
      wrath:{name:"Молот гнева", range:30, cast:1, cd:6, cost:300, dmg:[500,550], hpPct:20, speed:35},
      flashlight:{name:"Вспышка Света", range:40, cast:1.5, cost:200, heal:[480,550]},
      holylight:{name:"Свет небес", range:40, cast:2.5, cost:450, heal:[1050,1200]},
      bubble:{name:"Божественный щит", cd:300, cost:300, dur:12},
      freedom:{name:"Благословение свободы", range:30, cd:20, cost:150, dur:10},
      bop:{name:"Благословение защиты", range:30, cd:300, cost:150, dur:10},
      cleanse:{name:"Очищение", range:30, cost:150},
      loh:{name:"Возложение рук", range:40},
      consecration:{name:"Освящение", cd:8, cost:300, radius:8, dur:8, dps:40},
      dfavor:{name:"Божественное одобрение", cd:120},
      holyshock:{name:"Шок небес", range:20, cd:30, cost:300, dmg:[365,395]},
      holyshield:{name:"Щит небес", cd:10, cost:200, dur:10, charges:4, block:30, dmg:90},
      repentance:{name:"Покаяние", range:20, cd:60, cost:200, dur:6}
    }},
'''
p=p.replace(old,new)
open(S+'p2.js','w').write(p)
s=open(S+'p3.js').read()
s=R(s,'''  paladin:["judgement","sealR","sealJ","hammer","flashlight","holylight","consecration","cap","cleanse","freedom","bubble","bop",
           "loh","trinket","food"],''','''  paladin:["judgement","sealR","sealJ","sealCr","hammer","wrath","flashlight","holylight","cap","cleanse","freedom","bubble",
           "bop","loh","trinket","food"],''')
# eff
s=R(s,'    case "cheapshot":case "garrote":a.cost-=tv(u,"dirtyDeeds");break;\n','''    case "cheapshot":case "garrote":a.cost-=tv(u,"dirtyDeeds");break;
    case "bop":a.cd-=tv(u,"guardFavor");break;
    case "freedom":a.dur+=3*rk(u,"guardFavor");break;
    case "sealCr":a.ap*=1+tv(u,"impSotC")/100;a.holyBonus*=1+tv(u,"impSotC")/100;
    case "sealR":case "sealJ":case "sealC":case "judgement":a.cost*=1-tv(u,"benediction")/100;break;
''')
# abilities
s=R(s,'''  judgement:{school:"holy",target:true,needSeal:true,''','''  sealCr:{school:"holy",target:false,noCombat:true,
    desc:a=>`${a.dur} с: удары оружием на ${a.haste}% чаще, но каждый слабее, плюс ${Math.round(a.ap)} урона за удар от силы атаки. Правосудие раскрывает печать: цель ${a.judgeDur} с получает на ${Math.round(a.holyBonus)} больше урона от каждого удара Светом.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="seal");addAura(u,{type:"seal",kind:"Cr",name:a.name,haste:a.haste,ap:a.ap,bonus:a.holyBonus,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name);}},
  sealC:{school:"holy",target:false,noCombat:true,cap:true,
    desc:a=>`${a.dur} с: удары оружием примерно ${a.ppm} раз в минуту наносят ещё ${a.pct}% урона оружия Светом. Правосудие раскрывает печать: ${a.judge[0]}–${a.judge[1]} урона Светом, вдвое больше по оглушённой или выведенной из строя цели.`,
    exec(u,t,a){u.auras=u.auras.filter(x=>x.type!=="seal");addAura(u,{type:"seal",kind:"C",name:a.name,ppm:a.ppm,pct:a.pct,until:now+a.dur,good:true,mb:true});castFx(u,"castomni");log(u,a.name);}},
  wrath:{school:"holy",target:true,
    desc:a=>`Каст ${a.cast.toFixed(1)} с. Бросает молот: ${a.dmg[0]}–${a.dmg[1]} урона Светом. Только по цели, у которой ${a.hpPct}% здоровья или меньше.`,
    usable(u,t,a){return t&&t.hp<=t.maxHp*a.hpPct/100||"Цель должна быть ранена (20% здоровья или меньше)"},
    exec(u,t,a){castFx(u);projectile(u,t,a.speed,"holy",()=>damage(u,t,roll(a.dmg),a.name,"holy",{spell:true,id:"wrath",cost:a.cost}));}},
  dfavor:{school:"holy",target:false,gcd:false,cap:true,noCombat:true,
    desc:a=>`Следующие Вспышка Света, Свет небес или Шок небес гарантированно критические.`,
    exec(u,t,a){addAura(u,{type:"dfavor",name:a.name,until:now+3600,good:true});castFx(u,"castomni");log(u,a.name);}},
  judgement:{school:"holy",target:true,needSeal:true,''')
s=R(s,'''      if(s.kind==="R")damage(u,t,roll(ab("paladin","sealR").judge),a.name,"holy",{spell:true,id:"judgement",cost:a.cost});''','''      if(s.kind==="R")damage(u,t,roll(ab("paladin","sealR").judge)*(1+tv(u,"impSoR")/100),a.name,"holy",{spell:true,id:"judgement",cost:a.cost});
      else if(s.kind==="C")damage(u,t,roll(ab("paladin","sealC").judge)*(has(t,"stun")||incap(t)?2:1),a.name,"holy",{spell:true,id:"judgement",cost:a.cost});
      else if(s.kind==="Cr"){if(isImmune(t))return;addAura(t,{type:"jotc",name:"Правосудие крестоносца",bonus:s.bonus,until:now+ab("paladin","sealCr").judgeDur,dt:"magic"});enterCombat(u,t);statusText(t,"Правосудие","#ffe9a0");log(u,a.name,t);}''')
s=R(s,'''    desc:a=>`Мгновенно: ${a.dmg[0]}–${a.dmg[1]} урона Светом.`,
    exec(u,t,a){castFx(u);projectile(u,t,45,"holy",()=>damage(u,t,roll(a.dmg),a.name,"holy",{spell:true,id:"holyshock",cost:a.cost}));}},''','''    desc:a=>`Мгновенно: ${a.dmg[0]}–${a.dmg[1]} урона Светом.`,
    exec(u,t,a){castFx(u);const df=aura(u,"dfavor");if(df)df.until=0;damage(u,t,roll(a.dmg),a.name,"holy",{spell:true,id:"holyshock",cost:a.cost,forceCrit:!!df});}},''')
s=R(s,'''  consecration:{school:"holy",target:false,hostile:true,''','''  consecration:{school:"holy",target:false,hostile:true,cap:true,''')
# swing: seals
s=R(s,'const sl=aura(u,"slice");if(sl)iv/=1+sl.pct/100;','const sl=aura(u,"slice");if(sl)iv/=1+sl.pct/100;const sc=u.cls==="paladin"&&aura(u,"seal");if(sc&&sc.kind==="Cr")iv/=1+sc.haste/100;')
s=R(s,'''else{if(u.cls==="warrior")u.res=Math.min(u.maxRes,u.res+sw.rage+tv(u,"unbridled"));damage(u,t,roll(sw.dmg),"Автоатака","phys",{auto:true});}''','''else{if(u.cls==="warrior")u.res=Math.min(u.maxRes,u.res+sw.rage+tv(u,"unbridled"));
        const cr=u.cls==="paladin"&&aura(u,"seal");damage(u,t,cr&&cr.kind==="Cr"?roll(sw.dmg)/(1+cr.haste/100)+cr.ap:roll(sw.dmg),"Автоатака","phys",{auto:true});}''')
s=R(s,'''        if(s&&s.kind==="R")damage(u,t,s.dmg,ab("paladin","sealR").name,"holy",{noProc:true,noCrit:true});''','''        if(s&&s.kind==="R")damage(u,t,s.dmg*(1+tv(u,"impSoR")/100),ab("paladin","sealR").name,"holy",{noProc:true,noCrit:true});
        else if(s&&s.kind==="C"){if(Math.random()<s.ppm*sw.interval/60)damage(u,t,roll(sw.dmg)*s.pct/100,s.name,"holy",{melee:true,noDodge:true,noBlock:true,noProc:true});}''')
# heals: divine favor + holy power via critChance
s=R(s,'''  let amt=roll(a.heal)*(1+u.K.heal/100);const crit=Math.random()*100<critChance(u,"holy",u,{});''','''  let amt=roll(a.heal)*(1+u.K.heal/100);const df=aura(u,"dfavor");if(df)df.until=0;const crit=!!df||Math.random()*100<critChance(u,"holy",u,{spell:true});''')
# crit
s=R(s,'''  if((o.melee||o.auto)&&t)c-=tv(t,"sleight");''','''  else if(s.cls==="paladin"){if(school==="holy"&&o.spell)c+=tv(s,"holyPower");if((o.melee||o.auto)&&school==="phys")c+=tv(s,"conviction");}
  if((o.melee||o.auto)&&t)c-=tv(t,"sleight");''')
s=R(s,'''if(!o.noCrit&&!o.dot&&Math.random()*100<critChance(src,school,t,o))''','''if(!o.noCrit&&!o.dot&&(o.forceCrit||Math.random()*100<critChance(src,school,t,o)))''')
# hit / parry / dodge
s=R(s,'function meleeHit(s){return tv(s,"rPrecision")+tv(s,"weaponExp")}','function meleeHit(s){return tv(s,"rPrecision")+tv(s,"weaponExp")+tv(s,"pPrecision")}')
s=R(s,'return (B.general.parry[t.cls]||0)+tv(t,"rDeflection")}','return (B.general.parry[t.cls]||0)+tv(t,"rDeflection")+tv(t,"pDeflect")}')
s=R(s,'return (B[t.cls].dodge||0)+t.K.dodge+(ev?ev.pct:0)+(gs?gs.pct:0)}','return (B[t.cls].dodge||0)+t.K.dodge+(ev?ev.pct:0)+(gs?gs.pct:0)+tv(t,"anticip")*.04}')
# armor
s=R(s,'function armorOf(t,src){const ex=aura(t,"expose");return Math.max(0,(B[t.cls].armor||0)-','function armorOf(t,src){const ex=aura(t,"expose");return Math.max(0,(B[t.cls].armor||0)*(1+tv(t,"pTough")/100)+735*tv(t,"impDevotion")/100-')
# damage: jotc bonus, sanctuary, redoubt block, eye for an eye
s=R(s,'''  const hs=aura(t,"holyshield");
  if((o.melee||o.auto)&&!o.noBlock&&Math.random()*100<tv(t,"shieldSpec")+t.K.block+(hs?hs.pct:0)){blocked=true;amt*=1-B.general.blockReduce/100;}''','''  if(school==="holy"&&!o.dot){const jc=aura(t,"jotc");if(jc)amt+=jc.bonus;}
  const hs=aura(t,"holyshield"),rd=aura(t,"redoubt");
  if((o.melee||o.auto)&&!o.noBlock&&Math.random()*100<tv(t,"shieldSpec")+t.K.block+(hs?hs.pct:0)+(rd?rd.pct:0)){blocked=true;amt*=1-B.general.blockReduce/100;if(rd&&--rd.charges<=0)rd.until=0;}''')
s=R(s,'''  amt*=1-t.K.taken/100;''','''  amt*=1-t.K.taken/100;
  if(rk(t,"sanctuary")&&!o.dot)amt=Math.max(0,amt-tv(t,"sanctuary"));''')
s=R(s,'''      if(rk(t,"enrage"))addAura''','''      if(rk(t,"redoubt"))addAura(t,{type:"redoubt",name:"Несгибаемость",pct:tv(t,"redoubt"),charges:5,until:now+10,good:true});
      if(rk(t,"eyeForEye")&&o.spell&&src.alive&&src!==t){const x=Math.min(t.maxHp*.5,(amt+absorbed)*tv(t,"eyeForEye")/100),ss=src,tt=t;setTimeout(()=>{if(ss.alive&&tt.alive)damage(tt,ss,x,"Око за око","holy",{noCrit:true,noProc:true,noResist:true,spell:true});},100);}
      if(rk(t,"enrage"))addAura''')
s=R(s,'''  if(blocked&&hs&&src.alive){''','''  if(blocked&&rk(t,"sanctuary")&&src.alive)damage(t,src,35,"Благословение неприкосновенности","holy",{noCrit:true,noProc:true});
  if(blocked&&hs&&src.alive){''')
s=R(s,'''addAura(t,{type:"weak",name:"Возмездие",pct:tv(src,"vindication"),''','''addAura(t,{type:"weak",name:"Возмездие",pct:tv(src,"vindication")/3,''')
# vengeance: physical + holy only
s=R(s,'const vg=aura(s,"veng");if(vg)m*=1+vg.pct/100;','const vg=aura(s,"veng");if(vg&&(school==="phys"||school==="holy"))m*=1+vg.pct/100;')
# spiritual focus: no pushback
s=R(s,'function pushback(u){const c=u.cast,m=META[c.id],sc=m.school;if(sc==="phys")return;','function pushback(u){const c=u.cast,m=META[c.id],sc=m.school;if(sc==="phys")return;if((c.id==="flashlight"||c.id==="holylight")&&Math.random()*100<tv(u,"spFocus"))return;')
# unyielding faith: resist fear / disorient
s=R(s,'''  if(type==="stun")dur*=1-tv(t,"ironWill")/100;''','''  if((type==="fear"||type==="incap")&&rk(t,"unyielding")&&Math.random()*100<tv(t,"unyielding")){statusText(t,"Сопротивление","#cfd6df");logRaw(`${t.name} сопротивляется: ${name}`);return false}
  if(type==="stun")dur*=1-tv(t,"ironWill")/100;''')
# bot
s=R(s,'''    if(!has(u,"seal")&&u.res>600&&this.ready("sealR")){tryUse(u,"sealR");return}''','''    if(!has(u,"seal")&&u.res>600){const sl=this.ready("sealC")?"sealC":"sealR";if(this.ready(sl)){tryUse(u,sl);return}}
    if(e.hp<=e.maxHp*.2&&d<=30&&this.ready("wrath")&&!u.moving){this.stop();tryUse(u,"wrath");return}''')
s=R(s,'''    if(u.hp<u.maxHp*.7&&(left>1.6||''','''    if(u.hp<u.maxHp*.5&&this.ready("dfavor"))tryUse(u,"dfavor");
    if(u.hp<u.maxHp*.7&&(left>1.6||''')
open(S+'p3.js','w').write(s)
print('ok')
