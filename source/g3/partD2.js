// ---- what everyone does in each phase
const duel = {c:V3(), a:0, w:.25, r:.36, tN:0, feintT:0};
function enterPhase(ph, prev){
  const P = A3.birds.p, O = A3.birds.o, mp = A3.men.p, mo = A3.men.o;
  if (ph === 'browse'){ flushTracks(); A3.busy = false; for (const k of [P, O]) if (k) homeBird(k); for (const m of [mp, mo]) if (m) homeMan(m); A3.wanderT = 0; resetSand(); }
  if (ph === 'intro'){
    flushTracks(); A3.busy = false; resetSand(); A3.introCut = false; A3.lastShot = null;
    for (const [m, k, s] of [[mp, P, -1], [mo, O, 1]]){ if (!m || !k) continue; homeBird(k); m.pos.set(s*3.4, 0, s*.35); m.heading = s < 0 ? 0 : PI; initFeet(m, .11); m.hold = {mode:'carry'}; m.snap = true; k.held = null; k.kt = 0; m.goal = null; }
  }
  for (const m of [mp, mo]) if (m && ph !== 'intro') m.lock = false;
  for (const k of [P, O]) if (k && ph !== 'intro' && !k.ko) k.lock = false;
  if (ph !== 'intro'){ if (A3.tiers) for (const tm of Object.values(A3.tiers)){ tm.root.visible = false; tm.kit.visible = false; tm.threadLine.visible = false; } for (const k of [P, O]) if (k){ k.footTarget = null; } }
  if (ph === 'release'){ A3.pitT0 = null; for (const [m, k, s] of [[mp, P, -1], [mo, O, 1]]){ if (!m || !k) continue; m.hold = {mode:'ground'}; k.held = null; m.pos.set(s*1.0, 0, 0); m.goal = null; m.faceT = V3(0, 0, 0); k.pos.set(s*.58, 0, 0); k.goal = null; k.kt = 1; k.sheathOn = false; initFeet(k, .043*sizeOf(k)); } }
  if (ph === 'fight' && (prev === 'release' || prev === 'corner')){
    for (const [m, k, s] of [[mp, P, -1], [mo, O, 1]]){ if (!m || !k) continue;
      if (m.hold){ m.hold = null; if (k.held){ k.held = null; k.vy = 0; k.falling = true; } }
      m.palmTo = [null, null]; m.gripT = [.15, .15];
      m.goal = V3(s*(FR + .45), 0, s*.25); m.speed = 1.3; m.faceT = null; m.pt.pel = .92;
      k.goal = V3(s*.2, 0, 0); k.speed = .9; }
    duel.c.set(0, 0, 0); duel.a = 0; duel.r = .36;
  }
  if (ph === 'corner'){ A3.cornerStage = 'fetch'; for (const [m, s] of [[mp, -1], [mo, 1]]) if (m){ m.speed = 1.7; m.faceT = null; } }
  if (ph === 'done'){ A3.doneT = clock; A3.crowed = false; }
}
function birdIdle(k, other, dt, t){
  if (!k || k.ko || k.held || k.lock) return;
  if (other && !other.ko){
    k.faceT = other.pos; k.lookAt = other.headW;
    k.pt.neckOut = .78 + Math.sin(t*1.7 + k.ph)*.12; k.pt.flare = .55 + .35*Math.max(0, Math.sin(t*.9 + k.ph)); k.pt.crouch = .28 + Math.sin(t*2.1 + k.ph)*.08; k.pt.tail = .3; k.pt.wing = 0;
    k.headJit = {x:Math.sin(t*7.3 + k.ph)*.012, y:Math.sin(t*5.1 + k.ph)*.01};
    k.aim = Object.assign(k.aim || {}, {w:.6, amp:.6, sep:.16});
  } else { k.aim = null; k.faceT = null; k.lookAt = null; k.headJit = null; k.pt.flare = .1; k.pt.neckOut = .25; k.pt.crouch = 0; }
}
function updDuel(dt, t){
  const P = A3.birds.p, O = A3.birds.o; if (!P || !O || A3.busy) return;
  duel.tN -= dt;
  if (duel.tN <= 0){ duel.tN = rnd(1.2, 2.6); duel.w = pick([0, .35, -.35, .6, -.6, .15]); duel.r = rnd(.26, .44); const mv = V3(rnd(-.4,.4), 0, rnd(-.3,.3)); duel.cT = clampRing(duel.c.clone().add(mv), RING - .7); }
  if (duel.cT) duel.c.lerp(duel.cT, 1 - Math.exp(-.8*dt));
  duel.a += duel.w*dt;
  const u = V3(Math.cos(duel.a), 0, Math.sin(duel.a)*.7).normalize();
  duel.feintT -= dt; let fp = 0, fo = 0;
  if (duel.feintT <= 0){ duel.feintT = rnd(1.5, 3.5); A3.feint = {who:Math.random() < .5 ? 'p' : 'o', t0:t}; }
  if (A3.feint && t - A3.feint.t0 < .5){ const e = Math.sin((t - A3.feint.t0)/.5*PI)*.12; if (A3.feint.who === 'p') fp = e; else fo = e; }
  P.goal = duel.c.clone().addScaledVector(u, -duel.r/2 + fp); O.goal = duel.c.clone().addScaledVector(u, duel.r/2 - fo); P.speed = O.speed = .55;
}
const sstep = (a, b, x) => { const q = clamp((x - a)/(b - a), 0, 1); return q*q*(3 - 2*q); };
// the entrance, timed on u (0..1): walk in, squat, the katti tier ties the blade (pad, blade, thread turns, knot, sheath), show, set down
const IU = {walk:.15, squat:.2, tie0:.2, tie1:.62, up:.67, show1:.82};
function updIntro(dt, t){
  const u = F.introU ?? 1, P = A3.birds.p, O = A3.birds.o, mp = A3.men.p, mo = A3.men.o; if (!P || !O || !mp || !mo) return;
  for (const [m, k, s, other, side] of [[mp, P, -1, O, 'p'], [mo, O, 1, P, 'o']]){
    const start = V3(s*3.5, 0, s*.35), tieP = V3(s*1.2, 0, 0), show = V3(s*.62, 0, 0), scr = V3(s*1.0, 0, 0);
    let pos, mode = 'carry', pel = .92, bend = .08, face = V3(0, 0, 0); m.thrust = 0;
    if (u < IU.walk){ pos = start.clone().lerp(tieP, ease(u/IU.walk)); face = null; }
    else if (u < IU.squat){ pos = tieP; const e = (u - IU.walk)/(IU.squat - IU.walk); pel = lerp(.92, .46, ease(e)); bend = lerp(.08, .3, e); mode = 'tie'; }
    else if (u < IU.tie1){ pos = tieP; mode = 'tie'; pel = .46; bend = .3; }
    else if (u < IU.up){ pos = tieP; const e = clamp((u - IU.tie1)/(IU.up - IU.tie1), 0, 1); pel = lerp(.46, .92, ease(e)); bend = .12; }
    else if (u < IU.show1){ pos = tieP.clone().lerp(show, ease(clamp((u - IU.up)/.04, 0, 1))); mode = 'show';
      const th = Math.max(Math.sin(clamp((u - .71)/.035, 0, 1)*PI), Math.sin(clamp((u - .76)/.035, 0, 1)*PI)); m.thrust = th; bend = .15 + th*.22;
      k.pt.flare = .6 + th*.6; k.pt.neckOut = .7 + th*.3; k.pt.beak = th > .5 ? 1 : 0; k.pt.flap = th*.6; }
    else { const e = ease(clamp((u - IU.show1)/.045, 0, 1)); pos = show.clone().lerp(scr, e); if (e >= 1){ mode = 'ground'; pel = .46; bend = .4; } else bend = .15; }
    const dtS = Math.max(dt, 1e-3); m.vel.set(clamp((pos.x - m.pos.x)/dtS, -2.5, 2.5), 0, clamp((pos.z - m.pos.z)/dtS, -2.5, 2.5)); m.pos.copy(pos);
    m.lock = true; m.goal = null; m.faceT = face; m.lookAt = (u > IU.tie0 && u < IU.tie1 && k.katti) ? k.katti.getWorldPosition(V3()) : k.headW;
    if (!m.hold) m.hold = {mode}; else m.hold.mode = mode;
    m.pt.pel = pel; m.pt.bend = bend;
    if (mode === 'ground'){ const f = fwd(m.heading); k.pos.set(m.pos.x + f.x*.42, 0, m.pos.z + f.z*.42); k.heading = m.heading; k.lock = true; k.goal = null; k.faceT = null; k.vel.set(0,0,0); }
    else k.lock = false;
    k.lookAt = mode === 'tie' ? null : other.headW;
    // the tie itself
    const tu = clamp((u - IU.tie0)/(IU.tie1 - IU.tie0), 0, 1);
    k.kt = u < IU.tie0 ? 0 : tu < .1 ? 0 : tu < .22 ? (tu - .1)/.12*.3 : tu < .9 ? .3 + (tu - .22)/.68*.65 : Math.min(1, .95 + (tu - .9)*.5);
    k.sheathOn = tu > .95 && u < 1.01;
    k.footTarget = mode === 'tie' && u > IU.tie0 + .01 && u < IU.tie1 ? [(() => { const r = rightOf(k.heading), f = fwd(k.heading); return k.root.position.clone().add(V3(0, .1, 0)).addScaledVector(r, -.1).addScaledVector(f, .035); })(), null] : null;
    if (mode === 'tie'){ k.pt.flare = .15; k.pt.neckOut = .3; if (Math.random() < dt*.5) k.p.flap = 1; }
    if (u > IU.tie0 && u < IU.tie1 && tu > .22 && tu < .9 && Math.random() < dt*2.5) sfx(() => SFX.tink(s*.4));
    if (u >= IU.show1){ const rd = k.f.ready; k.pt.flare = rd ? .95 : .3; k.pt.neckOut = rd ? 1 : .35; k.pt.crouch = rd ? .45 : .1; }
    // the katti tier squats at the bird's left side, facing it: left hand holds the shank, right hand lays the blade and winds the thread
    const tm = syncTier(side), kit = tm.kit, hd = fwd(m.heading), lf = rightOf(m.heading).negate();
    const bP = tieP.clone().addScaledVector(hd, .3), tSpot = bP.clone().addScaledVector(lf, .42).addScaledVector(hd, .02), tStart = tSpot.clone().addScaledVector(hd, -1.3).addScaledVector(lf, .9);
    const vis = u > IU.walk*.5 && u < IU.show1; tm.root.visible = vis; kit.visible = u > IU.squat - .02 && u < IU.tie1 + .02;
    if (!vis){ tm.threadLine.visible = false; tm.spool.visible = false; continue; }
    let tp;
    if (u < IU.squat){ tp = tStart.clone().lerp(tSpot, ease(clamp((u - IU.walk*.5)/(IU.squat - IU.walk*.5), 0, 1))); tm.pt.pel = .92; tm.pt.bend = .08; }
    else if (u < IU.tie1){ tp = tSpot; tm.pt.pel = .45; tm.pt.bend = .36 + (tu > .9 ? .08 : 0); }
    else { tp = tSpot.clone().lerp(tStart, ease(clamp((u - IU.tie1)/(IU.show1 - IU.tie1), 0, 1))); tm.pt.pel = lerp(.45, .92, clamp((u - IU.tie1)/.03, 0, 1)); tm.pt.bend = .08; }
    tm.vel.set(clamp((tp.x - tm.pos.x)/dtS, -2.5, 2.5), 0, clamp((tp.z - tm.pos.z)/dtS, -2.5, 2.5)); tm.pos.copy(tp);
    const faceB = headingTo(tSpot, bP);
    tm.heading = u < IU.tie1 && u >= IU.squat - .01 ? faceB : (tm.vel.length() > .05 ? Math.atan2(-tm.vel.z, tm.vel.x) : faceB);
    kit.position.copy(tSpot).addScaledVector(rightOf(faceB), .3).addScaledVector(fwd(faceB), .16); kit.position.y = .006; kit.rotation.y = faceB;
    tm.hands = [null, null]; tm.palmTo = [null, null]; tm.gripT = [.2, .2]; tm.spool.visible = false; tm.threadLine.visible = false;
    if (u >= IU.tie0 && u < IU.tie1 && k.legs[0]){
      const shank = k.legs[0].shank, kp = k.katti.getWorldPosition(V3()), toT = V3().subVectors(tm.pos, kp).setY(0).normalize();
      const axis = V3(0, 1, 0).applyQuaternion(shank.getWorldQuaternion(new T3.Quaternion())), grabP = shank.localToWorld(V3(0, .072, 0));
      tm.lookAt = kp;
      tm.hands[0] = grabP.clone().addScaledVector(toT, .028).add(V3(0, .01, 0)); tm.palmTo[0] = grabP; tm.gripT[0] = .75;
      if (tu < .1){ const e = tu/.1; tm.hands[1] = kit.position.clone().add(V3(0, .04 + Math.sin(e*PI)*.12, 0)).lerp(kp.clone().addScaledVector(toT, .05), sstep(.6, 1, e)); tm.palmTo[1] = kit.position; tm.gripT[1] = e > .45 ? .55 : .15; }
      else if (tu < .22){ tm.hands[1] = kp.clone().addScaledVector(toT, .035).addScaledVector(axis, -.01); tm.palmTo[1] = kp; tm.gripT[1] = .5; }
      else if (tu < .9){ const a = (tu - .22)/.68*14*TAU, s1 = V3().crossVectors(axis, toT).normalize(), s2 = V3().crossVectors(s1, axis).normalize();
        tm.hands[1] = kp.clone().addScaledVector(s1, Math.sin(a)*.05).addScaledVector(s2, Math.cos(a)*.05 + .015).addScaledVector(axis, -.01 + (tu - .22)/.68*.025); tm.palmTo[1] = kp; tm.gripT[1] = .55; tm.spool.visible = true;
        if (k.tieTip){ const sp = tm.spool.getWorldPosition(V3()), lp = tm.threadLine.geometry.attributes.position; lp.setXYZ(0, sp.x, sp.y, sp.z); lp.setXYZ(1, k.tieTip.x, k.tieTip.y, k.tieTip.z); lp.needsUpdate = true; tm.threadLine.visible = true; } }
      else { const pull = Math.max(0, Math.sin((tu - .9)/.1*PI*3)); tm.hands[1] = kp.clone().addScaledVector(toT, .05 + pull*.05).add(V3(0, .03, 0)); tm.palmTo[1] = kp; tm.gripT[1] = .8; }
    } else tm.lookAt = k.headW;
  }
}
// aim each bird's head at the other's head (beak to beak), with the weave of an angry bird, a stab when it strikes and a snap back when it is hit
function aimStep(k, o, dt, t){
  const a = k.aim, tw = a && o && !o.ko && !k.ko && !k.held ? a.w : 0;
  k.headAimW = smooth(k.headAimW || 0, tw, 12, dt);
  if (k.headAimW < .01 || !a){ if (!a) k.headAimW = 0; k.headAim = null; return; }
  if (!o.headW) return;
  const hw = o.headW, mine = k.headW || hw, dv = V3().subVectors(mine, hw), l = dv.length() || 1;
  let sep = a.sep != null ? a.sep : .1;
  if (a.stab != null){ const e = clock - a.stab; if (e >= 0 && e < .3) sep -= Math.sin(e/.3*PI)*Math.max(0, sep - .03); }
  if (a.hit != null){ const e = clock - a.hit; if (e >= 0 && e < .45) sep += Math.exp(-e*7)*.12; }
  const amp = a.amp == null ? 1 : a.amp, w = t*(11 + k.ph);
  k.headAim = k.headAim || V3();
  k.headAim.copy(hw).addScaledVector(dv, sep/l); k.headAim.x += Math.sin(w)*.016*amp; k.headAim.y += Math.cos(w*1.3)*.014*amp; k.headAim.z += Math.sin(w*.9 + 1)*.016*amp;
}
// before the release: each handler holds his bird by the tail, brings the two close so they can see each other, lets them strain and snap,
// then draws them back; he does it again, and the bird that is ready lunges while the other may turn away. The release itself comes after.
const PIT = {T:3.7};
function updRelease(dt, t){
  const P = A3.birds.p, O = A3.birds.o, mp = A3.men.p, mo = A3.men.o; if (!P || !O || !mp || !mo) return;
  if (A3.pitT0 == null) A3.pitT0 = t;
  const e = ((t - A3.pitT0) % PIT.T)/PIT.T, dtS = Math.max(dt, 1e-3);
  let d, close = 0, wd = 0;
  if (e < .3) d = lerp(1.1, .27, ease(e/.3));
  else if (e < .62){ close = 1; d = .27 + Math.sin((e - .3)/.32*PI*5)*.014; }
  else if (e < .86){ wd = 1; d = lerp(.27, 1.1, ease((e - .62)/.24)); }
  else d = 1.1;
  const ph = Math.floor((t - A3.pitT0)/PIT.T);
  for (const [m, k, s, o] of [[mp, P, -1, O], [mo, O, 1, P]]){
    const bp = V3(s*d/2, 0, 0), hp = V3(s*(d/2 + .44), 0, 0), ready = !!(k.f && k.f.ready) || ph % 2 === 1;
    k.vel.set(clamp((bp.x - k.pos.x)/dtS, -1.4, 1.4), 0, 0); k.pos.copy(bp); k.lock = true; k.goal = null; k.faceT = null; k.heading = headingTo(k.pos, o.pos);
    m.vel.set(clamp((hp.x - m.pos.x)/dtS, -2, 2), 0, 0); m.pos.copy(hp); m.lock = true; m.goal = null; m.faceT = null; m.heading = headingTo(m.pos, k.pos);
    m.pt.pel = .5; m.pt.bend = .5 + close*.06; m.lookAt = k.headW;
    k.lookAt = o.headW;
    const eager = ready ? 1 : .35, snap = close ? Math.max(0, Math.sin((e - .3)/.32*PI*5 + k.ph)) : 0;
    k.pt.neckOut = close ? 1 : .7; k.pt.flare = .75 + close*.45*eager + wd*.15; k.pt.crouch = .35 + close*.2*eager; k.pt.tail = .3 + close*.4; k.pt.pitch = -.14*close*eager;
    k.pt.flap = close && ready && snap > .8 ? .5 : 0; k.pt.wing = close ? .22*eager : 0; k.pt.beak = close && snap > .7 ? 1 : 0; k.pt.lean = close*.2*eager;
    k.aim = Object.assign(k.aim || {}, {w:close || wd ? (ready ? 1 : .35) : .75, amp:close ? 1.5 : .6, sep:close ? .1 : .18});
    if (close && ready && snap > .97 && (!k.aim.stab || clock - k.aim.stab > .45)){ k.aim.stab = clock; sfx(() => SFX.cluck(s*.4, .5, 1)); }
    if (close && snap > .5 && Math.random() < dt*2) sfx(() => SFX.flap(2, s*.4));
  }
}
function updCorner(dt, t){
  const P = A3.birds.p, O = A3.birds.o, mp = A3.men.p, mo = A3.men.o; if (!P || !O || !mp || !mo) return;
  const now = performance.now(), out = F.cornerOut;
  for (const [m, k, s, actOf] of [[mp, P, -1, () => F.act], [mo, O, 1, () => (F.oActs || []).find(a => now >= a.t0 && now < a.t0 + a.dur)]]){
    m.lookAt = k.headW;
    if (out){ const sc = V3(s*1.0, 0, 0); m.goal = sc; m.speed = 2; m.faceT = V3(0,0,0); m.pt.pel = .92; m.pt.bend = .15; if (m.hold) m.hold.mode = 'carry'; continue; }
    if (!m.hold){
      const reach = k.pos.clone().addScaledVector(fwd(k.heading), -.05).add(V3(s*.38, 0, 0));
      m.goal = reach; m.speed = 1.9; m.faceT = k.pos; m.pt.pel = m.pos.distanceTo(reach) < .35 ? .6 : .92; m.pt.bend = m.pos.distanceTo(reach) < .35 ? .55 : .1;
      if (m.pos.distanceTo(reach) < .14){ m.hold = {mode:'carry'}; sfx(() => SFX.cluck(s*.5, .5, 2)); }
      k.lock = false; k.goal = null; k.pt.flare = .2; continue;
    }
    const spot = V3(s*(RING - .02), 0, s*.12);
    if (m.pos.distanceTo(spot) > .1){ m.goal = spot; m.speed = 1.4; m.faceT = null; m.hold.mode = 'carry'; m.pt.pel = .92; m.pt.bend = .1; continue; }
    m.goal = null; m.faceT = V3(0, 0, 0); m.hold.mode = 'lap'; m.pt.pel = .44; m.pt.bend = .35;
    const a = actOf(); k.pt.flare = .15; k.pt.dip = 0; k.pt.beak = 0; k.pt.blink = 0; k.pt.crow = 0; k.pt.flap = 0; m.thrust = 0; m.act = a ? a.k : null;
    if (!a) continue;
    const au = clamp((now - a.t0)/a.dur, 0, 1);
    if (a.k === 'water'){ k.pt.dip = .35 + Math.sin(au*PI*6)*.15; k.pt.beak = Math.sin(au*PI*12) > 0 ? .6 : 0; }
    if (a.k === 'cool'){ if (Math.random() < dt*30){ const hp = V3(); k.torso.getWorldPosition(hp); A3.fx.water.emit(hp.x + rnd(-.1,.1), hp.y + .25, hp.z + rnd(-.1,.1), {vy:-1.2, g:-6, life:.5, s:.025, grow:0, a:.8, drag:.5}); } if (au > .85){ k.wobble = Math.sin(t*40)*.15; k.pt.flare = 1; } }
    if (a.k === 'fire'){ m.hold.mode = 'show'; m.thrust = .4 + Math.sin(au*PI*5)*.25; k.pt.flare = 1.2; k.pt.flap = au > .4 && au < .7 ? 1 : 0; k.pt.crow = au > .55 && au < .9 ? 1 : 0; k.pt.beak = k.pt.crow; }
    if (a.k === 'calm'){ k.pt.blink = .45; k.pt.flare = 0; k.pt.crouch = .3; }
    if (a.k === 'blade'){ k.pt.tuck = 0; if (k.steel) k.steel.emissive = col3('#ffffff').multiplyScalar(Math.max(0, Math.sin(au*PI*3))*.25); }
  }
}
function updKO(k, dt, t){
  if (!k.ko){ k.ko = {t0:t, side:Math.random() < .5 ? -1 : 1, thud:false}; k.lock = false; k.goal = null; }
  const e = t - k.ko.t0;
  k.pt.flare = .1; k.pt.tail = -.6; k.pt.neckOut = .2;
  if (e < .75){ k.wobble = Math.sin(e*13)*.32*(.4 + e); k.pt.crouch = .8; k.pt.dip = .5; k.pt.blink = .7; k.pt.wing = .35; if (Math.random() < dt*3) k.goal = k.pos.clone().add(V3(rnd(-.06,.06), 0, rnd(-.06,.06))), k.speed = .25; }
  else if (e < 1.2){ const u = (e - .75)/.45; k.koRoll = k.ko.side*1.42*u*u; k.footMode = 'air'; k.pt.tuck = .3; k.pt.wing = .55; k.goal = null; }
  else {
    if (!k.ko.thud){ k.ko.thud = true; sfx(() => { sndThud(); SFX.flap(7, k.side === 'p' ? -.5 : .5); }); dust(k.pos, 16, 1); hitFX2(k); shake = Math.max(shake, .03); }
    const u = e - 1.2; k.koRoll = k.ko.side*(1.42 + Math.sin(u*11)*.08*Math.exp(-u*4)); k.wobble = 0;
    k.twitch = Math.max(0, 1 - u/2.6); k.pt.blink = 1; k.pt.wing = .55 + Math.sin(t*9)*.08*k.twitch; k.pt.dip = 0; k.pt.neckOut = .15;
  }
}
function hitFX2(k){ const c = palOf(k.f).c, T = V3(); k.torso.getWorldPosition(T); for (let i=0;i<8;i++) A3.fx.feathers.emit(T, pick([c.neck, c.body, c.saddle]), null, .5); }
function crow(k){
  sfx(() => SFX.flap(6, k.side === 'p' ? -.4 : .4));
  return play(1.9, u => { k.pt.wing = u > .1 && u < .45 ? .5 : 0; k.pt.flap = u > .1 && u < .45 ? 1 : 0; k.pt.crow = u > .45 && u < .95 ? 1 : 0; k.pt.beak = u > .5 && u < .9 ? 1 : 0; k.pt.tail = .8; k.pt.flare = .6; });
}
function updDone(dt, t){
  const P = A3.birds.p, O = A3.birds.o, mp = A3.men.p, mo = A3.men.o; if (!P || !O || !mp || !mo) return;
  const win = F.winnerSide === 'p' ? P : F.winnerSide === 'o' ? O : null, lose = win === P ? O : win === O ? P : null;
  const e = clock - A3.doneT;
  if (win && !A3.crowed && e > .5){ A3.crowed = true; win.goal = null; win.faceT = null; crow(win); }
  if (lose && !lose.ko){ lose.pt.tail = -.5; lose.pt.flare = 0; lose.pt.neckOut = .1; lose.pt.crouch = .5; lose.pt.blink = .3; lose.faceT = null; }
  for (const [m, k, s] of [[mp, P, -1], [mo, O, 1]]){
    m.lookAt = k.headW;
    const fetch = (k === lose && e > 1.4) || (k === win && e > 2.6) || (!win && e > 1);
    if (!fetch) continue;
    if (!m.hold){
      const reach = k.pos.clone().add(V3(s*.36, 0, 0));
      m.goal = reach; m.speed = 1.5; m.faceT = k.pos; const near = m.pos.distanceTo(reach) < .35; m.pt.pel = near ? .6 : .92; m.pt.bend = near ? .55 : .1;
      if (m.pos.distanceTo(reach) < .14){ m.hold = {mode:k === win ? 'raise' : 'carry'}; if (k.ko){ k.ko = null; k.koRoll = 0; k.twitch = 0; k.footMode = 'dangle'; } }
    } else { const gl = V3(s*(FR + .1), 0, s*.15); m.goal = gl; m.speed = .9; m.faceT = m.pos.distanceTo(gl) < .25 ? V3(0, 0, 0) : null; m.pt.pel = .92; m.pt.bend = .05; m.hold.mode = k === win ? 'raise' : 'carry'; }
  }
}
function updBrowse(dt, t){
  const P = A3.birds.p, O = A3.birds.o;
  for (const k of [P, O]){
    if (!k) continue;
    k.wT = (k.wT || 0) - dt;
    if (k.wT <= 0){
      k.wT = rnd(1.5, 4); const s = k.side === 'p' ? -1 : 1;
      if (Math.random() < .3){ k.goal = null; k.pecking = rnd(.8, 2); } else { k.goal = V3(s*rnd(.25, 1.2), 0, rnd(-1, 1)); k.speed = rnd(.18, .32); k.pecking = 0; }
      if (O && P && Math.random() < .35){ k.faceT = (k === P ? O : P).pos; k.goal = null; } else k.faceT = null;
    }
    if (k.pecking > 0){ k.pecking -= dt; k.pt.dip = Math.sin(t*9) > .3 ? 1 : .2; k.pt.neckOut = .6; if (Math.random() < dt*2) dust(k.head.getWorldPosition(V3()).setY(0), 1, .2); }
    else { k.pt.dip = 0; k.pt.neckOut = O && P ? .6 : .3; }
    k.pt.flare = O && P ? .45 : .1; k.lookAt = O && P ? (k === P ? O : P).headW : null;
  }
  for (const m of [A3.men.p, A3.men.o]) if (m){ m.lookAt = (m.side === 'p' ? P : O || P) ? (m.side === 'p' ? P : (O || P)).headW : null; m.pt.bend = .1; }
}
// ---------- camera director ----------
const camS = {pos:V3(0, 1.4, 3.6), tgt:V3(0, .3, 0), wp:V3(0, 1.4, 3.6), wt:V3(0, .3, 0), k:3};
// framing adapts to the screen shape: on a tall phone the camera sits further back and higher so both birds stay in frame and the ring fills more of the view
function shot(p, t, k){ const asp = W3/Math.max(1, H3), pf = clamp(1.2/asp, 1, 1.8), hs = 1 + (pf - 1)*.8, vs = 1 + (pf - 1)*1.25;
  camS.wp.set(t.x + (p.x - t.x)*hs, t.y + (p.y - t.y)*vs, t.z + (p.z - t.z)*hs); camS.wt.copy(t); camS.k = k || 3; }
