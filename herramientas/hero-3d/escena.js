/* =====================================================================
   NORTEA · Hero 3D v8 — animación cuadro por cuadro
   ---------------------------------------------------------------------
   Un solo modelo de la vivienda (referencia "opción 4" del propietario).
   Cada pieza tiene su ventana de tiempo; window.cuadro(f) deja la escena
   en el cuadro f (30 fps). Al final la casa se vuelve líneas doradas en
   3D que se recogen por sus aristas hasta un punto; de ahí el sitio traza
   el logo encima del video a partir del cuadro LOGO (cierre-*.json).

   Servicios que cuenta la animación, en orden: proyecto ejecutivo
   (topografía y plano), obra civil (cimentación, firme, estructura,
   block), acabados (zarpeo y estuco por fuera; yeso, porcelanato,
   plafones con luz indirecta, cocina y carpintería por dentro), fachada,
   ampliación en steel framing y área de asador (deck, porcelanato,
   pérgola y cristal).

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
const LOGO = 900;                 // cuadro en que el sitio empieza a trazar el logo
const TOTAL = LOGO + 135;         // 1035 cuadros = 34.5 s

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
const cielo = new THREE.HemisphereLight(0xbfcde0, 0x1a2a3c, 1.0);
scene.add(cielo);
const sol = new THREE.DirectionalLight(0xfff0dc, 2.1);
sol.position.set(-11, 26, 19);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 });
sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02;
scene.add(sol);
const luzRelleno = new THREE.DirectionalLight(0xa9bede, 0.55);
luzRelleno.position.set(20, 8, 14);
scene.add(luzRelleno);

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
// ruido fino para aplanados (zarpeo, estuco, forro): variación muy suave de tono
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
// piedra / mármol en placas: cada placa con su tono, bandas horizontales de veta y junta marcada
function piedra(base, veta, ancho, alto, pieza = [0.6, 1.2]) {
  const cols = Math.max(1, Math.round(ancho / pieza[0])), filas = Math.max(1, Math.round(alto / pieza[1]));
  const W = Math.min(1024, 160 * cols), H = Math.min(1024, Math.max(96, Math.round(W * (filas * pieza[1]) / (cols * pieza[0]))));
  return lienzo(W, H, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const pw = w / cols, ph = h / filas;
    for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) {   // tono propio de cada placa
      const v = (rnd() - 0.5) * 0.22;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(i * pw, j * ph, pw, ph);
      for (let k = 0; k < 7; k++) {   // bandas suaves del travertino
        const y = j * ph + rnd() * ph, e = 1 + rnd() * ph * 0.08, a = (rnd() - 0.5) * 0.16;
        g.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`; g.fillRect(i * pw, y, pw, e);
      }
    }
    for (let i = 0; i < 5200; i++) {
      const v = (rnd() - 0.5) * 0.2;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 9, 1 + rnd() * 2.5);
    }
    for (let i = 0; i < 18 * cols * filas; i++) {
      g.strokeStyle = veta; g.globalAlpha = 0.25 + rnd() * 0.35; g.lineWidth = 0.8 + rnd() * 1.8;
      g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rnd() - 0.2) * 34; y += (rnd() - 0.5) * 22; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1; g.strokeStyle = "rgba(25,24,22,.7)"; g.lineWidth = 2.4;
    for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo(i * pw, 0); g.lineTo(i * pw, h); g.stroke(); }
    for (let j = 1; j < filas; j++) { g.beginPath(); g.moveTo(0, j * ph); g.lineTo(w, j * ph); g.stroke(); }
  });
}
// pieza de porcelanato suelta (la junta la dan las separaciones entre piezas)
function loseta(base, veta) {
  return lienzo(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = (rnd() - 0.5) * 0.06; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 1 + rnd() * 3); }
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = veta; g.globalAlpha = 0.18 + rnd() * 0.2; g.lineWidth = 0.8 + rnd() * 1.6;
      g.beginPath(); const x = rnd() * w, y = rnd() * h; g.moveTo(x, y); g.bezierCurveTo(x + 60, y + 20, x + 120, y - 30, x + 220, y + 15); g.stroke();
    }
    g.globalAlpha = 1; g.strokeStyle = "rgba(40,32,22,.45)"; g.lineWidth = 7; g.strokeRect(0, 0, w, h);   // junta oscura entre piezas
  });
}
// resplandor de una ventana iluminada por dentro: cortina clara con pliegues y luz de techo
const texCortina = lienzo(128, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#fff1d6"); gr.addColorStop(0.55, "#f2c98f"); gr.addColorStop(1, "#b98a55");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 6) { g.fillStyle = `rgba(90,55,20,${0.06 + 0.06 * Math.sin(x * 0.7) ** 2})`; g.fillRect(x, 0, 3, h); }
  g.fillStyle = "rgba(60,38,18,.35)"; g.fillRect(0, h * 0.78, w * 0.45, h * 0.22); g.fillRect(w * 0.62, h * 0.7, w * 0.25, h * 0.3);
});
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
const texTabla = lienzo(64, 512, (g, w, h) => {   // tabla de deck: veta a lo largo
  g.fillStyle = "#94603a"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(${60 + rnd() * 40 | 0},${34 + rnd() * 20 | 0},14,${0.15 + rnd() * 0.22})`; g.lineWidth = 0.8 + rnd() * 1.8;
    const x = rnd() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 3, h * .3, x - 3, h * .6, x + 1, h); g.stroke();
  }
});
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
  concreto: mat({ color: 0xffffff, map: ruido("#87837d", 0.1, 1.2), roughness: 0.92 }),      // gris de obra negra
  concretoFresco: mat({ color: 0x7b7873, roughness: 0.85 }),
  excavacion: mat({ color: 0x0d1c2c, roughness: 1, transparent: true, opacity: 0.85 }),
  relleno: mat({ color: 0xffffff, map: ruido("#5c564d", 0.25, 1.4), roughness: 1 }),          // relleno compactado
  block: mat({ color: 0xffffff, map: texBlock, roughness: 0.95 }),
  zarpeo: mat({ color: 0xffffff, map: ruido("#85807a", 0.22, 1.6), roughness: 1 }),
  estuco: mat({ color: 0xffffff, map: ruido("#eceae4", 0.05, 1), roughness: 0.86 }),        // acabado final exterior
  yeso: mat({ color: 0xf7f7f4, roughness: 0.9 }),
  grisOscuro: mat({ color: 0x2e3236, roughness: 0.5 }),
  antracita: mat({ color: 0x1d2024, roughness: 0.42, metalness: 0.55 }),
  vidrio: mat({ color: 0x101a24, roughness: 0.04, metalness: 0.55, transparent: true, opacity: 0.34 }),
  vidrioBarandal: mat({ color: 0xa9cadb, roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.2, depthWrite: false }),
  calido: mat({ color: 0x1a1008, emissive: 0xffffff, emissiveMap: texCortina, emissiveIntensity: 1.05, roughness: 1 }),
  led: mat({ color: 0xffe2b0, emissive: 0xffd08a, emissiveIntensity: 2.4 }),
  ledTira: mat({ color: 0xffe9c4, emissive: 0xffc77a, emissiveIntensity: 1.8 }),
  madera: mat({ color: 0xffffff, map: texMadera, roughness: 0.55 }),
  maderaPuerta: mat({ color: 0xe8b789, map: texMadera, roughness: 0.42 }),
  deckMadera: mat({ color: 0xffffff, map: texDeckMadera, roughness: 0.6 }),
  galvanizado: mat({ color: 0xc3c9cf, roughness: 0.32, metalness: 0.82 }),
  tablaroca: mat({ color: 0xebeae5, roughness: 0.95 }),
  forro: mat({ color: 0xffffff, map: ruido("#eceae4", 0.05, 1), roughness: 0.84 }),        // Durock con su acabado
  impermeable: mat({ color: 0x4a4e53, roughness: 0.75 }),
  pieza: mat({ color: 0xffffff, map: loseta("#bfb19d", "#8f816c"), roughness: 0.22 }),      // porcelanato 1.20 x 1.20
  piezaTerraza: mat({ color: 0xffffff, map: loseta("#c9c4ba", "#9c968c"), roughness: 0.4 }), // porcelanato de exterior
  tabla: mat({ color: 0xffffff, map: texTabla, roughness: 0.6 }),                           // tabla de deck
  deck: mat({ color: 0xaab0b6, roughness: 0.35, metalness: 0.75, side: THREE.DoubleSide }),
  cocina: mat({ color: 0x2c3035, roughness: 0.45 }),
  cocinaMadera: mat({ color: 0xd8b088, map: texMadera, roughness: 0.5 }),
  cubierta: mat({ color: 0xece9e2, roughness: 0.22 }),
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
const Z_AMP = 1.6;                         // frente de la ampliación de azotea (2/3 del fondo); delante queda el área de asador

/* Muros de block con caras independientes: exterior (zarpeo → estuco) e interior (yeso).
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
/* Luz que baña una superficie (bañador al pie de la piedra) y charco de luz en el piso: planos aditivos */
const texBano = lienzo(64, 128, (g, w, h) => {
  const v = g.createLinearGradient(0, h, 0, 0); v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(0.35, "rgba(255,255,255,.45)"); v.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "destination-in";
  const c = g.createLinearGradient(0, 0, w, 0); c.addColorStop(0, "rgba(0,0,0,.35)"); c.addColorStop(0.5, "rgba(0,0,0,1)"); c.addColorStop(1, "rgba(0,0,0,.35)");
  g.fillStyle = c; g.fillRect(0, 0, w, h);
});
const texCharco = lienzo(64, 64, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.4, "rgba(255,255,255,.45)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});
const brillos = [];   // materiales aditivos: se desvanecen junto con la casa al final
function brillo(tex, intensidad) {
  const m = new THREE.MeshBasicMaterial({ color: 0xffc98a, map: tex, transparent: true, opacity: intensidad, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.userData.op0 = intensidad; brillos.push(m); return m;
}
function destello(g, eje, fijo, a0, a1, y0, y1, intensidad = 0.8) {
  const o = new THREE.Mesh(new THREE.PlaneGeometry(a1 - a0, y1 - y0), brillo(texBano, intensidad));
  if (eje === "x") o.position.set((a0 + a1) / 2, (y0 + y1) / 2, fijo); else { o.position.set(fijo, (y0 + y1) / 2, (a0 + a1) / 2); o.rotation.y = Math.PI / 2; }
  o.userData.m0 = o.material; o.userData.luz = true; o.userData.sinLinea = true; g.add(o); return o;
}
function charco(g, x, y, z, r = 1, intensidad = 0.5) {
  const o = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), brillo(texCharco, intensidad));
  o.rotation.x = -Math.PI / 2; o.position.set(x, y, z);
  o.userData.m0 = o.material; o.userData.luz = true; o.userData.sinLinea = true; g.add(o); return o;
}

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
  topo: [0, 40], plano: [36, 90],
  // cimentación con su tiempo: excavación, armado, zapatas, dados, contratrabes, relleno compactado y colado del firme
  excavacion: [90, 102], armadoZap: [98, 112], zapatas: [106, 122], dados: [116, 130], contratrabes: [126, 146],
  relleno: [144, 168], firme: [166, 190],
  armado1: [184, 194], columnas1: [190, 208], trabes1: [206, 220], losa1: [218, 234],
  muros1: [232, 256],
  armado2: [254, 262], columnas2: [260, 276], trabes2: [274, 288],
  losa2: [286, 302], banda: [300, 312],
  muros2: [310, 334],
  // aplanado exterior de los dos niveles: zarpeo y estuco (acabado final, ya no se pinta después)
  zarpeo: [334, 352], estuco: [348, 368],
  corte1: [368, 384],
  yeso1: [384, 396], piso1: [394, 440], cajillos1: [436, 450], luz1: [448, 456], cocina: [452, 468], carpinteria1: [462, 474], muebles1: [468, 482],
  bajaN2: [482, 496],
  yeso2: [494, 502], piso2: [500, 520], cajillos2: [516, 526], luz2: [524, 530], carpinteria2: [524, 532], muebles2: [528, 538],
  bajaAzotea: [538, 552],
  ventanas: [552, 568], puerta: [564, 574],
  fachada: [572, 646],
  soleras: [662, 670], montantes: [668, 682], esquinas: [678, 686], cerramientos: [682, 690], perimetral: [686, 694],
  bloqueo: [692, 700], contraviento: [698, 704],
  forro: [704, 722],                       // Durock por fuera y tablaroca por dentro, de una sola
  armaduras: [720, 730], polines: [728, 734], deck: [734, 742], cubierta3: [742, 748], ventanas3: [744, 752],
  terraza: [762, 808],
  dorado: [838, 862],                      // la casa se vuelve líneas doradas (de abajo hacia arriba)
  junta: [860, LOGO + 6],                  // las líneas corren por las aristas y se juntan en un punto
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
const gExc = grupo("excavacion"), gArmZ = grupo("armadoZap"), gZap = grupo("zapatas"), gDad = grupo("dados"), gCT = grupo("contratrabes"), gFirme = grupo("firme"), gRell = grupo("relleno");
const exc = [], armZ = [], zap = [], dad = [], ct = [];
const ZAPATAS = COL;   // una zapata por columna estructural (la columna de piedra del volado es forro, no lleva zapata)
for (const [x, z] of ZAPATAS) {
  const r = 0.7;
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
/* Plataforma de desplante en L (la cochera queda a nivel de terreno, sin rampa):
   dala perimetral, relleno compactado por capas y firme de 10 cm colado encima */
const ZF = 3 + h, XF = 1.6 + h, DALA = 0.25, Y_RELL = NIV[0] - 0.1;
const dalas = [
  caja(gFirme, XMIN, XMAX, 0, NIV[0], ZMIN, ZMIN + DALA, M.concreto), caja(gFirme, XMAX - DALA, XMAX, 0, NIV[0], ZMIN + DALA, ZF, M.concreto),
  caja(gFirme, XF - DALA, XMAX - DALA, 0, NIV[0], ZF - DALA, ZF, M.concreto), caja(gFirme, XF - DALA, XF, 0, NIV[0], ZF, ZMAX, M.concreto),
  caja(gFirme, XMIN, XF - DALA, 0, NIV[0], ZMAX - DALA, ZMAX, M.concreto), caja(gFirme, XMIN, XMIN + DALA, 0, NIV[0], ZMIN + DALA, ZMAX - DALA, M.concreto),
];
const TABLEROS = [[XMIN + DALA, XMAX - DALA, ZMIN + DALA, ZF - DALA], [XMIN + DALA, XF - DALA, ZF - DALA, ZMAX - DALA]];
const capasRelleno = [];
for (const [y0, y1] of [[0, 0.12], [0.12, 0.24], [0.24, Y_RELL]])          // relleno en capas compactadas
  for (const [x0, x1, z0, z1] of TABLEROS) capasRelleno.push(caja(gRell, x0, x1, y0, y1, z0, z1, M.relleno, false));
const firmes = TABLEROS.map(([x0, x1, z0, z1]) => caja(gFirme, x0, x1, Y_RELL, NIV[0], z0, z1, M.concreto));
secuencia(exc, "aparece", ...TL.excavacion, 6, o => o.position.x + o.position.z);
secuencia(armZ, "sube", ...TL.armadoZap, 8);
secuencia(zap, "sube", ...TL.zapatas, 8, o => o.position.x - o.position.z);
secuencia(dad, "sube", ...TL.dados, 8, o => o.position.x - o.position.z);
secuencia(ct, "desliza", ...TL.contratrabes, 9, null, { dy: 1.2, funde: true });
secuencia(dalas, "sube", TL.relleno[0] + 4, TL.relleno[0] + 12, 5);
secuencia(capasRelleno, "vierte", TL.relleno[0] + 6, TL.relleno[1], 8, o => o.position.y);   // cada capa se tiende en barrido
secuencia(firmes, "vierte", ...TL.firme, 18);   // colado del firme en barrido sobre el relleno

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
  bandas.push(caja(g, XMIN - 0.02, XMIN + 0.3, NIV[2] - 0.45, NIV[2] + 0.5, Z_AMP + 0.12, 4.9, M.concreto));   // costado izquierdo de la terraza
  bandas.push(caja(g, XMAX - 0.3, XMAX + 0.02, NIV[2] - 0.45, NIV[2] + 0.5, Z_AMP + 0.12, 4.9, M.concreto));   // costado derecho de la terraza
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
  m("x", 5, -0.6, 1.6, y0, y1, T, [[-0.12, 1.13, y0, 3.0]], { ext: 1 });            // acceso: puerta pivotante alta
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

/* Tiempos de aplanado por pieza: zarpeo y estuco por fuera (los dos niveles juntos, alrededor de la casa)
   y yeso por dentro (en el corte). El estuco es el acabado final: ya no hay pintura después. */
const enVentana = ([t0, t1], u) => t0 + u * (t1 - t0 - 4);
for (const o of murosBlock) {
  const u = angulo(o), n2 = o.position.y > NIV[1];
  Object.assign(o.userData.muro, { tz: enVentana(TL.zarpeo, u), te: enVentana(TL.estuco, u), ty: enVentana(n2 ? TL.yeso2 : TL.yeso1, u) });
}
// faldones, bordes de losa, pretil y dala de desplante: mismo aplanado exterior
for (const o of [...bandas, ...G.losa1.children.filter(o => !bandas.includes(o)), ...G.losa2.children, ...dalas]) {
  const u = angulo(o);
  cambia(o, enVentana(TL.zarpeo, u), M.zarpeo);
  cambia(o, enVentana(TL.estuco, u), M.estuco);
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
// porcelanato de gran formato colocado pieza por pieza (las juntas quedan a la vista), del fondo hacia el frente
function piezas(g, x0, x1, z0, z1, y, tam = 1.2, m = M.pieza, junta = 0.014) {
  const out = [];
  for (let x = x0; x < x1 - 0.03; x += tam) for (let z = z0; z < z1 - 0.03; z += tam) {
    const o = caja(g, x + junta / 2, Math.min(x + tam, x1) - junta / 2, y, y + 0.022, z + junta / 2, Math.min(z + tam, z1) - junta / 2, m, false);
    o.userData.sinLinea = true; out.push(o);
  }
  return out;
}
const ordenPieza = o => o.position.z + o.position.x * 0.35;
{
  const g = grupo("interior1"), y = NIV[0], yt = NIV[0] + ALT;
  const pisos = [];
  for (const [x0, x1, z0, z1] of [[XMIN + 0.18, -0.68, ZMIN + 0.18, ZMAX - 0.18], [-0.52, 1.52, HUECO.z1, ZMAX - 0.18], [1.68, XMAX - 0.18, -0.42, 2.9], [1.68, XMAX - 0.18, ZMIN + 0.18, -0.58]])
    pisos.push(...piezas(g, x0, x1, z0, z1, y));
  secuencia(pisos, "coloca", ...TL.piso1, 8, ordenPieza, { funde: true });
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
  // recámaras con duela de madera, circulaciones y baños con porcelanato pieza por pieza
  const duelas = [], pisos = [];
  for (const [x0, x1, z0, z1, m] of [[XMIN + 0.18, -0.68, 0.68, 3.5, 1], [XMIN + 0.18, -0.68, ZMIN + 0.18, 0.52, 1], [1.68, XMAX - 0.18, -0.42, ZMAX - 0.18, 1], [-0.52, 1.52, HUECO.z1, ZMAX - 0.18, 0], [1.68, XMAX - 0.18, ZMIN + 0.18, -0.58, 0]]) {
    if (m) { const o = caja(g, x0, x1, y, y + 0.02, z0, z1, M.deckMadera, false); o.userData.sinLinea = true; duelas.push(o); }
    else pisos.push(...piezas(g, x0, x1, z0, z1, y));
  }
  secuencia(duelas, "vierte", ...TL.piso2, 9);
  secuencia(pisos, "coloca", ...TL.piso2, 6, ordenPieza, { funde: true });
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
  const pu = [caja(g, -0.1, 1.11, NIV[0], 2.98, 4.97, 5.05, M.maderaPuerta), caja(g, 0.9, 0.94, 1.0, 2.5, 5.05, 5.11, M.antracita), caja(g, -0.14, 1.15, 2.98, 3.03, 4.95, 5.1, M.antracita)];
  secuencia(pu, "sube", ...TL.puerta, 6);
}
{
  const g = grupo("fachada");
  const pasos = [];
  const piedraClara = (a, b) => piedra("#b4ada1", "#7d7568", a, b, [0.6, 0.9]);     // travertino claro del acceso
  const piedraOscura = (a, b) => piedra("#55575a", "#a3a3a1", a, b, [0.6, 0.9]);    // piedra gris oscura junto a la puerta
  const piedraColumna = (a, b) => piedra("#a19a8f", "#e2dbd0", a, b, [0.7, 0.45]);  // columna del volado en hiladas
  // 1. piedra: pilastras del acceso y columna del volado (forro de piedra en placas)
  pasos.push(["sube", [texturizada(g, -1.05, -0.15, NIV[0], 3.2, 5.18, 5.42, piedraClara), texturizada(g, 1.16, 1.75, NIV[0], 3.2, 5.18, 5.42, piedraOscura),
    texturizada(g, 4.85, 5.55, 0, 3.2, 6.3, 7.0, piedraColumna)]]);
  // 2. madera: lamas del acceso y del 2º nivel (iluminadas por detrás), plafón del balcón
  const lamas2 = lamas(g, -0.6, 1.55, 3.85, NIV[2] - 0.45, 5.2, 0.15, 0.05, 0.2);
  pasos.push(["sube", [...lamas(g, -1.63, -1.08, NIV[0], 3.0, 5.18, 0.11, 0.05, 0.1), ...lamas2]]);
  // 3. porcelanato gris oscuro de gran formato en el bloque derecho del 2º nivel
  const gris = (a, b) => porcelanato("#3e4247", "#2a2d31", a, b, [0.6, 1.2], 0.3);
  pasos.push(["sube", [texturizada(g, 3.3, 5.46, 3.85, 6.6, 5.18, 5.45, gris), texturizada(g, 5.18, 5.46, 3.85, 6.6, 2.6, 5.18, gris)]]);
  // 4. volado gris oscuro de la cochera con plafón de madera y luminarias
  const vol = [caja(g, -1.1, 5.75, 3.2, 3.7, 5.18, 7.0, M.grisOscuro), caja(g, 1.6, 5.75, 3.2, 3.7, 3.0, 5.18, M.grisOscuro),
    caja(g, -1.0, 5.65, 3.17, 3.2, 5.2, 6.9, M.madera, false), caja(g, 1.6, 5.65, 3.17, 3.2, 3.05, 5.2, M.madera, false)];
  pasos.push(["desliza", vol, { dz: 1.0, funde: true }]);
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
  for (const [x0, x1, z] of [[-1.0, -0.2, 5.44], [1.2, 1.7, 5.44], [4.9, 5.5, 7.02]]) anima(caja(luces, x0, x1, 0.02, 0.05, z, z + 0.02, M.led, false), "aparece", fin - 4, fin + 2);
  // bañado de luz cálida sobre la piedra (de abajo hacia arriba) y charcos de luz bajo las luminarias
  for (const [x0, x1, z, y0, y1] of [[-1.05, -0.15, 5.425, NIV[0], 3.2], [1.16, 1.75, 5.425, NIV[0], 3.2], [4.85, 5.55, 7.005, 0, 3.2]])
    anima(destello(luces, "x", z, x0, x1, y0, y1, 0.85), "aparece", fin - 4, fin + 4, { funde: true });
  for (const [x, z] of [[-0.2, 6.1], [1.0, 6.1], [2.4, 6.1], [3.6, 6.1], [4.6, 6.1], [2.6, 4.1], [4.2, 4.1]]) anima(charco(luces, x, 0.045, z, 1.1, 0.5), "aparece", fin - 4, fin + 4, { funde: true });
}
{
  // jardín: pastos, agaves y arbustos en la jardinera (sin árbol)
  const g = grupo("jardin"), p = [];
  for (let i = 0; i < 7; i++) {
    const x = -5.3 + i * 0.6, z = 6.1 + (i % 2 ? 0.25 : -0.2);
    p.push(i % 3 === 1 ? briznas(g, x, 0.46, z, { n: 26, altoB: 0.55, ancho: 0.09, abre: 0.5, color: 0x6f9a84, agave: true }) : briznas(g, x, 0.46, z, { n: 46, altoB: 0.7, color: 0x6c8e45 }));
  }
  p.push(arbusto(g, -2.0, 0.46, 6.15, 0.3), arbusto(g, -4.9, 0.46, 6.2, 0.32));
  p.push(briznas(g, 5.15, 0.04, 2.7, { n: 22, altoB: 0.6, ancho: 0.09, abre: 0.5, color: 0x6f9a84, agave: true }), arbusto(g, 1.9, 0.0, 6.9, 0.28));
  secuencia(p, "crece", TL.fachada[1] - 18, TL.fachada[1], 6);
}
for (const o of luces.children) if (o.userData.luz && !anims.some(a => a.o === o)) anima(o, "aparece", TL.fachada[1] - 10, TL.fachada[1]);

/* =====================================================================
   8. AMPLIACIÓN 3er NIVEL — steel framing a todo lo ancho y 2/3 del fondo (x -5..5, z -5.5..1.6)
   Estructura de perfiles galvanizados; forro exterior (Durock con su acabado) y tablaroca por
   dentro de una sola; cubierta de lámina. El tercio del frente queda como área de asador.
   ===================================================================== */
const A = { x0: -5, x1: 5, z0: -5.5, z1: Z_AMP, y0: NIV[2], y1: NIV[2] + 2.7 };
const Y_CUB = A.y1 + 0.47;                 // cara superior de la cubierta (armadura + polín + lámina)
const Y_PRE = Y_CUB + 0.43;                // remate del pretil
const PG = 0.61;
const VANOS3 = {
  "x:1.6": [[-3.9, -1.3, A.y0, A.y0 + 2.4], [0.9, 3.9, A.y0 + 0.35, A.y0 + 2.4]],   // frente: corrediza a la terraza y ventanal
  "z:5": [[-3.4, -1.0, A.y0 + 0.95, A.y0 + 2.25]],
  "x:-5.5": [[-3.6, -1.6, A.y0 + 0.95, A.y0 + 2.25], [1.8, 3.8, A.y0 + 0.95, A.y0 + 2.25]],
  "z:-5": [[-3.6, -1.6, A.y0 + 0.95, A.y0 + 2.25]],
};
const MUROS3 = [["x", A.z1, A.x0, A.x1, VANOS3["x:1.6"], 1], ["x", A.z0, A.x0, A.x1, VANOS3["x:-5.5"], -1],
  ["z", A.x1, A.z0, A.z1, VANOS3["z:5"], 1], ["z", A.x0, A.z0, A.z1, VANOS3["z:-5"], -1]];
const ACERO = { soleras: [], anclas: [], montantes: [], esquinas: [], cerramientos: [], perimetral: [], bloqueo: [], contraviento: [], armaduras: [], polines: [] };
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
  // armadura perimetral superior (cuerda superior = canal superior) y montantes del pretil encima
  armadura(ACERO.perimetral, eje, fijo, a0, a1, y1 - HT, y1 - 0.02, true, 0.61);
  perfil(ACERO.perimetral, P(eje, fijo, a0, Y_PRE - 0.02), P(eje, fijo, a1, Y_PRE - 0.02), 0.09, 0.04);
  for (let a = a0 + 0.03; a <= a1 - 0.02; a += PG) perfil(ACERO.perimetral, P(eje, fijo, a, y1), P(eje, fijo, a, Y_PRE - 0.04));
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
}
// armaduras de cubierta en el sentido corto (z) a cada 1.22 m y polines que reciben la lámina
for (let x = A.x0 + 0.1; x <= A.x1 - 0.05; x += 1.22) {
  const yb = A.y1, yt = A.y1 + 0.3, n = 12;
  perfil(ACERO.armaduras, new THREE.Vector3(x, yb, A.z0), new THREE.Vector3(x, yb, A.z1), 0.04, 0.09, gCub);
  perfil(ACERO.armaduras, new THREE.Vector3(x, yt, A.z0), new THREE.Vector3(x, yt, A.z1), 0.04, 0.09, gCub);
  for (let i = 0; i < n; i++) {
    const za = A.z0 + (A.z1 - A.z0) * i / n, zb = A.z0 + (A.z1 - A.z0) * (i + 1) / n;
    perfil(ACERO.armaduras, new THREE.Vector3(x, i % 2 ? yt : yb, za), new THREE.Vector3(x, i % 2 ? yb : yt, zb), 0.03, 0.06, gCub);
  }
}
for (let z = A.z0 + 0.05; z <= A.z1 - 0.04; z += 1.18) perfil(ACERO.polines, new THREE.Vector3(A.x0, A.y1 + 0.34, z), new THREE.Vector3(A.x1, A.y1 + 0.34, z), 0.06, 0.1, gCub);
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
/* Forro de una sola: Durock con su acabado por fuera (piedra clara en placas al frente y al costado derecho,
   como la referencia; blanco en los otros lados) y tablaroca por dentro, al mismo tiempo, muro por muro */
{
  const gF = grupo("forro"), gT = grupo("tablaroca"), ext = [], int = [];
  const clara = (a, b) => piedra("#d9d3c8", "#a9a296", a, b, [1.2, 0.6]);
  const OFF = 0.075;
  for (const [eje, fijo, a0, a1, vanos, lado] of MUROS3) {
    const conPiedra = (eje === "x" && fijo === A.z1) || (eje === "z" && fijo === A.x1);
    for (const o of hojas(gF, eje, fijo, a0 - OFF, a1 + OFF, A.y0, Y_PRE, vanos, lado * OFF, 0.016, M.forro, conPiedra)) {
      if (conPiedra) { const p = o.geometry.parameters, L = Math.max(p.width, p.depth); o.material = o.userData.m0 = mat({ map: clara(L, p.height), roughness: 0.4 }); }
      ext.push(o);
    }
    // cara interior del pretil (sobre la cubierta) con el mismo acabado y su remate
    ext.push(...hojas(gF, eje, fijo, a0 + 0.06, a1 - 0.06, A.y1, Y_PRE, [], -lado * 0.06, 0.02, M.forro, true));
    ext.push(eje === "x" ? caja(gF, a0 - 0.1, a1 + 0.1, Y_PRE, Y_PRE + 0.05, fijo - 0.11, fijo + 0.11, M.antracita) : caja(gF, fijo - 0.11, fijo + 0.11, Y_PRE, Y_PRE + 0.05, a0 - 0.1, a1 + 0.1, M.antracita));
    int.push(...hojas(gT, eje, fijo, a0 + 0.06, a1 - 0.06, A.y0, A.y1, vanos, -lado * 0.052, 0.0127, M.tablaroca));
  }
  const orden = o => Math.atan2(o.position.z + 2, o.position.x) + o.position.y * 0.05;
  secuencia(ext, "desliza", ...TL.forro, 5, orden, { dy: 0.5, funde: true });
  secuencia(int, "desliza", ...TL.forro, 5, orden, { dy: 0.5, funde: true });
}
{
  // lámina en hojas de 0.915 m sobre los polines e impermeabilizante con su remate
  const onda = 0.305, altoD = 0.064, ancho = 0.915, largo = A.z1 - A.z0;
  const forma = new THREE.Shape();
  forma.moveTo(0, 0);
  for (let x = 0; x < ancho - 1e-6; x += onda) { forma.lineTo(x + 0.06, 0); forma.lineTo(x + 0.1, altoD); forma.lineTo(x + 0.2, altoD); forma.lineTo(x + 0.24, 0); forma.lineTo(Math.min(x + onda, ancho), 0); }
  forma.lineTo(ancho, -0.003); forma.lineTo(0, -0.003); forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, { depth: largo, bevelEnabled: false });
  geo.translate(0, 0, -largo);
  const laminas = [];
  for (let x = A.x0; x < A.x1 - 0.01; x += ancho) {
    const d = new THREE.Mesh(geo, M.deck); d.position.set(x, A.y1 + 0.39, A.z1);
    d.scale.x = Math.min(ancho, A.x1 - x) / ancho;
    d.castShadow = d.receiveShadow = true; d.userData.m0 = M.deck; gCub.add(d); laminas.push(d);
  }
  secuencia(laminas, "desliza", ...TL.deck, 5, o => o.position.x, { dz: -5 });
  const imp = caja(gCub, A.x0 + 0.05, A.x1 - 0.05, A.y1 + 0.39 + altoD, Y_CUB, A.z0 + 0.05, A.z1 - 0.05, M.impermeable);
  anima(imp, "vierte", ...TL.cubierta3);
}
{
  // cancelería e interior de la ampliación: piso, cajillos con luz indirecta (se ven antes de cerrar la cubierta)
  const g = grupo("ampliacion"), y0 = A.y0, luz = grupo("luces3");
  const v = [
    ...ventana(g, "x", A.z1 + 0.09, -3.9, -1.3, y0, y0 + 2.4, { divisiones: 2, luz }),
    ...ventana(g, "x", A.z1 + 0.09, 0.9, 3.9, y0 + 0.35, y0 + 2.4, { divisiones: 3, luz }),
    ...ventana(g, "z", A.x1 + 0.09, -3.4, -1.0, y0 + 0.95, y0 + 2.25, { luz }),
    ...ventana(g, "z", A.x0 - 0.09, -3.6, -1.6, y0 + 0.95, y0 + 2.25, { cara: -1, luz }),
    ...ventana(g, "x", A.z0 - 0.09, -3.6, -1.6, y0 + 0.95, y0 + 2.25, { cara: -1, luz }),
    ...ventana(g, "x", A.z0 - 0.09, 1.8, 3.8, y0 + 0.95, y0 + 2.25, { cara: -1, luz }),
  ];
  secuencia(v, "crece", ...TL.ventanas3, 4, o => o.position.x);
  const gi = grupo("interior3");
  const pz = piezas(gi, A.x0 + 0.1, A.x1 - 0.1, A.z0 + 0.1, A.z1 - 0.1, A.y0);
  secuencia(pz, "coloca", TL.forro[0] + 4, TL.forro[1] + 2, 5, ordenPieza, { funde: true });
  const caj = cajillos(gi, A.x0 + 0.1, A.x1 - 0.1, A.z0 + 0.1, A.z1 - 0.1, A.y1);
  secuencia(caj.p, "cae", TL.forro[1] - 4, TL.armaduras[0] + 4, 3);
  secuencia(caj.l, "aparece", TL.armaduras[0] + 2, TL.armaduras[0] + 8, 3);
  for (const o of luz.children) anima(o, "aparece", TL.terraza[1] - 6, TL.terraza[1]);
}
{
  // área de asador en el tercio del frente: porcelanato en toda la terraza, barandal de cristal,
  // deck de madera tabla por tabla bajo la pérgola, asador con barra, comedor y macetas
  const g = grupo("terraza"), y = NIV[2], [t0, t1] = TL.terraza;
  const zt0 = A.z1 + 0.1, zt1 = 4.9, xt0 = XMIN + 0.3, xt1 = XMAX - 0.3;
  const pis = [];
  for (let x = xt0; x < xt1 - 0.03; x += 1.2) for (let z = zt0; z < zt1 - 0.03; z += 0.6) {
    const o = caja(g, x + 0.007, Math.min(x + 1.2, xt1) - 0.007, y, y + 0.022, z + 0.007, Math.min(z + 0.6, zt1) - 0.007, M.piezaTerraza, false);
    o.userData.sinLinea = true; pis.push(o);
  }
  secuencia(pis, "coloca", t0, t0 + 14, 5, o => o.position.x + o.position.z * 0.5, { funde: true });
  const bar = [...barandalVidrio(g, "x", 5.2, XMIN + 0.05, XMAX - 0.05, y + 0.5, 0.55),
    ...barandalVidrio(g, "z", XMIN + 0.15, zt0 + 0.05, 5.2, y + 0.5, 0.55), ...barandalVidrio(g, "z", XMAX - 0.15, zt0 + 0.05, 5.2, y + 0.5, 0.55)];
  secuencia(bar, "crece", t0 + 10, t0 + 18, 5);
  // deck: tablas de 14 cm con separación, de izquierda a derecha
  const dk = [], tonos = [M.tabla, mat({ color: 0xe9d9c6, map: texTabla, roughness: 0.6 }), mat({ color: 0xf6e7d2, map: texTabla, roughness: 0.6 })];
  for (let x = -4.82, i = 0; x < -0.62; x += 0.15, i++) {
    const o = caja(g, x, x + 0.14, y + 0.03, y + 0.07, zt0 + 0.05, zt1 - 0.08, tonos[(i * 7) % 3], false);
    o.userData.sinLinea = true; dk.push(o);
  }
  secuencia(dk, "desliza", t0 + 14, t0 + 32, 5, o => o.position.x, { dz: -1.2, funde: true });
  // pérgola: postes al frente, vigas ancladas a la ampliación y lamas de madera
  const yp = y + 2.75, per = [];
  for (const [x, z] of [[-4.62, 4.55], [-0.95, 4.55]]) per.push(caja(g, x - 0.06, x + 0.06, y, yp, z - 0.06, z + 0.06, M.antracita));
  per.push(caja(g, -4.7, -0.85, yp - 0.22, yp, 4.49, 4.61, M.antracita), caja(g, -4.7, -0.85, yp - 0.22, yp, zt0, zt0 + 0.12, M.antracita),
    caja(g, -4.68, -4.56, yp - 0.22, yp, zt0, 4.61, M.antracita), caja(g, -1.0, -0.88, yp - 0.22, yp, zt0, 4.61, M.antracita));
  for (let x = -4.55; x <= -1.05; x += 0.25) per.push(caja(g, x, x + 0.06, yp, yp + 0.14, zt0, 4.75, M.madera));
  secuencia(per, "cae", t0 + 26, t1 - 10, 4, o => o.position.x);
  for (const [x, z] of [[-3.6, 2.6], [-2.0, 2.6], [-3.6, 3.9], [-2.0, 3.9]]) anima(downlight(g, x, yp - 0.22, z), "aparece", t1 - 6, t1);
  // asador junto al pretil derecho: barra de porcelanato oscuro, asador empotrado, tarja y bancos
  const gris = (a, b) => porcelanato("#3c4045", "#2a2d31", a, b, [0.6, 0.6], 0.3);
  const asa = [texturizada(g, 4.2, 4.82, y, y + 0.92, 1.9, 4.6, gris), caja(g, 4.15, 4.86, y + 0.92, y + 0.96, 1.85, 4.65, M.cubierta),
    caja(g, 4.3, 4.72, y + 0.96, y + 1.12, 2.2, 3.1, M.acero), caja(g, 4.33, 4.69, y + 1.12, y + 1.15, 2.25, 3.05, M.antracita), caja(g, 4.33, 4.69, y + 0.93, y + 0.97, 3.7, 4.2, M.acero)];
  for (const z of [2.4, 3.2, 4.0]) asa.push(caja(g, 3.55, 3.85, y, y + 0.75, z - 0.15, z + 0.15, M.antracita));
  asa.push(caja(g, 0.9, 2.7, y + 0.74, y + 0.78, 2.7, 3.7, M.madera), caja(g, 1.7, 1.9, y, y + 0.74, 3.1, 3.3, M.antracita));
  for (const cx of [1.25, 2.35]) for (const cz of [2.35, 4.05]) asa.push(caja(g, cx - 0.2, cx + 0.2, y, y + 0.45, cz - 0.2, cz + 0.2, M.antracita));
  asa.push(caja(g, -4.3, -2.2, y + 0.1, y + 0.5, 2.0, 2.8, M.tela), caja(g, -4.3, -2.2, y + 0.5, y + 0.85, 2.0, 2.22, M.tela), caja(g, -4.3, -3.5, y + 0.1, y + 0.5, 2.8, 4.1, M.tela), caja(g, -3.0, -2.1, y + 0.1, y + 0.42, 3.2, 4.0, M.madera));
  asa.forEach(o => { o.userData.sinLinea = true; });
  for (const [x, z, r] of [[-4.55, 4.5, 0.3], [0.1, 4.55, 0.26], [3.3, 4.55, 0.26]]) {
    asa.push(...maceta(g, x, y, z, r * 0.9, 0.5));
    asa.push(arbusto(g, x, y + 0.5, z, r));
  }
  secuencia(asa, "cae", t0 + 30, t1, 4);
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
   LÍNEAS DORADAS DEL FINAL (capa 2D encima del render, proyectada desde 3D):
   la casa se vuelve líneas doradas de abajo hacia arriba; luego las líneas corren por sus
   propias aristas, como gusanos, y se juntan en la esquina superior de la ampliación (ANCLA).
   En ese punto de la pantalla empieza la línea con la que el sitio traza el logo
   (cierre-*.json: mismo grosor, halo y cabeza que se dibujan aquí).
   ===================================================================== */
const DPR = +params.get("dpr") || 1;
const capa2d = document.createElement("canvas");
capa2d.width = ANCHO * DPR; capa2d.height = ALTO * DPR;
const g2 = capa2d.getContext("2d");
// se pinta en 2D y se compone encima del render como textura de pantalla completa
const texCapa = new THREE.CanvasTexture(capa2d);
texCapa.colorSpace = THREE.SRGBColorSpace; texCapa.generateMipmaps = false; texCapa.minFilter = THREE.LinearFilter;
const escenaCapa = new THREE.Scene(), camCapa = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
{
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: texCapa, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  q.position.z = -0.5; escenaCapa.add(q);
}
let capaActiva = false;
const CIERRE = MOVIL ? { W: 1080, x: 460.7, y: 347.61 } : { W: 1920, x: 1224.03, y: 371.1 };   // camino[0] del cierre
const ESC2D = ANCHO / CIERRE.W;
const ANCLA = new THREE.Vector3(A.x0 - 0.09, Y_PRE + 0.05, A.z1 + 0.09);
const WIRE = [];
{
  const s = (a, b) => WIRE.push([a, b]);
  const prisma = (c, y0, y1) => { for (let i = 0; i < c.length; i++) { const [xa, za] = c[i], [xb, zb] = c[(i + 1) % c.length]; s([xa, y0, za], [xb, y0, zb]); s([xa, y1, za], [xb, y1, zb]); s([xa, y0, za], [xa, y1, za]); } };
  const cj = (x0, x1, y0, y1, z0, z1) => prisma([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1);
  const rc = (eje, fijo, a0, a1, y0, y1, divs = 0) => {
    const p = (a, y) => eje === "x" ? [a, y, fijo] : [fijo, y, a];
    s(p(a0, y0), p(a1, y0)); s(p(a1, y0), p(a1, y1)); s(p(a1, y1), p(a0, y1)); s(p(a0, y1), p(a0, y0));
    for (let i = 1; i < divs; i++) { const a = a0 + (a1 - a0) * i / divs; s(p(a, y0), p(a, y1)); }
  };
  const rh = (x0, x1, z0, z1, y) => { s([x0, y, z0], [x1, y, z0]); s([x1, y, z0], [x1, y, z1]); s([x1, y, z1], [x0, y, z1]); s([x0, y, z1], [x0, y, z0]); };
  prisma([[XMIN, ZMIN], [XMAX, ZMIN], [XMAX, ZF], [XF, ZF], [XF, ZMAX], [XMIN, ZMAX]], 0, NIV[0]);                       // plataforma
  prisma([[XMIN, ZMIN], [XMAX, ZMIN], [XMAX, 3.1], [XF, 3.1], [XF, ZMAX], [XMIN, ZMAX]], NIV[0], NIV[1]);                // planta baja
  prisma([[XMIN, ZMIN], [XMAX, ZMIN], [XMAX, ZMAX], [-0.6, ZMAX], [-0.6, 3.7], [-4.85, 3.7], [-4.85, ZMAX], [XMIN, ZMAX]], NIV[1], NIV[2]);   // 2º nivel y balcón
  cj(XMIN, -1.1, 3.25, 3.9, 4.84, 5.5);                                                       // faldón bajo el balcón
  cj(XMIN - 0.02, XMAX + 0.02, NIV[2] - 0.45, NIV[2] + 0.5, 4.9, 5.5);                        // remate del frente
  cj(XMIN - 0.02, XMIN + 0.3, NIV[2] - 0.45, NIV[2] + 0.5, Z_AMP + 0.12, 4.9);
  cj(XMAX - 0.3, XMAX + 0.02, NIV[2] - 0.45, NIV[2] + 0.5, Z_AMP + 0.12, 4.9);
  prisma([[-1.1, 5.18], [1.6, 5.18], [1.6, 3.0], [5.75, 3.0], [5.75, 7.0], [-1.1, 7.0]], 3.2, 3.7);   // volado de la cochera
  cj(4.85, 5.55, 0, 3.2, 6.3, 7.0);                                                           // columna de piedra
  cj(-1.05, -0.15, NIV[0], 3.2, 5.18, 5.42); cj(1.16, 1.75, NIV[0], 3.2, 5.18, 5.42);         // pilastras de piedra
  rc("x", 5.06, -0.1, 1.11, NIV[0], 2.98);                                                    // puerta
  rc("x", ZMAX, -4.33, -1.63, 0.6, 2.95, 2);                                                  // ventanal de sala
  rc("x", 3.1, 3.1, 4.85, NIV[0], 2.95, 3); rc("x", 3.1, 1.95, 2.85, NIV[0], 2.95);           // comedor bajo el volado
  rc("x", 3.7, -4.6, -0.9, NIV[1], 6.45, 3);                                                  // ventanal del balcón
  s([-4.85, NIV[1] + 1.1, 5.3], [-1.15, NIV[1] + 1.1, 5.3]);                                  // barandal del balcón
  rc("x", 5.4, -0.6, 1.55, 3.85, 6.6, 7);                                                     // lamas
  rc("x", ZMAX, 2.15, 3.25, 3.95, 6.4, 2);                                                    // ventana del 2º nivel
  rc("x", 5.45, 3.3, 5.46, 3.85, 6.6); rc("x", 5.47, 3.7, 4.9, 5.4, 6.2);                     // porcelanato oscuro y su ventana
  rc("z", XMAX, -3.6, -1.6, 1.2, 2.5); rc("z", XMAX, -3.6, -1.6, 4.6, 5.9); rc("z", XMAX, 0.8, 1.6, 3.95, 6.4);   // costado derecho
  cj(A.x0 - 0.09, A.x1 + 0.09, A.y0, Y_PRE + 0.05, A.z0 - 0.09, A.z1 + 0.09);                 // ampliación
  rc("x", A.z1 + 0.09, -3.9, -1.3, A.y0, A.y0 + 2.4, 2); rc("x", A.z1 + 0.09, 0.9, 3.9, A.y0 + 0.35, A.y0 + 2.4, 3);
  rc("z", A.x1 + 0.09, -3.4, -1.0, A.y0 + 0.95, A.y0 + 2.25);
  const yb = NIV[2] + 1.05;                                                                   // barandal de cristal de la terraza
  s([XMIN + 0.05, yb, 5.2], [XMAX - 0.05, yb, 5.2]); s([XMIN + 0.15, yb, A.z1 + 0.15], [XMIN + 0.15, yb, 5.2]); s([XMAX - 0.15, yb, A.z1 + 0.15], [XMAX - 0.15, yb, 5.2]);
  const yp = NIV[2] + 2.75;                                                                   // pérgola
  s([-4.62, NIV[2], 4.55], [-4.62, yp, 4.55]); s([-0.95, NIV[2], 4.55], [-0.95, yp, 4.55]); rh(-4.7, -0.85, A.z1 + 0.1, 4.61, yp);
  for (const x of [-4.3, -3.55, -2.8, -2.05, -1.3]) s([x, yp + 0.14, A.z1 + 0.1], [x, yp + 0.14, 4.75]);
  cj(4.15, 4.86, NIV[2], NIV[2] + 0.96, 1.85, 4.65);                                          // barra del asador
  cj(-1.45, 1.5, 0, 0.15, 5.18, 6.28); cj(-1.45, 1.5, 0.15, 0.3, 5.18, 5.93); cj(-1.45, 1.5, 0.3, 0.45, 5.18, 5.58);   // escalones
  cj(-5.6, -1.6, 0, 0.5, 5.5, 6.7);                                                           // jardinera
}
/* Grafo de aristas: vértices unidos a 1 cm, aristas partidas donde otra llega a media arista,
   piezas sueltas unidas a la principal por su puente más corto; distancia por aristas al ANCLA */
const RED = (() => {
  const v3 = p => new THREE.Vector3(...p);
  const extremos = WIRE.flat().map(v3), partes = [];
  for (const [a, b] of WIRE) {
    const pa = v3(a), d = v3(b).sub(pa), L = d.length(); d.divideScalar(L);
    const cortes = [0, L];
    for (const p of extremos) { const t = p.clone().sub(pa).dot(d); if (t > 0.02 && t < L - 0.02 && p.distanceTo(pa.clone().addScaledVector(d, t)) < 0.02) cortes.push(t); }
    cortes.sort((x, y) => x - y);
    for (let i = 1; i < cortes.length; i++) if (cortes[i] - cortes[i - 1] > 0.01) partes.push([pa.clone().addScaledVector(d, cortes[i - 1]), pa.clone().addScaledVector(d, cortes[i])]);
  }
  const nodos = [], idx = new Map(), aristas = [], vistas = new Set();
  const nodo = p => { const k = [p.x, p.y, p.z].map(c => Math.round(c * 100)).join(","); if (!idx.has(k)) { idx.set(k, nodos.length); nodos.push(p.clone()); } return idx.get(k); };
  for (const [a, b] of partes) {
    const i = nodo(a), j = nodo(b); if (i === j) continue;
    const k = i < j ? i + "-" + j : j + "-" + i; if (vistas.has(k)) continue;
    vistas.add(k); aristas.push({ i, j, L: nodos[i].distanceTo(nodos[j]), puente: false });
  }
  const ancla = nodo(ANCLA);
  // componentes con unión-búsqueda; se van uniendo a la del ancla por el par de nodos más cercano
  const padre = nodos.map((_, i) => i), raiz = i => padre[i] === i ? i : (padre[i] = raiz(padre[i]));
  for (const e of aristas) padre[raiz(e.i)] = raiz(e.j);
  for (;;) {
    const r0 = raiz(ancla), dentro = [], fuera = [];
    nodos.forEach((_, i) => (raiz(i) === r0 ? dentro : fuera).push(i));
    if (!fuera.length) break;
    let mejor = [1e9, -1, -1];
    for (const i of fuera) for (const j of dentro) { const d = nodos[i].distanceTo(nodos[j]); if (d < mejor[0]) mejor = [d, i, j]; }
    aristas.push({ i: mejor[1], j: mejor[2], L: mejor[0], puente: true });
    padre[raiz(mejor[1])] = raiz(mejor[2]);
  }
  // distancias por aristas desde el ancla (Dijkstra simple)
  const ady = nodos.map(() => []);
  for (const e of aristas) { ady[e.i].push([e.j, e.L]); ady[e.j].push([e.i, e.L]); }
  const dist = nodos.map(() => Infinity), hecho = nodos.map(() => false); dist[ancla] = 0;
  for (let n = 0; n < nodos.length; n++) {
    let u = -1; for (let i = 0; i < nodos.length; i++) if (!hecho[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break; hecho[u] = true;
    for (const [w, L] of ady[u]) if (dist[u] + L < dist[w]) dist[w] = dist[u] + L;
  }
  return { nodos, aristas, dist, rmax: Math.max(...dist), ytope: Math.max(...nodos.map(p => p.y)) };
})();
const LARGO_GUSANO = [1.4, 6.0];   // metros de línea brillante: crece mientras se van juntando
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3(), _pp = new THREE.Vector3();
function aPantalla(p) { _pp.copy(p).project(camara); return [(_pp.x + 1) / 2 * ANCHO * DPR, (1 - _pp.y) / 2 * ALTO * DPR, _pp.z]; }
function dibujarLineas(f) {
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, capa2d.width, capa2d.height);
  capaActiva = f >= TL.dorado[0] && f <= TL.junta[1] + 2;
  if (!capaActiva) return;
  texCapa.needsUpdate = true;
  const pd = suave((f - TL.dorado[0]) / (TL.dorado[1] - TL.dorado[0]));
  const yScan = -0.3 + pd * (RED.ytope + 0.6);
  const pj = (f - TL.junta[0]) / (TL.junta[1] - TL.junta[0]);
  const R = pj <= 0 ? Infinity : RED.rmax * (1 - suave(pj)) + 0.0001;
  const lw = LARGO_GUSANO[0] + (LARGO_GUSANO[1] - LARGO_GUSANO[0]) * Math.min(1, Math.max(0, pj));
  const { nodos, aristas, dist } = RED;
  const tramos = [], gusanos = [], cabezas = [];
  const punto = (e, s) => _pa.copy(nodos[e.i]).lerp(nodos[e.j], e.L ? s / e.L : 0).clone();
  for (const e of aristas) {
    const di = dist[e.i], dj = dist[e.j], L = e.L, sm = Math.min(L, Math.max(0, (dj + L - di) / 2));
    // parte visible: lo que está a distancia <= R del ancla, recortado por la altura del barrido
    if (!e.puente) {
      const vis = [];
      if (R > di) vis.push([0, Math.min(sm, R - di)]);
      if (R > dj) vis.push([Math.max(sm, L - (R - dj)), L]);
      for (const [s0, s1] of vis) {
        if (s1 - s0 < 0.005) continue;
        let a = punto(e, s0), b = punto(e, s1);
        if (a.y > yScan && b.y > yScan) continue;
        if (a.y > yScan) a = a.lerp(b, (a.y - yScan) / (a.y - b.y));
        else if (b.y > yScan) b = b.lerp(a, (b.y - yScan) / (b.y - a.y));
        tramos.push([a, b]);
      }
    }
    // tramo brillante (gusano): la línea que se va recogiendo, de distancia R - lw a R
    if (R === Infinity) continue;
    const gi = [Math.max(0, R - lw - di), Math.min(sm, R - di)], gj = [Math.max(sm, L - (R - dj)), Math.min(L, L - (R - lw - dj))];
    if (gi[1] - gi[0] > 0.005) { gusanos.push([punto(e, gi[0]), punto(e, gi[1])]); if (R - lw - di >= 0 && R - lw - di <= sm) cabezas.push(punto(e, R - lw - di)); }
    if (gj[1] - gj[0] > 0.005) { gusanos.push([punto(e, gj[0]), punto(e, gj[1])]); const s = L - (R - lw - dj); if (s >= sm && s <= L) cabezas.push(punto(e, s)); }
  }
  if (R - lw < 0 && R > 0) cabezas.push(ANCLA.clone());
  // líneas doradas finas con profundidad (las de atrás más tenues)
  const cam = camara.position, dists = tramos.map(([a, b]) => _pb.copy(a).add(b).multiplyScalar(0.5).distanceTo(cam));
  const dmin = Math.min(...dists, 1e9), dmax = Math.max(...dists, -1e9);
  const orden = tramos.map((t, i) => i).sort((p, q) => dists[q] - dists[p]);
  g2.lineCap = "round"; g2.lineJoin = "round";
  const alfaFin = (1 - suave((f - (TL.junta[1] - 4)) / 6)) * (1 - 0.3 * suave(pj * 2));   // las finas ceden un poco ante los gusanos
  for (const i of orden) {
    const [a, b] = tramos[i], A2 = aPantalla(a), B2 = aPantalla(b);
    const k = dmax > dmin ? (dists[i] - dmin) / (dmax - dmin) : 0;
    g2.strokeStyle = `rgba(214,174,92,${(0.95 - 0.55 * k) * alfaFin})`; g2.lineWidth = 1.35 * DPR * Math.max(ESC2D, 0.8);
    g2.beginPath(); g2.moveTo(A2[0], A2[1]); g2.lineTo(B2[0], B2[1]); g2.stroke();
  }
  if (!gusanos.length) return;
  // gusanos: halo difuso, línea clara y cabeza, con la misma medida que la línea del logo del sitio
  const e2 = ESC2D * DPR, camino = () => { g2.beginPath(); for (const [a, b] of gusanos) { const A2 = aPantalla(a), B2 = aPantalla(b); g2.moveTo(A2[0], A2[1]); g2.lineTo(B2[0], B2[1]); } };
  g2.save(); g2.filter = `blur(${(CIERRE.W / 320) * e2}px)`; g2.globalAlpha = 0.5; g2.strokeStyle = "#B8893A"; g2.lineWidth = (CIERRE.W / 300) * e2; camino(); g2.stroke(); g2.restore();
  g2.strokeStyle = "#E8C777"; g2.lineWidth = 2 * DPR * Math.max(ESC2D, 0.75); camino(); g2.stroke();
  g2.fillStyle = "#FFF6E0";
  for (const c of cabezas) { const C2 = aPantalla(c); g2.beginPath(); g2.arc(C2[0], C2[1], (CIERRE.W / 820) * e2 * 1.15, 0, Math.PI * 2); g2.fill(); }
}

/* =====================================================================
   CORTES EN FANTASMA: grupos que suben, se vuelven transparentes y regresan
   ===================================================================== */
const CORTES = [
  // 2º nivel (con la losa del 1er nivel): sube para acabar planta baja y regresa para acabarse él
  { grupos: ["losa1", "columnas2", "trabes2", "escalera2", "muros2", "interior2"], sube: TL.corte1, alto: 5.4, baja: [TL.bajaN2] },
  // azotea: sube más alto, baja a media altura mientras se acaba el 2º nivel y luego se cierra
  { grupos: ["losa2", "banda"], sube: TL.corte1, alto: 8.2, baja: [[TL.bajaN2[0], TL.bajaN2[1], 3.8], TL.bajaAzotea] },
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
  [90, [16, 27, 25], [0, PISO, 0.5], 29],
  [106, [14, 14.5, 21], [0, -0.5, 0.6], 32],     // cimentación de cerca
  [188, [15.5, 14, 23], [0, 0.3, 0.5], 30],      // firme colado
  [258, [20, 15, 28], [0, 1.6, 0.4], 26],
  [334, [23, 19, 32], [0, 2.8, 0.2], 26],
  [368, [23, 19, 32], [0, 2.8, 0.2], 26],
  [392, [11.4, 16, 16], [0.1, 1.2, 0.4], 34.5],   // corte: de cerca a la planta baja
  [482, [2, 17, 18.5], [-0.3, 1.2, 0.4], 32],    // gira despacio mientras se acaba
  [504, [7, 19.5, 18], [-0.2, 2.9, 0.3], 35],    // 2º nivel
  [540, [7, 19.5, 18], [-0.2, 2.9, 0.3], 35],
  [562, [6.7, 7, 38], [-1.0, 3.9, 0.4], 21],      // fachada de frente
  [648, [8.7, 7.8, 38], [-1.0, 3.9, 0.4], 21],
  [666, [20, 19, 27], [0.3, 3.7, -1.0], 30.5],   // ampliación en steel frame
  [750, [21, 21, 27], [0.3, 4.3, -0.6], 32],
  [778, [8.4, 22.1, 17.6], [1.0, 8.8, 2.6], 31],  // área de asador de cerca y desde arriba
  [808, [7.4, 22.1, 18.2], [1.0, 8.8, 2.6], 31],
  [830, [24, 18, 32], [0.4, 4.6, 0.2], 27.5],    // casa terminada
  [840, [24, 18, 32], [0.4, 4.6, 0.2], 27.5],
  [884, [17, 13, 37], [0.2, 4.8, 0.3], 31.5],    // líneas doradas: giro lento para que se lea en 3D
  [TOTAL, [17, 13, 37], [0.2, 4.8, 0.3], 31.5],
];
const DESPL = MOVIL ? 0 : -0.19;
const ESC_MOVIL = +params.get("escmovil") || 2.22, ARRIBA_MOVIL = +params.get("arribamovil") || 0.2;
function poseCamara(f) {
  let i = 0; while (i < LLAVES.length - 2 && f > LLAVES[i + 1][0]) i++;
  const a = LLAVES[i], b = LLAVES[i + 1], t = suave((f - a[0]) / (b[0] - a[0]));
  const lerp = (u, v) => u.map((x, k) => x + (v[k] - x) * t);
  const pos = lerp(a[1], b[1]), obj = lerp(a[2], b[2]);
  let fov = a[3] + (b[3] - a[3]) * t;
  if (MOVIL) fov = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * ESC_MOVIL) * 180 / Math.PI;
  camara.fov = fov; camara.position.set(...pos); camara.lookAt(...obj);
  const ox = MOVIL ? -ANCHO * 0.065 : ANCHO * DESPL, oy = MOVIL ? ALTO * ARRIBA_MOVIL : 0;
  camara.setViewOffset(ANCHO, ALTO, ox, oy, ANCHO, ALTO);
  camara.updateProjectionMatrix(); camara.updateMatrixWorld(true);
  return [ox, oy];
}
// encuadre final: un ligero paneo deja el ANCLA justo donde arranca la línea del logo en el sitio
const PANEO = (() => {
  poseCamara(TOTAL);
  const v = ANCLA.clone().project(camara);
  return [(v.x + 1) / 2 * ANCHO - CIERRE.x * ESC2D, (1 - v.y) / 2 * ALTO - CIERRE.y * ESC2D];
})();
function camaraEn(f) {
  const [ox, oy] = poseCamara(f);
  const k = suave((f - TL.dorado[0]) / (LLAVES[LLAVES.length - 2][0] - TL.dorado[0]));
  if (k > 0) { camara.setViewOffset(ANCHO, ALTO, ox + PANEO[0] * k, oy + PANEO[1] * k, ANCHO, ALTO); camara.updateProjectionMatrix(); }
}

/* =====================================================================
   CUADRO f: aplica tiempos, materiales, cortes, desvanecido y cámara
   ===================================================================== */
// todas las superficies se recorren un poco hacia atrás en profundidad: así las líneas que coinciden con sus aristas se ven
for (const m of todosMats) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; m.userData.dw0 = m.depthWrite; Object.assign(m, { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }); }
const cacheTransparente = new Map();
const transparente = m => { let t = cacheTransparente.get(m); if (!t) { t = m.clone(); t.transparent = true; cacheTransparente.set(m, t); } return t; };
// estuco que entra fundiéndose desde el tono del zarpeo (cada pieza en 8 cuadros)
const FUNDE_ESTUCO = 8, TONO_ZARPEO = new THREE.Color(0x918b86), BLANCO = new THREE.Color(0xffffff);
function estucoEn(o, dt) {
  if (dt >= FUNDE_ESTUCO) return M.estuco;
  const m = o.userData.mEst || (o.userData.mEst = M.estuco.clone());
  m.color.copy(TONO_ZARPEO).lerp(BLANCO, suave(dt / FUNDE_ESTUCO));
  return m;
}
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
    lineaOroTenue.opacity = 0.42 * suave((f - (t0 + 26)) / 16) * (1 - 0.7 * suave((f - TL.muros1[1]) / 40));   // ejes y burbujas se apagan ya con la obra arriba
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
    else if (tipo === "coloca") o.position.y = b.p.y + (1 - q) * 0.35;   // pieza de piso que se asienta
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
    const p = suave((f - TL.relleno[0]) / 10);
    topo.position.y = -PISO * p; plano.position.y = -PISO * p;
    const pc = suave((f - TL.corte1[0]) / (TL.corte1[1] - TL.corte1[0]));
    for (const n of ["zapatas", "dados", "contratrabes"]) G[n].visible = pc < 1;
    G.excavacion.visible = p < 1;
    G.relleno.visible = f < TL.firme[1] + 2;            // el firme lo cubre
  }
  // la estructura de la ampliación queda encerrada por el forro: se oculta al terminarlo
  G.acero.visible = f < TL.forro[1] + 2;
  // materiales: base, aplanados por cara en los muros de block, cambios puntuales
  casa.traverse(o => { if (o.isMesh && o.userData.m0) o.material = o.userData.m0; });
  for (const o of murosBlock) {
    const s = o.userData.muro;
    const ext = f >= s.te ? estucoEn(o, f - s.te) : f >= s.tz ? M.zarpeo : s.blk;
    const int = f >= s.ty ? M.yeso : s.blk;
    o.material = caras(s.eje, s.ext, ext, int);
  }
  for (const c of cambios) if (f >= c.t) c.o.material = c.m === M.estuco ? estucoEn(c.o, f - c.t) : c.m;
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
  // piezas que entran fundiéndose (losas, trabes, relleno, piezas de piso, forros)
  for (const [o, a] of fundir) {
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    const t = o.userData.fm || (o.userData.fm = Object.assign(src.clone(), { transparent: true }));
    t.opacity = a * (src.userData.op0 ?? 1); t.depthWrite = a > 0.5; o.material = t;
  }
  // anochece cuando se encienden las luces de la fachada: menos sol, más luz cálida
  const noche = suave((f - (TL.fachada[1] - 12)) / 24);
  sol.intensity = 2.1 - 0.95 * noche; cielo.intensity = 1.0 - 0.45 * noche; scene.environmentIntensity = 0.42 - 0.16 * noche; luzRelleno.intensity = 0.55 - 0.25 * noche;
  // final: la casa desaparece de abajo hacia arriba mientras se dibujan sus líneas doradas (capa 2D)
  const pd = suave((f - TL.dorado[0]) / (TL.dorado[1] - TL.dorado[0]));
  const yScan = -0.3 + pd * (RED.ytope + 0.6);
  const corta = f >= TL.dorado[0];
  if (corta) planoBarrido.constant = -yScan;
  if ((renderer.clippingPlanes.length > 0) !== corta) renderer.clippingPlanes = corta ? [planoBarrido] : [];
  // opacidad deseada por material; "transparent" solo cambia cuando hace falta y entonces se recompila
  const pr = suave((f - TL.relleno[0]) / 10);
  const pc = suave((f - TL.corte1[0]) / (TL.corte1[1] - TL.corte1[0]));
  for (const m of todosMats) {
    let op = m.userData.op0, tr = m.userData.tr0, dw = m.userData.dw0;
    if (m === M.terreno) op = 0.62 * suave((f - (TL.topo[0] + 26)) / 16) * (1 - pd);
    if (m === M.excavacion) op *= 1 - pr;
    if (m === M.concretoFresco && pc > 0) { op *= 1 - pc; tr = true; dw = dw && pc < 0.5; }   // zapatas: se van en el corte
    m.opacity = op; m.depthWrite = dw;
    if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
  }
  casa.visible = yScan < RED.ytope + 0.25;
  lineaOroTenue.opacity *= (1 - pd);
  sombraSuelo.material.opacity = 0.32 * (1 - pd);
  camaraEn(f);
  dibujarLineas(f);
}
const planoBarrido = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.3);

