/* =====================================================================
   NORTEA · Hero 3D v7 — animación cuadro por cuadro
   ---------------------------------------------------------------------
   Un solo modelo de la vivienda (referencia "opción 4" del propietario).
   Cada pieza tiene su ventana de tiempo; window.cuadro(f) deja la escena
   en el cuadro f (30 fps). El logo lo dibuja el sitio encima del video a
   partir del cuadro LOGO (cierre-*.json, 135 cuadros).

   Servicios que cuenta la animación, en orden: proyecto ejecutivo
   (topografía y plano), obra civil (cimentación, estructura, block),
   acabados (zarpeo, estuco, yeso, porcelanato, cocina, carpintería,
   plafones con luz indirecta), fachada, ampliación en steel framing y
   adecuación de terraza (deck, asador, porcelanato y cristal).

   Unidades: metros. Terreno natural y = 0. Frente de la casa hacia +z.
   Ejes estructurales  x: -5, -0.6, 1.6, 5   z: -5.5, -0.5, 3, 5
   ===================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const params = new URLSearchParams(location.search);
const ANCHO = +params.get("w") || window.innerWidth;
const ALTO = +params.get("h") || window.innerHeight;
const MOVIL = ALTO > ANCHO;
if (params.has("captura")) document.body.classList.add("captura");
const LOGO = 646;                 // cuadro en que el sitio empieza a trazar el logo
const TOTAL = LOGO + 135;         // 781 cuadros = 26.0 s

/* ---------- Azar con semilla: el mismo resultado en cada render ---------- */
let semilla = 20261031;
const rnd = () => { semilla |= 0; semilla = semilla + 0x6D2B79F5 | 0; let t = Math.imul(semilla ^ semilla >>> 15, 1 | semilla); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ---------- Render ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(+params.get("dpr") || 1);
renderer.setSize(ANCHO, ALTO);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.42;
const camara = new THREE.PerspectiveCamera(26, ANCHO / ALTO, 0.5, 400);

// Fondo azul marino con viñeta, medido del video v5 (centro #19304b, orillas #0b1c2f)
{
  const c = document.createElement("canvas"); c.width = Math.max(2, ANCHO / 2 | 0); c.height = Math.max(2, ALTO / 2 | 0);
  const g = c.getContext("2d"), cx = c.width * (MOVIL ? 0.5 : 0.66), cy = c.height * (MOVIL ? 0.3 : 0.48);
  g.fillStyle = "#0b1c2f"; g.fillRect(0, 0, c.width, c.height);
  g.save(); g.translate(cx, cy); g.scale(1, MOVIL ? 1.1 : 0.62);
  const r = c.width * (MOVIL ? 0.75 : 0.5);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, "#19304b"); gr.addColorStop(0.45, "#142a42"); gr.addColorStop(1, "rgba(11,28,47,0)");
  g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}

/* ---------- Luces ---------- */
scene.add(new THREE.HemisphereLight(0xbfcde0, 0x1a2a3c, 1.0));
const sol = new THREE.DirectionalLight(0xfff0dc, 2.1);
sol.position.set(-11, 26, 19);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 });
sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02;
scene.add(sol);
const relleno = new THREE.DirectionalLight(0xa9bede, 0.55);
relleno.position.set(20, 8, 14);
scene.add(relleno);

/* ---------- Texturas de canvas ---------- */
function lienzo(w, h, pintar, repetir = false) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  pintar(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// ruido fino para aplanados (zarpeo, estuco, pintura): variación muy suave de tono
function ruido(base, amp, grano = 1) {
  return lienzo(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000 * grano; i++) {
      const v = (rnd() - 0.5) * amp;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2 * grano, 1 + rnd() * 2 * grano);
    }
  }, true);
}
function porcelanato(base, junta, ancho, alto, pieza = [1.2, 0.6], veta = 0) {
  const cols = Math.max(1, Math.round(ancho / pieza[0])), filas = Math.max(1, Math.round(alto / pieza[1]));
  const W = Math.min(1024, 96 * cols), H = Math.min(1024, Math.max(32, Math.round(W * (filas * pieza[1]) / (cols * pieza[0]))));
  return lienzo(W, H, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30 * cols * filas * veta; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.04 + rnd() * 0.05})`; g.lineWidth = 0.6 + rnd() * 1.6;
      g.beginPath(); const x = rnd() * w, y = rnd() * h;
      g.moveTo(x, y); g.bezierCurveTo(x + 25, y + 8, x + 50, y - 12, x + 90, y + 6); g.stroke();
    }
    g.strokeStyle = junta; g.lineWidth = 1.2;
    for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * w / cols, 0); g.lineTo(i * w / cols, h); g.stroke(); }
    for (let j = 0; j <= filas; j++) { g.beginPath(); g.moveTo(0, j * h / filas); g.lineTo(w, j * h / filas); g.stroke(); }
  });
}
// piedra / mármol gris en placas de gran formato con veta
function piedra(base, veta, ancho, alto, pieza = [0.6, 1.2]) {
  const cols = Math.max(1, Math.round(ancho / pieza[0])), filas = Math.max(1, Math.round(alto / pieza[1]));
  const W = Math.min(1024, 128 * cols), H = Math.min(1024, Math.max(64, Math.round(W * (filas * pieza[1]) / (cols * pieza[0]))));
  return lienzo(W, H, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = (rnd() - 0.5) * 0.16;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 7, 1 + rnd() * 3);
    }
    for (let i = 0; i < 14 * cols; i++) {
      g.strokeStyle = veta; g.globalAlpha = 0.15 + rnd() * 0.25; g.lineWidth = 0.6 + rnd() * 1.4;
      g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (rnd() - 0.3) * 40; y += (rnd() - 0.5) * 60; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1; g.strokeStyle = "rgba(40,40,40,.45)"; g.lineWidth = 1.2;
    for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo(i * w / cols, 0); g.lineTo(i * w / cols, h); g.stroke(); }
    for (let j = 1; j < filas; j++) { g.beginPath(); g.moveTo(0, j * h / filas); g.lineTo(w, j * h / filas); g.stroke(); }
  });
}
const texMadera = lienzo(256, 256, (g, w, h) => {
  g.fillStyle = "#8f5f37"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 180; i++) {
    g.strokeStyle = `rgba(${55 + rnd() * 40 | 0},${32 + rnd() * 20 | 0},14,${0.12 + rnd() * 0.2})`;
    g.lineWidth = 1 + rnd() * 2;
    const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 4, w * .6, y - 4, w, y + 2); g.stroke();
  }
}, true);
const texBlock = lienzo(256, 256, (g, w, h) => {
  g.fillStyle = "#9b978f"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(70,68,64,.55)"; g.lineWidth = 2;
  for (let j = 0; j <= 8; j++) { g.beginPath(); g.moveTo(0, j * h / 8); g.lineTo(w, j * h / 8); g.stroke(); }
  for (let j = 0; j < 8; j++) for (let i = 0; i <= 4; i++) { const x = (i + (j % 2) * 0.5) * w / 4; g.beginPath(); g.moveTo(x, j * h / 8); g.lineTo(x, (j + 1) * h / 8); g.stroke(); }
}, true);
const texTriplay = lienzo(256, 128, (g, w, h) => {
  g.fillStyle = "#d6b98a"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(${150 + rnd() * 30 | 0},${110 + rnd() * 20 | 0},60,${0.12 + rnd() * 0.12})`;
    g.lineWidth = 1 + rnd() * 2;
    const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 3, w * .6, y - 3, w, y + 1); g.stroke();
  }
});
const texPiso = porcelanato("#cdc3b4", "rgba(96,88,76,.6)", 6, 6, [1.2, 1.2], 0.6);   // porcelanato interior 1.20 x 1.20
texPiso.wrapS = texPiso.wrapT = THREE.RepeatWrapping;
const texDeckMadera = lienzo(512, 128, (g, w, h) => {   // tablas de deck
  g.fillStyle = "#8a5a34"; g.fillRect(0, 0, w, h);
  for (let j = 0; j < 8; j++) {
    const y = j * h / 8; g.fillStyle = `rgba(${120 + rnd() * 40 | 0},${76 + rnd() * 20 | 0},40,0.55)`; g.fillRect(0, y + 1, w, h / 8 - 2);
    for (let i = 0; i < 18; i++) { g.strokeStyle = "rgba(60,35,15,.25)"; g.beginPath(); const yy = y + rnd() * h / 8; g.moveTo(0, yy); g.lineTo(w, yy + rnd() * 2); g.stroke(); }
    g.fillStyle = "rgba(30,18,8,.6)"; g.fillRect(0, y, w, 1.5);
  }
}, true);
// hoja y brizna con transparencia para vegetación
const texHoja = lienzo(64, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, "#c8d8b8"); gr.addColorStop(0.5, "#ffffff"); gr.addColorStop(1, "#b8caa6");
  g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 2);
  g.bezierCurveTo(w * 0.98, h * 0.3, w * 0.9, h * 0.75, w / 2, h - 2);
  g.bezierCurveTo(w * 0.1, h * 0.75, w * 0.02, h * 0.3, w / 2, 2); g.fill();
  g.strokeStyle = "rgba(90,110,70,.45)"; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 8); g.lineTo(w / 2, h - 6); g.stroke();
});
const texBrizna = lienzo(32, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "#9fb08c"); gr.addColorStop(1, "#ffffff");
  g.fillStyle = gr; g.beginPath(); g.moveTo(w * 0.15, h); g.quadraticCurveTo(w * 0.35, h * 0.4, w * 0.5, 0); g.quadraticCurveTo(w * 0.65, h * 0.4, w * 0.85, h); g.fill();
});

/* ---------- Materiales ---------- */
const todosMats = new Set();
const mat = o => { const m = new THREE.MeshStandardMaterial(o); todosMats.add(m); return m; };
const M = {
  concreto: mat({ color: 0xc9c0b0, roughness: 0.92 }),
  concretoFresco: mat({ color: 0xa8a196, roughness: 0.85 }),
  excavacion: mat({ color: 0x0d1c2c, roughness: 1, transparent: true, opacity: 0.85 }),
  block: mat({ color: 0xffffff, map: texBlock, roughness: 0.95 }),
  zarpeo: mat({ color: 0xffffff, map: ruido("#8f8a82", 0.22, 1.6), roughness: 1 }),
  estuco: mat({ color: 0xffffff, map: ruido("#e2ddd3", 0.07, 1), roughness: 0.92 }),
  pintura: mat({ color: 0xffffff, map: ruido("#f3f2ee", 0.035, 0.8), roughness: 0.8 }),
  yeso: mat({ color: 0xf7f7f4, roughness: 0.9 }),
  grisOscuro: mat({ color: 0x34383d, roughness: 0.5 }),
  antracita: mat({ color: 0x1d2024, roughness: 0.42, metalness: 0.55 }),
  vidrio: mat({ color: 0x172330, roughness: 0.03, metalness: 0.8, transparent: true, opacity: 0.6 }),
  vidrioBarandal: mat({ color: 0xa9cadb, roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.2, depthWrite: false }),
  calido: mat({ color: 0x1a1008, emissive: 0xffcf94, emissiveIntensity: 0.75, roughness: 1 }),
  led: mat({ color: 0xffe2b0, emissive: 0xffd08a, emissiveIntensity: 2.4 }),
  ledTira: mat({ color: 0xffe9c4, emissive: 0xffc77a, emissiveIntensity: 1.8 }),
  madera: mat({ color: 0xffffff, map: texMadera, roughness: 0.55 }),
  maderaPuerta: mat({ color: 0xe8b789, map: texMadera, roughness: 0.42 }),
  deckMadera: mat({ color: 0xffffff, map: texDeckMadera, roughness: 0.6 }),
  galvanizado: mat({ color: 0xc3c9cf, roughness: 0.32, metalness: 0.82 }),
  tablaroca: mat({ color: 0xebeae5, roughness: 0.95 }),
  triplay: mat({ color: 0xffffff, map: texTriplay, roughness: 0.85 }),
  membrana: mat({ color: 0x15171a, roughness: 0.55, metalness: 0.1 }),
  durock: mat({ color: 0xaaa79f, roughness: 0.95 }),
  basecoat: mat({ color: 0xffffff, map: ruido("#f2f1ec", 0.04, 0.8), roughness: 0.82 }),
  impermeable: mat({ color: 0x4a4e53, roughness: 0.75 }),
  deck: mat({ color: 0xaab0b6, roughness: 0.35, metalness: 0.75, side: THREE.DoubleSide }),
  cocina: mat({ color: 0x2c3035, roughness: 0.45 }),
  cocinaMadera: mat({ color: 0xd8b088, map: texMadera, roughness: 0.5 }),
  cubierta: mat({ color: 0xece9e2, roughness: 0.22 }),
  piso: mat({ color: 0xffffff, map: texPiso, roughness: 0.3 }),
  tela: mat({ color: 0xb9ab98, roughness: 0.95 }),
  telaOscura: mat({ color: 0x59595a, roughness: 0.95 }),
  maceta: mat({ color: 0x4b4e52, roughness: 0.7 }),
  tierra: mat({ color: 0x3a2e24, roughness: 1 }),
  acero: mat({ color: 0x8f959b, roughness: 0.25, metalness: 0.9 }),
  corteza: mat({ color: 0x5b4d40, roughness: 0.95 }),
  hoja: mat({ color: 0xffffff, map: texHoja, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }),
  brizna: mat({ color: 0xffffff, map: texBrizna, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
  terreno: mat({ color: 0x173352, roughness: 1, transparent: true, opacity: 0.0, depthWrite: false }),
};
const sombraHoja = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texHoja, alphaTest: 0.45 });
const sombraBrizna = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texBrizna, alphaTest: 0.4 });
const fantasma = new THREE.MeshBasicMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.06, depthWrite: false });
const lineaFantasma = new THREE.LineBasicMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.45 });
const ORO = 0xd2a955;
const lineaOro = new THREE.LineBasicMaterial({ color: ORO, transparent: true });
const lineaOroTenue = new THREE.LineBasicMaterial({ color: ORO, transparent: true, opacity: 0.4 });
const lineaVarilla = new THREE.LineBasicMaterial({ color: 0xc8933f });
const lineaTopo = new THREE.LineBasicMaterial({ color: 0xb6c9de, transparent: true, opacity: 0.78 });

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
  const n = l.length, paso = n > 1 ? Math.max(0, t1 - t0 - dur) / (n - 1) : 0;
  l.forEach((o, i) => anima(o, tipo, t0 + i * paso, t0 + i * paso + dur, d));
}
function cambia(o, t, m) { cambios.push({ o, t, m }); }
const alto = o => o.geometry?.parameters?.height ?? 0;
const angulo = o => (Math.atan2(o.position.z, o.position.x) + Math.PI) / (2 * Math.PI);   // 0..1 alrededor de la casa

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
  return caja(g, x0, x1, y0, y1, z0, z1, mat({ map: textura(Math.max(dx, dz), horizontal ? Math.min(dx, dz) : dy), roughness: 0.45, ...opts }));
}
// segmentos de línea; la geometría arranca en y = 0 local para poder "subir" desde su base
function lineas(g, pts, m) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  geo.computeBoundingBox(); const y0 = geo.boundingBox.min.y; geo.translate(0, -y0, 0);
  const l = new THREE.LineSegments(geo, m); l.position.y = y0; g.add(l); return l;
}

