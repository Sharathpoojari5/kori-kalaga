import { connect, sh, sleep, out, errors } from '/tmp/kori-lib.mjs';
const click = (c, sel) => c.ev(`(()=>{const e=document.querySelector('${sel}');if(e&&!e.hidden&&e.offsetParent&&!e.disabled){e.click();return true}return false})()`);
const D = '/Users/sharath/money game/kori-kalaga-app/shots';
const snap = n => { sh(`shell screencap -p /sdcard/s.png`); sh(`pull /sdcard/s.png "${D}/${n}.png"`); };
(async () => {
  sh('shell am force-stop com.korikalaga.app'); sh('shell am start -n com.korikalaga.app/.MainActivity'); await sleep(3000);
  const c = await connect();
  await c.ev(`(()=>{const s=JSON.parse(localStorage.getItem('kori-kalaga-v2'));s.tut=99;s.seenIntro=true;s.venue='temple';s.coins=900;s.grounds={};s.ground=null;s.birds.forEach(b=>{b.cond=100;b.acted=false});localStorage.setItem('kori-kalaga-v2',JSON.stringify(s));Storage.prototype.setItem=function(){};setTimeout(()=>location.reload(),50);})()`);
  await sleep(3500);
  const c2 = await connect();
  await c2.tap('#splashGo'); await sleep(1200); await c2.tap('[data-v="battle"]'); await sleep(3500); await c2.tap('.chall'); await sleep(800);
  await click(c2, '#fightBtn'); await sleep(500); await click(c2, '#skipIntro');
  for (let i=0;i<40;i++){ if (await c2.ev(`(()=>{const b=document.querySelector('#relBtn');return !!(b&&b.offsetParent)})()`)) break; await sleep(250); }
  const t0 = Date.now(); let n = 0;
  for (const ms of [300, 900, 1300, 1700, 2000, 2800, 3400, 4600, 5400]){ while (Date.now() - t0 < ms) await sleep(30); snap('p_rel_' + (n++)); }
  await click(c2, '#relBtn'); await sleep(1200); snap('p_fight0');
  let calls = 0; const t1 = Date.now();
  while (Date.now() - t1 < 60000 && calls < 3) {
    await sleep(300);
    if (await c2.ev(`!!document.querySelector('.move:not([disabled])')`)) { calls++; await c2.ev(`(()=>{const m=[...document.querySelectorAll('.move:not([disabled])')];m[Math.floor(Math.random()*m.length)].click()})()`); for (const ms of [250, 450, 650, 900, 1200]) { await sleep(ms === 250 ? 250 : 200); snap(`p_clash${calls}_${ms}`); } }
  }
  out('errs', errors.filter(e => !/safe area/.test(e)).slice(0, 6));
  process.exit(0);
})().catch(e => { out('FATAL', String(e.stack || e).slice(0, 400)); process.exit(1); });