function direct(t){
  const ph = A3.phase, P = A3.birds.p, O = A3.birds.o;
  if (ph === 'intro' && F && F.introU != null){
    const u = F.introU;
    if (u < IU.walk){ const e = ease(u/IU.walk), az = lerp(1.0, .05, e), d = lerp(8, 2.35, e), y = lerp(5.5, 1.05, sstep(.55, 1, e)); shot(V3(Math.sin(az)*d, y, Math.cos(az)*d), V3(0, lerp(1.0, .45, e), 0), 7); if (!A3.introCut){ A3.introCut = true; camS.cut = true; } }
    else if (u < IU.tie0 + .03){ const m = A3.men.p; if (m){ const D = fwd(m.heading), L = rightOf(m.heading).negate(), c = m.pos.clone().addScaledVector(D, .3); shot(c.clone().addScaledVector(D, 1.05).addScaledVector(L, .85).add(V3(0, .72, 0)), c.clone().addScaledVector(L, .25).add(V3(0, .32, 0)), 3); } }
    else if (u < IU.tie1 - .02){ const second = u > IU.tie0 + (IU.tie1 - IU.tie0)*.62, k = second ? O : P, m = second ? A3.men.o : A3.men.p;
      if (k && m && k.katti){ const T = k.katti.getWorldPosition(V3()), left = rightOf(k.heading).negate(), D = fwd(m.heading), sw = Math.sin(t*.4)*.06;
        shot(T.clone().addScaledVector(D, .3 + sw).addScaledVector(left, .12).add(V3(0, .62, 0)), T.clone().add(V3(0, .03, 0)).addScaledVector(left, .08), 5);
        const key = second ? 'tieO' : 'tieP'; if (A3.lastShot !== key){ A3.lastShot = key; camS.cut = true; } } }
    else if (u < IU.up) shot(V3(0, .95, 2.5), V3(0, .6, 0), 3);
    else if (u < .8) shot(V3(.12, 1.12, 1.75), V3(0, 1.0, 0), 3);
    else shot(V3(.1, .26, 1.3), V3(0, .2, 0), 2.5);
    return;
  }
  if (!P){ shot(V3(Math.sin(t*.05)*2.6, 1.3, Math.cos(t*.05)*2.6), V3(0, .3, 0), 1.5); return; }
  if (ph === 'corner'){ shot(V3(Math.sin(t*.05)*.3, 2.15, 3.55), V3(0, .5, 0), 2); return; }
  if (ph === 'browse' || !O){ const c = O ? P.pos.clone().add(O.pos).multiplyScalar(.5) : P.pos.clone(); shot(c.clone().add(V3(Math.sin(t*.07)*1.6, 1.15, 2.0)), c.clone().add(V3(0, .15, 0)), 1.5); return; }
  const loser = [P, O].find(k => k.ko);
  if (loser && ph !== 'done'){ const c = loser.pos.clone(); const cp = c.clone().add(V3(.6, .55, 1.0)); clampRing(cp, 2.6); shot(cp, c.clone().add(V3(0, .1, 0)), 3); return; }
  const mid = P.pos.clone().add(O.pos).multiplyScalar(.5), L = V3().subVectors(O.pos, P.pos).setY(0), sep = L.length();
  let perp = V3(-L.z, 0, L.x).normalize(); if (perp.z < 0) perp.negate(); if (!isFinite(perp.x)) perp.set(0, 0, 1);
  if (ph === 'done'){
    const e = clock - A3.doneT, w = F.winnerSide === 'o' ? O : F.winnerSide === 'p' ? P : null, l = w === P ? O : w === O ? P : null, mw = w && A3.men[w.side], ml = l && A3.men[l.side];
    const hm = (ml && ml.hold) ? ml : (mw && mw.hold) ? mw : null, sway = Math.sin(t*.25)*.35;
    if (hm){ const c = hm.pos.clone().add(V3(0, .75, 0)); const cp = V3(c.x*.6 + sway, 1.0, 2.0); clampRing(cp, 2.4); shot(cp, c.add(V3(0, .1, 0)), 2.2); }   // the camera stays on the open side so the handler never walks in front of it
    else if (l && e < 1.6){ const c = l.pos.clone().add(V3(0, .1, 0)); const cp = c.clone().add(V3(.45 + sway*.4, .42, 1.05)); clampRing(cp, 2.7); shot(cp, c, 2.4); }   // stay on the beaten bird while it lies there
    else { const c = P.pos.clone().add(O.pos).multiplyScalar(.5).add(V3(0, .22, 0)); const cp = V3(c.x + sway, 1.0, c.z + 2.3); clampRing(cp, 2.7); shot(cp, c, 2.2); }
    return; }
  if (A3.camClash){ const az = A3.camClash.az + (clock - A3.camClash.t0)*.12; const dirC = perp.clone().applyAxisAngle(V3(0,1,0), az); shot(mid.clone().addScaledVector(dirC, 1.0 + sep*.6).add(V3(0, .42, 0)), mid.clone().add(V3(0, .16, 0)), 4); return; }
  const az = Math.sin(t*.06)*.35, dirC = perp.clone().applyAxisAngle(V3(0,1,0), az), dist = clamp(sep*1.25 + 1.0, 1.25, 2.4);
  shot(mid.clone().addScaledVector(dirC, dist).add(V3(0, .62 + dist*.22, 0)), mid.clone().add(V3(0, .14, 0)), 2.2);
}
