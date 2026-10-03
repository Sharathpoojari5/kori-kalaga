// ---------- feet that plant on the ground and step (shared by koris and handlers) ----------
function rightOf(h){ return V3(Math.sin(h), 0, Math.cos(h)); }
function initFeet(a, hipW){ const r = rightOf(a.heading); a.feetW = [-1, 1].map(s => a.pos.clone().addScaledVector(r, s*hipW)); a.fStep = [null, null]; a.footLift = [0, 0]; }
function stepFeet(a, dt, o){
  if (!a.feetW) initFeet(a, o.hipW);
  const r = rightOf(a.heading), sp = Math.hypot(a.vel.x, a.vel.z);
  let moved = false;
  for (let i=0;i<2;i++){
    const s = i ? 1 : -1, st = a.fStep[i];
    if (st){
      st.t += dt/st.dur; const u = clamp(st.t, 0, 1), e2 = u*u*(3 - 2*u);
      a.feetW[i].lerpVectors(st.from, st.to, e2); a.feetW[i].y = Math.sin(u*PI)*o.stepH;
      a.footLift[i] = Math.sin(u*PI);
      if (st.t >= 1){ a.feetW[i].copy(st.to); a.feetW[i].y = 0; a.fStep[i] = null; a.footLift[i] = 0; moved = true; if (o.onStep) o.onStep(a, i); }
      continue;
    }
    const rest = a.pos.clone().addScaledVector(r, s*o.hipW).add(V3(a.vel.x*o.lead, 0, a.vel.z*o.lead));
    const other = a.fStep[1 - i], far = a.feetW[i].distanceTo(rest);
    if (far > o.stride*4){ a.feetW[i].copy(rest); a.feetW[i].y = 0; continue; }
    if ((!other || far > o.stride*2.2) && far > o.stride + sp*.04){
      const to = rest.clone().add(V3(a.vel.x*o.lead*.6, 0, a.vel.z*o.lead*.6)); to.y = 0;
      a.fStep[i] = {from:a.feetW[i].clone(), to, t:0, dur:o.dur/(1 + sp*o.speedK)};
    }
  }
  a.walking = sp > .05 || !!a.fStep[0] || !!a.fStep[1];
  return moved;
}