/* ---------- Geometría base ---------- */
const EX = [-5, -0.6, 1.6, 5], EZ = [-5.5, -0.5, 3, 5];
const COL = [[-5, -5.5], [-0.6, -5.5], [1.6, -5.5], [5, -5.5], [-5, -0.5], [-0.6, -0.5], [1.6, -0.5], [5, -0.5], [1.6, 3], [5, 3], [-5, 5], [-0.6, 5], [1.6, 5]];
const T = 0.36, h = T / 2;
const NIV = [0.45, 3.75, 7.05];
const LOSA = 0.3, ALT = 3.0;
const XMIN = -5 - h, XMAX = 5 + h, ZMIN = -5.5 - h, ZMAX = 5 + h;
const PISO = -1.2;                         // fondo de excavación (desplante de zapatas)
const HUECO = { x0: -0.6, x1: 1.6, z0: -5.5, z1: -1.5 };   // cubo de escalera

/* Muros de block con caras independientes: exterior (zarpeo → estuco → pintura) e interior (yeso).
   Los vanos se dejan desde el arranque (nunca se perforan después). */
const vanosPlanta = [], murosBlock = [];
const cacheCaras = new Map();
function caras(eje, ext, mExt, mInt) {
  const k = eje + ext + mExt.uuid + mInt.uuid;
  let a = cacheCaras.get(k);
  if (!a) {
    a = ext === 0 ? [mInt, mInt, mInt, mInt, mInt, mInt] : [mExt, mExt, mExt, mExt, mExt, mExt];
    if (ext === 1 || ext === -1) { if (eje === "x") a[ext > 0 ? 5 : 4] = mInt; else a[ext > 0 ? 1 : 0] = mInt; }
    cacheCaras.set(k, a);
  }
  return a;
}
function muro(g, eje, fijo, a0, a1, y0, y1, grosor, vanos, { ext = 0, m = null, plano = true } = {}) {
  const piezas = [];
  const add = (b0, b1, c0, c1) => { if (b1 - b0 > 0.01 && c1 - c0 > 0.01) piezas.push([b0, b1, c0, c1]); };
  const vs = [...vanos].sort((p, q) => p[0] - q[0]);
  let cursor = a0;
  for (const [v0, v1, s0, s1] of vs) { add(cursor, v0, y0, y1); add(v0, v1, y0, s0); add(v0, v1, s1, y1); cursor = v1; }
  add(cursor, a1, y0, y1);
  const mallas = piezas.map(([b0, b1, c0, c1]) => {
    const o = eje === "x" ? caja(g, b0, b1, c0, c1, fijo - grosor / 2, fijo + grosor / 2, m || M.block)
      : caja(g, fijo - grosor / 2, fijo + grosor / 2, c0, c1, b0, b1, m || M.block);
    if (!m) {   // block a escala (piezas de 40 x 20) en su propio material
      const bm = M.block.clone(); todosMats.add(bm);
      bm.map = texBlock.clone(); bm.map.needsUpdate = true; bm.map.repeat.set((b1 - b0) / 1.6, (c1 - c0) / 1.6);
      o.userData.muro = { eje, ext, blk: bm };
      o.material = o.userData.m0 = caras(eje, ext, bm, bm);
      murosBlock.push(o);
    }
    return o;
  });
  if (plano && y0 < 1 && y1 > 1) vanosPlanta.push({ eje, fijo, a0, a1, grosor, vanos: vs.filter(v => v[2] < 1.2) });
  return mallas;
}
/* Ventana: marco antracita, cristal y resplandor cálido interior.
   cara = 1: el interior queda hacia -z / -x; cara = -1: hacia +z / +x. Devuelve sus piezas. */
function ventana(g, eje, fijo, a0, a1, y0, y1, { divisiones = 0, cara = 1, luz = null } = {}) {
  const f = 0.055, prof = 0.12, enX = eje === "x", piezas = [];
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
    const r = enX ? caja(luz, a0 + 0.1, a1 - 0.1, y0 + 0.05, y1 - 0.12, fijo + d - 0.005, fijo + d + 0.005, M.calido, false)
      : caja(luz, fijo + d - 0.005, fijo + d + 0.005, y0 + 0.05, y1 - 0.12, a0 + 0.1, a1 - 0.1, M.calido, false);
    r.userData.luz = true; r.userData.sinLinea = true;
  }
  return piezas;
}
function barandalVidrio(g, eje, fijo, a0, a1, y0, altoB = 1.0) {
  const enX = eje === "x", p = [];
  const v = enX ? caja(g, a0, a1, y0, y0 + altoB, fijo - 0.012, fijo + 0.012, M.vidrioBarandal, false)
    : caja(g, fijo - 0.012, fijo + 0.012, y0, y0 + altoB, a0, a1, M.vidrioBarandal, false);
  v.userData.vidrio = true; p.push(v);
  p.push(enX ? caja(g, a0, a1, y0 + altoB, y0 + altoB + 0.035, fijo - 0.025, fijo + 0.025, M.antracita, false)
    : caja(g, fijo - 0.025, fijo + 0.025, y0 + altoB, y0 + altoB + 0.035, a0, a1, M.antracita, false));
  p.push(enX ? caja(g, a0, a1, y0, y0 + 0.05, fijo - 0.035, fijo + 0.035, M.antracita, false)
    : caja(g, fijo - 0.035, fijo + 0.035, y0, y0 + 0.05, a0, a1, M.antracita, false));
  return p;
}
function lamas(g, x0, x1, y0, y1, z, paso = 0.16, ancho = 0.06, prof = 0.18) {
  const p = [];
  for (let x = x0; x + ancho <= x1 + 1e-6; x += paso) p.push(caja(g, x, x + ancho, y0, y1, z, z + prof, M.madera));
  return p;
}
function downlight(g, x, y, z) { const o = caja(g, x - 0.07, x + 0.07, y - 0.012, y, z - 0.07, z + 0.07, M.led, false); o.userData.luz = true; o.userData.sinLinea = true; return o; }

/* ---------- Vegetación: hojas y briznas con transparencia (instanciadas) ---------- */
function follaje(g, x, y, z, centros, nHojas, tam, color) {
  const geo = new THREE.PlaneGeometry(tam * 0.5, tam);
  const im = new THREE.InstancedMesh(geo, M.hoja, nHojas);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color(), base = new THREE.Color(color);
  for (let i = 0; i < nHojas; i++) {
    const k = centros[i % centros.length];
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.cbrt(0.3 + 0.7 * rnd()), sq = Math.sqrt(1 - u * u);
    p.set(k[0] + k[3] * r * sq * Math.cos(th), k[1] + k[4] * r * u, k[2] + k[5] * r * sq * Math.sin(th));
    e.set(rnd() * Math.PI, rnd() * Math.PI * 2, rnd() * Math.PI); q.setFromEuler(e);
    const sc = 0.7 + rnd() * 0.6; s.set(sc, sc, sc);
    m4.compose(p, q, s); im.setMatrixAt(i, m4);
    c.copy(base).offsetHSL((rnd() - 0.5) * 0.035, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.1 + u * 0.06); im.setColorAt(i, c);
  }
  im.position.set(x, y, z); im.castShadow = true; im.receiveShadow = true; im.customDepthMaterial = sombraHoja;
  im.userData.sinLinea = true; g.add(im); return im;
}
function arbol(g, x, z, altoA = 3.4, copa = 1.0, color = 0x4f7a3a) {
  const t = new THREE.Group(); t.position.set(x, 0, z); g.add(t); t.userData.sinLinea = true;
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, altoA * 0.66, 8), M.corteza);
  tronco.position.y = altoA * 0.33; tronco.castShadow = true; t.add(tronco);
  for (const [ang, inc, l] of [[0.3, 0.55, 0.9], [2.4, 0.6, 0.8], [4.3, 0.5, 0.85]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, l, 6), M.corteza);
    r.position.set(Math.cos(ang) * l * 0.25, altoA * 0.58, Math.sin(ang) * l * 0.25);
    r.rotation.set(Math.sin(ang) * inc, 0, -Math.cos(ang) * inc); r.castShadow = true; t.add(r);
  }
  follaje(t, 0, 0, 0, [[0, altoA * 0.74, 0, copa * 0.7, copa * 0.5, copa * 0.7], [copa * 0.55, altoA * 0.64, copa * 0.2, copa * 0.45, copa * 0.38, copa * 0.45],
    [-copa * 0.5, altoA * 0.68, -copa * 0.25, copa * 0.5, copa * 0.4, copa * 0.5], [copa * 0.15, altoA * 0.88, -copa * 0.1, copa * 0.5, copa * 0.38, copa * 0.5],
    [-copa * 0.25, altoA * 0.97, copa * 0.2, copa * 0.35, copa * 0.3, copa * 0.35], [copa * 0.35, altoA * 0.8, -copa * 0.5, copa * 0.4, copa * 0.32, copa * 0.4]], 1900, 0.14, color);
  return t;
}
function briznas(g, x, y, z, { n = 40, altoB = 0.6, ancho = 0.05, abre = 0.45, color = 0x6e8f4a, agave = false } = {}) {
  const geo = new THREE.PlaneGeometry(ancho, altoB); geo.translate(0, altoB / 2, 0);
  const im = new THREE.InstancedMesh(geo, M.brizna, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, "YXZ"), s = new THREE.Vector3(), c = new THREE.Color(), base = new THREE.Color(color), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const ry = rnd() * Math.PI * 2, inc = (agave ? 0.55 : 0.1) + rnd() * abre;
    e.set(inc, ry, 0); q.setFromEuler(e);
    const sc = 0.65 + rnd() * 0.5; s.set(agave ? 1.6 : 1, sc, 1);
    p.set((rnd() - 0.5) * 0.08, 0, (rnd() - 0.5) * 0.08);
    m4.compose(p, q, s); im.setMatrixAt(i, m4);
    c.copy(base).offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.12); im.setColorAt(i, c);
  }
  im.position.set(x, y, z); im.castShadow = true; im.receiveShadow = true; im.customDepthMaterial = sombraBrizna;
  im.userData.sinLinea = true; g.add(im); return im;
}
function arbusto(g, x, y, z, r = 0.35, color = 0x4c7438) { return follaje(g, x, y + r * 0.75, z, [[0, 0, 0, r, r * 0.75, r]], Math.round(500 * r / 0.35), 0.11, color); }
function maceta(g, x, y, z, r = 0.28, altoM = 0.55) {
  const p = [caja(g, x - r, x + r, y, y + altoM, z - r, z + r, M.maceta), caja(g, x - r + 0.03, x + r - 0.03, y + altoM - 0.04, y + altoM - 0.02, z - r + 0.03, z + r - 0.03, M.tierra, false)];
  p.forEach(o => { o.userData.sinLinea = true; });
  return p;
}

/* =====================================================================
   TIEMPOS (cuadros a 30 fps)
   ===================================================================== */
