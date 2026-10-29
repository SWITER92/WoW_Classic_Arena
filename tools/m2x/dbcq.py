import dbc,re,json,sys
rows,s=dbc.load('Spell');R={dbc.u(r,0):r for r in rows}
sk,_=dbc.load('SkillLineAbility');SK={dbc.u(r,2) for r in sk}
d,_=dbc.load('SpellDuration');D={dbc.u(r,0):dbc.u(r,1) for r in d}
c,_=dbc.load('SpellCastTimes');C={dbc.u(r,0):dbc.u(r,1) for r in c}
g,gs=dbc.load('SpellRange');G={dbc.u(r,0):dbc.f(r,2) for r in g}
by={}
for i,r in R.items():
  if i not in SK:continue
  n=s(dbc.u(r,120));rk=s(dbc.u(r,129));m=re.match(r'Rank (\d+)',rk);k=int(m.group(1)) if m else 0
  if n not in by or k>by[n][0]:by[n]=(k,i)
def info(n):
  k,i=by[n];r=R[i];return dict(id=i,rank=k,cast=C.get(dbc.u(r,18),0)/1000,cd=max(dbc.u(r,19),dbc.u(r,20))/1000,dur=D.get(dbc.u(r,30),0)/1000,range=G.get(dbc.u(r,36),0),cost=dbc.u(r,32))
for n in sys.argv[1:]:
  print(n, info(n) if n in by else 'NONE')
