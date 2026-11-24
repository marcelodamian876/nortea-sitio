#!/usr/bin/env python3
"""NORTEA · Genera las páginas por servicio (una carpeta /<slug>/index.html por servicio).

Uso, desde la raíz del repositorio:
    python3 herramientas/paginas/generar.py

· El contenido sale de data/servicios.json (textos, fotos y preguntas frecuentes).
· El encabezado, el pie, los íconos y el botón flotante se copian de index.html,
  así las páginas se ven igual que la portada. Si cambias esas partes en index.html,
  vuelve a correr este script.
· Las versiones de CSS y JS (?v=...) también se toman de index.html.
"""
import html
import json
import os
import re
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOMINIO = "https://nortea.mx"
WA = "https://wa.me/528120348618"


def leer(ruta):
    with open(os.path.join(RAIZ, ruta), encoding="utf-8") as f:
        return f.read()


def entre(texto, inicio, fin, incluir_fin=True):
    a = texto.index(inicio)
    b = texto.index(fin, a)
    return texto[a:b + (len(fin) if incluir_fin else 0)]


def a_raiz(fragmento):
    """Enlaces de la portada → enlaces que funcionan desde cualquier carpeta."""
    f = fragmento.replace('href="#inicio"', 'href="/"')
    f = re.sub(r'(<a\b[^>]*?\bhref=")#(?=[\w-])', r'\1/#', f)   # solo enlaces <a> a una sección; ni href="#" ni los íconos <use href="#i-...">
    f = re.sub(r'(src|srcset)="assets/', r'\1="/assets/', f)
    f = f.replace('href="aviso-de-privacidad.html"', 'href="/aviso-de-privacidad.html"')
    return f


def esc(t):
    return html.escape(t, quote=True)


def dims(src):
    try:
        from PIL import Image
        with Image.open(os.path.join(RAIZ, src)) as im:
            return im.size
    except Exception:
        return (1200, 1600)


def srcset_de(src, propios):
    base, ext = os.path.splitext(src)
    if all(os.path.exists(os.path.join(RAIZ, base + s + ext)) for s in ("-480", "-960")):
        ancho = dims(src)[0]
        return f"/{base}-480{ext} 480w, /{base}-960{ext} 960w, /{src} {max(ancho, 1200)}w"
    if src in propios:
        return ", ".join("/" + p.strip() for p in propios[src].split(","))
    return ""


def img(foto, propios, sizes, lazy=True, prioridad=False):
    w, h = dims(foto["src"])
    ss = srcset_de(foto["src"], propios)
    partes = [f'src="/{foto["src"]}"']
    if ss:
        partes.append(f'srcset="{ss}" sizes="{sizes}"')
    partes.append(f'alt="{esc(foto["alt"])}" width="{w}" height="{h}"')
    partes.append('loading="lazy" decoding="async"' if lazy else 'decoding="async"')
    if prioridad:
        partes.append('fetchpriority="high"')
    return "<img " + " ".join(partes) + ">"


def frase(nombre):
    return nombre[0].lower() + nombre[1:]


