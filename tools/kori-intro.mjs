import { connect, sh, sleep, out, errors } from '/tmp/kori-lib.mjs';
const click = (c, sel) => c.ev(`(()=>{const e=document.querySelector('${sel}');if(e&&!e.hidden&&e.offsetParent&&!e.disabled){e.click();return true}return false})()`);
const D = '/Users/sharath/money game/kori-kalaga-app/shots';
const snap = n => { sh(`shell screencap -p /sdcard/s.png`); sh(`pull /sdcard/s.png "${D}/${n}.png"`); };
const venue = process.argv[2] || 'temple', shots = (process.argv[3] || '.08,.22,.3,.38,.46,.55,.64,.7,.8,.9').split(',').map(Number);
(async () => {
  sh('shell am force-stop com.korikalaga.app'); sh('shell am start -n com.korikalaga.app/.MainActivity'); await sleep(3000);
  const c = await connect();
  await c.ev(`(()=>{const s=JSON.parse(localStorage.getItem('kori-kalaga-v2'));s.tut=99;s.seenIntro=true;s.venue='${venue}';s.coins=Math.max(s.coins||0,600);s.grounds={};s.ground=null;s.birds.forEach(b=>{b.cond=100;b.acted=false});localStorage.setItem('kori-kalaga-v2',JSON.stringify(s));Storage.prototype.setItem=function(){};setTimeout(()=>location.reload(),50);})()`);
  await sleep(3500);
  const c2 = await connect();
  await c2.tap('#splashGo'); await sleep(1200);
  await c2.tap('[data-v="battle"]'); await sleep(3500);
  await c2.tap('.chall'); await sleep(800);
  out('browse', await c2.ev('JSON.stringify({n:document.querySelectorAll(".chall").length,coins:JSON.parse(localStorage.getItem("kori-kalaga-v2")).coins,btn:document.querySelector("#fightBtn").textContent,dis:document.querySelector("#fightBtn").disabled,ph:G3.state().phase,fps:G3.state().fps,tris:G3.state().tris})'));
  const t0 = Date.now(); await click(c2, '#fightBtn');
  let si = 0, last = -1; const log = [];
  while (Date.now() - t0 < 30000) {
    const s = JSON.parse(await c2.ev('JSON.stringify(G3.state())') || '{}');
    log.push([Date.now() - t0, s.u == null ? null : +s.u.toFixed(3), s.fps]);
    if (s.u == null && last > .5) break;
    if (s.u != null) last = s.u;
    if (si < shots.length && s.u != null && s.u >= shots[si]) { snap(`i_${venue}_${String(si).padStart(2,'0')}_${shots[si]}`); si++; }
    await sleep(120);
  }
  out('timeline', log.filter((x, i) => i % 3 === 0));
  out('prof', JSON.parse(await c2.ev('JSON.stringify(G3.readProf())')));
  out('errs', errors.filter(e => !/safe area/.test(e)).slice(0, 6));
  process.exit(0);
})().catch(e => { out('FATAL', String(e.stack || e).slice(0, 400)); process.exit(1); });