const TL = {
  topo: [0, 40], plano: [36, 86],
  excavacion: [84, 94], armadoZap: [90, 102], zapatas: [96, 110], dados: [104, 116], contratrabes: [110, 124], relleno: [122, 134], firme: [130, 142],
  armado1: [140, 150], columnas1: [144, 160], trabes1: [158, 170], losa1: [168, 180],
  muros1: [178, 200],
  armado2: [198, 206], columnas2: [202, 216], trabes2: [214, 226],
  losa2: [224, 236], banda: [232, 242],
  muros2: [240, 262],
  zarpeo: [262, 276], estuco: [272, 286],
  corte1: [286, 298],
  yeso1: [294, 304], piso1: [300, 310], cajillos1: [306, 316], cocina: [310, 322], carpinteria1: [316, 326], muebles1: [320, 330], luz1: [326, 332],
  bajaN2: [330, 342],
  yeso2: [340, 348], piso2: [344, 352], cajillos2: [348, 356], carpinteria2: [350, 358], muebles2: [352, 360], luz2: [356, 362],
  bajaAzotea: [360, 372],
  pintura: [374, 388], ventanas: [384, 398], puerta: [392, 400],
  fachada: [398, 436],
  soleras: [456, 464], montantes: [462, 474], esquinas: [470, 478], cerramientos: [474, 482], perimetral: [478, 486],
  bloqueo: [484, 490], contraviento: [488, 494], armaduras: [492, 502], polines: [500, 506], deck: [504, 512], pretil3: [510, 518],
  triplay: [514, 524], membrana: [522, 530], durock: [528, 538], basecoat: [536, 546], piedra3: [542, 550], ventanas3: [544, 552], cubierta3: [546, 552],
  corte2: [550, 558], tablaroca: [556, 564], piso3: [558, 564], cajillos3: [560, 566], bajaCubierta: [564, 574],
  terraza: [572, 602],
  dorado: [612, 640], desvanece: [638, 662],
};

/* =====================================================================
   1. TOPOGRAFÍA: malla con lomas que se dibuja y se nivela hasta la plataforma
   ===================================================================== */
const topo = grupo("topo");
const topoGeo = new THREE.BufferGeometry();
{
  const nx = 26, nz = 24, w = 24, d = 22, pts = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i < nx; i++) pts.push([-w / 2 + i * w / nx, 0, -d / 2 + j * d / nz, -w / 2 + (i + 1) * w / nx, 0, -d / 2 + j * d / nz]);
  for (let i = 0; i <= nx; i++) for (let j = 0; j < nz; j++) pts.push([-w / 2 + i * w / nx, 0, -d / 2 + j * d / nz, -w / 2 + i * w / nx, 0, -d / 2 + (j + 1) * d / nz]);
  pts.sort((a, b) => (a[0] + a[3]) - (b[0] + b[3]));   // se dibuja de izquierda a derecha
  const plano = pts.flat();
  topoGeo.setAttribute("position", new THREE.Float32BufferAttribute(plano, 3));
  topoGeo.userData.base = Float32Array.from(plano);
}
const loma = (x, z) => {   // siempre arriba de la plataforma: lomas y cañadas suaves, ninguna línea se pierde
  const n = Math.sin(x * 0.5 + 0.8) * 0.6 + Math.cos(z * 0.45 - 0.4) * 0.5 + Math.sin((x + z) * 0.27) * 0.4 + Math.sin((x - z) * 0.33) * 0.25;
  return (n + 1.75) * 0.75;
};
const topoLineas = new THREE.LineSegments(topoGeo, lineaTopo); topoLineas.position.set(0, PISO + 0.02, 0.5); topoLineas.renderOrder = 2; topo.add(topoLineas);
const placa = new THREE.Mesh(new THREE.BoxGeometry(24, 0.04, 22), M.terreno);
placa.position.set(0, PISO - 0.02, 0.5); placa.receiveShadow = true; topo.add(placa);
const marcoPlaca = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(24, 0.001, 22)), lineaOroTenue);
marcoPlaca.position.set(0, PISO + 0.001, 0.5); topo.add(marcoPlaca);
const sombraSuelo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.32, transparent: true, depthWrite: false }));
sombraSuelo.rotation.x = -Math.PI / 2; sombraSuelo.position.y = PISO + 0.003; sombraSuelo.receiveShadow = true; topo.add(sombraSuelo);
const estacas = [];
for (const [x, z] of [[-9, -7], [8, -6], [-7, 8], [9, 9], [0, -9], [-10, 2]]) { const e = lineas(topo, [x, 0, z, x, 1.1, z], lineaOro); e.position.y = PISO; estacas.push(e); }

const plano = grupo("plano");

/* =====================================================================
   3. CIMENTACIÓN: excavación, armado, zapatas, dados, contratrabes, relleno, firme
   ===================================================================== */
const gExc = grupo("excavacion"), gArmZ = grupo("armadoZap"), gZap = grupo("zapatas"), gDad = grupo("dados"), gCT = grupo("contratrabes"), gFirme = grupo("firme");
const exc = [], armZ = [], zap = [], dad = [], ct = [];
const ZAPATAS = [...COL, [5.2, 6.65]];   // + columna de piedra del volado de cochera
for (const [x, z] of ZAPATAS) {
  const r = z > 6 ? 0.5 : 0.7;
  exc.push(caja(gExc, x - r - 0.15, x + r + 0.15, PISO + 0.002, PISO + 0.012, z - r - 0.15, z + r + 0.15, M.excavacion, false));
  const parrilla = [], dado = [], arranque = [];
  for (let k = -r + 0.1; k <= r - 0.09; k += 0.2) parrilla.push(x + k, PISO + 0.1, z - r + 0.1, x + k, PISO + 0.1, z + r - 0.1, x - r + 0.1, PISO + 0.12, z + k, x + r - 0.1, PISO + 0.12, z + k);
  for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
    parrilla.push(x + dx, PISO + 0.1, z + dz, x + dx, PISO + 0.3, z + dz);
    dado.push(x + dx, PISO + 0.3, z + dz, x + dx, 0, z + dz);
    arranque.push(x + dx, 0, z + dz, x + dx, NIV[0] + 0.9, z + dz);
  }
  const a1 = lineas(gArmZ, parrilla, lineaVarilla); a1.userData.ocultaEn = TL.zapatas[1];
  const a2 = lineas(gArmZ, dado, lineaVarilla); a2.userData.ocultaEn = TL.dados[1];
  const a3 = lineas(gArmZ, arranque, lineaVarilla); a3.userData.ocultaEn = TL.armado1[0] + 4;
  armZ.push(a1, a2, a3);
  zap.push(caja(gZap, x - r, x + r, PISO, PISO + 0.3, z - r, z + r, M.concretoFresco));
  dad.push(caja(gDad, x - 0.25, x + 0.25, PISO + 0.3, 0, z - 0.25, z + 0.25, M.concretoFresco));
}
const lineaCT = [[-5, 5, -5.5, -5.5], [-5, 5, -0.5, -0.5], [1.6, 5, 3, 3], [-5, 1.6, 5, 5], [-5, -5, -5.5, 5], [-0.6, -0.6, -5.5, 5], [1.6, 1.6, -5.5, 5], [5, 5, -5.5, 3]];
for (const [x0, x1, z0, z1] of lineaCT) ct.push(caja(gCT, x0 - 0.15, x1 + 0.15, -0.5, 0, z0 - 0.15, z1 + 0.15, M.concretoFresco));
const firme = caja(gFirme, XMIN, XMAX, 0, NIV[0], ZMIN, ZMAX, M.concreto);
secuencia(exc, "aparece", ...TL.excavacion, 6, o => o.position.x + o.position.z);
secuencia(armZ, "sube", ...TL.armadoZap, 8);
secuencia(zap, "sube", ...TL.zapatas, 8, o => o.position.x - o.position.z);
secuencia(dad, "sube", ...TL.dados, 8, o => o.position.x - o.position.z);
secuencia(ct, "desliza", ...TL.contratrabes, 9, null, { dy: 1.2, funde: true });
anima(firme, "vierte", ...TL.firme);   // colado del firme en barrido

/* =====================================================================
   4. ESTRUCTURA por nivel: armado, columnas, trabes y losa (hueco de escalera)
   ===================================================================== */
const TRABES = [[-5, 5, -5.5, -5.5], [-5, 5, -0.5, -0.5], [1.6, 5, 3, 3], [-5, 5, 5, 5], [-5, -5, -5.5, 5], [-0.6, -0.6, -5.5, 5], [1.6, 1.6, -5.5, 5], [5, 5, -5.5, 5]];
function losa(g, a, b) {
  const lo = [];
  lo.push(caja(g, XMIN, HUECO.x0, a, b, ZMIN, ZMAX, M.concreto));
  lo.push(caja(g, HUECO.x1, XMAX, a, b, ZMIN, ZMAX, M.concreto));
  lo.push(caja(g, HUECO.x0, HUECO.x1, a, b, HUECO.z1, ZMAX, M.concreto));
  lo.push(caja(g, HUECO.x0, HUECO.x1, a, b, ZMIN, HUECO.z0, M.concreto));
  return lo;
}
function estructura(n) {
  const k = n + 1;
  const gA = grupo("armado" + k), gC = grupo("columnas" + k), gT = grupo("trabes" + k), gL = grupo("losa" + k);
  const y0 = NIV[n], yl = NIV[n] + ALT;
  const arm = [], col = [], tr = [];
  for (const [x, z] of COL) {
    const p = [];
    for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) p.push(x + dx, y0, z + dz, x + dx, yl + 0.4, z + dz);
    for (let y = y0 + 0.15; y < yl; y += 0.3) p.push(x - 0.13, y, z - 0.13, x + 0.13, y, z - 0.13, x + 0.13, y, z - 0.13, x + 0.13, y, z + 0.13, x + 0.13, y, z + 0.13, x - 0.13, y, z + 0.13, x - 0.13, y, z + 0.13, x - 0.13, y, z - 0.13);
    const a = lineas(gA, p, lineaVarilla); a.userData.ocultaEn = TL["columnas" + k][1] + 2; arm.push(a);
    col.push(caja(gC, x - 0.175, x + 0.175, y0, yl, z - 0.175, z + 0.175, M.concreto));
  }
  for (const [x0, x1, z0, z1] of TRABES) tr.push(caja(gT, x0 - 0.125, x1 + 0.125, yl - 0.45, yl, z0 - 0.125, z1 + 0.125, M.concreto));
  const lo = losa(gL, yl, yl + LOSA);
  secuencia(arm, "sube", ...TL["armado" + k], 8);
  secuencia(col, "sube", ...TL["columnas" + k], 10, o => o.position.x - o.position.z);
  secuencia(tr, "desliza", ...TL["trabes" + k], 9, null, { dy: 1.5, funde: true });
  secuencia(lo, "desliza", ...TL["losa" + k], 10, null, { dy: 2.0, funde: true });
}
estructura(0); estructura(1);
// Bandas gruesas de concreto (faldones) que forman el "marco" de la fachada; se aplanan y pintan con la casa
const bandas = [];
{
  const g = grupo("losa1");
  const b = caja(g, XMIN, -1.1, 3.25, NIV[1] + 0.15, 4.84, 5.5, M.concreto);                   // banda blanca bajo el balcón
  bandas.push(b); anima(b, "desliza", TL.losa1[1] - 8, TL.losa1[1], { dy: 2.0, funde: true });
}
{
  const g = grupo("banda");
  bandas.push(caja(g, XMIN - 0.02, XMAX + 0.02, NIV[2] - 0.45, NIV[2] + 0.5, 4.9, 5.5, M.concreto));   // remate grueso del 2º nivel (frente)
  bandas.push(caja(g, XMIN - 0.02, XMIN + 0.3, NIV[2] - 0.45, NIV[2] + 0.5, -0.5, 4.9, M.concreto));   // costado izquierdo de la terraza
  bandas.push(caja(g, XMAX - 0.3, XMAX + 0.02, NIV[2] - 0.45, NIV[2] + 0.5, -0.5, 4.9, M.concreto));   // costado derecho de la terraza
  secuencia(G.banda.children.slice(), "sube", ...TL.banda, 8);
}
function escalera(g, y0, y1) {
  const n = 9, sube = (y1 - y0) / (2 * n), huella = 0.3, p = [];
  const descanso = y0 + sube * n, xa = HUECO.x0 + 0.08, xm = (HUECO.x0 + HUECO.x1) / 2, xb = HUECO.x1 - 0.08;
  for (let i = 0; i < n; i++) { const z1 = HUECO.z1 - 0.05 - i * huella; p.push(caja(g, xa, xm - 0.05, y0, y0 + sube * (i + 1), z1 - huella, z1, M.concreto)); }
  p.push(caja(g, xa, xb, y0, descanso, HUECO.z0 + 0.05, HUECO.z1 - 0.05 - n * huella, M.concreto));
  for (let i = 0; i < n; i++) { const z0 = HUECO.z1 - 0.05 - n * huella + i * huella; p.push(caja(g, xm + 0.05, xb, descanso, descanso + sube * (i + 1), z0, z0 + huella, M.concreto)); }
  return p;
}
const esc1 = escalera(grupo("escalera1"), NIV[0], NIV[1]), esc2 = escalera(grupo("escalera2"), NIV[1], NIV[2]);
secuencia(esc1, "sube", TL.trabes1[0], TL.losa1[0], 5);
secuencia(esc2, "sube", TL.trabes2[0], TL.losa2[0], 5);

