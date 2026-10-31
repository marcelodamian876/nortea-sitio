/* =====================================================================
   NORTEA · Hero 3D v6 — animación cuadro por cuadro
   ---------------------------------------------------------------------
   Un solo modelo de la vivienda (referencia "opción 4"). Cada pieza tiene
   su ventana de tiempo; window.cuadro(f) deja la escena en el cuadro f
   (30 fps, 940 cuadros = 31.3 s, igual que el video v5). El logo lo dibuja
   el sitio encima del video a partir del cuadro 806 (cierre-*.json).

   Unidades: metros. Terreno natural y = 0. Frente de la casa hacia +z.
   Ejes estructurales  x: -6, -2, 0.6, 6   z: -5, 0, 5
   ===================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { EffectComposer } from "./vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "./vendor/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "./vendor/jsm/postprocessing/OutputPass.js";

const params = new URLSearchParams(location.search);
const ANCHO = +params.get("w") || window.innerWidth;
const ALTO = +params.get("h") || window.innerHeight;
const MOVIL = ALTO > ANCHO;
if (params.has("captura")) document.body.classList.add("captura");
const TOTAL = 940;

/* ---------- Render ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(+params.get("dpr") || 1);
renderer.setSize(ANCHO, ALTO);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = params.has("vsm") ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.38;
const camara = new THREE.PerspectiveCamera(26, ANCHO / ALTO, 0.5, 400);

// Fondo azul marino con viñeta, medido del video v5 (centro #19304b, orillas #0b1c2f)
{
  const c = document.createElement("canvas"); c.width = ANCHO / 2; c.height = ALTO / 2;
  const g = c.getContext("2d"), cx = c.width * (MOVIL ? 0.5 : 0.66), cy = c.height * (MOVIL ? 0.36 : 0.48);
  g.fillStyle = "#0b1c2f"; g.fillRect(0, 0, c.width, c.height);
  g.save(); g.translate(cx, cy); g.scale(1, MOVIL ? 1.1 : 0.62);
  const r = c.width * (MOVIL ? 0.75 : 0.5);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, "#19304b"); gr.addColorStop(0.45, "#142a42"); gr.addColorStop(1, "rgba(11,28,47,0)");
  g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(ANCHO, ALTO, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camara));
const ao = new GTAOPass(scene, camara, ANCHO, ALTO);
ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
ao.blendIntensity = 0.75;
const usarAO = params.has("ao");   // el GTAO de prueba oscurece el fondo y deja artefactos: apagado
if (usarAO) composer.addPass(ao);
composer.addPass(new OutputPass());

/* ---------- Luces ---------- */
scene.add(new THREE.HemisphereLight(0xb7c6dc, 0x1a2a3c, 1.05));
const sol = new THREE.DirectionalLight(0xfff1de, 2.0);
sol.position.set(-10, 26, 18);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 90 });
sol.shadow.radius = 9; sol.shadow.blurSamples = 16;
sol.shadow.bias = -0.0005;
scene.add(sol);
const relleno = new THREE.DirectionalLight(0xa9bede, 0.55);
relleno.position.set(20, 8, 14);
scene.add(relleno);

/* ---------- Texturas de canvas ---------- */
function lienzo(w, h, pintar) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  pintar(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function porcelanato(base, junta, ancho, alto, pieza = [1.2, 0.6], veta = 0) {
  const cols = Math.max(1, Math.round(ancho / pieza[0])), filas = Math.max(1, Math.round(alto / pieza[1]));
  const W = Math.min(1024, 96 * cols), H = Math.min(1024, Math.max(32, Math.round(W * (filas * pieza[1]) / (cols * pieza[0]))));
  return lienzo(W, H, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 25 * cols * veta; i++) {
      g.strokeStyle = "rgba(255,255,255,0.05)"; g.lineWidth = 1 + Math.random() * 2;
      g.beginPath(); const x = Math.random() * w, y = Math.random() * h;
      g.moveTo(x, y); g.bezierCurveTo(x + 20, y + 10, x + 40, y - 10, x + 70, y + 5); g.stroke();
    }
    g.strokeStyle = junta; g.lineWidth = 1.5;
    for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * w / cols, 0); g.lineTo(i * w / cols, h); g.stroke(); }
    for (let j = 0; j <= filas; j++) { g.beginPath(); g.moveTo(0, j * h / filas); g.lineTo(w, j * h / filas); g.stroke(); }
  });
}
function piedra(ancho, alto) {
  return lienzo(128, Math.max(64, Math.min(1024, (128 * alto / ancho) | 0)), (g, w, h) => {
    g.fillStyle = "#8f8c86"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) {
      const v = 112 + Math.random() * 55 | 0;
      g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 3);
    }
    g.strokeStyle = "rgba(60,60,58,.4)"; g.lineWidth = 1;
    const filas = Math.max(2, Math.round(alto / 0.6));
    for (let j = 1; j < filas; j++) { g.beginPath(); g.moveTo(0, j * h / filas); g.lineTo(w, j * h / filas); g.stroke(); }
  });
}
const texMadera = lienzo(256, 256, (g, w, h) => {
  g.fillStyle = "#8a5a32"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = `rgba(${60 + Math.random() * 40 | 0},${35 + Math.random() * 20 | 0},15,${0.15 + Math.random() * 0.2})`;
    g.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 4, w * .6, y - 4, w, y + 2); g.stroke();
  }
});
const texBlock = lienzo(256, 256, (g, w, h) => {
  g.fillStyle = "#9b978f"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(70,68,64,.55)"; g.lineWidth = 2;
  for (let j = 0; j <= 8; j++) { g.beginPath(); g.moveTo(0, j * h / 8); g.lineTo(w, j * h / 8); g.stroke(); }
  for (let j = 0; j < 8; j++) for (let i = 0; i <= 4; i++) { const x = (i + (j % 2) * 0.5) * w / 4; g.beginPath(); g.moveTo(x, j * h / 8); g.lineTo(x, (j + 1) * h / 8); g.stroke(); }
});
texBlock.wrapS = texBlock.wrapT = THREE.RepeatWrapping;

/* ---------- Materiales ---------- */
const todosMats = new Set();
const mat = o => { const m = new THREE.MeshStandardMaterial(o); todosMats.add(m); return m; };
const M = {
  concreto: mat({ color: 0xc9c0b0, roughness: 0.92 }),
  concretoFresco: mat({ color: 0xa8a196, roughness: 0.85 }),
  excavacion: mat({ color: 0x0d1c2c, roughness: 1, transparent: true, opacity: 0.85 }),
  block: mat({ color: 0xffffff, map: texBlock, roughness: 0.95 }),
  blanco: mat({ color: 0xeeebe5, roughness: 0.8 }),
  blancoBanda: mat({ color: 0xf4f2ed, roughness: 0.7 }),
  grisOscuro: mat({ color: 0x3a3e43, roughness: 0.55 }),
  antracita: mat({ color: 0x1e2125, roughness: 0.45, metalness: 0.5 }),
  vidrio: mat({ color: 0x1a2733, roughness: 0.04, metalness: 0.75, transparent: true, opacity: 0.66 }),
  vidrioBarandal: mat({ color: 0xa6c8da, roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.22, depthWrite: false }),
  calido: mat({ color: 0x1a1008, emissive: 0xffcf94, emissiveIntensity: 0.62, roughness: 1 }),
  led: mat({ color: 0xffe2b0, emissive: 0xffd08a, emissiveIntensity: 2.5 }),
  madera: mat({ color: 0xffffff, map: texMadera, roughness: 0.6 }),
  maderaPuerta: mat({ color: 0xd9a676, map: texMadera, roughness: 0.45 }),
  galvanizado: mat({ color: 0xc3c9cf, roughness: 0.35, metalness: 0.8 }),
  tablaroca: mat({ color: 0xe9e8e3, roughness: 0.95 }),
  triplay: mat({ color: 0xc9a777, map: texMadera, roughness: 0.8 }),
  durock: mat({ color: 0xa9a69e, roughness: 0.95 }),
  deck: mat({ color: 0xaab0b6, roughness: 0.35, metalness: 0.75, side: THREE.DoubleSide }),
  cocina: mat({ color: 0x2f3338, roughness: 0.5 }),
  cubierta: mat({ color: 0xe9e6df, roughness: 0.25 }),
  piso: mat({ color: 0xd8d1c5, roughness: 0.35 }),
  pisoMadera: mat({ color: 0xe0b98c, map: texMadera, roughness: 0.5 }),
  tela: mat({ color: 0xcdc4b6, roughness: 0.95 }),
  planta: mat({ color: 0x3d6431, roughness: 0.9, flatShading: true }),
  plantaClara: mat({ color: 0x58803c, roughness: 0.9, flatShading: true }),
  maceta: mat({ color: 0x55585c, roughness: 0.7 }),
  plaza: mat({ color: 0xcfcac0, roughness: 0.6 }),
  acero: mat({ color: 0x6f747a, roughness: 0.3, metalness: 0.9 }),
  terreno: mat({ color: 0x173352, roughness: 1, transparent: true, opacity: 0.0, depthWrite: false }),
};
const fantasma = new THREE.MeshBasicMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.06, depthWrite: false });
const lineaFantasma = new THREE.LineBasicMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.45 });
const ORO = 0xd2a955;
const lineaOro = new THREE.LineBasicMaterial({ color: ORO, transparent: true });
const lineaOroTenue = new THREE.LineBasicMaterial({ color: ORO, transparent: true, opacity: 0.4 });
const lineaVarilla = new THREE.LineBasicMaterial({ color: 0xc8933f });
const lineaTopo = new THREE.LineBasicMaterial({ color: 0x9fb4cc, transparent: true, opacity: 0.55 });

