// The canary short's world: a timber-propped coal tunnel (lamp light) and a pit head at sunset (golden), one three.js
// scene. update(id, f, cam, scene) poses everything for shot id at frame f (pure function of id + f).
// Lamp pools: the two-tone shading only knows ONE key light (the "sun", here the lamp key), so the pools of light
// around each hanging lamp are baked into vertex colours of every tunnel surface (LampBatch). Tunnel shells do not
// cast shadows (they would block the key); props and the cast do.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, V, lam, house } from "./build";
import { ctex, rep, rng, beamHD, grassHD, cobbleHD, planksHD, cloudHD } from "./paint";
import { Pen, drawOwen, drawCage, bodyFront, miner, fxNote, fxContact, OwenExpr, Expr } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx } from "./cast";
import { SHOTS, ShotDef, camAt, PX, ZC, W, DROP_AT, owenZ, singAt, birdAt, fillAt, smooth, clamp01, FPS, V3 } from "./canaryStory";
import words from "../../../shorts/canary/voice/words.json";

// ---------------- tunnel layout ----------------
const TW = 2.2, TH = 3.0, Z0 = 4, Z1 = -40;              // half width, height, tunnel z range
const SETS = Array.from({ length: 18 }, (_, i) => -i * 2.4); // timber sets
const LAMPS: V3[] = SETS.filter((_, i) => i % 2 === 0).map((z) => [0.9, 2.42, z - 0.1] as V3);
/** baked lamp light at a point (0.2 ambient .. ~1.35 under a lamp) */
export const lampK = (x: number, y: number, z: number) => {
  let k = 0.2;
  for (const [lx, ly, lz] of LAMPS) { const d2 = (x - lx) ** 2 + (y - ly) ** 2 * 0.6 + (z - lz) ** 2; k += 1.15 * Math.exp(-d2 / (2 * 1.9 * 1.9)); }
  return Math.min(1.35, k);
};

/** like build.ts Batch, but keeps a per-vertex colour = baked lamp light */
class LampBatch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const x = (geo.index ? geo.toNonIndexed() : geo.clone());
    if (m) x.applyMatrix4(m);
    if (!x.attributes.normal) x.computeVertexNormals();
    if (!x.attributes.uv) x.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
    for (const k of Object.keys(x.attributes)) if (!["position", "normal", "uv"].includes(k)) x.deleteAttribute(k);
    const p = x.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const k = lampK(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; }
    x.setAttribute("color", new THREE.BufferAttribute(c, 3));
    const l = this.g.get(mat); if (l) l.push(x); else this.g.set(mat, [x]);
  }
  build(parent: THREE.Object3D, cast: boolean) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.g.clear();
  }
}
const vmats = new Map<string, THREE.MeshLambertMaterial>();
const vlam = (key: string, p: THREE.MeshLambertMaterialParameters) => {
  let m = vmats.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ ...p, vertexColors: true })); vmats.set(key, m); }
  return m;
};

