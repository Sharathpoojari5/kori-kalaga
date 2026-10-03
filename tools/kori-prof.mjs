import { connect, sh, sleep, out } from '/tmp/kori-lib.mjs';
const rate = +(process.argv[2] || 6), target = process.argv[3] || '[data-v="battle"]';
(async () => {
  sh('shell am force-stop com.korikalaga.app'); sh('shell am start -n com.korikalaga.app/.MainActivity'); await sleep(3000);
  const c = await connect();
  await c.ev(`(()=>{const s=JSON.parse(localStorage.getItem('kori-kalaga-v2'));if(s){s.tut=99;s.seenIntro=true;s.grounds={};localStorage.setItem('kori-kalaga-v2',JSON.stringify(s));}})()`);
  await c.tap('#splashGo'); await sleep(1500);
  await c.send('Emulation.setCPUThrottlingRate', { rate });
  await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 1000 }); await c.send('Profiler.start');
  await sleep(+(process.argv[4]||0)); const t0 = Date.now(); await c.tap(target);
  for (let i = 0; i < 400; i++) { if (await c.ev(`!!document.querySelector('.chall')`)) break; await sleep(50); }
  out('ms', Date.now() - t0);
  const r = await c.send('Profiler.stop'); const p = r.result.profile, self = new Map(), byId = new Map(p.nodes.map(n => [n.id, n]));
  const dt = p.timeDeltas; for (let i = 0; i < p.samples.length; i++) { const n = byId.get(p.samples[i]); const k = n.callFrame.functionName + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); }
  out('top', [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + ' ' + Math.round(v / 1000) + 'ms'));
  process.exit(0);
})().catch(e => { out('FATAL', String(e.stack || e).slice(0, 400)); process.exit(1); });