/* ---------- Animación: cada pieza con su ventana de tiempo ---------- */
const anims = [];        // { o, tipo, t0, t1, d }
const cambios = [];      // { o, t, m } cambio de material en el cuadro t
const suave = p => p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p);
const salida = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
function anima(o, tipo, t0, t1, d = {}) {
  o.userData.base = { p: o.position.clone(), s: o.scale.clone() };
  anims.push({ o, tipo, t0, t1, d });
  return o;
}
// reparte una lista en el tiempo [t0, t1]: cada pieza dura `dur` cuadros
function secuencia(lista, tipo, t0, t1, dur, clave, d) {
  const l = clave ? [...lista].sort((a, b) => clave(a) - clave(b)) : lista;
  const n = l.length, paso = n > 1 ? (t1 - t0 - dur) / (n - 1) : 0;
  l.forEach((o, i) => anima(o, tipo, t0 + i * paso, t0 + i * paso + dur, d));
}
function cambia(o, t, m) { cambios.push({ o, t, m }); }
const alto = o => o.geometry?.parameters?.height ?? 0;

/* ---------- Grupos ---------- */
const casa = new THREE.Group(); scene.add(casa);
const G = {};
const grupo = n => { if (!G[n]) { G[n] = new THREE.Group(); G[n].name = n; casa.add(G[n]); } return G[n]; };

function caja(g, x0, x1, y0, y1, z0, z1, m, sombra = true) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0) || 0.001, Math.abs(y1 - y0) || 0.001, Math.abs(z1 - z0) || 0.001), m);
  o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  o.castShadow = sombra; o.receiveShadow = true;
  o.userData.m0 = m;
  g.add(o); return o;
}
function texturizada(g, x0, x1, y0, y1, z0, z1, textura, opts = {}) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), dz = Math.abs(z1 - z0);
  const horizontal = dy < 0.1 && dx > 0.05 && dz > 0.05;
  return caja(g, x0, x1, y0, y1, z0, z1, mat({ map: textura(Math.max(dx, dz), horizontal ? Math.min(dx, dz) : dy), roughness: 0.5, ...opts }));
}
// segmentos de línea; la geometría arranca en y = 0 local para poder "subir" desde su base
function lineas(g, pts, m) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  geo.computeBoundingBox(); const y0 = geo.boundingBox.min.y; geo.translate(0, -y0, 0);
  const l = new THREE.LineSegments(geo, m); l.position.y = y0; g.add(l); return l;
}

/* ---------- Geometría base ---------- */
const EX = [-6, -2, 0.6, 6], EZ = [-5, 0, 5];
const T = 0.36, h = T / 2;
const NIV = [0.3, 3.6, 6.9];
const LOSA = 0.3, ALT = 3.0;
const XMIN = -6 - h, XMAX = 6 + h, ZMIN = -5 - h, ZMAX = 5 + h;
const PISO = -1.2;                         // fondo de excavación (desplante de zapatas)

const vanosPlanta = [];
function muro(g, eje, fijo, a0, a1, y0, y1, grosor, vanos, m, plano = true) {
  const piezas = [];
  const add = (b0, b1, c0, c1) => { if (b1 - b0 > 0.01 && c1 - c0 > 0.01) piezas.push([b0, b1, c0, c1]); };
  const vs = [...vanos].sort((p, q) => p[0] - q[0]);
  let cursor = a0;
  for (const [v0, v1, s0, s1] of vs) { add(cursor, v0, y0, y1); add(v0, v1, y0, s0); add(v0, v1, s1, y1); cursor = v1; }
  add(cursor, a1, y0, y1);
  const mallas = piezas.map(([b0, b1, c0, c1]) => eje === "x"
    ? caja(g, b0, b1, c0, c1, fijo - grosor / 2, fijo + grosor / 2, m)
    : caja(g, fijo - grosor / 2, fijo + grosor / 2, c0, c1, b0, b1, m));
  if (plano && y0 < 1 && y1 > 1) vanosPlanta.push({ eje, fijo, a0, a1, grosor, vanos: vs.filter(v => v[2] < 1.2) });
  return mallas;
}
/* Ventana: marco antracita, cristal y resplandor cálido interior.
   cara = 1: el interior queda hacia -z / -x; cara = -1: hacia +z / +x. Devuelve sus piezas. */
function ventana(g, eje, fijo, a0, a1, y0, y1, { divisiones = 0, cara = 1, luz = null } = {}) {
  const f = 0.06, prof = 0.12, enX = eje === "x", piezas = [];
  const marco = (b0, b1, c0, c1) => piezas.push(enX
    ? caja(g, b0, b1, c0, c1, fijo - prof / 2, fijo + prof / 2, M.antracita, false)
    : caja(g, fijo - prof / 2, fijo + prof / 2, c0, c1, b0, b1, M.antracita, false));
  marco(a0, a1, y0, y0 + f); marco(a0, a1, y1 - f, y1);
  marco(a0, a0 + f, y0, y1); marco(a1 - f, a1, y0, y1);
  const n = divisiones || Math.max(1, Math.round((a1 - a0) / 1.3));
  for (let i = 1; i < n; i++) { const b = a0 + (a1 - a0) * i / n; marco(b - f / 2, b + f / 2, y0, y1); }
  const cr = enX ? caja(g, a0 + f, a1 - f, y0 + f, y1 - f, fijo - 0.01, fijo + 0.01, M.vidrio, false)
    : caja(g, fijo - 0.01, fijo + 0.01, y0 + f, y1 - f, a0 + f, a1 - f, M.vidrio, false);
  cr.userData.vidrio = true; piezas.push(cr);
  if (luz) {
    const d = -cara * 0.35;
    const r = enX ? caja(luz, a0 + 0.1, a1 - 0.1, y0 + 0.05, y1 - 0.15, fijo + d - 0.005, fijo + d + 0.005, M.calido, false)
      : caja(luz, fijo + d - 0.005, fijo + d + 0.005, y0 + 0.05, y1 - 0.15, a0 + 0.1, a1 - 0.1, M.calido, false);
    r.userData.luz = true;
  }
  return piezas;
}
function barandalVidrio(g, eje, fijo, a0, a1, y0, altoB = 1.0) {
  const enX = eje === "x", p = [];
  const v = enX ? caja(g, a0, a1, y0, y0 + altoB, fijo - 0.012, fijo + 0.012, M.vidrioBarandal, false)
    : caja(g, fijo - 0.012, fijo + 0.012, y0, y0 + altoB, a0, a1, M.vidrioBarandal, false);
  v.userData.vidrio = true; p.push(v);
  p.push(enX ? caja(g, a0, a1, y0 + altoB, y0 + altoB + 0.04, fijo - 0.03, fijo + 0.03, M.antracita, false)
    : caja(g, fijo - 0.03, fijo + 0.03, y0 + altoB, y0 + altoB + 0.04, a0, a1, M.antracita, false));
  p.push(enX ? caja(g, a0, a1, y0, y0 + 0.06, fijo - 0.04, fijo + 0.04, M.antracita, false)
    : caja(g, fijo - 0.04, fijo + 0.04, y0, y0 + 0.06, a0, a1, M.antracita, false));
  return p;
}
function lamas(g, x0, x1, y0, y1, z, paso = 0.16, ancho = 0.06, prof = 0.18) {
  const p = [];
  for (let x = x0; x + ancho <= x1 + 1e-6; x += paso) p.push(caja(g, x, x + ancho, y0, y1, z, z + prof, M.madera));
  return p;
}
function downlight(g, x, y, z) { const o = caja(g, x - 0.07, x + 0.07, y - 0.012, y, z - 0.07, z + 0.07, M.led, false); o.userData.luz = true; return o; }

/* =====================================================================
   TIEMPOS (cuadros a 30 fps). Reparto sobre 806 cuadros antes del logo.
   ===================================================================== */
const TL = {
  topo: [0, 62], plano: [56, 132],
  excavacion: [130, 146], armadoZap: [140, 158], zapatas: [150, 170], dados: [160, 178], contratrabes: [168, 188], relleno: [184, 200], firme: [196, 212],
  armado1: [210, 224], columnas1: [216, 240], trabes1: [236, 254], losa1: [250, 266],
  muros1: [266, 300],
  armado2: [300, 312], columnas2: [306, 328], trabes2: [324, 340],
  losa2: [340, 358], pretil: [354, 366],
  muros2: [364, 396],
  levanta: [398, 414], blanco1: [408, 430], pisos: [414, 430], ventanas1: [428, 446], puerta: [434, 446], puertasInt: [440, 452],
  cocina: [446, 466], muebles: [456, 470], baja: [472, 488], blanco2: [482, 500], ventanas2: [488, 504],
  fachada: [506, 568],
  soleras: [580, 594], montantes: [590, 610], esquinas: [604, 616], cerramientos: [610, 622], perimetral: [618, 632],
  bloqueo: [628, 638], contraviento: [634, 642], armaduras: [640, 658], polines: [654, 662],
  tablaroca: [660, 678], deck: [676, 690], triplay: [688, 702], durock: [700, 718],
  pintura: [716, 728], ventanas3: [722, 732], terraza: [728, 744],
  dorado: [772, 800], desvanece: [798, 822],
};

/* =====================================================================
   1. TOPOGRAFÍA: malla ondulada que se dibuja y se nivela hasta la plataforma
   ===================================================================== */
const topo = grupo("topo");
const topoGeo = new THREE.BufferGeometry();
{
  const nx = 24, nz = 22, w = 24, d = 22, pts = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i < nx; i++) pts.push([-w / 2 + i * w / nx, 0, -d / 2 + j * d / nz, -w / 2 + (i + 1) * w / nx, 0, -d / 2 + j * d / nz]);
  for (let i = 0; i <= nx; i++) for (let j = 0; j < nz; j++) pts.push([-w / 2 + i * w / nx, 0, -d / 2 + j * d / nz, -w / 2 + i * w / nx, 0, -d / 2 + (j + 1) * d / nz]);
  pts.sort((a, b) => (a[0] + a[3]) - (b[0] + b[3]));   // se dibuja de izquierda a derecha
  const plano = pts.flat();
  topoGeo.setAttribute("position", new THREE.Float32BufferAttribute(plano, 3));
  topoGeo.userData.base = Float32Array.from(plano);
}
const topoLineas = new THREE.LineSegments(topoGeo, lineaTopo); topoLineas.position.set(0, PISO, 0.5); topo.add(topoLineas);
const placa = new THREE.Mesh(new THREE.BoxGeometry(24, 0.04, 22), M.terreno);
placa.position.set(0, PISO - 0.02, 0.5); placa.receiveShadow = true; topo.add(placa);
const marcoPlaca = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(24, 0.001, 22)), lineaOroTenue);
marcoPlaca.position.set(0, PISO + 0.001, 0.5); topo.add(marcoPlaca);
const sombraSuelo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.32, transparent: true }));
sombraSuelo.rotation.x = -Math.PI / 2; sombraSuelo.position.y = PISO + 0.003; sombraSuelo.receiveShadow = true; topo.add(sombraSuelo);
const estacas = [];
for (const [x, z] of [[-9, -7], [8, -6], [-7, 8], [9, 9], [0, -9], [-10, 2]]) { const e = lineas(topo, [x, 0, z, x, 1.1, z], lineaOro); e.position.y = PISO; estacas.push(e); }