// ---------------- painted textures (our own) ----------------
const coalTex = () => ctex("coalWall", 1024, 1024, (g, r) => {
  g.fillStyle = "#4a403c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) {            // blocky coal facets
    const x = r() * 1024, y = r() * 1024, w = 40 + r() * 110, h = 24 + r() * 60, a = (r() - 0.5) * 0.5;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = ["#564a44", "#3d3532", "#62554c", "#342d2b", "#6b5d52"][Math.floor(r() * 5)];
    g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(w / 2 - r() * 20, -h / 2 + r() * 10); g.lineTo(w / 2, h / 2); g.lineTo(-w / 2 + r() * 20, h / 2 - r() * 8); g.closePath(); g.fill();
    g.restore();
  }
  g.strokeStyle = "rgba(20,16,26,0.75)"; g.lineWidth = 5;     // seams painted in as dark tints
  for (let i = 0; i < 9; i++) { const y = i * 114 + r() * 30; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + (r() - 0.5) * 26); g.stroke(); }
  for (let i = 0; i < 140; i++) { g.fillStyle = "rgba(220,205,190,0.35)"; g.fillRect(r() * 1024, r() * 1024, 3 + r() * 5, 2 + r() * 3); } // glints
});
const dirtTex = () => ctex("mineFloor", 1024, 1024, (g, r) => {
  g.fillStyle = "#5a4636"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) { g.fillStyle = ["#4c3b2e", "#66503e", "#3e3028", "#2c2530"][Math.floor(r() * 4)]; const s = 4 + r() * 14; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, s, s * 0.7, r() * 3, 0, 7); g.fill(); }
});
const glowTex = () => ctex("lampGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,214,150,0.85)"); gr.addColorStop(0.25, "rgba(255,170,90,0.35)"); gr.addColorStop(1, "rgba(255,140,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// bumpy wall: plane along z (length L) of height H with noise relief in its normal direction
const rockPlane = (L: number, H: number, nx: number, ny: number, amp: number, seed: number) => {
  const geo = new THREE.PlaneGeometry(L, H, nx, ny), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const n = Math.sin(x * 2.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) + 0.6 * Math.sin(x * 5.3 + y * 3.1 + seed * 2) + 0.35 * Math.sin(x * 11.7 - y * 7.9);
    p.setZ(i, n * amp * (Math.abs(y) < H / 2 - 0.05 ? 1 : 0.3));
  }
  geo.computeVertexNormals();
  return geo;
};

