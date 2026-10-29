import dbc,json,sys
from sv import R
e,es=dbc.load('SpellVisualEffectName');E={dbc.u(r,0):es(dbc.u(r,2)) for r in e}
v,_=dbc.load('SpellVisual');V={dbc.u(r,0):[dbc.u(r,i) for i in range(16)] for r in v}
k,_=dbc.load('SpellVisualKit');K={dbc.u(r,0):[dbc.u(r,i) for i in range(35)] for r in k}
SL={3:'head',4:'chest',5:'base',6:'lhand',7:'rhand',8:'breath',9:'lweapon',10:'rweapon'}
import struct
def vis(sid):
  r=R[sid];vid=dbc.u(r,115);o={'id':sid,'speed':round(struct.unpack('<f',struct.pack('<I',dbc.u(r,37)))[0],2)}
  if vid not in V:return o
  f=V[vid]
  for i,st in enumerate(['precast','cast','impact','state','channel'],1):
    kt=K.get(f[i]);
    if not kt:continue
    d={SL[j]:E[kt[j]] for j in SL if kt[j] in E and E[kt[j]]}
    if d:o[st]=d
  if f[7] in E:o['missile']=E[f[7]]
  return o
if __name__=='__main__':
  print(json.dumps(vis(int(sys.argv[1]))))