const plano = grupo("plano");

/* =====================================================================
   3. CIMENTACIÓN: excavación, armado, zapatas, dados, contratrabes, relleno, firme
   ===================================================================== */
const gExc = grupo("excavacion"), gArmZ = grupo("armadoZap"), gZap = grupo("zapatas"), gDad = grupo("dados"), gCT = grupo("contratrabes"), gFirme = grupo("firme");
const exc = [], armZ = [], zap = [], dad = [], ct = [];
for (const x of EX) for (const z of EZ) {
  exc.push(caja(gExc, x - 0.85, x + 0.85, PISO + 0.002, PISO + 0.012, z - 0.85, z + 0.85, M.excavacion, false));
  const p = [];
  for (let k = -0.6; k <= 0.61; k += 0.2) p.push(x + k, PISO + 0.1, z - 0.6, x + k, PISO + 0.1, z + 0.6, x - 0.6, PISO + 0.12, z + k, x + 0.6, PISO + 0.12, z + k);
  for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) p.push(x + dx, PISO + 0.1, z + dz, x + dx, NIV[0] + 0.9, z + dz);
  const a = lineas(gArmZ, p, lineaVarilla); a.userData.ocultaEn = TL.dados[1]; armZ.push(a);
  zap.push(caja(gZap, x - 0.7, x + 0.7, PISO, PISO + 0.3, z - 0.7, z + 0.7, M.concretoFresco));
  dad.push(caja(gDad, x - 0.25, x + 0.25, PISO + 0.3, 0, z - 0.25, z + 0.25, M.concretoFresco));
}
for (const z of EZ) ct.push(caja(gCT, -6 - 0.15, 6 + 0.15, -0.5, 0, z - 0.15, z + 0.15, M.concretoFresco));
for (const x of EX) ct.push(caja(gCT, x - 0.15, x + 0.15, -0.5, 0, -5 - 0.15, 5 + 0.15, M.concretoFresco));
const firme = caja(gFirme, XMIN, XMAX, 0, NIV[0], ZMIN, ZMAX, M.concreto);
secuencia(exc, "aparece", ...TL.excavacion, 6, o => o.position.x + o.position.z);
secuencia(armZ, "sube", ...TL.armadoZap, 8);
secuencia(zap, "sube", ...TL.zapatas, 8, o => o.position.x - o.position.z);
secuencia(dad, "sube", ...TL.dados, 8, o => o.position.x - o.position.z);
secuencia(ct, "desliza", ...TL.contratrabes, 10, null, { dy: 1.2 });
anima(firme, "sube", ...TL.firme);

/* =====================================================================
   4. ESTRUCTURA por nivel: armado, columnas, trabes y losa (hueco de escalera)
   ===================================================================== */
function estructura(n) {
  const k = n + 1;
  const gA = grupo("armado" + k), gC = grupo("columnas" + k), gT = grupo("trabes" + k), gL = grupo("losa" + k);
  const y0 = NIV[n], yl = NIV[n] + ALT;
  const arm = [], col = [], tr = [], lo = [];
  for (const x of EX) for (const z of EZ) {
    const p = [];
    for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) p.push(x + dx, y0, z + dz, x + dx, yl + 0.4, z + dz);
    for (let y = y0 + 0.15; y < yl; y += 0.3) p.push(x - 0.13, y, z - 0.13, x + 0.13, y, z - 0.13, x + 0.13, y, z - 0.13, x + 0.13, y, z + 0.13, x + 0.13, y, z + 0.13, x - 0.13, y, z + 0.13, x - 0.13, y, z + 0.13, x - 0.13, y, z - 0.13);
    const a = lineas(gA, p, lineaVarilla); a.userData.ocultaEn = TL["columnas" + k][1] + 2; arm.push(a);
    col.push(caja(gC, x - 0.175, x + 0.175, y0, yl, z - 0.175, z + 0.175, M.concreto));
  }
  for (const z of EZ) tr.push(caja(gT, -6, 6, yl - 0.45, yl, z - 0.125, z + 0.125, M.concreto));
  for (const x of EX) tr.push(caja(gT, x - 0.125, x + 0.125, yl - 0.45, yl, -5, 5, M.concreto));
  const a = yl, b = yl + LOSA;
  lo.push(caja(gL, XMIN, -2, a, b, ZMIN, ZMAX, M.concreto));
  lo.push(caja(gL, 0.6, XMAX, a, b, ZMIN, ZMAX, M.concreto));
  lo.push(caja(gL, -2, 0.6, a, b, -1, ZMAX, M.concreto));
  secuencia(arm, "sube", ...TL["armado" + k], 8);
  secuencia(col, "sube", ...TL["columnas" + k], 12, o => o.position.x - o.position.z);
  secuencia(tr, "desliza", ...TL["trabes" + k], 10, null, { dy: 1.5 });
  secuencia(lo, "desliza", ...TL["losa" + k], 12, null, { dy: 2.0 });
}
estructura(0); estructura(1);

function escalera(g, y0, y1) {
  const n = 9, sube = (y1 - y0) / (2 * n), huella = 0.28, p = [];
  const descanso = y0 + sube * n;
  for (let i = 0; i < n; i++) { const z1 = -1.25 - i * huella; p.push(caja(g, -1.85, -0.75, y0, y0 + sube * (i + 1), z1 - huella, z1, M.concreto)); }
  p.push(caja(g, -1.85, 0.45, y0, descanso, -4.85, -1.25 - n * huella, M.concreto));
  for (let i = 0; i < n; i++) { const z0 = -1.25 - n * huella + i * huella; p.push(caja(g, -0.65, 0.45, descanso, descanso + sube * (i + 1), z0, z0 + huella, M.concreto)); }
  return p;
}
secuencia(escalera(grupo("escalera1"), NIV[0], NIV[1]), "sube", TL.trabes1[0], TL.losa1[0], 6);
secuencia(escalera(grupo("escalera2"), NIV[1], NIV[2]), "sube", TL.trabes2[0], TL.losa2[0], 6);

/* =====================================================================
   5. MUROS (block) con los vanos del diseño desde el arranque
   ===================================================================== */
const muros1 = [], muros2 = [];
{
  const g = grupo("muros1"), y0 = NIV[0], y1 = NIV[0] + ALT;
  const m = (...a) => muros1.push(...muro(g, ...a, M.block));
  m("x", 5, -6, -2, y0, y1, T, [[-5.5, -2.9, 0.45, 3.0]]);
  m("x", 5, -2, 0.6, y0, y1, T, [[-1.2, 0.0, y0, 2.9]]);
  m("x", 2.5, 0.6, 6, y0, y1, 0.2, [[0.9, 5.7, y0, 3.0]]);
  m("z", 6, -5, 2.5, y0, y1, T, [[-3.6, -1.6, 1.1, 2.4]]);
  m("z", -6, -5, 5, y0, y1, T, [[-4.2, -2.4, 1.1, 2.4], [1.2, 3.6, 0.45, 3.0]]);
  m("x", -5, -6, 6, y0, y1, T, [[-5.4, -3.4, 1.1, 2.4], [2.2, 4.6, 0.45, 2.7]]);
  m("z", -2, -5, 5, y0, y1, 0.15, [[-1.0, 0.2, y0, 2.4], [1.4, 3.6, y0, 2.4]]);
  m("z", 0.6, -5, 2.5, y0, y1, 0.15, [[0.6, 1.6, y0, 2.4]]);
  m("x", 0, 0.6, 6, y0, y1, 0.15, [[2.4, 3.4, y0, 2.4]]);
}
{
  const g = grupo("muros2"), y0 = NIV[1], y1 = NIV[1] + ALT;
  const m = (...a) => muros2.push(...muro(g, ...a, M.block));
  m("x", 3.6, -6, -2, y0, y1, 0.2, [[-5.6, -2.4, y0, 6.3]]);
  m("z", -6, 3.6, 5, y0, y1, T, []);
  m("x", 5, -2, 0.6, y0, y1, T, [[-1.4, 0.0, 3.9, 6.4]]);
  m("x", 5, 0.6, 6, y0, y1, T, [[1.0, 2.8, 3.9, 6.3], [4.0, 5.4, 4.5, 5.9]]);
  m("z", 6, -5, 5, y0, y1, T, [[-3.6, -1.6, 4.4, 5.8], [1.4, 3.6, 4.4, 5.8]]);
  m("z", -6, -5, 3.6, y0, y1, T, [[-4.2, -2.4, 4.4, 5.8], [0.4, 2.6, 4.4, 5.8]]);
  m("x", -5, -6, 6, y0, y1, T, [[-5.4, -3.4, 4.4, 5.8], [2.2, 4.6, 4.4, 5.8]]);
  m("z", -2, -5, 3.6, y0, y1, 0.15, [[-0.4, 0.6, y0, 5.7]]);
  m("z", 0.6, -5, 5, y0, y1, 0.15, [[0.4, 1.4, y0, 5.7], [-3.6, -2.6, y0, 5.7]]);
  m("x", 0, 0.6, 6, y0, y1, 0.15, []);
}
for (const o of [...muros1, ...muros2]) {   // block a escala (piezas de 40 x 20)
  const p = o.geometry.parameters, L = Math.max(p.width, p.depth);
  const m = M.block.clone(); todosMats.add(m);
  m.map = texBlock.clone(); m.map.needsUpdate = true; m.map.repeat.set(L / 1.6, p.height / 1.6);
  o.material = o.userData.m0 = m;
}
const ordenMuro = o => Math.atan2(o.position.z, o.position.x);
secuencia(muros1, "sube", ...TL.muros1, 14, ordenMuro);
secuencia(muros2, "sube", ...TL.muros2, 14, ordenMuro);
const pretil = [];
{
  const g = grupo("azotea"), y0 = NIV[2], y1 = NIV[2] + 0.6;
  pretil.push(caja(g, XMIN, XMAX, y0, y1, ZMAX - 0.18, ZMAX, M.concreto));
  pretil.push(caja(g, XMIN, XMAX, y0, y1, ZMIN, ZMIN + 0.18, M.concreto));
  pretil.push(caja(g, XMIN, XMIN + 0.18, y0, y1, ZMIN + 0.18, ZMAX - 0.18, M.concreto));
  pretil.push(caja(g, XMAX - 0.18, XMAX, y0, y1, ZMIN + 0.18, ZMAX - 0.18, M.concreto));
  secuencia(pretil, "sube", ...TL.pretil, 8);
}

