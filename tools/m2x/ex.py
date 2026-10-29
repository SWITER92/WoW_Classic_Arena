# Выгрузка частиц/шлейфов/костей из M2 v256 (1.12) в JSON; раскладка по azeroth-survivors-re (benilla-formats)
import sys,json,struct,io,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import mpq
from PIL import Image
U16=lambda b,o:struct.unpack_from('<H',b,o)[0]
U32=lambda b,o:struct.unpack_from('<I',b,o)[0]
I16=lambda b,o:struct.unpack_from('<h',b,o)[0]
F32=lambda b,o:struct.unpack_from('<f',b,o)[0]
V3=lambda b,o:list(struct.unpack_from('<3f',b,o))
def rd(v):return round(v,4) if isinstance(v,float) else v
def track(b,o,elem,read,band,gseqs):
    interp=U16(b,o);gs=U16(b,o+2);tn,to=U32(b,o+12),U32(b,o+16);vn,vo=U32(b,o+20),U32(b,o+24)
    n=min(tn,vn)
    if n==0:return None
    keys=[(U32(b,to+i*4),read(b,vo+i*elem)) for i in range(n)]
    if gs!=0xffff and gs<len(gseqs):
        per=gseqs[gs];ks=[(t/1000,v) for t,v in keys]
        return {'i':interp,'p':per/1000,'g':1,'k':[[rd(t),[rd(x) for x in v] if isinstance(v,(list,tuple)) else rd(v)] for t,v in ks]}
    s,e=band
    ks=[(t-s,v) for t,v in keys if s<=t<=e]
    if not ks:
        # до начала полосы: последнее значение до неё
        prev=[(0,v) for t,v in keys if t<s]
        ks=prev[-1:] if prev else [(0,keys[0][1])]
    return {'i':interp,'p':(e-s)/1000,'k':[[rd(t/1000),[rd(x) for x in v] if isinstance(v,(list,tuple)) else rd(v)] for t,v in ks]}