def main():
    datos = json.loads(leer("data/servicios.json"))
    obras = json.loads(leer("data/obras.json"))
    propios = {f["src"]: f["srcset"] for c in obras.get("categorias", []) for f in c.get("fotos", []) if f.get("srcset")}
    portada = leer("index.html")

    sprite = entre(portada, '<svg width="0" height="0"', "<!-- 1. BARRA SUPERIOR -->", incluir_fin=False).rstrip()
    encabezado = a_raiz(entre(portada, '<header class="site-header"', "</header>"))
    pie = a_raiz(entre(portada, '<footer class="site-footer"', "</footer>"))
    flotante = a_raiz(entre(portada, '<a class="wa-float"', "</a>"))
    proceso = a_raiz(entre(portada, '<ol class="timeline">', "</ol>"))
    a = portada.index("<!-- Google Analytics 4")                       # comentario + <script async> + <script> de config
    b = portada.index("</script>", portada.index("<script>", a)) + len("</script>")
    ga = portada[a:b]
    version = lambda ruta: re.search(re.escape(ruta) + r"\?v=([\w]+)", portada).group(1)
    v_css1, v_css2 = version("assets/css/styles.css"), version("assets/css/rediseno.css")
    v_cfg, v_main = version("site.config.js"), version("assets/js/main.js")
    zonas = datos["zonas"]
    paginas = datos["paginas"]
    cambiadas = []

    for p in paginas:
        url = f"{DOMINIO}/{p['slug']}/"
        nombre_frase = frase(p["nombre"])
        ld = {
            "@context": "https://schema.org",
            "@graph": [
                {"@type": "BreadcrumbList", "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Inicio", "item": f"{DOMINIO}/"},
                    {"@type": "ListItem", "position": 2, "name": "Servicios", "item": f"{DOMINIO}/#servicios"},
                    {"@type": "ListItem", "position": 3, "name": p["nombre"], "item": url}]},
                {"@type": "Service", "@id": url + "#servicio", "name": p["h1"], "serviceType": p["nombre"],
                 "description": p["descripcion"], "url": url,
                 "provider": {"@type": "GeneralContractor", "@id": f"{DOMINIO}/#negocio", "name": "NORTEA Ingeniería y Construcción", "url": f"{DOMINIO}/"},
                 "areaServed": [{"@type": "City", "name": z} for z in zonas],
                 "image": f"{DOMINIO}/{p['fotos'][0]['src']}"},
                {"@type": "FAQPage", "mainEntity": [
                    {"@type": "Question", "name": q["p"], "acceptedAnswer": {"@type": "Answer", "text": q["r"]}} for q in p["faq"]]},
            ],
        }
        principal = p["fotos"][0]
        resto = p["fotos"][1:]   # la principal ya va arriba; la galería muestra las demás
        galeria = "\n".join(
            f'          <figure class="svc-foto reveal">{img(f, propios, "(min-width: 1000px) 33vw, (min-width: 640px) 50vw, 100vw")}'
            f'<figcaption>{esc(f["pie"])}</figcaption></figure>' for f in resto)
        seccion_galeria = "" if not resto else f"""
    <section class="section section--light" aria-labelledby="svc-obras">
      <div class="container">
        <h2 class="section-title reveal" id="svc-obras"><span class="eyebrow">Fotos reales</span> Obras de NORTEA</h2>
        <div class="svc-galeria svc-galeria--{len(resto)}">
{galeria}
        </div>
      </div>
    </section>
"""
        incluye = "\n".join(f"            <li>{esc(i)}</li>" for i in p["incluye"])
        intro = "\n".join(f"            <p>{esc(t)}</p>" for t in p["intro"])
        preguntas = "\n".join(
            f'          <details class="svc-faq__item"><summary>{esc(q["p"])}</summary><p>{esc(q["r"])}</p></details>' for q in p["faq"])
        otros = "\n".join(
            f'          <li><a href="/{o["slug"]}/"><span>{esc(o["nombre"])}</span><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a></li>'
            for o in paginas if o["slug"] != p["slug"])
        zonas_txt = ", ".join(zonas[:-1]) + " y " + zonas[-1]

        pagina = f"""<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{esc(p["titulo"])}</title>
  <meta name="description" content="{esc(p["descripcion"])}">
  <link rel="canonical" href="{url}">
  <meta name="theme-color" content="#0B1D2F">
  <meta name="robots" content="index, follow">
  {ga}

  <!-- Página generada con herramientas/paginas/generar.py a partir de data/servicios.json: edita ahí, no aquí. -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_MX">
  <meta property="og:site_name" content="NORTEA Ingeniería y Construcción">
  <meta property="og:title" content="{esc(p["h1"])} · NORTEA">
  <meta property="og:description" content="{esc(p["descripcion"])}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{DOMINIO}/assets/img/marca/og-nortea.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" href="/assets/img/marca/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/img/marca/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/img/marca/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@500;600;700&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@500;600;700&display=swap"></noscript>
  <link rel="stylesheet" href="/assets/css/styles.css?v={v_css1}">
  <link rel="stylesheet" href="/assets/css/rediseno.css?v={v_css2}">
  <script>document.documentElement.classList.add('js')</script>
  <script src="/site.config.js?v={v_cfg}" defer></script>
  <script src="/assets/js/main.js?v={v_main}" defer></script>
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body class="pagina-servicio">
  <a class="skip-link" href="#contenido">Saltar al contenido</a>

{sprite}

  {encabezado}

  <main id="contenido">
    <section class="svc-hero" aria-labelledby="svc-titulo">
      <div class="container svc-hero__grid">
        <div class="svc-hero__texto">
          <nav class="migas" aria-label="Ruta"><a href="/">Inicio</a><span aria-hidden="true">/</span><a href="/#servicios">Servicios</a><span aria-hidden="true">/</span><span aria-current="page">{esc(p["nombre"])}</span></nav>
          <h1 class="svc-hero__titulo" id="svc-titulo">{esc(p["h1"])}</h1>
          <p class="svc-hero__lead">{esc(p["lead"])}</p>
          <div class="svc-hero__acciones">
            <a class="btn btn--gold btn--lg" data-wa="{p["wa"]}" data-wa-place="servicio-{p["slug"]}" href="{WA}" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg> Cotizar por WhatsApp</a>
            <a class="btn btn--outline btn--lg" href="/?cotizar={p.get("form", "")}#cotizar">Llenar el formulario</a>
          </div>
          <p class="svc-hero__nota">Cotización formal por escrito</p>
        </div>
        <figure class="svc-hero__foto">{img(principal, propios, "(min-width: 900px) 45vw, 100vw", lazy=False, prioridad=True)}<figcaption>{esc(principal["pie"])}</figcaption></figure>
      </div>
    </section>

    <section class="section" aria-labelledby="svc-que">
      <div class="container svc-que">
        <div class="svc-que__texto reveal">
          <h2 class="section-title" id="svc-que"><span class="eyebrow">Qué hacemos</span> {esc(p["nombre"])} con NORTEA</h2>
          <div class="svc-que__intro">
{intro}
          </div>
        </div>
        <div class="svc-que__lista reveal">
          <h3>Incluye</h3>
          <ul class="svc-lista" role="list">
{incluye}
          </ul>
        </div>
      </div>
    </section>
{seccion_galeria}
    <section class="section" aria-labelledby="svc-proceso">
      <div class="container">
        <h2 class="section-title reveal" id="svc-proceso"><span class="eyebrow">Proceso de trabajo</span> Cómo trabajamos</h2>
        <p class="section-lead">Cinco pasos claros, de tu primer mensaje a la entrega.</p>
        {proceso}
      </div>
    </section>

    <section class="section section--light" aria-labelledby="svc-faq">
      <div class="container svc-faq">
        <h2 class="section-title reveal" id="svc-faq"><span class="eyebrow">Preguntas frecuentes</span> Lo que más nos preguntan de {esc(nombre_frase)}</h2>
        <div class="svc-faq__lista">
{preguntas}
        </div>
      </div>
    </section>

    <section class="section section--navy cta" aria-labelledby="svc-cotiza">
      <div class="container cta__inner reveal">
        <h2 class="section-title section-title--light" id="svc-cotiza"><span class="eyebrow eyebrow--light">Cotiza en Monterrey</span> Cuéntanos de tu proyecto</h2>
        <p class="cta__lead">Trabajamos en {esc(zonas_txt)}. Mándanos medidas aproximadas y fotos por WhatsApp, o llena el formulario.</p>
        <div class="svc-cta__acciones">
          <a class="btn btn--gold btn--xl" data-wa="{p["wa"]}" data-wa-place="servicio-{p["slug"]}-cierre" href="{WA}" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg> Cotizar por WhatsApp</a>
          <a class="btn btn--outline btn--xl" href="/?cotizar={p.get("form", "")}#cotizar">Llenar el formulario</a>
        </div>
        <p class="cta__note">Cotización formal por escrito.</p>
      </div>
    </section>

    <section class="section" aria-labelledby="svc-otros">
      <div class="container">
        <h2 class="section-title reveal" id="svc-otros"><span class="eyebrow">NORTEA Ingeniería y Construcción</span> Otros servicios</h2>
        <ul class="svc-otros" role="list">
{otros}
        </ul>
      </div>
    </section>
  </main>

  {pie}

  {flotante}
</body>
</html>
"""
        carpeta = os.path.join(RAIZ, p["slug"])
        os.makedirs(carpeta, exist_ok=True)
        ruta = os.path.join(carpeta, "index.html")
        anterior = open(ruta, encoding="utf-8").read() if os.path.exists(ruta) else ""
        if anterior != pagina:
            with open(ruta, "w", encoding="utf-8") as f:
                f.write(pagina)
            cambiadas.append(p["slug"])
        print("ok" if anterior != pagina else "sin cambios", "/" + p["slug"] + "/")

    escribir_sitemap(paginas, cambiadas)
    escribir_llms(datos)


