// ---------- particles: dust, water, flying feathers ----------
function billboards(S, n, color, additive){
  const base = new T3.PlaneGeometry(1, 1), geo = new T3.InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
  const C = new Float32Array(n*3), Al = new Float32Array(n), Sz = new Float32Array(n);
  geo.setAttribute('aC', new T3.InstancedBufferAttribute(C, 3)); geo.setAttribute('aA', new T3.InstancedBufferAttribute(Al, 1)); geo.setAttribute('aS', new T3.InstancedBufferAttribute(Sz, 1));
  geo.instanceCount = n;
  const mat = new T3.ShaderMaterial({transparent:true, depthWrite:false, fog:true, blending:additive ? T3.AdditiveBlending : T3.NormalBlending,
    uniforms:T3.UniformsUtils.merge([T3.UniformsLib.fog, {map:{value:softDot()}, col:{value:col3(color)}}]),
    vertexShader:`attribute vec3 aC; attribute float aA; attribute float aS; varying vec2 vUv; varying float vA;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vA = aA; vec4 mvPosition = viewMatrix*vec4(aC, 1.); mvPosition.xy += position.xy*aS; gl_Position = projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader:`uniform sampler2D map; uniform vec3 col; varying vec2 vUv; varying float vA;
      #include <fog_pars_fragment>
      void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(col, t.a*vA);
      #include <fog_fragment>
      #include <colorspace_fragment>
      }`});
  const mesh = new T3.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 5; S.add(mesh);
  const P = Array.from({length:n}, () => ({life:0}));
  let next = 0;
  return {mesh, emit(x, y, z, o = {}){ const p = P[next]; next = (next + 1) % n; Object.assign(p, {x, y, z, vx:o.vx || 0, vy:o.vy || 0, vz:o.vz || 0, life:o.life || 1, max:o.life || 1, s:o.s || .08, grow:o.grow ?? .25, g:o.g ?? -.3, drag:o.drag ?? 2.2, a:o.a ?? .5}); },
    update(dt){ P.forEach((p, i) => { if (p.life > 0){ p.life -= dt; p.vy += p.g*dt; const dr = Math.exp(-p.drag*dt); p.vx *= dr; p.vz *= dr; p.vy *= dr; p.x += p.vx*dt; p.y = Math.max(.025, p.y + p.vy*dt); p.z += p.vz*dt; p.s += p.grow*dt; }
      C[i*3] = p.x || 0; C[i*3+1] = p.y || 0; C[i*3+2] = p.z || 0; const k = p.life > 0 ? p.life/p.max : 0; Al[i] = k*(p.a ?? .5)*Math.min(1, (1-k)*8 + .2); Sz[i] = p.life > 0 ? p.s : 0; });
      geo.attributes.aC.needsUpdate = geo.attributes.aA.needsUpdate = geo.attributes.aS.needsUpdate = true; }};
}
function featherBurst(S, n){
  const mat = featherMat(featherTex('hackle', {a:'#cfcfcf', b:'#ffffff'}));
  const mesh = new T3.InstancedMesh(featherGeo(.15), mat, n); mesh.frustumCulled = false; mesh.castShadow = true; mesh.customDepthMaterial = mat.userData.depth; S.add(mesh);
  const F = Array.from({length:n}, () => ({life:0, p:V3(), v:V3(), r:new T3.Euler(), w:V3(), s:.05}));
  let next = 0; const q = new T3.Quaternion(), sc = V3(), M = new T3.Matrix4();
  for (let i=0;i<n;i++){ M.makeScale(0,0,0); mesh.setMatrixAt(i, M); }
  return {mesh, emit(pos, color, dir, k = 1){
      const f = F[next]; next = (next + 1) % n;
      f.p.copy(pos).add(V3(rnd(-.04,.04), rnd(-.03,.03), rnd(-.04,.04))); f.v.set(rnd(-.8,.8)*k + (dir ? dir.x*1.4*k : 0), rnd(.6, 1.8)*k, rnd(-.8,.8)*k + (dir ? dir.z*1.4*k : 0));
      f.r.set(rnd(0,TAU), rnd(0,TAU), rnd(0,TAU)); f.w.set(rnd(-9,9), rnd(-9,9), rnd(-9,9)); f.life = 7 + rnd(0, 5); f.s = rnd(.045, .07); f.ground = false;
      mesh.setColorAt((next + n - 1) % n, col3(color)); if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; },
    update(dt, t){ F.forEach((f, i) => {
      if (f.life <= 0) return; f.life -= dt;
      if (!f.ground){ f.v.y -= 2.6*dt; const dr = Math.exp(-3.2*dt); f.v.multiplyScalar(dr); f.v.x += Math.sin(t*6 + i)*dt*.8; f.p.addScaledVector(f.v, dt);
        f.r.x += f.w.x*dt; f.r.y += f.w.y*dt; f.r.z += f.w.z*dt; if (f.p.y < .024){ f.p.y = .024; f.ground = true; f.r.x = -PI/2 + rnd(-.2,.2); f.r.z = 0; } }
      q.setFromEuler(f.r); const s = f.s*Math.min(1, f.life/1.5); sc.set(s*.55, s*1.5, s); M.compose(f.p, q, sc); mesh.setMatrixAt(i, M); });
      mesh.instanceMatrix.needsUpdate = true; }};
}
// ---------- actors and the director ----------
const A3 = {birds:{p:null, o:null}, men:{p:null, o:null}, phase:null, busy:false, fx:null};
const tracks = [];
function play(dur, fn){ return new Promise(res => tracks.push({t0:clock, dur:Math.max(.001, dur), fn, res})); }
function runTracks(){ for (const tr of tracks.slice()){ const u = clamp((clock - tr.t0)/tr.dur, 0, 1); try { tr.fn(u); } catch(e) {} if (u >= 1){ tracks.splice(tracks.indexOf(tr), 1); tr.res(); } } }
function flushTracks(){ for (const tr of tracks.splice(0)) tr.res(); }
const wait3 = s => play(s, () => {});
const FR = RING + .5;
function clampRing(p, r){ const d = Math.hypot(p.x, p.z); if (d > r){ p.x *= r/d; p.z *= r/d; } return p; }
const sizeOf = k => (k.f.look && k.f.look.size) || 1;
const birdStep = k => ({hipW:.043*sizeOf(k), stride:.042*sizeOf(k), stepH:.032*sizeOf(k), dur:.15, lead:.09, speedK:1.8, onStep:(a, i) => { scuffAt(a.feetW[i], .5); if (Math.random() < .35) sfx(() => SFX.step(a === A3.birds.p ? -.4 : .4)); }});
const manStep = {hipW:.11, stride:.24, stepH:.09, dur:.42, lead:.22, speedK:.35, onStep:(a, i) => scuffAt(a.feetW[i], 1.2)};
function sfx(fn){ try { fn(); } catch(e) {} }
let scuffDirty = 0;
function scuffAt(p, k){
  if (!built || !p) return; const c = built.sand.userData.canvas, g = c.getContext('2d'), r = RING + .3;
  if (Math.hypot(p.x, p.z) > r) return;
  const x = (p.x/r + 1)/2*c.width, y = (p.z/r + 1)/2*c.height;
  g.fillStyle = `rgba(80,55,30,${.12*k})`; g.beginPath(); g.ellipse(x, y, 5*k, 3.5*k, rnd(0,PI), 0, TAU); g.fill();
  g.fillStyle = `rgba(255,240,210,${.08*k})`; g.beginPath(); g.ellipse(x + 2, y - 2, 4*k, 2*k, rnd(0,PI), 0, TAU); g.fill();
  scuffDirty++;
}
function sigOf(f){ return [f.breedKey, JSON.stringify(f.look || {}), f.blade && f.blade.name, f.ribbon].join('|'); }
function syncBird(side, f){
  let k = A3.birds[side];
  if (!f){ if (k){ built.scene.remove(k.root); A3.birds[side] = null; } return null; }
  const sig = sigOf(f);
  if (!k || k.sig !== sig){
    if (k) built.scene.remove(k.root);
    k = buildKori(f); k.sig = sig; k.ph = side === 'p' ? 0 : 2.1; k.flareS = -1; k.side = side; k.footMode = 'ground';
    built.scene.add(k.root); A3.birds[side] = k; homeBird(k); A3.needWarm = true;
  }
  k.f = f; return k;
}
function homeBird(k){
  const s = k.side === 'p' ? -1 : 1;
  k.pos.set(s*.6, 0, s*.08); k.heading = s < 0 ? 0 : PI; k.vel.set(0,0,0); k.y = 0; k.vy = 0; k.held = null; k.air = false; k.lock = false;
  k.ko = null; k.koRoll = 0; k.twitch = 0; k.wobble = 0; k.goal = null; k.faceT = null; k.footMode = 'ground'; k.kt = 1;
  Object.assign(k.pt, P_IDLE); initFeet(k, .043*sizeOf(k)); k.hFeet = k.feetW;
}
const MEN = [{skin:'#8a5a3c', shirt:'#f1ece0', lungi:'#f4f0e4', border:'#c08a2a', hair:'#15100d', pattern:'plain', towel:'#efe9d8'},
             {skin:'#7a4a30', shirt:'#2a73b8', lungi:'#2b3a67', border:'#e0b040', hair:'#1b1511', pattern:'check', check:'#ffffff'},
             {skin:'#96603e', shirt:'#c0483a', lungi:'#e8e1cf', border:'#2a6a3a', hair:'#241a14', pattern:'plain'},
             {skin:'#6e402a', shirt:'#5d8f6b', lungi:'#7a2a2a', border:'#e0c060', hair:'#15100d', pattern:'check', check:'#1a2a1a', towel:'#c0392b'},
             {skin:'#835036', shirt:'#d89b3a', lungi:'#2f5a3a', border:'#f0e0a0', hair:'#9a958c', pattern:'plain'}];
function syncMan(side, seed){
  let m = A3.men[side];
  const o = side === 'p' ? MEN[0] : MEN[1 + (strHash(String(seed || 'r')) % 4)];
  if (m && m.o === o) return m;
  if (m) built.scene.remove(m.root);
  m = buildHuman(o); m.side = side; m.ph = side === 'p' ? 0 : 1.7; built.scene.add(m.root); A3.men[side] = m; homeMan(m); A3.needWarm = true; return m;
}
const TIERS = [{skin:'#7a4a30', shirt:'#e8e1cf', lungi:'#efe9d8', border:'#8a2a2a', hair:'#b0aaa0', pattern:'plain', towel:'#c0392b'},
               {skin:'#6e402a', shirt:'#cfd8e0', lungi:'#e8e1cf', border:'#2a4a7a', hair:'#c8c2b8', pattern:'plain', towel:'#efe9d8'}];
function syncTier(side){
  let m = A3.tiers && A3.tiers[side]; if (!A3.tiers) A3.tiers = {};
  if (m && m.root.parent === built.scene) return m;
  m = buildHuman(TIERS[side === 'p' ? 0 : 1]); m.side = side; m.ph = side === 'p' ? .7 : 2.3; m.root.visible = false; built.scene.add(m.root); A3.tiers[side] = m; initFeet(m, .11);
  // his cloth kit on the ground: a red cloth with spare blades, and the thread spool in his right hand
  const kit = m.kit = new T3.Group(); const cl = new T3.Mesh(new T3.PlaneGeometry(.32, .26, 6, 6), new T3.MeshStandardMaterial({map:clothTex('#8a1f2a', '#e0b040', 'border'), roughness:.95, side:T3.DoubleSide}));
  const cp = cl.geometry.attributes.position; for (let i=0;i<cp.count;i++) cp.setZ(i, Math.sin(cp.getX(i)*30)*.004 + Math.cos(cp.getY(i)*25)*.003); cl.geometry.computeVertexNormals(); cl.rotation.x = -PI/2; cl.receiveShadow = true; kit.add(cl);
  const steel = new T3.MeshStandardMaterial({color:col3('#dfe4ea'), metalness:1, roughness:.2});
  for (let i=0;i<3;i++){ const bl = new T3.Mesh(new T3.BoxGeometry(.075, .002, .007), steel); bl.position.set(-.06 + i*.06, .004, -.02 + i*.03); bl.rotation.y = .3 + i*.25; kit.add(bl); }
  const spoolK = new T3.Mesh(new T3.CylinderGeometry(.012, .012, .03, 12), new T3.MeshStandardMaterial({color:col3('#d7372f'), roughness:.85})); spoolK.rotation.z = PI/2; spoolK.position.set(.09, .012, .07); kit.add(spoolK);
  kit.visible = false; built.scene.add(kit);
  const spool = m.spool = new T3.Mesh(new T3.CylinderGeometry(.011, .011, .028, 12), new T3.MeshStandardMaterial({color:col3('#d7372f'), roughness:.85})); spool.position.set(0, -.07, .02); m.arms[1].hand.add(spool); spool.visible = false;
  const lg = new T3.BufferGeometry(); lg.setAttribute('position', new T3.Float32BufferAttribute([0,0,0, 0,0,0], 3));
  m.threadLine = new T3.Line(lg, new T3.LineBasicMaterial({color:col3('#e04a3a')})); m.threadLine.visible = false; m.threadLine.frustumCulled = false; built.scene.add(m.threadLine);
  return m;
}
function homeMan(m){ const s = m.side === 'p' ? -1 : 1; m.pos.set(s*(FR + .45), 0, s*.25); m.heading = s < 0 ? 0 : PI; m.vel.set(0,0,0); m.goal = null; m.hold = null; m.faceT = null; Object.assign(m.pt, {pel:.92, bend:.08, twist:0, kneel:0}); initFeet(m, .11); }
function moveActor(a, dt, isMan){
  if (a.goal && !a.lock){
    const to = V3(a.goal.x - a.pos.x, 0, a.goal.z - a.pos.z), d = to.length(), sp = a.speed || (isMan ? 1.1 : .4);
    const want = d > .01 ? to.multiplyScalar(Math.min(sp, d*4)/d) : V3();
    a.vel.lerp(want, 1 - Math.exp(-(isMan ? 6 : 11)*dt));
    if (d < .012 && a.vel.length() < .02) a.goal = null;
  } else if (!a.lock) a.vel.multiplyScalar(Math.exp(-9*dt));
  if (!a.lock) a.pos.addScaledVector(a.vel, dt);
  if (!isMan) clampRing(a.pos, RING - .12);
  let hd = a.heading;
  if (a.faceT) hd = headingTo(a.pos, a.faceT); else if (a.vel.length() > .06) hd = Math.atan2(-a.vel.z, a.vel.x);
  a.heading = angLerp(a.heading, hd, a.turnK || (isMan ? 5 : 10), dt);
}
// ---- holding a bird
function holdPose(m, k, dt){
  const H = m.hold, s = m.side === 'p' ? 1 : -1, size = sizeOf(k);
  const off = {carry:V3(.33, 1.02, 0), show:V3(.42 + (m.thrust || 0)*.3, 1.06, 0), raise:V3(.12, 1.72, 0), ground:V3(.4, .27*size, 0), lap:V3(.36, .5, 0), tie:V3(.3, .42, 0)}[H.mode] || V3(.33, 1, 0);
  if (H.mode === 'ground'){ if (k.held || k.y > 0){ k.held = null; k.y = 0; k.falling = false; initFeet(k, .043*sizeOf(k)); k.hFeet = k.feetW; } return; }
  if (H.mode === 'lap') off.y = .3 + .27*size*.4;
  const r = rightOf(m.heading), f = fwd(m.heading);
  const want = m.pos.clone().addScaledVector(f, off.x).add(V3(0, off.y - .27*size, 0));
  if (!k.held || !k.holdP){ k.holdP = m.snap ? want.clone() : k.root.position.clone(); }
  k.held = m; k.holdP.lerp(want, 1 - Math.exp(-14*dt));
  k.root.position.copy(k.holdP); k.root.rotation.set(0, m.heading + (H.yaw || 0), 0); k.heading = m.heading; k.pos.set(k.holdP.x, 0, k.holdP.z); k.y = k.holdP.y;
  k.footMode = H.mode === 'lap' ? 'air' : 'dangle'; k.pt.tuck = H.mode === 'lap' ? .8 : 0;
  if (H.mode === 'tie'){ k.root.position.y = k.holdP.y; }
}
function handsOnBird(m, k){
  const T = k.torso; T.updateMatrixWorld(true);
  const H = m.hold, low = H && H.mode === 'ground';
  m.hands = [T.localToWorld(V3(low ? -.03 : 0, low ? .02 : -.01, -.095)), T.localToWorld(V3(low ? -.03 : 0, low ? .02 : -.01, .095))];
}
// ---- scripted motions
function runTo(k, p, speed, maxT){
  k.goal = clampRing(p.clone(), RING - .14); k.speed = speed;
  const t0 = clock;
  return play(maxT || .6, u => { if (k.pos.distanceTo(k.goal || k.pos) < .03) {} });
}
function leap(k, to, h, dur, o = {}){
  const from = k.pos.clone(), dst = clampRing(to.clone(), RING - .14);
  k.lock = true; k.air = true; k.footMode = 'air'; k.goal = null;
  sfx(() => SFX.flap(4, k.side === 'p' ? -.5 : .5));
  dust(k.pos, 4, .5);
  return play(dur, u => {
    const e = u;
    k.pos.lerpVectors(from, dst, e); k.y = 4*h*e*(1 - e) + (o.y0 || 0)*(1 - e);
    k.vel.set((dst.x - from.x)/dur, 0, (dst.z - from.z)/dur);
    k.pt.flap = u < .92 ? 1 : 0; k.pt.wing = .5; k.pt.tuck = u < .3 ? 1 : 0; k.pt.kick = u > .28 && u < .78 ? 1 : 0;
    k.pt.pitch = u < .5 ? -.25 : -.05; k.pt.neckOut = .55; k.pt.flare = 1; k.pt.tail = .6;
    k.stiff = {kick:22, flap:18, tuck:16, pitch:12};
    if (o.onU) o.onU(u);
  }).then(() => { k.y = 0; k.lock = false; k.air = false; k.footMode = 'ground'; k.pt.kick = 0; k.pt.flap = 0; k.pt.tuck = 0; k.pt.pitch = 0; k.stiff = null; initFeet(k, .043*sizeOf(k)); k.hFeet = k.feetW; land(k); });
}
function land(k){ dust(k.pos, 7, .7); scuffAt(k.pos, 2.2); k.p.crouch = Math.max(k.p.crouch, .7); sfx(() => SFX.step(k.side === 'p' ? -.4 : .4)); }
function recoil(k, dir, dist, dur){
  const from = k.pos.clone(), to = clampRing(from.clone().addScaledVector(dir, dist), RING - .14);
  k.lock = true; k.goal = null;
  return play(dur, u => {
    const e = 1 - Math.pow(1 - u, 3); k.pos.lerpVectors(from, to, e); k.vel.copy(dir).multiplyScalar(dist/dur*(1 - u)*1.5);
    k.wobble = Math.sin(u*22)*.28*(1 - u); k.pt.crouch = .65; k.pt.flap = u < .6 ? .45 : 0; k.pt.wing = .3; k.pt.neckOut = .2; k.pt.dip = .15;
  }).then(() => { k.lock = false; k.wobble = 0; k.pt.flap = 0; k.pt.wing = 0; k.pt.dip = 0; });
}
function dashTo(k, to, dur, o = {}){
  const from = k.pos.clone(), dst = clampRing(to.clone(), RING - .14); k.lock = true; k.goal = null;
  return play(dur, u => { const e = u*u*(3 - 2*u); k.pos.lerpVectors(from, dst, e); k.vel.set((dst.x - from.x)/dur*1.5, 0, (dst.z - from.z)/dur*1.5); if (o.onU) o.onU(u); }).then(() => { k.lock = false; });
}
function dust(p, n, k){ if (!A3.fx) return; for (let i=0;i<n;i++) A3.fx.dust.emit(p.x + rnd(-.06,.06), .02, p.z + rnd(-.06,.06), {vx:rnd(-.5,.5)*k, vy:rnd(.1,.45)*k, vz:rnd(-.5,.5)*k, life:rnd(.7, 1.4), s:rnd(.05,.1), grow:.3, g:-.05, a:.45}); }
function hitFX(k, s, from){
  const c = palOf(k.f).c, T = V3(); k.torso.getWorldPosition(T); T.y += .04;
  const dir = from ? V3().subVectors(T, from).setY(0).normalize() : null;
  for (let i=0;i<2 + Math.round(s*5);i++) A3.fx.feathers.emit(T, pick([c.neck, c.neckHi, c.saddle, c.body]), dir, .6 + s*.6);
  dust(k.pos, 5 + s*8, .5 + s*.6); shake = Math.max(shake, .012 + s*.03);
  if (s > .75 && !reduceMotion && Math.random() < .55){ tScale = .3; slowTo = performance.now() + 420; }
  excite = 1; sfx(() => { SFX.squawk(k.side === 'p' ? -.5 : .5, .9); sndThud(); SFX.flap(5, 0); });
  k.p.flare = 1.2; k.p.beak = 1;
  const at = A3.birds[k.side === 'p' ? 'o' : 'p']; if (at && at.aim) at.aim.stab = clock; if (k.aim) k.aim.hit = clock;
}
// ---- the nine pairings of the call, each with some randomness so no two look the same
async function clash3D(pm, om, winner){
  const P = A3.birds.p, O = A3.birds.o;
  if (!P || !O || !built){ return new Promise(r => setTimeout(r, 900)); }
  A3.busy = true; A3.camClash = {az:rnd(-.35, .35), t0:clock};
  for (const k of [P, O]){ k.faceT = (k === P ? O : P).pos; k.pt.flare = 1; k.pt.neckOut = .9; k.pt.crouch = .35; }
  const dir = V3().subVectors(O.pos, P.pos).setY(0); if (dir.length() < .01) dir.set(1,0,0); dir.normalize();
  const perp = V3(-dir.z, 0, dir.x);
  const mid = P.pos.clone().add(O.pos).multiplyScalar(.5); clampRing(mid, RING - .5);
  const jumpy = pm === 'jump' || om === 'jump', gap = jumpy ? .52 : .3;
  runTo(P, mid.clone().addScaledVector(dir, -gap/2).addScaledVector(perp, rnd(-.05,.05)), .9); runTo(O, mid.clone().addScaledVector(dir, gap/2).addScaledVector(perp, rnd(-.05,.05)), .9);
  // before anything lands they square up: heads come together beak to beak, weaving, hackles up, a couple of snaps
  for (const k of [P, O]) k.aim = Object.assign(k.aim || {}, {w:1, amp:1.4, sep:.1});
  P.aim.stab = clock + .32; O.aim.stab = clock + .5;
  await play(.78, u => { for (const k of [P, O]){ k.pt.neckOut = 1; k.pt.flare = 1.15; k.pt.crouch = .42; k.pt.dip = 0; k.pt.beak = Math.sin(u*PI*6 + k.ph) > .55 ? 1 : 0; k.pt.tail = .7; k.tailSwing = Math.sin(u*14 + k.ph)*.18; } });
  for (const k of [P, O]) k.tailSwing = 0;
  const A = winner === 'p' ? P : O, D = winner === 'p' ? O : P, am = winner === 'p' ? pm : om, dm = winner === 'p' ? om : pm;
  const ad = V3().subVectors(D.pos, A.pos).setY(0).normalize(), side = Math.random() < .5 ? -1 : 1, ap = V3(-ad.z, 0, ad.x).multiplyScalar(side);
  if (winner === 'tie' || winner === 't'){
    if (pm === 'jump'){                                   // both fly up and crash together in the air
      const m2 = P.pos.clone().add(O.pos).multiplyScalar(.5);
      let hit = false;
      await Promise.all([leap(P, m2.clone().addScaledVector(dir, -.14), .3, .62, {onU:u => { if (u > .48 && !hit){ hit = true; hitFX(P, .55, O.pos); hitFX(O, .55, P.pos); } }}), leap(O, m2.clone().addScaledVector(dir, .14), .3, .62)]);
      await Promise.all([recoil(P, dir.clone().negate(), .16, .4), recoil(O, dir, .16, .4)]);
    } else if (pm === 'block'){                          // chest to chest, wings up, shoving and pecking
      const m2 = P.pos.clone().add(O.pos).multiplyScalar(.5);
      await Promise.all([dashTo(P, m2.clone().addScaledVector(dir, -.085), .22), dashTo(O, m2.clone().addScaledVector(dir, .085), .22)]);
      hitFX(P, .35, O.pos); hitFX(O, .35, P.pos);
      await play(.75, u => { const sh = Math.sin(u*PI*4)*.03; for (const [k, sg] of [[P, -1], [O, 1]]){ k.pos.copy(m2).addScaledVector(dir, sg*.085 + sh); k.pt.wing = .6; k.pt.flap = .35; k.pt.neckOut = 1; k.pt.dip = Math.max(0, Math.sin(u*PI*6 + (sg > 0 ? 1 : 0)))*.25; k.pt.beak = k.pt.dip > .15 ? 1 : 0; } });
      await Promise.all([recoil(P, dir.clone().negate(), .14, .35), recoil(O, dir, .14, .35)]);
    } else {                                            // both duck and weave around each other
      const m2 = P.pos.clone().add(O.pos).multiplyScalar(.5), a0 = Math.atan2(P.pos.z - m2.z, P.pos.x - m2.x), turn = side*rnd(1.1, 1.8), r0 = .2;
      for (const k of [P, O]){ k.lock = true; k.pt.crouch = .6; k.pt.neckOut = 1; }
      let tagged = false;
      await play(.85, u => { const a = a0 + turn*u; P.pos.set(m2.x + Math.cos(a)*r0, 0, m2.z + Math.sin(a)*r0); O.pos.set(m2.x - Math.cos(a)*r0, 0, m2.z - Math.sin(a)*r0);
        P.vel.set(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(turn*r0/.85); O.vel.copy(P.vel).negate();
        if (u > .55 && !tagged){ tagged = true; hitFX(P, .3, O.pos); hitFX(O, .3, P.pos); } });
      for (const k of [P, O]){ k.lock = false; }
    }
  } else if (am === 'jump'){                              // jump beats block: flies over the guard and strikes
    D.pt.crouch = .55; D.pt.wing = .45; D.pt.neckOut = .35; D.pt.pitch = -.1;
    let hit = false; const to = D.pos.clone().addScaledVector(ad, -.12).addScaledVector(ap, rnd(-.04, .04));
    await leap(A, to, rnd(.3, .4), rnd(.58, .68), {onU:u => { if (u > .52 && !hit){ hit = true; hitFX(D, 1, A.pos); recoil(D, ad.clone().addScaledVector(ap, rnd(-.3,.3)).normalize(), rnd(.28, .4), .55); } }});
    await wait3(.25);
  } else if (am === 'block'){                             // block beats dodge: reads the sidestep, cuts it off, pins and pecks
    const esc = D.pos.clone().addScaledVector(ap, .26).addScaledVector(ad, .05);
    D.pt.crouch = .6; D.pt.neckOut = 1;
    await dashTo(D, esc, .3);
    A.pt.pitch = -.25; A.pt.wing = .4;
    await dashTo(A, esc.clone().addScaledVector(V3().subVectors(esc, A.pos).setY(0).normalize(), -.13), .22, {onU:u => { A.pt.neckOut = 1; A.pt.dip = u > .6 ? .3 : 0; A.pt.beak = u > .6 ? 1 : 0; }});
    hitFX(D, .75, A.pos);
    await recoil(D, V3().subVectors(D.pos, A.pos).setY(0).normalize(), rnd(.22, .3), .5);
    A.pt.dip = 0; A.pt.beak = 0; A.pt.pitch = 0; A.pt.wing = 0;
  } else {                                                // dodge beats jump: slips the flying bird, then counters from the side
    let hit = false; const tgt = A.pos.clone();
    const lp = leap(D, tgt, .32, .6);
    await wait3(.14);
    A.pt.crouch = .75; A.pt.neckOut = 1;
    await dashTo(A, A.pos.clone().addScaledVector(ap, .27), .24);
    await lp;
    D.wobble = .3; D.pt.crouch = .7;
    const back = D.pos.clone().addScaledVector(V3().subVectors(A.pos, D.pos).setY(0).normalize(), .06);
    await leap(A, back, .2, .42, {onU:u => { if (u > .5 && !hit){ hit = true; hitFX(D, .9, A.pos); recoil(D, V3().subVectors(D.pos, A.pos).setY(0).normalize(), rnd(.25, .34), .5); } }});
    await wait3(.2);
  }
  // settle: back off, face up again
  for (const k of [P, O]){ k.pt.dip = 0; k.pt.beak = 0; k.pt.wing = 0; k.pt.crouch = .3; }
  const d2 = V3().subVectors(O.pos, P.pos).setY(0); const dl = d2.length() || 1; d2.multiplyScalar(1/dl);
  if (dl < .42){ const m3 = P.pos.clone().add(O.pos).multiplyScalar(.5); clampRing(m3, RING - .5); runTo(P, m3.clone().addScaledVector(d2, -.24), .6); runTo(O, m3.clone().addScaledVector(d2, .24), .6); }
  await wait3(.3);
  for (const k of [P, O]) k.aim = Object.assign(k.aim || {}, {w:.6, amp:.6, sep:.16});
  A3.busy = false; A3.camClash = null;
}
