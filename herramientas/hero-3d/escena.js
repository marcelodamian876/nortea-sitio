/* =====================================================================
   NORTEA · Hero 3D v6 (prototipo)
   ---------------------------------------------------------------------
   Un solo modelo de la vivienda (referencia "opción 4") del que salen
   todas las etapas: plano, cimentación, estructura, muros, acabados,
   fachada, ampliación en steel framing y líneas doradas.

   Unidades: metros. Origen al centro de la planta, nivel de terreno y = 0.
   Frente de la casa hacia +z. Ejes estructurales:
     x: -6, -2, 0.6, 6      z: -5, 0, 5
   ===================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const params = new URLSearchParams(location.search);
const ANCHO = +params.get("w") || window.innerWidth;
const ALTO = +params.get("h") || window.innerHeight;
if (params.has("captura")) document.body.classList.add("captura");

/* ---------- Render ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(+params.get("dpr") || Math.min(devicePixelRatio, 2));
renderer.setSize(ANCHO, ALTO);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const camara = new THREE.PerspectiveCamera(26, ANCHO / ALTO, 0.5, 300);

/* ---------- Luces ---------- */
scene.add(new THREE.HemisphereLight(0xa9bcd6, 0x0b1d2f, 0.9));
const sol = new THREE.DirectionalLight(0xfff3e2, 2.4);
sol.position.set(16, 26, 20);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
sol.shadow.bias = -0.0004;
sol.shadow.normalBias = 0.02;
scene.add(sol);
const relleno = new THREE.DirectionalLight(0x9fb6d8, 0.5);
relleno.position.set(-18, 10, 6);
scene.add(relleno);

/* ---------- Texturas de canvas ---------- */
function lienzo(w, h, pintar) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  pintar(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// Porcelanato de gran formato: piezas de 1.2 x 0.6 con junta fina
function porcelanato(base, junta, ancho, alto, pieza = [1.2, 0.6], veta = 0) {
  const cols = Math.max(1, Math.round(ancho / pieza[0])), filas = Math.max(1, Math.round(alto / pieza[1]));
  return lienzo(64 * cols, 64 * filas * (pieza[1] / pieza[0]) * 2 | 0 || 64, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    if (veta) {
      for (let i = 0; i < 40 * cols; i++) {
        g.strokeStyle = `rgba(255,255,255,${0.04 * veta})`; g.lineWidth = 1 + Math.random() * 2;
        g.beginPath(); const x = Math.random() * w, y = Math.random() * h;
        g.moveTo(x, y); g.bezierCurveTo(x + 20, y + 10, x + 40, y - 10, x + 70, y + 5); g.stroke();
      }
    }
    g.strokeStyle = junta; g.lineWidth = 2;
    for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * w / cols, 0); g.lineTo(i * w / cols, h); g.stroke(); }
    for (let j = 0; j <= filas; j++) { g.beginPath(); g.moveTo(0, j * h / filas); g.lineTo(w, j * h / filas); g.stroke(); }
  });
}
function piedra(ancho, alto) {
  return lienzo(128, Math.max(64, (128 * alto / ancho) | 0), (g, w, h) => {
    g.fillStyle = "#8d8b86"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const v = 110 + Math.random() * 60 | 0;
      g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 3);
    }
    g.strokeStyle = "rgba(60,60,58,.45)"; g.lineWidth = 1;
    const filas = Math.max(2, Math.round(alto / 0.6));
    for (let j = 1; j < filas; j++) { g.beginPath(); g.moveTo(0, j * h / filas); g.lineTo(w, j * h / filas); g.stroke(); }
  });
}
function madera(ancho, alto) {
  return lienzo(256, 256, (g, w, h) => {
    g.fillStyle = "#8a5a32"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = `rgba(${60 + Math.random() * 40 | 0},${35 + Math.random() * 20 | 0},15,${0.15 + Math.random() * 0.2})`;
      g.lineWidth = 1 + Math.random() * 2;
      const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 4, w * .6, y - 4, w, y + 2); g.stroke();
    }
  });
}

/* ---------- Materiales ---------- */
const M = {
  concreto: new THREE.MeshStandardMaterial({ color: 0xc4baa8, roughness: 0.9 }),
  concretoFresco: new THREE.MeshStandardMaterial({ color: 0x9f9a90, roughness: 0.8 }),
  acero: new THREE.MeshStandardMaterial({ color: 0x8a4b2a, roughness: 0.6, metalness: 0.4 }),
  block: new THREE.MeshStandardMaterial({ color: 0x8f8c86, roughness: 0.95 }),
  blanco: new THREE.MeshStandardMaterial({ color: 0xf1efea, roughness: 0.75 }),
  blancoBanda: new THREE.MeshStandardMaterial({ color: 0xf6f5f1, roughness: 0.6 }),
  grisOscuro: new THREE.MeshStandardMaterial({ color: 0x3b3f44, roughness: 0.55 }),
  antracita: new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.4, metalness: 0.6 }),
  vidrio: new THREE.MeshStandardMaterial({ color: 0x16222e, roughness: 0.03, metalness: 0.8, transparent: true, opacity: 0.62 }),
  vidrioBarandal: new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.22, depthWrite: false }),
  calido: new THREE.MeshStandardMaterial({ color: 0x1a1008, emissive: 0xffbf73, emissiveIntensity: 1.25, roughness: 1 }),
  led: new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffd08a, emissiveIntensity: 3 }),
  madera: new THREE.MeshStandardMaterial({ color: 0xffffff, map: madera(), roughness: 0.6 }),
  maderaPuerta: new THREE.MeshStandardMaterial({ color: 0xe0b083, map: madera(), roughness: 0.45 }),
  galvanizado: new THREE.MeshStandardMaterial({ color: 0xc9ced3, roughness: 0.35, metalness: 0.85 }),
  durock: new THREE.MeshStandardMaterial({ color: 0xb9b6ad, roughness: 0.95 }),
  deck: new THREE.MeshStandardMaterial({ color: 0xaeb4ba, roughness: 0.35, metalness: 0.8, side: THREE.DoubleSide }),
  cocina: new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.5 }),
  cubierta: new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.25 }),
  piso: new THREE.MeshStandardMaterial({ color: 0xd9d3c8, roughness: 0.35 }),
  tela: new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 0.95 }),
  planta: new THREE.MeshStandardMaterial({ color: 0x3d6431, roughness: 0.9, flatShading: true }),
  plantaClara: new THREE.MeshStandardMaterial({ color: 0x58803c, roughness: 0.9, flatShading: true }),
  maceta: new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.7 }),
  terreno: new THREE.MeshStandardMaterial({ color: 0x15304d, roughness: 1, transparent: true, opacity: 0.55 }),
  plaza: new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.6 }),
};
const ORO = 0xcfa552;
const lineaOro = new THREE.LineBasicMaterial({ color: ORO, transparent: true });
const lineaOroTenue = new THREE.LineBasicMaterial({ color: ORO, transparent: true, opacity: 0.35 });