// lathe vessels (teacup, bucket)
const lathe = (pts: [number, number][], seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const words2 = words as { w: string; start: number; end: number }[];
const speaking = (f: number) => words2.some((w) => f / FPS >= w.start && f / FPS < w.end);

export class MineWorld {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#000000", 6, 45);
  private sunCache = new Map<number, THREE.Vector3>();
  private clouds: THREE.Mesh[] = [];
  private tunnel = new THREE.Group(); private pit = new THREE.Group();
  private halos: THREE.Sprite[] = [];
  private wheel: THREE.Group;
  private cupWater!: THREE.Mesh; private bucketWater!: THREE.Mesh; private streams: THREE.Mesh[] = []; private spill!: THREE.Mesh; private puddle!: THREE.Mesh;
  private insert = new THREE.Group();
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private sph = new THREE.Sphere(); private v = new THREE.Vector3();

  constructor() {
    const R = this.root;
    // ---- sky sphere (golden only; underground it sits outside the closed tunnel) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 0.5);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target, this.tunnel, this.pit);
    this.buildTunnel();
    this.wheel = new THREE.Group();
    this.buildPit();
    const gold = [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud));
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.32, d = 520;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: gold[i % 4], transparent: true, depthWrite: false, fog: false }));
      const w = 120 + (i % 3) * 40; m.position.set(PX + Math.cos(a) * d, 70 + (i % 4) * 26, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); this.pit.add(m);
    }
  }

  private buildTunnel() {
    const b = new LampBatch(), T = this.tunnel;
    const coal = vlam("coal", { map: rep(coalTex(), 1, 1) }), dirt = vlam("dirt", { map: rep(dirtTex(), 1, 1) });
    const wood = vlam("timber", { map: beamHD() }), sleeper = vlam("sleeper", { color: "#6b4a34" });
    const L = Z0 - Z1, zc = (Z0 + Z1) / 2;
    (coalTex().repeat.set(L / 3.2, 1)); (dirtTex().repeat.set(2, L / 4.4));
    const floor = new THREE.PlaneGeometry(2 * TW, L, 22, 220); floor.rotateX(-Math.PI / 2);
    b.add(floor, dirt, new THREE.Matrix4().makeTranslation(0, 0, zc));
    for (const s of [-1, 1]) {
      const w = rockPlane(L, TH, 220, 16, 0.07, s * 3.1);
      w.rotateY(s < 0 ? Math.PI / 2 : -Math.PI / 2);
      b.add(w, coal, new THREE.Matrix4().makeTranslation(s * TW, TH / 2, zc));
    }
    const ceil = rockPlane(L, 2 * TW, 220, 22, 0.06, 7.7); ceil.rotateZ(Math.PI / 2); ceil.rotateY(Math.PI / 2); ceil.rotateX(Math.PI / 2);
    b.add(ceil, coal, new THREE.Matrix4().makeTranslation(0, TH, zc));
    const end = rockPlane(2 * TW, TH, 22, 16, 0.08, 2.2);
    b.add(end, coal, new THREE.Matrix4().makeTranslation(0, TH / 2, Z1));
    const back = rockPlane(2 * TW, TH, 22, 16, 0.08, 4.4); back.rotateY(Math.PI);
    b.add(back, coal, new THREE.Matrix4().makeTranslation(0, TH / 2, Z0));
    b.build(T, false);
    // timber sets, rails, sleepers, tub, lamps: cast shadows
    const p = new LampBatch();
    for (const z of SETS) {
      for (const s of [-1, 1]) {
        const post = boxGeo(V(-0.12, 0, -0.12), V(0.12, 2.78, 0.12), 0, true);
        p.add(post, wood, new THREE.Matrix4().makeRotationZ(s * 0.06).setPosition(s * 1.9, 0, z));
      }
      p.add(boxGeo(V(-2.15, 2.72, z - 0.14), V(2.15, 2.98, z + 0.14), 0, true), wood);
      for (const s of [-1, 1]) p.add(boxGeo(V(-0.05, 2.5, z - 0.05), V(0.05, 2.78, z + 0.05), 0, true), wood, new THREE.Matrix4().makeRotationZ(s * 0.7).setPosition(s * 1.65, 0.0, 0));
    }
    const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#575a66", specular: "#9a9aa0", shininess: 50, vertexColors: true }), 0.15);
    for (const x of [-0.5, 0.5]) p.add(boxGeo(V(x - 0.035, 0.08, Z1), V(x + 0.035, 0.17, Z0), 0), iron);
    for (let z = Z0 - 0.3; z > Z1; z -= 0.62) p.add(boxGeo(V(-0.78, 0, z - 0.1), V(0.78, 0.08, z + 0.1), 0), sleeper);
    // coal tub (cart) and a coal heap by the wall
    const tubM = vlam("tub", { color: "#6a4a3a" });
    p.add(boxGeo(V(-0.55, 0.32, -0.75), V(0.55, 1.0, 0.75), 0, true), tubM, new THREE.Matrix4().makeTranslation(-1.25, 0, -25.5));
    for (const [dx, dz] of [[-0.42, -0.5], [0.42, -0.5], [-0.42, 0.5], [0.42, 0.5]]) {
      const wh = new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16); wh.rotateZ(Math.PI / 2);
      p.add(wh, iron, new THREE.Matrix4().makeTranslation(-1.25 + dx * 1.3, 0.2, -25.5 + dz));
    }
    const lump = vlam("coalLump", { color: "#35302e" });
    const rnd = rng(17);
    for (let i = 0; i < 26; i++) {
      const g = new THREE.IcosahedronGeometry(0.12 + rnd() * 0.16, 0);
      p.add(g, lump, new THREE.Matrix4().makeRotationY(rnd() * 6).setPosition(-1.5 - rnd() * 0.45, 0.08 + rnd() * 0.25 * (1 - i / 26), -25.5 - 1.2 - rnd() * 1.6));
      if (i < 12) p.add(g, lump, new THREE.Matrix4().makeTranslation(-1.25 + (rnd() - 0.5) * 0.8, 1.0, -25.5 + (rnd() - 0.5) * 1.2));
    }
    // hanging lamps: wire, brass body, glass, glowing flame (HDR emissive -> bloom), halo sprite
    const brass = vlam("lampBrass", { color: "#c39a3e" });
    for (const [x, y, z] of LAMPS) {
      p.add(new THREE.CylinderGeometry(0.008, 0.008, 2.74 - y - 0.16, 4), lump, new THREE.Matrix4().makeTranslation(x, (2.74 + y + 0.16) / 2, z));
      p.add(new THREE.CylinderGeometry(0.06, 0.08, 0.06, 12), brass, new THREE.Matrix4().makeTranslation(x, y + 0.13, z));
      p.add(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 12), brass, new THREE.Matrix4().makeTranslation(x, y - 0.12, z));
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 3.8, 1.4) }));
      flame.scale.set(1, 1.5, 1); flame.position.set(x, y, z); flame.layers.set(NOINK); T.add(flame);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 14, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.6), transparent: true, opacity: 0.35, depthWrite: false }));
      glass.position.set(x, y, z); glass.layers.set(NOINK); T.add(glass);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.3, 1.0, 0.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.position.set(x, y, z); halo.scale.setScalar(1.1); halo.layers.set(NOINK); T.add(halo); this.halos.push(halo);
    }
    p.build(T, true);
  }

  private buildPit() {
    const b = new Batch(), P = this.pit;
    const grassM = lam("pitGrass", () => ({ map: rep(grassHD(), 60, 60) }));
    const yard = lam("pitYard", () => ({ map: rep(cobbleHD(), 4, 4) }));
    const ground = new THREE.PlaneGeometry(600, 600, 1, 1); ground.rotateX(-Math.PI / 2);
    b.add(ground, grassM, new THREE.Matrix4().makeTranslation(PX, 0, -200));
    const yd = new THREE.PlaneGeometry(26, 22); yd.rotateX(-Math.PI / 2);
    b.add(yd, yard, new THREE.Matrix4().makeTranslation(PX, 0.012, -10));
    // headframe (winding tower): two raked A-frames of dark iron, a platform and the big wheel on top
    const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 60 }), 0.15);
    const HX = PX - 3.5, HZ = -20, HT = 13;
    const strut = (a: THREE.Vector3, c: THREE.Vector3, th = 0.32) => {
      const d = c.clone().sub(a), len = d.length(), g = new THREE.BoxGeometry(th, len, th);
      const m = new THREE.Matrix4().makeTranslation(0, len / 2, 0).premultiply(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()))).premultiply(new THREE.Matrix4().makeTranslation(a.x, a.y, a.z));
      b.add(g, iron, m);
    };
    for (const s of [-1, 1]) {
      strut(V(HX + s * 2.4, 0, HZ - 1.6), V(HX + s * 0.9, HT, HZ));
      strut(V(HX + s * 2.4, 0, HZ + 1.6), V(HX + s * 0.9, HT, HZ));
      strut(V(HX + s * 1.0, 0, HZ + 7), V(HX + s * 0.9, HT - 0.4, HZ), 0.4); // back legs toward the engine house
      for (const y of [3.5, 7, 10.2]) strut(V(HX + s * (2.4 - 1.5 * y / HT), y, HZ - 1.6 * (1 - y / HT)), V(HX + s * (2.4 - 1.5 * y / HT), y, HZ + 1.6 * (1 - y / HT)), 0.16);
    }
    for (const y of [3.5, 7, 10.2, HT]) strut(V(HX - (2.4 - 1.5 * y / HT), y, HZ), V(HX + (2.4 - 1.5 * y / HT), y, HZ), 0.2);
    b.add(boxGeo(V(HX - 1.6, HT, HZ - 1.2), V(HX + 1.6, HT + 0.25, HZ + 1.2), 0, true), iron);
    // wheel (animated spin)
    const wm = twoTone(new THREE.MeshPhongMaterial({ color: "#8a3b30", specular: "#999999", shininess: 40 }), 0.15);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.11, 10, 48), wm); this.wheel.add(rim);
    for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.9, 0.08), wm); sp.rotation.z = (i * Math.PI) / 8; this.wheel.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 16), iron); hub.rotation.x = Math.PI / 2; this.wheel.add(hub);
    this.wheel.position.set(HX, HT + 2.3, HZ); this.wheel.rotation.y = Math.PI / 2;
    this.wheel.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    P.add(this.wheel);
    // engine house + a row of terraced cottages, a coal heap, low hills
    house(b, PX + 9, -26, 0, 8, 7, 6, 7, 0);
    for (let i = 0; i < 9; i++) house(b, PX - 26 + i * 6.2, -42, 0, 6, 6.5, 4.6 + (i % 3) * 0.5, i, 0);
    const heap = new THREE.ConeGeometry(6, 5, 7); heap.translate(0, 2.5, 0);
    b.add(heap, lam("heap", () => ({ color: "#2f2a33" })), new THREE.Matrix4().makeTranslation(PX - 16, 0, -24));
    const hillM = lam("hill", () => ({ map: rep(grassHD(), 18, 18) }));
    for (const [x, z, sx, sy] of [[-60, -150, 90, 22], [40, -170, 110, 30], [140, -160, 80, 18], [-150, -140, 70, 16]]) {
      const h = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); h.scale(sx, sy, sx * 0.6);
      b.add(h, hillM, new THREE.Matrix4().makeTranslation(PX + x, 0, z));
    }
    // fence posts along the yard edge
    const post = lam("fence", () => ({ color: "#8a6a4a" }));
    for (let x = -12; x <= 12; x += 1.6) b.add(boxGeo(V(PX + x - 0.05, 0, -21.2), V(PX + x + 0.05, 1.0, -21.1), 0, true), post);
    b.add(boxGeo(V(PX - 12, 0.75, -21.22), V(PX + 12, 0.83, -21.08), 0, true), post);
    b.build(P, true);
    // ---- the insert: crate, Y pipe with two spouts, teacup, bucket, water ----
    const I = this.insert, ib = new Batch();
    const crate = lam("crate", () => ({ map: rep(planksHD(), 0.5, 0.5) }));
    ib.add(boxGeo(V(PX + 2.5, 0, -4.4), V(PX + 3.7, 0.8, -3.6), 0, true), crate, undefined);
    const pipeM = twoTone(new THREE.MeshPhongMaterial({ color: "#6f7480", specular: "#b0b0b0", shininess: 50 }), 0.15);
    const cyl = (r: number, x0: V3, x1: V3) => { const a = V(...x0), c = V(...x1), d = c.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), 14); g.translate(0, d.length() / 2, 0);
      ib.add(g, pipeM, new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())).setPosition(a)); };
    cyl(0.035, [PX + 3.1, 2.6, -4.0], [PX + 3.1, 1.48, -4.0]);
    cyl(0.03, [PX + 2.82, 1.48, -4.0], [PX + 3.4, 1.48, -4.0]);
    for (const x of [2.82, 3.4]) cyl(0.025, [PX + x, 1.48, -4.0], [PX + x, 1.36, -4.0]);
    const cupM = lam("cup", () => ({ color: "#f4f0e6" })), bandM = lam("cupBand", () => ({ color: "#3f6fb5" }));
    const cup = lathe([[0, 0], [0.04, 0], [0.045, 0.01], [0.075, 0.1], [0.078, 0.11], [0.072, 0.11], [0.068, 0.1], [0.036, 0.015], [0, 0.015]]);
    ib.add(cup, cupM, new THREE.Matrix4().makeTranslation(PX + 2.82, 0.8, -4.0));
    ib.add(lathe([[0.071, 0.085], [0.076, 0.085], [0.077, 0.097], [0.072, 0.097]]), bandM, new THREE.Matrix4().makeTranslation(PX + 2.82, 0.8, -4.0));
    const handle = new THREE.TorusGeometry(0.03, 0.009, 8, 16, Math.PI * 1.3); handle.rotateZ(-Math.PI * 0.65);
    ib.add(handle, cupM, new THREE.Matrix4().makeTranslation(PX + 2.82 - 0.085, 0.86, -4.0));
    ib.add(new THREE.CylinderGeometry(0.11, 0.1, 0.012, 32), cupM, new THREE.Matrix4().makeTranslation(PX + 2.82, 0.806, -4.0));
    const bucketM = twoTone(new THREE.MeshPhongMaterial({ color: "#9aa0aa", specular: "#cccccc", shininess: 35, side: THREE.DoubleSide }), 0.15);
    const bucket = lathe([[0, 0], [0.15, 0], [0.19, 0.42], [0.185, 0.42], [0.145, 0.01], [0, 0.01]]);
    ib.add(bucket, bucketM, new THREE.Matrix4().makeTranslation(PX + 3.4, 0.8, -4.0));
    ib.build(I, true);
    const waterM = new THREE.MeshBasicMaterial({ color: new THREE.Color("#5ec8f0"), transparent: true, opacity: 0.88 });
    this.cupWater = new THREE.Mesh(new THREE.CircleGeometry(1, 32), waterM); this.cupWater.rotation.x = -Math.PI / 2;
    this.bucketWater = new THREE.Mesh(new THREE.CircleGeometry(1, 32), waterM); this.bucketWater.rotation.x = -Math.PI / 2;
    for (const x of [2.82, 3.4]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), waterM); s.position.x = PX + x; s.position.z = -4.0; this.streams.push(s); I.add(s); }
    this.spill = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1), waterM); this.spill.position.set(PX + 2.82, 0, -4.0 + 0.079);
    this.puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 24), waterM); this.puddle.rotation.x = -Math.PI / 2;
    for (const m of [this.cupWater, this.bucketWater, this.spill, this.puddle]) { m.layers.set(NOINK); I.add(m); }
    for (const s of this.streams) s.layers.set(NOINK);
    P.add(I);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light], under = s.light === "lamp";
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    this.tunnel.visible = under; this.pit.visible = !under;
    // ---- light rig: camera-relative key frozen per shot + two-tone uniforms ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.5 + 4, 6, under ? 14 : 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 120); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 60; sc.far = 200; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) m.lookAt(cam.position.x, m.position.y, cam.position.z);
    // lamp flicker (tiny, deterministic) and halo facing
    for (let i = 0; i < this.halos.length; i++) this.halos[i].scale.setScalar(1.05 + 0.06 * Math.sin(f * 0.7 + i * 1.7));
    this.wheel.rotation.z = f * 0.02;
    this.poseInsert(f);
    // ---- cast + effects ----
    const { places, fx } = this.stage(id, f);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0; const used: Actor[] = [];
    for (const p of places) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 0.8 * p.scale, p.z), 2.5))) continue;
      while (this.actors.length <= ai) this.actors.push(new Actor(this.root));
      const a = this.actors[ai++];
      a.r = this.pool.req(p.key, p.w, p.h, p.k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.scale, p.scale, p.scale);
      const k = under ? THREE.MathUtils.clamp(0.3 + 0.75 * lampK(p.x, p.y + 1, p.z), 0.45, 1.12) : 1;
      a.mat.color.setScalar(k);
      a.mesh.castShadow = true;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0; const fused: Fx[] = [];
    for (const p of fx) {
      while (this.fxs.length <= fi) this.fxs.push(new Fx(this.root));
      const e = this.fxs[fi++];
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft); e.mesh.visible = true; e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, 0); else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }

  private poseInsert(f: number) {
    const showTap = f < 512;
    const fl = fillAt(f);
    for (const o of [this.cupWater, this.bucketWater, this.puddle, this.spill, ...this.streams]) o.visible = showTap;
    this.insert.children.forEach((o) => { if (o.type === "Mesh" && !(o as THREE.Mesh).layers.isEnabled(NOINK)) o.visible = true; });
    const flowing = f >= 418;
    // cup: inner radius 0.036 at the bottom (y .015) -> 0.072 at the rim (y .105)
    const cy = 0.015 + 0.09 * fl.cup, cr = 0.036 + 0.036 * fl.cup;
    this.cupWater.position.set(PX + 2.82, 0.8 + cy, -4.0); this.cupWater.scale.setScalar(cr); this.cupWater.visible = showTap && fl.cup > 0.01;
    const by = 0.01 + 0.4 * fl.bucket, br = 0.145 + 0.04 * fl.bucket;
    this.bucketWater.position.set(PX + 3.4, 0.8 + by, -4.0); this.bucketWater.scale.setScalar(br); this.bucketWater.visible = showTap && fl.bucket > 0.002;
    const tops = [0.8 + cy, 0.8 + by];
    this.streams.forEach((s, i) => { const y0 = 1.36, y1 = tops[i]; s.scale.y = Math.max(0.001, y0 - y1); s.position.y = (y0 + y1) / 2; s.visible = showTap && flowing; });
    this.spill.visible = showTap && fl.overflow > 0; this.spill.scale.y = 0.105 * fl.overflow; this.spill.position.y = 0.8 + 0.105 - 0.105 * fl.overflow / 2;
    this.puddle.visible = showTap && fl.overflow > 0.5; this.puddle.position.set(PX + 2.82, 0.803, -3.9); this.puddle.scale.setScalar(0.06 + 0.12 * clamp01((f - 477) / 30));
  }

  // ---------------- who stands where, per shot ----------------
  private stage(id: number, f: number) {
    type P = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale: number; w: number; h: number; k: number; roll?: number };
    type F = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
    const places: P[] = [], fx: F[] = [];
    const lamp = SHOTS[id - 1].light === "lamp";
    const contact = (x: number, z: number, w: number) => {
      const col = lamp ? "#2a2238" : "#5a4a78";
      fx.push({ key: `blob|contact|${col}`, cw: 128, ch: 128, draw: (p) => fxContact(p, col), x, y: lamp ? 0.012 : 0.016, z, w, h: w * 0.6, flat: true });
    };
    const blinkAt = (f0: number, seed: number) => { const per = 40 + (seed * 17) % 31; return (f0 + seed * 13) % per < 4; };
    const owen = (x: number, z: number, o: { expr?: OwenExpr; flap?: [number, number]; bob?: number; roll?: number; look?: number; beak?: number }) => {
      const blink = blinkAt(f, 3) && o.expr !== "shock";
      const beak = Math.round((o.beak ?? 0) * 4) / 4;
      const key = `owen|${o.expr ?? "neutral"}|${blink ? 1 : 0}|${beak}|${(o.flap ?? [0, 0]).join(",")}|${o.look ?? 0}`;
      places.push({ key, draw: (p) => drawOwen(p, { expr: o.expr, blink, beak, flap: o.flap, look: o.look }), x, y: o.bob ?? 0, z, scale: 0.8, w: 600, h: 1000, k: 1, roll: o.roll });
      contact(x, z, 0.75);
    };
    const crew = (i: number, x: number, z: number, expr: Expr, opts: { mode?: "stroll" | "stand"; phase?: number; look?: number } = {}) => {
      const blink = blinkAt(f, 7 + i) && expr !== "laugh";
      const ph = Math.round((opts.phase ?? 0) * 24) / 24;
      const key = `miner${i}|${expr}|${blink ? 1 : 0}|${opts.mode ?? "stand"}|${ph}|${opts.look ?? 0}`;
      places.push({ key, draw: (p) => bodyFront(p, miner(i), { expr, blink, mode: opts.mode ?? "stand", phase: ph, look: opts.look ?? 0, seed: i * 3 + 1 }), x, y: 0, z, scale: 0.85, w: 600, h: 1000, k: 1 });
      contact(x, z, 0.7);
    };
    const cage = (x: number, y: number, z: number, scale: number, o2: boolean) => {
      const bd = birdAt(f), sing = Math.round(singAt(f) * 3) / 3;
      let pose = bd.pose, blink = false, hiss = 0;
      if (o2) { pose = f >= W.oxygen + 6 ? "wake" : "fallen"; blink = f >= W.canary - 4 && f < W.canary; hiss = clamp01((f - W.oxygen + 2) / 6) * (1 - clamp01((f - W.oxygen - 22) / 10)); }
      const sway = Math.round(bd.sway);
      const hq = Math.round(hiss * 4) / 4;
      const key = `cage|${o2 ? 1 : 0}|${pose}|${sway}|${o2 ? 0 : sing}|${blink ? 1 : 0}|${hq}`;
      places.push({ key, draw: (p) => drawCage(p, { pose, sway, sing: o2 ? 0 : sing, blink, o2, hiss: hq }), x, y, z, scale, w: 900, h: 1500, k: 1.5 });
      // music notes drifting up from the bird while it sings (fade out after "stops")
      if (!o2) for (let n = 0; n < 3; n++) {
        const u = ((f * 0.022 + n / 3) % 1), alive = f < W.stops + 6;
        if (!alive) continue;
        const k = n % 2;
        fx.push({ key: `note|${k}`, cw: 220, ch: 240, draw: (p) => fxNote(p, k, "#ffd98a"), x: x + 0.1 + 0.05 * Math.sin(u * 6 + n) * scale * 4, y: y + scale * 1.25 + u * scale * 1.6, z: z + 0.02, w: 0.09 * scale * 4, h: 0.1 * scale * 4, rot: 0.2 * Math.sin(u * 5 + n) });
      }
    };
    if (id === 1) {
      owen(0, -5.05, { expr: "neutral", flap: [0, 30] });
      cage(0.44, 0.1, -4.94, 0.28, false);
      crew(0, -1.2, -8.6, "neutral"); crew(1, 1.3, -9.4, "neutral");
    } else if (id === 2) {
      const z = owenZ(f), wob = Math.sin(f * 0.42);
      owen(0.05, z, { expr: "neutral", flap: [0, 30], bob: Math.abs(wob) * 0.03, roll: wob * 0.07 });
      cage(0.05 + 0.44 + wob * 0.01, 0.1 + Math.abs(wob) * 0.03, z + 0.06, 0.28, false);
      crew(0, -0.95, z - 2.4, "neutral", { mode: "stroll", phase: (f / 30 * 1.1) % 1 });
      crew(1, 1.05, z - 3.3, "neutral", { mode: "stroll", phase: (f / 30 * 1.1 + 0.4) % 1 });
    } else if (id >= 3 && id <= 5) {
      const shock = id === 5 && f >= DROP_AT + 2;
      owen(1.0, ZC, { expr: shock ? "shock" : "neutral", flap: shock ? [25, 32] : [0, 30], look: id === 3 ? -1 : 0 });
      cage(0.6, 0.1 + (shock ? 0.03 : 0), ZC + 0.2, 0.28, false);
      const laugh = f >= W.laughs - 3 && f < 252;
      crew(2, -0.75, ZC, id === 4 ? (f < W.fine - 6 ? "whistle" : "smile") : laugh ? "laugh" : "grin", { look: 1 });
      crew(0, -1.55, ZC - 0.6, laugh ? "laugh" : id === 5 ? "nervous" : "grin", { look: 1 });
      crew(1, 0.15, ZC - 0.9, laugh ? "laugh" : id === 5 ? "nervous" : "smile", { look: 1 });
    } else if (id === 6) {
      const talk = speaking(f);
      owen(PX, -6.2, { expr: talk ? "speak" : "neutral", beak: talk ? 0.35 + 0.65 * Math.abs(Math.sin(f * 1.25)) : 0, flap: [0, 18] });
      crew(0, PX - 1.7, -7.6, "neutral"); crew(1, PX + 1.8, -8.1, "neutral", { look: -1 });
    } else if (id === 7) {
      // insert: no cast in frame
    } else if (id === 8) {
      cage(PX + 3.05, 0.8, -4.0, 0.3, true);
      owen(PX + 2.2, -4.55, { expr: "neutral", look: 1 });
      crew(2, PX + 3.95, -4.7, "neutral", { look: -1 }); crew(0, PX + 4.65, -5.4, "neutral", { look: -1 });
    }
    return { places, fx };
  }
}
void smooth;
