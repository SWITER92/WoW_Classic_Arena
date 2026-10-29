import dbc,json,sys
rows,s=dbc.load('Spell');R={dbc.u(r,0):r for r in rows}
def i32(v):return v if v<2**31 else v-2**32
def sv(i,k=0):r=R[i];return i32(dbc.u(r,76+k))+i32(dbc.u(r,67+k))
d,_=dbc.load('SpellDuration');DU={dbc.u(r,0):i32(dbc.u(r,1)) for r in d}
def dur(i):return DU.get(dbc.u(R[i],30),0)/1000
if __name__=='__main__':
  D=json.load(open('tal112.json'))
  for e in D[sys.argv[1]]:
    print(e['tabname'][:4],e['tier'],e['name'],[ (sv(i),sv(i,1)) for i in e['spells'] if i in R], dur(e['spells'][0]) if e['spells'][0] in R else '')
