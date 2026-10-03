# Builds src/game.html: applies the 3D renderer (g3/*.js) and the fight-screen fixes to base.html.
# Usage: python3 patch_3d.py <output.html>  (the output must start as a copy of base.html)
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
p = sys.argv[1]; s = open(p).read()
g3 = ''.join(open(os.path.join(HERE, 'g3', f)).read() + '\n' for f in ['partA.js','partA2.js','partB.js','partB2.js','partC.js','partC2.js','partH.js','partP.js','partD.js','partD2.js','partF.js','partD3.js'])
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:80]); s = s.replace(a, b)
rep('<script>\n(() => {', '<script src="https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js"></script>\n<script>\n(() => {')
rep('// ---------- Fight ----------', g3 + 'window.G3 = G3;\n// ---------- Fight ----------')
rep("  H = Math.round(clamp(W*.7, 260, 460));", "  if (G3.ok) G3.init();\n  H = Math.round(clamp(W*(G3.on ? .84 : .7), 270, G3.on ? 540 : 460));")
rep("  ctx.setTransform(DPR,0,0,DPR,0,0);\n  makeBackground(); makeCrowd();", "  ctx.setTransform(DPR,0,0,DPR,0,0);\n  if (G3.on) G3.resize(W, H);\n  makeBackground(); makeCrowd();")
rep("  if (!$('#fight').hidden){\n    const shake =", """  if (!$('#fight').hidden && G3.on){
    ctx.clearRect(0, 0, W, H); G3.frame(now); drawIntroOverlay(ctx, now);
    if (F) for (const f of [F.p, F.o]) if (f) f.anim.anger += ((f.anim.target ?? .3) - f.anim.anger)*Math.min(1, dt*4);
  } else if (!$('#fight').hidden){
    const shake =""")
rep("function clash(pm, om, winner){\n", "function clash(pm, om, winner){\n  if (G3.on) return G3.clash(pm, om, winner);\n")
rep("  if (u < U_FLY && !reduceMotion){", "  if (u < U_FLY && !reduceMotion && !G3.on){")
rep("  $('#roundLbl').textContent = `Round ${F.round} of ${ROUNDS}`;", "  $('#roundLbl').textContent = `Round ${Math.min(F.round, ROUNDS)} of ${ROUNDS}`;")
rep("    const dur = reduceMotion ? 2600 : 9800,", "    const dur = reduceMotion ? 2600 : (G3.on ? 16000 : 9800),")
rep("t0 = performance.now(); let done = false, said = false; const marks", "t0 = performance.now(); let done = false, said = false, el = 0, lastT = t0; const marks")
rep("      const u = fight.introU = clamp((performance.now()-t0)/dur, 0, 1);", "      const nT = performance.now(); el = window.__introU != null ? window.__introU*dur : el + Math.min(nT - lastT, 100); lastT = nT;\n      const u = fight.introU = clamp(el/dur, 0, 1);")
open(p, 'w').write(s); print('ok', len(s))

# ---------- fight screen layout: the ring fills the screen, stats float over it, the buttons sit in a fixed panel ----------
s = open(__import__('sys').argv[1]).read()
def rep2(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:80]); s = s.replace(a, b)
rep2("@media (prefers-reduced-motion:reduce){.bar i{transition:none}}", r'''/* fight mode: full-height ring, floating stats, fixed-height controls */
:root{--dockH:clamp(190px,30vh,290px)}
#fight.live{position:fixed;inset:0;margin:0 auto;max-width:760px;z-index:30;background:var(--night);display:flex;flex-direction:column;overflow:hidden;padding:0}
#fight.live .stage{flex:1 1 auto;min-height:0;margin:0;border-radius:0;border:0}
#fight.live .stage canvas{position:absolute;inset:0;width:100%;height:100%}
#fight.live .stage.nopost::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse at 50% 46%,transparent 52%,rgba(8,4,16,.5) 100%)}
#fight.live .hud{position:absolute;top:calc(env(safe-area-inset-top,0px) + 6px);left:8px;right:8px;z-index:4;gap:6px;pointer-events:none;grid-template-columns:1fr auto 1fr}
#fight.live .fcard{background:rgba(18,12,34,.58);padding:5px 8px 6px;gap:3px;border-radius:10px;backdrop-filter:blur(2px)}
#fight.live .fname{font-size:13px}
#fight.live .fmeta,#fight.live .barlbl{display:none}
#fight.live .bar{height:6px}#fight.live .bar.kt{height:3px}
#fight.live .roundbox{grid-column:auto;grid-row:auto;display:grid;background:rgba(18,12,34,.58);padding:4px 8px;font-size:11px;border-radius:10px}
#fight.live .roundbox span:last-child{font-size:10px}
#fight.live .snd{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 74px);right:8px;font-size:11px;padding:2px 9px}
#fight.live .dock{margin:0;border-radius:18px 18px 0 0;height:var(--dockH);overflow:auto;align-content:center;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));gap:8px;flex:0 0 auto;box-shadow:0 -8px 24px rgba(0,0,0,.35)}
#fight.live .dock h3{font-size:17px}
#fight.live .prompt{font-size:15px;line-height:1.3}
#fight.live .move{padding:9px 4px;border-radius:12px}
#fight.live .move strong{font-size:15px}#fight.live .move span{font-size:11px}#fight.live .move kbd{display:none}
#fight.live .btn{padding:10px 14px;font-size:16px}
#fight.live .cgrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
#fight.live .cact{padding:7px 4px}#fight.live .cact span{display:none}
#fight.live .result h3{font-size:22px}
#fight.live .log{margin:0;padding:3px 14px;font-size:13px;flex:0 0 auto;background:var(--night)}
#fight.live .log li{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#fight.live .log li:not(:first-child){display:none}
#fight.live .leave{margin:0;padding:2px 0 calc(4px + env(safe-area-inset-bottom,0px));background:var(--night);flex:0 0 auto}
#fight.live .leave .link{font-size:12px}
#fight.live .tip{position:absolute;left:10px;right:10px;bottom:calc(var(--dockH) + 56px);margin:0;z-index:6}
#dResult{transition:opacity .7s}#fight.cine #dResult{opacity:0;pointer-events:none}
@media (prefers-reduced-motion:reduce){.bar i{transition:none}}''')
rep2("  $('#hud').hidden = id === 'dGround';\n", "  $('#hud').hidden = id === 'dGround';\n  { const f = $('#fight'), was = f.classList.contains('live'), now = id !== 'dGround'; f.classList.toggle('live', now); if (was !== now && !f.hidden) requestAnimationFrame(sizeCanvas); }\n")
rep2("  $$('.screen').forEach(s => s.hidden = s.id !== id);", "  if (id !== 'fight') $('#fight').classList.remove('live');\n  $$('.screen').forEach(s => s.hidden = s.id !== id);")
rep2("  W = cv.parentElement.clientWidth || 600;\n", "  const live = $('#fight').classList.contains('live');\n  W = cv.parentElement.clientWidth || 600;\n")
rep2("  H = Math.round(clamp(W*(G3.on ? .84 : .7), 270, G3.on ? 540 : 460));\n  cv.width = W*DPR; cv.height = H*DPR; cv.style.height = H+'px';",
     "  H = live ? Math.max(240, cv.parentElement.clientHeight || 420) : Math.round(clamp(W*(G3.on ? .84 : .7), 270, G3.on ? 540 : 460));\n  cv.width = W*DPR; cv.height = H*DPR; cv.style.height = live ? '100%' : H+'px';")