window.cuadro = f => {
  aplicar(f); renderer.render(scene, camara);
  if (capaActiva) {   // líneas doradas encima, sin el plano de barrido
    const cp = renderer.clippingPlanes; renderer.clippingPlanes = []; renderer.autoClear = false;
    renderer.render(escenaCapa, camCapa);
    renderer.autoClear = true; renderer.clippingPlanes = cp;
  }
  return true;
};
window.TOTAL = TOTAL; window.TL = TL; window.LOGO = LOGO;
window.ancla = f => { aplicar(f); const p = aPantalla(ANCLA); return [p[0] / DPR / ESC2D, p[1] / DPR / ESC2D]; };   // QA: punto de arranque del logo
// QA de encuadre: caja en pantalla (0..1, y hacia abajo) de todo lo visible en el cuadro f
window.encuadre = (f, sinPlano = false, sinCortes = false) => {
  aplicar(f); scene.updateMatrixWorld(true); camara.updateMatrixWorld(true);
  const v = new THREE.Vector3(), r = [1e9, -1e9, 1e9, -1e9], box = new THREE.Box3();
  const suma = p => {
    v.copy(p).project(camara);
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) return;
    const sx = (v.x + 1) / 2, sy = (1 - v.y) / 2;
    r[0] = Math.min(r[0], sx); r[1] = Math.max(r[1], sx); r[2] = Math.min(r[2], sy); r[3] = Math.max(r[3], sy);
  };
  const mide = o => {
    if (!(o.isMesh || o.isLineSegments) || o === sombraSuelo || o === placa) return;
    for (let p = o; p; p = p.parent) if (!p.visible || (sinPlano && p === plano) || (sinCortes && CORTES.some(c => c.grupos.includes(p.name)))) return;
    if (o.material === M.terreno || o.material === lineaOroTenue) return;
    if (o.isInstancedMesh) { o.computeBoundingBox(); box.copy(o.boundingBox).applyMatrix4(o.matrixWorld); }
    else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); }
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) suma(new THREE.Vector3(x, y, z));
  };
  if (casa.visible) casa.traverse(mide);
  if (f >= TL.dorado[0] && f <= TL.junta[1]) for (const p of RED.nodos) suma(p);
  return r.map(x => +x.toFixed(3));
};
window.cuadro(+params.get("f") || 834);
window.listo = true;
