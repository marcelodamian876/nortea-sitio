/* =====================================================================
   NORTEA · Portafolio por categorías (lo que hacemos)
   ---------------------------------------------------------------------
   Sin filtros: cada categoría es una tarjeta con su foto de portada; al
   abrirla se ven sus fotografías (con su pie: obra y municipio), lo que
   incluye y el botón para cotizar por WhatsApp.
   Los datos salen de data/obras.json → "categorias". Para agregar fotos,
   súmalas a la lista "fotos" de la categoría (la primera es la portada).
   ===================================================================== */
(function () {
  "use strict";
  var NORTEA = window.NORTEA || {};

  // ---- 1. Fuente de datos (único punto a cambiar para usar una API) ----
  function FUENTE() {
    return fetch("data/obras.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (json) { return json.categorias || []; });
  }

  // ---- 2. Normaliza cada categoría para que el diseño siempre reciba lo mismo ----
  function normalizar(c) {
    return {
      id: String(c.id || ""),
      nombre: c.nombre || "",
      resumen: c.resumen || "",
      descripcion: c.descripcion || c.resumen || "",
      partidas: c.partidas || [],
      wa: c.wa || "general",
      fotos: (c.fotos || []).map(function (f) { return typeof f === "string" ? { src: f, alt: "" } : f; }),
    };
  }

  // Fotos preparadas con la herramienta: junto a la original existen -480.webp y -960.webp.
  // Las que no siguen esa regla traen su propio "srcset" en el JSON.
  function srcsetDe(foto) {
    if (foto.srcset) return foto.srcset;
    if (foto.unico || !/^obras\/.*\.webp$/i.test(foto.src)) return "";
    var base = foto.src.replace(/\.webp$/i, "");
    return base + "-480.webp 480w, " + base + "-960.webp 960w, " + foto.src + " 1600w";
  }
  function crearImg(foto, alt, sizes, lazy) {
    var img = document.createElement("img");
    // "lazy" va ANTES de src: si no, el navegador empieza a descargar de inmediato.
    if (lazy) img.loading = "lazy";
    img.decoding = "async";
    img.width = 800; img.height = 600;
    img.alt = foto.alt || alt;
    var ss = srcsetDe(foto);
    if (ss) { img.sizes = sizes; img.srcset = ss; }
    img.src = foto.src;
    return img;
  }

  var grid = document.getElementById("obras-grid");
  var vacio = document.getElementById("obras-empty");
  if (!grid) return;

  // ---- 3. Tarjetas de categoría ----
  function render(lista) {
    grid.textContent = "";
    lista.forEach(function (c, i) {
      var li = document.createElement("li");
      li.className = "work reveal";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "work__btn";
      btn.setAttribute("aria-haspopup", "dialog");
      btn.addEventListener("click", function () { abrir(c, btn); });

      var media = document.createElement("div");
      media.className = "work__media";
      if (c.fotos[0]) media.appendChild(crearImg(c.fotos[0], c.nombre, "(min-width: 1000px) 33vw, (min-width: 640px) 50vw, 100vw", true));
      var num = document.createElement("span");
      num.className = "work__num"; num.setAttribute("aria-hidden", "true");
      num.textContent = String(i + 1).padStart(2, "0");
      media.appendChild(num);

      var body = document.createElement("div");
      body.className = "work__body";
      var h = document.createElement("h3"); h.className = "work__title"; h.textContent = c.nombre;
      var summary = document.createElement("p"); summary.className = "work__summary"; summary.textContent = c.resumen;
      var explore = document.createElement("span"); explore.className = "work__explore"; explore.textContent = "Ver fotos ↗";
      body.append(h, summary, explore);

      btn.append(media, body);
      li.appendChild(btn);
      grid.appendChild(li);
    });
    if (NORTEA.observarReveal) NORTEA.observarReveal(grid);
  }

  // ---- 4. Vista ampliada con carrusel ----
  var dlg = document.getElementById("obra-dialog");
  var track = document.getElementById("obra-track");
  var count = document.getElementById("obra-count");
  var pie = document.getElementById("obra-pie");
  var prev = dlg.querySelector(".carousel__btn--prev");
  var next = dlg.querySelector(".carousel__btn--next");
  var origenFoco = null;
  var actual = null;

  function indiceActual() { return track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0; }
  function actualizarContador() {
    var total = actual ? actual.fotos.length : 0, i = Math.min(indiceActual(), Math.max(0, total - 1));
    count.textContent = total > 1 ? (i + 1) + " / " + total : "";
    count.hidden = total < 2;
    var f = actual && actual.fotos[i];
    if (pie) { pie.textContent = (f && f.pie) || ""; pie.hidden = !(f && f.pie); }
    prev.disabled = i <= 0;
    next.disabled = i >= total - 1;
  }
  function ir(dir) { track.scrollTo({ left: (indiceActual() + dir) * track.clientWidth }); }

  function abrir(c, desde) {
    origenFoco = desde;
    actual = c;
    track.textContent = "";
    var total = c.fotos.length;
    c.fotos.forEach(function (f, i) {
      var fig = document.createElement("figure");
      fig.className = "carousel__slide";
      fig.setAttribute("aria-label", "Foto " + (i + 1) + " de " + total + (f.pie ? ": " + f.pie : ""));
      fig.appendChild(crearImg(f, c.nombre + ", foto " + (i + 1), "(min-width: 1100px) 560px, (min-width: 640px) 920px, 100vw", i > 0));
      track.appendChild(fig);
    });
    prev.hidden = next.hidden = total < 2;
    document.getElementById("obra-meta").textContent = "Lo que hacemos";
    document.getElementById("obra-dialog-title").textContent = c.nombre;
    document.getElementById("obra-desc").textContent = c.descripcion;
    var ul = document.getElementById("obra-partidas");
    ul.textContent = "";
    c.partidas.forEach(function (p) { var li = document.createElement("li"); li.textContent = p; ul.appendChild(li); });
    ul.hidden = !c.partidas.length;
    document.getElementById("obra-partidas-titulo").hidden = !c.partidas.length;
    var wa = document.getElementById("obra-wa");
    if (NORTEA.prepararEnlaceWa) NORTEA.prepararEnlaceWa(wa, c.wa);
    wa.dataset.obraId = c.id;
    var waTexto = document.getElementById("obra-wa-texto");
    if (waTexto) waTexto.textContent = "Cotizar " + c.nombre.toLowerCase();

    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    document.body.style.overflow = "hidden";
    track.scrollLeft = 0;
    actualizarContador();
    if (NORTEA.track) NORTEA.track("ver_categoria", { categoria: c.id });
  }
  function cerrar() { if (dlg.open) dlg.close(); }

  dlg.addEventListener("close", function () {
    document.body.style.overflow = "";
    if (origenFoco) origenFoco.focus();
  });
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg || e.target.closest("[data-close]")) cerrar();
  });
  prev.addEventListener("click", function () { ir(-1); });
  next.addEventListener("click", function () { ir(1); });
  var t;
  track.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(actualizarContador, 60); }, { passive: true });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); ir(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); ir(1); }
  });

  // ---- 5. Arranque ----
  FUENTE()
    .then(function (lista) {
      var cats = lista.map(normalizar).filter(function (c) { return c.nombre && c.fotos.length; });
      if (!cats.length) throw new Error("sin categorías");
      render(cats);
    })
    .catch(function (err) {
      // Se quedan las tarjetas del HTML (cada una abre su foto de portada).
      console.error("No se pudo cargar el portafolio:", err);
      if (vacio) vacio.hidden = true;
    });
})();
