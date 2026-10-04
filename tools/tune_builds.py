import sys
p = sys.argv[1]; s = open(p).read()
R = [
 ("adv:'Counters: Dodge & hit back hits 45% harder', dmg:1.08, counter:1.45,", "adv:'Counters: Dodge & hit back hits 30% harder', dmg:1.08, counter:1.3,"),
 ("adv:'Steady: wins speed trades and rarely wears out', dmg:1.0, counter:1.1,", "adv:'Steady: wins speed trades and rarely wears out', dmg:1.06, counter:1.15,"),
 ("adv:'Sharp and fast, but fragile', dmg:1.16,", "adv:'Sharp and fast, but fragile', dmg:1.2,"),
 ("balanced:{name:'Balanced', desc:'No strengths, no weaknesses. Defaults to Block.', dmg:1, drain:1, taken:1,", "balanced:{name:'Balanced', desc:'A little of everything: slightly harder hits, slightly less damage taken. Defaults to Block.', dmg:1.04, drain:1, taken:.96,"),
 ("sig:'rattle'", None),
]
for a, b in R:
    if b is None: continue
    assert s.count(a) == 1, a[:60]; s = s.replace(a, b)
import re
for breed, old, new in [('kempu', 'pow:8,', 'pow:7.5,'), ('kari', 'pow:6,', 'pow:6.5,')]:
    i = s.index(f"  {breed}:{{name:"); j = s.index(old, i); assert j - i < 200, breed
    s = s[:j] + new + s[j + len(old):]
open(p, 'w').write(s); print('builds tuned')
