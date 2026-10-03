// ---------- the grounds: sky, light, ring, venue props, crowd ----------
const LOOKS = {
  temple:{sky:['#24183e','#7a3f63','#f0905a'], sun:'#ffb070', sunI:1.5, sunDir:[-5, 1.25, -6], hemi:['#9a86c8','#6a4630',.6], fog:'#4a3048', fogN:10, fogF:38, exp:1.12, ground:'laterite', lamps:'warm'},
  paddy:{sky:['#4f8ad0','#9cc6ea','#f3e4c0'], sun:'#fff0d6', sunI:3.1, sunDir:[5, 6.5, 3.5], hemi:['#c4dcff','#6e6a3c',.95], fog:'#cfdce6', fogN:16, fogF:70, exp:1.0, ground:'grass', lamps:null},
  night:{sky:['#04050c','#0b1028','#1d2236'], sun:'#b8c8ff', sunI:.28, sunDir:[2, 6, 1], hemi:['#304068','#1c140e',.3], fog:'#0b0e1d', fogN:8, fogF:32, exp:.95, ground:'yard', lamps:'cool'}
};
function skyMaterial(L, night){
  return new T3.ShaderMaterial({side:T3.BackSide, depthWrite:false, fog:false,
    uniforms:{top:{value:col3(L.sky[0])}, mid:{value:col3(L.sky[1])}, hor:{value:col3(L.sky[2])}, sunDir:{value:V3(...L.sunDir).normalize()}, sunCol:{value:col3(L.sun)}, night:{value:night ? 1 : 0}},
    vertexShader:'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader:`uniform vec3 top, mid, hor, sunCol, sunDir; uniform float night; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ float y = vP.y; vec3 c = y > .22 ? mix(mid, top, smoothstep(.22,.95,y)) : mix(hor, mid, smoothstep(-.03,.22,y));
        float s = max(dot(vP, normalize(sunDir)), 0.); c += sunCol*(pow(s, 600.)*4. + pow(s, 10.)*.4 + pow(s,3.)*.08)*(1.-night*.8);
        vec2 uv = vP.xz/(y + .3)*1.6; float cl = n(uv*1.3)*.55 + n(uv*3.1)*.3 + n(uv*7.)*.15;
        cl = smoothstep(.5, .82, cl)*smoothstep(.03,.3,y)*(1. - night*.85);
        c = mix(c, mix(hor, vec3(1.), .55) + sunCol*.15, cl*.6);
        if (night > .5){ float st = step(.9986, h(floor(vP.xy*380.) + floor(vP.z*380.)*1.7)); c += st*smoothstep(.12,.5,y)*.8; }
        if (y < 0.) c = mix(c, hor*.6, smoothstep(0.,-.1,y));
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
}
function mk(geo, mat, x = 0, y = 0, z = 0, cast = false, recv = false){ const m = new T3.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; return m; }
function palmTree(S, x, z, h, lean, rotY){ S = S.userData.decor || S;
  const g = new T3.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const pts = []; for (let i=0;i<=8;i++){ const u = i/8; pts.push(V3(Math.sin(u*1.4)*lean*h*.25, u*h, 0)); }
  const curve = new T3.CatmullRomCurve3(pts);
  const tm = BULB.trunkM || (BULB.trunkM = new T3.MeshStandardMaterial({map:trunkTex(), roughness:.95}));
  g.add(new T3.Mesh(new T3.TubeGeometry(curve, 24, .13, 8, false), tm));
  const top = pts[8], fm = BULB.frondM || (BULB.frondM = new T3.MeshStandardMaterial({map:frondTex(), alphaTest:.45, side:T3.DoubleSide, roughness:.8, color:col3('#a8c890')}));
  for (let i=0;i<13;i++){
    const geo = new T3.PlaneGeometry(1.1, 2.9, 1, 10); geo.translate(0, 1.45, 0);
    const p = geo.attributes.position; for (let j=0;j<p.count;j++){ const y = p.getY(j); p.setZ(j, -Math.pow(y/2.9, 2)*1.5); } geo.computeVertexNormals();
    const fr = new T3.Mesh(geo, fm); fr.position.copy(top); fr.rotation.set(0, i/13*TAU + rnd(-.1,.1), 0); fr.rotateX(-PI*.5 + rnd(.25, .65)); g.add(fr);
  }
  const nut = BULB.nutM || (BULB.nutM = std('#5a6a2a', {roughness:.6})); for (let i=0;i<5;i++){ const a = i/5*TAU; g.add(mk(new T3.SphereGeometry(.1, 8, 6), nut, top.x + Math.cos(a)*.15, top.y - .15, Math.sin(a)*.15)); }
  S.add(g); return g;
}
const BULB = {};
function lampString(S, a, b, sag, colors, glow){
  const D = S.userData.decor || S;
  const pts = []; for (let i=0;i<=16;i++){ const u = i/16; pts.push(V3(lerp(a.x,b.x,u), lerp(a.y,b.y,u) - Math.sin(u*PI)*sag, lerp(a.z,b.z,u))); }
  const curve = new T3.CatmullRomCurve3(pts);
  D.add(new T3.Mesh(new T3.TubeGeometry(curve, 30, .006, 4, false), BULB.wire || (BULB.wire = std('#202020'))));
  const n = Math.floor(a.distanceTo(b)/.32), bulbs = [];
  for (let i=1;i<n;i++){ const p = curve.getPoint(i/n), c = colors[i % colors.length];
    const bm = new T3.Mesh(new T3.SphereGeometry(.035, 8, 6), BULB[c] || (BULB[c] = new T3.MeshBasicMaterial({color:col3(c).multiplyScalar(2.2)}))); bm.position.copy(p).add(V3(0, -.04, 0)); D.add(bm);
    if (glow) bulbs.push({p:bm.position.clone(), c});
  }
  return bulbs;
}
function bunting(S, a, b, sag, colors){
  const D = S.userData.decor || S, FM = S.userData.flagM || (S.userData.flagM = {});
  const n = Math.floor(a.distanceTo(b)/.28), flags = [];
  for (let i=1;i<n;i++){ const u = i/n, p = V3(lerp(a.x,b.x,u), lerp(a.y,b.y,u) - Math.sin(u*PI)*sag, lerp(a.z,b.z,u));
    const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute([-.1,0,0, .1,0,0, 0,-.2,0], 3)); g.computeVertexNormals();
    const cc = colors[i % colors.length], m = new T3.Mesh(g, FM[cc] || (FM[cc] = new T3.MeshStandardMaterial({color:col3(cc), side:T3.DoubleSide, roughness:.85}))); m.position.copy(p); m.lookAt(V3(0, p.y, 0)); m.rotateY(PI/2); m.rotateX(rnd(-.2,.2)); D.add(m); }
  return flags;
}
function buildWorld(vk){
  const V = VENUES[vk] || VENUES.temple, L = LOOKS[vk] || LOOKS.temple, night = vk === 'night';
  const S = new T3.Scene(), W = {scene:S, vk, flags:[], glows:[], animated:[]}; const DEC = new T3.Group(); S.userData.decor = DEC;
  S.fog = new T3.Fog(col3(L.fog), L.fogN, L.fogF);
  const sky = new T3.Mesh(new T3.SphereGeometry(90, 32, 16), skyMaterial(L, night)); S.add(sky);
  const envS = new T3.Scene(); envS.add(new T3.Mesh(new T3.SphereGeometry(90, 32, 16), skyMaterial(L, night)));
  const pm = new T3.PMREMGenerator(R3); S.environment = pm.fromScene(envS, .04).texture; pm.dispose();
  S.add(new T3.HemisphereLight(col3(L.hemi[0]), col3(L.hemi[1]), L.hemi[2]));
  const sun = W.sun = new T3.DirectionalLight(col3(L.sun), L.sunI);
  sun.position.set(...L.sunDir).normalize().multiplyScalar(9); sun.castShadow = true;
  const sm = api.tier >= 1 ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, {left:-3.2, right:3.2, top:3.2, bottom:-3.2, near:.5, far:22}); sun.shadow.bias = -.0004; sun.shadow.normalBias = .015;
  S.add(sun, sun.target);
  // ground, ring, berm, fence
  const ground = mk(new T3.PlaneGeometry(160, 160), new T3.MeshStandardMaterial({map:groundTex(L.ground), roughness:.95}), 0, 0, 0, false, true); ground.rotation.x = -PI/2; S.add(ground);
  W.sand = sandTex(V);
  const ringM = new T3.MeshStandardMaterial({map:W.sand, roughness:.97, bumpMap:W.sand, bumpScale:.6});
  const ring = mk(new T3.CircleGeometry(RING + .3, 96), ringM, 0, .018, 0, false, true); ring.rotation.x = -PI/2; S.add(ring);
  const berm = mk(new T3.TorusGeometry(RING + .32, .07, 8, 120), new T3.MeshStandardMaterial({color:col3(V.ring.c2), roughness:1}), 0, .022, 0, false, true); berm.rotation.x = -PI/2; berm.scale.z = .45; S.add(berm);
  const bam = new T3.MeshStandardMaterial({map:bambooTex(), roughness:.7});
  const FR = RING + .5;
  for (let i=0;i<28;i++){ const a = i/28*TAU; if (Math.abs(Math.cos(a)) > .965) continue; DEC.add(mk(new T3.CylinderGeometry(.03, .035, .62, 8), bam, Math.cos(a)*FR, .31, Math.sin(a)*FR, true)); }
  for (const yy of [.3, .56]) for (const st of [.27, PI + .27]){ const rail = mk(new T3.TorusGeometry(FR, .02, 6, 60, PI - .54), bam, 0, yy, 0, true); rail.rotation.set(-PI/2, 0, st); DEC.add(rail); }
  // corner kit at both entries: bucket, clay bowl, stool
  for (const s of [-1, 1]){
    const x = s*(FR + .35);
    DEC.add(mk(new T3.CylinderGeometry(.13, .11, .26, 14), std('#3a6a9a', {roughness:.4, metalness:.3}), x, .13, s*.55, true));
    DEC.add(mk(new T3.CylinderGeometry(.11, .07, .07, 14), std('#9a5a34', {roughness:.8}), x + s*.1, .035, -s*.5, true));
    DEC.add(mk(new T3.BoxGeometry(.32, .25, .32), std('#6a4a2a', {roughness:.9}), x + s*.45, .125, 0, true));
  }
  // venue dressing
  if (vk === 'temple' || !LOOKS[vk]){
    const stone = new T3.MeshStandardMaterial({map:stoneTex(), roughness:.9}), tile = new T3.MeshStandardMaterial({map:tileTex(), roughness:.75});
    const tg = new T3.Group(); tg.position.set(-1.5, 0, -13); tg.rotation.y = .18; DEC.add(tg);
    tg.add(mk(new T3.BoxGeometry(8, .7, 6), stone, 0, .35, 0, false, true));
    tg.add(mk(new T3.BoxGeometry(5.6, 2.6, 4.2), stone, 0, 2, 0));
    const roof = mk(new T3.ConeGeometry(4.6, 2.2, 4, 1), tile, 0, 4.4, 0); roof.rotation.y = PI/4; roof.scale.z = .8; tg.add(roof);
    const roof2 = mk(new T3.ConeGeometry(2.2, 1.4, 4, 1), tile, 0, 5.9, 0); roof2.rotation.y = PI/4; tg.add(roof2);
    tg.add(mk(new T3.SphereGeometry(.22, 12, 10), std('#d9a63a', {metalness:.9, roughness:.25}), 0, 6.75, 0));
    tg.add(mk(new T3.BoxGeometry(1.2, 1.9, .1), std('#2a1a10'), 0, 1.65, 2.11));
    const pole = mk(new T3.CylinderGeometry(.09, .13, 6.5, 12), std('#d9a63a', {metalness:.9, roughness:.3}), 3.4, 3.25, 8, true); tg.add(pole);
    const lampT = new T3.Group(); lampT.position.set(6.5, 0, -10); DEC.add(lampT);
    lampT.add(mk(new T3.CylinderGeometry(.18, .35, 3.4, 10), stone, 0, 1.7, 0));
    for (let r=0;r<6;r++) for (let i=0;i<8;i++){ const a = i/8*TAU, yy = .7 + r*.45, rr = .33 - r*.025;
      const fl = mk(new T3.SphereGeometry(.035, 6, 5), BULB.flame || (BULB.flame = new T3.MeshBasicMaterial({color:col3('#ffb040').multiplyScalar(3)})), Math.cos(a)*rr, yy, Math.sin(a)*rr); lampT.add(fl); W.glows.push({p:V3(6.5 + Math.cos(a)*rr, yy, -10 + Math.sin(a)*rr), c:'#ffa040'}); }
    const lp = new T3.PointLight(0xffa040, 6, 9, 2); lp.position.set(6.5, 2, -9.5); S.add(lp);
    for (const [x,z,h,l,r] of [[-7,-6,7,1,0],[-9.5,-1,8,1.3,1],[8.5,-4,7.5,-1,2],[10,3,6.5,-1.2,3],[-12,4,8.5,.8,4],[4,-16,9,.4,5],[-6,-18,7.5,-.6,6],[13,-9,8,-.8,1.2],[-14,-9,7,.9,2.2]]) palmTree(S, x, z, h, l, r);
  } else if (vk === 'paddy'){
    const fieldT = ctex(512, 512, (g, w, h) => { g.fillStyle = '#5f8a2a'; g.fillRect(0,0,w,h); for (let y=0;y<h;y+=6){ g.fillStyle = y % 12 ? 'rgba(130,170,60,.6)' : 'rgba(60,90,20,.5)'; g.fillRect(0, y, w, 3); } noiseFill(g, w, h, 4000, ['#8ab04a','#4a6a1a','#b8c070'], .5, 1.8, .2, .5); }, {repeat:[30,30]});
    const field = mk(new T3.PlaneGeometry(200, 200), new T3.MeshStandardMaterial({map:fieldT, roughness:.9}), 0, -.004, 0, false, true); field.rotation.x = -PI/2;
    const hole = new T3.Mesh(new T3.CircleGeometry(9, 48), new T3.MeshStandardMaterial({map:groundTex('grass'), roughness:.95})); hole.rotation.x = -PI/2; hole.position.y = .007; hole.receiveShadow = true;
    S.add(field, hole);
    const bundM = std('#7a6a40', {roughness:1}); for (let i=-4;i<=4;i++){ const b = mk(new T3.BoxGeometry(200, .18, .5), bundM, 0, .09, -12 - i*9); if (i !== 0) DEC.add(b); }
    for (const [x,z,s] of [[-30,-55,14],[10,-60,18],[45,-50,12],[-60,-40,16]]){ const hill = mk(new T3.SphereGeometry(s, 24, 12), W.hillM || (W.hillM = std('#5a7a5a', {roughness:1})), x, -s*.55, z); hill.scale.y = .45; DEC.add(hill); }
    const hayA = std('#c8a85a', {roughness:1}), hayB = std('#b89848', {roughness:1}); for (const [x,z] of [[-7,-8],[-5.5,-9.5],[7.5,-7]]){ DEC.add(mk(new T3.CylinderGeometry(.9, 1.1, 1.3, 14), hayA, x, .65, z, true)); DEC.add(mk(new T3.ConeGeometry(1.15, 1.2, 14), hayB, x, 1.9, z, true)); }
    const hut = new T3.Group(); hut.position.set(9, 0, -12); DEC.add(hut);
    hut.add(mk(new T3.BoxGeometry(4, 2, 3), std('#c8b088', {roughness:1}), 0, 1, 0)); const th = mk(new T3.ConeGeometry(3.4, 1.8, 4), std('#9a8048', {roughness:1}), 0, 2.9, 0); th.rotation.y = PI/4; hut.add(th);
    for (let i=0;i<14;i++){ const a = i/14*TAU + .3, r = 11 + (i%3)*4; palmTree(S, Math.cos(a)*r, Math.sin(a)*r - 4, 6.5 + (i%4)*.8, (i%2 ? 1 : -1)*(.6 + (i%3)*.3), i); }
  } else {
    const shut = ctex(256, 256, (g, w, h) => { g.fillStyle = '#6a6e74'; g.fillRect(0,0,w,h); for (let y=0;y<h;y+=8){ g.fillStyle = 'rgba(30,30,34,.5)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(200,205,212,.25)'; g.fillRect(0, y+2, w, 2); } noiseFill(g, w, h, 300, ['#8a5a3a','#2a2a2a'], 1, 4, .1, .3); });
    const signs = ['#c0392b','#2a73b8','#e0922a','#3f9a63','#7a4fb3'];
    const wallM = std('#8a8478', {roughness:.95}), shutM = new T3.MeshStandardMaterial({map:shut, roughness:.6, metalness:.4}), signM = signs.map(c => new T3.MeshStandardMaterial({color:col3(c), emissive:col3(c), emissiveIntensity:.35, roughness:.5}));
    for (let i=0;i<7;i++){ const x = -10.5 + i*3.5, z = -9 - (i%2)*.4;
      DEC.add(mk(new T3.BoxGeometry(3.3, 3.2, 1), wallM, x, 1.6, z - .5));
      DEC.add(mk(new T3.PlaneGeometry(2.9, 2.2), shutM, x, 1.1, z + .01));
      DEC.add(mk(new T3.PlaneGeometry(3, .6), signM[i % 5], x, 2.65, z + .02)); }
    for (const s of [-1, 1]){
      const px = s*4.3, pz = -2.6;
      DEC.add(mk(new T3.CylinderGeometry(.07, .09, 6.2, 10), W.poleM || (W.poleM = std('#7a8088', {metalness:.6, roughness:.4})), px, 3.1, pz, true));
      DEC.add(mk(new T3.BoxGeometry(.5, .3, .25), W.lampM || (W.lampM = new T3.MeshBasicMaterial({color:col3('#f2f6ff').multiplyScalar(3)})), px - s*.2, 6.05, pz + .1));
      const sp = new T3.SpotLight(0xe8f0ff, 55, 18, .55, .5, 1.6); sp.position.set(px - s*.2, 6, pz + .1); sp.target.position.set(0, 0, 0); sp.castShadow = s < 0; if (sp.castShadow){ sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -.0005; } S.add(sp, sp.target);
      W.bigGlows = (W.bigGlows || []).concat([{p:V3(px - s*.2, 6.05, pz + .2), c:'#dfe8ff'}]);
    }
    DEC.add(mk(new T3.BoxGeometry(30, 4, .4), std('#4a4640', {roughness:1}), 0, 2, 9));
    const tarp = mk(new T3.PlaneGeometry(9, 5, 8, 4), new T3.MeshStandardMaterial({color:col3('#2a5a9a'), side:T3.DoubleSide, roughness:.7}), 0, 4.2, -5.5); tarp.rotation.x = -PI/2 + .25; const tp = tarp.geometry.attributes.position; for (let i=0;i<tp.count;i++) tp.setZ(i, -Math.sin((tp.getX(i)/9 + .5)*PI)*.3); tarp.geometry.computeVertexNormals(); S.add(tarp);
  }
  if (L.lamps){
    const ph = [0, 1, 2, 3].map(i => { const a = PI/4 + i*PI/2; return V3(Math.cos(a)*3.4, 3.1, Math.sin(a)*3.4); });
    const pm2 = L.lamps === 'warm' ? bam : std('#777d85', {metalness:.5}); for (const p of ph) DEC.add(mk(new T3.CylinderGeometry(.04, .05, 3.1, 8), pm2, p.x, 1.55, p.z, true));
    const cols = L.lamps === 'warm' ? V.bulbs : V.bulbs;
    for (let i=0;i<4;i++){ W.glows.push(...lampString(S, ph[i], ph[(i+1)%4], .55, cols, true)); }
    W.glows.push(...lampString(S, ph[0], ph[2], .8, cols, true), ...lampString(S, ph[1], ph[3], .8, cols, true));
    if (L.lamps === 'warm') for (let i=0;i<4;i++) W.flags.push(...bunting(S, ph[i].clone().add(V3(0,-.25,0)), ph[(i+1)%4].clone().add(V3(0,-.25,0)), .45, ['#d7372f','#f4a62a','#62b56d','#2a73b8','#ffe9b8']));
    for (const [x,z] of [[0,2.2],[0,-2.2]]){ const pl = new T3.PointLight(L.lamps === 'warm' ? 0xffb060 : 0xdfe8ff, L.lamps === 'warm' ? 7 : 4, 7, 2); pl.position.set(x, 2.6, z); S.add(pl); }
  }
  W.crowd = buildCrowd(S, vk);
  bakeStatic(DEC, S);
  if (W.glows.length) W.glowMesh = glowPoints(S, W.glows, .34, .6);
  if (W.bigGlows) W.bigGlowMesh = glowPoints(S, W.bigGlows, 2.4, .85);
  return W;
}
