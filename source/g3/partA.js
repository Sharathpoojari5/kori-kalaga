// ---------- 3D GROUND (Three.js): realistic ring, koris, handlers, crowd ----------
const G3 = (() => {
const T3 = window.THREE, api = {on:false, ok:false};
try { if (localStorage.getItem('kori-3d') === 'off') return api; } catch(e) {}
try { if (!T3 || !document.createElement('canvas').getContext('webgl2') && !document.createElement('canvas').getContext('webgl')) return api; } catch(e) { return api; }
api.ok = true;
const V3 = (x=0,y=0,z=0) => new T3.Vector3(x,y,z);
const RING = 1.85;                       // ring radius in metres
let R3 = null, S3 = null, CAM = null, cv3 = null, W3 = 600, H3 = 400;
let clock = 0, tScale = 1, slowTo = 0, shake = 0, built = null, venueKey = null, lastNow = 0;
const PI = Math.PI, TAU = PI*2;
const smooth = (a, b, k, dt) => a + (b - a)*(1 - Math.exp(-k*dt));
const angLerp = (a, b, k, dt) => { let d = ((b - a + PI) % TAU + TAU) % TAU - PI; return a + d*(1 - Math.exp(-k*dt)); };
const fwd = h => V3(Math.cos(h), 0, -Math.sin(h));
const headingTo = (from, to) => Math.atan2(-(to.z - from.z), to.x - from.x);
const col3 = c => new T3.Color(c);
const sr = (seed => () => (seed = (seed*16807) % 2147483647) / 2147483647)(91);

// ---------- textures drawn in code ----------
function ctex(w, h, draw, o = {}){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new T3.CanvasTexture(c);
  if (o.srgb !== false) t.colorSpace = T3.SRGBColorSpace;
  if (o.repeat){ t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  t.anisotropy = 4; t.userData.canvas = c; return t;
}
function noiseFill(g, w, h, n, cols, rMin, rMax, aMin, aMax){
  for (let i=0;i<n;i++){ g.globalAlpha = aMin + Math.random()*(aMax-aMin); g.fillStyle = cols[i % cols.length];
    const r = rMin + Math.random()*(rMax-rMin); g.beginPath(); g.ellipse(Math.random()*w, Math.random()*h, r, r*(.6+Math.random()*.6), Math.random()*PI, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
}
const TEX = {};
function scaleTex(){
  if (TEX.scale) return TEX.scale;
  return TEX.scale = ctex(128, 256, (g, w, h) => {
    g.fillStyle = '#cfcfcf'; g.fillRect(0,0,w,h);
    for (let r=0; r<16; r++) for (let i=0;i<5;i++){
      const x = i*w/4 + (r%2)*w/8, y = r*h/16;
      const gr = g.createRadialGradient(x, y + 6, 2, x, y + 8, 18); gr.addColorStop(0,'#f2f2f2'); gr.addColorStop(1,'#8d8d8d');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y + 8, w/8.5, h/26, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(40,40,40,.55)'; g.lineWidth = 1.4; g.stroke();
    }
  }, {repeat:[1,1]});
}
function sandTex(V){
  const R = V.ring;
  return ctex(1024, 1024, (g, w, h) => {
    const gr = g.createRadialGradient(w/2, h/2, 40, w/2, h/2, w/2);
    gr.addColorStop(0, R.c0); gr.addColorStop(.7, R.c1); gr.addColorStop(1, R.c2);
    g.fillStyle = gr; g.fillRect(0,0,w,h);
    noiseFill(g, w, h, 9000, ['#000000','#ffffff', R.c2, R.c0], .4, 1.4, .05, .22);
    noiseFill(g, w, h, 500, [R.c2, '#5a4632', '#efe2c4'], 1.2, 3.6, .15, .45);
    for (let i=0;i<14;i++){ g.strokeStyle = `rgba(${R.line},.10)`; g.lineWidth = 2 + Math.random()*3; g.beginPath(); g.arc(w/2, h/2, 60 + i*30 + Math.random()*10, Math.random()*TAU, Math.random()*TAU + 2); g.stroke(); }
    g.strokeStyle = 'rgba(255,250,235,.55)'; g.lineWidth = 7; g.setLineDash([22, 14]); g.beginPath(); g.arc(w/2, h/2, w*.43, 0, TAU); g.stroke(); g.setLineDash([]);
    for (const s of [-1, 1]){ g.strokeStyle = 'rgba(255,250,235,.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(w/2 + s*w*.17, h/2 - 60); g.lineTo(w/2 + s*w*.17, h/2 + 60); g.stroke(); }
  });
}
function groundTex(kind){
  return ctex(512, 512, (g, w, h) => {
    const base = {laterite:'#9a5a38', grass:'#6f7d3a', yard:'#6d655a'}[kind];
    g.fillStyle = base; g.fillRect(0,0,w,h);
    if (kind === 'grass'){
      noiseFill(g, w, h, 5000, ['#4f6a2a','#8a9a48','#a59a52','#3d5622'], .6, 2.2, .2, .55);
      for (let i=0;i<3500;i++){ const x = Math.random()*w, y = Math.random()*h; g.strokeStyle = Math.random() < .5 ? 'rgba(60,90,30,.5)' : 'rgba(170,170,90,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x,y); g.lineTo(x + rnd(-2,2), y - rnd(3,8)); g.stroke(); }
    } else if (kind === 'laterite'){
      noiseFill(g, w, h, 6000, ['#7a4024','#b86e44','#5e3018','#c98a5c'], .5, 2.4, .15, .45);
      noiseFill(g, w, h, 120, ['#d8c0a0','#4a2a16'], 2, 5, .2, .4);
    } else {
      noiseFill(g, w, h, 7000, ['#4d463c','#827a6e','#5c5448','#9a9184'], .5, 2.2, .15, .4);
      for (let i=0;i<40;i++){ g.strokeStyle = 'rgba(30,26,22,.25)'; g.lineWidth = 1; g.beginPath(); let x = Math.random()*w, y = Math.random()*h; g.moveTo(x,y); for (let k=0;k<6;k++){ x += rnd(-20,20); y += rnd(-20,20); g.lineTo(x,y); } g.stroke(); }
    }
  }, {repeat:[14,14]});
}
function softDot(){
  if (TEX.dot) return TEX.dot;
  return TEX.dot = ctex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.4,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0,0,w,h); });
}
function frondTex(){
  if (TEX.frond) return TEX.frond;
  return TEX.frond = ctex(128, 512, (g, w, h) => {
    g.strokeStyle = '#c8c09a'; g.lineWidth = 4; g.beginPath(); g.moveTo(w/2, h); g.lineTo(w/2, 0); g.stroke();
    for (let i=0;i<60;i++){ const u = i/60, y = h*(1 - u), L = w*.48*Math.sin(PI*Math.min(1, .15 + u*.95));
      for (const s of [-1,1]){ const l = 120 + Math.random()*80; g.strokeStyle = `rgb(${l*.45|0},${l*.75|0},${l*.3|0})`; g.lineWidth = 5; g.beginPath(); g.moveTo(w/2, y); g.quadraticCurveTo(w/2 + s*L*.6, y - 10, w/2 + s*L, y + 30); g.stroke(); } }
  });
}
function stoneTex(){
  if (TEX.stone) return TEX.stone;
  return TEX.stone = ctex(512, 256, (g, w, h) => {
    g.fillStyle = '#5a2e1c'; g.fillRect(0,0,w,h);
    for (let r=0;r<8;r++) for (let i=0;i<9;i++){ const bw = w/8, bh = h/8, x = i*bw - (r%2)*bw/2, y = r*bh;
      g.fillStyle = mixHex('#9c4f30', '#b8673e', Math.random()); g.fillRect(x+2, y+2, bw-4, bh-4);
      noiseFill(g, w, h, 0, [], 0, 0, 0, 0);
      for (let k=0;k<30;k++){ g.fillStyle = Math.random() < .5 ? 'rgba(60,25,12,.5)' : 'rgba(220,150,100,.35)'; g.beginPath(); g.arc(x + Math.random()*bw, y + Math.random()*bh, Math.random()*2.4, 0, TAU); g.fill(); } }
  }, {repeat:[3,1]});
}
function tileTex(){
  if (TEX.tile) return TEX.tile;
  return TEX.tile = ctex(256, 256, (g, w, h) => {
    g.fillStyle = '#7a3220'; g.fillRect(0,0,w,h);
    for (let r=0;r<10;r++) for (let i=0;i<8;i++){ const x = i*w/8 + (r%2)*w/16, y = r*h/10;
      const gr = g.createLinearGradient(x, 0, x + w/8, 0); gr.addColorStop(0,'#8e3d24'); gr.addColorStop(.5,'#c0603a'); gr.addColorStop(1,'#6e2a18');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x + w/16, y + h/20, w/17, h/18, 0, 0, TAU); g.fill(); }
    noiseFill(g, w, h, 900, ['#2a1a10','#d8a080'], .5, 1.6, .1, .3);
  }, {repeat:[4,2]});
}
function bambooTex(){
  if (TEX.bamboo) return TEX.bamboo;
  return TEX.bamboo = ctex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0,0,w,0); gr.addColorStop(0,'#8a7038'); gr.addColorStop(.45,'#d9c27a'); gr.addColorStop(1,'#7a6230');
    g.fillStyle = gr; g.fillRect(0,0,w,h);
    for (let y=60; y<h; y+=120){ g.fillStyle = 'rgba(70,50,20,.75)'; g.fillRect(0, y, w, 5); g.fillStyle = 'rgba(255,240,190,.4)'; g.fillRect(0, y+5, w, 2); }
    for (let i=0;i<40;i++){ g.strokeStyle = 'rgba(90,70,30,.25)'; g.beginPath(); const x = Math.random()*w; g.moveTo(x,0); g.lineTo(x,h); g.stroke(); }
  }, {repeat:[1,6]});
}
function trunkTex(){
  if (TEX.trunk) return TEX.trunk;
  return TEX.trunk = ctex(64, 256, (g, w, h) => {
    g.fillStyle = '#6b5a44'; g.fillRect(0,0,w,h);
    for (let y=0; y<h; y+=9){ g.fillStyle = `rgba(40,30,20,${.35 + Math.random()*.3})`; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(180,160,130,.25)'; g.fillRect(0, y+3, w, 2); }
    noiseFill(g, w, h, 600, ['#3a2e22','#9a8a70'], .5, 1.5, .2, .4);
  }, {repeat:[1,8]});
}
function clothTex(a, b, kind){
  return ctex(128, 128, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0,0,w,h);
    if (kind === 'check'){ g.fillStyle = b; g.globalAlpha = .45; for (let i=0;i<w;i+=16){ g.fillRect(i,0,6,h); g.fillRect(0,i,w,6); } g.globalAlpha = 1; }
    if (kind === 'border'){ g.fillStyle = b; g.fillRect(0, h-18, w, 10); g.fillRect(0, h-5, w, 3); }
    noiseFill(g, w, h, 500, ['#000000','#ffffff'], .4, 1, .03, .08);
  }, {repeat:[2,2]});
}
