S='/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/v4/'
def R(s,a,b,n=1):
    assert s.count(a)==n,(s.count(a),a); return s.replace(a,b)
p=open(S+'p2.js').read()
p=R(p,'''      repentance:{name:"Покаяние", range:20, cd:60, cost:200, dur:6}
    }},''','''      repentance:{name:"Покаяние", range:20, cd:60, cost:200, dur:6},
      sealL:{name:"Печать Света", cost:130, dur:30, chance:30, heal:94, judgeHeal:61, judgeDur:10},
      sealW:{name:"Печать мудрости", cost:120, dur:30, chance:30, mana:90, judgeMana:59, judgeDur:10},
      dprot:{name:"Божественная защита", cd:300, cost:100, dur:8},
      devotion:{name:"Аура благочестия", armor:735, radius:30},
      retaura:{name:"Аура воздаяния", dmg:20, radius:30},
      conc:{name:"Аура сосредоточенности", pct:35, radius:30},
      sanctaura:{name:"Аура святости", pct:10, radius:30},
      shadowres:{name:"Аура защиты от тёмной магии", resist:60, pct:15, radius:30},
      frostres:{name:"Аура защиты от магии льда", resist:60, pct:15, radius:30},
      fireres:{name:"Аура защиты от огня", resist:60, pct:15, radius:30},
      bom:{name:"Благословение могущества", range:30, cost:100, ap:185},
      bow:{name:"Благословение мудрости", range:30, cost:100, mana:33},
      kings:{name:"Благословение королей", range:30, cost:100, pct:10},
      sanctbless:{name:"Благословение неприкосновенности", range:30, cost:100, reduce:24, dmg:35},
      sacrifice:{name:"Благословение жертвенности", range:30, cost:100, dur:30, amount:55}
    }},''')
open(S+'p2.js','w').write(p)

s=open(S+'p3.js').read()
s=R(s,'''  paladin:["judgement","sealR","sealJ","sealCr","hammer","wrath","flashlight","holylight","cap","cleanse","freedom","bubble",
           "bop","loh","trinket","food"],''','''  paladin:["judgement","sealR","sealCr","sealJ","hammer","wrath","flashlight","holylight","cap","cleanse","freedom","bubble",
           "bop","dprot","loh","sealL","sealW","bom","bow","sacrifice","trinket","food"],''')
# aura helpers + spells
s=R(s,'''  judgement:{school:"holy",target:true,needSeal:true,''','''  sealL:{school:"holy",target:false,noCombat:true,
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
  judgement:{school:"holy",target:true,needSeal:true,''')
s=R(s,'''      else if(s.kind==="Cr"){''','''      else if(s.kind==="L"||s.kind==="W"){if(isImmune(t))return;const j=ab("paladin",s.kind==="L"?"sealL":"sealW");addAura(t,{type:s.kind==="L"?"jol":"jow",name:s.kind==="L"?"Правосудие Света":"Правосудие мудрости",amount:s.kind==="L"?j.judgeHeal:j.judgeMana,until:now+j.judgeDur+tv(u,"lastingJ"),dt:"magic"});enterCombat(u,t);statusText(t,"Правосудие","#ffe9a0");log(u,a.name,t);}
      else if(s.kind==="Cr"){''')
# helpers
s=R(s,'''function forbear(u){''','''/* ауры паладина: одна на паладина, действует на него и союзников рядом */
const PAURAS=["devotion","retaura","conc","sanctaura","shadowres","frostres","fireres"];
function setPAura(u,id){u.paura=id;u.auras=u.auras.filter(x=>x.type!=="paura");addAura(u,{type:"paura",name:ab("paladin",id).name,icon:id,until:Infinity,good:true,mb:true});castFx(u,"castomni");}
function pauraOn(t,id){for(const p of units)if(p.cls==="paladin"&&p.alive&&p.paura===id&&p.team===t.team&&(p===t||dist(p,t)<=ab("paladin",id).radius))return p;return null}
/* благословения: на весь бой, от одного паладина на цели одно */
function bless(u,f,kind,a,until){f.auras=f.auras.filter(x=>!(x.type==="bless"&&x.src===u));addAura(f,{type:"bless",kind,src:u,name:a.name,icon:{bom:"bom",bow:"bow",kings:"kings",sanct:"sanctbless",sac:"sacrifice"}[kind],
  ap:kind==="bom"?a.ap*(1+tv(u,"impBoM")/100):0,mana:kind==="bow"?a.mana*(1+tv(u,"impBoW")/100):0,reduce:a.reduce||0,dmg:a.dmg||0,amount:a.amount||0,until:until||Infinity,good:true,mb:true});
  castFx(u,"castomni");log(u,a.name,f!==u?f:0);}
const blessOf=(t,kind)=>t.auras.find(x=>x.type==="bless"&&x.kind===kind&&x.until>now);
function forbear(u){''')
# auto attack blocked under divine protection
s=R(s,'canSee(u,t)&&!has(u,"bop")){','canSee(u,t)&&!has(u,"bop")&&!u.auras.some(x=>x.noAtk&&x.until>now)){')
s=R(s,'''  if(u.cast)return "Вы уже произносите заклинание";''','''  if(m.school==="phys"&&u.auras.some(x=>x.noAtk&&x.until>now))return "Нельзя под Божественной защитой";
  if(m.paura&&u.paura===id)return "Аура уже активна";
  if(u.cast)return "Вы уже произносите заклинание";''')