def escribir_sitemap(paginas, cambiadas):
    """Conserva las entradas que no son de servicios y pone (o actualiza) las de cada servicio."""
    import datetime
    hoy = datetime.date.today().isoformat()
    actual = leer("sitemap.xml")
    previas = dict(re.findall(r"<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>", actual))
    servicios = {f"{DOMINIO}/{p['slug']}/" for p in paginas}
    otras = re.findall(r"  <url>[\s\S]*?</url>\n", actual)
    def existe(loc):   # quita del sitemap las páginas que ya no existen (por ejemplo, un servicio que se renombró)
        ruta = loc.replace(DOMINIO, "").lstrip("/")
        return os.path.exists(os.path.join(RAIZ, ruta + "index.html" if (ruta == "" or ruta.endswith("/")) else ruta))
    otras = [u for u in otras if re.search(r"<loc>([^<]+)</loc>", u).group(1) not in servicios
             and existe(re.search(r"<loc>([^<]+)</loc>", u).group(1))]
    nuevas = []
    for p in paginas:
        loc = f"{DOMINIO}/{p['slug']}/"
        fecha = hoy if (p["slug"] in cambiadas or loc not in previas) else previas[loc]
        nuevas.append(f"  <url>\n    <loc>{loc}</loc>\n    <lastmod>{fecha}</lastmod>\n    <priority>0.8</priority>\n  </url>\n")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "".join(otras[:1]) + "".join(nuevas) + "".join(otras[1:]) + "</urlset>\n")
    with open(os.path.join(RAIZ, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(xml)
    print("ok sitemap.xml")


def escribir_llms(datos):
    """Resumen del negocio en Markdown para asistentes de IA (propuesta llms.txt)."""
    z = datos["zonas"]
    lineas = [
        "# NORTEA Ingeniería y Construcción", "",
        "> Constructora en Monterrey, Nuevo León (México). Obra civil, construcción, remodelación y ampliación de casas, "
        "acabados, tablaroca y Durock, adecuación de locales comerciales y oficinas, y proyectos ejecutivos (levantamiento "
        "topográfico y mecánica de suelos). Atiende a particulares, negocios, constructoras y desarrolladoras en Monterrey "
        "y su área metropolitana, en obra. Cotización formal por escrito.", "",
        "## Servicios",
    ]
    for p in datos["paginas"]:
        lineas.append(f"- [{p['h1']}]({DOMINIO}/{p['slug']}/): {p['lead']}")
    lineas += ["", "## Zona de servicio", ", ".join(z[:-1]) + " y " + z[-1] + " (Nuevo León, México).", "",
               "## Contacto",
               f"- Sitio: {DOMINIO}/",
               "- WhatsApp: +52 81 2034 8618 (https://wa.me/528120348618)",
               "- Correo: nortea.ic@gmail.com",
               "- Instagram: https://www.instagram.com/nortea.mx_/",
               f"- Formulario de cotización: {DOMINIO}/#cotizar", ""]
    with open(os.path.join(RAIZ, "llms.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lineas))
    print("ok llms.txt")


if __name__ == "__main__":
    sys.exit(main())
