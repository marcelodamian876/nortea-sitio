/* =====================================================================
   NORTEA · Configuración del sitio
   ---------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas editar para cambiar datos de
   contacto, horario, Instagram, mensajes de WhatsApp o dominio.
   Todo lo marcado con TODO_ está pendiente de confirmar.

   Nota: las vistas previas al compartir (WhatsApp, Facebook) no leen
   JavaScript. Si algún día cambias el DOMINIO, cambia también
   "nortea.mx" en: index.html (<head>), aviso-de-privacidad.html,
   robots.txt y sitemap.xml. Los demás datos solo se cambian aquí.
   ===================================================================== */
window.SITE = {
  nombre: "NORTEA Ingeniería y Construcción",
  nombreCorto: "NORTEA",
  dominio: "https://nortea.mx",

  // WhatsApp (el sitio no ofrece llamadas: no hay enlaces tel:)
  telefonoVisible: "81 2034 8618",
  whatsappNumero: "528120348618", // sin "+" ni espacios, para wa.me

  correo: "nortea.ic@gmail.com",

  // Formulario de cotización (sección "Hablemos de tu próximo proyecto"): cada solicitud llega por correo,
  // enviada con FormSubmit (formsubmit.co, gratuito). La PRIMERA vez que alguien lo use, FormSubmit manda a
  // este correo un aviso para activarlo ("Activate Form"): se abre y se da clic una sola vez; desde ahí
  // todas las solicitudes llegan solas. Mientras no esté activado, el sitio ofrece mandarla por WhatsApp.
  // (Opcional) Ya activado, FormSubmit da un código para no mostrar el correo: puede ponerse en "destino".
  formulario: {
    destino: "nortea.ic@gmail.com",
    asunto: "Nueva solicitud de cotización · NORTEA",
  },
  responsable: "Ing. Marcelo Cantú", // aparece en contacto y en la sección de cotizar

  direccion: {
    calle: "Av. Garza Sada 3001",
    ciudad: "Monterrey",
    estado: "N.L.",
    estadoCompleto: "Nuevo León",
    cp: "66417",
    pais: "MX",
  },

  // Horario: escríbelo como quieres que se vea, ej. "Lunes a viernes, 8:00 a 18:00 · Sábado, 9:00 a 14:00"
  horario: "TODO_HORARIO",
  // Horario para Google (opcional). Ejemplo: ["Mo-Fr 08:00-18:00", "Sa 09:00-14:00"]
  horarioSchema: [],

  // Solo el usuario, sin @. Ejemplo: "nortea.mx"
  instagram: "nortea.mx_",
  facebook: "", // opcional: URL completa de tu página de Facebook

  zonaServicio: [
    "Monterrey", "San Pedro Garza García", "San Nicolás de los Garza",
    "Guadalupe", "Apodaca", "Santa Catarina", "General Escobedo",
    "Juárez", "García", "Santiago",
  ],

  // Mapa: true muestra un botón "Ver mapa" que carga Google Maps solo al tocarlo
  // (así no hace lento el sitio). false lo oculta.
  mostrarMapa: true,

  whatsapp: {
    general: "Hola, vi su página de NORTEA y quiero cotizar una obra.",
    // En orden de prioridad: obra civil, acabados, tablaroca.
    servicios: {
      obraCivil: "Hola, vi su página de NORTEA y quiero cotizar una obra civil (naves, firmes, losas, demoliciones o albañilería).",
      proyectoEjecutivo: "Hola, vi su página de NORTEA y quiero cotizar un proyecto ejecutivo (levantamiento topográfico, mecánica de suelos o planos).",
      acabados: "Hola, vi su página de NORTEA y quiero cotizar acabados (porcelanato, mármol, estuco, empastado, pintura o fachada).",
      tablaroca: "Hola, vi su página de NORTEA y quiero cotizar un trabajo de tablaroca o Durock (muros, plafones, cajillos o nichos).",
      fachadas: "Hola, vi su página de NORTEA y quiero cotizar un trabajo de fachada (volúmenes, recubrimientos, jardineras o pintura).",
      ampliacion: "Hola, vi su página de NORTEA y quiero cotizar una ampliación o remodelación para mi casa o negocio.",
      negocio: "Hola, vi su página de NORTEA y quiero cotizar la adecuación de mi local o una construcción en mi terreno.",
      subcontratacion: "Hola, vi su página de NORTEA y quiero cotizar partidas para mi constructora, desarrolladora o despacho.",
    },
    // Mensaje para una obra en particular (hoy el portafolio cotiza por categoría con los mensajes de arriba).
    // {obra} se reemplaza por el nombre de la obra.
    obra: "Hola, vi su página de NORTEA y quiero cotizar algo similar a la obra \"{obra}\".",
    // Si es true, se agrega al final del mensaje una referencia corta del origen,
    // ej. "(ref: instagram)", cuando el visitante llegó con ?utm_source=instagram.
    incluirOrigenEnMensaje: false,
  },

  // Nombres de obras y clientes del catálogo: se prenden y apagan obra por obra
  // en data/obras.json con "mostrarNombreObra" y "mostrarCliente".

  // Tira "Han confiado en nosotros": true la muestra, false la oculta toda.
  mostrarExperiencia: false, // apagado: por ahora no se muestran nombres de clientes
  // Formato: { nombre: "Empresa", logo: "assets/img/clientes/empresa.svg" }  (logo opcional)
  // Los de tu catálogo NORTEA 2026. PENDIENTE: confirmar con cada uno antes de publicar.
  clientes: [],
};
