/* =====================================================================
   NORTEA · Formulario de cotización
   ---------------------------------------------------------------------
   · "Enviar solicitud": la manda al correo de site.config.js con Web3Forms (si hay llave en
     formulario.web3formsKey) y, si ese falla, con FormSubmit (formulario.destino). Si ninguno
     la puede enviar, ofrece mandar el mismo mensaje por WhatsApp para no perder la solicitud.
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

  // ---- envío por correo ----
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var d = datos();
    if (valor("_honey")) { form.reset(); mostrar("¡Gracias! Recibimos tu solicitud.", "ok"); return; }   // robot: no se envía
    var cfg = SITE.formulario || {}, destino = cfg.destino || SITE.correo;
    if (!window.fetch || (!cfg.web3formsKey && !destino)) { mostrar("No pudimos enviarla por correo. Envíanos tu solicitud por WhatsApp:", "error", true); return; }
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
    // servicios de correo en orden: si uno falla se intenta el siguiente; si todos fallan, se ofrece WhatsApp
    var servicios = [];
    if (cfg.web3formsKey) servicios.push(function () {
      var cuerpo = Object.assign({ access_key: cfg.web3formsKey, subject: asunto, from_name: "Sitio web NORTEA", botcheck: false }, campos);
      if (d.correo) cuerpo.replyto = d.correo;
      return post("https://api.web3forms.com/submit", cuerpo).then(function (res) {
        if (res.success !== true && String(res.success) !== "true") throw new Error("web3forms: " + (res.message || "sin confirmar"));
        return "web3forms";
      });
    });
    if (destino) servicios.push(function () {
      var cuerpo = Object.assign({ _subject: asunto, _template: "table", _captcha: "false" }, campos);
      if (d.correo) cuerpo._replyto = d.correo;
      return post("https://formsubmit.co/ajax/" + destino, cuerpo).then(function (res) {
        if (String(res.success) !== "true") throw new Error("formsubmit: " + (res.message || "sin confirmar"));
        return "formsubmit";
      });
    });
    var errores = [];
    servicios.reduce(function (cadena, intento) {
      return cadena.catch(function (err) { if (err) errores.push(String(err.message || err)); return intento(); });
    }, Promise.reject(null))
      .then(function (servicio) {
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