def m2(name):
    b=mpq.read(name.replace('.mdx','.m2').replace('.MDX','.m2'))
    if b is None:
        b=mpq.read(name[:-4]+'.m2')
    if b is None or b[:4]!=b'MD20':return None
    gn,go=U32(b,0x14),U32(b,0x18);gseqs=[U32(b,go+i*4) for i in range(gn)]
    sn,so=U32(b,0x1c),U32(b,0x20)
    seqs=[(U16(b,so+i*0x44),U32(b,so+i*0x44+4),U32(b,so+i*0x44+8),U32(b,so+i*0x44+0x10)) for i in range(sn)]
    band=(seqs[0][1],seqs[0][2]) if seqs else (0,0xffffffff)
    loop=(seqs[0][3]&1)==0 if seqs else True
    tn,to=U32(b,0x5c),U32(b,0x60)
    tex=[]
    for i in range(tn):
        e=to+i*16;n,o=U32(b,e+8),U32(b,e+12)
        tex.append(b[o:o+n].rstrip(b'\0').decode('latin1') if n>1 else None)
    bn,bo=U32(b,0x34),U32(b,0x38);bones=[]
    for i in range(bn):
        e=bo+i*0x6c
        bones.append({'fl':U32(b,e+4),'par':I16(b,e+8),'pv':[rd(x) for x in V3(b,e+0x60)],
          't':track(b,e+0x0c,12,V3,band,gseqs),'r':track(b,e+0x28,16,lambda b,o:list(struct.unpack_from('<4f',b,o)),band,gseqs),
          's':track(b,e+0x44,12,V3,band,gseqs)})
    rfn,rfo=U32(b,0x84),U32(b,0x88)
    pn,po=U32(b,0x13c),U32(b,0x140);parts=[]
    for i in range(pn):
        e=po+i*0x1f8
        T=lambda off,elem=4,read=F32:track(b,e+off,elem,read,band,gseqs)
        def col(o):
            v=U32(b,o);return [((v>>16)&255)/255,((v>>8)&255)/255,(v&255)/255,((v>>24)&255)/255]
        ti=U16(b,e+0x16)
        r,c=U16(b,e+0x30),U16(b,e+0x32)
        if not(r and c and r&(r-1)==0 and c&(c-1)==0):r=c=1
        sp=None
        if U16(b,e+0x2a)==3:
            q,o=U32(b,e+0x1d4),U32(b,e+0x1d8);n=3*(q//3)+1
            if q>=3:sp=[[rd(x) for x in V3(b,o+k*12)] for k in range(n)]
        parts.append({'fl':U32(b,e+4),'pos':[rd(x) for x in V3(b,e+8)],'bone':U16(b,e+0x14),'tex':tex[ti] if ti<len(tex) else None,
          'shape':U16(b,e+0x2a),'blend':b[e+0x28],'rows':r,'cols':c,'ht':b[e+0x2c],
          'rate':T(0xdc),'en':T(0x1dc,1,lambda b,o:float(b[o]!=0)),
          'speed':T(0x34),'svar':T(0x50),'lat':T(0x6c),'lon':T(0x88),'grav':T(0xa4),'life':T(0xc0),'al':T(0xf8),'aw':T(0x114),'zs':T(0x130),
          'mid':rd(F32(b,e+0x14c)),'col':[[rd(x) for x in col(e+0x150+4*k)] for k in range(3)],'sc':[rd(F32(b,e+0x15c+4*k)) for k in range(3)],
          'hc':[[U16(b,e+0x168),U16(b,e+0x16a)],[U16(b,e+0x16e),U16(b,e+0x170)]],'tc':[[U16(b,e+0x174),U16(b,e+0x176)],[U16(b,e+0x178),U16(b,e+0x17a)]],
          'rep':[U16(b,e+0x16c),U16(b,e+0x172)],'drag':rd(F32(b,e+0x194)),'tail':rd(F32(b,e+0x17c)),'tw':[rd(F32(b,e+0x180+4*k)) for k in range(4)],
          'spin':rd(F32(b,e+0x198)),'inh':rd(F32(b,e+0x190)),'fol':[rd(F32(b,e+0x1c4+4*k)) for k in range(4)],'spline':sp,
          'model':(b[U32(b,e+0x1c):U32(b,e+0x1c)+U32(b,e+0x18)].rstrip(b'\0').decode('latin1') if U32(b,e+0x18)>1 else None)})
    rn,ro=U32(b,0x134),U32(b,0x138);ribs=[]
    for i in range(rn):
        e=ro+i*0xdc
        n,o=U32(b,e+0x14),U32(b,e+0x18);t=U16(b,o) if n else 0
        n2,o2=U32(b,e+0x1c),U32(b,e+0x20);bm=None
        if n2:
            m=U16(b,o2)
            if m<rfn:bm=U16(b,rfo+m*4+2)
        ribs.append({'bone':U16(b,e+4),'pos':[rd(x) for x in V3(b,e+8)],'tex':tex[t] if t<len(tex) else None,'blend':bm,
          'col':track(b,e+0x24,12,V3,band,gseqs),'alpha':track(b,e+0x40,2,lambda b,o:U16(b,o)/32767,band,gseqs),
          'ha':track(b,e+0x5c,4,F32,band,gseqs),'hb':track(b,e+0x78,4,F32,band,gseqs),
          'eps':rd(F32(b,e+0x94)),'elife':rd(max(.25,F32(b,e+0x98))),'grav':rd(F32(b,e+0x9c)),'rows':max(1,U16(b,e+0xa0)),'cols':max(1,U16(b,e+0xa2)),
          'vis':track(b,e+0xc0,1,lambda b,o:float(b[o]!=0),band,gseqs)})
    mesh=None
    vn,vo=U32(b,0x44),U32(b,0x48);wn,wo=U32(b,0x4c),U32(b,0x50)
    if vn and wn:
        V=[struct.unpack_from('<3f4B4B3f2f',b,vo+i*48) for i in range(vn)]
        w=wo;IN,IO=U32(b,w),U32(b,w+4);TN,TO=U32(b,w+8),U32(b,w+12);SN,SO=U32(b,w+24),U32(b,w+28);BN,BO=U32(b,w+32),U32(b,w+36)
        idx=[U16(b,IO+i*2) for i in range(IN)];tri=[U16(b,TO+i*2) for i in range(TN)]
        subs=[struct.unpack_from('<10H',b,SO+i*32) for i in range(SN)]
        lk=lambda o,n,i:U16(b,U32(b,o+4)+i*2) if i<U32(b,o) else None
        batches=[]
        for i in range(BN):
            fl,sh,si,gi,ci,mi,ml,tc,tci,tcc,twi,tti=struct.unpack_from('<4Hh7H',b,BO+i*24)
            if si>=len(subs):continue
            sm=subs[si];ts=tri[sm[4]:sm[4]+sm[5]]
            ti=lk(0x94,0,tci);t=tex[ti] if ti is not None and ti<len(tex) else None
            if not t:continue
            rfn,rfo=U32(b,0x84),U32(b,0x88);rf=U16(b,rfo+mi*4) if mi<rfn else 0;bl=U16(b,rfo+mi*4+2) if mi<rfn else 0
            batches.append({'tri':[idx[k] for k in ts],'tex':t,'blend':bl,'rf':rf,'ci':ci if ci>=0 else -1,'tw':lk(0xa4,0,twi),'ta':lk(0xac,0,tti),'pri':ml})
        if batches:
            used=sorted(set(k for bt in batches for k in bt['tri']));remap={k:j for j,k in enumerate(used)}
            for bt in batches:bt['tri']=[remap[k] for k in bt['tri']]
            mesh={'p':[rd(x) for k in used for x in V[k][0:3]],'uv':[rd(x) for k in used for x in V[k][14:16]],'bi':[x for k in used for x in V[k][7:11]],'bw':[x for k in used for x in V[k][3:7]],'b':batches}
            cn,co=U32(b,0x54),U32(b,0x58)
            mesh['colors']=[{'c':track(b,co+i*0x38,12,V3,band,gseqs),'a':track(b,co+i*0x38+0x1c,2,lambda b,o:U16(b,o)/32767,band,gseqs)} for i in range(cn)]
            tn2,to2=U32(b,0x64),U32(b,0x68)
            mesh['trans']=[track(b,to2+i*0x1c,2,lambda b,o:U16(b,o)/32767,band,gseqs) for i in range(tn2)]
            an,ao=U32(b,0x74),U32(b,0x78)
            mesh['ta']=[{'t':track(b,ao+i*0x54,12,V3,band,gseqs),'r':track(b,ao+i*0x54+0x1c,16,lambda b,o:list(struct.unpack_from('<4f',b,o)),band,gseqs),'s':track(b,ao+i*0x54+0x38,12,V3,band,gseqs)} for i in range(an)]
    return {'dur':rd((band[1]-band[0])/1000),'loop':loop,'bones':bones,'parts':parts,'ribs':ribs,'mesh':mesh}
if __name__=='__main__':
    vis=json.load(open(sys.argv[1]));out=sys.argv[2];os.makedirs(out+'/tex',exist_ok=True)
    names=set()
    for o in vis.values():
        for k,v in o.items():
            if isinstance(v,dict):names|=set(v.values())
            elif k=='missile':names.add(v)
    M={};T=set()
    for n in sorted(names,key=str.lower):
        key=n.split('\\')[-1].rsplit('.',1)[0].lower()
        if key in M:continue
        r=m2(n)
        if r is None:print('MISS',n);continue
        if not r['parts'] and not r['ribs'] and not r['mesh']:print('empty',n)
        M[key]=r
        for p in r['parts']+r['ribs']+(r['mesh']['b'] if r['mesh'] else []):
            if p['tex']:T.add(p['tex'])
        # частицы-модели: сама модель выгружается отдельно, частица хранит её ключ
        for p in r['parts']:
            if p.get('model'):
                mn=p['model'];mk=mn.split('\\')[-1].rsplit('.',1)[0].lower();p['model']=mk
                if mk not in M:
                    g=m2(mn)
                    if g and g['mesh']:
                        M[mk]=g
                        for b in g['mesh']['b']:
                            if b['tex']:T.add(b['tex'])
    tm={}
    for t in sorted(T):
        d=mpq.read(t)
        if d is None:print('NOTEX',t);continue
        im=Image.open(io.BytesIO(d)).convert('RGBA')
        k=t.split('\\')[-1].rsplit('.',1)[0].lower();im.save(out+'/tex/'+k+'.png');tm[t]=k
    for r in M.values():
        for p in r['parts']+r['ribs']+(r['mesh']['b'] if r['mesh'] else []):p['tex']=tm.get(p['tex'])
    json.dump(M,open(out+'/m2fx.json','w'),separators=(',',':'))
    print(len(M),'models',len(tm),'tex',os.path.getsize(out+'/m2fx.json'))