/* ---------- Grupos (una capa por etapa) ---------- */
const casa = new THREE.Group(); scene.add(casa);
const capas = {};
for (const n of ["terreno", "plano", "cimentacion", "estructura1", "muros1", "estructura2", "muros2",
  "azotea", "interior1", "interior2", "fachada", "luces", "jardin", "acero", "deck", "durock",
  "ampliacion", "terraza", "luces3", "firme", "escalera", "lineas"]) {
  capas[n] = new THREE.Group(); capas[n].name = n; casa.add(capas[n]);
}

function caja(g, x0, x1, y0, y1, z0, z1, mat, sombra = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = sombra; m.receiveShadow = true;
  g.add(m); return m;
}
function texturizada(g, x0, x1, y0, y1, z0, z1, textura, opts = {}) {
  const ancho = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
  const mat = new THREE.MeshStandardMaterial({ map: textura(ancho, Math.abs(y1 - y0)), roughness: 0.5, ...opts });
  return caja(g, x0, x1, y0, y1, z0, z1, mat);
}

/* ---------- Geometría base ---------- */
const EX = [-6, -2, 0.6, 6], EZ = [-5, 0, 5];
const T = 0.36, h = T / 2;            // muro exterior (cubre columnas de 0.35)
const NIV = [0.3, 3.6, 6.9];          // nivel de piso terminado de cada planta
const LOSA = 0.3;                      // espesor de losa
const ALT = 3.0;                       // altura libre de muros
const XMIN = -6 - h, XMAX = 6 + h, ZMIN = -5 - h, ZMAX = 5 + h;

/* Muro con vanos. eje "x": corre en x a z = fijo. eje "z": corre en z a x = fijo.
   Los vanos se dejan desde el principio (nunca se perforan después). */
const vanosPlanta = [];               // para dibujar el plano arquitectónico
function muro(g, eje, fijo, a0, a1, y0, y1, grosor, vanos, mat) {
  const piezas = [];
  const add = (b0, b1, c0, c1) => { if (b1 - b0 > 0.01 && c1 - c0 > 0.01) piezas.push([b0, b1, c0, c1]); };
  const vs = [...vanos].sort((p, q) => p[0] - q[0]);
  let cursor = a0;
  for (const [v0, v1, s0, s1] of vs) {
    add(cursor, v0, y0, y1);
    add(v0, v1, y0, s0);
    add(v0, v1, s1, y1);
    cursor = v1;
  }
  add(cursor, a1, y0, y1);
  const mallas = piezas.map(([b0, b1, c0, c1]) => eje === "x"
    ? caja(g, b0, b1, c0, c1, fijo - grosor / 2, fijo + grosor / 2, mat)
    : caja(g, fijo - grosor / 2, fijo + grosor / 2, c0, c1, b0, b1, mat));
  if (y0 < 1 && y1 > 1) vanosPlanta.push({ eje, fijo, a0, a1, grosor, vanos: vs.filter(v => v[2] < 1.2) });
  return mallas;
}

/* Ventana: marco antracita, cristal y resplandor cálido interior.
   cara = 1: el interior queda hacia -z / -x (frente y costado derecho); cara = -1: hacia +z / +x */
const resplandores = [];
function ventana(g, eje, fijo, a0, a1, y0, y1, { divisiones = 0, cara = 1, luz = capas.luces } = {}) {
  const f = 0.06, prof = 0.12;
  const enX = eje === "x";
  const marco = (b0, b1, c0, c1) => enX
    ? caja(g, b0, b1, c0, c1, fijo - prof / 2, fijo + prof / 2, M.antracita, false)
    : caja(g, fijo - prof / 2, fijo + prof / 2, c0, c1, b0, b1, M.antracita, false);
  marco(a0, a1, y0, y0 + f); marco(a0, a1, y1 - f, y1);
  marco(a0, a0 + f, y0, y1); marco(a1 - f, a1, y0, y1);
  const n = divisiones || Math.max(1, Math.round((a1 - a0) / 1.3));
  for (let i = 1; i < n; i++) { const b = a0 + (a1 - a0) * i / n; marco(b - f / 2, b + f / 2, y0, y1); }
  const cr = enX ? caja(g, a0 + f, a1 - f, y0 + f, y1 - f, fijo - 0.01, fijo + 0.01, M.vidrio, false)
    : caja(g, fijo - 0.01, fijo + 0.01, y0 + f, y1 - f, a0 + f, a1 - f, M.vidrio, false);
  cr.userData.vidrio = true;
  // plano cálido 0.35 m hacia adentro: lectura de interior iluminado
  const d = -cara * 0.35;
  const r = enX ? caja(luz, a0 + 0.1, a1 - 0.1, y0 + 0.05, y1 - 0.15, fijo + d - 0.005, fijo + d + 0.005, M.calido, false)
    : caja(luz, fijo + d - 0.005, fijo + d + 0.005, y0 + 0.05, y1 - 0.15, a0 + 0.1, a1 - 0.1, M.calido, false);
  resplandores.push(r);
}
function barandalVidrio(g, eje, fijo, a0, a1, y0, alto = 1.0) {
  const enX = eje === "x";
  const v = enX ? caja(g, a0, a1, y0, y0 + alto, fijo - 0.012, fijo + 0.012, M.vidrioBarandal, false)
    : caja(g, fijo - 0.012, fijo + 0.012, y0, y0 + alto, a0, a1, M.vidrioBarandal, false);
  v.userData.vidrio = true;
  enX ? caja(g, a0, a1, y0 + alto, y0 + alto + 0.04, fijo - 0.03, fijo + 0.03, M.antracita, false)
    : caja(g, fijo - 0.03, fijo + 0.03, y0 + alto, y0 + alto + 0.04, a0, a1, M.antracita, false);
  enX ? caja(g, a0, a1, y0, y0 + 0.06, fijo - 0.04, fijo + 0.04, M.antracita, false)
    : caja(g, fijo - 0.04, fijo + 0.04, y0, y0 + 0.06, a0, a1, M.antracita, false);
}
function lamas(g, x0, x1, y0, y1, z, paso = 0.16, ancho = 0.06, prof = 0.18) {
  for (let x = x0; x + ancho <= x1 + 1e-6; x += paso) caja(g, x, x + ancho, y0, y1, z, z + prof, M.madera);
}
function downlight(g, x, y, z) { caja(g, x - 0.07, x + 0.07, y - 0.012, y, z - 0.07, z + 0.07, M.led, false); }

/* =====================================================================
   1. TERRENO Y PLANO ARQUITECTÓNICO
   ===================================================================== */
{
  const t = new THREE.Mesh(new THREE.BoxGeometry(22, 0.04, 20), M.terreno);
  t.position.set(0, -0.02, 0.5); t.receiveShadow = true; capas.terreno.add(t);
  const borde = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(22, 0.001, 20)), lineaOroTenue);
  borde.position.set(0, 0.001, 0.5); capas.terreno.add(borde);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.35 }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.002; sombra.receiveShadow = true; capas.terreno.add(sombra);
}