/* =====================================================================
   5. MUROS (block) con los vanos del diseño desde el arranque
   ===================================================================== */
{
  const g = grupo("muros1"), y0 = NIV[0], y1 = NIV[0] + ALT;
  const m = (...a) => muro(g, ...a);
  m("x", 5, -5, -0.6, y0, y1, T, [[-4.33, -1.63, 0.6, 2.95]], { ext: 1 });          // sala: ventanal
  m("x", 5, -0.6, 1.6, y0, y1, T, [[-0.05, 1.1, y0, 3.0]], { ext: 1 });             // acceso: puerta alta
  m("x", 3, 1.6, 5, y0, y1, 0.2, [[1.95, 2.85, y0, 2.95], [3.1, 4.85, y0, 2.95]], { ext: 1 });   // comedor remetido (cochera al frente)
  m("z", 5, -5.5, 3, y0, y1, T, [[-3.6, -1.6, 1.2, 2.5]], { ext: 1 });
  m("z", -5, -5.5, 5, y0, y1, T, [[-4.0, -2.2, 1.2, 2.5], [1.6, 3.8, 0.6, 2.95]], { ext: -1 });
  m("x", -5.5, -5, 5, y0, y1, T, [[-4.0, -1.6, 1.2, 2.5], [2.4, 4.2, 1.2, 2.5]], { ext: -1 });
  m("z", -0.6, -5.5, HUECO.z1, y0, y1, 0.15, []);                                       // cocina ↔ escalera
  m("z", 1.6, -5.5, -0.5, y0, y1, 0.15, []);                                           // escalera ↔ servicio
  m("x", -0.5, 1.6, 5, y0, y1, 0.15, [[2.4, 3.3, y0, 2.6]]);                           // comedor ↔ servicio
}
{
  const g = grupo("muros2"), y0 = NIV[1], y1 = NIV[1] + ALT;
  const m = (...a) => muro(g, ...a);
  m("x", 3.6, -4.85, -0.6, y0, y1, 0.2, [[-4.6, -0.9, y0, 6.45]], { ext: 1 });       // recámara con balcón (remetida)
  m("z", -5, 3.6, 5, y0, y1, T, [], { ext: 2 });                                      // aleta blanca del balcón (exterior por ambas caras)
  m("x", 5, -0.6, 1.6, y0, y1, T, [[-0.4, 1.35, 3.95, 6.4]], { ext: 1 });            // ventana de escalera tras las lamas
  m("x", 5, 1.6, 5, y0, y1, T, [[2.15, 3.25, 3.95, 6.4], [3.7, 4.9, 5.4, 6.2]], { ext: 1 });
  m("z", 5, -5.5, 5, y0, y1, T, [[-3.6, -1.6, 4.6, 5.9], [0.8, 1.6, 3.95, 6.4]], { ext: 1 });
  m("z", -5, -5.5, 3.6, y0, y1, T, [[-4.0, -2.2, 4.6, 5.9], [0.6, 2.6, 4.6, 5.9]], { ext: -1 });
  m("x", -5.5, -5, 5, y0, y1, T, [[-4.0, -1.6, 4.6, 5.9], [2.4, 4.2, 4.6, 5.9]], { ext: -1 });
  m("z", -0.6, -5.5, 3.6, y0, y1, 0.15, [[1.6, 2.5, y0, 5.95], [-1.2, -0.3, y0, 5.95]]);
  m("x", 0.6, -5, -0.6, y0, y1, 0.15, []);
  m("z", 1.6, -5.5, 5, y0, y1, 0.15, [[1.0, 1.9, y0, 5.95], [-1.4, -0.6, y0, 5.95]]);
  m("x", -0.5, 1.6, 5, y0, y1, 0.15, []);
}
const ordenMuro = o => angulo(o);
secuencia(G.muros1.children.slice(), "sube", ...TL.muros1, 10, ordenMuro);
secuencia(G.muros2.children.slice(), "sube", ...TL.muros2, 10, ordenMuro);

/* Tiempos de aplanado por pieza: zarpeo y estuco por fuera (los dos niveles juntos, alrededor de la casa),
   yeso por dentro (en el corte), pintura final con la fachada (barrido de izquierda a derecha) */
const enVentana = ([t0, t1], u) => t0 + u * (t1 - t0 - 4);
for (const o of murosBlock) {
  const u = angulo(o), px = (o.position.x - XMIN) / (XMAX - XMIN);
  const n2 = o.position.y > NIV[1];
  Object.assign(o.userData.muro, {
    tz: enVentana(TL.zarpeo, u), te: enVentana(TL.estuco, u), tp: enVentana(TL.pintura, Math.min(1, Math.max(0, px))),
    ty: enVentana(n2 ? TL.yeso2 : TL.yeso1, u),
  });
}
// faldones, bordes de losa y pretil: mismo aplanado exterior
for (const o of [...bandas, ...G.losa1.children.filter(o => !bandas.includes(o)), ...G.losa2.children]) {
  const u = angulo(o), px = (o.position.x - XMIN) / (XMAX - XMIN);
  cambia(o, enVentana(TL.zarpeo, u), M.zarpeo);
  cambia(o, enVentana(TL.estuco, u), M.estuco);
  cambia(o, enVentana(TL.pintura, Math.min(1, Math.max(0, px))), M.pintura);
}
for (const o of [...G.columnas1.children, ...G.columnas2.children, ...G.trabes1.children, ...G.trabes2.children])
  cambia(o, enVentana(TL.estuco, angulo(o)), M.estuco);

/* =====================================================================
   6. ACABADOS INTERIORES (corte: el 2º nivel y la azotea suben en fantasma)
   ===================================================================== */
const CAJILLO = 0.32;
function cajillos(g, x0, x1, z0, z1, ytecho) {   // plafón perimetral con luz indirecta hacia el centro del local
  const p = [], y0 = ytecho - 0.28, e = 0.02;
  p.push(caja(g, x0, x1, y0, ytecho, z0, z0 + CAJILLO, M.yeso), caja(g, x0, x1, y0, ytecho, z1 - CAJILLO, z1, M.yeso));
  p.push(caja(g, x0, x0 + CAJILLO, y0, ytecho, z0 + CAJILLO, z1 - CAJILLO, M.yeso), caja(g, x1 - CAJILLO, x1, y0, ytecho, z0 + CAJILLO, z1 - CAJILLO, M.yeso));
  const l = [];
  l.push(caja(g, x0 + CAJILLO, x1 - CAJILLO, y0 + 0.02, y0 + 0.05, z0 + CAJILLO, z0 + CAJILLO + e, M.ledTira, false), caja(g, x0 + CAJILLO, x1 - CAJILLO, y0 + 0.02, y0 + 0.05, z1 - CAJILLO - e, z1 - CAJILLO, M.ledTira, false));
  l.push(caja(g, x0 + CAJILLO, x0 + CAJILLO + e, y0 + 0.02, y0 + 0.05, z0 + CAJILLO, z1 - CAJILLO, M.ledTira, false), caja(g, x1 - CAJILLO - e, x1 - CAJILLO, y0 + 0.02, y0 + 0.05, z0 + CAJILLO, z1 - CAJILLO, M.ledTira, false));
  [...p, ...l].forEach(o => { o.userData.sinLinea = true; });
  return { p, l };
}
const pisoTex = (x0, x1, z0, z1) => { const m = M.piso.clone(); todosMats.add(m); m.map = texPiso.clone(); m.map.needsUpdate = true; m.map.repeat.set((x1 - x0) / 7.2, (z1 - z0) / 7.2); return m; };
{
  const g = grupo("interior1"), y = NIV[0], yt = NIV[0] + ALT;
  const pisos = [];
  for (const [x0, x1, z0, z1] of [[XMIN + 0.18, -0.68, ZMIN + 0.18, ZMAX - 0.18], [-0.52, 1.52, HUECO.z1, ZMAX - 0.18], [1.68, XMAX - 0.18, -0.42, 2.9], [1.68, XMAX - 0.18, ZMIN + 0.18, -0.58]])
    pisos.push(caja(g, x0, x1, y, y + 0.02, z0, z1, pisoTex(x0, x1, z0, z1), false));
  pisos.forEach(o => { o.userData.sinLinea = true; });
  secuencia(pisos, "vierte", ...TL.piso1, 6);
  for (const o of esc1) cambia(o, TL.piso1[1], M.cubierta);   // escalera forrada en piedra clara
  const caj = [cajillos(g, XMIN + 0.18, -0.68, ZMIN + 0.18, ZMAX - 0.18, yt), cajillos(g, 1.68, XMAX - 0.18, -0.42, 2.9, yt)];
  secuencia(caj.flatMap(c => c.p), "cae", ...TL.cajillos1, 5);
  secuencia(caj.flatMap(c => c.l), "aparece", TL.luz1[0], TL.luz1[1], 4);
  // cocina: gabinetes en L, alacenas, columna de despensa, cubierta de cuarzo, tarja, parrilla, campana e isla con bancos
  const coc = [
    caja(g, -4.8, -1.2, y, y + 0.9, -5.3, -4.7, M.cocinaMadera), caja(g, -4.82, -1.18, y + 0.9, y + 0.94, -5.32, -4.66, M.cubierta),
    caja(g, -4.8, -4.2, y, y + 0.9, -4.7, -2.8, M.cocinaMadera), caja(g, -4.82, -4.16, y + 0.9, y + 0.94, -4.7, -2.8, M.cubierta),
    caja(g, -1.2, -0.75, y, y + 2.4, -5.3, -4.7, M.cocinaMadera),
    caja(g, -4.8, -1.2, y + 1.55, y + 2.35, -5.3, -4.95, M.cocina),
    caja(g, -3.4, -2.7, y + 0.92, y + 0.95, -5.2, -4.85, M.acero), caja(g, -2.3, -1.6, y + 0.94, y + 0.96, -5.2, -4.8, M.antracita),
    caja(g, -2.25, -1.65, y + 1.5, y + 1.75, -5.3, -4.9, M.acero),
    caja(g, -3.9, -1.9, y, y + 0.9, -2.8, -1.9, M.cocina), caja(g, -3.95, -1.85, y + 0.9, y + 0.94, -2.85, -1.85, M.cubierta),
  ];
  for (const x of [-3.5, -2.9, -2.3]) coc.push(caja(g, x - 0.17, x + 0.17, y, y + 0.72, -1.7, -1.36, M.telaOscura));
  coc.forEach(o => { o.userData.sinLinea = true; });
  secuencia(coc, "cae", ...TL.cocina, 6);
  // carpintería: puertas, lambrín de madera tras la sala, consola
  const car = [caja(g, 2.4, 3.3, y, 2.6, -0.54, -0.46, M.maderaPuerta), caja(g, -4.95, -4.88, y + 0.3, y + 2.6, 0.9, 4.4, M.madera), caja(g, -0.4, 0.9, y, y + 0.8, 4.6, 4.95, M.madera)];
  car.forEach(o => { o.userData.sinLinea = true; });
  secuencia(car, "sube", ...TL.carpinteria1, 5);
  const mue = [
    caja(g, -4.6, -1.4, y + 0.02, y + 0.03, 1.2, 4.2, M.telaOscura, false),
    caja(g, -4.2, -1.6, y, y + 0.42, 3.1, 3.95, M.tela), caja(g, -4.2, -1.6, y + 0.42, y + 0.82, 3.7, 3.95, M.tela), caja(g, -4.6, -3.75, y, y + 0.42, 1.6, 3.95, M.tela),
    caja(g, -3.3, -2.2, y, y + 0.35, 1.9, 2.6, M.madera),
    caja(g, 2.4, 4.4, y + 0.74, y + 0.78, 0.6, 1.7, M.madera), caja(g, 3.3, 3.5, y, y + 0.74, 1.05, 1.25, M.antracita),
    caja(g, 3.35, 3.45, y + 2.0, yt - 0.3, 1.1, 1.2, M.antracita), caja(g, 3.05, 3.75, y + 1.85, y + 2.0, 0.9, 1.4, M.led, false),
  ];
  for (const cx of [2.75, 3.4, 4.05]) for (const cz of [0.3, 2.0]) mue.push(caja(g, cx - 0.2, cx + 0.2, y, y + 0.46, cz - 0.2, cz + 0.2, M.tela));
  mue.forEach(o => { o.userData.sinLinea = true; });
  secuencia(mue, "cae", ...TL.muebles1, 5);
}
{
  const g = grupo("interior2"), y = NIV[1], yt = NIV[1] + ALT;
  const pisos = [];
  for (const [x0, x1, z0, z1, m] of [[XMIN + 0.18, -0.68, 0.68, 3.5, 1], [XMIN + 0.18, -0.68, ZMIN + 0.18, 0.52, 1], [1.68, XMAX - 0.18, -0.42, ZMAX - 0.18, 1], [-0.52, 1.52, HUECO.z1, ZMAX - 0.18, 0], [1.68, XMAX - 0.18, ZMIN + 0.18, -0.58, 0]])
    pisos.push(caja(g, x0, x1, y, y + 0.02, z0, z1, m ? M.deckMadera : pisoTex(x0, x1, z0, z1), false));
  pisos.forEach(o => { o.userData.sinLinea = true; });
  secuencia(pisos, "vierte", ...TL.piso2, 5);
  for (const o of esc2) cambia(o, TL.piso2[1], M.cubierta);
  const caj = [cajillos(g, XMIN + 0.18, -0.68, 0.68, 3.5, yt), cajillos(g, XMIN + 0.18, -0.68, ZMIN + 0.18, 0.52, yt), cajillos(g, 1.68, XMAX - 0.18, -0.42, ZMAX - 0.18, yt)];
  secuencia(caj.flatMap(c => c.p), "cae", ...TL.cajillos2, 4);
  secuencia(caj.flatMap(c => c.l), "aparece", TL.luz2[0], TL.luz2[1], 4);
  const car = [caja(g, -0.64, -0.56, y, 5.95, 1.6, 2.5, M.maderaPuerta), caja(g, -0.64, -0.56, y, 5.95, -1.2, -0.3, M.maderaPuerta), caja(g, 1.56, 1.64, y, 5.95, 1.0, 1.9, M.maderaPuerta), caja(g, 1.56, 1.64, y, 5.95, -1.4, -0.6, M.maderaPuerta),
    caja(g, -4.9, -4.3, y, y + 2.5, 0.75, 3.4, M.cocinaMadera), caja(g, -4.9, -4.3, y, y + 2.5, -5.3, -2.8, M.cocinaMadera), caja(g, 4.3, 4.9, y, y + 2.5, 0.5, 2.6, M.cocinaMadera)];
  car.forEach(o => { o.userData.sinLinea = true; });
  secuencia(car, "sube", ...TL.carpinteria2, 5);
  const mue = [caja(g, -3.6, -1.6, y, y + 0.55, 1.4, 3.3, M.tela), caja(g, -3.6, -1.6, y, y + 0.55, -2.4, -0.4, M.tela), caja(g, 2.2, 4.0, y, y + 0.55, 2.6, 4.6, M.tela),
    caja(g, -3.6, -1.6, y + 0.55, y + 1.1, 1.3, 1.45, M.madera), caja(g, 2.2, 4.0, y + 0.55, y + 1.1, 2.5, 2.65, M.madera), caja(g, 2.0, 3.6, y, y + 0.85, -5.3, -4.8, M.cubierta)];
  mue.forEach(o => { o.userData.sinLinea = true; });
  secuencia(mue, "cae", ...TL.muebles2, 4);
}