/* =====================================================================
   6. ACABADOS: los niveles superiores se levantan como fantasma, planta baja
   se termina por dentro y todo regresa a su lugar
   ===================================================================== */
const LEVANTE = ["losa1", "columnas2", "trabes2", "escalera2", "losa2", "muros2", "azotea", "interior2"];
const fraccion = o => (ordenMuro(o) + Math.PI) / (2 * Math.PI);
for (const o of muros1) cambia(o, TL.blanco1[0] + fraccion(o) * (TL.blanco1[1] - TL.blanco1[0]), M.blanco);
for (const o of muros2) cambia(o, TL.blanco2[0] + fraccion(o) * (TL.blanco2[1] - TL.blanco2[0]), M.blanco);
for (const n of ["losa1", "losa2", "trabes1", "trabes2", "columnas1", "columnas2"]) for (const o of G[n].children) cambia(o, n.endsWith("1") ? TL.blanco1[1] : TL.blanco2[1], M.blanco);
for (const o of pretil) cambia(o, TL.blanco2[1], M.blanco);
{
  const g = grupo("interior1"), y = NIV[0];
  const pisos = [];
  for (const [x0, x1, z0, z1] of [[XMIN + 0.2, -2.08, ZMIN + 0.2, ZMAX - 0.2], [-1.92, 0.52, -1, ZMAX - 0.2], [0.68, XMAX - 0.2, 0.08, 2.4], [0.68, XMAX - 0.2, ZMIN + 0.2, -0.08]])
    pisos.push(caja(g, x0, x1, y, y + 0.02, z0, z1, M.piso, false));
  secuencia(pisos, "aparece", ...TL.pisos, 8);
  const coc = [
    caja(g, -5.8, -2.3, y, y + 0.88, -4.82, -4.22, M.cocina), caja(g, -5.82, -2.28, y + 0.88, y + 0.92, -4.84, -4.18, M.cubierta),
    caja(g, -5.82, -5.22, y, y + 0.92, -4.2, -2.6, M.cocina), caja(g, -5.84, -5.2, y + 0.88, y + 0.92, -4.2, -2.6, M.cubierta),
    caja(g, -4.6, -3.9, y + 0.9, y + 0.93, -4.7, -4.35, M.acero), caja(g, -3.3, -2.7, y + 0.92, y + 0.94, -4.7, -4.3, M.antracita),
    caja(g, -5.8, -2.3, y + 1.6, y + 2.4, -4.82, -4.5, M.cocina),
    caja(g, -4.9, -3.1, y, y + 0.9, -2.7, -1.9, M.cocina), caja(g, -4.95, -3.05, y + 0.9, y + 0.94, -2.75, -1.85, M.cubierta),
  ];
  secuencia(coc, "cae", ...TL.cocina, 8);
  const mue = [
    caja(g, -5.9, -2.3, y + 0.02, y + 0.03, 0.8, 4.4, M.tela, false),
    caja(g, -5.6, -3.2, y, y + 0.42, 1.0, 1.9, M.tela), caja(g, -5.6, -3.2, y + 0.42, y + 0.8, 1.0, 1.25, M.tela),
    caja(g, -5.0, -3.8, y, y + 0.35, 2.6, 3.3, M.madera),
    caja(g, 2.2, 4.4, y + 0.72, y + 0.76, 0.6, 1.6, M.madera), caja(g, 3.2, 3.4, y, y + 0.72, 1.0, 1.2, M.antracita),
  ];
  for (const cx of [2.5, 3.3, 4.1]) for (const cz of [0.25, 1.95]) mue.push(caja(g, cx - 0.2, cx + 0.2, y, y + 0.45, cz - 0.2, cz + 0.2, M.tela));
  secuencia(mue, "cae", ...TL.muebles, 6);
  const pi = [caja(g, -2.04, -1.96, y, 2.4, 1.4, 2.3, M.maderaPuerta), caja(g, 2.4, 3.3, y, 2.4, -0.04, 0.04, M.maderaPuerta), caja(g, 0.56, 0.64, y, 2.4, 0.65, 1.55, M.maderaPuerta)];
  secuencia(pi, "sube", ...TL.puertasInt, 6);
}
{
  const g = grupo("interior2"), y = NIV[1];
  const p = [caja(g, XMIN + 0.2, XMAX - 0.2, y, y + 0.02, ZMIN + 0.2, 3.5, M.pisoMadera, false),
    caja(g, -5.4, -3.4, y, y + 0.55, -3.8, -1.6, M.tela), caja(g, 2.0, 4.0, y, y + 0.55, 1.6, 3.8, M.tela), caja(g, -5.4, -3.4, y, y + 0.55, 0.6, 2.8, M.tela)];
  secuencia(p, "aparece", TL.levanta[0], TL.levanta[1], 4);
}

/* =====================================================================
   7. VENTANAS, PUERTA Y FACHADA (referencia opción 4)
   ===================================================================== */
const luces = grupo("luces");
{
  const g = grupo("ventanas1");
  const v = [
    ...ventana(g, "x", 5, -5.5, -2.9, 0.45, 3.0, { divisiones: 2, luz: luces }),
    ...ventana(g, "x", 2.5, 0.9, 5.7, NIV[0], 3.0, { divisiones: 4, luz: luces }),
    ...ventana(g, "z", 6, -3.6, -1.6, 1.1, 2.4, { luz: luces }),
    ...ventana(g, "z", -6, -4.2, -2.4, 1.1, 2.4, { cara: -1, luz: luces }),
    ...ventana(g, "z", -6, 1.2, 3.6, 0.45, 3.0, { cara: -1, luz: luces }),
    ...ventana(g, "x", -5, -5.4, -3.4, 1.1, 2.4, { cara: -1, luz: luces }),
    ...ventana(g, "x", -5, 2.2, 4.6, 0.45, 2.7, { cara: -1, luz: luces }),
  ];
  secuencia(v, "crece", ...TL.ventanas1, 6, o => o.position.y);
  const pu = [caja(g, -1.18, -0.02, NIV[0], 2.88, 4.97, 5.05, M.maderaPuerta), caja(g, -0.2, -0.16, 1.0, 2.2, 5.05, 5.11, M.antracita), caja(g, -1.25, 0.05, 2.88, 2.95, 4.95, 5.1, M.antracita)];
  secuencia(pu, "sube", ...TL.puerta, 8);
}
{
  const g = grupo("ventanas2");
  const v = [
    ...ventana(g, "x", 3.6, -5.6, -2.4, NIV[1], 6.3, { divisiones: 3, luz: luces }),
    ...ventana(g, "x", 5, -1.4, 0.0, 3.9, 6.4, { divisiones: 1, luz: luces }),
    ...ventana(g, "x", 5, 1.0, 2.8, 3.9, 6.3, { divisiones: 2, luz: luces }),
    ...ventana(g, "x", 5.36, 4.0, 5.4, 4.5, 5.9, { divisiones: 2, luz: luces }),
    ...ventana(g, "z", 6, -3.6, -1.6, 4.4, 5.8, { luz: luces }),
    ...ventana(g, "z", 6.25, 1.4, 3.6, 4.4, 5.8, { luz: luces }),
    ...ventana(g, "z", -6, -4.2, -2.4, 4.4, 5.8, { cara: -1, luz: luces }),
    ...ventana(g, "z", -6, 0.4, 2.6, 4.4, 5.8, { cara: -1, luz: luces }),
    ...ventana(g, "x", -5, -5.4, -3.4, 4.4, 5.8, { cara: -1, luz: luces }),
    ...ventana(g, "x", -5, 2.2, 4.6, 4.4, 5.8, { cara: -1, luz: luces }),
  ];
  secuencia(v, "crece", ...TL.ventanas2, 6, o => o.position.y);
}
{
  const g = grupo("fachada");
  const pasos = [];
  const piedraP = (a, b, c, d, e, f) => texturizada(g, a, b, c, d, e, f, piedra);
  pasos.push(["sube", [piedraP(-2.6, -1.3, 0, 3.6, 5.0, 5.32), piedraP(0.1, 1.0, 0, 3.6, 5.0, 5.32), piedraP(5.45, 6.25, 0, 3.6, 4.45, 5.25)]]);
  pasos.push(["sube", [caja(g, -1.9, 1.2, 0, 0.1, 5.2, 6.4, M.plaza), caja(g, -1.7, 1.0, 0.1, 0.2, 5.2, 6.0, M.plaza), caja(g, -1.5, 0.9, 0.2, 0.3, 5.2, 5.6, M.plaza), caja(g, 1.0, 6.25, 0, 0.3, 2.5, 7.0, M.plaza)]]);
  pasos.push(["desliza", [caja(g, 0.6, XMAX + 0.12, 3.15, 3.66, 5.18, 5.5, M.grisOscuro), caja(g, XMAX, XMAX + 0.12, 3.15, 3.66, 2.3, 5.5, M.grisOscuro), caja(g, 0.62, 5.44, 3.27, 3.29, 2.5, 5.18, M.madera, false)], { dz: 1.2 }]);
  pasos.push(["desliza", [caja(g, XMIN - 0.05, 0.6, 3.3, 3.62, 5.18, 5.42, M.blancoBanda), caja(g, XMIN - 0.05, 0.6, 6.6, 7.1, 5.18, 5.45, M.blancoBanda), caja(g, XMIN - 0.05, XMIN + 0.22, 3.3, 7.1, 3.4, 5.45, M.blancoBanda)], { dz: 1.2 }]);
  const gris = (a, b) => porcelanato("#40454b", "#2a2d31", a, b, [0.6, 1.2]);
  pasos.push(["sube", [texturizada(g, 3.5, 6.24, 3.62, 6.62, 5.18, 5.36, gris), texturizada(g, 6.18, 6.24, 3.62, 6.62, -1.5, 5.36, gris)]]);
  pasos.push(["sube", [...lamas(g, -2.92, -2.62, 0.3, 3.3, 5.18, 0.1, 0.05, 0.12), ...lamas(g, -1.7, 0.4, 3.75, 6.5, 5.2, 0.22, 0.08, 0.2)]]);
  pasos.push(["crece", barandalVidrio(g, "x", 5.0, -6.0, -2.15, NIV[1], 1.0)]);
  const n = pasos.length, [t0, t1] = TL.fachada, paso = (t1 - t0 - 14) / (n - 1);
  pasos.forEach(([tipo, lista, d], i) => secuencia(lista, tipo, t0 + i * paso, t0 + i * paso + 14, 8, null, d));
  for (const x of [1.6, 2.9, 4.2]) anima(downlight(luces, x, 3.27, 3.9), "aparece", t1 - 8, t1);
  for (const x of [-5.0, -3.2]) anima(downlight(luces, x, 6.58, 4.3), "aparece", t1 - 8, t1);
  anima(caja(luces, -2.6, -1.3, 0.02, 0.05, 5.33, 5.36, M.led, false), "aparece", t1 - 8, t1);
  anima(caja(luces, 0.1, 1.0, 0.02, 0.05, 5.33, 5.36, M.led, false), "aparece", t1 - 8, t1);
}
{
  const g = grupo("jardin"), p = [];
  p.push(caja(g, -6.4, -2.8, 0, 0.45, 5.5, 6.6, M.maceta));
  const arb = new THREE.IcosahedronGeometry(0.32, 1);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(arb, i % 2 ? M.planta : M.plantaClara);
    m.position.set(-6.1 + i * 0.4, 0.62, 6.05 + (i % 3 - 1) * 0.15); m.scale.set(1, 0.7 + (i % 3) * 0.15, 1); m.castShadow = true; g.add(m); p.push(m);
  }
  p.push(caja(g, -7.6, -7.48, 0, 2.2, 5.9, 6.02, M.madera));
  for (const [dx, dy, dz, r] of [[0, 2.9, 0, 0.75], [0.45, 2.5, 0.2, 0.55], [-0.4, 2.55, -0.15, 0.6], [0.1, 3.45, 0.1, 0.5], [-0.2, 2.3, 0.4, 0.45]]) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), dy > 2.8 ? M.plantaClara : M.planta);
    c.position.set(-7.54 + dx, dy, 5.96 + dz); c.castShadow = true; g.add(c); p.push(c);
  }
  for (const x of [5.0, 5.3]) { const m = new THREE.Mesh(arb, M.plantaClara); m.position.set(x, 0.55, 2.8); g.add(m); p.push(m); }
  secuencia(p, "crece", TL.fachada[1] - 22, TL.fachada[1], 6);
}
for (const o of luces.children) if (o.userData.luz && !anims.some(a => a.o === o)) anima(o, "aparece", TL.fachada[1] - 10, TL.fachada[1]);