/* =====================================================================
   2. CIMENTACIÓN: zapatas aisladas, dados y contratrabes de liga
   ===================================================================== */
for (const x of EX) for (const z of EZ) {
  caja(capas.cimentacion, x - 0.7, x + 0.7, -1.2, -0.9, z - 0.7, z + 0.7, M.concretoFresco);   // zapata
  caja(capas.cimentacion, x - 0.25, x + 0.25, -0.9, 0, z - 0.25, z + 0.25, M.concretoFresco);  // dado
}
for (const z of EZ) caja(capas.cimentacion, -6 - 0.15, 6 + 0.15, -0.5, 0, z - 0.15, z + 0.15, M.concretoFresco);
for (const x of EX) caja(capas.cimentacion, x - 0.15, x + 0.15, -0.5, 0, -5 - 0.15, 5 + 0.15, M.concretoFresco);
// firme de planta baja
caja(capas.firme, XMIN, XMAX, 0, NIV[0], ZMIN, ZMAX, M.concreto);

/* =====================================================================
   3. ESTRUCTURA (columnas, trabes, losas con hueco de escalera)
   ===================================================================== */
function estructura(g, nivel) {
  const y0 = NIV[nivel], yl = NIV[nivel] + ALT;            // arranque y lecho bajo de losa
  for (const x of EX) for (const z of EZ) caja(g, x - 0.175, x + 0.175, y0, yl, z - 0.175, z + 0.175, M.concreto);
  for (const z of EZ) caja(g, -6, 6, yl - 0.45, yl, z - 0.125, z + 0.125, M.concreto);
  for (const x of EX) caja(g, x - 0.125, x + 0.125, yl - 0.45, yl, -5, 5, M.concreto);
  // losa con hueco de escalera (x -2..0.6, z -5..-1)
  const a = yl, b = yl + LOSA;
  caja(g, XMIN, -2, a, b, ZMIN, ZMAX, M.concreto);
  caja(g, 0.6, XMAX, a, b, ZMIN, ZMAX, M.concreto);
  caja(g, -2, 0.6, a, b, -1, ZMAX, M.concreto);
}
estructura(capas.estructura1, 0);
estructura(capas.estructura2, 1);

/* Escaleras en U dentro del núcleo x -2..0.6, z -5..-1 */
function escalera(g, y0, y1) {
  const n = 9, sube = (y1 - y0) / (2 * n), huella = 0.28;
  const descanso = y0 + sube * n;
  for (let i = 0; i < n; i++) {
    const z1 = -1.25 - i * huella;
    caja(g, -1.85, -0.75, y0, y0 + sube * (i + 1), z1 - huella, z1, M.concreto);
  }
  caja(g, -1.85, 0.45, y0, descanso, -4.85, -1.25 - n * huella, M.concreto);
  for (let i = 0; i < n; i++) {
    const z0 = -1.25 - n * huella + i * huella;
    caja(g, -0.65, 0.45, descanso, descanso + sube * (i + 1), z0, z0 + huella, M.concreto);
  }
}
escalera(capas.escalera, NIV[0], NIV[1]);
escalera(capas.escalera, NIV[1], NIV[2]);

/* =====================================================================
   4. MUROS PLANTA BAJA (block) — vanos según el diseño
   y0 = 0.3, y1 = 3.3
   ===================================================================== */
{
  const g = capas.muros1, y0 = NIV[0], y1 = NIV[0] + ALT;
  // Frente izquierdo (sala): ventanal 2.6 m
  muro(g, "x", 5, -6, -2, y0, y1, T, [[-5.5, -2.9, 0.45, 3.0]], M.block);
  // Acceso: muro con puerta principal (1.2 x 2.6) entre pilastras
  muro(g, "x", 5, -2, 0.6, y0, y1, T, [[-1.2, 0.0, y0, 2.9]], M.block);
  // Comedor remetido a z = 2.5 (pórtico cubierto adelante)
  muro(g, "x", 2.5, 0.6, 6, y0, y1, 0.2, [[0.9, 5.7, y0, 3.0]], M.block);
  muro(g, "z", 6, -5, 2.5, y0, y1, T, [[-3.6, -1.6, 1.1, 2.4]], M.block);
  muro(g, "z", -6, -5, 5, y0, y1, T, [[-4.2, -2.4, 1.1, 2.4], [1.2, 3.6, 0.45, 3.0]], M.block);
  muro(g, "x", -5, -6, 6, y0, y1, T, [[-5.4, -3.4, 1.1, 2.4], [2.2, 4.6, 0.45, 2.7]], M.block);
  // Interiores
  muro(g, "z", -2, -5, 5, y0, y1, 0.15, [[-1.0, 0.2, y0, 2.4], [1.4, 3.6, y0, 2.4]], M.block);  // cocina/sala ↔ escalera/vestíbulo
  muro(g, "z", 0.6, -5, 2.5, y0, y1, 0.15, [[0.6, 1.6, y0, 2.4]], M.block);                    // vestíbulo ↔ comedor
  muro(g, "x", 0, 0.6, 6, y0, y1, 0.15, [[2.4, 3.4, y0, 2.4]], M.block);                        // comedor ↔ servicio
}
/* MUROS PLANTA ALTA: y0 = 3.6, y1 = 6.6 */
{
  const g = capas.muros2, y0 = NIV[1], y1 = NIV[1] + ALT;
  // Recámara izquierda remetida a z = 3.6: balcón al frente
  muro(g, "x", 3.6, -6, -2, y0, y1, 0.2, [[-5.6, -2.4, y0, 6.3]], M.block);
  muro(g, "z", -6, 3.6, 5, y0, y1, T, [], M.block);                                    // costado del balcón (pantalla)
  // Escalera: ventana alta y estrecha detrás de lamas de madera
  muro(g, "x", 5, -2, 0.6, y0, y1, T, [[-1.4, 0.0, 3.9, 6.4]], M.block);
  // Recámara derecha en voladizo sobre el pórtico
  muro(g, "x", 5, 0.6, 6, y0, y1, T, [[1.0, 2.8, 3.9, 6.3], [4.0, 5.4, 4.5, 5.9]], M.block);
  muro(g, "z", 6, -5, 5, y0, y1, T, [[-3.6, -1.6, 4.4, 5.8], [1.4, 3.6, 4.4, 5.8]], M.block);
  muro(g, "z", -6, -5, 3.6, y0, y1, T, [[-4.2, -2.4, 4.4, 5.8], [0.4, 2.6, 4.4, 5.8]], M.block);
  muro(g, "x", -5, -6, 6, y0, y1, T, [[-5.4, -3.4, 4.4, 5.8], [2.2, 4.6, 4.4, 5.8]], M.block);
  muro(g, "z", -2, -5, 3.6, y0, y1, 0.15, [[-0.4, 0.6, y0, 5.7]], M.block);
  muro(g, "z", 0.6, -5, 5, y0, y1, 0.15, [[0.4, 1.4, y0, 5.7], [-3.6, -2.6, y0, 5.7]], M.block);
  muro(g, "x", 0, 0.6, 6, y0, y1, 0.15, [], M.block);
}
/* Azotea: losa ya incluida en estructura2. Pretil perimetral de 0.6 m */
{
  const g = capas.azotea, y0 = NIV[2], y1 = NIV[2] + 0.6;
  caja(g, XMIN, XMAX, y0, y1, ZMAX - 0.18, ZMAX, M.blanco);
  caja(g, XMIN, XMAX, y0, y1, ZMIN, ZMIN + 0.18, M.blanco);
  caja(g, XMIN, XMIN + 0.18, y0, y1, ZMIN + 0.18, ZMAX - 0.18, M.blanco);
  caja(g, XMAX - 0.18, XMAX, y0, y1, ZMIN + 0.18, ZMAX - 0.18, M.blanco);
  // pretil del cubo de escalera (salida a azotea)
  caja(g, -2, 0.6, y0, y0 + 0.3, -1.08, -0.92, M.blanco);
}

