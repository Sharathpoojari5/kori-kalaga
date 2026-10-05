// Records trailer footage from the running game on the emulator.
// usage: node tools/kori-trailer.mjs <take-name> [ui=0|1] [venue=temple|paddy|night] [bitrateMbps=14]
// Writes trailer/raw/<take>.mp4 and <take>.json (time markers, seconds from the start of the recording).
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { connect, sh, sleep, out, errors } from '/tmp/kori-lib.mjs';
const ADB = process.env.HOME + '/Library/Android/sdk/platform-tools/adb';
const ROOT = '/Users/sharath/money game/kori-kalaga-app/trailer/raw';
const take = process.argv[2] || 'take1', ui = process.argv[3] === '1', venue = process.argv[4] || 'temple', mbps = +(process.argv[5] || 14);
const click = (c, sel) => c.ev(`(()=>{const e=document.querySelector('${sel}');if(e&&!e.hidden&&e.offsetParent&&!e.disabled){e.click();return true}return false})()`);
const marks = []; let T0 = 0; const mark = k => { marks.push({ k, t: +((Date.now() - T0) / 1000).toFixed(2) }); out('mark', { k, t: marks.at(-1).t }); };
(async () => {
  sh('shell am force-stop com.korikalaga.app'); sh('shell am start -n com.korikalaga.app/.MainActivity'); await sleep(3000);
  let c = await connect();
  await c.ev(`(()=>{localStorage.removeItem('kori-tier');localStorage.removeItem('kori-tier-force');const s=JSON.parse(localStorage.getItem('kori-kalaga-v2'));s.tut=99;s.seenIntro=true;s.venue='${venue}';s.coins=900;s.grounds={};s.ground=null;s.birds.forEach(b=>{b.cond=100;b.acted=false});localStorage.setItem('kori-kalaga-v2',JSON.stringify(s));Storage.prototype.setItem=function(){};setTimeout(()=>location.reload(),50);})()`);
  await sleep(3500); c = await connect();
  if (!ui) await c.ev(`(()=>{const s=document.createElement('style');s.id='trailerCss';s.textContent='#fight.live .hud,#fight.live .dock,#fight.live #log,#fight.live .leave,#fight.live #soundBtn,#toast,#tip,#ringLoad{visibility:hidden!important}#fight.live .dock{position:absolute!important;left:0;right:0;bottom:0}#fight.live .stage{flex:none!important;position:absolute!important;inset:0!important;height:100%!important}';document.head.appendChild(s);})()`);
  // start the screen recording
  sh('shell rm -f /sdcard/trailer.mp4');
  const rec = spawn(ADB, ['shell', 'screenrecord', '--bit-rate', String(mbps * 1e6), '--time-limit', '180', '/sdcard/trailer.mp4'], { stdio: 'ignore' });
  await sleep(1200); T0 = Date.now(); mark('rec');
  await c.tap('#splashGo'); mark('village'); await sleep(7000);
  await c.tap('[data-v="battle"]'); await sleep(3500); mark('ground');
  await c.tap('.chall'); await sleep(1500);
  if (!ui) await c.ev(`(()=>{const s=document.getElementById('trailerCss');s.textContent=s.textContent.replace('#fight.live .dock,','')})()`);
  await click(c, '#fightBtn'); mark('intro');
  if (!ui) await c.ev(`window.dispatchEvent(new Event('resize'))`);
  // let the whole entrance play; there is no skip in this take
  for (let i = 0; i < 160; i++) { if (await c.ev(`(()=>{const b=document.querySelector('#relBtn');return !!(b&&b.offsetParent&&getComputedStyle(b).visibility!=='hidden')||G3.state().phase==='pit'||G3.state().phase==='release'})()`)) break; await sleep(250); }
  mark('pit'); await sleep(4000);
  await click(c, '#relBtn'); mark('release'); await sleep(2500);
  let calls = 0, doneAt = 0; const t1 = Date.now();
  while (Date.now() - t1 < 140000) {
    await sleep(200);
    const st = JSON.parse(await c.ev('JSON.stringify({ph:G3.state().phase})') || '{}');
    if (st.ph === 'done') { if (!doneAt) { doneAt = Date.now(); mark('done'); } if (Date.now() - doneAt > 11000) break; continue; }
    if (await c.ev(`!!document.querySelector('.move:not([disabled])')`)) { calls++; mark('call' + calls); await c.ev(`(()=>{const m=[...document.querySelectorAll('.move:not([disabled])')];m[Math.floor(Math.random()*m.length)].click()})()`); await sleep(500); continue; }
    if (await c.ev(`(()=>{const b=document.querySelector('#cornerGo');return !!(b&&b.offsetParent)})()`)) { mark('corner'); await click(c, '#cornerGo'); }
  }
  mark('end');
  sh('shell pkill -2 screenrecord'); await sleep(2500); try { rec.kill(); } catch (e) {}
  sh(`pull /sdcard/trailer.mp4 "${ROOT}/${take}.mp4"`);
  writeFileSync(`${ROOT}/${take}.json`, JSON.stringify({ take, ui, venue, calls, marks, errors: errors.filter(e => !/safe area/.test(e)).slice(0, 5) }, null, 1));
  out('saved', { take, calls });
  process.exit(0);
})().catch(e => { out('FATAL', String(e.stack || e).slice(0, 400)); sh('shell pkill -2 screenrecord'); process.exit(1); });
