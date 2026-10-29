import json,os
from PIL import Image
M=json.load(open('out/m2fx.json'));V=json.load(open('vis.json'))
key=lambda n:n.split('\\')[-1].rsplit('.',1)[0].lower()
ok=lambda k:k in M and (M[k]['parts'] or M[k]['ribs'] or M[k]['mesh'])
sp={}
for id,o in V.items():
    d={}
    for st in ['precast','cast','impact','state','channel']:
        if st in o:
            e={sl:key(n) for sl,n in o[st].items() if ok(key(n))}
            if e:d[st]=e
    if 'missile' in o and ok(key(o['missile'])):d['missile']=key(o['missile'])
    if d:sp[id]=d
used=set()
for d in sp.values():
    for st,e in d.items():
        if st=='missile':used.add(e)
        else:used|=set(e.values())
for k in list(used):
    for q in M[k]['parts']:
        if q.get('model') and q['model'] in M:used.add(q['model'])
models={k:M[k] for k in used}
out='/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/pub4/assets/fx/'
os.makedirs(out+'m2',exist_ok=True)
json.dump({'models':models,'spells':sp},open(out+'m2fx.json','w'),separators=(',',':'))
tex=set(p['tex'] for m in models.values() for p in m['parts']+m['ribs']+(m['mesh']['b'] if m['mesh'] else []) if p['tex'])
for t in tex:
    if os.path.exists('out/tex/%s.png'%t):Image.open('out/tex/%s.png'%t).save(out+'m2/%s.webp'%t,quality=90)
print(len(sp),'spells',len(models),'models',len(tex),'tex',os.path.getsize(out+'m2fx.json'))