# armor: devotion
s=R(s,'(B[t.cls].armor||0)*(1+tv(t,"pTough")/100)+735*tv(t,"impDevotion")/100-','(B[t.cls].armor||0)*(1+tv(t,"pTough")/100)+devArmor(t)-')
s=R(s,'function armorOf(t,src){','function devArmor(t){const p=pauraOn(t,"devotion");return p?ab("paladin","devotion").armor*(1+tv(p,"impDevotion")/100):0}\nfunction armorOf(t,src){')
# dmgMult: sanctity aura + kings
s=R(s,'const vg=aura(s,"veng");','if(school==="holy"&&pauraOn(s,"sanctaura"))m*=1+ab("paladin","sanctaura").pct/100;if(blessOf(s,"kings"))m*=1.03;\n  const vg=aura(s,"veng");')
# heals: kings
s=R(s,'  let amt=roll(a.heal)*(1+u.K.heal/100);','  let amt=roll(a.heal)*(1+u.K.heal/100)*(blessOf(u,"kings")?1.03:1);')
# damage: might bonus, resist auras, kings, sanctuary blessing, sacrifice
s=R(s,'''  let amt=o.dot?base:base*dmgMult(src,school,o),crit=false,blocked=false;''','''  {const bm=(o.melee||o.auto)&&!o.dot&&school==="phys"&&blessOf(src,"bom");if(bm&&B[src.cls].swing)base+=bm.ap/14*B[src.cls].swing.interval;}
  let amt=o.dot?base:base*dmgMult(src,school,o),crit=false,blocked=false;''')
s=R(s,'''  if(rk(t,"sanctuary")&&!o.dot)amt=Math.max(0,amt-tv(t,"sanctuary"));''','''  {const rs={shadow:"shadowres",frost:"frostres",fire:"fireres"}[school];if(rs&&pauraOn(t,rs))amt*=1-ab("paladin",rs).pct/100;}
  if(blessOf(t,"kings"))amt*=.95;
  {const sb=blessOf(t,"sanct");if(sb&&!o.dot)amt=Math.max(0,amt-sb.reduce);}
  {const sc=blessOf(t,"sac");if(sc&&sc.src!==t&&sc.src.alive&&amt>0&&src!==sc.src){const x=Math.min(sc.amount,amt);amt-=x;sc.src.hp=Math.max(1,sc.src.hp-Math.round(x));combatText(src,sc.src,Math.round(x),false,{},school,false,0);}}''')
s=R(s,'''  if(blocked&&rk(t,"sanctuary")&&src.alive)damage(t,src,35,"Благословение неприкосновенности","holy",{noCrit:true,noProc:true});''','''  {const sb=blessOf(t,"sanct");if(blocked&&sb&&src.alive)damage(t,src,sb.dmg,sb.name,"holy",{noCrit:true,noProc:true});}
  if((o.melee||o.auto)&&!o.dot&&amt>0&&src.alive&&src!==t){const ra=pauraOn(t,"retaura");if(ra&&src.team!==t.team)damage(ra,src,ab("paladin","retaura").dmg*(1+tv(ra,"impRetAura")/100),ab("paladin","retaura").name,"holy",{noCrit:true,noProc:true,noResist:true});
    const jl=aura(t,"jol");if(jl)heal(src,jl.amount,jl.name);const jw=aura(t,"jow");if(jw&&src.resType==="mana")src.res=Math.min(src.maxRes,src.res+jw.amount);}''')
# concentration aura in pushback
s=R(s,'if((c.id==="flashlight"||c.id==="holylight")&&Math.random()*100<tv(u,"spFocus"))return;','if((c.id==="flashlight"||c.id==="holylight")&&Math.random()*100<tv(u,"spFocus"))return;{const ca=pauraOn(u,"conc");if(ca&&Math.random()*100<ab("paladin","conc").pct+tv(ca,"impConc"))return;}')
# mana regen: wisdom + kings mana handled as regen
s=R(s,'  if(u.resType==="mana")u.res=Math.min(u.maxRes,u.res+B[u.cls].manaRegen','  {const bw=blessOf(u,"bow");if(bw&&u.resType==="mana")u.res=Math.min(u.maxRes,u.res+bw.mana/5*dt);}\n  if(u.resType==="mana")u.res=Math.min(u.maxRes,u.res+B[u.cls].manaRegen')
# seals L/W procs on swing
s=R(s,'''        else if(s&&s.kind==="C"){''','''        else if(s&&(s.kind==="L"||s.kind==="W")){const j=ab("paladin",s.kind==="L"?"sealL":"sealW");if(Math.random()*100<j.chance){if(s.kind==="L")heal(u,j.heal,s.name,false,u);else u.res=Math.min(u.maxRes,u.res+j.mana);}}
        else if(s&&s.kind==="C"){''')
# prep: default aura and blessings before the fight
s=R(s,'''  if(u.cls==="rogue")addAura(u,{type:"stealth",name:B.rogue.abilities.stealth.name,until:Infinity,good:true});
}''','''  if(u.cls==="rogue")addAura(u,{type:"stealth",name:B.rogue.abilities.stealth.name,until:Infinity,good:true});
}
/* паладины до начала боя: аура благочестия и благословения себе и союзникам (короли, если есть, иначе могущество бойцам и мудрость заклинателям) */
function prepPaladins(){for(const p of units)if(p.cls==="paladin"){setPAura(p,p.isPlayer&&settings.paura&&PAURAS.includes(settings.paura)?settings.paura:"devotion");
  for(const f of units)if(f.team===p.team){const k=rk(p,"tKings")?"kings":(f.resType==="mana"&&f.cls!=="paladin"?"bow":"bom");bless(p,f,k,ab("paladin",k));}}}''')
open(S+'p3.js','w').write(s)
print('ok')
