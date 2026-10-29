import struct
def load(n):
    d=open('/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/m2x/dbc/%s.dbc'%n,'rb').read()
    _,rc,fc,rs,ss=struct.unpack('<4s4I',d[:20]);sb=d[20+rc*rs:]
    def s(o):return sb[o:sb.index(b'\0',o)].decode('utf8','replace')
    rows=[d[20+i*rs:20+(i+1)*rs] for i in range(rc)]
    return rows,s
def u(r,i):return struct.unpack_from('<I',r,i*4)[0]
def f(r,i):return struct.unpack_from('<f',r,i*4)[0]