/* =====================================================================
   8. AMPLIACIÓN 3er NIVEL — steel framing a todo lo ancho (x -6..6, z -5..0)
   Sus muros caen sobre los ejes de trabes existentes (x = -6, 6; z = -5, 0).
   ===================================================================== */
const A = { x0: -6, x1: 6, z0: -5, z1: 0, y0: NIV[2], y1: NIV[2] + 2.7 };
const PG = 0.61;
const VANOS3 = {
  "x:0": [[-5.4, -2.6, A.y0 + 0.9, A.y0 + 2.2], [-1.4, 3.4, A.y0, A.y0 + 2.4], [4.0, 5.4, A.y0 + 0.9, A.y0 + 2.2]],
  "z:6": [[-3.6, -1.4, A.y0 + 0.9, A.y0 + 2.2]],
  "x:-5": [[-4.6, -2.6, A.y0 + 0.9, A.y0 + 2.2], [1.0, 3.0, A.y0 + 0.9, A.y0 + 2.2]],
  "z:-6": [[-3.6, -1.4, A.y0 + 0.9, A.y0 + 2.2]],
};
const MUROS3 = [["x", A.z1, A.x0, A.x1, VANOS3["x:0"], 1], ["x", A.z0, A.x0, A.x1, VANOS3["x:-5"], -1],
  ["z", A.x1, A.z0, A.z1, VANOS3["z:6"], 1], ["z", A.x0, A.z0, A.z1, VANOS3["z:-6"], -1]];
