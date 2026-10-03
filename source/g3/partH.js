// ---------- people: shaped bodies, painted faces, eyes, hair, hands with fingers, shirts with folds, tucked lungis ----------
// a tube along y with an elliptical cross-section per profile row: [y, rx (front-back), rz (side), cx (front shift)]
function tubeGeo(prof, segs, o = {}){
  const pos = [], uv = [], idx = [], n = prof.length;
  for (let i=0;i<n;i++){ const [y, rx, rz, cx = 0] = prof[i];
    for (let j=0;j<=segs;j++){ const a = j/segs*TAU, wob = o.wob ? o.wob(a, i/(n-1)) : 1; pos.push(cx + Math.cos(a)*rx*wob, y, Math.sin(a)*rz*wob); uv.push(o.uStart != null ? (o.uStart + j/segs) : j/segs, i/(n-1)); } }
  for (let i=0;i<n-1;i++) for (let j=0;j<segs;j++){ const a = i*(segs+1) + j, b = a + segs + 1; idx.push(a, b, a+1, a+1, b, b+1); }
  const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const HUMTEX = {};
function skinMat(hex){ return HUMTEX['sk' + hex] || (HUMTEX['sk' + hex] = new T3.MeshPhysicalMaterial({color:col3(hex), roughness:.6, sheen:.18, sheenRoughness:.7, sheenColor:col3(mixHex(hex, '#ff9070', .25)), clearcoat:.05, clearcoatRoughness:.7})); }
// the face, painted onto the head sphere's UV (front of the face at u = .5)
function faceTex(o){
  const key = 'face' + o.skin + o.hair + o.stubble + o.kind; if (HUMTEX[key]) return HUMTEX[key];
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = seeded(strHash(key));
  const sk = rgbOf(o.skin), U = u => u*W, Vv = th => th/PI*H;       // th: 0 top .. PI bottom
  g.fillStyle = o.skin; g.fillRect(0, 0, W, H);
  for (let i=0;i<4000;i++){ const v = R()*.12 - .06; g.fillStyle = v > 0 ? `rgba(255,220,200,${v})` : `rgba(60,20,10,${-v})`; g.fillRect(R()*W, R()*H, 2, 2); }
  const blob = (u, th, rx, ry, col, a, blur) => { g.save(); g.filter = `blur(${blur || 6}px)`; g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(U(u), Vv(th), rx, ry, 0, 0, TAU); g.fill(); g.restore(); };
  blob(.5 - .09, .56*PI, 26, 16, 'rgb(170,70,50)', .18); blob(.5 + .09, .56*PI, 26, 16, 'rgb(170,70,50)', .18);           // cheeks
  for (const s of [-1, 1]) blob(.5 + s*.07, .45*PI, 22, 10, 'rgb(40,20,15)', .28, 5);                                        // eye sockets
  if (o.stubble){ g.save(); g.filter = 'blur(3px)'; g.globalAlpha = .38; g.fillStyle = o.hair; g.beginPath(); g.ellipse(U(.5), Vv(.74*PI), 70, 34, 0, 0, TAU); g.fill(); g.restore(); }
  g.save(); g.filter = 'blur(1.4px)'; g.fillStyle = `rgb(${sk[0]*.62|0},${sk[1]*.42|0},${sk[2]*.4|0})`; g.beginPath(); g.ellipse(U(.5), Vv(.635*PI), 17, 4.2, 0, 0, TAU); g.fill(); g.restore();        // lips
  g.strokeStyle = 'rgba(40,15,10,.55)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(U(.5) - 15, Vv(.634*PI)); g.quadraticCurveTo(U(.5), Vv(.641*PI), U(.5) + 15, Vv(.634*PI)); g.stroke();
  for (const s of [-1, 1]){ g.save(); g.filter = 'blur(.8px)'; g.strokeStyle = o.hair; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(U(.5 + s*.03), Vv(.405*PI)); g.quadraticCurveTo(U(.5 + s*.07), Vv(.385*PI), U(.5 + s*.11), Vv(.41*PI)); g.stroke(); g.restore(); }   // brows
  // hairline: everything above it is hair colour (the hair mesh sits on top); sideburns
  g.save(); g.filter = 'blur(2px)'; g.fillStyle = o.hair; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, Vv(.32*PI));
  for (let i=40;i>=0;i--){ const u = i/40, d = Math.abs(u - .5), th = d < .18 ? .27*PI + d*.2 : .33*PI + (d - .18)*.6; g.lineTo(U(u), Vv(Math.min(.55*PI, th))); } g.closePath(); g.globalAlpha = o.kind === 'bald' ? .15 : .95; g.fill(); g.restore();
  const t = new T3.CanvasTexture(cv); t.colorSpace = T3.SRGBColorSpace; t.anisotropy = 4; return HUMTEX[key] = t;
}
function hairTex(hex){
  const key = 'hair' + hex; if (HUMTEX[key]) return HUMTEX[key];
  const t = ctex(256, 128, (g, w, h) => { g.fillStyle = hex; g.fillRect(0, 0, w, h*.72); const R = seeded(5);
    for (let i=0;i<1400;i++){ const x = R()*w, y = h*.7 + R()*h*.18*R(); g.strokeStyle = hex; g.lineWidth = 1; g.beginPath(); g.moveTo(x, h*.69); g.lineTo(x + (R() - .5)*3, y); g.stroke(); }
    for (let i=0;i<2600;i++){ const x = R()*w, y = R()*h*.8, l = 4 + R()*8, v = R(); g.strokeStyle = v < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l*.3, y + l); g.stroke(); } });
  return HUMTEX[key] = t;
}
// shirt cloth: plain or check, with a placket, buttons, a pocket and painted folds (and a matching fold normal map)
function shirtTex(o){
  const key = 'shirt' + o.shirt + o.check + o.pattern; if (HUMTEX[key]) return HUMTEX[key];
  const W = 512, H = 512, R = seeded(strHash(key));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const hc = document.createElement('canvas'); hc.width = W; hc.height = H; const hg = hc.getContext('2d'); hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
  g.fillStyle = o.shirt; g.fillRect(0, 0, W, H);
  if (o.pattern === 'check'){ g.globalAlpha = .5; g.fillStyle = o.check; for (let i=0;i<W;i+=28){ g.fillRect(i, 0, 9, H); g.fillRect(0, i, W, 9); } g.globalAlpha = .25; for (let i=14;i<W;i+=28){ g.fillRect(i, 0, 3, H); g.fillRect(0, i, W, 3); } g.globalAlpha = 1; }
  for (let i=0;i<3000;i++){ g.fillStyle = R() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; g.fillRect(R()*W, R()*H, 2, 1); }
  // folds: vertical drapes and creases near the waist, stronger at the sides
  for (let i=0;i<26;i++){ const x = R()*W, w = 8 + R()*22, len = H*(.3 + R()*.6), y0 = H - len; const v = R() < .5 ? 1 : -1;
    const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, v > 0 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.13)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - w, y0, w*2, len);
    const hg2 = hg.createLinearGradient(x - w, 0, x + w, 0); hg2.addColorStop(0, 'rgba(128,128,128,0)'); hg2.addColorStop(.5, v > 0 ? 'rgba(200,200,200,.6)' : 'rgba(40,40,40,.6)'); hg2.addColorStop(1, 'rgba(128,128,128,0)'); hg.fillStyle = hg2; hg.fillRect(x - w, y0, w*2, len); }
  for (let i=0;i<10;i++){ const y = H*(.04 + R()*.18), x = R()*W; g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 30, y - 6, x + 60, y + 2); g.stroke(); }
  // placket and buttons at the front (u = .5), a pocket on the left chest
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(W*.5 - 9, H*.0, 3, H); g.fillRect(W*.5 + 7, H*.0, 2, H);
  for (let i=0;i<6;i++){ g.fillStyle = '#e8e2d4'; g.beginPath(); g.arc(W*.5, H*(.1 + i*.15), 4.5, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2; g.strokeRect(W*.57, H*.62, W*.075, H*.11);
  const map = new T3.CanvasTexture(c); map.colorSpace = T3.SRGBColorSpace; map.anisotropy = 4; map.wrapS = T3.RepeatWrapping;
  const nmap = new T3.CanvasTexture(heightToNormal(hc, 1.4)); nmap.wrapS = T3.RepeatWrapping;
  return HUMTEX[key] = {map, nmap};
}
function lungiTex(o){
  const key = 'lungi' + o.lungi + o.border; if (HUMTEX[key]) return HUMTEX[key];
  const map = ctex(256, 256, (g, w, h) => { g.fillStyle = o.lungi; g.fillRect(0, 0, w, h); const R = seeded(9);
    for (let i=0;i<14;i++){ const x = R()*w; const gr = g.createLinearGradient(x - 10, 0, x + 10, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(0,0,0,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 10, 0, 20, h); }
    g.fillStyle = o.border || '#c08a2a'; g.fillRect(0, h*.04, w, h*.05); g.fillRect(0, h*.11, w, h*.015);
    for (let i=0;i<2000;i++){ g.fillStyle = R() < .5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; g.fillRect(R()*w, R()*h, 2, 1); } });
  map.wrapS = T3.RepeatWrapping; return HUMTEX[key] = map;
}
// a hand (wrist at the origin, fingers along -y, palm facing +x, thumb on the +z*side edge): palm, four three-jointed fingers with nails, a two-jointed thumb
const tubeUp = (pr, n, o) => tubeGeo(pr[0][0] > pr[pr.length - 1][0] ? pr.slice().reverse() : pr, n, o);   // rings must run upwards so faces point out
function buildHand(skin, side){
  const g = new T3.Group(), nail = HUMTEX['nail' + skin.uuid] || (HUMTEX['nail' + skin.uuid] = new T3.MeshStandardMaterial({color:skin.color.clone().lerp(col3('#f2d6c8'), .45), roughness:.32}));
  const palm = new T3.Mesh(tubeUp([[0, .015, .027], [-.025, .018, .038], [-.06, .017, .043], [-.085, .014, .042], [-.094, .011, .038]], 14, {wob:(a) => 1 - .12*Math.max(0, Math.cos(a))}), skin); palm.castShadow = true; g.add(palm);
  const fingers = [], cap = (r0, r1, l) => { const pr = []; for (let i=0;i<=5;i++){ const u = i/5, r = r0 + (r1 - r0)*u; pr.push([-u*l, r*.92, r]); } pr.push([-l - r1*.55, r1*.6, r1*.65]); pr.push([-l - r1*.85, .0005, .0005]); return tubeUp(pr, 9); };
  [[.06, .0082], [.075, .0088], [.081, .0092], [.073, .009]].forEach(([len, r], i) => {
    const z = (-1.55 + i*1.03)*.0205*side, L1 = len*.46, L2 = len*.3, L3 = len*.24;
    const f1 = new T3.Group(); f1.position.set(.001, -.09 + Math.abs(i - 2)*.003, z); g.add(f1);
    const s1 = new T3.Mesh(cap(r, r*.93, L1), skin); s1.castShadow = true; f1.add(s1);
    const f2 = new T3.Group(); f2.position.y = -L1; f1.add(f2); f2.add(new T3.Mesh(cap(r*.92, r*.84, L2), skin));
    const f3 = new T3.Group(); f3.position.y = -L2; f2.add(f3); f3.add(new T3.Mesh(cap(r*.84, r*.74, L3), skin));
    const nl = new T3.Mesh(new T3.SphereGeometry(r*.78, 10, 6), nail); nl.position.set(-r*.62, -L3*.62, 0); nl.scale.set(.32, 1.15, .82); f3.add(nl);
    fingers.push([f1, f2, f3]);
  });
  const t1 = new T3.Group(); t1.position.set(.008, -.018, .03*side); t1.rotation.set(-side*.55, 0, .35); g.add(t1);
  t1.add(new T3.Mesh(tubeUp([[0, .013, .015], [-.03, .012, .013], [-.04, .011, .012]], 10), skin));
  const t2 = new T3.Group(); t2.position.y = -.04; t1.add(t2); t2.add(new T3.Mesh(cap(.0102, .0095, .028), skin));
  const t3 = new T3.Group(); t3.position.y = -.028; t2.add(t3); t3.add(new T3.Mesh(cap(.0095, .0082, .024), skin));
  const tn = new T3.Mesh(new T3.SphereGeometry(.0078, 10, 6), nail); tn.position.set(-.0062, -.016, 0); tn.scale.set(.32, 1.15, .85); t3.add(tn);
  return {g, fingers, thumb:[t1, t2, t3], side};
}
function curlHand(H, grip){
  H.fingers.forEach(([f1, f2, f3], i) => { const g = grip*(1 + (i - 1.5)*.05); f1.rotation.set(0, 0, g*1.25); f2.rotation.z = g*1.55; f3.rotation.z = g*1.05; });
  H.thumb[0].rotation.set(-H.side*(.55 - grip*.25), 0, .35 + grip*.5); H.thumb[1].rotation.z = grip*.6; H.thumb[2].rotation.z = grip*.7;
}
// a bare foot: sole flat on the ground, heel, arch and instep, five toes (big toe on the inner side); ankle at (0, .075, 0)
function footGeo(s){
  const key = 'foot' + s; if (HUMTEX[key]) return HUMTEX[key];
  const g = new T3.SphereGeometry(1, 22, 14), p = g.attributes.position;
  for (let i=0;i<p.count;i++){ const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = (x + 1)/2;
    const hgt = .07 - .045*sstep0(.25, .95, u), wid = .033 + .019*sstep0(.05, .75, u) - .006*sstep0(.85, 1, u);
    const inner = z*s < 0 ? 1.08 : .95;
    p.setXYZ(i, -.06 + u*.245, y < 0 ? y*.007 + .007 : .007 + y*hgt, z*wid*inner - s*.008*u); }
  g.computeVertexNormals();
  const toes = [0, 1, 2, 3, 4].map(i => { const r = [.0125, .0088, .0082, .0075, .0068][i], x = .182 - i*.0085 - (i ? .006 : 0), zz = (-.031 + i*.0155)*s - s*.006;
    return placed(new T3.SphereGeometry(r, 10, 7), x, r*.85, zz, 0, 0, 0, 1.55, .8, .95); });
  return HUMTEX[key] = mergeGeos([g, ...toes]);
}
function buildHuman(o){
  const h = {o, root:new T3.Group(), pos:V3(), heading:0, vel:V3(), pose:{pel:.92, bend:.05, twist:0, kneel:0}, pt:{pel:.92, bend:.05, twist:0, kneel:0}, hands:[null, null], palmTo:[null, null], grip:[.15, .15], gripT:[.15, .15], look:null};
  const skin = skinMat(o.skin), st = shirtTex(o), shirt = new T3.MeshStandardMaterial({map:st.map, normalMap:st.nmap, normalScale:new T3.Vector2(.8, .8), roughness:.88, side:T3.DoubleSide});
  const lungi = new T3.MeshStandardMaterial({map:lungiTex(o), roughness:.92, side:T3.DoubleSide}), hairM = new T3.MeshStandardMaterial({map:hairTex(o.hair || '#15100d'), roughness:.75, alphaTest:.5, alphaToCoverage:true}), dark = std('#1a120c', {roughness:.8});
  const R = h.root;
  const pel = h.pel = new T3.Group(); R.add(pel);
  // lungi: waist band and hips, tucked up; each thigh gets its own sleeve of cloth so it bends with the legs
  const hips = new T3.Mesh(tubeGeo([[.02, .118, .158], [-.04, .13, .172], [-.1, .135, .18], [-.15, .13, .17]], 24, {wob:(a, v) => 1 + Math.sin(a*6)*.02*v}), lungi); hips.castShadow = true; pel.add(hips);
  pel.add(mk(tubeGeo([[.035, .121, .161], [.0, .124, .165]], 24), lungi));
  { const knot = mk(new T3.SphereGeometry(.03, 10, 8), lungi, .12, -.0, .03, true); knot.scale.set(.7, 1, 1.2); pel.add(knot); }
  const chest = h.chest = new T3.Group(); chest.position.y = .02; pel.add(chest);
  // shirt over a shaped torso: waist, chest, shoulders; hangs a little over the lungi
  const torsoProf = [[-.085, .125, .165], [.0, .11, .155], [.12, .108, .158], [.28, .118, .178], [.4, .122, .192], [.48, .108, .2], [.535, .085, .17], [.565, .06, .1], [.58, .05, .058]];
  const torso = new T3.Mesh(tubeGeo(torsoProf, 28, {uStart:.5}), shirt); torso.castShadow = true; chest.add(torso);
  chest.add(mk(new T3.TorusGeometry(.058, .012, 6, 18).rotateX(PI/2), shirt, 0, .585, 0));
  const neck = mk(tubeGeo([[.55, .052, .056], [.6, .05, .054], [.66, .047, .05]], 12), skin, 0, 0, 0, true); chest.add(neck);
  // head: a shaped skull with a painted face, eyes in sockets, nose, ears, hair, mustache
  const head = h.head = new T3.Group(); head.position.y = .655; chest.add(head);
  const hg = new T3.SphereGeometry(.1, 36, 26), hp = hg.attributes.position;
  for (let i=0;i<hp.count;i++){ let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i); const low = Math.max(0, -y/.1), front = Math.max(0, x/.1);
    const eyeLv = Math.exp(-Math.pow((y - .02)/.03, 2)); z *= .8*(1 - .26*low*low)*(1 + .05*eyeLv); x *= .98; y *= 1.1; if (low > .3) x += front*.01*low; if (y > .03 && x < 0) x *= 1.05;
    if (x > 0) for (const s of [-1, 1]){ const d2 = Math.pow((y*1.1 + .045 - .068)/.013, 2) + Math.pow((z - s*.029)/.016, 2); x -= .011*Math.exp(-d2); }
    hp.setXYZ(i, x, y, z); }
  hg.computeVertexNormals();
  const headMat = new T3.MeshPhysicalMaterial({map:faceTex(o), roughness:.55, sheen:.3, sheenColor:col3(mixHex(o.skin, '#ff6040', .4)), clearcoat:.08});
  const hm = new T3.Mesh(hg, headMat); hm.castShadow = true; hm.position.y = .045; head.add(hm);
  const noseG = mergeGeos([placed(new T3.ConeGeometry(.012, .048, 12), .09, .052, 0, 0, 0, -PI/2 - .42, 1, 1, .72), placed(new T3.SphereGeometry(.0095, 12, 10), .1, .034, 0, 0, 0, 0, 1, .75, 1.1), placed(new T3.SphereGeometry(.007, 10, 8), .094, .031, .011, 0, 0, 0, 1, .8, 1), placed(new T3.SphereGeometry(.007, 10, 8), .094, .031, -.011, 0, 0, 0, 1, .8, 1)]);
  const earG = [-1, 1].map(s => placed(new T3.SphereGeometry(.024, 10, 8), -.006, .05, s*.077, 0, 0, 0, .6, 1, .35));
  head.add(mk(mergeGeos([noseG, ...earG]), skin, 0, 0, 0, true));
  const eyeW = std('#ece6da', {roughness:.25}), iris = new T3.MeshPhysicalMaterial({color:col3('#2a1608'), roughness:.1, clearcoat:1});
  for (const s of [-1, 1]){ head.add(mk(new T3.SphereGeometry(.0098, 12, 10), eyeW, .077, .068, s*.029)); head.add(mk(new T3.SphereGeometry(.0052, 10, 8), iris, .0855, .068, s*.0292));
    const lid = mk(new T3.SphereGeometry(.0108, 12, 8, 0, TAU, 0, PI*.4), skin, .077, .0688, s*.029); lid.rotation.z = -.55; head.add(lid);
    const lo = mk(new T3.SphereGeometry(.0106, 12, 6, 0, TAU, PI*.68, PI*.32), skin, .077, .0675, s*.029); lo.rotation.z = .3; head.add(lo); }
  if (o.kind !== 'bald'){ const hairG = new T3.SphereGeometry(.1035, 32, 18, 0, TAU, 0, PI*.56), q = hairG.attributes.position;
    for (let i=0;i<q.count;i++){ const x = q.getX(i), y = q.getY(i), z = q.getZ(i); const back = Math.max(0, -x/.1); q.setXYZ(i, x*.99 - back*.004, y*1.04 + (y < .02 ? -back*.025 : 0), z*.92); } hairG.computeVertexNormals();
    const hr = mk(hairG, hairM, -.006, .054, 0, true); hr.rotation.z = .5; hr.scale.set(1, 1.04, .84); head.add(hr); }
  if (o.mustache !== false){ const mg = new T3.CapsuleGeometry(.0062, .046, 4, 10), mq = mg.attributes.position; for (let i=0;i<mq.count;i++){ const y = mq.getY(i); mq.setX(i, mq.getX(i) - y*y*2.2); } mg.computeVertexNormals();
    const ms = mk(mg, hairM, .093, .024, 0); ms.rotation.set(PI/2, 0, 0); ms.scale.set(.9, 1, .7); head.add(ms); }
  if (o.towel){ const tw = mk(tubeGeo([[0, .02, .055], [.25, .02, .06]], 10), new T3.MeshStandardMaterial({map:clothTex(o.towel, '#c0392b', 'check'), roughness:.95, side:T3.DoubleSide}), 0, 0, 0, true); tw.rotation.set(0, 0, -.1); tw.position.set(-.02, .3, -.15); chest.add(tw); }
  // limbs are groups whose +y runs from the far joint to the near one (set by IK each frame)
  const limb = (prof, mat, extra) => { const g = new T3.Group(); const m = new T3.Mesh(tubeGeo(prof, 16), mat); m.castShadow = true; g.add(m); if (extra) extra(g); R.add(g); return g; };
  const sleeve = o.sleeve === 'full' ? shirt : null;
  h.arms = [-1, 1].map(s => {
    const up = limb([[0, .036, .038], [.08, .042, .044], [.2, .048, .05], [.29, .05, .052]], skin, g => { const sl = new T3.Mesh(tubeGeo([[.12, .048, .05], [.22, .052, .054], [.3, .052, .054]], 16), shirt); sl.castShadow = true; g.add(sl); });
    const fore = limb([[0, .025, .03], [.06, .03, .035], [.18, .038, .043], [.26, .036, .04]], sleeve || skin);
    const hand = buildHand(skin, s); R.add(hand.g);
    return {s, up, fore, hand:hand.g, H:hand};
  });
  h.legs = [-1, 1].map(s => {
    const th = limb([[0, .05, .05], [.2, .068, .066], [.44, .085, .08]], skin, g => { const sl = new T3.Mesh(tubeGeo([[.1, .07, .068], [.25, .082, .08], [.47, .1, .095]], 18, {wob:(a, v) => 1 + Math.sin(a*5 + s)*.03*(1 - v)}), lungi); sl.castShadow = true; g.add(sl); });
    const sh = limb([[0, .036, .036], [.08, .04, .042], [.22, .052, .05, -.008], [.34, .046, .046], [.44, .045, .046]], skin);
    const ft = new T3.Group(); const fm = new T3.Mesh(footGeo(s), skin); fm.castShadow = true; ft.add(fm); R.add(ft);
    return {s, th, sh, ft};
  });
  return h;
}
const _hx = V3(), _hy = V3(), _hz = V3(), _hm = new T3.Matrix4();
function poseHuman(h, dt, now){
  const t = now/1000, P = h.pose;
  for (const k in h.pt) P[k] = smooth(P[k], h.pt[k], 6, dt);
  for (let i=0;i<2;i++) h.grip[i] = smooth(h.grip[i], h.gripT[i], 10, dt);
  h.root.position.set(h.pos.x, 0, h.pos.z); h.root.rotation.set(0, h.heading, 0);
  const bob = h.walking ? Math.abs(Math.sin(t*9))*.022 : 0, breath = Math.sin(t*1.6 + (h.ph || 0));
  const sq = h.squat = clamp((.86 - P.pel)/.42, 0, 1);
  h.pel.position.set(-P.bend*.08 - sq*.17, P.pel + bob + breath*.003, 0);
  h.pel.rotation.set(0, P.twist*.4, h.walking ? Math.sin(t*4.5)*.03 : 0);
  h.chest.rotation.set(0, P.twist*.6, -P.bend);
  h.chest.scale.set(1 + breath*.006, 1, 1 + breath*.004);
  if (h.look){ _a.copy(h.look); h.root.worldToLocal(_a); const yaw = clamp(Math.atan2(-_a.z, _a.x), -1.1, 1.1); h.head.rotation.set(0, yaw*.7 - P.twist, clamp(-Math.atan2(_a.y - (P.pel + .75), Math.hypot(_a.x, _a.z))*.7 - P.bend*.6, -.25, .8)); }
  h.root.updateMatrixWorld(true);
  const chestM = h.chest.matrixWorld, inv = (h._inv || (h._inv = new T3.Matrix4())).copy(h.root.matrixWorld).invert();
  h.arms.forEach((A, i) => {
    const sh = V3(0, .5, A.s*.19).applyMatrix4(chestM).applyMatrix4(inv);
    let hand;
    if (h.hands[i]){ hand = h.hands[i].clone().applyMatrix4(inv); }
    else if (P.pel < .7){ hand = V3(.3, -.36 + P.pel*.25, A.s*.2).applyMatrix4(h.pel.matrix); }
    else { const sw = h.walking ? Math.sin(t*9 + (i ? PI : 0))*.14 : Math.sin(t*1.3 + i)*.01; hand = sh.clone().add(V3(.03 + sw + P.bend*.25, -.52 + P.bend*.08, A.s*.06)); }
    const d = hand.distanceTo(sh); if (d > .53){ hand.sub(sh).multiplyScalar(.53/d).add(sh); }
    const elbow = ik2(sh, hand, .29, .26, V3(-.6, -.45, A.s*.7));
    orientY(A.up, elbow, sh, V3(1,0,0));
    orientY(A.fore, hand, elbow, V3(1,0,0));
    // the hand: fingers continue the forearm, palm turned towards its target (or inwards)
    _hy.subVectors(elbow, hand).normalize();
    const pt = h.palmTo[i] ? h.palmTo[i].clone().applyMatrix4(inv) : V3(hand.x + .1, hand.y, 0);
    _hx.subVectors(pt, hand); _hx.addScaledVector(_hy, -_hx.dot(_hy)); if (_hx.lengthSq() < 1e-6) _hx.set(0, 0, -A.s); _hx.normalize();
    _hz.crossVectors(_hx, _hy).normalize(); _hx.crossVectors(_hy, _hz);
    _hm.makeBasis(_hx, _hy, _hz); A.hand.quaternion.setFromRotationMatrix(_hm); A.hand.position.copy(hand).addScaledVector(_hy, -.005);
    curlHand(A.H, h.grip[i]);
  });
  h.legs.forEach((L, i) => {
    const hip = V3(0, -.07, L.s*.095).applyMatrix4(h.pel.matrix);
    const foot = (h.feetW ? h.feetW[i].clone() : V3()).applyMatrix4(inv); foot.y += .075; foot.z += L.s*.07*h.squat;
    if (P.kneel > .01 && i === 0){ foot.lerp(V3(hip.x - .33, .1, L.s*.13), P.kneel); }
    { const dl = foot.distanceTo(hip); if (dl > .87){ foot.sub(hip).multiplyScalar(.87/dl).add(hip); } }
    const knee = ik2(hip, foot, .44, .44, V3(1, .2*h.squat, L.s*(.22 + .45*h.squat)));
    orientY(L.th, knee, hip, V3(1,0,0)); orientY(L.sh, foot, knee, V3(1,0,0));
    L.ft.position.copy(foot).add(V3(0, -.075, 0)); L.ft.rotation.set(0, -L.s*(.18 + .25*h.squat), P.kneel > .5 && i === 0 ? .9 : 0);
  });
}