rep2("  $('#hud').hidden = id === 'dGround';\n  {", "  $('#hud').hidden = id === 'dGround';\n  if (id !== 'dResult') $('#fight').classList.remove('cine');\n  {")
rep2("  dock('dResult'); hud();\n}\n$('#again')", "  dock('dResult'); hud();\n  if (outcome !== 'withdraw'){ const fl = $('#fight'); fl.classList.add('cine'); setTimeout(() => { if (F === fight) fl.classList.remove('cine'); }, outcome.startsWith('ko') ? 4800 : 3000); }\n}\n$('#again')")
rep2("  if (!$('#fight').hidden && G3.on){\n    ctx.clearRect(0, 0, W, H); G3.frame(now);", "  if (!$('#fight').hidden && G3.on){\n    const rl = $('#ringLoad');\n    if (!G3.ready()){ if (rl.hidden){ rl.hidden = false; requestAnimationFrame(frame); return; } }\n    ctx.clearRect(0, 0, W, H); G3.frame(now); if (!rl.hidden) rl.hidden = true;")
rep2("showTop(); sizeCanvas(); renderStable(); requestAnimationFrame(frame);", "showTop(); sizeCanvas(); renderStable(); requestAnimationFrame(frame);\nsetTimeout(() => { const go = () => { try { G3.prewarm && G3.prewarm(); } catch(e) {} }; (window.requestIdleCallback || (f => setTimeout(f, 50)))(go, {timeout: 2500}); }, 1800);")
rep2("<canvas id=\"cv\" aria-label=\"Festival ground\">", "<div id=\"ringLoad\" hidden><i></i><span>Preparing the ring…</span></div><canvas id=\"cv\" aria-label=\"Festival ground\">")
rep2("#dResult{transition:opacity .7s}", "#ringLoad{position:absolute;inset:0;z-index:8;background:#1a1230;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#f6ecd9;font-weight:700}#ringLoad[hidden]{display:none}#ringLoad i{width:34px;height:34px;border-radius:50%;border:4px solid #4a3a78;border-top-color:#f4a62a;animation:rls 0.9s linear infinite}@keyframes rls{to{transform:rotate(360deg)}}\n#dResult{transition:opacity .7s}")
_a = "  const c = yctx; c.setTransform(d,0,0,d,0,0);\n"; _b = "  const n = save.birds.length, s = clamp(w/(n*150)"
_i = s.index(_a); _j = s.index(_b, _i); _blk = s[_i+len(_a):_j]; assert 'now' not in _blk.replace('const','')
s = s[:_i] + "  const c = yctx;\n  if (!yBG || yBG.width !== ycv.width || yBG.height !== ycv.height){ yBG = document.createElement('canvas'); yBG.width = ycv.width; yBG.height = ycv.height; drawYardBG(yBG.getContext('2d'), w, h, d); }\n  c.setTransform(1,0,0,1,0,0); c.drawImage(yBG, 0, 0); c.setTransform(d,0,0,d,0,0);\n" + s[_j:]
s = s.replace("function drawYard(now){", "let yBG = null, yardT = 0;\nfunction drawYardBG(c, w, h, d){\n  c.setTransform(d,0,0,d,0,0);\n" + _blk + "}\nfunction drawYard(now){", 1)
rep2("  if (!$('#home').hidden) drawYard(now);", "  if (!$('#home').hidden && $('#village').hidden && $('#splash').hidden && $('#opening').hidden && now - yardT > 38){ yardT = now; drawYard(now); }")
open(__import__('sys').argv[1], 'w').write(s)