const ACERO = { soleras: [], anclas: [], montantes: [], esquinas: [], cerramientos: [], perimetral: [], bloqueo: [], contraviento: [], armaduras: [], polines: [] };
const gAcero = grupo("acero");
function perfil(lista, p0, p1, a = 0.04, b = 0.09) {
  const v = new THREE.Vector3().subVectors(p1, p0), L = v.length();
  const o = new THREE.Mesh(new THREE.BoxGeometry(a, L, b), M.galvanizado);
  o.position.copy(p0).addScaledVector(v, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  o.castShadow = true; o.receiveShadow = true; o.userData.m0 = M.galvanizado;
  gAcero.add(o); lista.push(o); return o;
}
const P = (eje, fijo, a, y, off = 0) => eje === "x" ? new THREE.Vector3(a, y, fijo + off) : new THREE.Vector3(fijo + off, y, a);
function armadura(lista, eje, fijo, a0, a1, y0, y1, horizontal = true, paso = 0.4) {
  if (horizontal) {
    perfil(lista, P(eje, fijo, a0, y0), P(eje, fijo, a1, y0)); perfil(lista, P(eje, fijo, a0, y1), P(eje, fijo, a1, y1));
    const n = Math.max(1, Math.round((a1 - a0) / paso));
    for (let i = 0; i < n; i++) { const b0 = a0 + (a1 - a0) * i / n, b1 = a0 + (a1 - a0) * (i + 1) / n; perfil(lista, P(eje, fijo, b0, i % 2 ? y1 : y0), P(eje, fijo, b1, i % 2 ? y0 : y1), 0.03, 0.06); }
  } else {
    perfil(lista, P(eje, fijo, a0, y0), P(eje, fijo, a0, y1)); perfil(lista, P(eje, fijo, a1, y0), P(eje, fijo, a1, y1));
    const n = Math.max(2, Math.round((y1 - y0) / paso));
    for (let i = 0; i < n; i++) { const c0 = y0 + (y1 - y0) * i / n, c1 = y0 + (y1 - y0) * (i + 1) / n; perfil(lista, P(eje, fijo, i % 2 ? a1 : a0, c0), P(eje, fijo, i % 2 ? a0 : a1, c1), 0.03, 0.06); }
  }
}
const HT = 0.35;
for (const [eje, fijo, a0, a1, vanos] of MUROS3) {
  const y0 = A.y0, y1 = A.y1;
  perfil(ACERO.soleras, P(eje, fijo, a0, y0 + 0.02), P(eje, fijo, a1, y0 + 0.02), 0.09, 0.04);
  for (let a = a0 + 0.3; a < a1; a += 0.9) ACERO.anclas.push(eje === "x"
    ? caja(gAcero, a - 0.06, a + 0.06, y0 - 0.005, y0 + 0.07, fijo - 0.1, fijo + 0.1, M.antracita, false)
    : caja(gAcero, fijo - 0.1, fijo + 0.1, y0 - 0.005, y0 + 0.07, a - 0.06, a + 0.06, M.antracita, false));
  armadura(ACERO.esquinas, eje, fijo, a0 + 0.03, a0 + 0.33, y0 + 0.04, y1, false);
  armadura(ACERO.esquinas, eje, fijo, a1 - 0.33, a1 - 0.03, y0 + 0.04, y1, false);
  armadura(ACERO.perimetral, eje, fijo, a0, a1, y1 - HT, y1 - 0.02, true, 0.61);
  const dentro = a => vanos.find(v => a > v[0] - 0.08 && a < v[1] + 0.08);
  const mont = (a, c0 = y0 + 0.04, c1 = y1 - HT) => perfil(ACERO.montantes, P(eje, fijo, a, c0), P(eje, fijo, a, c1));
  for (const v of vanos) {
    mont(v[0] - 0.03); mont(v[0] - 0.08); mont(v[1] + 0.03); mont(v[1] + 0.08);
    armadura(ACERO.cerramientos, eje, fijo, v[0] - 0.1, v[1] + 0.1, v[3], Math.min(v[3] + 0.3, y1 - HT), true, 0.35);
    if (v[2] > y0 + 0.1) perfil(ACERO.cerramientos, P(eje, fijo, v[0], v[2]), P(eje, fijo, v[1], v[2]));
  }
  const xs = [];
  for (let a = a0 + 0.33 + PG; a < a1 - 0.4; a += PG) xs.push(a);
  for (const a of xs) {
    const v = dentro(a);
    if (!v) mont(a);
    else { if (v[3] + 0.3 < y1 - HT - 0.05) mont(a, v[3] + 0.3, y1 - HT); if (v[2] > y0 + 0.1) mont(a, y0 + 0.04, v[2]); }
  }
  // bloqueo: hileras horizontales entre montantes a 0.9 y 1.8 m
  const cortes = [a0 + 0.33, ...xs.filter(a => !dentro(a)), a1 - 0.33].sort((p, q) => p - q);
  for (const yb of [y0 + 0.9, y0 + 1.8]) for (let i = 0; i < cortes.length - 1; i++) {
    const b0 = cortes[i], b1 = cortes[i + 1], m = (b0 + b1) / 2;
    if (vanos.some(v => m > v[0] - 0.1 && m < v[1] + 0.1 && yb > v[2] - 0.05 && yb < v[3] + 0.35)) continue;
    if (vanos.some(v => v[0] > b0 && v[1] < b1)) continue;
    perfil(ACERO.bloqueo, P(eje, fijo, b0, yb), P(eje, fijo, b1, yb), 0.04, 0.08);
  }
  for (const [b0, b1] of [[a0 + 0.33, a0 + 1.55], [a1 - 1.55, a1 - 0.33]]) {
    if (vanos.some(v => v[0] < b1 && v[1] > b0)) continue;
    perfil(ACERO.contraviento, P(eje, fijo, b0, y0 + 0.05, 0.05), P(eje, fijo, b1, y1 - HT, 0.05), 0.012, 0.035);
    perfil(ACERO.contraviento, P(eje, fijo, b1, y0 + 0.05, 0.05), P(eje, fijo, b0, y1 - HT, 0.05), 0.012, 0.035);
  }
}
// armaduras de cubierta en el sentido corto (z) a cada 1.22 m
for (let x = A.x0 + 0.05; x <= A.x1 - 0.04; x += 1.22) {
  const yb = A.y1, yt = A.y1 + 0.3, n = 8;
  perfil(ACERO.armaduras, new THREE.Vector3(x, yb, A.z0), new THREE.Vector3(x, yb, A.z1), 0.04, 0.09);
  perfil(ACERO.armaduras, new THREE.Vector3(x, yt, A.z0 - 0.1), new THREE.Vector3(x, yt, A.z1 + 0.1), 0.04, 0.09);
  for (let i = 0; i < n; i++) {
    const za = A.z0 + (A.z1 - A.z0) * i / n, zb = A.z0 + (A.z1 - A.z0) * (i + 1) / n;
    perfil(ACERO.armaduras, new THREE.Vector3(x, i % 2 ? yt : yb, za), new THREE.Vector3(x, i % 2 ? yb : yt, zb), 0.03, 0.06);
  }
}
for (let z = A.z0; z <= A.z1 + 0.01; z += 1.25) perfil(ACERO.polines, new THREE.Vector3(A.x0 - 0.05, A.y1 + 0.34, z), new THREE.Vector3(A.x1 + 0.05, A.y1 + 0.34, z), 0.06, 0.1);
{
  const dx = o => o.position.x + o.position.z * 0.3;
  secuencia(ACERO.anclas, "crece", ...TL.soleras, 4, dx);
  secuencia(ACERO.soleras, "traza", ...TL.soleras, 10, dx);
  secuencia(ACERO.montantes, "sube", ...TL.montantes, 6, dx);
  secuencia(ACERO.esquinas, "sube", ...TL.esquinas, 5, dx);
  secuencia(ACERO.cerramientos, "crece", ...TL.cerramientos, 5, dx);
  secuencia(ACERO.perimetral, "crece", ...TL.perimetral, 4, dx);
  secuencia(ACERO.bloqueo, "crece", ...TL.bloqueo, 4, dx);
  secuencia(ACERO.contraviento, "crece", ...TL.contraviento, 5, dx);
  secuencia(ACERO.armaduras, "cae", ...TL.armaduras, 6, o => o.position.x);
  secuencia(ACERO.polines, "cae", ...TL.polines, 5, o => o.position.z);
}

/* Hojas de 1.22 x 2.44: tablaroca por dentro, triplay en losa y Durock por fuera */
function hojas(g, eje, fijo, a0, a1, y0, y1, vanos, off, e, m) {
  const out = [];
  const placa = (b0, b1, c0, c1) => out.push(eje === "x"
    ? caja(g, b0 + 0.004, b1 - 0.004, c0 + 0.004, c1 - 0.004, fijo + off - e / 2, fijo + off + e / 2, m)
    : caja(g, fijo + off - e / 2, fijo + off + e / 2, c0 + 0.004, c1 - 0.004, b0 + 0.004, b1 - 0.004, m));
  for (let a = a0; a < a1 - 0.01; a += 1.22) {
    const b = Math.min(a + 1.22, a1);
    const v = vanos.filter(v => v[0] < b && v[1] > a);
    if (!v.length) { placa(a, b, y0, y1); continue; }
    let cursor = a;
    for (const [v0, v1, s0, s1] of v) {
      if (v0 > cursor) placa(cursor, Math.min(v0, b), y0, y1);
      const c0 = Math.max(a, v0), c1 = Math.min(b, v1);
      if (s0 > y0 + 0.05) placa(c0, c1, y0, s0);
      placa(c0, c1, s1, y1);
      cursor = Math.min(v1, b);
    }
    if (cursor < b - 0.01) placa(cursor, b, y0, y1);
  }
  return out;
}
const gTabla = grupo("tablaroca"), gDurock = grupo("durock"), gDeck = grupo("deck"), gTriplay = grupo("triplay");
{
  const tr = [], du = [];
  for (const [eje, fijo, a0, a1, vanos, lado] of MUROS3) {
    tr.push(...hojas(gTabla, eje, fijo, a0 + 0.06, a1 - 0.06, A.y0, A.y1, vanos, -lado * 0.052, 0.0127, M.tablaroca));
    du.push(...hojas(gDurock, eje, fijo, a0 - 0.06, a1 + 0.06, A.y0, A.y1 + 0.35, vanos, lado * 0.055, 0.0127, M.durock));
  }
  secuencia(tr, "desliza", ...TL.tablaroca, 5, o => o.position.x + o.position.z, { dy: 0.6 });
  secuencia(du, "desliza", ...TL.durock, 5, o => o.position.x - o.position.z * 0.5, { dy: 0.8 });
}
{
  // deck metálico en láminas de 0.915 m, costillas en el sentido corto, apoyado en los polines
  const onda = 0.305, altoD = 0.064, ancho = 0.915, largo = A.z1 - A.z0 + 0.3;
  const forma = new THREE.Shape();
  forma.moveTo(0, 0);
  for (let x = 0; x < ancho - 1e-6; x += onda) { forma.lineTo(x + 0.06, 0); forma.lineTo(x + 0.1, altoD); forma.lineTo(x + 0.2, altoD); forma.lineTo(x + 0.24, 0); forma.lineTo(Math.min(x + onda, ancho), 0); }
  forma.lineTo(ancho, -0.003); forma.lineTo(0, -0.003); forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, { depth: largo, bevelEnabled: false });
  geo.translate(0, 0, -largo);
  const laminas = [];
  for (let x = A.x0 - 0.15; x < A.x1 + 0.1; x += ancho) {
    const d = new THREE.Mesh(geo, M.deck); d.position.set(x, A.y1 + 0.39, A.z1 + 0.15);
    d.castShadow = d.receiveShadow = true; d.userData.m0 = M.deck; gDeck.add(d); laminas.push(d);
  }
  secuencia(laminas, "desliza", ...TL.deck, 6, o => o.position.x, { dz: -6 });
  // triplay 1.22 x 2.44 sobre el deck, cuatrapeado
  const tri = [], y = A.y1 + 0.39 + altoD;
  for (let fila = 0, z = A.z1 + 0.15; z > A.z0 - 0.15 + 0.01; z -= 1.22, fila++)
    for (let x = A.x0 - 0.15 - (fila % 2) * 1.22; x < A.x1 + 0.15; x += 2.44) {
      const xa = Math.max(x, A.x0 - 0.15), xb = Math.min(x + 2.44, A.x1 + 0.15), zb = Math.max(z - 1.22, A.z0 - 0.15);
      if (xb - xa > 0.05) tri.push(caja(gTriplay, xa + 0.004, xb - 0.004, y, y + 0.018, zb + 0.004, z - 0.004, M.triplay));
    }
  secuencia(tri, "cae", ...TL.triplay, 5, o => o.position.x - o.position.z * 3);
}
{
  const g = grupo("ampliacion"), e = 0.07, y0 = A.y0, y1 = A.y1 + 0.5;
  const env = [
    ...muro(g, "x", A.z1 + 0.09, A.x0 - 0.09, A.x1 + 0.09, y0, y1, e, VANOS3["x:0"], M.blanco, false),
    ...muro(g, "x", A.z0 - 0.09, A.x0 - 0.09, A.x1 + 0.09, y0, y1, e, VANOS3["x:-5"], M.blanco, false),
    ...muro(g, "z", A.x1 + 0.09, A.z0 - 0.09, A.z1 + 0.09, y0, y1, e, VANOS3["z:6"], M.blanco, false),
    ...muro(g, "z", A.x0 - 0.09, A.z0 - 0.09, A.z1 + 0.09, y0, y1, e, VANOS3["z:-6"], M.blanco, false),
  ];
  secuencia(env, "aparece", ...TL.pintura, 4, o => o.position.x - o.position.z);
  const rem = [caja(g, A.x0 - 0.16, A.x1 + 0.16, y1 - 0.02, y1 + 0.1, A.z0 - 0.16, A.z1 + 0.16, M.grisOscuro), caja(g, A.x0 - 0.1, A.x1 + 0.1, A.y1 + 0.47, y1 - 0.02, A.z0 - 0.1, A.z1 + 0.1, M.grisOscuro)];
  const por = (a, b) => porcelanato("#d6d3cc", "#b6b2aa", a, b, [1.2, 0.6], 1);
  rem.push(texturizada(g, A.x1 + 0.13, A.x1 + 0.16, y0, y1 - 0.02, A.z0 - 0.12, A.z1 + 0.12, por));
  rem.push(texturizada(g, 3.6, A.x1 + 0.16, y0, y1 - 0.02, A.z1 + 0.13, A.z1 + 0.16, por));
  secuencia(rem, "desliza", TL.pintura[1] - 6, TL.pintura[1] + 4, 6, null, { dy: 0.6 });
  const luz = grupo("luces3");
  const v = [
    ...ventana(g, "x", A.z1 + 0.09, -5.4, -2.6, y0 + 0.9, y0 + 2.2, { divisiones: 2, luz }),
    ...ventana(g, "x", A.z1 + 0.09, -1.4, 3.4, y0, y0 + 2.4, { divisiones: 4, luz }),
    ...ventana(g, "x", A.z1 + 0.17, 4.0, 5.4, y0 + 0.9, y0 + 2.2, { divisiones: 2, luz }),
    ...ventana(g, "z", A.x1 + 0.16, -3.6, -1.4, y0 + 0.9, y0 + 2.2, { luz }),
    ...ventana(g, "z", A.x0 - 0.09, -3.6, -1.4, y0 + 0.9, y0 + 2.2, { cara: -1, luz }),
    ...ventana(g, "x", A.z0 - 0.09, -4.6, -2.6, y0 + 0.9, y0 + 2.2, { cara: -1, luz }),
    ...ventana(g, "x", A.z0 - 0.09, 1.0, 3.0, y0 + 0.9, y0 + 2.2, { cara: -1, luz }),
  ];
  secuencia(v, "crece", ...TL.ventanas3, 5, o => o.position.x);
  for (const x of [-4.0, -0.6, 1.0, 2.6]) downlight(luz, x, y0 + 2.62, A.z1 + 0.3);
  for (const o of luz.children) anima(o, "aparece", TL.terraza[1] - 6, TL.terraza[1]);
}
{
  const g = grupo("terraza"), y = NIV[2];
  const piso = texturizada(g, XMIN + 0.18, XMAX - 0.18, y, y + 0.03, A.z1 + 0.16, ZMAX - 0.18, (a, b) => porcelanato("#cbc4b7", "#a59e93", a, b, [0.6, 0.6]));
  anima(piso, "aparece", TL.terraza[0], TL.terraza[0] + 6);
  const bar = [...barandalVidrio(g, "x", ZMAX - 0.09, XMIN + 0.1, XMAX - 0.1, y + 0.6, 0.5),
    ...barandalVidrio(g, "z", XMIN + 0.09, A.z1 + 0.2, ZMAX - 0.1, y + 0.6, 0.5), ...barandalVidrio(g, "z", XMAX - 0.09, A.z1 + 0.2, ZMAX - 0.1, y + 0.6, 0.5)];
  secuencia(bar, "crece", TL.terraza[0] + 2, TL.terraza[0] + 10, 6);
  // pérgola sobre ejes (-6,5) y (-2,5), anclada a la ampliación en z = 0
  const yp = y + 2.75, per = [];
  for (const [x, z] of [[-5.85, 4.75], [-2.15, 4.75]]) per.push(caja(g, x - 0.06, x + 0.06, y, yp, z - 0.06, z + 0.06, M.antracita));
  per.push(caja(g, -5.95, -2.0, yp - 0.22, yp, 4.69, 4.81, M.antracita), caja(g, -5.95, -2.0, yp - 0.22, yp, 0.2, 0.32, M.antracita), caja(g, -5.91, -5.79, yp - 0.22, yp, 0.2, 4.81, M.antracita), caja(g, -2.14, -2.02, yp - 0.22, yp, 0.2, 4.81, M.antracita));
  for (let x = -5.75; x <= -2.2; x += 0.28) per.push(caja(g, x, x + 0.07, yp, yp + 0.14, 0.2, 4.95, M.madera));
  secuencia(per, "cae", TL.terraza[0] + 4, TL.terraza[1] - 2, 4, o => o.position.x);
  for (const [x, z] of [[-4.6, 1.6], [-3.2, 1.6], [-4.6, 3.4], [-3.2, 3.4]]) anima(downlight(g, x, yp - 0.22, z), "aparece", TL.terraza[1] - 6, TL.terraza[1]);
  // área de asador: barra de porcelanato gris oscuro con asador empotrado, tarja y bancos
  const gris = (a, b) => porcelanato("#3f444a", "#2b2e32", a, b, [0.6, 0.6]);
  const asa = [texturizada(g, 5.15, 5.85, y, y + 0.92, 1.2, 4.4, gris),
    caja(g, 5.1, 5.9, y + 0.92, y + 0.96, 1.15, 4.45, M.cubierta),
    caja(g, 5.25, 5.75, y + 0.96, y + 1.12, 1.5, 2.6, M.acero),
    caja(g, 5.3, 5.7, y + 1.12, y + 1.16, 1.55, 2.55, M.antracita),
    caja(g, 5.3, 5.7, y + 0.93, y + 0.97, 3.4, 3.9, M.acero)];
  for (const z of [1.9, 2.9, 3.9]) asa.push(caja(g, 4.45, 4.75, y, y + 0.75, z - 0.15, z + 0.15, M.antracita));
  asa.push(caja(g, 1.4, 3.4, y + 0.72, y + 0.76, 2.0, 3.0, M.madera), caja(g, 2.3, 2.5, y, y + 0.72, 2.4, 2.6, M.antracita));
  for (const cx of [1.8, 3.0]) for (const cz of [1.65, 3.35]) asa.push(caja(g, cx - 0.2, cx + 0.2, y, y + 0.45, cz - 0.2, cz + 0.2, M.antracita));
  asa.push(caja(g, -5.5, -3.3, y, y + 0.4, 1.0, 1.8, M.tela), caja(g, -5.5, -3.3, y + 0.4, y + 0.75, 1.0, 1.2, M.tela), caja(g, -4.9, -3.9, y, y + 0.32, 2.4, 3.2, M.madera));
  for (const [x, z] of [[-5.6, 4.5], [0.0, 4.6]]) {
    asa.push(caja(g, x - 0.25, x + 0.25, y, y + 0.5, z - 0.25, z + 0.25, M.maceta));
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), M.planta); p.position.set(x, y + 0.95, z); p.scale.y = 1.35; p.castShadow = true; g.add(p); asa.push(p);
  }
  secuencia(asa, "cae", TL.terraza[0] + 6, TL.terraza[1], 5);
}

