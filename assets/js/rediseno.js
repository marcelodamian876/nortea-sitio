/* Contacto V2. Independiente del motor y los recursos de la portada. */
(function () {
  "use strict";
  var form = document.getElementById("quote-form");
  if (!form) return;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var data = new FormData(form);
    var message = "Hola, quiero cotizar con NORTEA.\n\n" +
      "Proyecto para: " + data.get("cliente") + "\n" +
      "Servicio: " + data.get("servicio") + "\n" +
      "Ubicación: " + String(data.get("ubicacion")).trim() + "\n" +
      "Alcance: " + String(data.get("detalle")).trim();
    var number = window.SITE && window.SITE.whatsappNumero;
    if (!number || !/^\d{10,15}$/.test(number)) return;
    window.location.assign("https://wa.me/" + number + "?text=" + encodeURIComponent(message));
  });
})();
