import { connect, sh, sleep, out, errors } from '/tmp/kori-lib.mjs';
const rate = +(process.argv[2] || 6);
(async () => {
  sh('shell am force-stop com.korikalaga.app'); sh('shell am start -n com.korikalaga.app/.MainActivity'); await sleep(3000);
  const c = await connect();
  await c.send('Emulation.setCPUThrottlingRate', { rate });
  await c.ev(`(()=>{const s=JSON.parse(localStorage.getItem('kori-kalaga-v2'));if(s){s.tut=99;s.seenIntro=true;s.grounds={};localStorage.setItem('kori-kalaga-v2',JSON.stringify(s));}window.__lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))).observe({type:'longtask',buffered:true})}catch(e){}})()`);
  const visible = sel => `(()=>{const e=document.querySelector(${JSON.stringify(sel)});return !!(e&&!e.hidden&&e.offsetParent)})()`;
  const step = async (name, sel, wait) => {
    const t0 = Date.now(); const ok = await c.tap(sel); if (!ok) { out(name, 'no target'); return; }
    let ms = -1; for (let i = 0; i < 200; i++) { if (await c.ev(visible(wait))) { ms = Date.now() - t0; break; } await sleep(30); }
    out(name, ms + 'ms'); await sleep(600);
  };
  const fps = async n => { const f = await c.ev(`new Promise(r=>{let k=0,t=performance.now();const L=()=>{if(++k<30)requestAnimationFrame(L);else r(Math.round(30000/(performance.now()-t)))};requestAnimationFrame(L)})`); out(n + ' fps', f); };
  await fps('splash');
  await step('splashGo->village', '#splashGo', '[data-v="battle"]'); await fps('village');
  await step('battle', '[data-v="battle"]', '.chall'); await fps('ground list');
  await step('challenger', '.chall', '#fightBtn'); await fps('browse');
  out('longtasks', await c.ev('JSON.stringify(window.__lt)'));
  out('errs', errors.slice(0, 3));
  process.exit(0);
})().catch(e => { out('FATAL', String(e.stack || e).slice(0, 400)); process.exit(1); });
