import sys, re, json
sys.path.insert(0, '/home/claude/tal')
import gen
S = '/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/'
cls = sys.argv[1]
tal_js, pres_js, caps_js, icons = gen.gen(cls)
p2 = open(S + 'v4/p2.js').read()
# replace talents block of this class
m0 = re.compile(r'\n    (,?)%s:\{\n' % cls).search(p2, p2.index('  talents:{'))
st = m0.start() + 1
if m0.group(1): tal_js = '    ,' + tal_js.lstrip()
# end: next class block at the same indent ("    xxx:{" or "    ,xxx:{") or end of talents
m = re.compile(r'\n    ,?(warrior|mage|rogue|paladin|priest):\{\n|\n  \}\n\};').search(p2, st + 10)
en = m.start()
p2 = p2[:st] + tal_js + p2[en:]
p2 = re.sub(r'\n    \}\n    (warrior|mage|rogue|paladin|priest):\{', r'\n    },\n    \1:{', p2)
open(S + 'v4/p2.js', 'w').write(p2)
p3 = open(S + 'v4/p3.js').read()
st = p3.index('  %s:{\n    "' % cls, p3.index('const PRESETS='))
en = p3.index('\n  }', st) + 4
p3 = p3[:st] + pres_js + p3[en:]
p3 = re.sub(r'(const CAPS=\{[^;]*?)%s:\[\[[^\]]*\](?:,\[[^\]]*\])*\]' % cls, lambda mm: mm.group(1) + cls + ':' + caps_js, p3, count=1, flags=re.S)
open(S + 'v4/p3.js', 'w').write(p3)
# icons
txt = open(S + 'build/icons.txt').read().split('\n')
have = {l.split()[0] for l in txt if l.strip()}
add = [f'{k} {v}' for k, v in icons if k not in have]
extra = [l for l in (sys.argv[2:] if len(sys.argv) > 2 else []) ]
for l in extra:
    k = l.split()[0]
    if k not in have: add.append(l)
open(S + 'build/icons.txt', 'w').write('\n'.join([l for l in txt if l.strip()] + add) + '\n')
print('added icons', len(add))
