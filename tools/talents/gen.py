import json, importlib, sys
D = json.load(open('/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/m2x/tal112.json'))
def gen(cls):
    M = importlib.import_module(cls)
    rows = D[cls]; byname = {}
    out_icons = []
    tabs = {}
    for e in rows: tabs.setdefault(e['tabname'], []).append(e)
    idof = {}
    for e in rows:
        spec = M.T[e['name']]; idof[e['id']] = spec[0]
    js = []; info = {}
    for key, en, ru in M.TREES:
        L = sorted(tabs[en], key=lambda e: (e['tier'], e['col']))
        items = []
        for e in L:
            s = M.T[e['name']]; tid, n, v, d = s[:4]; extra = s[4] if len(s) > 4 else {}
            if isinstance(v, list): assert len(v) == e['max'], (e['name'], v, e['max'])
            f = dict(n=n, t=e['tier'], c=e['col'], max=e['max'], v=v)
            if e['req']: f['req'] = idof[e['req']]; f['reqr'] = e['reqr'] + 1
            f.update(extra); f['d'] = d
            items.append('        %s:%s' % (tid, json.dumps(f, ensure_ascii=False).replace('"n":', 'n:').replace('"t":', 't:').replace('"c":', 'c:').replace('"max":', 'max:').replace('"v":', 'v:').replace('"d":', 'd:').replace('"req":', 'req:').replace('"reqr":', 'reqr:').replace('"k":', 'k:').replace('"a":', 'a:').replace('"f":', 'f:').replace('"s":', 's:').replace('"sg":', 'sg:')))
            out_icons.append((tid, e['icon']))
            info[tid] = (key, e['tier'], e['max'], f.get('req'), f.get('reqr', 0))
        js.append('      %s:{name:"%s", list:{\n%s\n      }}' % (key, ru, ',\n'.join(items)))
    tal_js = '    %s:{\n%s\n    }' % (cls, ',\n'.join(js))
    # validate presets with the same rules as autoBuild
    pres = []
    for name, order in M.PRESETS.items():
        tal = {}
        def pts(tree): return sum(r for k, r in tal.items() if info[k][0] == tree)
        for tid, n in order:
            assert tid in info, tid
            for _ in range(n):
                tree, tier, mx, req, reqr = info[tid]
                if sum(tal.values()) >= 51 or tal.get(tid, 0) >= mx or pts(tree) < (tier - 1) * 5: break
                if req and tal.get(req, 0) < reqr: break
                tal[tid] = tal.get(tid, 0) + 1
        print(cls, name, sum(tal.values()), {t: sum(r for k, r in tal.items() if info[k][0] == t) for t, _, _ in M.TREES}, file=sys.stderr)
        pres.append('    "%s":%s' % (name, json.dumps([[k, n] for k, n in order if n])))
    pres_js = '  %s:{\n%s\n  }' % (cls, ',\n'.join(pres))
    caps_js = json.dumps([list(x) for x in M.CAPS])
    return tal_js, pres_js, caps_js, out_icons
if __name__ == '__main__':
    t, p, c, i = gen(sys.argv[1]); print(t[:400]); print(p); print(c); print(len(i))