/* =====================================================================
   5. ACABADOS INTERIORES (cocina, sala, comedor, pisos)
   ===================================================================== */
{
  const g = capas.interior1, y = NIV[0];
  caja(g, XMIN + 0.2, XMAX - 0.2, y, y + 0.02, ZMIN + 0.2, ZMAX - 0.2, M.piso, false);
  // Cocina: gabinetes inferiores en L, cubierta, tarja, parrilla, alacenas e isla
  caja(g, -5.8, -2.3, y, y + 0.88, -4.82, -4.22, M.cocina);
  caja(g, -5.82, -2.28, y + 0.88, y + 0.92, -4.84, -4.18, M.cubierta);
  caja(g, -5.82, -5.22, y, y + 0.92, -4.2, -2.6, M.cocina);
  caja(g, -5.84, -5.2, y + 0.88, y + 0.92, -4.2, -2.6, M.cubierta);
  caja(g, -4.6, -3.9, y + 0.9, y + 0.93, -4.7, -4.35, M.antracita);   // tarja
  caja(g, -3.3, -2.7, y + 0.92, y + 0.94, -4.7, -4.3, M.antracita);   // parrilla
  caja(g, -5.8, -2.3, y + 1.6, y + 2.4, -4.82, -4.5, M.cocina);        // alacena
  caja(g, -4.9, -3.1, y, y + 0.9, -2.7, -1.9, M.cocina);               // isla
  caja(g, -4.95, -3.05, y + 0.9, y + 0.94, -2.75, -1.85, M.cubierta);
  // Sala
  caja(g, -5.6, -3.2, y, y + 0.42, 1.0, 1.9, M.tela);
  caja(g, -5.6, -3.2, y + 0.42, y + 0.8, 1.0, 1.25, M.tela);
  caja(g, -5.0, -3.8, y, y + 0.35, 2.6, 3.3, M.madera);
  caja(g, -5.9, -2.3, y + 0.02, y + 0.03, 0.8, 4.4, M.tela, false);
  // Comedor
  caja(g, 2.2, 4.4, y + 0.72, y + 0.76, 0.6, 1.6, M.madera);
  caja(g, 3.2, 3.4, y, y + 0.72, 1.0, 1.2, M.antracita);
  for (const cx of [2.5, 3.3, 4.1]) for (const cz of [0.25, 1.95]) caja(g, cx - 0.2, cx + 0.2, y, y + 0.45, cz - 0.2, cz + 0.2, M.tela);
  // Puertas interiores
  caja(g, -2.04, -1.96, y, 2.4, 1.4, 2.3, M.maderaPuerta);
  caja(g, 2.4, 3.3, y, 2.4, -0.04, 0.04, M.maderaPuerta);
}
{
  const g = capas.interior2, y = NIV[1];
  caja(g, XMIN + 0.2, XMAX - 0.2, y, y + 0.02, ZMIN + 0.2, 3.5, M.piso, false);
  caja(g, -5.4, -3.4, y, y + 0.55, -3.8, -1.6, M.tela);   // cama
  caja(g, 2.0, 4.0, y, y + 0.55, 1.6, 3.8, M.tela);       // cama
  caja(g, -5.4, -3.4, y, y + 0.55, 0.6, 2.8, M.tela);     // cama
}