/* =====================================================================
   7. VENTANAS, PUERTA Y FACHADA (referencia opción 4)
   ===================================================================== */
const luces = grupo("luces");
{
  const g = grupo("ventanas");
  const v = [
    ...ventana(g, "x", 5, -4.33, -1.63, 0.6, 2.95, { divisiones: 2, luz: luces }),
    ...ventana(g, "x", 3, 1.95, 2.85, NIV[0], 2.95, { divisiones: 1, luz: luces }),
    ...ventana(g, "x", 3, 3.1, 4.85, NIV[0], 2.95, { divisiones: 3, luz: luces }),
    ...ventana(g, "z", 5, -3.6, -1.6, 1.2, 2.5, { luz: luces }),
    ...ventana(g, "z", -5, -4.0, -2.2, 1.2, 2.5, { cara: -1, luz: luces }),
    ...ventana(g, "z", -5, 1.6, 3.8, 0.6, 2.95, { cara: -1, luz: luces }),
    ...ventana(g, "x", -5.5, -4.0, -1.6, 1.2, 2.5, { cara: -1, luz: luces }),
    ...ventana(g, "x", -5.5, 2.4, 4.2, 1.2, 2.5, { cara: -1, luz: luces }),
    ...ventana(g, "x", 3.6, -4.6, -0.9, NIV[1], 6.45, { divisiones: 3, luz: luces }),
    ...ventana(g, "x", 5, -0.4, 1.35, 3.95, 6.4, { divisiones: 2, luz: luces }),
    ...ventana(g, "x", 5, 2.15, 3.25, 3.95, 6.4, { divisiones: 2, luz: luces }),
    ...ventana(g, "x", 5.47, 3.7, 4.9, 5.4, 6.2, { divisiones: 2 }),
    ...ventana(g, "z", 5, -3.6, -1.6, 4.6, 5.9, { luz: luces }),
    ...ventana(g, "z", 5, 0.8, 1.6, 3.95, 6.4, { divisiones: 1, luz: luces }),
    ...ventana(g, "z", -5, -4.0, -2.2, 4.6, 5.9, { cara: -1, luz: luces }),
    ...ventana(g, "z", -5, 0.6, 2.6, 4.6, 5.9, { cara: -1, luz: luces }),
    ...ventana(g, "x", -5.5, -4.0, -1.6, 4.6, 5.9, { cara: -1, luz: luces }),
    ...ventana(g, "x", -5.5, 2.4, 4.2, 4.6, 5.9, { cara: -1, luz: luces }),
  ];
  secuencia(v, "crece", ...TL.ventanas, 5, o => o.position.x);
  const pu = [caja(g, -0.03, 1.08, NIV[0], 2.98, 4.97, 5.05, M.maderaPuerta), caja(g, 0.85, 0.89, 1.0, 2.5, 5.05, 5.11, M.antracita), caja(g, -0.07, 1.12, 2.98, 3.03, 4.95, 5.1, M.antracita)];
  secuencia(pu, "sube", ...TL.puerta, 6);
}
{
  const g = grupo("fachada");
  const pasos = [];
  const piedraGris = (a, b) => piedra("#8e8b86", "#e8e4dc", a, b, [0.6, 1.2]);
  const piedraOscura = (a, b) => piedra("#4b4c4e", "#9a9a98", a, b, [0.6, 1.2]);
  // 1. piedra: pilastras del acceso y columna del volado
  pasos.push(["sube", [texturizada(g, -1.05, -0.08, NIV[0], 3.2, 5.18, 5.42, piedraGris), texturizada(g, 1.1, 1.75, NIV[0], 3.2, 5.18, 5.42, piedraOscura),
    texturizada(g, 4.85, 5.55, 0, 3.2, 6.3, 7.0, piedraGris)]]);
  // 2. madera: lamas del acceso y del 2º nivel (iluminadas por detrás), plafón del balcón
  const lamas2 = lamas(g, -0.6, 1.55, 3.85, NIV[2] - 0.45, 5.2, 0.15, 0.05, 0.2);
  pasos.push(["sube", [...lamas(g, -1.63, -1.08, NIV[0], 3.0, 5.18, 0.11, 0.05, 0.1), ...lamas2]]);
  // 3. porcelanato gris oscuro de gran formato en el bloque derecho del 2º nivel
  const gris = (a, b) => porcelanato("#3e4247", "#2a2d31", a, b, [0.6, 1.2], 0.3);
  pasos.push(["sube", [texturizada(g, 3.3, 5.46, 3.85, 6.6, 5.18, 5.45, gris), texturizada(g, 5.18, 5.46, 3.85, 6.6, 2.6, 5.18, gris)]]);
  // 4. volado gris oscuro de la cochera con plafón de madera y luminarias
  const vol = [caja(g, -1.1, 5.75, 3.2, 3.7, 5.18, 7.0, M.grisOscuro), caja(g, 1.6, 5.75, 3.2, 3.7, 3.0, 5.18, M.grisOscuro),
    caja(g, -1.0, 5.65, 3.17, 3.2, 5.2, 6.9, M.madera, false), caja(g, 1.6, 5.65, 3.17, 3.2, 3.05, 5.2, M.madera, false)];
  pasos.push(["desliza", vol, { dz: 1.0 }]);
  // 5. barandal de cristal del balcón y plafón de madera
  pasos.push(["crece", [...barandalVidrio(g, "x", 5.3, -4.85, -1.15, NIV[1] + 0.15, 0.95), caja(g, -4.85, -0.65, NIV[2] - 0.47, NIV[2] - 0.45, 3.6, 5.45, M.madera, false)]]);
  // 6. jardinera de piedra, escalones con luz, piso de cochera
  const jard = [texturizada(g, -5.6, -1.6, 0, 0.5, 5.5, 6.7, (a, b) => piedra("#a9a59d", "#ece8e0", a, b, [1.2, 0.5])), caja(g, -5.5, -1.7, 0.42, 0.48, 5.6, 6.6, M.tierra, false),
    caja(g, -1.45, 1.5, 0, 0.15, 5.18, 6.28, M.cubierta), caja(g, -1.45, 1.5, 0.15, 0.3, 5.18, 5.93, M.cubierta), caja(g, -1.45, 1.5, 0.3, 0.45, 5.18, 5.58, M.cubierta),
    texturizada(g, 1.6, 5.75, 0, 0.04, 3.0, 7.2, (a, b) => porcelanato("#cfccc6", "#a8a49c", a, b, [1.2, 1.2], 0.4))];
  pasos.push(["sube", jard]);
  const n = pasos.length, [t0, t1] = TL.fachada, paso = (t1 - t0 - 12) / (n - 1);
  pasos.forEach(([tipo, lista, d], i) => secuencia(lista, tipo, t0 + i * paso, t0 + i * paso + 12, 7, null, d));
  // luces: resplandor de lamas, luminarias, tiras LED de escalones y bañadores en piedra
  const fin = t1 - 6;
  anima(caja(luces, -0.58, 1.53, 3.95, NIV[2] - 0.55, 5.19, 5.2, M.calido, false), "aparece", fin - 6, fin);
  for (const x of [-0.2, 1.0, 2.4, 3.6, 4.6]) anima(downlight(luces, x, 3.17, 6.1), "aparece", fin - 4, fin + 2);
  for (const x of [2.6, 4.2]) anima(downlight(luces, x, 3.17, 4.1), "aparece", fin - 4, fin + 2);
  for (const x of [-3.9, -2.0]) anima(downlight(luces, x, NIV[2] - 0.47, 4.5), "aparece", fin - 4, fin + 2);
  for (const [z0, y] of [[6.28, 0.15], [5.93, 0.3], [5.58, 0.45]]) anima(caja(luces, -1.4, 1.45, y - 0.03, y - 0.01, z0 - 0.01, z0 + 0.01, M.ledTira, false), "aparece", fin - 4, fin + 2);
  for (const [x0, x1, z] of [[-1.0, -0.13, 5.44], [1.15, 1.7, 5.44], [4.9, 5.5, 7.02]]) anima(caja(luces, x0, x1, 0.02, 0.05, z, z + 0.02, M.led, false), "aparece", fin - 4, fin + 2);
}
{
  // jardín: pastos, agaves, arbustos redondos y un árbol esbelto a la izquierda (como la referencia)
  const g = grupo("jardin"), p = [];
  for (let i = 0; i < 7; i++) {
    const x = -5.3 + i * 0.6, z = 6.1 + (i % 2 ? 0.25 : -0.2);
    p.push(i % 3 === 1 ? briznas(g, x, 0.46, z, { n: 26, altoB: 0.55, ancho: 0.09, abre: 0.5, color: 0x6f9a84, agave: true }) : briznas(g, x, 0.46, z, { n: 46, altoB: 0.7, color: 0x6c8e45 }));
  }
  p.push(arbusto(g, -2.0, 0.46, 6.15, 0.3));
  p.push(arbol(g, -6.05, 6.25, 3.6, 0.95, 0x557f3c));
  p.push(briznas(g, 5.15, 0.04, 2.7, { n: 22, altoB: 0.6, ancho: 0.09, abre: 0.5, color: 0x6f9a84, agave: true }), arbusto(g, 1.9, 0.0, 6.9, 0.28));
  secuencia(p, "crece", TL.fachada[1] - 18, TL.fachada[1], 6);
}
for (const o of luces.children) if (o.userData.luz && !anims.some(a => a.o === o)) anima(o, "aparece", TL.fachada[1] - 10, TL.fachada[1]);

/* =====================================================================
   8. AMPLIACIÓN 3er NIVEL — steel framing a todo lo ancho (x -5..5, z -5.5..-0.5)
   Sus muros caen sobre los ejes de trabes existentes (x = ±5; z = -5.5, -0.5).
   ===================================================================== */
const A = { x0: -5, x1: 5, z0: -5.5, z1: -0.5, y0: NIV[2], y1: NIV[2] + 2.7 };
const Y_CUB = A.y1 + 0.47;                 // cara superior de la cubierta (armadura + polín + deck + triplay)
const Y_PRE = Y_CUB + 0.43;                // remate del pretil
const PG = 0.61;
const VANOS3 = {
  "x:-0.5": [[-3.8, -1.0, A.y0, A.y0 + 2.4], [1.6, 3.6, A.y0 + 0.3, A.y0 + 2.4]],
  "z:5": [[-3.4, -1.6, A.y0 + 0.95, A.y0 + 2.25]],
  "x:-5.5": [[-3.6, -1.6, A.y0 + 0.95, A.y0 + 2.25], [1.8, 3.8, A.y0 + 0.95, A.y0 + 2.25]],
  "z:-5": [[-3.6, -1.6, A.y0 + 0.95, A.y0 + 2.25]],
};
const MUROS3 = [["x", A.z1, A.x0, A.x1, VANOS3["x:-0.5"], 1], ["x", A.z0, A.x0, A.x1, VANOS3["x:-5.5"], -1],
  ["z", A.x1, A.z0, A.z1, VANOS3["z:5"], 1], ["z", A.x0, A.z0, A.z1, VANOS3["z:-5"], -1]];
