import dbc,json,sys
sr,ss=dbc.load('Spell');SP={dbc.u(r,0):r for r in sr}
ir,is_=dbc.load('SpellIcon');ICON={dbc.u(r,0):is_(dbc.u(r,1)).split('\\')[-1].lower() for r in ir}
tr,ts=dbc.load('TalentTab');tabs={}
for r in tr:
    f=[dbc.u(r,i) for i in range(15)];tabs[f[0]]=dict(name=ts(f[1]),cls=f[12],order=f[13])
rr,_=dbc.load('Talent')
CL={1:'warrior',2:'paladin',8:'rogue',16:'priest',128:'mage'}
# spell icon field: find index whose value maps to ICON for fireball(133)
out={};byid={}
for r in rr:
    f=[dbc.u(r,i) for i in range(21)]
    tid,tab,tier,col=f[:4];ranks=[x for x in f[4:13] if x]
    t=tabs.get(tab)
    if not t or t['cls'] not in CL:continue
    sp=SP[ranks[0]]
    e=dict(id=tid,tab=tab,tabname=t['name'],order=t['order'],tier=tier+1,col=col+1,max=len(ranks),name=ss(dbc.u(sp,120)),spells=ranks,req=f[13],reqr=f[16],
           icon=ICON.get(dbc.u(sp,117+0),'?'),desc=[ss(dbc.u(SP[x],138)) for x in ranks])
    byid[tid]=e;out.setdefault(CL[t['cls']],[]).append(e)
for c in out:
    for e in out[c]:
        if e['req']:e['reqname']=byid[e['req']]['name']
json.dump(out,open('tal112.json','w'),ensure_ascii=False,indent=1)