/* =====================================================================
   6. FACHADA (dos niveles) — referencia opción 4
   ===================================================================== */
{
  const g = capas.fachada, y0 = NIV[0];
  // Aplanado blanco sobre los muros exteriores: se aplica cambiando material (ver etapas)
  // Pilastras de piedra a los lados del acceso y columna de piedra del pórtico
  texturizada(g, -2.6, -1.3, 0, 3.6, 5.0, 5.32, piedra);
  texturizada(g, 0.1, 1.0, 0, 3.6, 5.0, 5.32, piedra);
  texturizada(g, 5.45, 6.25, 0, 3.6, 4.45, 5.25, piedra);
  // Panel de lamas de madera junto al ventanal de sala
  lamas(g, -2.92, -2.62, 0.3, 3.3, 5.18, 0.1, 0.05, 0.12);
  // Puerta principal de madera, pivotante, con jaladera vertical
  caja(g, -1.18, -0.02, y0, 2.88, 4.97, 5.05, M.maderaPuerta);
  caja(g, -0.2, -0.16, 1.0, 2.2, 5.05, 5.11, M.antracita);
  caja(g, -1.25, 0.05, 2.88, 2.95, 4.95, 5.1, M.antracita);
  // Escalones de acceso y plaza frontal
  caja(g, -1.9, 1.2, 0, 0.1, 5.2, 6.4, M.plaza);
  caja(g, -1.7, 1.0, 0.1, 0.2, 5.2, 6.0, M.plaza);
  caja(g, -1.5, 0.9, 0.2, 0.3, 5.2, 5.6, M.plaza);
  caja(g, 1.0, 6.25, 0, 0.3, 2.5, 7.0, M.plaza);                 // pórtico / cochera
  // Banda blanca (ceja) del entrepiso izquierdo + plafón de madera del pórtico
  caja(g, XMIN - 0.05, 0.6, 3.3, 3.62, 5.18, 5.42, M.blancoBanda);
  caja(g, 0.6, XMAX + 0.12, 3.15, 3.66, 5.18, 5.5, M.grisOscuro);  // volado gris oscuro del pórtico
  caja(g, XMAX, XMAX + 0.12, 3.15, 3.66, 2.3, 5.5, M.grisOscuro);
  caja(g, 0.62, 5.44, 3.27, 3.29, 2.5, 5.18, M.madera, false);       // plafón de madera
  for (const x of [1.6, 2.9, 4.2]) downlight(capas.luces, x, 3.27, 3.9);
  // Planta alta: lamas verticales frente a la escalera
  lamas(g, -1.7, 0.4, 3.75, 6.5, 5.2, 0.22, 0.08, 0.2);
  // Bloque gris oscuro de porcelanato
  texturizada(g, 3.5, 6.24, 3.62, 6.62, 5.18, 5.36, (a, b) => porcelanato("#40454b", "#2a2d31", a, b, [0.6, 1.2]));
  texturizada(g, 6.18, 6.24, 3.62, 6.62, -1.5, 5.36, (a, b) => porcelanato("#40454b", "#2a2d31", a, b, [0.6, 1.2]));
  // Balcón: barandal de cristal y plafón con LED
  barandalVidrio(g, "x", 5.0, -6.0, -2.15, NIV[1], 1.0);
  for (const x of [-5.0, -3.2]) downlight(capas.luces, x, 6.58, 4.3);
  // Remate blanco grueso del volumen superior (lectura de "cubo" de la referencia)
  caja(g, XMIN - 0.05, 0.6, 6.6, 7.1, 5.18, 5.45, M.blancoBanda);
  caja(g, XMIN - 0.05, XMIN + 0.22, 3.3, 7.1, 3.4, 5.45, M.blancoBanda);
  // Ventanas planta baja
  ventana(g, "x", 5, -5.5, -2.9, 0.45, 3.0, { divisiones: 2 });
  ventana(g, "x", 2.5, 0.9, 5.7, NIV[0], 3.0, { divisiones: 4 });
  ventana(g, "z", 6, -3.6, -1.6, 1.1, 2.4);
  ventana(g, "z", -6, -4.2, -2.4, 1.1, 2.4, { cara: -1 });
  ventana(g, "z", -6, 1.2, 3.6, 0.45, 3.0, { cara: -1 });
  ventana(g, "x", -5, -5.4, -3.4, 1.1, 2.4, { cara: -1 });
  ventana(g, "x", -5, 2.2, 4.6, 0.45, 2.7, { cara: -1 });
  // Ventanas planta alta
  ventana(g, "x", 3.6, -5.6, -2.4, NIV[1], 6.3, { divisiones: 3 });
  ventana(g, "x", 5, -1.4, 0.0, 3.9, 6.4, { divisiones: 1 });
  ventana(g, "x", 5, 1.0, 2.8, 3.9, 6.3, { divisiones: 2 });
  ventana(g, "x", 5.36, 4.0, 5.4, 4.5, 5.9, { divisiones: 2 });
  ventana(g, "z", 6, -3.6, -1.6, 4.4, 5.8);
  ventana(g, "z", 6.25, 1.4, 3.6, 4.4, 5.8);
  ventana(g, "z", -6, -4.2, -2.4, 4.4, 5.8, { cara: -1 });
  ventana(g, "z", -6, 0.4, 2.6, 4.4, 5.8, { cara: -1 });
  ventana(g, "x", -5, -5.4, -3.4, 4.4, 5.8, { cara: -1 });
  ventana(g, "x", -5, 2.2, 4.6, 4.4, 5.8, { cara: -1 });
  // Luz de acceso: bañador LED sobre las pilastras
  caja(capas.luces, -2.6, -1.3, 0.02, 0.05, 5.33, 5.36, M.led, false);
  caja(capas.luces, 0.1, 1.0, 0.02, 0.05, 5.33, 5.36, M.led, false);
}
/* Jardinería discreta: jardinera baja al frente izquierdo y un árbol */
{
  const g = capas.jardin;
  caja(g, -6.4, -2.8, 0, 0.45, 5.5, 6.6, M.maceta);
  const arb = new THREE.IcosahedronGeometry(0.32, 1);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(arb, i % 2 ? M.planta : M.plantaClara);
    m.position.set(-6.1 + i * 0.4, 0.62, 6.05 + (i % 3 - 1) * 0.15); m.scale.set(1, 0.7 + (i % 3) * 0.15, 1);
    m.castShadow = true; g.add(m);
  }
  caja(g, -7.6, -7.48, 0, 2.2, 5.9, 6.02, M.madera);
  for (const [dx, dy, dz, r] of [[0, 2.9, 0, 0.75], [0.45, 2.5, 0.2, 0.55], [-0.4, 2.55, -0.15, 0.6], [0.1, 3.45, 0.1, 0.5], [-0.2, 2.3, 0.4, 0.45]]) {
    const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), dy > 2.8 ? M.plantaClara : M.planta);
    copa.position.set(-7.54 + dx, dy, 5.96 + dz); copa.castShadow = true; g.add(copa);
  }
  for (const x of [5.0, 5.3]) { const m = new THREE.Mesh(arb, M.plantaClara); m.position.set(x, 0.55, 2.8); g.add(m); }
}

/* =====================================================================
   7. AMPLIACIÓN 3er NIVEL — steel framing sobre la azotea
   Volumen x -2..6, z -5..0: sus muros caen sobre los ejes de trabes
   y columnas existentes (x = -2, 6; z = -5, 0).
   ===================================================================== */
