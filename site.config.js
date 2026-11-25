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

  // Formulario de cotización (sección "Hablemos de tu próximo proyecto"): cada solicitud llega por correo
  // a nortea.ic@gmail.com con Web3Forms; si falla, el sitio ofrece mandar el mismo mensaje por WhatsApp.
  // Contra spam (en assets/js/rediseno.js): campo trampa, tiempo mínimo para llenarlo y una solicitud por
  // correo cada 24 horas desde el mismo navegador. Ya no se usa FormSubmit: era otra puerta para mandar correos.
  formulario: {
    // Web3Forms (web3forms.com, formulario "NORTEA Contacto" de la cuenta nortea.ic@gmail.com). La llave es
    // pública por diseño (va en la página). Si la cambias, cámbiala también en el <form> de index.html.
    web3formsKey: "813ac67a-112e-466f-b460-bd08d8b3d775",
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
  horario: "Lunes a sábado, 8:00 a 18:00",
  // Horario para Google (opcional). Ejemplo: ["Mo-Fr 08:00-18:00", "Sa 09:00-14:00"]
  horarioSchema: ["Mo-Sa 08:00-18:00"],

  // Solo el usuario, sin @. Ejemplo: "nortea.mx"
  instagram: "nortea.mx_",
  facebook: "https://www.facebook.com/Norteamx0", // página de Facebook (URL completa)
  // Otros perfiles oficiales del negocio: van en los datos para Google y las IA (sameAs), para que sepan que son el mismo negocio.
  perfiles: [
    "https://www.cronoshare.com.mx/croner-754862-nortea-ingenieria-y-construccion",
    "https://empresas.habitissimo.com.mx/pro/nortea-ingenieria-y-construccion",
  ],

  zonaServicio: [
    "Monterrey", "San Pedro Garza García", "San Nicolás de los Garza",
    "Guadalupe", "Apodaca", "Santa Catarina", "General Escobedo",
    "Juárez", "García", "Santiago",
  ],

  // Mapa: true muestra un botón "Ver mapa" que carga Google Maps solo al tocarlo
  // (así no hace lento el sitio). false lo oculta.
  mostrarMapa: false, // sin dirección pública: se trabaja en obra (no se reciben clientes en un local)

  whatsapp: {
    general: "Hola, vi su página de NORTEA y quiero cotizar una obra.",
    // En orden de prioridad: obra civil, acabados, tablaroca.
    servicios: {
      casa: "Hola, vi su página de NORTEA y quiero cotizar la construcción de una casa.",
      remodelacion: "Hola, vi su página de NORTEA y quiero cotizar la remodelación de mi casa.",
      ampliacionCasa: "Hola, vi su página de NORTEA y quiero cotizar la ampliación de mi casa (cuarto, segundo nivel o terraza).",
      industrial: "Hola, vi su página de NORTEA y quiero cotizar una obra industrial (nave, firmes o muros de gran altura).",
      segundoPiso: "Hola, vi su página de NORTEA y quiero cotizar la construcción de un segundo o tercer piso.",
      construccionLigera: "Hola, vi su página de NORTEA y quiero cotizar una construcción ligera (steel frame).",
      banos: "Hola, vi su página de NORTEA y quiero cotizar la remodelación de mi baño.",
      cocinas: "Hola, vi su página de NORTEA y quiero cotizar la remodelación de mi cocina.",
      localNuevo: "Hola, vi su página de NORTEA y quiero cotizar la construcción de un local comercial.",
      oficinas: "Hola, vi su página de NORTEA y quiero cotizar la remodelación de una oficina.",
      naves: "Hola, vi su página de NORTEA y quiero cotizar obra civil para una nave industrial o bodega.",
      murosTablaroca: "Hola, vi su página de NORTEA y quiero cotizar muros de tablaroca.",
      plafones: "Hola, vi su página de NORTEA y quiero cotizar un plafón o cajillo de tablaroca.",
      durock: "Hola, vi su página de NORTEA y quiero cotizar muros de Durock.",
      porcelanato: "Hola, vi su página de NORTEA y quiero cotizar la instalación de porcelanato.",
      marmol: "Hola, vi su página de NORTEA y quiero cotizar la instalación de mármol.",
      planos: "Hola, vi su página de NORTEA y quiero cotizar planos arquitectónicos.",
      renders: "Hola, vi su página de NORTEA y quiero cotizar renders de mi proyecto.",
      calculoEstructural: "Hola, vi su página de NORTEA y quiero cotizar un cálculo estructural.",
      estudioHidrologico: "Hola, vi su página de NORTEA y quiero cotizar un estudio hidrológico.",
      mecanicaSuelos: "Hola, vi su página de NORTEA y quiero cotizar un estudio de mecánica de suelos.",
      topografia: "Hola, vi su página de NORTEA y quiero cotizar un levantamiento topográfico.",
      obraCivil: "Hola, vi su página de NORTEA y quiero cotizar una obra civil (naves, firmes, losas, demoliciones o albañilería).",
      proyectoEjecutivo: "Hola, vi su página de NORTEA y quiero cotizar un proyecto ejecutivo (planos, renders, topografía, mecánica de suelos, cálculo estructural o estudio hidrológico).",
      acabados: "Hola, vi su página de NORTEA y quiero cotizar acabados (porcelanato, mármol, estuco, empastado, pintura o fachada).",
      tablaroca: "Hola, vi su página de NORTEA y quiero cotizar un trabajo de tablaroca o Durock (muros, plafones, cajillos o nichos).",
      fachadas: "Hola, vi su página de NORTEA y quiero cotizar un trabajo de fachada (volúmenes, recubrimientos, jardineras o pintura).",
      ampliacion: "Hola, vi su página de NORTEA y quiero cotizar una ampliación o remodelación para mi casa o negocio.",
      negocio: "Hola, vi su página de NORTEA y quiero cotizar la adecuación de mi local comercial u oficina.",
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
