// ---------- crowd: real body shapes (men in lungis or trousers, women in saris, kids, front row squatting),
// painted faces, cloth folds, heads that follow the fight, arms that clap and cheer, phones held up; all instanced ----------
function crowdAtlas(){
  if (TEX.crowd) return TEX.crowd;
  return TEX.crowd = ctex(512, 512, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const R = seeded(31), U = u => u*256, Vv = th => th/PI*256;
    const blob = (u, th, rx, ry, col, a, blur) => { g.save(); g.filter = `blur(${blur}px)`; g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(U(u), Vv(th), rx, ry, 0, 0, TAU); g.fill(); g.restore(); };
    // face (top left, wrapped on the head sphere: front of the face at u = .5) — features multiply the skin tone
    blob(.5, .74*PI, 34, 10, '#9a8a82', .35, 6);                                                   // under the jaw
    for (const s of [-1, 1]){ blob(.5 + s*.07, .44*PI, 13, 7, '#6a5a52', .6, 3); blob(.5 + s*.068, .45*PI, 5, 3, '#fff8f0', .85, .7); blob(.5 + s*.068, .45*PI, 2.4, 2.4, '#140c08', 1, .4);
      g.save(); g.filter = 'blur(.8px)'; g.strokeStyle = '#2a2018'; g.lineWidth = 3.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(U(.5 + s*.03), Vv(.405*PI)); g.quadraticCurveTo(U(.5 + s*.07), Vv(.385*PI), U(.5 + s*.11), Vv(.41*PI)); g.stroke(); g.restore();
      blob(.5 + s*.1, .56*PI, 14, 9, '#c89080', .22, 5); }                                          // cheeks
    blob(.5, .57*PI, 6, 3, '#5a4038', .5, 1.5);                                                     // under the nose
    blob(.5, .635*PI, 11, 3, '#7a4a40', .8, 1.2); blob(.5, .645*PI, 9, 2, '#4a2a24', .5, .8);       // lips
    // cloth (top right): soft folds and weave, around white so it takes any colour
    g.save(); g.translate(256, 0);
    for (let i=0;i<34;i++){ const x = R()*256, ww = 6 + R()*18, v = R() < .5; const gr = g.createLinearGradient(x - ww, 0, x + ww, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, v ? 'rgba(255,255,255,.0)' : 'rgba(0,0,0,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - ww, R()*80, ww*2, 256); }
    for (let i=0;i<2600;i++){ g.fillStyle = R() < .5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)'; g.fillRect(R()*256, R()*256, 2, 1); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 248, 256, 8); g.restore();                      // hem
    // hair (bottom right): strands
    g.save(); g.translate(256, 256); g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, 256, 256);
    for (let i=0;i<3000;i++){ const x = R()*256, y = R()*256, l = 6 + R()*14; g.strokeStyle = R() < .5 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R()*3 - 1.5, y + l); g.stroke(); }
    g.restore();
  });
}
// a body builder that keeps, per vertex: zone (0 skin, 1 top, 2 bottom, 3 hair, 4 face, 5 dark, 6 phone), arm side, head flag, baked shade
const CREG = {face:[0, .5, .5, .5], cloth:[.5, .5, .5, .5], skin:[.25, .25, 0, 0], hair:[.5, .01, .5, .48]};
function crowdBody(){
  const A = {p:[], n:[], uv:[], zone:[], arm:[], hd:[]};
  const api2 = {
    add(geo, zone, reg, arm = 0, hd = 0, mat = null){
      const g = (geo.index ? geo.toNonIndexed() : geo.clone()); if (mat) g.applyMatrix4(mat);
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, [u0, v0, su, sv] = CREG[reg];
      for (let i=0;i<p.count;i++){ A.p.push(p.getX(i), p.getY(i), p.getZ(i)); A.n.push(n.getX(i), n.getY(i), n.getZ(i));
        A.uv.push(u0 + (uv ? clamp(uv.getX(i), 0, 1) : 0)*su, v0 + (uv ? clamp(uv.getY(i), 0, 1) : 0)*sv); A.zone.push(zone); A.arm.push(arm); A.hd.push(hd); }
      return api2; },
    // a limb or a cloth tube from a to b; prof rows [t 0..1, rx, rz]
    tube(a, b, prof, segs, zone, reg, arm = 0, hd = 0, wob){
      const d = V3().subVectors(b, a), L = d.length(); const geo = tubeGeo(prof.map(([t, rx, rz]) => [t*L, rx, rz]), segs, {wob});
      const q = new T3.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize());
      return api2.add(geo, zone, reg, arm, hd, new T3.Matrix4().compose(a, q, V3(1, 1, 1))); },
    blob(c, r, sc, zone, reg, arm = 0, hd = 0, rot, ws = 10, hs = 7){ const geo = new T3.SphereGeometry(r, ws, hs);
      return api2.add(geo, zone, reg, arm, hd, new T3.Matrix4().compose(c, new T3.Quaternion().setFromEuler(new T3.Euler(...(rot || [0, 0, 0]))), V3(...sc))); },
    build(shade){
      const g = new T3.BufferGeometry(), n = A.zone.length, ao = new Float32Array(n);
      for (let i=0;i<n;i++) ao[i] = shade(A.p[i*3], A.p[i*3+1], A.p[i*3+2], A.n[i*3+1], A.zone[i]);
      g.setAttribute('position', new T3.Float32BufferAttribute(A.p, 3)); g.setAttribute('normal', new T3.Float32BufferAttribute(A.n, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(A.uv, 2));
      const za = new Float32Array(n*4); for (let i=0;i<n;i++){ za[i*4] = A.zone[i]; za[i*4+1] = A.arm[i]; za[i*4+2] = A.hd[i]; za[i*4+3] = ao[i]; }
      g.setAttribute('zah', new T3.BufferAttribute(za, 4));                 // zone, arm side, head flag, baked shade — packed to stay under 16 attributes
      g.computeBoundingSphere(); return g; } };
  return api2;
}
// head, hair, ears, nose (+ mustache) around a neck pivot; y0 = centre height of the head
function crowdHead(B, y0, o){
  const hg = new T3.SphereGeometry(.1, 16, 12), hp = hg.attributes.position;
  for (let i=0;i<hp.count;i++){ let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i); const low = Math.max(0, -y/.1); z *= .82*(1 - .25*low*low); y *= 1.1; if (low > .3) x += Math.max(0, x/.1)*.012*low; hp.setXYZ(i, x*.97, y, z); }
  hg.computeVertexNormals();
  B.add(hg, 4, 'face', 0, 1, new T3.Matrix4().makeTranslation(0, y0, 0));
  B.add(new T3.ConeGeometry(.014, .045, 6).rotateZ(-PI/2 - .4), 0, 'skin', 0, 1, new T3.Matrix4().makeTranslation(.095, y0 - .005, 0));
  for (const s of [-1, 1]) B.blob(V3(-.004, y0, s*.079), .022, [.55, 1, .35], 0, 'skin', 0, 1, null, 6, 5);
  if (o.bald !== true){ const hr = new T3.SphereGeometry(.104, 14, 7, 0, TAU, 0, PI*(o.long ? .6 : .52)), q = hr.attributes.position;
    for (let i=0;i<q.count;i++){ const x = q.getX(i), y = q.getY(i), z = q.getZ(i), back = Math.max(0, -x/.1); q.setXYZ(i, x, y*1.06 - (y < .03 ? back*.03 : 0), z*.88); } hr.computeVertexNormals();
    B.add(hr, 3, 'hair', 0, 1, new T3.Matrix4().compose(V3(-.012, y0 + .016, 0), new T3.Quaternion().setFromEuler(new T3.Euler(0, 0, o.long ? .5 : .66)), V3(1, 1, 1))); }
  if (o.mustache) B.add(new T3.CapsuleGeometry(.007, .042, 3, 6).rotateX(PI/2), 3, 'hair', 0, 1, new T3.Matrix4().makeTranslation(.092, y0 - .032, 0));
  if (o.bun) B.blob(V3(-.1, y0 - .02, 0), .045, [1, .9, 1.1], 3, 'hair', 0, 1);
  if (o.braid) B.tube(V3(-.1, y0 - .02, 0), V3(-.13, y0 - .42, 0), [[0, .03, .035], [.5, .026, .03], [1, .016, .018]], 6, 3, 'hair', 0, 0);
  if (o.cap) B.blob(V3(-.005, y0 + .045, 0), .108, [1, .55, .92], o.cap, 'cloth', 0, 1, null, 12, 6);
}
// an arm from a shoulder through elbow and wrist; sleeve length in 0..1 of the upper arm (2 = full sleeve)
function crowdArm(B, s, sh, el, wr, hand, sleeve, o = {}){
  B.tube(sh, el, [[0, .048, .05], [.5, .046, .045], [1, .039, .04]], 8, 0, 'skin', s);
  if (sleeve > 0){ const e2 = sh.clone().lerp(el, Math.min(1, sleeve)); B.tube(sh.clone().add(V3(0, .025, 0)), e2, [[0, .058, .06], [1, .053, .052]], 9, 1, 'cloth', s); }
  B.tube(el, wr, [[0, .04, .041], [1, .03, .033]], 8, sleeve > 1 ? 1 : 0, sleeve > 1 ? 'cloth' : 'skin', s);
  const d = V3().subVectors(hand, wr), q = new T3.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.clone().normalize());
  B.add(new T3.CapsuleGeometry(.024, .05, 3, 7).scale(1, 1, .55).translate(0, .03, 0), 0, 'skin', s, 0, new T3.Matrix4().compose(wr, q, V3(1, 1, 1)));
  if (o.phone) B.add(new T3.BoxGeometry(.075, .15, .01).translate(0, .1, 0), 6, 'skin', s, 0, new T3.Matrix4().compose(wr, q, V3(1, 1, 1)));
}
const CROWD_PIV = {};
function crowdGeos(){
  if (TEX.crowdGeo) return TEX.crowdGeo;
  const out = {};
  const stdShade = (x, y, z, ny, zone) => (.55 + .45*sstep0(0, .7, y))*(ny < -.5 ? .78 : 1);
  // 1) man in a lungi and shirt, standing
  { const B = crowdBody();
    for (const s of [-1, 1]) B.blob(V3(.06, .035, s*.085), .05, [2.3, .7, 1], 0, 'skin');
    B.tube(V3(0, .1, 0), V3(0, 1.03, 0), [[0, .17, .205], [.25, .158, .2], [.6, .142, .19], [.85, .13, .172], [1, .122, .162]], 14, 2, 'cloth', 0, 0, (a, v) => 1 + Math.sin(a*7)*.025*(1 - v));
    B.tube(V3(0, .94, 0), V3(0, 1.5, 0), [[0, .128, .166], [.18, .124, .162], [.45, .13, .178], [.68, .132, .19], [.8, .127, .196], [.87, .114, .19], [.92, .098, .165], [.96, .078, .12], [1, .062, .072]], 14, 1, 'cloth');
    B.tube(V3(0, 1.45, 0), V3(.012, 1.57, 0), [[0, .047, .05], [1, .044, .047]], 8, 0, 'skin', 0, 1);
    crowdHead(B, 1.64, {mustache:true});
    for (const s of [-1, 1]) crowdArm(B, s, V3(0, 1.41, s*.2), V3(-.025, 1.13, s*.222), V3(.06, .88, s*.215), V3(.08, .81, s*.205), .45, {phone:s > 0});
    out.manL = B.build(stdShade); }
  // 2) man in trousers and a shirt (also the kids, scaled down)
  { const B = crowdBody();
    for (const s of [-1, 1]){ B.blob(V3(.06, .04, s*.09), .052, [2.3, .75, 1], 5, 'skin'); B.tube(V3(0, .97, s*.088), V3(.0, .08, s*.09), [[0, .085, .085], [.45, .07, .068], [1, .055, .055]], 10, 2, 'cloth'); }
    B.tube(V3(0, .86, 0), V3(0, 1.02, 0), [[0, .14, .175], [1, .128, .17]], 14, 2, 'cloth');
    B.tube(V3(0, .9, 0), V3(0, 1.5, 0), [[0, .134, .172], [.2, .126, .164], [.45, .13, .178], [.68, .132, .19], [.8, .127, .196], [.87, .114, .19], [.92, .098, .165], [.96, .078, .12], [1, .062, .072]], 14, 1, 'cloth');
    B.tube(V3(0, 1.45, 0), V3(.012, 1.57, 0), [[0, .047, .05], [1, .044, .047]], 8, 0, 'skin', 0, 1);
    crowdHead(B, 1.64, {mustache:false});
    for (const s of [-1, 1]) crowdArm(B, s, V3(0, 1.41, s*.2), V3(-.025, 1.13, s*.222), V3(.06, .88, s*.215), V3(.08, .81, s*.205), 2, {phone:s > 0});
    out.manT = B.build(stdShade); }
  // 3) woman in a sari: long skirt, blouse, the pallu over the left shoulder, a bun or braid
  { const B = crowdBody();
    for (const s of [-1, 1]) B.blob(V3(.13, .025, s*.07), .03, [1.6, .6, 1], 0, 'skin');
    B.tube(V3(0, .01, 0), V3(0, 1.0, 0), [[0, .19, .215], [.3, .172, .205], [.7, .145, .182], [.92, .124, .158], [1, .118, .152]], 14, 2, 'cloth', 0, 0, (a, v) => 1 + Math.sin(a*9)*.03*(1 - v));
    B.tube(V3(0, .96, 0), V3(0, 1.45, 0), [[0, .118, .152], [.2, .112, .148], [.5, .132, .165], [.72, .125, .178], [.88, .1, .18], [.96, .072, .14], [1, .052, .065]], 14, 1, 'cloth');
    B.tube(V3(.03, 1.42, -.15), V3(.13, 1.0, .1), [[0, .03, .075], [.5, .032, .095], [1, .03, .1]], 8, 2, 'cloth');
    B.tube(V3(-.02, 1.43, -.15), V3(-.15, .86, -.13), [[0, .03, .08], [1, .035, .13]], 8, 2, 'cloth');
    B.tube(V3(0, 1.4, 0), V3(.012, 1.52, 0), [[0, .041, .043], [1, .039, .041]], 8, 0, 'skin', 0, 1);
    crowdHead(B, 1.585, {bun:true, long:true});
    for (const s of [-1, 1]) crowdArm(B, s, V3(0, 1.36, s*.175), V3(-.025, 1.1, s*.198), V3(.07, .87, s*.19), V3(.09, .81, s*.18), .3, {phone:s > 0});
    out.woman = B.build(stdShade); }
  // 4) man squatting on the ground at the front, arms on his knees
  { const B = crowdBody(); const y = -.82;
    for (const s of [-1, 1]){ B.blob(V3(.36, .035, s*.13), .05, [2.2, .7, 1], 0, 'skin');
      B.tube(V3(-.04, .2, s*.1), V3(.27, .5, s*.15), [[0, .1, .1], [1, .07, .072]], 10, 2, 'cloth');
      B.tube(V3(.27, .5, s*.15), V3(.33, .08, s*.13), [[0, .068, .07], [1, .052, .055]], 10, 2, 'cloth'); }
    B.blob(V3(-.05, .22, 0), .1, [1.4, 1, 1.95], 2, 'cloth');
    B.tube(V3(-.02, .94 + y, 0), V3(.05, 1.5 + y, 0), [[0, .128, .166], [.18, .124, .162], [.45, .13, .178], [.68, .132, .19], [.8, .127, .196], [.87, .114, .19], [.92, .098, .165], [.96, .078, .12], [1, .062, .072]], 14, 1, 'cloth');
    B.tube(V3(.04, 1.45 + y, 0), V3(.06, 1.57 + y, 0), [[0, .047, .05], [1, .044, .047]], 8, 0, 'skin', 0, 1);
    crowdHead(B, 1.64 + y, {mustache:true});
    for (const s of [-1, 1]) crowdArm(B, s, V3(.04, 1.41 + y, s*.2), V3(.23, .45, s*.21), V3(.38, .5, s*.17), V3(.44, .5, s*.15), .45);
    out.sit = B.build((x, yy, z, ny) => (.6 + .4*sstep0(0, .5, yy))*(ny < -.5 ? .75 : 1)); }
  CROWD_PIV.std = {shL:V3(0, 1.41, -.2), shR:V3(0, 1.41, .2), nk:V3(0, 1.5, 0)};
  CROWD_PIV.woman = {shL:V3(0, 1.36, -.175), shR:V3(0, 1.36, .175), nk:V3(0, 1.45, 0)};
  CROWD_PIV.sit = {shL:V3(.04, .59, -.2), shR:V3(.04, .59, .2), nk:V3(.05, .68, 0)};
  return TEX.crowdGeo = out;
}
function crowdMat(piv){
  const m = new T3.MeshStandardMaterial({map:crowdAtlas(), roughness:.86});
  m.onBeforeCompile = sh => {
    sh.uniforms.shL = {value:piv.shL}; sh.uniforms.shR = {value:piv.shR}; sh.uniforms.nkP = {value:piv.nk};
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec4 zah;
attribute vec3 iSkin; attribute vec3 iUp; attribute vec3 iLow; attribute vec3 iHair; attribute vec4 iAnim; attribute vec4 iMisc;
uniform vec3 shL; uniform vec3 shR; uniform vec3 nkP; varying vec3 vTint;
mat3 rX(float a){ float c = cos(a), s = sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 rZ(float a){ float c = cos(a), s = sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
mat3 rY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }`)
      .replace('#include <beginnormal_vertex>', `float zone = zah.x, arm = zah.y, hd = zah.z, ao = zah.w; vec3 objectNormal = vec3(normal);
  mat3 LR = mat3(1.); if (arm != 0.){ float rr = arm < 0. ? iAnim.x : iAnim.y; float ff = arm < 0. ? iAnim.z : iMisc.y; LR = rX(-arm*rr)*rZ(ff); }
  objectNormal = LR*objectNormal; if (hd > .5) objectNormal = rY(iAnim.w)*objectNormal;`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
  if (zone > 5.5 && iMisc.x < .5) transformed = arm < 0. ? shL : shR;
  if (arm != 0.){ vec3 pv = arm < 0. ? shL : shR; transformed = pv + LR*(transformed - pv); }
  if (hd > .5) transformed = nkP + rY(iAnim.w)*(transformed - nkP);
  vTint = (zone < .5 ? iSkin : zone < 1.5 ? iUp : zone < 2.5 ? iLow : zone < 3.5 ? iHair : zone < 4.5 ? iSkin : zone < 5.5 ? vec3(.03,.025,.02) : vec3(.02,.02,.025))*ao;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', 'diffuseColor.rgb *= vTint;');
  };
  return m;
}
// ---------- build the crowd ----------
function buildCrowd(S, vk){
  const people = [], rows = [[3.15, 0, 1], [3.75, 0], [4.35, .24], [4.95, .5], [5.6, .8], [6.25, 1.1]];
  const SKIN = ['#9c6e52','#8e5f45','#7d5039','#6c4431','#a97c60','#5e3c2b','#84583f','#936a50','#b08668'], HAIR = ['#15100d','#1b1511','#241a14','#3a2a1e','#100c0a'];
  const SHIRT = ['#f1ece0','#e3dccb','#cfd8e0','#7fa3c8','#c0483a','#d89b3a','#5d8f6b','#4a5f8c','#8a6a9c','#b8a07a','#2f3a55','#a14b4b','#3b7a8a','#ffffff','#e9e4d6','#d6cfbf'];
  const LUNGI = ['#f4f0e4','#ece6d6','#e8e1cf','#3a5a8a','#7a2a2a','#2f5a3a','#efe9d8','#5a4a7a'], TROU = ['#2b3a67','#2d3140','#4b4a44','#3a3f4f','#6a604e','#22262e','#7a6a52'];
  const SARI = ['#c1272d','#d4568a','#e0922a','#2a73b8','#3f9a63','#7a4fb3','#b8325a','#e6c14a','#1f7a7a'];
  const G = crowdGeos();
  rows.forEach(([r, base, sit], ri) => {
    const n = Math.floor(TAU*r/(sit ? .52 : .44));
    for (let i=0;i<n;i++){
      const a = (i + (ri%2)*.5)/n*TAU + rnd(-.035, .035);
      if (Math.abs(Math.cos(a)) > .955) continue;
      const roll = Math.random(), kind = sit ? 'sit' : roll < .1 ? 'kid' : roll < .32 ? 'woman' : roll < .7 ? 'manL' : 'manT';
      const sc = (kind === 'kid' ? rnd(.62, .78) : kind === 'woman' ? rnd(.92, .98) : rnd(.95, 1.06)), rr = r + rnd(-.09, .09);
      const grey = kind !== 'woman' && kind !== 'kid' && Math.random() < .14;
      people.push({x:Math.cos(a)*rr, z:Math.sin(a)*rr, base, sc, kind, geo:kind === 'kid' ? 'manT' : kind, h:Math.atan2(Math.sin(a), -Math.cos(a)) + rnd(-.25, .25),
        skin:pick(SKIN), hair:grey ? pick(['#bdb8ae','#d8d4cc','#8a857c']) : pick(HAIR),
        up:kind === 'woman' ? pick(SARI) : pick(SHIRT), low:kind === 'woman' ? pick(SARI) : kind === 'manT' || kind === 'kid' ? pick(TROU) : pick(LUNGI),
        ph:rnd(0, TAU), cheer:rnd(.25, 1), arms:pick(['up', 'up', 'clap', 'clap', 'fist']), idleF:rnd(-.05, .35), idleR:rnd(.02, .14),
        phone:!sit && kind !== 'kid' && Math.random() < .13, look:rnd(-.2, .2), talk:Math.random() < .12 ? rnd(-1, 1) : 0});
      if (people[people.length - 1].kind === 'woman' && Math.random() < .5) people[people.length - 1].up = mixHex(people[people.length - 1].low, pick(['#e8c060', '#ffffff', '#3a2a5a']), .55);
    }
  });
  const meshes = {};
  for (const key of ['manL', 'manT', 'woman', 'sit']){
    const list = people.filter(p => p.geo === key); if (!list.length) continue;
    const geo = G[key].clone(), N = list.length;
    const at = (name, size) => { const a = new T3.InstancedBufferAttribute(new Float32Array(N*size), size); geo.setAttribute(name, a); return a; };
    const iSkin = at('iSkin', 3), iUp = at('iUp', 3), iLow = at('iLow', 3), iHair = at('iHair', 3), iAnim = at('iAnim', 4), iMisc = at('iMisc', 4); iAnim.setUsage(T3.DynamicDrawUsage); iMisc.setUsage(T3.DynamicDrawUsage);
    list.forEach((p, i) => { const set = (A, hex, k = 1) => { const c = col3(hex); A.setXYZ(i, c.r*k, c.g*k, c.b*k); }; set(iSkin, p.skin); set(iUp, p.up, .92); set(iLow, p.low, .9); set(iHair, p.hair); p.mi = i; });
    const mesh = new T3.InstancedMesh(geo, crowdMat(key === 'woman' ? CROWD_PIV.woman : key === 'sit' ? CROWD_PIV.sit : CROWD_PIV.std), N);
    mesh.instanceMatrix.setUsage(T3.DynamicDrawUsage); mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false; S.add(mesh);
    meshes[key] = {mesh, list, iAnim, iMisc, full:N};
  }
  const benchM = std('#5a4430', {roughness:1});
  rows.forEach(([r, base]) => { if (base > 0){ const DEC = S.userData.decor || S; const st = mk(new T3.CylinderGeometry(r + .25, r + .25, base, 64, 1, true), benchM, 0, base/2, 0, false, true); benchM.side = T3.DoubleSide; DEC.add(st); const top = mk(new T3.RingGeometry(r - .3, r + .26, 64), benchM, 0, base, 0, false, true); top.rotation.x = -PI/2; DEC.add(top); } });
  return {people, meshes, parts:Object.fromEntries(Object.entries(meshes).map(([k, v]) => [k, v.mesh])), m:new T3.Matrix4(), q:new T3.Quaternion(), e:new T3.Euler(), s:V3(), p:V3()};
}
function updateCrowd(cr, t, ex, focusX){
  const {meshes, m, q, e, s, p} = cr;
  for (const key in meshes){ const {mesh, list, iAnim, iMisc} = meshes[key];
    for (let li = 0, ln = mesh.count; li < ln; li++){ const o = list[li];
      const hype = clamp(ex*o.cheer*1.35, 0, 1), sitting = o.kind === 'sit';
      const jump = !sitting && hype > .55 ? Math.max(0, Math.sin(t*9 + o.ph))*.06*hype : 0;
      const sway = Math.sin(t*1.2 + o.ph)*.025 + hype*Math.sin(t*6 + o.ph)*.03;
      e.set(sway, o.h, sitting ? 0 : -hype*.06); q.setFromEuler(e); s.setScalar(o.sc); p.set(o.x, o.base + jump + (sitting ? Math.max(0, Math.sin(t*7 + o.ph))*.02*hype : 0), o.z);
      m.compose(p, q, s); mesh.setMatrixAt(o.mi, m);
      // head follows the fight (or the neighbour he is talking to)
      const dx = (focusX || 0) - o.x, dz = -o.z, want = Math.atan2(-dz, dx) - o.h; let yaw = ((want + PI) % TAU + TAU) % TAU - PI;
      yaw = clamp(yaw, -.9, .9) + o.look*(1 - hype) + (o.talk && hype < .3 ? o.talk*(.5 + .3*Math.sin(t*.7 + o.ph)) : 0);
      let rL, rR, f, fR;
      if (hype > .25 && o.arms === 'up'){ const w = Math.sin(t*7 + o.ph)*.25; rL = hype*(2.4 + w); rR = hype*(2.4 - w); f = hype*.35; fR = f; }
      else if (hype > .25 && o.arms === 'clap'){ const c = Math.sin(t*15 + o.ph) > 0 ? .28 : .05; rL = -c*hype; rR = -c*hype; f = .3 + hype*1.05; fR = f; }
      else if (hype > .25){ const pump = Math.max(0, Math.sin(t*8 + o.ph)); rL = o.idleR; rR = hype*(.4 + pump*.25); f = o.idleF; fR = hype*(2.4 + pump*.4); }
      else { rL = o.idleR; rR = o.idleR; f = o.idleF + Math.sin(t*.9 + o.ph)*.03; fR = f; }
      if (o.phone && hype < .8){ rR = .22; fR = 2.25 + Math.sin(t*.5 + o.ph)*.06; }
      if (sitting && hype < .25){ rL = rR = 0; f = fR = 0; }
      iAnim.setXYZW(o.mi, rL, rR, f, yaw); iMisc.setXYZW(o.mi, o.phone && hype < .8 ? 1 : 0, fR, 0, 0);
    }
    mesh.instanceMatrix.needsUpdate = true; iAnim.needsUpdate = true; iMisc.needsUpdate = true;
  }
}