const A = { x0: -2, x1: 6, z0: -5, z1: 0, y0: NIV[2], y1: NIV[2] + 2.7 };
const PG = 0.0254 * 24;   // montantes @ 61 cm
const VANOS3 = {
  "x:0": [[-1.4, 3.4, A.y0, A.y0 + 2.4], [4.0, 5.4, A.y0 + 0.9, A.y0 + 2.2]],  // frente a terraza: cancel corredizo + ventana
  "z:6": [[-3.6, -1.4, A.y0 + 0.9, A.y0 + 2.2]],
  "x:-5": [[1.0, 3.0, A.y0 + 0.9, A.y0 + 2.2]],
  "z:-2": [],
};
function bastidor(g, eje, fijo, a0, a1, vanos) {
  const tr = 0.09, alto = 0.04;                    // canal 92 mm
  const enX = eje === "x";
  const perfil = (b0, b1, c0, c1) => enX
    ? caja(g, b0, b1, c0, c1, fijo - tr / 2, fijo + tr / 2, M.galvanizado)
    : caja(g, fijo - tr / 2, fijo + tr / 2, c0, c1, b0, b1, M.galvanizado);
  perfil(a0, a1, A.y0, A.y0 + alto);              // canal inferior (solera)
  perfil(a0, a1, A.y1 - alto, A.y1);              // canal superior
  // anclas sobre la trabe existente
  for (let a = a0 + 0.3; a < a1; a += 1.2) enX
    ? caja(g, a - 0.06, a + 0.06, A.y0 - 0.005, A.y0 + 0.012, fijo - 0.09, fijo + 0.09, M.antracita, false)
    : caja(g, fijo - 0.09, fijo + 0.09, A.y0 - 0.005, A.y0 + 0.012, a - 0.06, a + 0.06, M.antracita, false);
  const dentro = a => vanos.find(v => a > v[0] - 0.02 && a < v[1] + 0.02);
  const montante = (a, c0 = A.y0 + alto, c1 = A.y1 - alto) => perfil(a - 0.02, a + 0.02, c0, c1);
  // montantes dobles en esquinas y a los lados de los vanos
  montante(a0 + 0.02); montante(a0 + 0.07); montante(a1 - 0.02); montante(a1 - 0.07);
  for (const v of vanos) {
    montante(v[0] - 0.02); montante(v[0] - 0.07); montante(v[1] + 0.02); montante(v[1] + 0.07);
    perfil(v[0] - 0.04, v[1] + 0.04, v[3], v[3] + 0.2);              // cabezal
    if (v[2] > A.y0 + 0.1) perfil(v[0], v[1], v[2] - alto, v[2]);     // antepecho
  }
  for (let a = a0 + PG; a < a1 - 0.1; a += PG) {
    const v = dentro(a);
    if (!v) montante(a);
    else { montante(a, v[3] + 0.2, A.y1 - alto); if (v[2] > A.y0 + 0.1) montante(a, A.y0 + alto, v[2] - alto); }
  }
  // arriostramiento en cruz (fleje) en el primer tablero sin vanos
  const libre = [a0 + 0.1, a0 + 0.1 + 1.6];
  if (!vanos.some(v => v[0] < libre[1] && v[1] > libre[0])) {
    for (const s of [1, -1]) {
      const L = Math.hypot(1.6, A.y1 - A.y0), ang = Math.atan2(A.y1 - A.y0, 1.6) * s;
      const f = new THREE.Mesh(new THREE.BoxGeometry(L, 0.035, 0.012), M.galvanizado);
      f.position.set(0, (A.y0 + A.y1) / 2, 0);
      if (enX) { f.position.x = (libre[0] + libre[1]) / 2; f.position.z = fijo + 0.05 * (s > 0 ? 1 : -1); f.rotation.z = ang; }
      else { f.position.z = (libre[0] + libre[1]) / 2; f.position.x = fijo + 0.05 * (s > 0 ? 1 : -1); f.rotation.y = Math.PI / 2; f.rotation.z = ang; }
      g.add(f);
    }
  }
}
{
  const g = capas.acero;
  bastidor(g, "x", A.z1, A.x0, A.x1, VANOS3["x:0"]);
  bastidor(g, "x", A.z0, A.x0, A.x1, VANOS3["x:-5"]);
  bastidor(g, "z", A.x1, A.z0, A.z1, VANOS3["z:6"]);
  bastidor(g, "z", A.x0, A.z0, A.z1, VANOS3["z:-2"]);
  // Vigas de cubierta: armaduras ligeras (cuerda superior, inferior y diagonales) a cada 1.22 m
  for (let x = A.x0 + 0.1; x <= A.x1 - 0.05; x += 1.22) {
    const yt = A.y1 + 0.3, yb = A.y1;
    caja(g, x - 0.02, x + 0.02, yb, yb + 0.05, A.z0, A.z1, M.galvanizado);
    caja(g, x - 0.02, x + 0.02, yt - 0.05, yt, A.z0 - 0.1, A.z1 + 0.1, M.galvanizado);
    const n = 6, paso = (A.z1 - A.z0) / n;
    for (let i = 0; i < n; i++) {
      const za = A.z0 + i * paso, zb = za + paso, L = Math.hypot(paso, 0.25);
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, L), M.galvanizado);
      d.position.set(x, (yb + yt) / 2, (za + zb) / 2);
      d.rotation.x = (i % 2 ? 1 : -1) * Math.atan2(0.25, paso);
      d.castShadow = true; g.add(d);
    }
  }
  // Largueros (polines) perpendiculares para recibir el deck
  for (let z = A.z0; z <= A.z1 + 0.01; z += 1.25) caja(g, A.x0 - 0.05, A.x1 + 0.05, A.y1 + 0.3, A.y1 + 0.38, z - 0.03, z + 0.03, M.galvanizado);
}
/* Deck metálico acanalado sobre los largueros (costillas en sentido z, apoyadas en los polines) */
{
  const perfilDeck = new THREE.Shape();
  const onda = 0.305, alto = 0.064, L = A.x1 - A.x0 + 0.3;
  perfilDeck.moveTo(0, 0);
  for (let x = 0; x < L - 1e-6; x += onda) {
    perfilDeck.lineTo(x + 0.06, 0); perfilDeck.lineTo(x + 0.1, alto); perfilDeck.lineTo(x + 0.2, alto); perfilDeck.lineTo(x + 0.24, 0); perfilDeck.lineTo(Math.min(x + onda, L), 0);
  }
  perfilDeck.lineTo(L, -0.003); perfilDeck.lineTo(0, -0.003); perfilDeck.closePath();
  const geo = new THREE.ExtrudeGeometry(perfilDeck, { depth: A.z1 - A.z0 + 0.3, bevelEnabled: false });
  const d = new THREE.Mesh(geo, M.deck);
  d.position.set(A.x0 - 0.15, A.y1 + 0.383, A.z1 + 0.15); d.rotation.y = 0;
  d.scale.z = -1;                          // extruye hacia -z
  d.castShadow = d.receiveShadow = true;
  capas.deck.add(d);
  // pijas de fijación sobre polines
  for (let x = A.x0; x <= A.x1; x += 0.61) for (let z = A.z0; z <= A.z1 + 0.01; z += 1.25)
    caja(capas.deck, x + 0.03, x + 0.06, A.y1 + 0.383, A.y1 + 0.4, z - 0.015, z + 0.015, M.antracita, false);
}
/* Cerramiento Durock: placas 1.22 x 2.44 sobre los bastidores, con juntas */
function durock(g, eje, fijo, a0, a1, vanos, lado) {
  const e = 0.0127, off = lado * (0.045 + e / 2);
  const placa = (b0, b1, c0, c1) => eje === "x"
    ? caja(g, b0 + 0.004, b1 - 0.004, c0 + 0.004, c1 - 0.004, fijo + off - e / 2, fijo + off + e / 2, M.durock)
    : caja(g, fijo + off - e / 2, fijo + off + e / 2, c0 + 0.004, c1 - 0.004, b0 + 0.004, b1 - 0.004, M.durock);
  for (let a = a0; a < a1 - 0.01; a += 1.22) {
    const b = Math.min(a + 1.22, a1);
    const v = vanos.filter(v => v[0] < b && v[1] > a);
    if (!v.length) { placa(a, b, A.y0, A.y1); continue; }
    for (const [v0, v1, s0, s1] of v) {
      if (v0 > a) placa(a, Math.min(v0, b), A.y0, A.y1);
      if (v1 < b) placa(Math.max(v1, a), b, A.y0, A.y1);
      const c0 = Math.max(a, v0), c1 = Math.min(b, v1);
      if (s0 > A.y0 + 0.05) placa(c0, c1, A.y0, s0);
      placa(c0, c1, s1, A.y1);
    }
  }
}
{
  const g = capas.durock;
  durock(g, "x", A.z1, A.x0, A.x1, VANOS3["x:0"], 1);
  durock(g, "x", A.z0, A.x0, A.x1, VANOS3["x:-5"], -1);
  durock(g, "z", A.x1, A.z0, A.z1, VANOS3["z:6"], 1);
  durock(g, "z", A.x0, A.z0, A.z1, VANOS3["z:-2"], -1);
}
/* Acabado de la ampliación: aplanado blanco, porcelanato claro, remate y cancelería */
{
  const g = capas.ampliacion;
  const e = 0.07, y0 = A.y0, y1 = A.y1 + 0.5;
  // envolvente terminada (cubre Durock y cubierta) como piezas alrededor de los vanos
  muro(g, "x", A.z1 + 0.06, A.x0 - 0.06, A.x1 + 0.06, y0, y1, e, VANOS3["x:0"], M.blanco);
  muro(g, "x", A.z0 - 0.06, A.x0 - 0.06, A.x1 + 0.06, y0, y1, e, VANOS3["x:-5"], M.blanco);
  muro(g, "z", A.x1 + 0.06, A.z0 - 0.06, A.z1 + 0.06, y0, y1, e, VANOS3["z:6"], M.blanco);
  muro(g, "z", A.x0 - 0.06, A.z0 - 0.06, A.z1 + 0.06, y0, y1, e, [], M.blanco);
  caja(g, A.x0 - 0.12, A.x1 + 0.12, y1 - 0.02, y1 + 0.08, A.z0 - 0.12, A.z1 + 0.12, M.grisOscuro);  // remate de cubierta
  // porcelanato claro de gran formato en el costado derecho
  texturizada(g, A.x1 + 0.1, A.x1 + 0.13, y0, y1 - 0.02, A.z0 - 0.1, A.z1 + 0.1, (a, b) => porcelanato("#d9d6cf", "#b9b5ad", a, b, [1.2, 0.6], 1));
  const luz = capas.luces3;
  ventana(g, "x", A.z1 + 0.06, -1.4, 3.4, y0, y0 + 2.4, { divisiones: 4, luz });
  ventana(g, "x", A.z1 + 0.06, 4.0, 5.4, y0 + 0.9, y0 + 2.2, { divisiones: 2, luz });
  ventana(g, "z", A.x1 + 0.13, -3.6, -1.4, y0 + 0.9, y0 + 2.2, { luz });
  ventana(g, "x", A.z0 - 0.06, 1.0, 3.0, y0 + 0.9, y0 + 2.2, { cara: -1, luz });
  for (const x of [-0.6, 1.0, 2.6]) downlight(luz, x, y0 + 2.62, A.z1 + 0.25);
}
/* Terraza: piso, pérgola, barandal de cristal, mobiliario y vegetación limitada */
{
  const g = capas.terraza, y = NIV[2];
  const piso = (x0, x1, z0, z1) => texturizada(g, x0, x1, y, y + 0.03, z0, z1, (a, b) => porcelanato("#cfc8bb", "#a9a297", a, Math.abs(z1 - z0), [0.6, 0.6]));
  piso(XMIN + 0.18, XMAX - 0.18, 0.05, ZMAX - 0.18);
  piso(XMIN + 0.18, A.x0 - 0.1, ZMIN + 0.18, 0.05);
  // barandal de cristal sobre el pretil (pretil 0.6 + cristal 0.5)
  barandalVidrio(g, "x", ZMAX - 0.09, XMIN + 0.1, XMAX - 0.1, y + 0.6, 0.5);
  barandalVidrio(g, "z", XMIN + 0.09, ZMIN + 0.1, ZMAX - 0.1, y + 0.6, 0.5);
  barandalVidrio(g, "z", XMAX - 0.09, 0.1, ZMAX - 0.1, y + 0.6, 0.5);
  // Pérgola: postes de acero sobre ejes (-6,0), (-6,5), (-2,5) y a la ampliación; vigas y lamas de madera
  const yp = y + 2.75;
  for (const [x, z] of [[-5.85, 0.2], [-5.85, 4.75], [-2.15, 4.75]]) caja(g, x - 0.06, x + 0.06, y, yp, z - 0.06, z + 0.06, M.antracita);
  caja(g, -5.95, -2.0, yp - 0.22, yp, 4.69, 4.81, M.antracita);
  caja(g, -5.95, -2.0, yp - 0.22, yp, 0.14, 0.26, M.antracita);
  caja(g, -5.91, -5.79, yp - 0.22, yp, 0.14, 4.81, M.antracita);
  for (let x = -5.75; x <= -2.2; x += 0.28) caja(g, x, x + 0.07, yp, yp + 0.14, 0.05, 4.95, M.madera);
  for (const [x, z] of [[-4.6, 1.6], [-3.2, 1.6], [-4.6, 3.4], [-3.2, 3.4]]) downlight(capas.luces3, x, yp - 0.22, z);
  // Mobiliario discreto
  caja(g, -5.5, -3.3, y, y + 0.4, 1.0, 1.8, M.tela);
  caja(g, -5.5, -3.3, y + 0.4, y + 0.75, 1.0, 1.2, M.tela);
  caja(g, -4.9, -3.9, y, y + 0.32, 2.4, 3.2, M.madera);
  caja(g, 1.5, 3.3, y + 0.72, y + 0.76, 2.2, 3.2, M.madera);
  for (const cx of [1.8, 3.0]) for (const cz of [1.85, 3.55]) caja(g, cx - 0.2, cx + 0.2, y, y + 0.45, cz - 0.2, cz + 0.2, M.antracita);
  for (const [x, z] of [[-5.6, 4.5], [5.5, 0.6]]) {
    caja(g, x - 0.25, x + 0.25, y, y + 0.5, z - 0.25, z + 0.25, M.maceta);
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), M.planta); p.position.set(x, y + 1.0, z); p.scale.y = 1.4; p.castShadow = true; g.add(p);
  }
}

