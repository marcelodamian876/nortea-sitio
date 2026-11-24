/* =====================================================================
   NORTEA · Formulario de cotización
   ---------------------------------------------------------------------
   · "Enviar solicitud": la manda al correo con Web3Forms (llave en formulario.web3formsKey de
     site.config.js). Si no se puede enviar, ofrece mandar el mismo mensaje por WhatsApp para no
     perder la solicitud.
   · Contra spam, sin molestar al cliente: campo trampa, un tiempo mínimo desde que abre la página,
     que alguien de verdad haya escrito en el formulario, y una solicitud por correo cada 24 horas desde
     el mismo navegador (después se ofrece WhatsApp). Los intentos frenados se cuentan en Analytics
     como "formulario_bloqueado".
   · "Enviar por WhatsApp": abre WhatsApp con el mensaje armado con lo que se llenó.
   · Las tarjetas "Para tu casa / negocio / constructora" dejan elegido para quién es
     el proyecto y el tipo de trabajo más probable.
   Independiente del motor y los recursos de la portada.
   ===================================================================== */
(function () {
  "use strict";
  var form = document.getElementById("quote-form");
  if (!form) return;
  var SITE = window.SITE || {};
  var estado = document.getElementById("quote-estado");
  var enviar = document.getElementById("quote-enviar");
  var botonWa = document.getElementById("quote-wa");
  var el = form.elements;

  function track(nombre, datos) { if (window.NORTEA && window.NORTEA.track) window.NORTEA.track(nombre, datos); }
  function valor(n) { return String((el[n] && el[n].value) || "").trim(); }
  function datos() {
    return { nombre: valor("nombre"), telefono: valor("telefono"), correo: valor("correo"), ubicacion: valor("ubicacion"),
      cliente: valor("cliente"), servicio: valor("servicio"), mensaje: valor("mensaje") };
  }
  function elegir(select, texto) {
    for (var i = 0; i < select.options.length; i++) if (select.options[i].text === texto) { select.selectedIndex = i; return; }
  }

  // ---- tarjetas de "¿para quién es?" ----
  var SERVICIO_POR_CLIENTE = {
    "Mi casa": "Construcción, remodelación o ampliación de casa",
    "Mi negocio": "Adecuación de local comercial u oficina",
    "Constructora o empresa": "Partidas para mi empresa",
  };
  // Desde las páginas de servicio se llega con /?cotizar=<clave>#cotizar y el formulario ya viene elegido.
  var DESDE_PAGINA = {
    casa: ["Mi casa", "Construcción, remodelación o ampliación de casa"],
    remodelacion: ["Mi casa", "Construcción, remodelación o ampliación de casa"],
    ampliacion: ["Mi casa", "Construcción, remodelación o ampliación de casa"],
    local: ["Mi negocio", "Adecuación de local comercial u oficina"],
    industrial: ["Constructora o empresa", "Obra civil"],
    constructora: ["Constructora o empresa", "Partidas para mi empresa"],
    "obra-civil": [null, "Obra civil"],
    tablaroca: [null, "Tablaroca y Durock"],
    acabados: [null, "Acabados"],
    fachadas: [null, "Fachadas"],
    proyecto: [null, "Proyecto ejecutivo, planos o estudios"],
  };
  try {
    var elegido = DESDE_PAGINA[new URLSearchParams(location.search).get("cotizar")];
    if (elegido) {
      if (elegido[0]) elegir(el.cliente, elegido[0]);
      elegir(el.servicio, elegido[1]);
      track("formulario_desde_pagina", { cotizar: new URLSearchParams(location.search).get("cotizar") });
    }
  } catch (e) { /* navegador sin URLSearchParams: el formulario queda como siempre */ }

  document.querySelectorAll(".audiences a[data-cliente]").forEach(function (a) {
    a.addEventListener("click", function () {
      var c = a.dataset.cliente;
      elegir(el.cliente, c);
      if (SERVICIO_POR_CLIENTE[c]) elegir(el.servicio, SERVICIO_POR_CLIENTE[c]);
      track("tarjeta_cliente", { cliente: c });
    });
  });

  // ---- WhatsApp con lo que se llenó ----
  function textoWa(d) {
    return "Hola, quiero cotizar con NORTEA.\n\n" +
      (d.nombre ? "Nombre: " + d.nombre + "\n" : "") +
      "Proyecto para: " + d.cliente + "\n" +
      "Tipo de trabajo: " + d.servicio + "\n" +
      (d.ubicacion ? "Ubicación: " + d.ubicacion + "\n" : "") +
      (d.mensaje ? "Detalle: " + d.mensaje : "");
  }
  function urlWa(d) {
    var n = SITE.whatsappNumero;
    if (!n || !/^\d{10,15}$/.test(n)) n = "528120348618";
    return "https://wa.me/" + n + "?text=" + encodeURIComponent(textoWa(d));
  }
  function actualizarWa() { if (botonWa) { botonWa.href = urlWa(datos()); botonWa.dataset.waKey = "formulario"; } }
  form.addEventListener("input", actualizarWa);
  form.addEventListener("change", actualizarWa);
  actualizarWa();
  if (botonWa) botonWa.addEventListener("click", function (e) {
    actualizarWa();
    if (!el.mensaje.value.trim()) { e.preventDefault(); el.mensaje.reportValidity(); el.mensaje.focus(); }
  });

  // ---- mensajes de estado ----
  function mostrar(msg, tipo, conWa) {
    estado.hidden = false;
    estado.className = "quote-form__estado quote-form__full" + (tipo ? " is-" + tipo : "");
    estado.textContent = msg;
    if (conWa) {
      var a = document.createElement("a");
      a.href = urlWa(datos()); a.target = "_blank"; a.rel = "noopener";
      a.className = "quote-form__wa"; a.dataset.waPlace = "formulario-respaldo"; a.dataset.waKey = "formulario";
      a.textContent = "Enviar por WhatsApp ↗";
      estado.appendChild(document.createTextNode(" "));
      estado.appendChild(a);
    }
  }

  // ---- protección contra robots y envíos repetidos ----
  var ABIERTA = Date.now();
  var MINIMO_MS = 4000;                      // nadie llena nombre, teléfono, ubicación y mensaje en menos de 4 s
  var ESPERA_MS = 24 * 60 * 60 * 1000;       // una solicitud por correo cada 24 horas desde el mismo navegador
  var LLAVE = "nortea-solicitud-enviada";
  var escrito = false;                       // se vuelve true cuando una persona escribe o pega algo en el formulario
  ["keydown", "paste", "input"].forEach(function (tipo) {
    form.addEventListener(tipo, function (e) { if (e.isTrusted !== false) escrito = true; }, { passive: true });
  });
  function enviadaHace() {
    try { var t = Number(localStorage.getItem(LLAVE)); return t ? Date.now() - t : Infinity; } catch (e) { return Infinity; }
  }
  function marcarEnviada() { try { localStorage.setItem(LLAVE, String(Date.now())); } catch (e) { /* sin almacenamiento: no se limita */ } }

  // ---- envío por correo ----
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var d = datos();
    var motivo = valor("_honey") ? "campo_trampa" : !escrito ? "sin_escribir" : Date.now() - ABIERTA < MINIMO_MS ? "muy_rapido" : "";
    if (motivo) {   // robot: no se envía nada, pero se le responde igual que a una persona
      track("formulario_bloqueado", { motivo: motivo });
      form.reset(); mostrar("¡Gracias! Recibimos tu solicitud.", "ok"); return;
    }
    if (enviadaHace() < ESPERA_MS) {
      track("formulario_bloqueado", { motivo: "repetido" });
      mostrar("Ya recibimos una solicitud tuya hoy y te vamos a contactar. Si quieres agregar algo, escríbenos por WhatsApp:", "ok", true);
      return;
    }
    var cfg = SITE.formulario || {};
    if (!window.fetch || !cfg.web3formsKey) { mostrar("No pudimos enviarla por correo. Envíanos tu solicitud por WhatsApp:", "error", true); return; }
    var textoBoton = enviar.textContent;
    enviar.disabled = true; enviar.textContent = "Enviando…";
    estado.hidden = true;
    var asunto = (cfg.asunto || "Nueva solicitud de cotización · NORTEA") + " · " + d.cliente;
    var campos = {
      "Nombre": d.nombre,
      "WhatsApp o teléfono": d.telefono,
      "Correo": d.correo || "(no lo dejó)",
      "Proyecto para": d.cliente,
      "Tipo de trabajo": d.servicio,
      "Ubicación": d.ubicacion,
      "Mensaje": d.mensaje,
      "Página": location.href.split("#")[0],
    };
    var origen = window.NORTEA && window.NORTEA.origen && window.NORTEA.origen.source;
    if (origen) campos["Origen de la visita"] = origen;
    // un POST con su propio límite de tiempo
    function post(url, cuerpo) {
      var ctl = window.AbortController ? new AbortController() : null;
      var reloj = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
      return fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(cuerpo), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (res) { clearTimeout(reloj); return res || {}; }, function (e) { clearTimeout(reloj); throw e; });
    }
    // Web3Forms manda el correo; si falla, se ofrece WhatsApp con el mismo mensaje
    var errores = [];
    var cuerpo = Object.assign({ access_key: cfg.web3formsKey, subject: asunto, from_name: "Sitio web NORTEA", botcheck: false }, campos);
    if (d.correo) cuerpo.replyto = d.correo;
    post("https://api.web3forms.com/submit", cuerpo)
      .then(function (res) {
        if (res.success !== true && String(res.success) !== "true") throw new Error("web3forms: " + (res.message || "sin confirmar"));
        return "web3forms";
      })
      .then(function (servicio) {
        marcarEnviada();
        track("formulario_enviado", { canal: "correo", servicio_correo: servicio, servicio: d.servicio, cliente: d.cliente });
        form.reset(); actualizarWa();
        mostrar("¡Gracias" + (d.nombre ? ", " + d.nombre.split(" ")[0] : "") + "! Recibimos tu solicitud y te contactaremos muy pronto.", "ok");
      })
      .catch(function (err) {
        if (err) errores.push(String(err.message || err));
        track("formulario_error", { servicio: d.servicio, detalle: errores.join(" | ").slice(0, 160) });
        mostrar("No pudimos enviarla por correo en este momento. Mándanos el mismo mensaje por WhatsApp:", "error", true);
      })
      .then(function () { enviar.disabled = false; enviar.textContent = textoBoton; });
  });
})();
