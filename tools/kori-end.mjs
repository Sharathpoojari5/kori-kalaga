import { connect, sh, sleep, out, errors } from '/tmp/kori-lib.mjs';
const click = (c, sel) => c.ev(`(()=>{const e=document.querySelector('${sel}');if(e&&!e.hidden&&e.offsetParent&&!e.disabled){e.click();return true}return false})()`);
const D = '/Users/sharath/money game/kori-kalaga-app/shots';
const snap = n => { sh(`shell screencap -p /sdcard/s.png`); sh(`pull /sdcard/s.png "${D}/${n}.png"`); };
const force = process.argv[2] || '';
(async () => {
  sh('shell am force-stop com.korikalaga.app'); sh('shell am start -n com.korikalaga.app/.MainActivity'); await sleep(3000);
  const c = await connect();
  await c.ev(`(()=>{localStorage.removeItem('kori-tier');${force !== '' ? `localStorage.setItem('kori-tier-force','${force}');` : `localStorage.removeItem('kori-tier-force');`}const s=JSON.parse(localStorage.getItem('kori-kalaga-v2'));s.tut=99;s.seenIntro=true;s.venue='temple';s.coins=900;s.grounds={};s.ground=null;s.birds.forEach(b=>{b.cond=100;b.acted=false});localStorage.setItem('kori-kalaga-v2',JSON.stringify(s));Storage.prototype.setItem=function(){};setTimeout(()=>location.reload(),50);})()`);
  await sleep(3500);
  const c2 = await connect();
  await c2.tap('#splashGo'); await sleep(1200); await c2.tap('[data-v="battle"]'); await sleep(3500); await c2.tap('.chall'); await sleep(800);
  snap('e_0_browse');
  out('prof0', await c2.ev('JSON.stringify(G3.readProf())'));
  await click(c2, '#fightBtn'); await sleep(3500); snap('e_1_intro');
  await click(c2, '#skipIntro');
  for (let i=0;i<40;i++){ if (await c2.ev(`(()=>{const b=document.querySelector('#relBtn');return !!(b&&b.offsetParent)})()`)) break; await sleep(250); }
  await sleep(1500); snap('e_2_pit'); await click(c2, '#relBtn'); await sleep(2500); snap('e_3_fight');
  let calls = 0, t1 = Date.now(), doneAt = 0, k = 0, kq = 0, koAt = 0; const fps = [];
  while (Date.now() - t1 < 150000) {
    await sleep(250);
    const st = JSON.parse(await c2.ev('JSON.stringify({ph:G3.state().phase,fps:G3.state().fps})') || '{}'); fps.push(st.fps);
    if (!doneAt && calls > 1 && await c2.ev(`[...document.querySelectorAll('[data-f="spv"]')].some(e=>e.textContent.trim()==='0')`)){ if (!koAt) koAt = Date.now(); }
    if (koAt && !doneAt && kq < 12 && Date.now() - koAt > kq*350){ snap('e_ko_' + String(kq).padStart(2,'0')); kq++; }
    if (st.ph === 'done'){ if (!doneAt) doneAt = Date.now(); if (k < 14 && Date.now() - doneAt > k*500) { snap('e_done_' + String(k).padStart(2, '0')); k++; } if (k >= 14) break; continue; }
    if (await c2.ev(`!!document.querySelector('.move:not([disabled])')`)) { calls++; await c2.ev(`(()=>{const m=[...document.querySelectorAll('.move:not([disabled])')];m[Math.floor(Math.random()*m.length)].click()})()`); if (calls === 2){ await sleep(500); snap('e_4_clash'); } continue; }
    if (await c2.ev(`(()=>{const b=document.querySelector('#cornerGo');return !!(b&&b.offsetParent)})()`)) { if (!k && calls > 3 && !doneAt){ snap('e_5_corner'); } await click(c2, '#cornerGo'); }
  }
  out('end', {calls, minFps:Math.min(...fps.filter(Boolean)), prof:JSON.parse(await c2.ev('JSON.stringify(G3.readProf())')), errs:errors.filter(e => !/safe area/.test(e)).slice(0, 5)});
  process.exit(0);
})().catch(e => { out('FATAL', String(e.stack || e).slice(0, 400)); process.exit(1); });