/* =====================================================================
   PLANO ARQUITECTÓNICO dorado (sale de los mismos muros de planta baja)
   ===================================================================== */
{
  const pts = [];
  const seg = (x0, z0, x1, z1) => pts.push(x0, 0, z0, x1, 0, z1);
  const rect = (x0, x1, z0, z1) => { seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0); };
  for (const w of vanosPlanta) {
    const t = w.grosor / 2;
    let cursor = w.a0;
    const tramo = (b0, b1) => { if (b1 - b0 > 0.01) w.eje === "x" ? rect(b0, b1, w.fijo - t, w.fijo + t) : rect(w.fijo - t, w.fijo + t, b0, b1); };
    for (const v of w.vanos) {
      tramo(cursor, v[0]);
      // ventana: línea central del cristal; puerta: abatimiento en arco
      if (v[2] > 0.35) w.eje === "x" ? seg(v[0], w.fijo, v[1], w.fijo) : seg(w.fijo, v[0], w.fijo, v[1]);
      else {
        const r = v[1] - v[0], n = 10;
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI / 2, b = (i + 1) / n * Math.PI / 2;
          if (w.eje === "x") seg(v[0] + r * Math.cos(a), w.fijo - r * Math.sin(a), v[0] + r * Math.cos(b), w.fijo - r * Math.sin(b));
          else seg(w.fijo + r * Math.sin(a), v[0] + r * Math.cos(a), w.fijo + r * Math.sin(b), v[0] + r * Math.cos(b));
        }
        w.eje === "x" ? seg(v[0], w.fijo, v[0], w.fijo - r) : seg(w.fijo, v[0], w.fijo + r, v[0]);
      }
      cursor = v[1];
    }
    tramo(cursor, w.a1);
  }
  // escalera: huellas
  for (let i = 0; i <= 9; i++) { seg(-1.85, -1.25 - i * 0.28, -0.75, -1.25 - i * 0.28); seg(-0.65, -1.25 - i * 0.28, 0.45, -1.25 - i * 0.28); }
  // cocina e isla
  rect(-5.8, -2.3, -4.82, -4.22); rect(-5.82, -5.22, -4.2, -2.6); rect(-4.9, -3.1, -2.7, -1.9);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const plano = new THREE.LineSegments(g, lineaOro); plano.position.y = 0.32; capas.plano.add(plano);
  // ejes estructurales con burbujas
  const ej = [];
  for (const x of EX) ej.push(x, 0, -6.6, x, 0, 6.6);
  for (const z of EZ) ej.push(-7.6, 0, z, 7.6, 0, z);
  const ge = new THREE.BufferGeometry(); ge.setAttribute("position", new THREE.Float32BufferAttribute(ej, 3));
  const ejes = new THREE.LineSegments(ge, lineaOroTenue); ejes.position.y = 0.32; capas.plano.add(ejes);
  const burbuja = new THREE.EdgesGeometry(new THREE.CircleGeometry(0.28, 20));
  for (const x of EX) { const c = new THREE.LineSegments(burbuja, lineaOroTenue); c.rotation.x = -Math.PI / 2; c.position.set(x, 0.32, 6.9); capas.plano.add(c); }
  for (const z of EZ) { const c = new THREE.LineSegments(burbuja, lineaOroTenue); c.rotation.x = -Math.PI / 2; c.position.set(-7.9, 0.32, z); capas.plano.add(c); }
}

