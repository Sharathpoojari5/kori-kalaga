// ---------- camera look: HDR render, depth of field like a real lens, filmic tone, grade, vignette, grain ----------
const POST = {on:false, ok:null, rt:null, half:null, blur:null, w:0, h:0, focus:2, ap:.002};
const FSV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const DEPTH_FN = `uniform float cn, cf; float lin(float d){ return (cn*cf)/(cf - d*(cf - cn)); }`;
function postInit(){
  if (POST.ok !== null) return POST.ok;
  POST.ok = false;
  try {
    const gl = R3.getContext(); if (!(gl instanceof WebGL2RenderingContext)) return false;
    if (!R3.extensions.has('EXT_color_buffer_float') && !R3.extensions.has('EXT_color_buffer_half_float')) return false;
    const tri = new T3.BufferGeometry(); tri.setAttribute('position', new T3.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0], 3)); tri.setAttribute('uv', new T3.Float32BufferAttribute([0,0, 2,0, 0,2], 2));
    POST.cam = new T3.OrthographicCamera(-1, 1, 1, -1, 0, 1); POST.scene = new T3.Scene(); POST.quad = new T3.Mesh(tri); POST.quad.frustumCulled = false; POST.scene.add(POST.quad);
    const sh = (frag, uni) => new T3.ShaderMaterial({vertexShader:FSV, fragmentShader:frag, uniforms:uni, depthTest:false, depthWrite:false, toneMapped:false});
    // 1) half size: colour + signed circle of confusion (negative = in front of the focus)
    POST.prep = sh(`varying vec2 vUv; uniform sampler2D tC, tD; uniform float focus, ap, maxC; ${DEPTH_FN}
      void main(){ vec3 c = texture2D(tC, vUv).rgb; float d = lin(texture2D(tD, vUv).r);
        float coc = clamp(ap*(d - focus)/max(d, .05), -maxC, maxC); gl_FragColor = vec4(c, coc); }`,
      {tC:{value:null}, tD:{value:null}, focus:{value:2}, ap:{value:.002}, maxC:{value:.02}, cn:{value:.07}, cf:{value:140}});
    // 2) gather blur: a sample counts when its own blur circle reaches this pixel (so sharp things never smear onto blurry ones)
    const N = 36, taps = []; for (let i=0;i<N;i++){ const r = Math.sqrt((i + .5)/N), a = i*2.39996; taps.push(`vec2(${(Math.cos(a)*r).toFixed(4)},${(Math.sin(a)*r).toFixed(4)})`); }
    POST.blurM = sh(`varying vec2 vUv; uniform sampler2D tH; uniform float maxC, asp;
      const vec2 K[${N}] = vec2[${N}](${taps.join(',')});
      void main(){ vec4 c0 = texture2D(tH, vUv); float r0 = abs(c0.a); vec3 acc = c0.rgb; float wsum = 1.; float fg = 0.;
        for (int i=0;i<${N};i++){ vec2 o = K[i]*maxC; vec4 s = texture2D(tH, vUv + vec2(o.x/asp, o.y)); float rs = abs(s.a), dist = length(K[i])*maxC;
          float reach = smoothstep(dist - .0015, dist + .0015, rs);                 // the sample's blur covers us
          float behind = s.a > c0.a + .002 ? smoothstep(dist - .0015, dist + .0015, r0) : 1.;  // background only spreads as far as our own blur
          float w = reach*behind; acc += s.rgb*w; wsum += w; if (s.a < 0.) fg = max(fg, rs*reach); }
        gl_FragColor = vec4(acc/wsum, max(r0, fg)); }`, {tH:{value:null}, maxC:{value:.02}, asp:{value:1}});
    // 3) final: blend sharp and blurred by the circle size, then filmic tone, grade, vignette, grain
    POST.outM = sh(`varying vec2 vUv; uniform sampler2D tC, tD, tB; uniform float focus, ap, maxC, expo, time, vig, grain, sat, warm; uniform vec2 px; ${DEPTH_FN}
      vec3 RRTAndODTFit(vec3 v){ vec3 a = v*(v + .0245786) - .000090537; vec3 b = v*(.983729*v + .4329510) + .238081; return a/b; }
      vec3 aces(vec3 c){ const mat3 I = mat3(vec3(.59719,.07600,.02840), vec3(.35458,.90834,.13383), vec3(.04823,.01566,.83777));
        const mat3 O = mat3(vec3(1.60475,-.10208,-.00327), vec3(-.53108,1.10813,-.07276), vec3(-.07367,-.00605,1.07602)); c *= expo/.6; c = I*c; c = RRTAndODTFit(c); c = O*c; return clamp(c, 0., 1.); }
      vec3 toSRGB(vec3 c){ return mix(c*12.92, pow(c, vec3(.41666))*1.055 - .055, step(.0031308, c)); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time*7.13)*43758.5453); }
      void main(){ vec3 c = texture2D(tC, vUv).rgb; float d = lin(texture2D(tD, vUv).r); float coc = abs(ap*(d - focus)/max(d, .05));
        vec4 b = texture2D(tB, vUv); float m = smoothstep(.0012, .0045, max(coc, b.a)); c = mix(c, b.rgb, m);
        c = aces(c);
        float l = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(l), c, sat);                       // saturation
        c = c*c*(3. - 2.*c)*.18 + c*.82;                                                           // gentle S-curve
        c *= vec3(1. + warm*.035, 1. + warm*.01, 1. - warm*.04);                                  // warm grade
        vec2 q = vUv - .5; c *= 1. - vig*dot(q, q)*1.6;                                             // lens vignette
        c = toSRGB(clamp(c, 0., 1.));
        c += (hash(vUv*vec2(1731., 977.)) - .5)*grain;                                               // film grain
        gl_FragColor = vec4(c, 1.); }`,
      {tC:{value:null}, tD:{value:null}, tB:{value:null}, focus:{value:2}, ap:{value:.002}, maxC:{value:.02}, cn:{value:.07}, cf:{value:140}, expo:{value:1}, time:{value:0}, vig:{value:.45}, grain:{value:.035}, sat:{value:1.06}, warm:{value:1}, px:{value:new T3.Vector2(1, 1)}});
    POST.ok = true;
  } catch(e) { console.warn('post off', e); POST.ok = false; }
  return POST.ok;
}
function postSize(w, h){
  if (POST.w === w && POST.h === h && POST.rt) return;
  POST.w = w; POST.h = h; for (const k of ['rt', 'half', 'blur']) if (POST[k]) POST[k].dispose();
  const ht = R3.extensions.has('EXT_color_buffer_half_float') || R3.extensions.has('EXT_color_buffer_float') ? T3.HalfFloatType : T3.UnsignedByteType;
  POST.rt = new T3.WebGLRenderTarget(w, h, {type:ht, samples:api.lowEnd ? 2 : 4, depthTexture:new T3.DepthTexture(w, h, T3.UnsignedIntType)});
  const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
  POST.half = new T3.WebGLRenderTarget(hw, hh, {type:ht, minFilter:T3.LinearFilter, magFilter:T3.LinearFilter, depthBuffer:false});
  POST.blur = new T3.WebGLRenderTarget(hw, hh, {type:ht, minFilter:T3.LinearFilter, magFilter:T3.LinearFilter, depthBuffer:false});
}
function pass(mat, target){ POST.quad.material = mat; R3.setRenderTarget(target); R3.render(POST.scene, POST.cam); }
// focus on what the director is looking at; the closer the subject the shallower the focus, like a real lens
function renderOut(scene, cam, dt){
  R3.info.reset();
  if (!api.post || !postInit()){ R3.toneMapping = T3.ACESFilmicToneMapping; R3.render(scene, cam); return; }
  const pr = R3.getPixelRatio(), w = Math.round(W3*pr), h = Math.round(H3*pr); postSize(w, h);
  const fT = Math.max(.15, cam.position.distanceTo(camS.tgt)); POST.focus = POST.cut ? fT : smooth(POST.focus, fT, 6, dt || .016); POST.cut = false;
  const apT = clamp(.0052/POST.focus, .0011, .016)*(api.dofK == null ? 1 : api.dofK); POST.ap = smooth(POST.ap, apT, 5, dt || .016);
  R3.toneMapping = T3.NoToneMapping; R3.setRenderTarget(POST.rt); R3.render(scene, cam);
  const maxC = .022, asp = W3/H3;
  for (const M of [POST.prep, POST.outM]){ const u = M.uniforms; u.tC.value = POST.rt.texture; u.tD.value = POST.rt.depthTexture; u.focus.value = POST.focus; u.ap.value = POST.ap; u.maxC.value = maxC; u.cn.value = cam.near; u.cf.value = cam.far; }
  pass(POST.prep, POST.half);
  POST.blurM.uniforms.tH.value = POST.half.texture; POST.blurM.uniforms.maxC.value = maxC; POST.blurM.uniforms.asp.value = asp; pass(POST.blurM, POST.blur);
  const U = POST.outM.uniforms; U.tB.value = POST.blur.texture; U.expo.value = R3.toneMappingExposure; U.time.value = (performance.now()/1000) % 100;
  U.warm.value = api.look ? api.look.warm : 1; U.grain.value = api.lowEnd ? .02 : .032;
  pass(POST.outM, null);
}
