// Fight balance simulator: runs the game's own fight rules (copied out of source/base.html) with no graphics.
// Usage: node tools/balance-sim.mjs [fightsPerPair=200] [level=5]
// Player policies vs the computer: sameAsAI, readsTell (always counters the tell), readsTellButMixes (counters it, but mixes in another move after trusting it twice), fixed moves.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'source', 'base.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + from.length); if (a < 0 || b < 0) throw new Error('missing ' + from); return src.slice(a, b); };
const code = [
  cut('const rnd = ', '\n'), cut('const pick = ', '\n'), cut('const clamp = ', '\n'),
  cut('const BREEDS = {', 'const HANDLERS'),
  cut('function statsOf(e){', 'const condLabel'),
  cut('function aiPick(o, p){', 'function choose('),
  cut('function dmg(att, def, move){', 'function clash('),
].join('\n');
const G = new Function('venue', 'SFX', code + '\nreturn {BREEDS, BLADES, STYLES, MOVES, statsOf, aiPick, resolve, pick};')(
  () => ({ rule: null }), { tink() {} });
const { BREEDS, BLADES, STYLES, MOVES, statsOf, aiPick, resolve, pick } = G;
const SMART = process.env.SMART !== '0';   // the game aims its bluffs once you trust the tell twice in a row
const N = +(process.argv[2] || 200), LV = +(process.argv[3] || 5), ROUNDS = 3, CALLS = 4;
const fighter = (b) => { const e = { breed: b.breed, level: LV, look: { size: 1 }, tr: { pow: 0, spd: 0, bal: 0, sta: 0 } }, st = statsOf(e);
  return { name: 'x', breed: BREEDS[b.breed], blade: BLADES[b.blade], style: STYLES[b.style], kd: 100, loose: false, level: LV,
    pow: st.pow, spd: st.spd, bal: st.bal, spiritMax: st.spiritMax, spirit: st.spiritMax, staMax: st.staMax, stam: st.staMax, mods: { dmg: 1, drain: 1, taken: 1 }, history: [] }; };
const ctr = m => Object.keys(MOVES).find(x => MOVES[x].beats === m);
const aiCorner = (me, other) => { me.mods = { dmg: 1, drain: 1, taken: 1 }; me.stam = Math.min(me.staMax, me.stam + 8 + 30);
  if (me.loose) { me.loose = false; me.kd = 40; } else me.kd = Math.min(100, me.kd + 12);
  if (me.spirit < other.spirit) { me.mods.dmg *= 1.15; me.mods.drain *= 1.2; } else me.mods.taken = .85; };
// policy for side P: 'ai' = same picker as the computer, 'tell' = always counter the rival's tell, or a fixed move
function fight(pb, ob, policy = 'ai') {
  const f = { p: fighter(pb), o: fighter(ob), follow: 0 }; let calls = 0;
  for (let r = 1; r <= ROUNDS; r++) {
    for (let c = 1; c <= CALLS; c++) {
      calls++;
      const om = aiPick(f.o, f.p);
      let pm;
      if (policy === 'ai') { pm = aiPick(f.p, f.o); f.o.history.push(om); }
      else if (policy === 'tell' || policy === 'tell2') { const acc = Math.min(.9, Math.max(.35, f.o.breed.tell - Math.min(.1, (LV - 1) * .015) - (f.follow >= 2 ? .15 : 0)));
        const bluff = Math.random() >= acc, smart = bluff && f.follow >= 2 && SMART;   // what-if: a smart bluff picks the tell whose counter loses to the real move
        const tell = !bluff ? om : smart ? Object.keys(MOVES).find(t => ctr(t) === MOVES[om].beats) : pick(Object.keys(MOVES).filter(m => m !== om)); pm = policy === 'tell2' && f.follow >= 2 ? aiPick(f.p, f.o) : ctr(tell); f.follow = pm === ctr(tell) ? f.follow + 1 : 0; }
      else pm = policy;
      resolve(f, pm, om);
      if (f.p.spirit <= 0 || f.o.spirit <= 0) return { w: f.o.spirit <= 0 ? 1 : 0, ko: 1, calls };
    }
    if (r < ROUNDS) { aiCorner(f.o, f.p); aiCorner(f.p, f.o); }
  }
  const d = f.p.spirit - f.o.spirit; return { w: d > 0 ? 1 : d < 0 ? 0 : .5, ko: 0, calls };
}
const builds = []; for (const breed in BREEDS) for (const blade in BLADES) for (const style in STYLES) builds.push({ breed, blade, style });
const tally = new Map(); let fights = 0, kos = 0, calls = 0;
for (const a of builds) for (const b of builds) { let w = 0; for (let i = 0; i < N; i++) { const r = fight(a, b); w += r.w; kos += r.ko; calls += r.calls; fights++; }
  const k = `${a.breed}|${a.blade}|${a.style}`; tally.set(k, (tally.get(k) || 0) + w / N / builds.length); }
const marg = idx => { const m = {}; for (const [k, v] of tally) { const key = k.split('|')[idx]; (m[key] ||= []).push(v); }
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, +(100 * v.reduce((s, x) => s + x, 0) / v.length).toFixed(1)])); };
const sorted = [...tally].sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, +(100 * v).toFixed(1)]);
const vsAI = pol => { let w = 0, n = 0; for (const a of builds) for (const b of builds) for (let i = 0; i < 20; i++) { w += fight(a, b, pol).w; n++; } return +(100 * w / n).toFixed(1); };
const tellByBreed = {}; for (const ob in BREEDS) { let w = 0, n = 0; for (const a of builds) for (const b of builds.filter(x => x.breed === ob)) for (let i = 0; i < 20; i++) { w += fight(a, b, 'tell').w; n++; } tellByBreed[ob] = +(100 * w / n).toFixed(1); }
console.log(JSON.stringify({ level: LV, fightsPerPair: N, fights, koRate: +(100 * kos / fights).toFixed(1), avgCalls: +(calls / fights).toFixed(1),
  breed: marg(0), blade: marg(1), style: marg(2), bestBuilds: sorted.slice(0, 5), worstBuilds: sorted.slice(-5),
  playerVsAI: { sameAsAI: vsAI('ai'), readsTell: vsAI('tell'), readsTellButMixes: vsAI('tell2'), alwaysJump: vsAI('jump'), alwaysBlock: vsAI('block'), alwaysDodge: vsAI('dodge') },
  readsTellByRivalBreed: tellByBreed }, null, 1));
