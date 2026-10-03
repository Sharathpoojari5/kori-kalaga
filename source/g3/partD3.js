// ---------- frame loop, setup and the hooks the game calls ----------
function resetSand(){ if (!built || !built.sandBase) return; const c = built.sand.userData.canvas; c.getContext('2d').drawImage(built.sandBase, 0, 0); built.sand.needsUpdate = true; scuffDirty = 0; }
function warmUp(){                        // compile every material now (including hidden parts) so nothing stalls mid-fight
  if (!built || !R3) return; const hidden = []; built.scene.traverse(o => { if (!o.visible){ hidden.push(o); o.visible = true; } });
  try { if (api.post && postInit()){ postSize(Math.round(W3*R3.getPixelRatio()), Math.round(H3*R3.getPixelRatio())); R3.setRenderTarget(POST.rt); } R3.compile(built.scene, CAM); } catch(e) {} R3.setRenderTarget(null); hidden.forEach(o => o.visible = false); }
// ---------- quality ladder: 0 desktop/flagship, 1 phone, 2 modest phone, 3 weak phone. Starts from the device, steps down live when frames drop, remembers where it settled.
const TIER_PR = [2, 1.5, 1.25, .9], TIER_CROWD = [1, .75, .5, .3];
function defaultTier(){
  let t = 0; try { const coarse = matchMedia('(pointer:coarse)').matches, small = Math.min(screen.width, screen.height) < 700, few = (navigator.hardwareConcurrency || 4) <= 4;
    t = coarse || small ? (few ? 2 : 1) : (few ? 1 : 0); } catch(e) {}
  try { const st = parseInt(localStorage.getItem('kori-tier'), 10); if (st >= 0 && st <= 3) t = Math.max(t, st); const f = localStorage.getItem('kori-tier-force'); if (f != null && f !== '') t = clamp(parseInt(f, 10) || 0, 0, 3); } catch(e) {}
  return t;
}
function stripMats(root){
  root.traverse(o => { if (!o.material) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])){
    if (m.isMeshPhysicalMaterial && !m.userData.lite){ m.userData.lite = true; m.sheen = 0; m.iridescence = 0; m.clearcoat = 0; m.needsUpdate = true; } } });
}
function applyTier(t, why){
  api.tier = t = clamp(t, 0, 3);
  api.post = t === 0; try { if (localStorage.getItem('kori-post') === 'off') api.post = false; } catch(e) {}
  if (cv3 && cv3.parentElement) cv3.parentElement.classList.toggle('nopost', !api.post);
  if (R3){
    R3.setPixelRatio(Math.min(window.devicePixelRatio || 1, TIER_PR[t])); R3.setSize(W3, H3, false);
    R3.shadowMap.type = t >= 1 ? T3.PCFShadowMap : T3.PCFSoftShadowMap; R3.shadowMap.enabled = t < 3;
    if (built){
      built.scene.traverse(o => { if (o.isLight && o.shadow){ if (t >= 1 && o.isSpotLight) o.castShadow = false; if (t >= 2 && o.isDirectionalLight && o.shadow.mapSize.x > 1024){ o.shadow.mapSize.set(1024, 1024); if (o.shadow.map){ o.shadow.map.dispose(); o.shadow.map = null; } } }
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
      if (t >= 2) stripMats(built.scene);
      const cr = built.crowd; if (cr) for (const k in cr.meshes){ const e = cr.meshes[k]; e.mesh.count = Math.max(1, Math.round(e.full * TIER_CROWD[t])); }
    }
  }
  api.holdUntil = performance.now() + 4500; api.lowT = 0;
  try { localStorage.setItem('kori-tier', String(t)); } catch(e) {}
  if (why) console.log('quality tier', t, why);
}
function ensureWorld(){
  const vk = VENUES[save.venue] ? save.venue : 'temple';
  if (built && built.vk === vk) return;
  if (built){ flushTracks(); built.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); if (built.scene.environment) built.scene.environment.dispose(); }
  A3.birds = {p:null, o:null}; A3.men = {p:null, o:null}; A3.phase = null;
  built = buildWorld(vk);
  const sc = built.sand.userData.canvas, cp = document.createElement('canvas'); cp.width = sc.width; cp.height = sc.height; cp.getContext('2d').drawImage(sc, 0, 0); built.sandBase = cp;
  A3.fx = {dust:billboards(built.scene, 110, VENUES[vk].ring.c0), water:billboards(built.scene, 70, '#d8ecff'), feathers:featherBurst(built.scene, 110)};
  A3.tiers = {}; syncTier('p'); syncTier('o'); A3.needWarm = true; applyTier(api.tier, 'world');
  R3.toneMappingExposure = LOOKS[vk].exp;
}
const _hw = V3(), _bowl = {};
function specialHands(m, k, t){
  const ph = A3.phase, s = m.side === 'p' ? -1 : 1;
  if (!m.hold || !k) return;
  if (ph === 'release'){
    m.hands[0] = k.torso.localToWorld(V3(-.2, .06, 0)); m.palmTo[0] = k.torso.localToWorld(V3(-.05, .05, 0)); m.gripT[0] = .85;
    m.hands[1] = k.torso.localToWorld(V3(-.1, .1, s*.045)); m.palmTo[1] = k.torso.localToWorld(V3(0, .08, 0)); m.gripT[1] = .45; return;
  }
  if (ph === 'corner' && m.act){
    if (m.act === 'water'){ const hp = k.head.getWorldPosition(V3()); m.hands[1] = hp.add(fwd(m.heading).multiplyScalar(.05)).add(V3(0, -.05, 0)); }
    if (m.act === 'cool'){ const tp = k.torso.getWorldPosition(V3()); m.hands[1] = tp.add(V3(Math.sin(t*14)*.12, .22, Math.cos(t*14)*.06)); }
    if (m.act === 'calm'){ const a = (t*1.2) % 1, n0 = k.torso.localToWorld(V3(.08, .09, 0)), n1 = k.torso.localToWorld(V3(-.14, .07, 0)); m.hands[1] = n0.lerp(n1, a).add(V3(0, .02, 0)); }
    if (m.act === 'blade' && k.legs[0]){ m.hands[1] = k.legs[0].shank.localToWorld(V3(0, .04, 0)).add(V3(0, Math.sin(t*12)*.01, 0)); }
  }
  // the clay bowl rides in the right hand during the water action
  let b = _bowl[m.side]; if (!b){ b = _bowl[m.side] = mk(new T3.CylinderGeometry(.06, .04, .04, 14), std('#9a5a34', {roughness:.8}), 0, 0, 0, true); built.scene.add(b); b.userData.scene = built.scene; }
  if (b.userData.scene !== built.scene){ built.scene.add(b); b.userData.scene = built.scene; }
  b.visible = ph === 'corner' && m.act === 'water'; if (b.visible){ b.position.copy(m.hands[1]).add(V3(0, -.03, 0)); }
}
function frame3(now){
  api._t0 = performance.now();
  ensureWorld();
  const rawDt = Math.max(0, (now - (lastNow || now))/1000), dtR = Math.min(api.capDt || .1, rawDt), dtC = Math.min(.25, rawDt); lastNow = now;
  if (performance.now() > slowTo) tScale = smooth(tScale, 1, 5, dtR);
  const dt = dtR*tScale; clock += dt; const t = clock;
  const P = syncBird('p', F ? F.p : null), O = syncBird('o', F ? F.o : null);
  syncMan('p', 'roy'); syncMan('o', F && F.chRef ? F.chRef.handler : (sel && sel.ch) || 'x');
  const ph = F ? F.phase : 'none';
  if (ph !== A3.phase){ const prev = A3.phase; A3.phase = ph; enterPhase(ph, prev); }
  runTracks();
  if (ph === 'browse' || ph === 'none') updBrowse(dt, t);
  else if (ph === 'intro') updIntro(dt, t);
  else if (ph === 'release') updRelease(dt, t);
  else if (ph === 'fight'){ updDuel(dt, t); if (!A3.busy){ birdIdle(P, O, dt, t); birdIdle(O, P, dt, t); }
    for (const m of [A3.men.p, A3.men.o]) if (m && !m.hold){ if (!m.goal) m.faceT = V3(0, 0, 0); const bk = A3.birds[m.side]; m.lookAt = bk && bk.headW; m.pt.bend = .2 + excite*.18; m.pt.pel = .9 - excite*.06; } }
  else if (ph === 'corner') updCorner(dt, t);
  else if (ph === 'done') updDone(dt, t);
  for (const k of [P, O]) if (k && k.f.anim && k.f.anim.dazed && ph !== 'browse' && !(A3.men[k.side] && A3.men[k.side].hold)) updKO(k, dt, t);
  for (const k of [P, O]) if (k){
    if (!k.held && !k.lock && !k.falling && !(k.ko && k.koRoll)) moveActor(k, dt, false);
    if (k.falling){ k.vy -= 9.8*dt; k.y = Math.max(0, k.y + k.vy*dt); k.pt.flap = 1; k.pt.wing = .5; k.footMode = 'air';
      if (k.y <= 0){ k.falling = false; k.pt.flap = 0; k.pt.wing = 0; k.footMode = 'ground'; initFeet(k, .043*sizeOf(k)); land(k); } }
    if (!k.held && !k.air && !k.falling && !k.koRoll){ stepFeet(k, dt, birdStep(k)); k.hFeet = k.feetW; k.bob = k.walking ? -Math.abs(Math.sin(t*15))*.007 : 0; }
    else k.walking = false;
  }
  if (P && O && !P.held && !O.held && ph !== 'release' && (!A3.busy || (P.y < .05 && O.y < .05))){ const mn = A3.busy ? .185 : .2, d = V3().subVectors(O.pos, P.pos).setY(0), l = d.length(); if (l < mn && l > 1e-4){ d.multiplyScalar((mn - l)/l*.5); P.pos.sub(d); O.pos.add(d); } }
  for (const m of [A3.men.p, A3.men.o]) if (m){ moveActor(m, dt, true); stepFeet(m, dt, manStep); }
  for (const side of ['p', 'o']){ const m = A3.men[side], k = A3.birds[side];
    if (m && k && m.hold){ holdPose(m, k, dt); if (m.hold.mode !== 'ground') m.snap = false; }
    else if (k && k.held){ k.held = null; k.falling = k.y > .02; k.vy = 0; }
    if (m && !m.hold) m.hands = [null, null]; }
  for (const k of [P, O]) if (k) aimStep(k, k === P ? O : P, dt, t);
  for (const k of [P, O]) if (k){ poseKori(k, dt, clock*1000); if (!k.headW) k.headW = V3(); k.head.getWorldPosition(k.headW); }
  for (const side of ['p', 'o']){ const m = A3.men[side], k = A3.birds[side]; if (!m) continue; if (m.hold && k){ handsOnBird(m, k); specialHands(m, k, t); } poseHuman(m, dt, clock*1000); }
  if (A3.tiers) for (const side of ['p', 'o']){ const tm = A3.tiers[side]; if (tm && tm.root.visible){ stepFeet(tm, dt, manStep); poseHuman(tm, dt, clock*1000); } }
  // the world around
  const W = built;
  if (!api.noCrowd) updateCrowd(W.crowd, t, excite, P && O ? (P.pos.x + O.pos.x)/2 : 0);
  W.flags.forEach((f, i) => { f.rotation.x = Math.sin(t*2.2 + i*.7)*.25; });
  if (W.glowMesh) W.glowMesh.material.uniforms.op.value = .55 + Math.sin(t*3.1)*.05 + excite*.12;
  A3.fx.dust.update(dt); A3.fx.water.update(dt); A3.fx.feathers.update(dt, t);
  if (scuffDirty && (!W.sandUp || now - W.sandUp > 900)){ W.sand.needsUpdate = true; W.sandUp = now; scuffDirty = 0; }
  // camera
  direct(t);
  if (api.camOverride){ camS.wp.set(...api.camOverride.pos); camS.wt.set(...api.camOverride.tgt); camS.cut = true; }
  if (camS.cut){ camS.pos.copy(camS.wp); camS.tgt.copy(camS.wt); camS.cut = false; POST.cut = true; }
  camS.pos.x = smooth(camS.pos.x, camS.wp.x, camS.k, dtC); camS.pos.y = smooth(camS.pos.y, camS.wp.y, camS.k, dtC); camS.pos.z = smooth(camS.pos.z, camS.wp.z, camS.k, dtC);
  camS.tgt.x = smooth(camS.tgt.x, camS.wt.x, camS.k*1.4, dtC); camS.tgt.y = smooth(camS.tgt.y, camS.wt.y, camS.k*1.4, dtC); camS.tgt.z = smooth(camS.tgt.z, camS.wt.z, camS.k*1.4, dtC);
  shake = Math.max(0, shake - dtR*.08);
  CAM.position.copy(camS.pos); if (shake > 0 && !reduceMotion) CAM.position.add(V3(rnd(-1,1)*shake, rnd(-1,1)*shake, rnd(-1,1)*shake));
  if (CAM.position.y < .06) CAM.position.y = .06;
  CAM.lookAt(camS.tgt);
  const tR0 = performance.now(); renderOut(W.scene, CAM, dtC); const tR1 = performance.now();
  const P2 = api.prof || (api.prof = {js:0, render:0, n:0}); P2.render += tR1 - tR0; P2.js += tR0 - (api._t0 || tR0); P2.n++;
  api.fps = Math.round(smooth(api.fps || 30, 1/Math.max(rawDt, .001), 2, dtC)*10)/10;
  // keep it smooth: when frames drop below ~40 for a moment, step the quality down one tier (never during a warm-up hitch)
  if (!api.capDt && performance.now() > (api.holdUntil || 0) && rawDt < .25){ api.lowT = api.fps < 40 ? (api.lowT || 0) + rawDt : Math.max(0, (api.lowT || 0) - rawDt); if (api.lowT > 1.8 && api.tier < 3){ api.lowT = 0; applyTier(api.tier + 1, 'fps ' + api.fps); } }
  if (A3.needWarm){ A3.needWarm = false; if (api.tier >= 2 && built) stripMats(built.scene); warmUp(); api.holdUntil = performance.now() + 3000; }
}
api.init = () => {
  if (R3) return api.on;
  try {
    const host = cv.parentElement;
    cv3 = document.createElement('canvas'); cv3.id = 'cv3'; cv3.setAttribute('aria-hidden', 'true');
    cv3.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
    host.insertBefore(cv3, cv); cv.style.position = 'relative'; cv.style.zIndex = '1';
    api.tier = defaultTier();
    R3 = new T3.WebGLRenderer({canvas:cv3, antialias:api.tier < 3, powerPreference:'high-performance'});
    R3.outputColorSpace = T3.SRGBColorSpace; R3.toneMapping = T3.ACESFilmicToneMapping; R3.shadowMap.enabled = true; R3.shadowMap.type = T3.PCFSoftShadowMap;
    api.lowEnd = Math.min(screen.width, screen.height) < 500 || (navigator.hardwareConcurrency || 4) <= 4;
    R3.debug.checkShaderErrors = false; R3.info.autoReset = false; api.post = api.tier === 0; try { if (localStorage.getItem('kori-post') === 'off') api.post = false; } catch(e) {}
    CAM = new T3.PerspectiveCamera(42, 1.4, .07, 140);
    api.on = true; api.canvas = cv3;
  } catch(e) { api.on = false; if (cv3) cv3.remove(); R3 = null; }
  return api.on;
};
api.resize = (w, h) => { if (!R3) return; W3 = w; H3 = h; R3.setPixelRatio(Math.min(window.devicePixelRatio || 1, TIER_PR[api.tier || 0])); R3.setSize(w, h, false); if (cv3 && cv3.parentElement) cv3.parentElement.classList.toggle('nopost', !api.post); CAM.aspect = w/h; CAM.fov = w/h < 1.2 ? 50 : 42; CAM.updateProjectionMatrix(); };
api.ready = () => !api.on || !R3 || !!(built && built.vk === (VENUES[save.venue] ? save.venue : 'temple') && (!F || (A3.birds && A3.birds.p)));
// build the ring while the player is still in the village so tapping Battle is instant
api.prewarm = () => { if (!api.on || !R3 || api.warmed) return; api.warmed = true; try { ensureWorld(); if (A3.needWarm){ A3.needWarm = false; if (api.tier >= 2 && built) stripMats(built.scene); warmUp(); } } catch(e) { console.warn('prewarm', e); } };
api.frame = now => { if (!api.on) return; try { frame3(now); } catch(e) { console.error('3D frame', e); api.fail = (api.fail || 0) + 1; if (api.fail > 30){ api.on = false; if (cv3) cv3.style.display = 'none'; } } };
api.clash = (pm, om, winner) => clash3D(pm, om, winner);
api.reset = () => { A3.phase = null; };
api.F = () => F;
api.setTier = (t, why) => applyTier(t, why || 'manual');
api.setQ = o => { if (o.post != null) api.post = o.post; if (o.dof != null) api.dofK = o.dof; if (o.pr){ R3.setPixelRatio(o.pr); R3.setSize(W3, H3, false); }
  if (o.shadows != null){ R3.shadowMap.enabled = o.shadows; built.scene.traverse(m => { if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => x.needsUpdate = true); }); }
  if (o.crowd != null){ for (const k in built.crowd.parts) built.crowd.parts[k].visible = o.crowd; api.noCrowd = !o.crowd; }
  if (o.birds != null) for (const s of ['p','o']) if (A3.birds[s]) A3.birds[s].root.visible = o.birds;
  api.prof = {js:0, render:0, n:0}; };
