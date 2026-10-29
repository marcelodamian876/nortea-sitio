/* =====================================================================
   NORTEA · Catálogo de obras
   ---------------------------------------------------------------------
   El diseño NO depende de dónde vengan los datos. Hoy se leen de
   data/obras.json. Para conectarlo después a un panel o base de datos,
   solo cambia la función FUENTE_DE_OBRAS para que regrese la misma
   estructura (una lista de obras) desde tu API.
   ===================================================================== */
(function () {
  "use strict";
  var NORTEA = window.NORTEA || {};

  // ---- 1. Fuente de datos (único punto a cambiar para usar una API) ----
  function FUENTE_DE_OBRAS() {
    return fetch("data/obras.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (json) { return json.obras || []; });
  }

  // ---- 2. Normaliza cada obra para que el diseño siempre reciba lo mismo ----
  // Los nombres reales solo se muestran si la obra lo dice explícitamente
  // (mostrarNombreObra / mostrarCliente = true en data/obras.json).
  function normalizar(o) {
    var cats = o.categorias || (o.categoria ? [o.categoria] : []);
    return {
      id: String(o.id || ""),
      nombre: (o.mostrarNombreObra === true && o.nombreProyecto) || o.nombre || "Obra",
      cliente: o.mostrarCliente === true ? o.cliente || "" : "",
      categorias: Array.isArray(cats) ? cats : [cats],
      tipoTrabajo: o.tipoTrabajo || cats[0] || "",
      ubicacion: o.ubicacion || "",
      anio: o.anio || "",
      estado: o.estado || "",
      descripcion: o.descripcion || "",
      partidas: o.partidas || [],
      ejemplo: !!o.ejemplo,
      fotos: (o.fotos || []).map(function (f) { return typeof f === "string" ? { src: f, alt: "" } : f; }),
    };
  }

  // Si la foto es .webp y fue preparada con la herramienta, existen versiones
  // -480.webp y -960.webp junto a la original (1600 px).
  function srcsetDe(foto) {
    if (foto.unico || !/\.webp$/i.test(foto.src)) return "";
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
  var estadoLive = document.getElementById("obras-status");
  if (!grid) return;
  var obras = [];

  // ---- 3. Tarjetas ----
  function render(lista) {
    grid.textContent = "";
    lista.forEach(function (o) {
      var li = document.createElement("li");
      li.className = "work reveal";
      li.dataset.cats = o.categorias.join("|");

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "work__btn";
      btn.setAttribute("aria-haspopup", "dialog");
      btn.addEventListener("click", function () { abrir(o, btn); });

      var media = document.createElement("div");
      media.className = "work__media";
      if (o.fotos[0]) media.appendChild(crearImg(o.fotos[0], o.nombre, "(min-width: 900px) 33vw, (min-width: 640px) 50vw, 100vw", true));
      if (o.ejemplo) media.insertAdjacentHTML("beforeend", '<span class="work__badge work__badge--ejemplo">Ejemplo</span>');
      if (o.estado === "en proceso") media.insertAdjacentHTML("beforeend", '<span class="work__badge">En proceso</span>');
      if (o.fotos.length > 1) {
        var n = document.createElement("span");
        n.className = "work__photos";
        n.textContent = o.fotos.length + " fotos";
        media.appendChild(n);
      }

      var body = document.createElement("div");
      body.className = "work__body";
      var tipo = document.createElement("p"); tipo.className = "work__type"; tipo.textContent = o.categorias.join(" · ");
      var h = document.createElement("h3"); h.className = "work__title"; h.textContent = o.nombre;
      var loc = document.createElement("p"); loc.className = "work__loc";
      loc.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-pin"/></svg>';
      loc.appendChild(document.createTextNode(o.ubicacion));
      body.append(tipo, h, loc);

      btn.append(media, body);
      li.appendChild(btn);
      grid.appendChild(li);
    });
    if (NORTEA.observarReveal) NORTEA.observarReveal(grid);
  }

  // ---- 4. Filtros ----
  // Se crean solos con las categorías que existen en las obras, en este orden de prioridad.
  var ORDEN_CATEGORIAS = ["Obra civil", "Acabados", "Fachadas", "Tablaroca", "Durock", "Ampliaciones y remodelaciones", "Comercial", "Industrial"];
  var contFiltros = document.getElementById("obras-filtros");
  var filtros = [];
  function crearFiltros(lista) {
    var usadas = {};
    lista.forEach(function (o) { o.categorias.forEach(function (c) { usadas[c] = true; }); });
    var cats = ORDEN_CATEGORIAS.filter(function (c) { return usadas[c]; })
      .concat(Object.keys(usadas).filter(function (c) { return ORDEN_CATEGORIAS.indexOf(c) === -1; }));
    ["todas"].concat(cats).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "filter";
      b.dataset.filter = c;
      b.textContent = c === "todas" ? "Todas" : c;
      b.addEventListener("click", function () {
        filtrar(c);
        if (NORTEA.track) NORTEA.track("filtro_obras", { categoria: c });
      });
      contFiltros.appendChild(b);
    });
    filtros = contFiltros.querySelectorAll(".filter");
  }
  function filtrar(cat) {
    var visibles = 0;
    grid.querySelectorAll(".work").forEach(function (li) {
      var ok = cat === "todas" || li.dataset.cats.split("|").indexOf(cat) !== -1;
      li.hidden = !ok;
      if (ok) visibles++;
    });
    vacio.hidden = visibles > 0;
    if (NORTEA.liberarReveal) NORTEA.liberarReveal();
    if (estadoLive) estadoLive.textContent = visibles + (visibles === 1 ? " obra" : " obras") + (cat === "todas" ? "" : " de " + cat);
    filtros.forEach(function (b) {
      var activo = b.dataset.filter === cat;
      b.classList.toggle("is-active", activo);
      b.setAttribute("aria-pressed", String(activo));
    });
  }
  // ---- 5. Vista ampliada con carrusel ----
  var dlg = document.getElementById("obra-dialog");
  var track = document.getElementById("obra-track");
  var count = document.getElementById("obra-count");
  var prev = dlg.querySelector(".carousel__btn--prev");
  var next = dlg.querySelector(".carousel__btn--next");
  var origenFoco = null;
  var total = 0;

  function indiceActual() { return track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0; }
  function actualizarContador() {
    var i = indiceActual();
    count.textContent = total ? (i + 1) + " / " + total : "";
    prev.disabled = i <= 0;
    next.disabled = i >= total - 1;
  }
  function ir(dir) { track.scrollTo({ left: (indiceActual() + dir) * track.clientWidth }); }

  function abrir(o, desde) {
    origenFoco = desde;
    track.textContent = "";
    total = o.fotos.length;
    o.fotos.forEach(function (f, i) {
      var fig = document.createElement("figure");
      fig.className = "carousel__slide";
      fig.setAttribute("aria-label", "Foto " + (i + 1) + " de " + total);
      fig.appendChild(crearImg(f, o.nombre + ", foto " + (i + 1), "(min-width: 1100px) 560px, (min-width: 640px) 920px, 100vw", i > 0));
      track.appendChild(fig);
    });
    var unaFoto = total < 2;
    prev.hidden = next.hidden = unaFoto;
    document.getElementById("obra-meta").textContent = [o.categorias.join(" · "), o.ubicacion, o.anio].filter(Boolean).join(" · ") + (o.estado === "en proceso" ? " · En proceso" : "");
    document.getElementById("obra-dialog-title").textContent = o.nombre + (o.ejemplo ? " (ejemplo)" : "");
    var cliente = document.getElementById("obra-cliente");
    cliente.textContent = o.cliente ? "Cliente: " + o.cliente : "";
    cliente.hidden = !o.cliente;
    document.getElementById("obra-desc").textContent = o.descripcion;
    var ul = document.getElementById("obra-partidas");
    ul.textContent = "";
    o.partidas.forEach(function (p) { var li = document.createElement("li"); li.textContent = p; ul.appendChild(li); });
    ul.hidden = !o.partidas.length;
    document.getElementById("obra-partidas-titulo").hidden = !o.partidas.length;
    var wa = document.getElementById("obra-wa");
    if (NORTEA.prepararEnlaceWa) NORTEA.prepararEnlaceWa(wa, "obra", o.nombre);
    wa.dataset.obraId = o.id;

    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    document.body.style.overflow = "hidden";
    track.scrollLeft = 0;
    actualizarContador();
    if (NORTEA.track) NORTEA.track("ver_obra", { obra_id: o.id });
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

  // ---- 6. Arranque ----
  FUENTE_DE_OBRAS()
    .then(function (lista) {
      obras = lista.map(normalizar);
      crearFiltros(obras);
      render(obras);
      filtrar("todas");
      if (estadoLive) estadoLive.textContent = "";
    })
    .catch(function (err) {
      console.error("No se pudieron cargar las obras:", err);
      vacio.textContent = "No pudimos cargar el catálogo en este momento. Escríbenos por WhatsApp y te mandamos fotos de obras similares.";
      vacio.hidden = false;
    });
})();