/* =====================================================================
   LÍNEAS DORADAS: aristas de la casa terminada con oclusión (sin líneas ocultas)
   ===================================================================== */
const ocultador = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
function construirLineas(capasFuente) {
  capas.lineas.clear();
  for (const n of capasFuente) capas[n].traverse(o => {
    if (!o.isMesh || o.userData.vidrio) return;
    const p = o.geometry.parameters || {};
    if (p.width !== undefined && Math.min(p.width, p.height, p.depth) * Math.max(p.width, p.height, p.depth) < 0.0004) return;
    o.updateWorldMatrix(true, false);
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), lineaOro);
    l.applyMatrix4(o.matrixWorld);
    const oc = new THREE.Mesh(o.geometry, ocultador); oc.applyMatrix4(o.matrixWorld);
    capas.lineas.add(l, oc);
  });
}

/* =====================================================================
   ETAPAS DEL PROTOTIPO (cuadros fijos para revisión)
   ===================================================================== */
const terminados = ["fachada", "jardin", "luces"];
function materialMuros(mat) { for (const n of ["muros1", "muros2"]) capas[n].traverse(o => { if (o.isMesh) o.material = mat; }); }
function soloCapas(lista) {
  if (lista.includes("estructura1")) lista = [...lista, "escalera"];
  for (const n in capas) { capas[n].visible = lista.includes(n); for (const o of capas[n].children) o.visible = true; }
}

const CAM = {
  general: { pos: [24, 17, 34], obj: [0.4, 3.6, 0.5], fov: 25, despl: -0.19 },
  alto: { pos: [24, 20, 34], obj: [0.4, 4.6, 0.0], fov: 27, despl: -0.19 },
  plano: { pos: [20, 26, 28], obj: [0, 0, 0.5], fov: 29, despl: -0.19 },
  interior: { pos: [9, 21, 15], obj: [-1.6, 0.6, -0.6], fov: 32, despl: -0.17 },
};
function camaraEn(c) {
  camara.fov = c.fov; camara.position.set(...c.pos); camara.lookAt(...c.obj);
  camara.setViewOffset(ANCHO, ALTO, ANCHO * c.despl, 0, ANCHO, ALTO);
  camara.updateProjectionMatrix();
}

const ETAPAS = {
  plano() { soloCapas(["terreno", "plano"]); camaraEn(CAM.plano); },
  cimentacion() { soloCapas(["terreno", "plano", "cimentacion"]); M.terreno.opacity = 0.35; camaraEn(CAM.plano); },
  estructura() { soloCapas(["terreno", "cimentacion", "firme", "estructura1", "estructura2", "azotea"]); M.terreno.opacity = 0.55; camaraEn(CAM.general); },
  obraGris() { soloCapas(["terreno", "cimentacion", "firme", "estructura1", "estructura2", "muros1", "muros2", "azotea"]); materialMuros(M.block); camaraEn(CAM.general); },
  acabados() {
    soloCapas(["terreno", "firme", "escalera", "muros1", "interior1", "fachada", "luces", "jardin"]); materialMuros(M.blanco); camaraEn(CAM.interior);
    // solo planta baja: lo que arranca arriba de 3 m (planta alta, volados) se oculta en este corte
    for (const n of ["fachada", "luces"]) for (const o of capas[n].children) o.visible = o.position.y - (o.geometry.parameters?.height || 0) / 2 < 3.0;
    for (const r of resplandores) r.visible = false;
    for (const o of capas.escalera.children) o.visible = o.position.y < 3.0;
  },
  dosNiveles() { soloCapas(["terreno", "firme", "estructura1", "estructura2", "muros1", "muros2", "azotea", "interior1", "interior2", ...terminados]); materialMuros(M.blanco); camaraEn(CAM.general); },
  steelFraming() { soloCapas(["terreno", "firme", "estructura1", "estructura2", "muros1", "muros2", "azotea", ...terminados, "acero"]); materialMuros(M.blanco); camaraEn(CAM.alto); },
  deckDurock() { soloCapas(["terreno", "firme", "estructura1", "estructura2", "muros1", "muros2", "azotea", ...terminados, "acero", "deck", "durock"]); materialMuros(M.blanco); camaraEn(CAM.alto); },
  tresNiveles() { soloCapas(["terreno", "firme", "luces3", "estructura1", "estructura2", "muros1", "muros2", "azotea", "interior1", "interior2", ...terminados, "acero", "ampliacion", "terraza"]); materialMuros(M.blanco); camaraEn(CAM.alto); },
  lineasDoradas() {
    const fuente = ["escalera", "estructura1", "estructura2", "muros1", "muros2", "azotea", "fachada", "ampliacion", "terraza"];
    materialMuros(M.blanco); construirLineas(fuente);
    soloCapas(["lineas"]); camaraEn(CAM.alto);
  },
};
window.etapas = Object.keys(ETAPAS);
window.mostrar = nombre => { ETAPAS[nombre](); renderer.render(scene, camara); return true; };

const panel = document.getElementById("panel");
for (const n of window.etapas) {
  const b = document.createElement("button"); b.textContent = n; b.onclick = () => window.mostrar(n); panel.appendChild(b);
}
window.mostrar(params.get("etapa") || "tresNiveles");
window.listo = true;
