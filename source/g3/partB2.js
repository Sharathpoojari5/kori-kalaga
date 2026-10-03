// pose one kori for this frame: torso, wings, hackles, neck and head (with head-stabilising), legs by IK, tail, katti
const NB = V3(), HT = V3(), HW = V3(), _a = V3(), _b = V3(), _c = V3(), _hip = V3(), _ft = V3();
function relayWing(k, w, s){
  for (const m of w.sets){
    m.userData.list.forEach((it, i) => {
      const o = it.o, a = o.a0 + (o.a1 - o.a0)*s;
      _a.set(-Math.cos(a), -Math.sin(a), 0);
      _b.copy(o.b); _b.y -= s*.01*(o.kind === 'pri' ? 2 : 1);
      m.setMatrixAt(i, featherMatrix(_m, _b, _a, it.n, it.w, it.l, .05 + s*.05));
    });
    m.instanceMatrix.needsUpdate = true;
  }
}
function relayHackles(k, fl){
  k.neck.forEach((seg, si) => {
    const mp = seg.mane.geometry.attributes.position, bs = seg.maneBase;
    for (let q=0;q<mp.count;q++){ const d = seg.down[q], f = 1 + fl*(.9 - si*.15)*d*d; mp.setXYZ(q, bs[q*3]*f, bs[q*3+1] + fl*.012*d*(si < 2 ? 1 : .5), bs[q*3+2]*f); }
    mp.needsUpdate = true; if (!(api.tier > 0)) seg.mane.geometry.computeVertexNormals();
    seg.items.forEach((it, i) => { seg.hm.setMatrixAt(i, featherMatrix(_m, it.p, it.d, it.n, it.w*(1 + fl*.25), it.l*(1 - fl*.1), .1 + fl*(.78 - si*.1))); });
    seg.hm.instanceMatrix.needsUpdate = true;
  });
}
function poseKori(k, dt, now){
  const p = k.p, t = now/1000, sg = k.scaleG, {A, B} = k.dims, size = (k.f.look && k.f.look.size) || 1;
  for (const key in k.pt) p[key] = smooth(p[key], k.pt[key], (k.stiff && k.stiff[key]) || 8, dt);
  if (!k.held){ k.root.position.set(k.pos.x, k.y, k.pos.z); k.root.rotation.set(0, k.heading, 0); }
  // lying down after a knockout
  const roll = k.koRoll || 0;
  sg.rotation.set(roll, 0, 0); sg.position.y = Math.abs(Math.sin(roll))*.07*size;
  const breathe = Math.sin(t*(k.koRoll ? 5.5 : 2.6) + k.ph);
  const bodyY = .27 - p.crouch*.08 + breathe*.0028 + (k.bob || 0) + p.tuck*.02;
  k.torso.position.set(0, bodyY, 0);
  k.torso.rotation.set(p.lean*.35 + (k.wobble || 0), 0, .5 + p.pitch - p.neckOut*.18);
  k.torso.scale.set(1, 1 + breathe*.012, 1 + breathe*.01);
  k.torso.updateMatrix();
  // wings
  k.flapPh = (k.flapPh || 0) + dt*15;
  const open = clamp(p.wing + p.flap*(.55 + .45*Math.sin(k.flapPh)), 0, 1.15);
  for (const w of k.wings){
    w.g.rotation.set(-w.side*open*1.25, -w.side*open*.25, -open*.25);
    const s = clamp(open*1.1, 0, 1); if (Math.abs(s - (w.s ?? -1)) > .02){ w.s = s; relayWing(k, w, s); }
    const folded = open < .1; if (w.shell) w.shell.visible = folded; for (const m of w.sets) m.visible = !folded;
  }
  if (Math.abs(p.flare - k.flareS) > (api.tier > 0 ? .07 : .03)){ k.flareS = p.flare; relayHackles(k, p.flare); }
  // tail
  k.tail.rotation.set((k.tailSwing || 0)*.4, (k.tailSwing || 0), p.tail*.35 - .08 + breathe*.01);
  k.sickles[0].rotation.set(Math.sin(t*1.7)*.04, Math.sin(t*1.9)*.035 + (k.tailSwing || 0)*.5, Math.sin(t*1.3)*.02 - p.tail*.05);
  k.root.updateMatrixWorld(true);
  // neck and head
  NB.set(A*.8, B*.42, 0).applyMatrix4(k.torso.matrix);
  HT.set(.06, .135, 0).lerp(_a.set(.16, .03, 0), p.neckOut);
  HT.y -= p.dip*.24; HT.x += p.dip*.03;
  HT.lerp(_a.set(.015, .21, 0), p.crow);
  HT.add(NB);
  if (k.headJit){ HT.x += k.headJit.x; HT.y += k.headJit.y; }
  if (k.headAim && k.headAimW > .001 && !roll){ _a.copy(k.headAim); sg.worldToLocal(_a); HT.lerp(_a, k.headAimW); }
  HW.copy(HT); sg.localToWorld(HW);
  if (!k.hA){ k.hA = HW.clone(); }
  if (k.walking && !k.held && !roll) { if (k.hA.distanceTo(HW) > .028) k.hA.lerp(HW, 1 - Math.exp(-40*dt)); }
  else k.hA.lerp(HW, 1 - Math.exp(-22*dt));
  HT.copy(k.hA); sg.worldToLocal(HT);
  _a.subVectors(HT, NB); const dl = _a.length(); if (dl > .2) HT.copy(NB).addScaledVector(_a, .2/dl); if (dl < .06) HT.copy(NB).addScaledVector(_a.normalize(), .06);
  if (!roll && HT.y < .03) HT.y = .03;
  const CP = _c.copy(NB).add(_b.set(-.015, HT.distanceTo(NB)*.55, 0));
  const bez = (u, out) => out.set((1-u)*(1-u)*NB.x + 2*(1-u)*u*CP.x + u*u*HT.x, (1-u)*(1-u)*NB.y + 2*(1-u)*u*CP.y + u*u*HT.y, (1-u)*(1-u)*NB.z + 2*(1-u)*u*CP.z + u*u*HT.z);
  const fwdX = V3(1, 0, 0);
  k.neck.forEach((seg, i) => { const a = bez(i/4, V3()), b = bez((i+1)/4, V3()); orientY(seg.g, a, b, fwdX); seg.g.scale.set(1, Math.max(.5, a.distanceTo(b)/seg.len), 1); });
  k.head.position.copy(HT);
  // gaze: snap between looks the way birds do
  k.sacT = (k.sacT || 0) - dt; if (k.sacT <= 0){ k.sacT = rnd(.35, 1.3); k.sac = rnd(-.35, .35); }
  let yaw = k.sac || 0;
  if (k.lookAt){ _a.copy(k.lookAt); sg.worldToLocal(_a); _a.sub(HT); yaw = clamp(Math.atan2(-_a.z, _a.x), -1.3, 1.3)*.85 + (k.sac || 0)*.25; }
  k.yawS = angLerp(k.yawS || 0, yaw, 24, dt);
  k.head.rotation.set(0, k.yawS, -.12 + p.crow*1.05 - p.dip*.85 + (k.headPitch || 0));
  k.jaw.rotation.z = -p.beak*.55;
  k.blinkT = (k.blinkT || rnd(2,5)) - dt; if (k.blinkT < 0){ k.blinkT = rnd(2.5, 6); k.blinkUntil = t + .12; }
  const lid = Math.max(p.blink, t < (k.blinkUntil || 0) ? 1 : 0);
  for (const l of k.lids) l.scale.y = .05 + lid*.95;
  // legs
  const fwd2 = V3(1, 0, 0);
  k.legs.forEach((leg, i) => {
    _hip.copy(leg.hipL).applyMatrix4(k.torso.matrix);
    if (k.footMode === 'ground' && !roll){ _ft.copy(k.hFeet[i]); sg.worldToLocal(_ft); }
    else {
      const dang = k.footMode === 'dangle';
      _ft.copy(_hip).add(_a.set(dang ? .015 : .03 + p.kick*.11, dang ? -.185 : -.11 + p.kick*.04 + (1 - p.tuck)*-.06, leg.side*(.03 + p.kick*.01)));
      if (roll) _ft.add(_a.set(Math.sin(t*9 + i)*.01*(k.twitch || 0), 0, 0));
    }
    { const dl = _ft.distanceTo(_hip); if (dl > .195){ _ft.sub(_hip).multiplyScalar(.195/dl).add(_hip); } }
    if (k.footTarget && k.footTarget[i]){ _ft.copy(k.footTarget[i]); sg.worldToLocal(_ft); const dl = _ft.distanceTo(_hip); if (dl > .195) _ft.sub(_hip).multiplyScalar(.195/dl).add(_hip); }
    const knee = ik2(_hip, _ft, .1, .102, _b.set(-1, 0, leg.side*.18));
    orientY(leg.thigh, _hip, _a.copy(_hip).multiplyScalar(2).sub(knee), fwd2);
    orientY(leg.shank, _ft, knee, fwd2);
    const air = k.footMode !== 'ground' || roll ? 1 : clamp((k.footLift && k.footLift[i]) || 0, 0, 1);
    leg.foot.quaternion.copy(leg.shank.quaternion).invert(); leg.foot.rotateZ(-air*.7);
  });
  // katti: tie progress, sharpness, coming loose
  if (k.katti){
    const kt = k.kt == null ? 1 : k.kt, f = k.f;
    k.katti.visible = kt > .02; k.katti.scale.setScalar(1);
    // tie stages: 0-.15 the pad goes on, .15-.3 the blade is laid on, .3-.95 the thread winds round turn by turn
    const turnsU = clamp((kt - .3)/.65, 0, 1); k.thread.geometry.setDrawRange(0, Math.floor(k.threadIdx*turnsU/6)*6); k.thread.visible = turnsU > 0;
    k.bladePivot.visible = kt > .15; if (k.sheath) k.sheath.visible = !!k.sheathOn && !f.loose; k.katti.children.forEach(ch => { if (ch !== k.bladePivot && ch !== k.thread) ch.visible = kt > .02; });
    k.tieTip = turnsU > 0 && turnsU < 1 ? (() => { const a = turnsU*14*TAU; return k.katti.localToWorld(V3(Math.cos(a)*.0128, -.006 + turnsU*.024, Math.sin(a)*.0128)); })() : null;
    const kd = f.kd == null ? 100 : f.kd;
    k.steel.roughness = f.loose ? .5 : .5 - .36*kd/100; k.steel.color.setStyle(kd < 30 ? '#a9aeb3' : '#dfe4ea');
    k.notch.visible = kd < 30 && !f.loose;
    k.bladePivot.rotation.z = f.loose ? PI*.92 + 1.15 + Math.sin(t*8)*.22 : PI*.92;
    k.bladePivot.position.y = f.loose ? -.012 : 0;
  }
}
