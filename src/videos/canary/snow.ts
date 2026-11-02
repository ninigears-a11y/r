// 8 s test short: "Ancient people believed snow was a gift from the gods. But in Antarctica, it hides something far
// stranger..." The user's own penguin image (public/snow/penguin.png, the reference cut out as-is, never redrawn) stands
// on an Antarctic ice shelf at golden hour. Reuses the canary/bridge pipeline: two-tone world shading (lam/twoTone),
// golden LIGHTS + grade, ink, lens blur, bloom. Rendered at 15 fps (CPU-only test machine) and doubled to 30 on export.
import * as THREE from "three";
import { staticFile } from "remotion";
import { lam } from "./build";
import { ctex, rng } from "./paint";
import { LIGHTS, LOOK } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";

export const FPS = 15;
export const TOTAL = 120;          // 8 s
export const FLASH_AT = -100;      // no flash in this test
export type V3 = [number, number, number];
const T_ANTARCTICA = 4.53, T_STRANGER = 6.81; // from shorts/snow/words.json

export const SHOTS = [{ id: 1, a: 0, b: TOTAL, light: "golden" as const }];
export const layersAt = (_f: number) => [{ id: 1, alpha: 1 }];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * t * (t * (6 * t - 15) + 10); };
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// slow glide in + a small extra push on "stranger"; 3-4 deg roll; never a static hold
export const camAt = (f: number) => {
  const t = f / FPS, k = smooth(t / 8);
  const push = 0.12 * smooth((t - T_STRANGER + 0.2) / 1.0);
  const pos = lerp3([1.5, 1.25, 6.2], [0.55, 0.85, 3.4 - push], k);
  const look = lerp3([0.0, 1.0, 0], [0.0, 0.62, 0], k);
  return { pos, look, fov: 38 - 2 * k, roll: THREE.MathUtils.degToRad(-1 - 3 * k) };
};
export const dofAt = (f: number) => ({ cInf: 4 + 6 * smooth(f / TOTAL), focus: (_f: number): V3 => [0, 0.65, 0] });

// polar sunset palette (on-screen targets): peach horizon -> rose -> deep violet-blue; cool fog
const SKY = { c: ["#ffd2a6", "#f6b2a0", "#c99ab8", "#7c78b4", "#34407e"], e: [0, 4, 10, 22, 50] };
const FOG = "#e8c9cc";