/* =====================================================================
   PLANO ARQUITECTÓNICO dorado (de los muros de planta baja), sobre la plataforma
   ===================================================================== */
{
  const pts = [], muebles = [];
  const seg = (arr, x0, z0, x1, z1) => arr.push(x0, 0, z0, x1, 0, z1);
  const rect = (arr, x0, x1, z0, z1) => { seg(arr, x0, z0, x1, z0); seg(arr, x1, z0, x1, z1); seg(arr, x1, z1, x0, z1); seg(arr, x0, z1, x0, z0); };
  for (const w of vanosPlanta) {
    const t = w.grosor / 2;
    let cursor = w.a0;
    const tramo = (b0, b1) => { if (b1 - b0 > 0.01) w.eje === "x" ? rect(pts, b0, b1, w.fijo - t, w.fijo + t) : rect(pts, w.fijo - t, w.fijo + t, b0, b1); };
    for (const v of w.vanos) {
      tramo(cursor, v[0]);
      if (v[2] > 0.35) w.eje === "x" ? seg(pts, v[0], w.fijo, v[1], w.fijo) : seg(pts, w.fijo, v[0], w.fijo, v[1]);
      else {
        const r = v[1] - v[0], n = 10;
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI / 2, b = (i + 1) / n * Math.PI / 2;
          if (w.eje === "x") seg(muebles, v[0] + r * Math.cos(a), w.fijo - r * Math.sin(a), v[0] + r * Math.cos(b), w.fijo - r * Math.sin(b));
          else seg(muebles, w.fijo + r * Math.sin(a), v[0] + r * Math.cos(a), w.fijo + r * Math.sin(b), v[0] + r * Math.cos(b));
        }
        w.eje === "x" ? seg(muebles, v[0], w.fijo, v[0], w.fijo - r) : seg(muebles, w.fijo, v[0], w.fijo + r, v[0]);
      }
      cursor = v[1];
    }
    tramo(cursor, w.a1);
  }
  for (let i = 0; i <= 9; i++) { seg(muebles, -1.85, -1.25 - i * 0.28, -0.75, -1.25 - i * 0.28); seg(muebles, -0.65, -1.25 - i * 0.28, 0.45, -1.25 - i * 0.28); }
  rect(muebles, -5.8, -2.3, -4.82, -4.22); rect(muebles, -5.82, -5.22, -4.2, -2.6); rect(muebles, -4.9, -3.1, -2.7, -1.9);
  rect(muebles, -5.6, -3.2, 1.0, 1.9); rect(muebles, 2.2, 4.4, 0.6, 1.6);
  const ej = [];
  for (const x of EX) ej.push(x, 0, -6.6, x, 0, 6.6);
  for (const z of EZ) ej.push(-7.6, 0, z, 7.6, 0, z);
  const capa = (arr, m) => { const l = lineas(plano, arr, m); l.position.y = PISO + 0.01; return l; };
  const lEjes = capa(ej, lineaOroTenue), lMuros = capa(pts, lineaOro), lMuebles = capa(muebles, lineaOroTenue);
  const burbuja = new THREE.EdgesGeometry(new THREE.CircleGeometry(0.28, 20));
  const marcas = [];
  for (const x of EX) { const c = new THREE.LineSegments(burbuja, lineaOroTenue); c.rotation.x = -Math.PI / 2; c.position.set(x, PISO + 0.01, 6.9); plano.add(c); marcas.push(c); }
  for (const z of EZ) { const c = new THREE.LineSegments(burbuja, lineaOroTenue); c.rotation.x = -Math.PI / 2; c.position.set(-7.9, PISO + 0.01, z); plano.add(c); marcas.push(c); }
  const punto = new THREE.MeshBasicMaterial({ color: ORO });
  for (const x of EX) for (const z of EZ) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.3), punto); p.position.set(x, PISO + 0.02, z); plano.add(p); marcas.push(p); }
  const local = new THREE.MeshBasicMaterial({ color: 0x4a6a8c, transparent: true, opacity: 0.18, depthWrite: false });
  const locales = [];
  for (const [x0, x1, z0, z1] of [[-6, -2, 0, 5], [-6, -2, -5, 0], [-2, 0.6, -1, 5], [0.6, 6, 0, 2.5], [0.6, 6, -5, 0], [-2, 0.6, -5, -1]]) {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.36, z1 - z0 - 0.36), local); q.rotation.x = -Math.PI / 2; q.position.set((x0 + x1) / 2, PISO + 0.008, (z0 + z1) / 2); plano.add(q); locales.push(q);
  }
  const [p0, p1] = TL.plano;
  anima(lEjes, "trazo", p0, p0 + 20);
  secuencia(marcas, "crece", p0 + 6, p0 + 26, 6, o => o.position.x + o.position.z);
  anima(lMuros, "trazo", p0 + 16, p0 + 52);
  anima(lMuebles, "trazo", p0 + 40, p1 - 6);
  secuencia(locales, "aparece", p0 + 44, p1, 10);
}