api.readProf = () => { const p = api.prof || {n:1}; return {fps:api.fps, js:+(p.js/p.n).toFixed(1), render:+(p.render/p.n).toFixed(1), pr:R3.getPixelRatio(), tier:api.tier, post:!!(api.post && POST.ok), n:p.n, calls:R3.info.render.calls, tris:R3.info.render.triangles}; };
api.dump = () => { const out = []; built.scene.traverse(o => { if (o.isMesh && !o.isInstancedMesh){ const p = o.getWorldPosition(V3()); if (Math.hypot(p.x, p.z) < 1.0 && p.y < .6) out.push({n:o.geometry.type, p:p.toArray().map(v => +v.toFixed(2)), par:o.parent && o.parent.type, mat:o.material.color && o.material.color.getHexString()}); } }); return out; };
api.state = () => ({fps:api.fps, calls:R3 && R3.info.render.calls, tris:R3 && R3.info.render.triangles, u:F && F.introU, phase:A3.phase, busy:A3.busy, birds:['p','o'].map(s => A3.birds[s] && {x:+A3.birds[s].pos.x.toFixed(2), z:+A3.birds[s].pos.z.toFixed(2), y:+A3.birds[s].y.toFixed(2), ko:!!A3.birds[s].ko, held:!!A3.birds[s].held}), men:['p','o'].map(s => A3.men[s] && {x:+A3.men[s].pos.x.toFixed(2), z:+A3.men[s].pos.z.toFixed(2), goal:A3.men[s].goal && +A3.men[s].goal.x.toFixed(2), hold:A3.men[s].hold && A3.men[s].hold.mode, inScene:!!A3.men[s].root.parent}), cam:camS.pos.toArray().map(v => +v.toFixed(2))});
return api;
})();