const ACERO = { soleras: [], anclas: [], montantes: [], esquinas: [], cerramientos: [], perimetral: [], bloqueo: [], contraviento: [], armaduras: [], polines: [], pretil: [] };
const gAcero = grupo("acero"), gCub = grupo("cubierta3");
function perfil(lista, p0, p1, a = 0.04, b = 0.09, g = gAcero) {
  const v = new THREE.Vector3().subVectors(p1, p0), L = v.length();
  const o = new THREE.Mesh(new THREE.BoxGeometry(a, L, b), M.galvanizado);
  o.position.copy(p0).addScaledVector(v, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  o.castShadow = true; o.receiveShadow = true; o.userData.m0 = M.galvanizado;
  g.add(o); lista.push(o); return o;
}
const P = (eje, fijo, a, y, off = 0) => eje === "x" ? new THREE.Vector3(a, y, fijo + off) : new THREE.Vector3(fijo + off, y, a);
function armadura(lista, eje, fijo, a0, a1, y0, y1, horizontal = true, paso = 0.4, g = gAcero) {
  if (horizontal) {
    perfil(lista, P(eje, fijo, a0, y0), P(eje, fijo, a1, y0), 0.04, 0.09, g); perfil(lista, P(eje, fijo, a0, y1), P(eje, fijo, a1, y1), 0.04, 0.09, g);
    const n = Math.max(1, Math.round((a1 - a0) / paso));
    for (let i = 0; i < n; i++) { const b0 = a0 + (a1 - a0) * i / n, b1 = a0 + (a1 - a0) * (i + 1) / n; perfil(lista, P(eje, fijo, b0, i % 2 ? y1 : y0), P(eje, fijo, b1, i % 2 ? y0 : y1), 0.03, 0.06, g); }
  } else {
    perfil(lista, P(eje, fijo, a0, y0), P(eje, fijo, a0, y1), 0.04, 0.09, g); perfil(lista, P(eje, fijo, a1, y0), P(eje, fijo, a1, y1), 0.04, 0.09, g);
    const n = Math.max(2, Math.round((y1 - y0) / paso));
    for (let i = 0; i < n; i++) { const c0 = y0 + (y1 - y0) * i / n, c1 = y0 + (y1 - y0) * (i + 1) / n; perfil(lista, P(eje, fijo, i % 2 ? a1 : a0, c0), P(eje, fijo, i % 2 ? a0 : a1, c1), 0.03, 0.06, g); }
  }
}
const HT = 0.35;
for (const [eje, fijo, a0, a1, vanos] of MUROS3) {
  const y0 = A.y0, y1 = A.y1;
  perfil(ACERO.soleras, P(eje, fijo, a0, y0 + 0.02), P(eje, fijo, a1, y0 + 0.02), 0.09, 0.04);
  for (let a = a0 + 0.3; a < a1; a += 0.9) ACERO.anclas.push(eje === "x"
    ? caja(gAcero, a - 0.06, a + 0.06, y0 - 0.005, y0 + 0.07, fijo - 0.1, fijo + 0.1, M.antracita, false)
    : caja(gAcero, fijo - 0.1, fijo + 0.1, y0 - 0.005, y0 + 0.07, a - 0.06, a + 0.06, M.antracita, false));
  // armaduras en las esquinas (columna armada) en ambos extremos de cada muro
  armadura(ACERO.esquinas, eje, fijo, a0 + 0.03, a0 + 0.33, y0 + 0.04, y1, false);
  armadura(ACERO.esquinas, eje, fijo, a1 - 0.33, a1 - 0.03, y0 + 0.04, y1, false);
  // armadura perimetral superior (cuerda superior = canal superior)
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
  // bloqueo escalonado: un tramo más arriba y el siguiente más abajo
  const cortes = [a0 + 0.33, ...xs.filter(a => !dentro(a)), a1 - 0.33].sort((p, q) => p - q);
  for (let i = 0; i < cortes.length - 1; i++) {
    const b0 = cortes[i], b1 = cortes[i + 1], m = (b0 + b1) / 2, yb = y0 + (i % 2 ? 1.05 : 1.3);
    if (vanos.some(v => m > v[0] - 0.12 && m < v[1] + 0.12)) continue;
    perfil(ACERO.bloqueo, P(eje, fijo, b0, yb), P(eje, fijo, b1, yb), 0.04, 0.08);
  }
  // contraviento en cruz (fleje) en los tableros ciegos de los extremos
  for (const [b0, b1] of [[a0 + 0.33, a0 + 1.55], [a1 - 1.55, a1 - 0.33]]) {
    if (vanos.some(v => v[0] < b1 && v[1] > b0)) continue;
    perfil(ACERO.contraviento, P(eje, fijo, b0, y0 + 0.05, 0.05), P(eje, fijo, b1, y1 - HT, 0.05), 0.012, 0.035);
    perfil(ACERO.contraviento, P(eje, fijo, b1, y0 + 0.05, 0.05), P(eje, fijo, b0, y1 - HT, 0.05), 0.012, 0.035);
  }
  // pretil: montantes cortos sobre la cubierta con canal superior
  perfil(ACERO.pretil, P(eje, fijo, a0, Y_CUB + 0.02), P(eje, fijo, a1, Y_CUB + 0.02), 0.09, 0.04);
  perfil(ACERO.pretil, P(eje, fijo, a0, Y_PRE - 0.02), P(eje, fijo, a1, Y_PRE - 0.02), 0.09, 0.04);
  for (let a = a0 + 0.03; a <= a1 - 0.02; a += PG) perfil(ACERO.pretil, P(eje, fijo, a, Y_CUB + 0.04), P(eje, fijo, a, Y_PRE - 0.04));
}
// armaduras de cubierta en el sentido corto (z) a cada 1.22 m y polines que reciben el deck
for (let x = A.x0 + 0.1; x <= A.x1 - 0.05; x += 1.22) {
  const yb = A.y1, yt = A.y1 + 0.3, n = 8;
  perfil(ACERO.armaduras, new THREE.Vector3(x, yb, A.z0), new THREE.Vector3(x, yb, A.z1), 0.04, 0.09, gCub);
  perfil(ACERO.armaduras, new THREE.Vector3(x, yt, A.z0), new THREE.Vector3(x, yt, A.z1), 0.04, 0.09, gCub);
  for (let i = 0; i < n; i++) {
    const za = A.z0 + (A.z1 - A.z0) * i / n, zb = A.z0 + (A.z1 - A.z0) * (i + 1) / n;
    perfil(ACERO.armaduras, new THREE.Vector3(x, i % 2 ? yt : yb, za), new THREE.Vector3(x, i % 2 ? yb : yt, zb), 0.03, 0.06, gCub);
  }
}
for (let z = A.z0 + 0.05; z <= A.z1 - 0.04; z += 1.24) perfil(ACERO.polines, new THREE.Vector3(A.x0, A.y1 + 0.34, z), new THREE.Vector3(A.x1, A.y1 + 0.34, z), 0.06, 0.1, gCub);
{
  const dx = o => o.position.x + o.position.z * 0.3;
  secuencia(ACERO.anclas, "crece", ...TL.soleras, 4, dx);
  secuencia(ACERO.soleras, "traza", ...TL.soleras, 8, dx);
  secuencia(ACERO.montantes, "sube", ...TL.montantes, 5, dx);
  secuencia(ACERO.esquinas, "sube", ...TL.esquinas, 4, dx);
  secuencia(ACERO.cerramientos, "crece", ...TL.cerramientos, 4, dx);
  secuencia(ACERO.perimetral, "crece", ...TL.perimetral, 3, dx);
  secuencia(ACERO.bloqueo, "crece", ...TL.bloqueo, 3, dx);
  secuencia(ACERO.contraviento, "crece", ...TL.contraviento, 4, dx);
  secuencia(ACERO.armaduras, "cae", ...TL.armaduras, 5, o => o.position.x);
  secuencia(ACERO.polines, "cae", ...TL.polines, 4, o => o.position.z);
  secuencia(ACERO.pretil, "sube", ...TL.pretil3, 4, dx);
}

/* Hojas de 1.22 x 2.44 sobre los bastidores */
function hojas(g, eje, fijo, a0, a1, y0, y1, vanos, off, e, m, sinJunta = false) {
  const out = [], j = sinJunta ? 0 : 0.004;
  const placa = (b0, b1, c0, c1) => { if (b1 - b0 > 0.01 && c1 - c0 > 0.01) out.push(eje === "x"
    ? caja(g, b0 + j, b1 - j, c0 + j, c1 - j, fijo + off - e / 2, fijo + off + e / 2, m)
    : caja(g, fijo + off - e / 2, fijo + off + e / 2, c0 + j, c1 - j, b0 + j, b1 - j, m)); };
  const paso = sinJunta ? 99 : 1.22;
  for (let a = a0; a < a1 - 0.01; a += paso) {
    const b = Math.min(a + paso, a1);
    const v = vanos.filter(v => v[0] < b && v[1] > a);
    if (!v.length) { placa(a, b, y0, y1); continue; }
    let cursor = a;
    for (const [v0, v1, s0, s1] of v) {
      if (v0 > cursor) placa(cursor, Math.min(v0, b), y0, y1);
      const c0 = Math.max(a, v0), c1 = Math.min(b, v1);
      if (s0 > y0 + 0.02) placa(c0, c1, y0, s0);
      placa(c0, c1, s1, y1);
      cursor = Math.min(v1, b);
    }
    if (cursor < b - 0.01) placa(cursor, b, y0, y1);
  }
  return out;
}
// capas exteriores, de dentro hacia fuera: triplay, hule antihumedad, Durock y base coat; tablaroca por dentro
const CAPAS = { triplay: [0.055, 0.012, M.triplay], membrana: [0.064, 0.002, M.membrana], durock: [0.072, 0.0127, M.durock], basecoat: [0.081, 0.004, M.basecoat] };
{
  const capa = (n, extY = Y_PRE, sinJunta = false) => {
    const [off, e, m] = CAPAS[n], g = grupo(n), out = [];
    for (const [eje, fijo, a0, a1, vanos, lado] of MUROS3) out.push(...hojas(g, eje, fijo, a0 - off, a1 + off, A.y0, extY, vanos, lado * off, e, m, sinJunta));
    return out;
  };
  secuencia(capa("triplay"), "desliza", ...TL.triplay, 4, o => o.position.x - o.position.z * 0.5, { dy: 0.6 });
  secuencia(capa("membrana", Y_PRE, true), "vierte", ...TL.membrana, 5);
  secuencia(capa("durock"), "desliza", ...TL.durock, 4, o => o.position.x - o.position.z * 0.5, { dy: 0.6 });
  // base coat: piel continua que sella muros y pretil, por fuera y por dentro del pretil
  const bc = capa("basecoat", Y_PRE, true);
  for (const [eje, fijo, a0, a1, , lado] of MUROS3) bc.push(...hojas(grupo("basecoat"), eje, fijo, a0 + 0.06, a1 - 0.06, Y_CUB, Y_PRE, [], -lado * 0.06, 0.02, M.basecoat, true));
  for (const [eje, fijo, a0, a1] of MUROS3) bc.push(eje === "x" ? caja(grupo("basecoat"), a0 - 0.12, a1 + 0.12, Y_PRE, Y_PRE + 0.05, fijo - 0.12, fijo + 0.12, M.antracita) : caja(grupo("basecoat"), fijo - 0.12, fijo + 0.12, Y_PRE, Y_PRE + 0.05, a0 - 0.12, a1 + 0.12, M.antracita));
  secuencia(bc, "aparece", ...TL.basecoat, 4, o => o.position.x - o.position.z);
  // tablaroca por dentro (hasta plafón)
  const gt = grupo("tablaroca"), tr = [];
  for (const [eje, fijo, a0, a1, vanos, lado] of MUROS3) tr.push(...hojas(gt, eje, fijo, a0 + 0.06, a1 - 0.06, A.y0, A.y1, vanos, -lado * 0.052, 0.0127, M.tablaroca));
  secuencia(tr, "desliza", ...TL.tablaroca, 4, o => o.position.x + o.position.z, { dy: 0.5 });
}
{
  // deck metálico en láminas de 0.915 m, costillas en el sentido corto, sobre los polines; triplay encima e impermeabilizante
  const onda = 0.305, altoD = 0.064, ancho = 0.915, largo = A.z1 - A.z0;
  const forma = new THREE.Shape();
  forma.moveTo(0, 0);
  for (let x = 0; x < ancho - 1e-6; x += onda) { forma.lineTo(x + 0.06, 0); forma.lineTo(x + 0.1, altoD); forma.lineTo(x + 0.2, altoD); forma.lineTo(x + 0.24, 0); forma.lineTo(Math.min(x + onda, ancho), 0); }
  forma.lineTo(ancho, -0.003); forma.lineTo(0, -0.003); forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, { depth: largo, bevelEnabled: false });
  geo.translate(0, 0, -largo);
  const laminas = [], x0d = A.x0, x1d = A.x1;
  for (let x = x0d; x < x1d - 0.01; x += ancho) {
    const d = new THREE.Mesh(geo, M.deck); d.position.set(x, A.y1 + 0.39, A.z1);
    d.scale.x = Math.min(ancho, x1d - x) / ancho;
    d.castShadow = d.receiveShadow = true; d.userData.m0 = M.deck; gCub.add(d); laminas.push(d);
  }
  secuencia(laminas, "desliza", ...TL.deck, 5, o => o.position.x, { dz: -5 });
  const tri = [], y = A.y1 + 0.39 + altoD;
  for (let fila = 0, z = A.z1; z > A.z0 + 0.01; z -= 1.22, fila++)
    for (let x = A.x0 - (fila % 2) * 1.22; x < A.x1; x += 2.44) {
      const xa = Math.max(x, A.x0), xb = Math.min(x + 2.44, A.x1), zb = Math.max(z - 1.22, A.z0);
      if (xb - xa > 0.05) tri.push(caja(gCub, xa + 0.004, xb - 0.004, y, y + 0.018, zb + 0.004, z - 0.004, M.triplay));
    }
  secuencia(tri, "cae", TL.triplay[0], TL.triplay[1], 4, o => o.position.x - o.position.z * 3);
  const imp = caja(gCub, A.x0 + 0.05, A.x1 - 0.05, Y_CUB - 0.002, Y_CUB + 0.01, A.z0 + 0.05, A.z1 - 0.05, M.impermeable);
  anima(imp, "vierte", ...TL.cubierta3);
}
{
  // acabado: piedra clara de gran formato en el frente derecho y costado derecho, cancelería y luz
  const g = grupo("ampliacion"), y0 = A.y0;
  const clara = (a, b) => piedra("#d8d3c9", "#b4aea3", a, b, [1.2, 0.6]);
  const pie = [];
  const off = 0.088;
  for (const pz of hojas(g, "x", A.z1, 0.6, A.x1 + off, y0, Y_PRE, VANOS3["x:-0.5"].filter(v => v[0] > 0.5), off, 0.02, M.basecoat, true)) pie.push(pz);
  for (const pz of hojas(g, "z", A.x1, A.z0 - off, A.z1 + off, y0, Y_PRE, VANOS3["z:5"], off, 0.02, M.basecoat, true)) pie.push(pz);
  for (const o of pie) { const p = o.geometry.parameters, L = Math.max(p.width, p.depth); o.material = o.userData.m0 = mat({ map: clara(L, p.height), roughness: 0.4 }); }
  secuencia(pie, "sube", ...TL.piedra3, 4, o => o.position.x - o.position.z);
  const luz = grupo("luces3");
  const v = [
    ...ventana(g, "x", A.z1 + 0.09, -3.8, -1.0, y0, y0 + 2.4, { divisiones: 3, luz }),
    ...ventana(g, "x", A.z1 + 0.1, 1.6, 3.6, y0 + 0.3, y0 + 2.4, { divisiones: 2, luz }),
    ...ventana(g, "z", A.x1 + 0.1, -3.4, -1.6, y0 + 0.95, y0 + 2.25, { luz }),
    ...ventana(g, "z", A.x0 - 0.09, -3.6, -1.6, y0 + 0.95, y0 + 2.25, { cara: -1, luz }),
    ...ventana(g, "x", A.z0 - 0.09, -3.6, -1.6, y0 + 0.95, y0 + 2.25, { cara: -1, luz }),
    ...ventana(g, "x", A.z0 - 0.09, 1.8, 3.8, y0 + 0.95, y0 + 2.25, { cara: -1, luz }),
  ];
  secuencia(v, "crece", ...TL.ventanas3, 4, o => o.position.x);
  // interior: piso, cajillos con luz indirecta
  const gi = grupo("interior3");
  const piso = caja(gi, A.x0 + 0.08, A.x1 - 0.08, A.y0, A.y0 + 0.02, A.z0 + 0.08, A.z1 - 0.08, pisoTex(A.x0, A.x1, A.z0, A.z1), false);
  piso.userData.sinLinea = true;
  anima(piso, "vierte", ...TL.piso3);
  const caj = cajillos(gi, A.x0 + 0.08, A.x1 - 0.08, A.z0 + 0.08, A.z1 - 0.08, A.y1);
  secuencia(caj.p, "cae", ...TL.cajillos3, 3);
  secuencia(caj.l, "aparece", TL.cajillos3[1] - 2, TL.cajillos3[1] + 4, 3);
  for (const o of luz.children) anima(o, "aparece", TL.terraza[1] - 6, TL.terraza[1]);
}
{
  // terraza: porcelanato en toda la terraza, barandal de cristal, pérgola con deck de madera, asador y mobiliario
  const g = grupo("terraza"), y = NIV[2];
  const piso = texturizada(g, XMIN + 0.3, XMAX - 0.3, y, y + 0.03, A.z1 + 0.1, 4.9, (a, b) => porcelanato("#cdc7bb", "#a69f94", a, b, [0.6, 0.6], 0.3));
  anima(piso, "vierte", TL.terraza[0], TL.terraza[0] + 6);
  const bar = [...barandalVidrio(g, "x", 5.2, XMIN + 0.05, XMAX - 0.05, y + 0.5, 0.55),
    ...barandalVidrio(g, "z", XMIN + 0.15, A.z1 + 0.12, 5.2, y + 0.5, 0.55), ...barandalVidrio(g, "z", XMAX - 0.15, A.z1 + 0.12, 5.2, y + 0.5, 0.55)];
  secuencia(bar, "crece", TL.terraza[0] + 3, TL.terraza[0] + 11, 5);
  // pérgola: postes sobre los ejes (-5,5) y (-0.6,5), viga de arranque en la ampliación, lamas de madera
  const yp = y + 2.75, per = [];
  for (const [x, z] of [[-4.62, 4.55], [-0.95, 4.55]]) per.push(caja(g, x - 0.06, x + 0.06, y, yp, z - 0.06, z + 0.06, M.antracita));
  per.push(caja(g, -4.7, -0.85, yp - 0.22, yp, 4.49, 4.61, M.antracita), caja(g, -4.7, -0.85, yp - 0.22, yp, -0.38, -0.26, M.antracita), caja(g, -4.68, -4.56, yp - 0.22, yp, -0.38, 4.61, M.antracita), caja(g, -1.0, -0.88, yp - 0.22, yp, -0.38, 4.61, M.antracita));
  for (let x = -4.55; x <= -1.05; x += 0.25) per.push(caja(g, x, x + 0.06, yp, yp + 0.14, -0.38, 4.75, M.madera));
  secuencia(per, "cae", TL.terraza[0] + 6, TL.terraza[1] - 8, 4, o => o.position.x);
  for (const [x, z] of [[-3.6, 0.9], [-2.0, 0.9], [-3.6, 3.2], [-2.0, 3.2]]) anima(downlight(g, x, yp - 0.22, z), "aparece", TL.terraza[1] - 6, TL.terraza[1]);
  // deck de madera bajo la pérgola
  const dk = caja(g, -4.55, -1.05, y + 0.03, y + 0.1, -0.3, 4.45, M.deckMadera);
  anima(dk, "vierte", TL.terraza[0] + 8, TL.terraza[0] + 16);
  // área de asador junto al pretil derecho: barra de porcelanato oscuro, asador empotrado, tarja y bancos
  const gris = (a, b) => porcelanato("#3c4045", "#2a2d31", a, b, [0.6, 0.6], 0.3);
  const asa = [texturizada(g, 4.2, 4.82, y, y + 0.92, 0.6, 3.9, gris), caja(g, 4.15, 4.86, y + 0.92, y + 0.96, 0.55, 3.95, M.cubierta),
    caja(g, 4.3, 4.72, y + 0.96, y + 1.12, 0.9, 1.9, M.acero), caja(g, 4.33, 4.69, y + 1.12, y + 1.15, 0.95, 1.85, M.antracita), caja(g, 4.33, 4.69, y + 0.93, y + 0.97, 2.9, 3.4, M.acero)];
  for (const z of [1.3, 2.25, 3.2]) asa.push(caja(g, 3.55, 3.85, y, y + 0.75, z - 0.15, z + 0.15, M.antracita));
  asa.push(caja(g, 0.9, 2.7, y + 0.74, y + 0.78, 1.6, 2.6, M.madera), caja(g, 1.7, 1.9, y, y + 0.74, 2.0, 2.2, M.antracita));
  for (const cx of [1.25, 2.35]) for (const cz of [1.25, 2.95]) asa.push(caja(g, cx - 0.2, cx + 0.2, y, y + 0.45, cz - 0.2, cz + 0.2, M.antracita));
  asa.push(caja(g, -4.3, -2.2, y + 0.1, y + 0.5, 0.2, 1.0, M.tela), caja(g, -4.3, -2.2, y + 0.5, y + 0.85, 0.2, 0.42, M.tela), caja(g, -4.3, -3.5, y + 0.1, y + 0.5, 1.0, 2.3, M.tela), caja(g, -3.0, -2.1, y + 0.1, y + 0.42, 1.6, 2.4, M.madera));
  asa.forEach(o => { o.userData.sinLinea = true; });
  for (const [x, z, r] of [[-4.55, 4.35, 0.3], [0.1, 4.55, 0.26], [3.3, 4.55, 0.26]]) {
    asa.push(...maceta(g, x, y, z, r * 0.9, 0.5));
    asa.push(x < -4 ? arbol(g, x, z, 1.5, 0.45, 0x55803c) : arbusto(g, x, y + 0.5, z, r));
    if (x < -4) asa[asa.length - 1].position.y = y + 0.5;
  }
  secuencia(asa, "cae", TL.terraza[0] + 12, TL.terraza[1], 4);
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
      if (v[2] > 0.5) w.eje === "x" ? seg(pts, v[0], w.fijo, v[1], w.fijo) : seg(pts, w.fijo, v[0], w.fijo, v[1]);
      else {
        const r = Math.min(1.0, v[1] - v[0]), n = 10;
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
  const xm = (HUECO.x0 + HUECO.x1) / 2;
  for (let i = 0; i <= 9; i++) { const z = HUECO.z1 - 0.05 - i * 0.3; seg(muebles, HUECO.x0 + 0.08, z, xm - 0.05, z); seg(muebles, xm + 0.05, z, HUECO.x1 - 0.08, z); }
  rect(muebles, -4.8, -1.2, -5.3, -4.7); rect(muebles, -4.8, -4.2, -4.7, -2.8); rect(muebles, -3.9, -1.9, -2.8, -1.9);
  rect(muebles, -4.2, -1.6, 3.1, 3.95); rect(muebles, 2.4, 4.4, 0.6, 1.7);
  const ej = [];
  for (const x of EX) ej.push(x, 0, -7.1, x, 0, 6.6);
  for (const z of EZ) ej.push(-6.6, 0, z, 6.6, 0, z);
  const capa = (arr, m) => { const l = lineas(plano, arr, m); l.position.y = PISO + 0.01; return l; };
  const lEjes = capa(ej, lineaOroTenue), lMuros = capa(pts, lineaOro), lMuebles = capa(muebles, lineaOroTenue);
  const burbuja = new THREE.EdgesGeometry(new THREE.CircleGeometry(0.28, 20));
  const marcas = [];
  for (const x of EX) { const c = new THREE.LineSegments(burbuja, lineaOroTenue); c.rotation.x = -Math.PI / 2; c.position.set(x, PISO + 0.01, 6.9); plano.add(c); marcas.push(c); }
  for (const z of EZ) { const c = new THREE.LineSegments(burbuja, lineaOroTenue); c.rotation.x = -Math.PI / 2; c.position.set(-6.9, PISO + 0.01, z); plano.add(c); marcas.push(c); }
  const punto = new THREE.MeshBasicMaterial({ color: ORO });
  for (const [x, z] of COL) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.3), punto); p.position.set(x, PISO + 0.02, z); plano.add(p); marcas.push(p); }
  const local = new THREE.MeshBasicMaterial({ color: 0x4a6a8c, transparent: true, opacity: 0.18, depthWrite: false });
  const locales = [];
  for (const [x0, x1, z0, z1] of [[-5, -0.6, 0.6, 5], [-5, -0.6, -5.5, 0.6], [-0.6, 1.6, HUECO.z1, 5], [1.6, 5, -0.5, 3], [1.6, 5, -5.5, -0.5], [HUECO.x0, HUECO.x1, HUECO.z0, HUECO.z1]]) {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.3, z1 - z0 - 0.3), local); q.rotation.x = -Math.PI / 2; q.position.set((x0 + x1) / 2, PISO + 0.008, (z0 + z1) / 2); plano.add(q); locales.push(q);
  }
  const [p0, p1] = TL.plano;
  anima(lEjes, "trazo", p0, p0 + 14);
  secuencia(marcas, "crece", p0 + 4, p0 + 20, 5, o => o.position.x + o.position.z);
  anima(lMuros, "trazo", p0 + 12, p0 + 38);
  anima(lMuebles, "trazo", p0 + 30, p1 - 4);
  secuencia(locales, "aparece", p0 + 34, p1, 8);
}