/* =====================================================================
   LÍNEAS DORADAS: aristas de la casa terminada con oclusión (sin líneas ocultas)
   ===================================================================== */
const gLineas = new THREE.Group(); scene.add(gLineas);
const ocultador = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
const lineaFinal = new THREE.LineBasicMaterial({ color: ORO, transparent: true, opacity: 0 });
let lineasHechas = false;
const FINAL = ["firme", "columnas1", "trabes1", "losa1", "columnas2", "trabes2", "losa2", "muros1", "muros2", "azotea", "ventanas1", "ventanas2", "fachada", "ampliacion", "terraza"];
function construirLineas() {
  if (lineasHechas) return; lineasHechas = true;
  for (const n of FINAL) G[n].traverse(o => {
    if (!o.isMesh || o.userData.vidrio) return;
    const p = o.geometry.parameters || {};
    if (p.width !== undefined && p.width * p.height * p.depth < 0.0006) return;
    o.updateWorldMatrix(true, false);
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), lineaFinal); l.applyMatrix4(o.matrixWorld);
    const oc = new THREE.Mesh(o.geometry, ocultador); oc.applyMatrix4(o.matrixWorld);
    gLineas.add(l, oc);
  });
}

/* Fantasma: aristas de los niveles que se levantan durante los acabados */
for (const n of LEVANTE) {
  const g = G[n], aristas = new THREE.Group();
  const fuentes = g.children.filter(o => o.isMesh);
  for (const o of fuentes) {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), lineaFantasma);
    l.position.copy(o.position); l.quaternion.copy(o.quaternion); l.userData.fuente = o; aristas.add(l);
  }
  g.add(aristas); g.userData.aristas = aristas;
}

/* =====================================================================
   CÁMARA: llaves (cuadro, posición, objetivo, fov) con interpolación suave
   ===================================================================== */
const LLAVES = [
  [0, [16, 30, 25], [0, PISO, 0.5], 30],
  [130, [16, 27, 25], [0, PISO, 0.5], 29],
  [210, [22, 15, 30], [0, 0.6, 0.5], 26],
  [300, [23, 17, 32], [0, 2.4, 0.3], 26],
  [396, [24, 20, 33], [0, 3.6, 0.0], 26],
  [430, [23, 26, 30], [0, 4.6, 0.0], 29],
  [488, [21, 20, 33], [0, 3.6, 0.3], 25],
  [520, [9, 7.5, 40], [0.3, 3.8, 0.0], 21],
  [566, [11, 8.5, 40], [0.3, 3.8, 0.0], 21],
  [600, [21, 20, 28], [0.3, 4.8, -0.8], 25],
  [700, [22, 19, 29.5], [0.3, 4.6, -0.6], 25],
  [760, [25, 19, 33], [0.4, 5.0, 0.0], 26],
  [800, [0.01, 5.6, 96], [0.0, 5.3, 0.0], 11.5],
  [940, [0.01, 5.6, 96], [0.0, 5.3, 0.0], 11.5],
];
const DESPL = MOVIL ? 0 : -0.19;
function camaraEn(f) {
  let i = 0; while (i < LLAVES.length - 2 && f > LLAVES[i + 1][0]) i++;
  const a = LLAVES[i], b = LLAVES[i + 1], t = suave((f - a[0]) / (b[0] - a[0]));
  const lerp = (u, v) => u.map((x, k) => x + (v[k] - x) * t);
  const pos = lerp(a[1], b[1]), obj = lerp(a[2], b[2]);
  let fov = a[3] + (b[3] - a[3]) * t;
  if (MOVIL) fov *= 1.9;
  camara.fov = fov; camara.position.set(...pos); camara.lookAt(...obj);
  if (MOVIL) camara.setViewOffset(ANCHO, ALTO, 0, ALTO * 0.16, ANCHO, ALTO);
  else camara.setViewOffset(ANCHO, ALTO, ANCHO * DESPL, 0, ANCHO, ALTO);
  camara.updateProjectionMatrix();
}

/* =====================================================================
   CUADRO f: aplica tiempos, materiales, fantasma, desvanecido y cámara
   ===================================================================== */
for (const m of todosMats) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; m.userData.dw0 = m.depthWrite; }
const levante = f => salida((f - TL.levanta[0]) / (TL.levanta[1] - TL.levanta[0])) * (1 - suave((f - TL.baja[0]) / (TL.baja[1] - TL.baja[0])));
function aplicar(f) {
  // topografía: se dibuja de izquierda a derecha y se nivela
  {
    const [t0, t1] = TL.topo, pos = topoGeo.attributes.position, base = topoGeo.userData.base;
    const amp = 1.1 * (1 - suave((f - (t0 + 26)) / 26));
    for (let k = 0; k < pos.count; k++) {
      const x = base[k * 3], z = base[k * 3 + 2];
      pos.setY(k, amp * (Math.sin(x * 0.42 + 0.8) * 0.6 + Math.cos(z * 0.37 - 0.4) * 0.5 + Math.sin((x + z) * 0.21) * 0.4));
    }
    pos.needsUpdate = true;
    topoGeo.setDrawRange(0, Math.floor(pos.count * suave((f - t0) / 28) / 2) * 2);
    lineaTopo.opacity = 0.55 * (1 - suave((f - (t1 - 4)) / 30));
    topoLineas.visible = lineaTopo.opacity > 0.01;
    lineaOroTenue.opacity = 0.42 * suave((f - (t0 + 40)) / 20);
    estacas.forEach((e, i) => { const p = suave((f - (t0 + 18 + i * 3)) / 8) * (1 - suave((f - (t1 - 6)) / 10)); e.visible = p > 0; e.scale.y = Math.max(0.001, p); });
  }
  // piezas
  for (const { o, tipo, t0, t1, d } of anims) {
    const p = t1 > t0 ? (f - t0) / (t1 - t0) : (f >= t0 ? 1 : 0), q = salida(p);
    const b = o.userData.base;
    o.position.copy(b.p); o.scale.copy(b.s);
    o.visible = p > 0;
    if (!o.visible) continue;
    if (tipo === "sube") {
      if (o.isLineSegments) o.scale.y = Math.max(0.001, q);
      else { const hh = alto(o) || 1; o.scale.y = Math.max(0.001, q) * b.s.y; o.position.y = b.p.y - hh * b.s.y / 2 * (1 - q); }
    } else if (tipo === "cae") o.position.y = b.p.y + (1 - q) * 1.6;
    else if (tipo === "crece") o.scale.copy(b.s).multiplyScalar(Math.max(0.001, q));
    else if (tipo === "desliza") { o.position.x += (d.dx || 0) * (1 - q); o.position.y += (d.dy || 0) * (1 - q); o.position.z += (d.dz || 0) * (1 - q); }
    else if (tipo === "traza") o.scale.y = Math.max(0.001, q);
    else if (tipo === "aparece") o.scale.copy(b.s).multiplyScalar(0.7 + 0.3 * q);
    else if (tipo === "trazo") { const n = o.geometry.attributes.position.count; o.geometry.setDrawRange(0, Math.floor(n * suave(p) / 2) * 2); }
    if (o.userData.ocultaEn !== undefined && f >= o.userData.ocultaEn) o.visible = false;
  }
  // relleno: la plataforma sube del fondo de excavación al nivel de terreno y cubre las zapatas
  {
    const p = suave((f - TL.relleno[0]) / (TL.relleno[1] - TL.relleno[0]));
    topo.position.y = -PISO * p; plano.position.y = -PISO * p;
    G.excavacion.visible = p < 0.99;
    // la cimentación sigue en su lugar, ya cubierta por el relleno
    for (const n of ["armadoZap", "zapatas", "dados", "contratrabes"]) G[n].visible = f < TL.relleno[1];
  }
  // materiales: base, cambios (block → aplanado blanco) y fantasma de los niveles levantados
  casa.traverse(o => { if (o.isMesh && o.userData.m0) o.material = o.userData.m0; });
  for (const c of cambios) if (f >= c.t) c.o.material = c.m;
  const lv = levante(f), activo = lv > 0.001;
  for (const n of LEVANTE) {
    const g = G[n]; g.position.y = lv * 7.5;
    g.userData.aristas.visible = activo;
    if (activo) for (const o of g.children) if (o.isMesh) o.material = fantasma;
    for (const l of g.userData.aristas.children) { const s = l.userData.fuente; l.visible = s.visible; l.position.copy(s.position); l.scale.copy(s.scale); }
  }
  lineaFantasma.opacity = 0.45 * Math.min(1, lv * 3); fantasma.opacity = 0.06 * Math.min(1, lv * 3);
  // final: la casa se convierte en líneas doradas y luego se desvanecen para el logo
  const pf = suave((f - TL.dorado[0]) / (TL.dorado[1] - TL.dorado[0])), pl = suave((f - TL.desvanece[0]) / (TL.desvanece[1] - TL.desvanece[0]));
  if (pf > 0) construirLineas();
  gLineas.visible = pf > 0 && pl < 1;
  lineaFinal.opacity = Math.min(1, pf * 1.6) * (1 - pl);
  const k = 1 - Math.min(1, pf * 1.3);
  for (const m of todosMats) { m.opacity = m.userData.op0 * k; m.transparent = m.userData.tr0 || k < 1; m.depthWrite = m.userData.dw0 && k >= 1; }
  M.terreno.opacity = 0.62 * suave((f - (TL.topo[0] + 40)) / 20) * (1 - pf);
  casa.visible = pf < 0.999;
  lineaOroTenue.opacity *= (1 - pf);
  sombraSuelo.material.opacity = 0.32 * (1 - pf);
  camaraEn(f);
}

window.cuadro = f => { aplicar(f); usarAO ? composer.render() : renderer.render(scene, camara); return true; };
window.TOTAL = TOTAL; window.TL = TL;
window.cuadro(+params.get("f") || 740);
window.listo = true;
