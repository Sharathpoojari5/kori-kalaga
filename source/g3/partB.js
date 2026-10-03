// ---------- the 3D kori: game-fowl body, layered feathers, head, legs and katti ----------
function palOf(f){
  let c = f.col || f.breed.col; const L = f.look || {pat:'solid', size:1, tail:1, comb:1, mark:.5}, light = f.breedKey === 'bili' || f.breed === BREEDS.bili, dark = !light && f.breedKey === 'kari';
  if (dark){ const d = h => mixHex(h, '#000000', .5); c = {...c, neck:d(c.neck), neckHi:mixHex(c.neckHi, '#000000', .45), saddle:d(c.saddle), body:mixHex(c.body, '#000000', .3), wing:d(c.wing), tail:d(c.tail), tail2:mixHex(c.tail2, '#000000', .3)}; }
  return {c, L, light, dark,
    lace:L.pat === 'laced' ? (light ? '#a08050' : mixHex(c.saddle, '#ffe2a0', .35)) : null,
    spot:L.pat === 'spangle' ? (light ? '#86684a' : mixHex(c.saddle, '#f4dfae', .55)) : null,
    stripe:L.pat === 'streak' ? (light ? '#d2bd90' : mixHex(c.neckHi, '#ffffff', .1)) : null};
}
const P_IDLE = {crouch:0, pitch:0, neckOut:.25, dip:0, flare:.1, wing:0, flap:0, tail:.15, beak:0, blink:0, kick:0, tuck:0, lean:0, crow:0, sway:0, droop:0, pant:0};
const sstep0 = (a, b, x) => { const q = clamp((x - a)/(b - a), 0, 1); return q*q*(3 - 2*q); };
// body surface: a deformed ellipsoid shaped like a game cock (deep broad breast, narrow tail end)
function bodyPt(th, ph, A, B, C, out){
  const ux = Math.cos(th), st = Math.sin(th), uy = st*Math.cos(ph), uz = st*Math.sin(ph), fx = (ux + 1)/2;
  const wz = .58 + .42*sstep0(0, .78, fx), wy = .74 + .26*sstep0(.05, .8, fx);
  const breast = Math.max(0, ux)*Math.max(0, -uy);
  return (out || V3()).set(A*ux + A*.1*breast, B*uy*wy - B*.22*breast + B*.08*Math.max(0, uy)*(1 - fx), C*uz*wz*(1 + .08*breast));
}
function bodyFrame(th, ph, A, B, C){
  const p = bodyPt(th, ph, A, B, C), e = 1e-3;
  const dth = bodyPt(th + e, ph, A, B, C).sub(p), dph = bodyPt(th, ph + e, A, B, C).sub(p);
  let n = V3().crossVectors(dph, dth).normalize(); if (n.dot(p) < 0) n.negate();
  return {p, n, back:dth.normalize()};
}
function buildKori(f){
  const P = palOf(f), c = P.c, L = P.L;
  const k = {f, root:new T3.Group(), p:{...P_IDLE}, pt:{...P_IDLE}, pos:V3(), y:0, vy:0, heading:0, vel:V3(), hFeet:[V3(), V3()], wingS:-1, flareS:-1};
  const sg = k.scaleG = new T3.Group(); sg.scale.setScalar(L.size || 1); k.root.add(sg);
  const torso = k.torso = new T3.Group(); sg.add(torso);
  const A = .135, B = .088, C = .078; k.dims = {A, B, C};
  // the body: a smooth surface painted with overlapping feathers (colour + normal map), lit like real plumage
  { const NT = 48, NP = 64, pos = [], uv = [], idx = [], v = V3();
    for (let i=0;i<=NT;i++) for (let j=0;j<=NP;j++){ const th = i/NT*PI, ph = -PI + j/NP*TAU; bodyPt(th, ph, A, B, C, v); pos.push(v.x, v.y, v.z); uv.push(j/NP, 1 - i/NT); }
    for (let i=0;i<NT;i++) for (let j=0;j<NP;j++){ const a = i*(NP+1) + j, b = a + NP + 1; idx.push(a, a+1, b, a+1, b+1, b); }
    const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const bt = bodyTex(P, [c.body, c.saddle, c.wing, c.lo, P.lace, P.spot, P.stripe].join());
    bt.map.flipY = true; bt.nmap.flipY = true;
    const mat = P.light ? new T3.MeshStandardMaterial({map:bt.map, normalMap:bt.nmap, normalScale:new T3.Vector2(.9, .9), roughness:.78})
      : new T3.MeshPhysicalMaterial({map:bt.map, normalMap:bt.nmap, normalScale:new T3.Vector2(.9, .9), roughness:.55, sheen:.6, sheenRoughness:.4, sheenColor:col3(c.sheen), iridescence:.35, iridescenceIOR:1.3, iridescenceThicknessRange:[250, 480]});
    const body = new T3.Mesh(g, mat); body.castShadow = true; body.receiveShadow = true; torso.add(body); }
  // a loose fringe of contour feathers where the outline would break up: belly and lower breast
  const fringe = [];
  for (let r=0; r<8; r++){ const th = .3*PI + r/7*.55*PI, n = 18;
    for (let i=0;i<n;i++){ const ph = PI*.62 + (i/(n-1))*PI*.76 + (Math.random()-.5)*.1; const F = bodyFrame(th, ph, A, B, C), d = F.back.clone().add(V3(0, -.5, 0)); d.addScaledVector(F.n, -d.dot(F.n)).normalize();
      fringe.push({p:F.p.multiplyScalar(1.0), d, n:F.n, w:.034, l:.04, lift:.12 + Math.random()*.08, j:.7 + Math.random()*.15}); } }
  torso.add(featherSet(fringe, featherMat(featherTex('contour', {a:mixHex(c.lo, '#000000', .2), b:mixHex(c.body, c.lo, .4)}), false, null, {bump:'contour'}), .2, false));
  // saddle: a mane of long lancet feathers draping off the back towards the tail
  { const st = strandTex('sad' + c.saddle + c.neckHi + P.stripe, {a:mixHex(c.saddle, '#000000', .35), b:mixHex(c.saddle, c.neckHi, .35), stripe:P.stripe || (P.light ? null : mixHex(c.neck, '#000000', .55))}, {n:120, tipMin:.65, wMul:2.6});
    const sg2 = bodyShell(A, B, C, .45*PI, PI*.985, -.62*PI, .62*PI, 18, 16, (su, tv) => { const edge = Math.abs(tv - .5)*2; return {n:.007 + .012*su + .01*edge*su, dx:-su*su*.03, dy:-edge*edge*.025*su}; }, (su, tv) => [tv*2, 1 - su]);
    const sm = strandMat(st, c, true, P.dark ? .9 : 0); const saddle = new T3.Mesh(sg2, sm); saddle.castShadow = true; saddle.customDepthMaterial = sm.userData.depth; torso.add(saddle); }
  // wings: shoulder coverts (bow), a dark bar, the bay of secondaries, primaries tucked under
  const bow = P.light ? c.wing : mixHex(c.saddle, '#000000', .35), bar = P.light ? mixHex(c.wing, '#c8b890', .2) : mixHex(c.sheen, '#000000', .55);
  const bay = P.light ? c.wing : mixHex(c.neck, '#000000', P.dark ? .75 : .35), prim = P.light ? mixHex(c.wing, '#9a8a70', .25) : mixHex(c.wing, '#000000', .5);
  k.wings = [-1, 1].map(side => {
    const g = new T3.Group(); g.position.set(A*.45, B*.28, side*C*.9); torso.add(g);
    const items = [];
    for (let r=0;r<3;r++) for (let i=0;i<9;i++) items.push({b:V3(-i*.011 - r*.004, .004 - r*.012, side*.002*(4-r)), a0:.2 + r*.04 + i*.01, a1:.45 + i*.07, w:.03, l:.042 + r*.006, kind:'bow'});
    for (let i=0;i<9;i++) items.push({b:V3(-.012 - i*.0095, -.034, side*.0015), a0:.16 + i*.01, a1:.5 + i*.08, w:.034, l:.052, kind:'bar'});
    for (let i=0;i<9;i++) items.push({b:V3(-.02 - i*.0095, -.046, side*.001), a0:.1 + i*.012, a1:.4 + i*.16, w:.038, l:.09, kind:'sec'});
    for (let i=0;i<10;i++) items.push({b:V3(-.085 - i*.004, -.044 - i*.002, 0), a0:.04 + i*.008, a1:1.05 + i*.15, w:.038, l:.12 + i*.003, kind:'pri'});
    const mk = (kind, map, shiny, o2) => { const lst = items.filter(o => o.kind === kind).map(o => ({p:o.b.clone(), d:V3(-1,0,0), n:V3(0,0,side), w:o.w, l:o.l, lift:.05, j:.88 + Math.random()*.12, o})); const m = featherSet(lst, featherMat(map, shiny, c.sheen, o2), .08, true); g.add(m); return m; };
    const sets = [mk('pri', featherTex('flight', {a:mixHex(prim, '#000000', .2), b:prim}), false, {bump:'flight'}),
                  mk('sec', featherTex('flight', {a:mixHex(bay, '#000000', .25), b:bay}), false, {bump:'flight'}),
                  mk('bar', featherTex('covert', {a:mixHex(bar, '#000000', .2), b:bar}), !P.light, {bump:'covert', irid:P.light ? 0 : .8}),
                  mk('bow', featherTex('covert', {a:mixHex(bow, '#000000', .2), b:bow, lace:P.lace, spot:P.spot}), !P.light, {bump:'covert'})];
    // the folded wing as one painted shell lying on the body's side; the cards above take over when it opens
    const wg = bodyShell(A, B, C, .2*PI, .97*PI, side*.3*PI, side*.8*PI, 22, 12, (su, tv) => ({n:.006 + .008*Math.sin(PI*tv)*(1 - su*.5), dx:-Math.max(0, su - .78)*.09, dy:-Math.max(0, su - .78)*.02}), (su, tv) => [su, 1 - tv]);
    const wt = wingTex(P, [bow, bar, bay, prim, P.lace, P.spot].join(), {bow, bar, bay, prim, secDark:mixHex(bay, '#000000', .55)});
    const wo = {map:wt.map, normalMap:wt.nmap, alphaTest:.5, alphaToCoverage:true, side:T3.DoubleSide};
    const wm = P.light ? new T3.MeshStandardMaterial({...wo, roughness:.75}) : new T3.MeshPhysicalMaterial({...wo, roughness:.5, sheen:.5, sheenColor:col3(c.sheen), iridescence:.4, iridescenceIOR:1.3, iridescenceThicknessRange:[250, 480]});
    wm.userData.depth = new T3.MeshDepthMaterial({depthPacking:T3.RGBADepthPacking, map:wt.map, alphaTest:.5});
    const shell = new T3.Mesh(wg, wm); shell.castShadow = true; shell.customDepthMaterial = wm.userData.depth; torso.add(shell);
    return {g, side, sets, shell};
  });
  // tail: main feathers, coverts and the long arching sickles with a green-purple sheen
  const tail = k.tail = new T3.Group(); tail.position.set(-A*.8, B*.38, 0); torso.add(tail);
  const tl = L.tail || 1, tailItems = [], covItems = [];
  for (const side of [-1, 1]) for (let i=0;i<9;i++){ const a = .72 + i*.055; tailItems.push({p:V3(-.003*i, -.003*i, side*(.002 + i*.0016)), d:V3(-Math.cos(a), Math.sin(a), side*.02), n:V3(0,0,side), w:.058, l:(.15 + i*.008)*tl, lift:0, j:.78 + Math.random()*.22}); }
  for (const side of [-1, 1]) for (let i=0;i<14;i++){ const a = .25 + i*.06; covItems.push({p:V3(.012, .006 - i*.002, side*(.008 + i*.0012)), d:V3(-Math.cos(a), Math.sin(a)*.55 - .12, side*.05).normalize(), n:V3(0,.15,side).normalize(), w:.03, l:(.12 + i*.007)*tl, lift:.03, j:.85 + Math.random()*.15}); }
  const tailCol = {a:mixHex(c.tail, '#000000', .15), b:c.tail2};
  tail.add(featherSet(tailItems, featherMat(featherTex('flight', tailCol), true, c.sheen, {bump:'flight', irid:P.light ? 0 : .9}), .05, true));
  tail.add(featherSet(covItems, featherMat(featherTex('sickle', tailCol), true, c.sheen, {bump:'flight', irid:P.light ? 0 : .9}), .1, true));
  k.sickles = [];
  const sickMat = featherMat(featherTex('sickle', {a:c.tail, b:c.tail2}), true, c.sheen, {bump:'flight', irid:P.light ? 0 : 1});
  for (const side of [-1, 1]) for (let i=0;i<4;i++){
    const Lt = tl*(1.0 - i*.11), segs = 28, pos = [], uv = [], idx = [];
    const P0 = V3(0, 0, 0), P1 = V3(-.06*Lt, .29*Lt, 0), P2 = V3(-.33*Lt, -.1*Lt, 0);
    for (let s=0;s<=segs;s++){
      const u = s/segs, a = (1-u)*(1-u), b = 2*(1-u)*u, cc = u*u;
      const x = a*P0.x + b*P1.x + cc*P2.x, y = a*P0.y + b*P1.y + cc*P2.y;
      const tx = 2*(1-u)*(P1.x-P0.x) + 2*u*(P2.x-P1.x), ty = 2*(1-u)*(P1.y-P0.y) + 2*u*(P2.y-P1.y), tn = Math.hypot(tx, ty) || 1;
      const nx = -ty/tn, ny = tx/tn, w = .036*(1 - Math.pow(u, 3))*(.65 + .35*(1 - u)) + .001, tw = u*.9*side;
      for (const e of [-1, 1]){ pos.push(x + nx*w*e*.5*Math.cos(tw), y + ny*w*e*.5*Math.cos(tw), side*(.006 + i*.008) + w*e*.5*Math.sin(tw) - e*.004*Math.sin(u*PI)); uv.push((e+1)/2, u); }
      if (s < segs){ const q = s*2; idx.push(q, q+1, q+2, q+1, q+3, q+2); }
    }
    const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    k.sickles.push(geo.applyMatrix4(new T3.Matrix4().makeRotationY(side*(.05 + .1*i))));
  }
  { const m = new T3.Mesh(mergeGeos(k.sickles), sickMat); m.castShadow = true; m.customDepthMaterial = sickMat.userData.depth; tail.add(m); k.sickles = [m]; }
  // neck: four segments, each wrapped in a flaring mane shell of hackles (tips overlapping the segment below), plus a few loose hackles
  const hMat = featherMat(featherTex('hackle', {a:mixHex(c.neck, '#000000', .2), b:c.neckHi, stripe:P.stripe ? mixHex(c.neck, '#000000', .55) : (P.light ? null : mixHex(c.neck, '#000000', .5))}), true, c.sheen, {bump:'hackle'});
  const hst = strandTex('hk' + c.neck + c.neckHi + P.stripe, {a:mixHex(c.neck, '#000000', .1), b:c.neckHi, stripe:P.stripe || (P.light ? null : mixHex(c.neck, '#000000', .55))}, {n:130, tipMin:.72, wMul:2.6});
  const maneMat = strandMat(hst, c, true, P.dark ? .9 : 0);
  const neckMat = std(mixHex(c.neck, '#000000', .45), {roughness:.95});
  k.neck = [0,1,2,3].map(i => {
    const g = new T3.Group(); sg.add(g);
    const len = .032, r0 = .026 - i*.0028;
    const tube = new T3.Mesh(new T3.CylinderGeometry(r0*.9, r0, len*1.3, 12, 1, true), neckMat); tube.position.y = len/2; g.add(tube);
    const hS = [.11, .085, .065, .05][i], rB = [.05, .036, .03, .025][i], rT = r0*1.02;
    const mg = new T3.CylinderGeometry(rT, rB, hS, 28, 5, true); mg.translate(0, len*1.1 - hS/2, 0);
    const mp = mg.attributes.position, base = Float32Array.from(mp.array);
    for (let q=0;q<mp.count;q++){ const x = base[q*3], y = base[q*3+1], z = base[q*3+2], down = clamp((len*1.1 - y)/hS, 0, 1), back = Math.max(0, -x/Math.max(1e-4, Math.hypot(x, z)));
      const ex = 1 + (i < 2 ? back*.35 : 0)*down; base[q*3] = x*ex - (i < 2 ? back*down*.02 : 0); base[q*3+1] = y - (i < 2 ? back*down*.025 : 0); base[q*3+2] = z*ex; }
    mp.array.set(base); mg.computeVertexNormals();
    const mane = new T3.Mesh(mg, maneMat); mane.castShadow = true; mane.customDepthMaterial = maneMat.userData.depth; g.add(mane);
    const items = [];
    if (i < 3) for (let j=0;j<7;j++){ const a = (j + .5)/7*TAU + i, n = V3(Math.cos(a), 0, Math.sin(a)); items.push({p:V3(n.x*rT, len*.9, n.z*rT), d:V3(n.x*.4, -1, n.z*.4).normalize(), n, w:.018, l:hS*.95, lift:.05, j:.85 + Math.random()*.15, a}); }
    const hm = featherSet(items.length ? items : [{p:V3(), d:V3(0,-1,0), n:V3(1,0,0), w:.0001, l:.0001, lift:0, j:1}], hMat, .2, true); g.add(hm);
    return {g, len, hm, items, mane, maneBase:base, down:Float32Array.from({length:mp.count}, (_, q) => clamp((len*1.1 - base[q*3+1])/hS, 0, 1))};
  });
  // head: skull with brow, red face, comb, wattles, earlobes, eye, hooked beak with nostril
  const head = k.head = new T3.Group(); sg.add(head);
  const skullG = [placed(new T3.SphereGeometry(.021, 20, 16), 0, .002, 0, 0, 0, 0, 1.28, .95, .9)];
  for (const s of [-1, 1]) skullG.push(placed(new T3.SphereGeometry(.007, 10, 8), .011, .011, s*.012, 0, 0, 0, 1.7, .7, .8));
  const hpl = plumageTex(P, 'head' + c.neckHi, (u, v) => mixHex(c.neckHi, c.neck, v*.6), {W:256, H:128, rows:10, perRow:() => 18});
  head.add(new T3.Mesh(mergeGeos(skullG), new T3.MeshStandardMaterial({map:hpl.map, normalMap:hpl.nmap, roughness:.7})));
  const capItems = []; for (let i=0;i<34;i++){ const a = i/34*TAU, n = V3(-.7, .45 + .55*Math.cos(a), Math.sin(a)).normalize(); capItems.push({p:n.clone().multiplyScalar(.022).add(V3(-.004, .002, 0)), d:V3(-1, -.25, 0).addScaledVector(n, -V3(-1,-.25,0).dot(n)).normalize(), n, w:.02, l:.03, lift:.15, j:.88 + Math.random()*.12}); }
  head.add(featherSet(capItems, hMat, .2, false));
  const red = new T3.MeshPhysicalMaterial({color:col3('#a8202a'), roughness:.5, clearcoat:.3, clearcoatRoughness:.45, sheen:.5, sheenColor:col3('#ff9a90'), bumpMap:scaleTex(), bumpScale:.4});
  const redG = [placed(new T3.SphereGeometry(.0165, 18, 14), .012, -.003, 0, 0, 0, 0, 1.1, .95, 1.12)];
  const peaComb = (L.mark || .5) < .5, cs = (L.comb || 1);
  if (peaComb){ for (const z of [-.0034, 0, .0034]) for (let i=0;i<5;i++) redG.push(placed(new T3.SphereGeometry(.0034*(z ? .8 : 1)*(.8 + .2*cs), 8, 6), .004 + i*.0055, .018 + Math.sin(PI*(i + .5)/5)*.004*cs, z, 0, 0, 0, 1.2, 1, 1)); }
  else { const shp = new T3.Shape(), cl = .036*(.65 + .35*cs), chh = .012*cs;
    shp.moveTo(-cl*.5, 0); for (let i=0;i<=4;i++){ const x = -cl*.5 + i*cl/4; shp.lineTo(x - cl*.05, chh*(.5 + .5*Math.sin(PI*(i+.5)/5))); shp.lineTo(x + cl*.05, chh*(.4 + .4*Math.sin(PI*(i+.5)/5))); } shp.lineTo(cl*.55, 0); shp.lineTo(-cl*.5, 0);
    redG.push(placed(new T3.ExtrudeGeometry(shp, {depth:.0034, bevelEnabled:true, bevelThickness:.0012, bevelSize:.001, bevelSegments:2, curveSegments:4}), .008, .017, -.0017, 0, 0, -.12)); }
  const eyeG = [], pupG = [], ringG = [];
  for (const s of [-1, 1]){
    redG.push(placed(new T3.SphereGeometry(1, 12, 10), .021, -.025, s*.0035, 0, 0, .2, .006*cs, .009*cs, .0025));
    redG.push(placed(new T3.SphereGeometry(1, 10, 8), -.004, -.007, s*.0195, 0, 0, 0, .0055, .007, .0018));
    eyeG.push(placed(new T3.SphereGeometry(.0052, 16, 12), .0125, .0055, s*.0158)); pupG.push(placed(new T3.SphereGeometry(.0026, 10, 8), .0138, .0058, s*.0196));
    ringG.push(placed(new T3.TorusGeometry(.0054, .0011, 6, 18), .0128, .0056, s*.0165, 0, s*PI/2 + s*.25, 0));
    const lid = new T3.Mesh(new T3.SphereGeometry(.0058, 12, 8, 0, TAU, 0, PI/2), red); lid.position.set(.0125, .0055, s*.0158); lid.rotation.x = s*PI/2; lid.scale.y = .05; head.add(lid);
    (k.lids = k.lids || []).push(lid);
  }
  const irisCol = P.light ? '#e8b850' : (L.mark || .5) > .7 ? '#f2e2c0' : '#e2861c';
  head.add(new T3.Mesh(mergeGeos(redG), red), new T3.Mesh(mergeGeos(ringG), std('#d8a080', {roughness:.6})),
    new T3.Mesh(mergeGeos(eyeG), new T3.MeshPhysicalMaterial({color:col3(irisCol), roughness:.08, clearcoat:1, clearcoatRoughness:.02})),
    new T3.Mesh(mergeGeos(pupG), new T3.MeshPhysicalMaterial({color:col3('#060303'), roughness:.02, clearcoat:1})));
  const beakCol = P.light ? '#e2c878' : P.dark ? '#5a5048' : '#cfae5c';
  const beakGeo = (r, l, hook, flat) => { const g = new T3.ConeGeometry(r, l, 14, 6); g.rotateZ(-PI/2); g.translate(l/2, 0, 0);
    const p = g.attributes.position, cols = []; const base = col3(beakCol), tip = col3(mixHex(beakCol, '#2a2018', .55));
    for (let i=0;i<p.count;i++){ const x = p.getX(i), u = clamp(x/l, 0, 1); p.setY(i, p.getY(i)*flat - hook*Math.pow(u, 2.2)*l); const cc = base.clone().lerp(tip, u*u); cols.push(cc.r, cc.g, cc.b); }
    g.setAttribute('color', new T3.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); return g; };
  const bMat = new T3.MeshPhysicalMaterial({vertexColors:true, roughness:.35, clearcoat:.4, clearcoatRoughness:.3});
  const upper = new T3.Mesh(beakGeo(.0082, .029, .28, .95), bMat); upper.position.set(.023, -.0005, 0); upper.scale.z = .78; head.add(upper);
  for (const s of [-1, 1]){ const nos = new T3.Mesh(new T3.SphereGeometry(.0013, 8, 6), std('#1a1410')); nos.position.set(.028, .0035, s*.0042); nos.scale.set(1.8, .7, .6); head.add(nos); }
  const jaw = k.jaw = new T3.Group(); jaw.position.set(.023, -.006, 0); head.add(jaw);
  const lower = new T3.Mesh(beakGeo(.006, .023, .08, .6), bMat); lower.scale.z = .7; jaw.add(lower);
  // legs: feathered drumstick, thick scaled shank with scutes, jointed toes, spur; katti on the left leg
  const legCol = c.leg, legMat = new T3.MeshPhysicalMaterial({color:col3(legCol), map:legScaleTex(), bumpMap:legScaleTex(true), bumpScale:3, roughness:.42, clearcoat:.3, clearcoatRoughness:.5});
  const clawMat = new T3.MeshPhysicalMaterial({color:col3('#3a3026'), roughness:.3, clearcoat:.6});
  const tpl = plumageTex({...P, spot:null}, 'thigh' + c.body + P.lace, (u, v) => mixHex(mixHex(c.body, c.wing, .1), c.lo, v*.5), {W:256, H:256, rows:22, perRow:() => 20});
  const thighPlum = P.light ? new T3.MeshStandardMaterial({map:tpl.map, normalMap:tpl.nmap, roughness:.8}) : new T3.MeshPhysicalMaterial({map:tpl.map, normalMap:tpl.nmap, roughness:.65, sheen:.25, sheenColor:col3(c.sheen)});
  k.legs = [-1, 1].map(side => {
    const thigh = new T3.Group(); sg.add(thigh);
    const tg2 = new T3.LatheGeometry([[.011,-.092],[.016,-.078],[.024,-.052],[.03,-.025],[.032,-.002],[.028,.02],[.012,.034],[.001,.036]].map(([r, y]) => new T3.Vector2(r, y)), 22); tg2.scale(1, 1, .9);
    const tm = new T3.Mesh(tg2, thighPlum); tm.castShadow = true; thigh.add(tm);
    const shank = new T3.Group(); sg.add(shank);
    const sm = new T3.Mesh(mergeGeos([placed(new T3.CylinderGeometry(.0078, .0094, .1, 16, 6), 0, .05, 0), placed(new T3.SphereGeometry(.0098, 12, 10), 0, .1, 0, 0, 0, 0, 1, .85, 1), placed(new T3.SphereGeometry(.0098, 12, 10), 0, .002, 0)]), legMat); sm.castShadow = true; shank.add(sm);
    if (side > 0){ const spur = new T3.Mesh(beakGeo(.0034, .017, .5, 1), std('#d8ccb0', {roughness:.45})); spur.position.set(-.006, .026, 0); spur.rotation.z = PI*.82; shank.add(spur); }
    const foot = new T3.Group(); shank.add(foot);
    const toeG = [], clawG = [];
    for (const [ang, len] of [[0,.052],[.45,.044],[-.45,.044],[PI,.026]]){
      const ry = new T3.Matrix4().makeRotationY(ang), g = new T3.CylinderGeometry(.0042, .0058, len, 10, 9); g.rotateZ(-PI/2); g.translate(len/2, 0, 0);
      const p = g.attributes.position; for (let i=0;i<p.count;i++){ const x = p.getX(i), u = x/len, knuckle = 1 + .14*Math.pow(Math.cos(u*PI*3), 2); p.setY(i, p.getY(i)*knuckle - u*u*.006); p.setZ(i, p.getZ(i)*knuckle*1.08); }
      g.computeVertexNormals(); toeG.push(g.applyMatrix4(ry));
      clawG.push(placed(beakGeo(.0032, .012, .55, 1), len - .001, -.006, 0).applyMatrix4(ry));
    }
    const toeM = new T3.Mesh(mergeGeos(toeG), legMat); toeM.castShadow = true; foot.add(toeM, new T3.Mesh(mergeGeos(clawG), clawMat));
    const leg = {side, thigh, shank, foot, toes:[foot], hipL:V3(-.008, -B*.6, side*.042)};
    if (side < 0) buildKatti(k, f, shank);
    return leg;
  });
  k.root.traverse(o => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });
  return k;
}
// scaled leg texture: big rectangular scutes down the front, small round scales round the back
function legScaleTex(bump){
  const key = bump ? 'legB' : 'legC'; if (TEX[key]) return TEX[key];
  return TEX[key] = ctex(256, 256, (g, w, h) => {
    g.fillStyle = bump ? '#808080' : '#d8d8d8'; g.fillRect(0, 0, w, h);
    const R = seeded(77);
    for (let y=0; y<h; y+=10) for (let x=0; x<w; x+=10){ const xx = x + (y/10 % 2)*5; if (xx/w > .1 && xx/w < .42) continue;
      const v = bump ? 150 + R()*60 : 190 + R()*40; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(xx, y, 4.6, 4.4, 0, 0, TAU); g.fill();
      g.strokeStyle = bump ? '#303030' : 'rgba(60,50,40,.45)'; g.lineWidth = 1; g.stroke(); }
    for (let y=0; y<h; y+=22){ const v = bump ? 210 : 235; const gr = g.createLinearGradient(0, y, 0, y + 22); gr.addColorStop(0, `rgb(${v},${v},${v})`); gr.addColorStop(1, bump ? 'rgb(120,120,120)' : 'rgb(170,170,170)');
      g.fillStyle = gr; g.beginPath(); if (g.roundRect) g.roundRect(w*.1, y + 1, w*.32, 20, 6); else g.rect(w*.1, y + 1, w*.32, 20); g.fill();
      g.strokeStyle = bump ? '#202020' : 'rgba(60,50,40,.6)'; g.lineWidth = 1.5; g.stroke(); }
  }, {srgb:!bump, repeat:[1, 3]});
}
// the katti: leather pad, steel tang along the shank, the blade, and the thread wound round in a helix
function buildKatti(k, f, shank){
  const kt = k.katti = new T3.Group(); kt.position.set(0, .022, 0); shank.add(kt);
  const bl = f.blade || BLADES.short, Lb = .048 + (bl.len - 14)*.003, w0 = bl.slim ? .0022 : .0036, shp = new T3.Shape();
  shp.moveTo(0, -w0); if (bl.curve){ shp.quadraticCurveTo(Lb*.55, -w0*1.1, Lb, Lb*.18); shp.quadraticCurveTo(Lb*.5, w0*1.5, 0, w0); } else { shp.lineTo(Lb*.82, -w0*.9); shp.lineTo(Lb, 0); shp.lineTo(Lb*.82, w0*.35); shp.lineTo(0, w0); } shp.lineTo(0, -w0);
  const steel = k.steel = new T3.MeshPhysicalMaterial({color:col3('#e2e6ea'), metalness:1, roughness:.14, clearcoat:.3});
  const blade = new T3.Mesh(new T3.ExtrudeGeometry(shp, {depth:.0008, bevelEnabled:true, bevelThickness:.00045, bevelSize:.0006, bevelSegments:2}), steel);
  blade.castShadow = true; blade.position.z = -.0004;
  const bp = k.bladePivot = new T3.Group(); bp.position.set(-.008, .006, 0); bp.rotation.z = PI*.94; bp.add(blade); kt.add(bp);
  const tang = new T3.Mesh(new T3.BoxGeometry(.003, .03, .0035), steel); tang.position.set(-.0095, .006, 0); kt.add(tang);
  const notch = k.notch = new T3.Mesh(new T3.BoxGeometry(.004, .0035, .003), std('#3a2e26')); notch.position.set(Lb*.6, w0*.6, 0); notch.visible = false; blade.add(notch);
  const pad = new T3.Mesh(new T3.CylinderGeometry(.0112, .0118, .026, 14, 1, true), std('#4a3018', {roughness:.95, side:T3.DoubleSide})); pad.position.y = .006; kt.add(pad);
  const turns = 14, pts = []; for (let i=0;i<=turns*24;i++){ const u = i/(turns*24), a = u*turns*TAU; pts.push(V3(Math.cos(a)*.0128, -.006 + u*.024 + Math.sin(a*3)*.0003, Math.sin(a)*.0128)); }
  const tg = new T3.TubeGeometry(new T3.CatmullRomCurve3(pts), turns*24, .0011, 5, false);
  const thread = k.thread = new T3.Mesh(tg, new T3.MeshStandardMaterial({color:col3(f.ribbon || '#d7372f'), roughness:.85})); kt.add(thread);
  k.threadIdx = tg.index.count; k.kattiLen = Lb;
  // a small leather sheath slipped over the blade after tying; it comes off at the release
  const sh = k.sheath = new T3.Mesh(new T3.CapsuleGeometry(w0*1.7, Lb*.8, 4, 8).rotateZ(-PI/2).translate(Lb*.5, 0, 0), new T3.MeshStandardMaterial({color:col3('#4a2a14'), roughness:.7}));
  sh.scale.set(1, 1, .45); sh.visible = false; bp.add(sh);
}
const _up = V3(0,1,0), _t1 = V3(), _t2 = V3(), _q = new T3.Quaternion(), _mm = new T3.Matrix4();
function orientY(obj, from, to, sideHint){            // place obj at 'from' with +y pointing to 'to'
  obj.position.copy(from);
  _t1.subVectors(to, from).normalize();
  _t2.copy(sideHint).addScaledVector(_t1, -sideHint.dot(_t1)).normalize();
  _z.crossVectors(_t2, _t1).normalize(); _x.crossVectors(_t1, _z).normalize();
  _mm.makeBasis(_x, _t1, _z); obj.quaternion.setFromRotationMatrix(_mm);
}
function ik2(hip, foot, l1, l2, bend){                 // two-bone IK, returns knee position
  const d = _t1.subVectors(foot, hip), len = Math.min(d.length(), l1 + l2 - 1e-4); d.normalize();
  const a = (l1*l1 - l2*l2 + len*len)/(2*len), h = Math.sqrt(Math.max(0, l1*l1 - a*a));
  const perp = bend.clone().addScaledVector(d, -bend.dot(d)).normalize();
  return hip.clone().addScaledVector(d, a).addScaledVector(perp, h);
}
