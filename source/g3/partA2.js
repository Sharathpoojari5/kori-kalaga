// feather cards with the bird's own colours (and its pattern) baked in. base at the bottom, tip at the top.
function rgbOf(hex){ const n = parseInt(hex.slice(1), 16); return [(n>>16)&255, (n>>8)&255, n&255]; }
function featherShape(kind){
  if (kind === 'hackle') return u => .34*Math.pow(Math.sin(PI*Math.min(1, u*1.03)), .7)*(1 - u*.66);
  if (kind === 'saddle') return u => .3*Math.pow(Math.sin(PI*Math.min(1, u*1.04)), .7)*(1 - u*.55);
  if (kind === 'contour') return u => .47*Math.pow(Math.sin(PI*(.1 + u*.9)), .5);
  if (kind === 'covert') return u => .47*Math.pow(Math.sin(PI*(.06 + u*.94)), .4);
  if (kind === 'sickle') return u => .46*Math.min(1, u*8)*(1 - Math.pow(u, 10)*.85);
  return u => .46*Math.min(1, u*4)*(1 - Math.pow(u, 5)*.9);                       // flight
}
// one feather card: a soft filled vane, fine low-contrast barbs on top, a faint shaft, soft edges.
// mode 'col' paints colour, 'bump' a height map with the same shape
function paintFeather(g, w, h, kind, mode, A, B, pal){
  const R = seeded(strHash(kind) + 11), hw = featherShape(kind), cx = w/2, asym = kind === 'flight' ? .6 : 1;
  const downEnd = kind === 'contour' || kind === 'covert' ? .22 : .1;
  const vane = (pad) => { g.beginPath(); const N = 60;
    for (let i=0;i<=N;i++){ const u = downEnd*.6 + i/N*(1 - downEnd*.6), half = hw(u)*w*(1 + pad); g.lineTo(cx - half, h*(1 - u) - half*.45); }
    for (let i=N;i>=0;i--){ const u = downEnd*.6 + i/N*(1 - downEnd*.6), half = hw(u)*w*asym*(1 + pad); g.lineTo(cx + half, h*(1 - u) - half*.45); }
    g.closePath(); };
  const mix = k => [0,1,2].map(q => A[q] + (B[q] - A[q])*k);
  if (mode === 'col'){
    g.filter = 'blur(1.2px)';
    const gr = g.createLinearGradient(0, h, 0, 0); const c0 = mix(0), c1 = mix(.55), c2 = mix(1);
    gr.addColorStop(0, `rgba(${c0[0]|0},${c0[1]|0},${c0[2]|0},.0)`); gr.addColorStop(downEnd, `rgba(${c0[0]|0},${c0[1]|0},${c0[2]|0},.9)`);
    gr.addColorStop(.55, `rgb(${c1[0]|0},${c1[1]|0},${c1[2]|0})`); gr.addColorStop(1, `rgb(${c2[0]|0},${c2[1]|0},${c2[2]|0})`);
    g.fillStyle = gr; vane(0); g.fill(); g.filter = 'none';
    // fine barbs: light and dark streaks at low contrast
    for (let i=0;i<h*.9;i++){
      const u = downEnd + i/(h*.9)*(1 - downEnd), y = h*(1 - u), half = hw(u)*w;
      if (half < .8) continue;
      for (const s of [-1, 1]){
        const len = half*(s < 0 ? 1 : asym)*(.85 + R()*.15), x1 = cx + s*len, y1 = y - len*.5, lt = R();
        const ka = kind === 'hackle' || kind === 'saddle' || kind === 'sickle' ? .35 : .7; g.strokeStyle = lt < .5 ? `rgba(255,255,255,${(.03 + R()*.05)*ka})` : `rgba(0,0,0,${(.04 + R()*.06)*ka})`; g.lineWidth = .8;
        g.beginPath(); g.moveTo(cx, y); g.quadraticCurveTo(cx + s*len*.5, y - len*.12, x1, y1); g.stroke();
      }
      if ((kind === 'contour' || kind === 'covert' || kind === 'flight') && R() < .008){ const s = R() < .5 ? -1 : 1; g.clearRect(cx + s*half*.6, y - half*.35, 1.4, 2.5); }
    }
    // the fluffy down at the base
    for (let i=0;i<40;i++){ const y = h*(1 - R()*downEnd*1.2), s = R() < .5 ? -1 : 1, len = w*(.12 + R()*.25); g.strokeStyle = `rgba(${A[0]|0},${A[1]|0},${A[2]|0},.25)`; g.beginPath(); g.moveTo(cx, y); g.quadraticCurveTo(cx + s*len*.6, y - 6, cx + s*len, y + R()*6); g.stroke(); }
    g.globalCompositeOperation = 'source-atop';
    if (pal.lace){ g.strokeStyle = pal.lace; g.lineWidth = w*.075; g.globalAlpha = .55; g.filter = 'blur(1.5px)'; g.beginPath();
      for (let i=0;i<=40;i++){ const u = .35 + i/40*.65; g.lineTo(cx - hw(u)*w*.97, h*(1-u) - hw(u)*w*.44); }
      for (let i=40;i>=0;i--){ const u = .35 + i/40*.65; g.lineTo(cx + hw(u)*w*asym*.97, h*(1-u) - hw(u)*w*.44); } g.stroke(); g.globalAlpha = 1; g.filter = 'none'; }
    if (pal.spot){ g.fillStyle = pal.spot; g.globalAlpha = .7; g.filter = 'blur(2px)'; g.beginPath(); g.ellipse(cx, h*.14, w*.13, h*.05, 0, 0, TAU); g.fill(); g.globalAlpha = 1; g.filter = 'none'; }
    if (pal.stripe){ const sg = g.createLinearGradient(0, h, 0, 0); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(.3, pal.stripe); sg.addColorStop(.85, pal.stripe); sg.addColorStop(1, 'rgba(0,0,0,0)');
      g.strokeStyle = sg; g.globalAlpha = .7; g.filter = 'blur(2px)'; g.lineWidth = w*(kind === 'hackle' ? .11 : .14); g.beginPath(); g.moveTo(cx, h*.98); g.lineTo(cx, h*.1); g.stroke(); g.globalAlpha = 1; g.filter = 'none'; }
    const SH = [0,1,2].map(q => Math.min(255, (A[q] + B[q])/2*1.15 + 18)|0);
    g.strokeStyle = pal.shaft || `rgba(${SH[0]},${SH[1]},${SH[2]},${kind === 'flight' || kind === 'sickle' ? .4 : .18})`;
    g.lineWidth = kind === 'flight' || kind === 'sickle' ? 2 : 1.1; g.beginPath(); g.moveTo(cx, h); g.lineTo(cx, h*.06); g.stroke();
    g.globalCompositeOperation = 'source-over';
  } else {
    g.fillStyle = '#9a9a9a'; g.filter = 'blur(2px)'; vane(0); g.fill(); g.filter = 'none';
    for (let i=0;i<h*.9;i++){ const u = downEnd + i/(h*.9)*(1 - downEnd), y = h*(1 - u), half = hw(u)*w; if (half < .8) continue;
      for (const s of [-1, 1]){ const len = half*(s < 0 ? 1 : asym), v = 120 + R()*90 | 0; g.strokeStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.moveTo(cx, y); g.quadraticCurveTo(cx + s*len*.5, y - len*.12, cx + s*len, y - len*.5); g.stroke(); } }
    g.strokeStyle = '#e8e8e8'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, h); g.lineTo(cx, h*.06); g.stroke();
  }
}
// a single feather stamped into a texture: base at (x,y), pointing along ang (0 = down the canvas)
function stampFeather(g, hg, x, y, fw, fh, ang, rgb, lt, R, P, o = {}){
  const shape = ctx => { ctx.beginPath(); ctx.moveTo(-fw/2, -fh*.12); ctx.quadraticCurveTo(-fw*.56, fh*.62, 0, fh*(o.point ? .78 : .66)); ctx.quadraticCurveTo(fw*.56, fh*.62, fw/2, -fh*.12); ctx.closePath(); };
  g.save(); g.translate(x, y); g.rotate(ang);
  const gr = g.createLinearGradient(0, -fh*.12, 0, fh*.66), dk = o.dark ?? .5;
  gr.addColorStop(0, `rgb(${rgb[0]*dk|0},${rgb[1]*dk|0},${rgb[2]*dk|0})`); gr.addColorStop(.72, `rgb(${Math.min(255,rgb[0]*lt)|0},${Math.min(255,rgb[1]*lt)|0},${Math.min(255,rgb[2]*lt)|0})`); gr.addColorStop(1, `rgb(${Math.min(255,rgb[0]*lt*1.12)|0},${Math.min(255,rgb[1]*lt*1.12)|0},${Math.min(255,rgb[2]*lt*1.12)|0})`);
  g.fillStyle = gr; shape(g); g.fill();
  g.save(); shape(g); g.clip();
  for (let b=0;b<12;b++){ const s = b%2 ? 1 : -1, yy = fh*(b/12*.55); g.strokeStyle = R() < .5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.06)'; g.lineWidth = .8; g.beginPath(); g.moveTo(0, yy); g.lineTo(s*fw*.5, yy + fh*.3); g.stroke(); }
  if (o.edge){ g.strokeStyle = o.edge; g.globalAlpha = .9; g.lineWidth = fw*.22; g.beginPath(); g.moveTo(-fw*.5, fh*.3); g.quadraticCurveTo(-fw*.3, fh*.75, fw*.1, fh*.7); g.stroke(); g.globalAlpha = 1; }
  if (P && P.lace){ g.strokeStyle = P.lace; g.globalAlpha = .45; g.lineWidth = fw*.12; shape(g); g.stroke(); g.globalAlpha = 1; }
  if (P && P.spot && !o.noPat){ g.fillStyle = P.spot; g.globalAlpha = .45; g.beginPath(); g.ellipse(0, fh*.48, fw*.1, fh*.07, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
  if (P && P.stripe && o.stripe){ g.strokeStyle = P.stripe; g.globalAlpha = .4; g.lineWidth = fw*.12; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, fh*.55); g.stroke(); g.globalAlpha = 1; }
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-fw*.45, fh*.4); g.quadraticCurveTo(0, fh*.74, fw*.45, fh*.4); g.stroke();
  g.restore();
  if (hg){ hg.save(); hg.translate(x, y); hg.rotate(ang); const hgr = hg.createLinearGradient(0, -fh*.12, 0, fh*.66); hgr.addColorStop(0, '#1a1a1a'); hgr.addColorStop(1, '#e8e8e8'); hg.fillStyle = hgr; shape(hg); hg.fill(); hg.restore(); }
}
function heightToNormal(hc, S){
  const Wt = hc.width, Ht = hc.height, hd = hc.getContext('2d').getImageData(0, 0, Wt, Ht).data, nc = document.createElement('canvas'); nc.width = Wt; nc.height = Ht;
  const ng = nc.getContext('2d'), nd = ng.createImageData(Wt, Ht), H = (x, y) => hd[((Math.min(Ht-1, Math.max(0, y)))*Wt + ((x + Wt) % Wt))*4]/255;
  for (let y=0;y<Ht;y++) for (let x=0;x<Wt;x++){ const dx = (H(x+1,y) - H(x-1,y))*S, dy = (H(x,y+1) - H(x,y-1))*S, l = Math.hypot(dx, dy, 1), o = (y*Wt + x)*4;
    nd.data[o] = (-dx/l*.5 + .5)*255; nd.data[o+1] = (dy/l*.5 + .5)*255; nd.data[o+2] = (1/l*.5 + .5)*255; nd.data[o+3] = 255; }
  ng.putImageData(nd, 0, 0); return nc;
}
// rows of overlapping feathers over a (u,v) surface: colAt(u,v) gives the colour, feathers point towards +v
function plumageTex(P, key, colAt, o = {}){
  if (TEX['plum' + key]) return TEX['plum' + key];
  const Wt = o.W || 1024, Ht = o.H || 512, R = seeded(strHash(key) + 3), rows = o.rows || 30;
  const can = document.createElement('canvas'); can.width = Wt; can.height = Ht; const g = can.getContext('2d');
  const hc = document.createElement('canvas'); hc.width = Wt; hc.height = Ht; const hg = hc.getContext('2d');
  g.fillStyle = mixHex(colAt(.5, .5), '#000000', .35); g.fillRect(0, 0, Wt, Ht); hg.fillStyle = '#000'; hg.fillRect(0, 0, Wt, Ht);
  for (let r = rows; r >= 0; r--){
    const v = r/rows, n = o.perRow ? o.perRow(v) : 24, fh = Ht/rows*2.1, fw = Wt/n*1.25;
    for (let i=0;i<n;i++){
      const u = (i + (r%2)*.5 + (R() - .5)*.15)/n, x = u*Wt, y = v*Ht, rgb = rgbOf(colAt(u, v)), lt = .88 + R()*.22;
      for (const xx of [x, x - Wt, x + Wt]) if (xx > -fw && xx < Wt + fw) stampFeather(g, hg, xx, y, fw, fh, (R() - .5)*.12, rgb, lt, R, P, {stripe:o.stripeAt ? o.stripeAt(u, v) : false});
    }
  }
  const map = new T3.CanvasTexture(can); map.colorSpace = T3.SRGBColorSpace; map.anisotropy = 4; map.wrapS = T3.RepeatWrapping;
  const nmap = new T3.CanvasTexture(heightToNormal(hc, 2.2)); nmap.wrapS = T3.RepeatWrapping;
  return TEX['plum' + key] = {map, nmap};
}
function bodyTex(P, key){
  const c = P.c;
  const colAt = (u, v) => { const th = (1 - v)*PI, ph = -PI + u*TAU, cp = Math.cos(ph);   // v runs 1 (front) .. 0 (tail) in UV, but rows are painted top=front
    return null; };
  const col2 = (u, v) => { const th = v*PI, ph = -PI + u*TAU, cp = Math.cos(ph), back = sstep0(.2, .6, cp), under = sstep0(-.45, -.8, cp), breast = (1 - back)*(1 - under)*sstep0(.65*PI, .3*PI, th)*sstep0(.25, -.15, cp);
    const cBack = mixHex(c.saddle, '#000000', P.light ? .05 : .38), cSide = mixHex(c.body, c.wing, .15), cBr = mixHex(c.body, c.hi, .12);
    let col = mixHex(cSide, cBack, back); col = mixHex(col, cBr, breast); return mixHex(col, c.lo, under); };
  return plumageTex(P, 'body' + key, col2, {rows:30, perRow:v => Math.max(6, Math.round(8 + 46*Math.sin(v*PI))), stripeAt:(u, v) => Math.cos(-PI + u*TAU) > .2});
}
// the folded wing, painted: shoulder coverts (bow), a dark bar, the bay of secondaries, primary tips
function wingTex(P, key, cols){
  if (TEX['wing' + key]) return TEX['wing' + key];
  const Wt = 512, Ht = 256, R = seeded(strHash(key) + 5);
  const can = document.createElement('canvas'); can.width = Wt; can.height = Ht; const g = can.getContext('2d');
  const hc = document.createElement('canvas'); hc.width = Wt; hc.height = Ht; const hg = hc.getContext('2d');
  hg.fillStyle = '#000'; hg.fillRect(0, 0, Wt, Ht);
  const L = (hex) => rgbOf(hex);
  // primaries: long dark feathers at the back-bottom, pointing back
  for (let i=9;i>=0;i--){ const x = Wt*(.45 + i*.042), y = Ht*(.6 + i*.018); stampFeather(g, hg, x, y, 34, Wt*.42, -PI/2 + .2, L(cols.prim), .9 + R()*.15, R, null, {point:true, dark:.6}); }
  // secondaries: the bay, pointing back and down, edged with the bay colour
  for (let i=11;i>=0;i--){ const x = Wt*(.2 + i*.042), y = Ht*(.38 + i*.01); stampFeather(g, hg, x, y, 40, Ht*(.62 + R()*.08), -PI/2 + .62, L(cols.secDark), .9 + R()*.15, R, null, {edge:cols.bay, dark:.65}); }
  // the bar: a row of larger coverts across the middle
  for (let i=13;i>=0;i--){ const x = Wt*(.1 + i*.042), y = Ht*(.3 + i*.004); stampFeather(g, hg, x, y, 44, Ht*.36, -PI/2 + .9, L(cols.bar), .85 + R()*.25, R, P, {noPat:true}); }
  // the bow: small shoulder coverts in rows
  for (let r=5;r>=0;r--) for (let i=16 - r*2;i>=0;i--){ const x = Wt*(.03 + i*.04 + r*.01), y = Ht*(.02 + r*.055); if (x > Wt*.75) continue; stampFeather(g, hg, x, y, 30, Ht*.17, -PI/2 + .9, L(cols.bow), .85 + R()*.25, R, P); }
  const map = new T3.CanvasTexture(can); map.colorSpace = T3.SRGBColorSpace; map.anisotropy = 4;
  const nmap = new T3.CanvasTexture(heightToNormal(hc, 2.4));
  return TEX['wing' + key] = {map, nmap};
}
// long glossy strands (neck hackles, saddle lancets) for a mane shell: strands run down the canvas, ragged pointed tips
function strandTex(key, cols, o = {}){
  if (TEX['str' + key]) return TEX['str' + key];
  const Wt = o.W || 512, Ht = o.H || 256, R = seeded(strHash(key) + 9), N = o.n || 90;
  const can = document.createElement('canvas'); can.width = Wt; can.height = Ht; const g = can.getContext('2d');
  const hc = document.createElement('canvas'); hc.width = Wt; hc.height = Ht; const hg = hc.getContext('2d'); hg.fillStyle = '#000'; hg.fillRect(0, 0, Wt, Ht);
  const A = rgbOf(cols.a), B = rgbOf(cols.b), S = cols.stripe ? rgbOf(cols.stripe) : null;
  const order = Array.from({length:N*2}, (_, i) => i).sort(() => R() - .5);
  for (const k of order){
    const x0 = (k/N % 1)*Wt + (R() - .5)*6, tip = Ht*(o.tipMin ?? .72) + R()*Ht*(1 - (o.tipMin ?? .72)), w = Wt/N*(o.wMul || 2.2)*(.85 + R()*.3), lean = (R() - .5)*w*.6, lt = .94 + R()*.12;
    for (const xs of [x0, x0 - Wt, x0 + Wt]){
      if (xs < -w*2 || xs > Wt + w*2) continue;
      const path = ctx => { ctx.beginPath(); ctx.moveTo(xs - w/2, -4); ctx.quadraticCurveTo(xs - w*.55 + lean*.5, tip*.7, xs + lean, tip); ctx.quadraticCurveTo(xs + w*.55 + lean*.5, tip*.7, xs + w/2, -4); ctx.closePath(); };
      const gr = g.createLinearGradient(0, 0, 0, tip);
      const cA = A.map(v => Math.min(255, v*lt)|0), cB = B.map(v => Math.min(255, v*lt)|0);
      gr.addColorStop(0, `rgb(${cA})`); gr.addColorStop(1, `rgb(${cB})`); g.fillStyle = gr; path(g); g.fill();
      g.save(); path(g); g.clip();
      const sh = g.createLinearGradient(xs - w/2, 0, xs + w/2, 0); sh.addColorStop(0, 'rgba(0,0,0,.16)'); sh.addColorStop(.45, 'rgba(255,255,255,.06)'); sh.addColorStop(1, 'rgba(0,0,0,.14)'); g.fillStyle = sh; g.fillRect(xs - w, 0, w*2, tip);
      if (S){ g.strokeStyle = `rgba(${S},.4)`; g.lineWidth = w*.2; g.beginPath(); g.moveTo(xs, tip*.15); g.quadraticCurveTo(xs + lean*.4, tip*.6, xs + lean*.85, tip*.92); g.stroke(); }
      g.restore();
      const hgr = hg.createLinearGradient(xs - w/2, 0, xs + w/2, 0); hgr.addColorStop(0, '#303030'); hgr.addColorStop(.5, '#d0d0d0'); hgr.addColorStop(1, '#303030'); hg.fillStyle = hgr; path(hg); hg.fill();
    }
  }
  const map = new T3.CanvasTexture(can); map.colorSpace = T3.SRGBColorSpace; map.anisotropy = 4; map.wrapS = T3.RepeatWrapping;
  const nmap = new T3.CanvasTexture(heightToNormal(hc, 1.6)); nmap.wrapS = T3.RepeatWrapping;
  return TEX['str' + key] = {map, nmap};
}
function strandMat(t, c, shiny, irid){
  const o = {map:t.map, normalMap:t.nmap, alphaTest:.5, alphaToCoverage:true, side:T3.DoubleSide, roughness:shiny ? .42 : .7};
  const m = shiny ? new T3.MeshPhysicalMaterial({...o, sheen:.9, sheenRoughness:.3, sheenColor:col3(c.sheen), clearcoat:.25, clearcoatRoughness:.35, iridescence:irid || 0, iridescenceIOR:1.35, iridescenceThicknessRange:[260, 520]}) : new T3.MeshStandardMaterial(o);
  m.userData.depth = new T3.MeshDepthMaterial({depthPacking:T3.RGBADepthPacking, map:t.map, alphaTest:.5}); return m;
}
// a shell that follows the body surface over a (th, ph) patch, pushed out along the normal
function bodyShell(A, B, C, th0, th1, ph0, ph1, NS, NT, off, uvFn){
  const pos = [], uv = [], idx = [];
  for (let i=0;i<=NS;i++) for (let j=0;j<=NT;j++){ const su = i/NS, tv = j/NT, th = lerp(th0, th1, su), ph = lerp(ph0, ph1, tv), F = bodyFrame(th, ph, A, B, C), o = off(su, tv, F);
    pos.push(F.p.x + F.n.x*o.n + (o.dx || 0), F.p.y + F.n.y*o.n + (o.dy || 0), F.p.z + F.n.z*o.n + (o.dz || 0)); const q = uvFn(su, tv); uv.push(q[0], q[1]); }
  for (let i=0;i<NS;i++) for (let j=0;j<NT;j++){ const a = i*(NT+1) + j, b = a + NT + 1; idx.push(a, b, a+1, a+1, b, b+1); }
  const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function featherTex(kind, pal){
  const key = kind + JSON.stringify(pal);
  if (TEX[key]) return TEX[key];
  const t = ctex(128, 512, (g, w, h) => paintFeather(g, w, h, kind, 'col', rgbOf(pal.a), rgbOf(pal.b), pal));
  return TEX[key] = t;
}
function featherBump(kind){
  const key = 'bump' + kind; if (TEX[key]) return TEX[key];
  return TEX[key] = ctex(128, 512, (g, w, h) => { g.fillStyle = '#404040'; g.fillRect(0, 0, w, h); paintFeather(g, w, h, kind, 'bump'); }, {srgb:false});
}
const GEO = {};
function featherGeo(bend){
  const key = 'fg' + bend; if (GEO[key]) return GEO[key];
  const g = new T3.PlaneGeometry(1, 1, 1, 6); g.translate(0, .5, 0);
  const p = g.attributes.position; for (let i=0;i<p.count;i++){ const y = p.getY(i); p.setZ(i, -bend*y*y); }
  g.computeVertexNormals(); return GEO[key] = g;
}
function featherMat(map, shiny, sheenCol, o2 = {}){
  const o = {map, alphaTest:.45, alphaToCoverage:true, side:T3.DoubleSide, roughness:shiny ? .5 : .82, metalness:0};
  if (o2.bump){ o.bumpMap = featherBump(o2.bump); o.bumpScale = o2.bumpScale || .6; }
  const phys = shiny || o2.irid;
  const m = phys ? new T3.MeshPhysicalMaterial({...o, sheen:shiny ? .8 : 0, sheenRoughness:.35, sheenColor:col3(sheenCol || '#ffffff'), clearcoat:o2.irid ? .35 : .12, clearcoatRoughness:.4,
      iridescence:o2.irid || 0, iridescenceIOR:1.35, iridescenceThicknessRange:[260, 520]}) : new T3.MeshStandardMaterial(o);
  m.userData.depth = new T3.MeshDepthMaterial({depthPacking:T3.RGBADepthPacking, map, alphaTest:.45});
  return m;
}
const _x = V3(), _y = V3(), _z = V3(), _m = new T3.Matrix4();
function featherMatrix(out, p, dir, n, w, l, lift){
  _y.copy(dir).multiplyScalar(Math.cos(lift)).addScaledVector(n, Math.sin(lift)).normalize();
  _x.crossVectors(_y, n).normalize(); _z.crossVectors(_x, _y).normalize();
  return out.makeBasis(_x.multiplyScalar(w), _y.multiplyScalar(l), _z.multiplyScalar(w)).setPosition(p);
}
function featherSet(list, mat, bend, shadow){
  const m = new T3.InstancedMesh(featherGeo(bend), mat, list.length);
  list.forEach((f, i) => { m.setMatrixAt(i, featherMatrix(_m, f.p, f.d, f.n, f.w, f.l, f.lift)); m.setColorAt(i, new T3.Color(f.j, f.j, f.j)); });
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = !!shadow; m.customDepthMaterial = mat.userData.depth; m.frustumCulled = false;
  m.userData.list = list; return m;
}
function std(color, o = {}){ return new T3.MeshStandardMaterial({color:col3(color), roughness:.7, metalness:0, ...o}); }
function shadowed(m, cast = true, recv = false){ m.traverse(o => { if (o.isMesh){ o.castShadow = cast; o.receiveShadow = recv; } }); return m; }
// merge many static meshes into a few draw calls
function mergeGeos(list){
  const parts = list.map(g => g.index ? g.toNonIndexed() : g);
  let n = 0; parts.forEach(g => n += g.attributes.position.count);
  const hasCol = parts.some(g => g.attributes.color);
  const pos = new Float32Array(n*3), nor = new Float32Array(n*3), uv = new Float32Array(n*2), col = hasCol ? new Float32Array(n*3) : null;
  let o = 0;
  for (const g of parts){ const c = g.attributes.position.count; pos.set(g.attributes.position.array, o*3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o*3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o*2);
    if (col){ if (g.attributes.color) col.set(g.attributes.color.array, o*3); else col.fill(1, o*3, (o + c)*3); } o += c; }
  const out = new T3.BufferGeometry(); out.setAttribute('position', new T3.BufferAttribute(pos, 3)); out.setAttribute('normal', new T3.BufferAttribute(nor, 3)); out.setAttribute('uv', new T3.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new T3.BufferAttribute(col, 3));
  out.computeBoundingSphere(); return out;
}
function placed(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx){
  return geo.clone().applyMatrix4(new T3.Matrix4().compose(V3(x, y, z), new T3.Quaternion().setFromEuler(new T3.Euler(rx, ry, rz)), V3(sx, sy, sz)));
}
function bakeStatic(root, S){                     // every mesh under root, grouped by material, merged in world space
  root.updateMatrixWorld(true); const by = new Map();
  root.traverse(m => { if (!m.isMesh) return; const k = m.material.uuid; if (!by.has(k)) by.set(k, {mat:m.material, geos:[], cast:false, recv:false}); const b = by.get(k); b.geos.push(m.geometry.clone().applyMatrix4(m.matrixWorld)); b.cast = b.cast || m.castShadow; b.recv = b.recv || m.receiveShadow; });
  for (const b of by.values()){ const mesh = new T3.Mesh(mergeGeos(b.geos), b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; S.add(mesh); }
}
function glowPoints(S, pts, size, opacity){
  const base = new T3.PlaneGeometry(1, 1), geo = new T3.InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
  const C = new Float32Array(pts.length*3), K = new Float32Array(pts.length*3);
  pts.forEach((p, i) => { C.set([p.p.x, p.p.y, p.p.z], i*3); const c = col3(p.c); K.set([c.r, c.g, c.b], i*3); });
  geo.setAttribute('aC', new T3.InstancedBufferAttribute(C, 3)); geo.setAttribute('aK', new T3.InstancedBufferAttribute(K, 3)); geo.instanceCount = pts.length;
  const mat = new T3.ShaderMaterial({transparent:true, depthWrite:false, blending:T3.AdditiveBlending, uniforms:{map:{value:softDot()}, sz:{value:size}, op:{value:opacity}},
    vertexShader:'attribute vec3 aC; attribute vec3 aK; uniform float sz; varying vec2 vUv; varying vec3 vK; void main(){ vUv = uv; vK = aK; vec4 mv = viewMatrix*vec4(aC,1.); mv.xy += position.xy*sz; gl_Position = projectionMatrix*mv; }',
    fragmentShader:'uniform sampler2D map; uniform float op; varying vec2 vUv; varying vec3 vK; void main(){ gl_FragColor = vec4(vK, texture2D(map, vUv).a*op);\n#include <colorspace_fragment>\n}'});
  const m = new T3.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 6; S.add(m); return m;
}
