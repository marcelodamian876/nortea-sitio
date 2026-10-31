/* =====================================================================
   NORTEA · Lógica general (WhatsApp, menú, analítica, datos del sitio)
   Todos los datos salen de site.config.js (window.SITE).
   ===================================================================== */
(function () {
  "use strict";
  var SITE = window.SITE || {};
  var NORTEA = (window.NORTEA = window.NORTEA || {});

  /* ---------- Origen de la visita (UTM) ----------
     Comparte tu enlace con ?utm_source=..., por ejemplo:
       https://nortea.mx/?utm_source=instagram
       https://nortea.mx/?utm_source=whatsapp
       https://nortea.mx/?utm_source=marketplace
       https://nortea.mx/?utm_source=google_perfil
     El origen se guarda durante la visita y se envía con cada clic a WhatsApp. */
  var origen = (function () {
    var params = new URLSearchParams(location.search);
    var data = {
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
    };
    try {
      if (data.source) sessionStorage.setItem("nortea_origen", JSON.stringify(data));
      else data = JSON.parse(sessionStorage.getItem("nortea_origen")) || data;
    } catch (e) { /* almacenamiento no disponible: se usa solo la URL */ }
    if (!data.source && document.referrer) {
      try {
        var host = new URL(document.referrer).hostname;
        if (host && host !== location.hostname) data.source = "ref:" + host.replace(/^www\./, "");
      } catch (e) {}
    }
    return data;
  })();
  NORTEA.origen = origen;

  /* ---------- Analítica ----------
     Cada evento se envía a:
       1) window.dataLayer (Google Tag Manager / GA4)
       2) un evento del navegador "nortea:track" (para conectar lo que quieras)
       3) gtag() y fbq() si ya están instalados en la página. */
  NORTEA.track = function (nombre, datos) {
    var payload = Object.assign({ event: nombre, utm_source: origen.source, utm_medium: origen.medium, utm_campaign: origen.campaign }, datos || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    try { document.dispatchEvent(new CustomEvent("nortea:track", { detail: payload })); } catch (e) {}
    if (typeof window.gtag === "function") window.gtag("event", nombre, payload);
    if (typeof window.fbq === "function" && nombre === "whatsapp_click") window.fbq("track", "Contact", payload);
  };

  /* ---------- Enlaces de WhatsApp ---------- */
  NORTEA.waMensaje = function (clave, extra) {
    var wa = SITE.whatsapp || {};
    var texto;
    if (clave === "obra") texto = (wa.obra || wa.general || "").replace("{obra}", extra || "");
    else texto = (wa.servicios && wa.servicios[clave]) || wa.general || "";
    if (wa.incluirOrigenEnMensaje && origen.source) texto += " (ref: " + origen.source + ")";
    return texto;
  };
  NORTEA.waUrl = function (clave, extra) {
    var numero = SITE.whatsappNumero || "528120348618";
    return "https://wa.me/" + numero + "?text=" + encodeURIComponent(NORTEA.waMensaje(clave, extra));
  };
  NORTEA.prepararEnlaceWa = function (el, clave, extra) {
    el.href = NORTEA.waUrl(clave, extra);
    el.dataset.waKey = clave;
  };

  document.querySelectorAll("[data-wa]").forEach(function (el) {
    NORTEA.prepararEnlaceWa(el, el.dataset.wa);
  });

  // Un solo escuchador para todos los botones de WhatsApp (incluso los que se crean después).
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="https://wa.me/"]');
    if (!a) return;
    NORTEA.track("whatsapp_click", {
      wa_tipo: a.dataset.waKey || "general",
      wa_ubicacion: a.dataset.waPlace || "",
      obra_id: a.dataset.obraId || "",
    });
  });

  /* ---------- Datos de contacto desde la configuración ---------- */
  var dir = SITE.direccion || {};
  var direccionTexto = [dir.calle, dir.ciudad + ", " + dir.estado + " " + dir.cp].filter(Boolean).join(", ");
  var valores = {
    telefonoVisible: SITE.telefonoVisible,
    correo: SITE.correo,
    direccionTexto: direccionTexto,
    horario: SITE.horario,
    instagram: SITE.instagram,
    responsable: SITE.responsable,
  };
  var pendiente = function (v) { return !v || /^TODO_/.test(v); };
  document.querySelectorAll("[data-site]").forEach(function (el) {
    var v = valores[el.dataset.site];
    if (v) el.textContent = v;
  });
  document.querySelectorAll("[data-site-href]").forEach(function (el) {
    var t = el.dataset.siteHref;
    if (t === "mailto" && SITE.correo) el.href = "mailto:" + SITE.correo;
    if (t === "instagram" && !pendiente(SITE.instagram)) el.href = "https://www.instagram.com/" + SITE.instagram + "/";
  });
  // Oculta horario e Instagram mientras sigan pendientes, para no mostrar "TODO_" al público.
  if (pendiente(SITE.horario)) document.querySelectorAll('[data-site-row="horario"]').forEach(function (el) { el.hidden = true; });
  if (pendiente(SITE.instagram)) document.querySelectorAll('[data-site-row="instagram"]').forEach(function (el) { el.hidden = true; });

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Datos estructurados (Google) ---------- */
  (function () {
    var dominio = SITE.dominio || "https://nortea.mx";
    var ld = {
      "@context": "https://schema.org",
      "@type": "GeneralContractor",
      "@id": dominio + "/#negocio",
      name: SITE.nombre,
      url: dominio + "/",
      logo: dominio + "/assets/img/marca/icon-512.png",
      image: dominio + "/assets/img/marca/og-nortea.jpg",
      // Sin "telephone": el contacto es solo por WhatsApp (no se reciben llamadas).
      email: SITE.correo,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        url: "https://wa.me/" + (SITE.whatsappNumero || "528120348618"),
        availableLanguage: "es",
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: dir.calle,
        addressLocality: dir.ciudad,
        addressRegion: dir.estadoCompleto || dir.estado,
        postalCode: dir.cp,
        addressCountry: dir.pais || "MX",
      },
      areaServed: (SITE.zonaServicio || []).map(function (c) { return { "@type": "City", name: c }; }),
      slogan: "Construimos para quienes construyen.",
      knowsAbout: ["Obra civil", "Naves industriales", "Firmes y losas", "Acabados", "Porcelanato", "Fachadas", "Tablaroca", "Durock", "Plafones", "Ampliaciones", "Remodelaciones"],
    };
    if (SITE.horarioSchema && SITE.horarioSchema.length) ld.openingHours = SITE.horarioSchema;
    var same = [];
    if (!pendiente(SITE.instagram)) same.push("https://www.instagram.com/" + SITE.instagram + "/");
    if (SITE.facebook) same.push(SITE.facebook);
    if (same.length) ld.sameAs = same;
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  })();

  /* ---------- Menú en celular ---------- */
  var header = document.getElementById("site-header");
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("nav");
  function setMenu(abierto) {
    toggle.setAttribute("aria-expanded", String(abierto));
    toggle.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    nav.classList.toggle("is-open", abierto);
    header.classList.toggle("is-open", abierto);
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setMenu(false); toggle.focus(); }
    });
  }

  /* ---------- Encabezado sólido al bajar + botón flotante ---------- */
  var waFloat = document.querySelector(".wa-float");
  var cierre = document.getElementById("cotizar");
  // Sin requestAnimationFrame a propósito: si el navegador pausa las animaciones,
  // la barra y el contenido igual reaccionan al scroll.
  // La barra se esconde al bajar y reaparece al subir. Nunca se esconde arriba
  // del todo, con el menú abierto ni si tiene el foco del teclado.
  var ultimoY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-solid", y > 0);
    var delta = y - ultimoY;
    if (Math.abs(delta) > 6) {
      var esconder = delta > 0 && y > header.offsetHeight &&
        !header.classList.contains("is-open") && !header.contains(document.activeElement);
      header.classList.toggle("is-hidden", esconder);
      ultimoY = y;
    }
    if (y <= 0) header.classList.remove("is-hidden");
    liberarPendientes();
  }
  header.addEventListener("focusin", function () { header.classList.remove("is-hidden"); });
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  // El botón flotante se esconde cuando la sección de cierre (con su botón grande) está a la vista.
  if ("IntersectionObserver" in window && waFloat && cierre) {
    new IntersectionObserver(function (entries) {
      waFloat.classList.toggle("is-hidden", entries[0].isIntersecting);
    }, { threshold: 0.35 }).observe(cierre);
  }

  /* ---------- Aparición suave al hacer scroll ----------
     Seguro por diseño: el contenido se ve aunque esto no corra. Solo se ocultan
     (.is-pending) los bloques que están debajo de la pantalla al cargar, y se
     liberan antes de entrar a la vista. Con cada scroll se libera también todo lo
     que ya quedó arriba, para que un salto con "Fin" no deje secciones en blanco. */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pendientes = [];
  function liberarPendientes() {
    if (!pendientes || !pendientes.length) return;
    var limite = window.innerHeight * 1.15;
    pendientes = pendientes.filter(function (el) {
      if (el.getBoundingClientRect().top < limite) { el.classList.remove("is-pending"); return false; }
      return true;
    });
  }
  NORTEA.observarReveal = function (root) {
    if (reduceMotion) return;
    (root || document).querySelectorAll(".reveal").forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight && pendientes.indexOf(el) === -1) {
        el.classList.add("is-pending");
        pendientes.push(el);
      }
    });
  };
  NORTEA.liberarReveal = liberarPendientes;
  NORTEA.observarReveal();
  window.addEventListener("resize", liberarPendientes, { passive: true });
  // Respaldo: revisa la posición cada 400 ms aunque el navegador no mande eventos
  // de scroll (pestaña en segundo plano, saltos con "Fin"). Se apaga solo al terminar.
  var vigilante = setInterval(function () {
    liberarPendientes();
    if (!pendientes.length) clearInterval(vigilante);
  }, 400);

  /* ---------- Video de portada (v10) ----------
     · A todo lo ancho, sin sonido, en bucle y automático, como un GIF (escritorio 16:9, celular 9:16).
     · El cierre lo dibuja el navegador en vector encima del video, sincronizado con su tiempo: en el video la casa
       dorada se vuelve una sola línea que llega como contorno del logo; desde ahí el sitio sigue con ese mismo
       contorno, rellena el isotipo y escribe el nombre. Nítido en cualquier pantalla. Datos: cierre-*.json.
     · Corre siempre (decisión del dueño, también con "reducir movimiento": es un movimiento lento, sin destellos).
       Solo con ahorro de datos o conexión 2G se queda la imagen estática.
     · Si el navegador bloquea el arranque automático (ahorro de batería), arranca con el primer toque, clic o scroll.
     · La versión se elige con el mismo criterio que la imagen estática del <picture>. */
  (function () {
    var v = document.querySelector(".hero__video");
    if (!v || !v.dataset.escritorioMp4) return;
    var conn = navigator.connection || {};
    var lento = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "");
    if (lento) { v.removeAttribute("autoplay"); return; }
    function reproducir() { v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    ["pointerdown", "touchstart", "scroll", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, function () { if (v.paused) reproducir(); }, { passive: true, once: true });
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && v.paused) reproducir(); });
    var mqMovil = window.matchMedia("(max-aspect-ratio: 4/5), (max-width: 639px)");
    var modo = "";
    function cargar() {
      var nuevo = mqMovil.matches ? "movil" : "escritorio";
      if (nuevo === modo) return;
      modo = nuevo;
      v.classList.remove("is-playing");
      v.src = v.dataset[modo + "Mp4"];
      reproducir();
      cargarCierre(v.dataset[modo + "Cierre"]);
    }
    v.addEventListener("playing", function () { v.classList.add("is-playing"); });

    // ----- cierre vectorial sincronizado con el video -----
    var svg = document.querySelector(".hero__cierre");
    var NS = "http://www.w3.org/2000/svg";
    var datos = null, el = {}, pedido = 0;
    function nodo(tag, attrs, padre) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (padre || svg).appendChild(n);
      return n;
    }
    function cargarCierre(url) {
      if (!svg || !url) return;
      var este = ++pedido;
      datos = null; svg.style.opacity = 0;
      fetch(url).then(function (r) { return r.json(); }).then(function (d) {
        if (este !== pedido) return;
        datos = d; construir(d);
      }).catch(function () {});
    }
    function construir(d) {
      svg.textContent = "";
      svg.setAttribute("viewBox", "0 0 " + d.W + " " + d.H);
      var L = d.logo, c = L.cajas, defs = nodo("defs", {});
      var gr = nodo("linearGradient", { id: "cOro", x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
      nodo("stop", { offset: 0, "stop-color": "#B8893A" }, gr); nodo("stop", { offset: 1, "stop-color": "#D9B566" }, gr);
      var fi = nodo("filter", { id: "cHalo", x: "-30%", y: "-30%", width: "160%", height: "160%" }, defs);
      nodo("feGaussianBlur", { stdDeviation: d.W / 320 }, fi);
      el.rIso = nodo("rect", {}, nodo("clipPath", { id: "cIso" }, defs));
      // barridos con borde suave (máscara con degradado) para nombre y leyenda
      function pluma(id, b) {
        var g = nodo("linearGradient", { id: id + "G", gradientUnits: "userSpaceOnUse", y1: 0, y2: 0 }, defs);
        nodo("stop", { offset: 0, "stop-color": "#fff" }, g); nodo("stop", { offset: 1, "stop-color": "#fff", "stop-opacity": 0 }, g);
        var m = nodo("mask", { id: id, maskUnits: "userSpaceOnUse", x: b.x0 - 100, y: b.y0 - 20, width: b.x1 - b.x0 + 200, height: b.y1 - b.y0 + 40 }, defs);
        nodo("rect", { x: b.x0 - 100, y: b.y0 - 20, width: b.x1 - b.x0 + 200, height: b.y1 - b.y0 + 40, fill: "url(#" + id + "G)" }, m);
        return g;
      }
      el.gNom = pluma("cNom", c.nombre); el.gLey = pluma("cLey", c.leyenda);
      el.todo = nodo("g", {});
      el.trazo = nodo("g", {}, el.todo);
      el.halo = nodo("path", { fill: "none", stroke: "#B8893A", "stroke-width": d.W / 300, "stroke-linejoin": "round", "stroke-linecap": "round", filter: "url(#cHalo)", opacity: 0.5 }, el.trazo);
      el.linea = nodo("path", { fill: "none", stroke: "#E8C777", "stroke-width": 2, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round", "stroke-linecap": "round" }, el.trazo);
      el.cabeza = nodo("circle", { r: d.W / 820, fill: "#FFF6E0" }, el.todo);
      var g = nodo("g", { transform: "translate(" + L.ox + " " + L.oy + ") scale(" + L.k + ") translate(" + -L.vx + " " + -L.vy + ")" }, el.todo);
      el.iso = nodo("path", { d: L.isotipo, fill: "url(#cOro)", "fill-rule": "evenodd", "clip-path": "url(#cIso)" }, g);
      el.nom = nodo("path", { d: L.nombre, fill: "#FFFFFF", "fill-rule": "evenodd", mask: "url(#cNom)" }, g);
      el.ley = nodo("path", { d: L.leyenda, fill: "#E7E1D5", "fill-rule": "evenodd", mask: "url(#cLey)" }, g);
      var acc = [0];
      for (var i = 1; i < d.camino.length; i++) acc.push(acc[i - 1] + Math.hypot(d.camino[i][0] - d.camino[i - 1][0], d.camino[i][1] - d.camino[i - 1][1]));
      d.acc = acc;
    }
    // la línea "serpiente": tramo visible del camino entre la cola (a) y la cabeza (b)
    function tramo(d, a, b) {
      var p = d.camino, acc = d.acc, out = [];
      for (var i = 1; i < p.length; i++) {
        var s0 = acc[i - 1], s1 = acc[i], L = s1 - s0;
        if (s1 < a || s0 > b || !L) continue;
        var t0 = Math.max(0, (a - s0) / L), t1 = Math.min(1, (b - s0) / L);
        if (!out.length) out.push([p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t0, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t0]);
        out.push([p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t1, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t1]);
      }
      return out;
    }    function ubicar(d) {
      // el svg cubre exactamente el área donde se ve el video (object-fit: cover + object-position)
      var w = v.clientWidth, h = v.clientHeight, s = Math.max(w / d.W, h / d.H);
      var pos = getComputedStyle(v).objectPosition.split(" ").map(function (x) { return parseFloat(x) / 100; });
      var dw = d.W * s, dh = d.H * s;
      svg.style.width = dw + "px"; svg.style.height = dh + "px";
      svg.style.left = (w - dw) * (isNaN(pos[0]) ? 0.5 : pos[0]) + "px";
      svg.style.top = (h - dh) * (isNaN(pos[1]) ? 0.5 : pos[1]) + "px";
    }
    function dibujar() {
      requestAnimationFrame(dibujar);
      var d = datos;
      if (!d || !el.todo || !v.classList.contains("is-playing")) { if (svg) svg.style.opacity = 0; return; }
      var f = v.currentTime * d.fps - d.desde, n = d.cuadros.length;
      if (f < 0 || f > n - 1) { svg.style.opacity = 0; return; }
      var i = Math.floor(f), t = f - i, A = d.cuadros[i], B = d.cuadros[Math.min(n - 1, i + 1)], s = {};
      d.campos.forEach(function (k, j) { s[k] = A[j] + (B[j] - A[j]) * t; });
      ubicar(d);
      svg.style.opacity = 1;
      var p = tramo(d, s.a, s.b), dd = p.length > 1 ? "M" + p.map(function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("L") : "";
      el.halo.setAttribute("d", dd); el.linea.setAttribute("d", dd);
      el.trazo.setAttribute("opacity", s.contorno);
      var cab = p[p.length - 1];
      el.cabeza.setAttribute("opacity", A[2] && cab ? 1 : 0);
      if (cab) { el.cabeza.setAttribute("cx", cab[0]); el.cabeza.setAttribute("cy", cab[1]); }
      var c = d.logo.cajas, yR = c.isotipo.y1 - (c.isotipo.y1 - c.isotipo.y0 + 4) * s.relleno;
      el.rIso.setAttribute("x", c.isotipo.x0 - 10); el.rIso.setAttribute("width", c.isotipo.x1 - c.isotipo.x0 + 20);
      el.rIso.setAttribute("y", yR); el.rIso.setAttribute("height", Math.max(0, c.isotipo.y1 - yR + 10));
      var ley = Math.max(0, s.nombre * 1.25 - 0.25);
      [[el.gNom, c.nombre, s.nombre], [el.gLey, c.leyenda, ley]].forEach(function (z) {
        var x = z[1].x0 - 60 + (z[1].x1 - z[1].x0 + 120) * z[2];
        z[0].setAttribute("x1", x - 60); z[0].setAttribute("x2", x);
      });
      el.nom.style.display = s.nombre > 0 ? "" : "none"; el.ley.style.display = ley > 0 ? "" : "none";
      el.todo.setAttribute("opacity", 1 - s.salida);
    }
    cargar();
    if (svg) requestAnimationFrame(dibujar);
    if (mqMovil.addEventListener) mqMovil.addEventListener("change", cargar);
  })();

  /* ---------- Clientes (solo si hay autorizados) ---------- */
  (function () {
    var lista = SITE.clientes || [];
    var sec = document.getElementById("clientes");
    var ul = document.getElementById("clientes-lista");
    if (SITE.mostrarExperiencia === false || !lista.length || !sec || !ul) return;
    lista.forEach(function (c) {
      var li = document.createElement("li");
      if (c.logo) {
        var img = document.createElement("img");
        img.src = c.logo; img.alt = c.nombre; img.loading = "lazy"; img.height = 40;
        li.appendChild(img);
      } else li.textContent = c.nombre;
      ul.appendChild(li);
    });
    sec.hidden = false;
    NORTEA.observarReveal(sec);
  })();

  /* ---------- Mapa bajo demanda ---------- */
  (function () {
    var wrap = document.getElementById("mapa");
    var btn = document.getElementById("map-load");
    if (!wrap) return;
    if (SITE.mostrarMapa === false) { wrap.hidden = true; return; }
    var q = encodeURIComponent(direccionTexto);
    var link = document.getElementById("map-link");
    if (link) link.href = "https://www.google.com/maps/search/?api=1&query=" + q;
    if (btn) btn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.className = "map-frame";
      f.title = "Mapa: " + direccionTexto;
      f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      f.src = "https://www.google.com/maps?q=" + q + "&output=embed";
      var facade = document.getElementById("map-facade");
      facade.replaceWith(f);
    });
  })();
})();