const snowTex = () => ctex("snowField", 1024, 1024, (g, r) => {
  g.fillStyle = "#f4f7fb"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1400; i++) { g.fillStyle = ["#e6eef7", "#dbe6f2", "#ffffff", "#eef3fa"][Math.floor(r() * 4)]; const s = 6 + r() * 30; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, s, s * 0.4, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(170,190,220,0.35)"; g.lineWidth = 3;                // wind ripples
  for (let i = 0; i < 40; i++) { const y = r() * 1024; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 10); g.stroke(); }
});
const flakeTex = () => ctex("flake", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const crackTex = () => ctex("iceCracks", 1024, 1024, (g, r) => {
  g.clearRect(0, 0, 1024, 1024);
  const gr = g.createRadialGradient(512, 512, 0, 512, 512, 500);
  gr.addColorStop(0, "rgba(120,240,255,0.55)"); gr.addColorStop(0.5, "rgba(60,180,255,0.18)"); gr.addColorStop(1, "rgba(40,120,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = "rgba(200,255,255,1)"; g.lineCap = "round";
  for (let i = 0; i < 9; i++) {                                              // branching glowing cracks
    let x = 512, y = 512, a = (i / 9) * Math.PI * 2 + r() * 0.4;
    g.lineWidth = 7; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 14; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 30; y += Math.sin(a) * 30; g.lineTo(x, y); g.lineWidth = Math.max(1.5, 7 - s * 0.4); }
    g.stroke();
  }
});
const blobTex = () => ctex("pengBlob", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(40,50,110,0.55)"); gr.addColorStop(0.6, "rgba(60,70,130,0.25)"); gr.addColorStop(1, "rgba(80,90,150,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

/** faceted ice chunk: a jittered icosahedron, flat normals (the ink pass draws its creases) */
const iceGeo = (seed: number) => {
  const r = rng(seed), g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(), p = g.attributes.position;
  const key = (x: number, y: number, z: number) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`, off = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const k = key(p.getX(i), p.getY(i), p.getZ(i));
    if (!off.has(k)) off.set(k, 0.75 + r() * 0.5);
    const s = off.get(k)!; p.setXYZ(i, p.getX(i) * s, Math.max(0, p.getY(i)) * s, p.getZ(i) * s);
  }
  g.computeVertexNormals();
  return g;
};

let penTex: Promise<THREE.Texture> | null = null;
export const loadPenguin = () => (penTex ??= new THREE.TextureLoader().loadAsync(staticFile("snow/penguin.png"))
  .then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })
  .catch((e) => { penTex = null; throw e; })); // a failed load is not cached, so the retry loads again

export class SnowWorld {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#ffab5e", 5);
  private skyMat: THREE.ShaderMaterial; private sky: THREE.Mesh;
  private fog = new THREE.Fog(FOG, 30, 260);
  private flakes: THREE.Points; private flakeBase: Float32Array;
  private penguin: THREE.Mesh; private glow: THREE.Mesh; private glowMat: THREE.MeshBasicMaterial;
  private sunDisc: THREE.Sprite;

  constructor(pen: THREE.Texture) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    SKY.c.forEach((h, i) => untone(h, this.skyMat.uniforms["c" + i].value));
    const e = SKY.e.map((d) => THREE.MathUtils.degToRad(d)); this.skyMat.uniforms.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat); this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    // low backlit sun (golden preset), soft shadows
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 60; sc.far = 200;
    this.sun.shadow.bias = LIGHTS.golden.bias; this.sun.shadow.normalBias = LIGHTS.golden.normalBias;
    R.add(this.sun, this.sun.target);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: flakeTex(), color: new THREE.Color(7, 4.6, 2.6), fog: false, depthWrite: false }));
    this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    // ground: gently rolling snow shelf
    const gGeo = new THREE.PlaneGeometry(400, 400, 160, 160); gGeo.rotateX(-Math.PI / 2);
    const gp = gGeo.attributes.position;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), d = Math.hypot(x, z); gp.setY(i, d < 3 ? 0 : (Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.5 + Math.sin(x * 0.05 + z * 0.07) * 1.6) * Math.min(1, (d - 3) / 12)); }
    gGeo.computeVertexNormals();
    const snowT = snowTex(); snowT.repeat.set(60, 60);
    const ground = new THREE.Mesh(gGeo, lam("snowGround", () => ({ map: snowT }))); ground.receiveShadow = true; R.add(ground);
    // ice: shards near the penguin, bergs and cliffs further out (pale cyan / white, faceted)
    const iceA = lam("iceA", () => ({ color: "#d8eef8" })), iceB = lam("iceB", () => ({ color: "#bfe1f2" })), iceC = lam("iceC", () => ({ color: "#f2f8fc" }));
    const r = rng(11);
    const put = (x: number, z: number, sx: number, sy: number, sz: number, mat: THREE.Material, seed: number, yaw = 0) => {
      const m = new THREE.Mesh(iceGeo(seed), mat); m.position.set(x, -0.15, z); m.scale.set(sx, sy, sz); m.rotation.y = yaw; m.castShadow = m.receiveShadow = true; R.add(m);
    };
    put(-1.6, -1.2, 0.7, 1.3, 0.6, iceB, 1, 0.4); put(-2.3, -2.2, 0.5, 0.8, 0.5, iceA, 2); put(1.9, -1.8, 0.6, 1.0, 0.5, iceA, 3, 1.1);
    put(-0.9, 1.4, 0.25, 0.3, 0.25, iceC, 4); put(1.2, 0.9, 0.3, 0.22, 0.3, iceB, 5);
    for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.4, d = 14 + r() * 40, h = 2 + r() * 7; put(Math.cos(a) * d, Math.sin(a) * d, 2 + r() * 4, h, 2 + r() * 4, [iceA, iceB, iceC][i % 3], 20 + i, r() * 6); }
    for (let i = 0; i < 6; i++) { const x = -90 + i * 36 + r() * 10; put(x, -140 - r() * 40, 22 + r() * 14, 20 + r() * 26, 14, i % 2 ? iceA : iceC, 50 + i, r()); } // far ice cliffs
    // glowing cracks under the ice (appear on "Antarctica"): HDR cyan -> bloom
    this.glowMat = new THREE.MeshBasicMaterial({ map: crackTex(), color: new THREE.Color(3.0, 4.2, 4.8), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), this.glowMat); this.glow.rotation.x = -Math.PI / 2; this.glow.position.set(0, 0.012, 0.2); this.glow.layers.set(NOINK); R.add(this.glow);
    // the user's penguin, exactly as supplied: an unlit cut-out card (no relighting, no redraw), 1.1 m tall
    const img = pen.image as { width: number; height: number }, H = 1.1, Wd = (H * img.width) / img.height;
    const pg = new THREE.PlaneGeometry(Wd, H); pg.translate(0, H / 2 - 0.012, 0);
    this.penguin = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: pen, alphaTest: 0.5, side: THREE.DoubleSide, fog: false, toneMapped: false }));
    this.penguin.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: pen, alphaTest: 0.5 });
    this.penguin.castShadow = true; this.penguin.layers.set(NOINK); this.penguin.renderOrder = 1; R.add(this.penguin);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.set(0, 0.015, 0.02); blob.layers.set(NOINK); R.add(blob);
    // falling snow: deterministic flakes in a box around the set
    const N = 5200, fr = rng(99), pos = new Float32Array(N * 3); this.flakeBase = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) { this.flakeBase.set([(fr() - 0.5) * 14, fr() * 7, -9 + fr() * 14.5, fr()], i * 4); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.flakes = new THREE.Points(fg, new THREE.PointsMaterial({ map: flakeTex(), size: 0.07, sizeAttenuation: true, transparent: true, depthWrite: false, color: new THREE.Color(1.25, 1.25, 1.3) }));
    this.flakes.frustumCulled = false; this.flakes.layers.set(NOINK); R.add(this.flakes);
  }

  update(_id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, L = LIGHTS.golden, K = LOOK.golden, c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    // golden preset, sun low and slightly right of straight ahead (backlit), frozen for the shot
    const sunDir = new THREE.Vector3(0.28, Math.sin(THREE.MathUtils.degToRad(8)), -1).normalize();
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    this.sun.position.set(0, 0, 0).addScaledVector(sunDir, 120); this.sun.target.position.set(0, 0, 0);
    TONE.uLitCol.value.set(1.45, 1.08, 0.82); // peach-lit snow (the bridge golden lit [1.5,.68,.24] turns snow orange) TONE.uShadeCol.value.set(0.34, 0.42, 0.78); TONE.uShadeLift.value.set(0.05, 0.07, 0.16); // snow shade: cool blue-violet
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = 0.12; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = 1.0;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    this.sky.position.copy(cam.position);
    untone(FOG, this.fog.color); scene.fog = this.fog; scene.background = null;
    this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(2.2)));
    // penguin: camera-facing (yaw only), a tiny breathing scale -- the drawing itself is never changed
    this.penguin.rotation.set(0, Math.atan2(cam.position.x, cam.position.z), 0);
    const br = 1 + 0.012 * Math.sin(t * 2.4); this.penguin.scale.set(1 / Math.sqrt(br), br, 1);
    // glow under the ice from "Antarctica", pulsing, strongest on "stranger"
    const g = smooth((t - T_ANTARCTICA + 0.1) / 1.2) * (0.75 + 0.25 * Math.sin(t * 5)) + 0.35 * smooth((t - T_STRANGER) / 0.4);
    this.glowMat.opacity = Math.min(1, g); this.glow.scale.setScalar(0.8 + 0.4 * smooth((t - T_ANTARCTICA) / 2.5));
    // snow: fall ~0.9 m/s with a sideways drift, wrapped in the 7 m tall box
    const p = this.flakes.geometry.attributes.position as THREE.BufferAttribute, b = this.flakeBase;
    for (let i = 0; i < p.count; i++) {
      const x0 = b[i * 4], y0 = b[i * 4 + 1], z0 = b[i * 4 + 2], s = b[i * 4 + 3], sp = 0.6 + 0.6 * s;
      const y = (((y0 - t * sp) % 7) + 7) % 7;
      p.setXYZ(i, x0 + 0.25 * Math.sin(t * 0.9 + s * 20) + t * 0.15, y, z0 + 0.15 * Math.cos(t * 0.7 + s * 13));
    }
    p.needsUpdate = true;
    return new THREE.Vector3(...c.look);
  }
}