/* =====================================================================
   LÍNEAS DORADAS: aristas de la casa terminada con oclusión (sin líneas ocultas)
   ===================================================================== */
const gLineas = new THREE.Group(); scene.add(gLineas);
const ocultador = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
const lineaFinal = new THREE.LineBasicMaterial({ color: ORO, transparent: true, opacity: 0 });
let lineasHechas = false;
const FINAL = ["firme", "columnas1", "trabes1", "losa1", "columnas2", "trabes2", "losa2", "banda", "muros1", "muros2", "ventanas", "fachada", "basecoat", "ampliacion", "terraza"];
function construirLineas() {
  if (lineasHechas) return; lineasHechas = true;
  for (const n of FINAL) G[n].traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.vidrio || o.userData.sinLinea) return;
    for (let p = o; p; p = p.parent) if (p.userData.sinLinea) return;
    const p = o.geometry.parameters || {};
    if (p.width !== undefined && p.width * p.height * p.depth < 0.0006) return;
    o.updateWorldMatrix(true, false);
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), lineaFinal); l.applyMatrix4(o.matrixWorld);
    const oc = new THREE.Mesh(o.geometry, ocultador); oc.applyMatrix4(o.matrixWorld);
    gLineas.add(l, oc);
  });
}

/* =====================================================================
   CORTES EN FANTASMA: grupos que suben, se vuelven transparentes y regresan
   ===================================================================== */
const CORTES = [
  // 2º nivel (con la losa del 1er nivel): sube para acabar planta baja y regresa para acabarse él
  { grupos: ["losa1", "columnas2", "trabes2", "escalera2", "muros2", "interior2"], sube: TL.corte1, alto: 4.6, baja: [TL.bajaN2] },
  // azotea: sube más alto, baja a media altura mientras se acaba el 2º nivel y luego se cierra
  { grupos: ["losa2", "banda"], sube: TL.corte1, alto: 6.8, baja: [[TL.bajaN2[0], TL.bajaN2[1], 3.4], TL.bajaAzotea] },
  // cubierta de la ampliación: se abre para mostrar tablaroca, piso y cajillos
  { grupos: ["cubierta3"], sube: TL.corte2, alto: 1.7, baja: [TL.bajaCubierta] },
];
for (const c of CORTES) for (const n of c.grupos) {
  const g = G[n], aristas = new THREE.Group();
  for (const o of g.children.filter(o => o.isMesh && !o.isInstancedMesh)) {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), lineaFantasma);
    l.position.copy(o.position); l.quaternion.copy(o.quaternion); l.userData.fuente = o; aristas.add(l);
  }
  g.add(aristas); g.userData.aristas = aristas;
}
function estadoCorte(c, f) {
  // altura y nivel de fantasma (0 sólido, 1 fantasma) del corte en el cuadro f
  let y = suave((f - c.sube[0]) / (c.sube[1] - c.sube[0])) * c.alto;
  const fin = c.baja[c.baja.length - 1];
  for (const b of c.baja) {
    const destino = b[2] ?? 0, desde = y;
    const p = suave((f - b[0]) / (b[1] - b[0]));
    if (p > 0) y = desde + (destino - desde) * p;
  }
  const gf = suave((f - c.sube[0]) / 10) * (1 - suave((f - (fin[1] - 10)) / 10));
  return { y, gf };
}

/* =====================================================================
   CÁMARA: llaves (cuadro, posición, objetivo, fov) con interpolación suave
   ===================================================================== */
const LLAVES = [
  [0, [16, 30, 25], [0, PISO, 0.5], 30],
  [86, [16, 27, 25], [0, PISO, 0.5], 29],
  [140, [21, 15, 29], [0, 1.0, 0.4], 26],
  [262, [23, 19, 32], [0, 2.8, 0.2], 26],
  [286, [23, 19, 32], [0, 2.8, 0.2], 26],
  [298, [22, 27, 30], [0, 5.8, 0.0], 31.5],
  [362, [22, 27, 30], [0, 5.8, 0.0], 31.5],
  [386, [8, 7, 38], [0.3, 3.9, 0.4], 21],
  [442, [10, 7.8, 38], [0.3, 3.9, 0.4], 21],
  [464, [20, 19, 27], [0.3, 2.7, -0.8], 30.5],
  [548, [21, 21, 27], [0.3, 3.5, -1.0], 32],
  [576, [21, 21, 27], [0.3, 3.5, -1.0], 32],
  [604, [24, 18, 32], [0.4, 4.4, 0.2], 27.5],
  [640, [0.01, 5.6, 92], [0.0, 5.4, 0.0], 12],
  [TOTAL, [0.01, 5.6, 92], [0.0, 5.4, 0.0], 12],
];
const DESPL = MOVIL ? 0 : -0.19;
const ESC_MOVIL = +params.get("escmovil") || 2.22, ARRIBA_MOVIL = +params.get("arribamovil") || 0.2;
function camaraEn(f) {
  let i = 0; while (i < LLAVES.length - 2 && f > LLAVES[i + 1][0]) i++;
  const a = LLAVES[i], b = LLAVES[i + 1], t = suave((f - a[0]) / (b[0] - a[0]));
  const lerp = (u, v) => u.map((x, k) => x + (v[k] - x) * t);
  const pos = lerp(a[1], b[1]), obj = lerp(a[2], b[2]);
  let fov = a[3] + (b[3] - a[3]) * t;
  if (MOVIL) fov = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * ESC_MOVIL) * 180 / Math.PI;
  camara.fov = fov; camara.position.set(...pos); camara.lookAt(...obj);
  if (MOVIL) camara.setViewOffset(ANCHO, ALTO, -ANCHO * 0.065, ALTO * ARRIBA_MOVIL, ANCHO, ALTO);
  else camara.setViewOffset(ANCHO, ALTO, ANCHO * DESPL, 0, ANCHO, ALTO);
  camara.updateProjectionMatrix();
}

/* =====================================================================
   CUADRO f: aplica tiempos, materiales, cortes, desvanecido y cámara
   ===================================================================== */
// todas las superficies se recorren un poco hacia atrás en profundidad: así las líneas que coinciden con sus aristas se ven
for (const m of todosMats) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; m.userData.dw0 = m.depthWrite; Object.assign(m, { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }); }
const cacheTransparente = new Map();
const transparente = m => { let t = cacheTransparente.get(m); if (!t) { t = m.clone(); t.transparent = true; cacheTransparente.set(m, t); } return t; };
function aplicar(f) {
  // topografía: se dibuja de izquierda a derecha, con lomas que se nivelan
  {
    const [t0, t1] = TL.topo, pos = topoGeo.attributes.position, base = topoGeo.userData.base;
    const amp = 1 - suave((f - (t0 + 16)) / 22);
    for (let k = 0; k < pos.count; k++) pos.setY(k, amp * loma(base[k * 3], base[k * 3 + 2]));
    pos.needsUpdate = true;
    topoGeo.setDrawRange(0, Math.floor(pos.count * suave((f - t0) / 22) / 2) * 2);
    lineaTopo.opacity = 0.78 * (1 - suave((f - (TL.plano[0] + 16)) / 28));
    topoLineas.visible = lineaTopo.opacity > 0.01;
    lineaOroTenue.opacity = 0.42 * suave((f - (t0 + 26)) / 16);
    estacas.forEach((e, i) => { const p = suave((f - (t0 + 10 + i * 2)) / 6) * (1 - suave((f - (t1 - 4)) / 8)); e.visible = p > 0; e.scale.y = Math.max(0.001, p); });
  }
  // piezas
  const fundir = [];
  for (const { o, tipo, t0, t1, d } of anims) {
    const p = t1 > t0 ? (f - t0) / (t1 - t0) : (f >= t0 ? 1 : 0), q = salida(p);
    const b = o.userData.base;
    o.position.copy(b.p); o.scale.copy(b.s);
    o.visible = p > 0;
    if (!o.visible) continue;
    if (tipo === "sube") {
      if (o.isLineSegments) o.scale.y = Math.max(0.001, q);
      else { const hh = alto(o) || 1; o.scale.y = Math.max(0.001, q) * b.s.y; o.position.y = b.p.y - hh * b.s.y / 2 * (1 - q); }
    } else if (tipo === "cae") o.position.y = b.p.y + (1 - q) * 1.4;
    else if (tipo === "crece") o.scale.copy(b.s).multiplyScalar(Math.max(0.001, q));
    else if (tipo === "desliza") { o.position.x += (d.dx || 0) * (1 - q); o.position.y += (d.dy || 0) * (1 - q); o.position.z += (d.dz || 0) * (1 - q); }
    else if (tipo === "traza") o.scale.y = Math.max(0.001, q);
    else if (tipo === "aparece") o.scale.copy(b.s).multiplyScalar(0.75 + 0.25 * q);
    else if (tipo === "trazo") { const n = o.geometry.attributes.position.count; o.geometry.setDrawRange(0, Math.floor(n * suave(p) / 2) * 2); }
    else if (tipo === "vierte") {
      const pa = o.geometry.parameters || {}, w = pa.width ?? 1;
      if (pa.width !== undefined && pa.depth !== undefined && pa.depth > pa.width) { o.scale.z = Math.max(0.001, q) * b.s.z; o.position.z = b.p.z - pa.depth * b.s.z / 2 * (1 - q); }
      else { o.scale.x = Math.max(0.001, q) * b.s.x; o.position.x = b.p.x - w * b.s.x / 2 * (1 - q); }
    }
    if (d.funde && p < 1) fundir.push([o, suave(p)]);
    if (o.userData.ocultaEn !== undefined && f >= o.userData.ocultaEn) o.visible = false;
  }
  // relleno: la plataforma sube del fondo de excavación al nivel de terreno; las zapatas siguen a la vista
  // a través del terreno hasta el primer corte, donde se desvanecen sin llamar la atención
  {
    const p = suave((f - TL.relleno[0]) / (TL.relleno[1] - TL.relleno[0]));
    topo.position.y = -PISO * p; plano.position.y = -PISO * p;
    const pc = suave((f - TL.corte1[0]) / (TL.corte1[1] - TL.corte1[0]));
    for (const n of ["zapatas", "dados", "contratrabes"]) G[n].visible = pc < 1;
    G.excavacion.visible = p < 1;
  }
  // la estructura de la ampliación queda encerrada por el acabado: se oculta al terminarlo
  for (const n of ["acero", "triplay", "membrana", "durock"]) G[n].visible = f < TL.basecoat[1] + 4;
  // materiales: base, aplanados por cara en los muros de block, cambios puntuales
  casa.traverse(o => { if (o.isMesh && o.userData.m0) o.material = o.userData.m0; });
  for (const o of murosBlock) {
    const s = o.userData.muro;
    const ext = f >= s.tp ? M.pintura : f >= s.te ? M.estuco : f >= s.tz ? M.zarpeo : s.blk;
    const int = f >= s.ty ? M.yeso : s.blk;
    o.material = caras(s.eje, s.ext, ext, int);
  }
  for (const c of cambios) if (f >= c.t) c.o.material = c.m;
  // cortes en fantasma
  for (const c of CORTES) {
    const { y, gf } = estadoCorte(c, f);
    for (const n of c.grupos) {
      const g = G[n]; g.position.y = y;
      g.userData.aristas.visible = gf > 0.001;
      for (const o of g.children) if (o.isMesh) {
        if (gf >= 0.999) o.material = fantasma;
        else if (gf > 0.001) {
          const conv = m => { const t = transparente(m); t.opacity = (m.userData.op0 ?? 1) * (1 - 0.94 * gf); t.depthWrite = gf < 0.5; return t; };
          o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
        }
      }
      for (const l of g.userData.aristas.children) { const s = l.userData.fuente; l.visible = s.visible; l.position.copy(s.position); l.scale.copy(s.scale); }
    }
    c.gf = gf;
  }
  lineaFantasma.opacity = 0.45 * Math.max(...CORTES.map(c => c.gf));
  // piezas que entran fundiéndose (losas y trabes que bajan)
  for (const [o, a] of fundir) {
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    const t = o.userData.fm || (o.userData.fm = Object.assign(src.clone(), { transparent: true }));
    t.opacity = a; t.depthWrite = a > 0.5; o.material = t;
  }
  // final: la casa se convierte en líneas doradas y luego se desvanecen para el logo
  const pf = suave((f - TL.dorado[0]) / (TL.dorado[1] - TL.dorado[0])), pl = suave((f - TL.desvanece[0]) / (TL.desvanece[1] - TL.desvanece[0]));
  if (pf > 0) construirLineas();
  gLineas.visible = pf > 0 && pl < 1;
  lineaFinal.opacity = Math.min(1, pf * 1.6) * (1 - pl);
  // opacidad deseada por material; "transparent" solo cambia cuando hace falta y entonces se recompila
  const k = 1 - Math.min(1, pf * 1.3);
  const pr = suave((f - TL.relleno[0]) / (TL.relleno[1] - TL.relleno[0]));
  const pc = suave((f - TL.corte1[0]) / (TL.corte1[1] - TL.corte1[0]));
  for (const m of todosMats) {
    let op = m.userData.op0 * k, tr = m.userData.tr0 || k < 1, dw = m.userData.dw0 && k > 0.15;
    if (m === M.terreno) op = 0.62 * suave((f - (TL.topo[0] + 26)) / 16) * (1 - pf);
    if (m === M.excavacion) op *= 1 - pr;
    if (m === M.concretoFresco && pc > 0) { op *= 1 - pc; tr = true; dw = dw && pc < 0.5; }   // zapatas: se van en el corte
    m.opacity = op; m.depthWrite = dw;
    if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
  }
  casa.visible = pf < 0.999;
  lineaOroTenue.opacity *= (1 - pf);
  sombraSuelo.material.opacity = 0.32 * (1 - pf);
  camaraEn(f);
}

window.cuadro = f => { aplicar(f); renderer.render(scene, camara); return true; };
window.TOTAL = TOTAL; window.TL = TL; window.LOGO = LOGO;
// QA de encuadre: caja en pantalla (0..1, y hacia abajo) de todo lo visible en el cuadro f
window.encuadre = (f, sinPlano = false) => {
  aplicar(f); scene.updateMatrixWorld(true); camara.updateMatrixWorld(true);
  const v = new THREE.Vector3(), r = [1e9, -1e9, 1e9, -1e9], box = new THREE.Box3();
  const mide = o => {
    if (!(o.isMesh || o.isLineSegments) || o === sombraSuelo || o === placa) return;
    for (let p = o; p; p = p.parent) if (!p.visible || (sinPlano && p === plano)) return;
    if (o.material === M.terreno || o.material === lineaOroTenue) return;
    if (o.isInstancedMesh) { o.computeBoundingBox(); box.copy(o.boundingBox).applyMatrix4(o.matrixWorld); }
    else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); }
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      v.set(x, y, z).project(camara);
      if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) continue;
      const sx = (v.x + 1) / 2, sy = (1 - v.y) / 2;
      r[0] = Math.min(r[0], sx); r[1] = Math.max(r[1], sx); r[2] = Math.min(r[2], sy); r[3] = Math.max(r[3], sy);
    }
  };
  casa.traverse(mide); gLineas.traverse(mide);
  return r.map(x => +x.toFixed(3));
};
window.cuadro(+params.get("f") || 604);
window.listo = true;
