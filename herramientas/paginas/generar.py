#!/usr/bin/env python3
"""NORTEA · Genera las páginas por servicio (una carpeta /<slug>/index.html por servicio) y /servicios/.

Uso, desde la raíz del repositorio:
    python3 herramientas/paginas/generar.py

· El contenido sale de data/servicios.json (textos, fotos, preguntas frecuentes y grupo de cada página).
· Pone la lista de servicios agrupada en el pie de index.html; después copia de index.html el
  encabezado, el pie, los íconos y el botón flotante, así todas las páginas se ven igual que la portada.
  Si cambias esas partes en index.html, vuelve a correr este script.
· Las versiones de CSS y JS (?v=...) también se toman de index.html.
· También escribe /servicios/index.html (todos los servicios por grupo), sitemap.xml y llms.txt.
"""
import datetime
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


def escribir_si_cambia(ruta, texto):
    completa = os.path.join(RAIZ, ruta)
    anterior = open(completa, encoding="utf-8").read() if os.path.exists(completa) else ""
    if anterior == texto:
        return False
    os.makedirs(os.path.dirname(completa), exist_ok=True)
    with open(completa, "w", encoding="utf-8") as f:
        f.write(texto)
    return True


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


def principales(paginas, grupo):
    """Servicios principales de un grupo (los que no tienen "padre")."""
    return [p for p in paginas if p["grupo"] == grupo and not p.get("padre")]


def hijos_de(paginas):
    """{slug del principal: [páginas secundarias, en orden]}."""
    hijos = {}
    for p in paginas:
        if p.get("padre"):
            hijos.setdefault(p["padre"], []).append(p)
    return hijos


def pie_servicios(grupos, paginas):
    """Servicios principales por grupo para el pie de todas las páginas (se escribe en index.html).
    Las páginas secundarias no van en el pie: se llega a ellas desde /servicios/ y desde su servicio principal."""
    bloques = []
    for g in grupos:
        items = "".join(f'<li><a href="/{p["slug"]}/">{esc(p["nombre"])}</a></li>' for p in principales(paginas, g["id"]))
        bloques.append(f'        <div><h3>{esc(g["nombre"])}</h3><ul role="list">{items}</ul></div>')
    return ('<nav class="container footer__servicios" aria-label="Servicios">\n'
            '      <h2 class="footer__title"><a href="/servicios/">Servicios</a></h2>\n'
            '      <div class="footer__grupos">\n' + "\n".join(bloques) + '\n      </div>\n'
            '      <p class="footer__todos"><a href="/servicios/">Ver todos los servicios</a></p>\n    </nav>')


def cabeza(titulo, descripcion, url, og_titulo, ga, v, ld):
    return f"""<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{esc(titulo)}</title>
  <meta name="description" content="{esc(descripcion)}">
  <link rel="canonical" href="{url}">
  <meta name="theme-color" content="#0B1D2F">
  <meta name="robots" content="index, follow">
  {ga}

  <!-- Página generada con herramientas/paginas/generar.py a partir de data/servicios.json: edita ahí, no aquí. -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_MX">
  <meta property="og:site_name" content="NORTEA Ingeniería y Construcción">
  <meta property="og:title" content="{esc(og_titulo)} · NORTEA">
  <meta property="og:description" content="{esc(descripcion)}">
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
  <link rel="stylesheet" href="/assets/css/styles.css?v={v['css1']}">
  <link rel="stylesheet" href="/assets/css/rediseno.css?v={v['css2']}">
  <script>document.documentElement.classList.add('js')</script>
  <script src="/site.config.js?v={v['cfg']}" defer></script>
  <script src="/assets/js/main.js?v={v['main']}" defer></script>
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>"""


def main():
    datos = json.loads(leer("data/servicios.json"))
    obras = json.loads(leer("data/obras.json"))
    propios = {f["src"]: f["srcset"] for c in obras.get("categorias", []) for f in c.get("fotos", []) if f.get("srcset")}
    zonas, paginas, grupos = datos["zonas"], datos["paginas"], datos["grupos"]
    nombre_grupo = {g["id"]: g["nombre"] for g in grupos}
    por_slug = {p["slug"]: p for p in paginas}
    hijos = hijos_de(paginas)

    # 1) La lista agrupada de servicios va en el pie de la portada (y de ahí a todas las páginas)
    portada = leer("index.html")
    viejo = entre(portada, '<nav class="container footer__servicios"', "</nav>")
    if escribir_si_cambia("index.html", portada.replace(viejo, pie_servicios(grupos, paginas), 1)):
        print("ok index.html (servicios del pie)")
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
    v = {"css1": version("assets/css/styles.css"), "css2": version("assets/css/rediseno.css"),
         "cfg": version("site.config.js"), "main": version("assets/js/main.js")}
    zonas_txt = ", ".join(zonas[:-1]) + " y " + zonas[-1]
    cambiadas = []

    def cuerpo(main_html):
        return f"""
<body class="pagina-servicio">
  <a class="skip-link" href="#contenido">Saltar al contenido</a>

{sprite}

  {encabezado}

  <main id="contenido">
{main_html}
  </main>

  {pie}

  {flotante}
</body>
</html>
"""

    def cierre_cta(wa_clave, lugar, form):
        return f"""    <section class="section section--navy cta" aria-labelledby="svc-cotiza">
      <div class="container cta__inner reveal">
        <h2 class="section-title section-title--light" id="svc-cotiza"><span class="eyebrow eyebrow--light">Cotiza en Monterrey</span> Cuéntanos de tu proyecto</h2>
        <p class="cta__lead">Trabajamos en {esc(zonas_txt)}. Mándanos medidas aproximadas y fotos por WhatsApp, o llena el formulario.</p>
        <div class="svc-cta__acciones">
          <a class="btn btn--gold btn--xl" data-wa="{wa_clave}" data-wa-place="{lugar}" href="{WA}" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg> Cotizar por WhatsApp</a>
          <a class="btn btn--outline btn--xl" href="/?cotizar={form}#cotizar">Llenar el formulario</a>
        </div>
        <p class="cta__note">Cotización formal por escrito.</p>
      </div>
    </section>"""

    # 2) Una página por servicio
    for p in paginas:
        url = f"{DOMINIO}/{p['slug']}/"
        padre = por_slug.get(p.get("padre"))
        migas = [("Inicio", f"{DOMINIO}/"), ("Servicios", f"{DOMINIO}/servicios/")]
        if padre:
            migas.append((padre["nombre"], f"{DOMINIO}/{padre['slug']}/"))
        migas.append((p["nombre"], url))
        ld = {
            "@context": "https://schema.org",
            "@graph": [
                {"@type": "BreadcrumbList", "itemListElement": [
                    {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(migas)]},
                {"@type": "Service", "@id": url + "#servicio", "name": p["h1"], "serviceType": p["nombre"],
                 "description": p["descripcion"], "url": url,
                 "provider": {"@type": "GeneralContractor", "@id": f"{DOMINIO}/#negocio", "name": "NORTEA Ingeniería y Construcción", "url": f"{DOMINIO}/"},
                 "areaServed": [{"@type": "City", "name": z} for z in zonas],
                 "image": f"{DOMINIO}/{p['fotos'][0]['src']}" if p["fotos"] else f"{DOMINIO}/assets/img/marca/og-nortea.jpg"},
                {"@type": "FAQPage", "mainEntity": [
                    {"@type": "Question", "name": q["p"], "acceptedAnswer": {"@type": "Answer", "text": q["r"]}} for q in p["faq"]]},
            ],
        }
        # Fotos: la primera va arriba y la galería muestra hasta 3 más. Sin fotos propias, el encabezado va sin foto.
        principal = p["fotos"][0] if p["fotos"] else None
        resto = p["fotos"][1:4]
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
        # Relacionados: su servicio principal y las páginas hermanas (o, si es principal, sus páginas secundarias),
        # después los demás servicios principales del grupo.
        if padre:
            hermanos = [padre] + [h for h in hijos.get(padre["slug"], []) if h["slug"] != p["slug"]]
        else:
            hermanos = list(hijos.get(p["slug"], []))
        hermanos += [o for o in principales(paginas, p["grupo"]) if o["slug"] not in (p["slug"], p.get("padre"))]
        otros = "\n".join(
            f'          <li><a href="/{o["slug"]}/"><span>{esc(o["nombre"])}</span><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a></li>'
            for o in hermanos)
        otros += '\n          <li><a class="svc-otros__todos" href="/servicios/"><span>Ver todos los servicios</span><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a></li>'
        form = p.get("form", "")

        miga_padre = (f'<a href="/{padre["slug"]}/">{esc(padre["nombre"])}</a><span aria-hidden="true">/</span>' if padre else "")
        foto_hero = ("" if not principal else
                     f'\n        <figure class="svc-hero__foto">{img(principal, propios, "(min-width: 900px) 45vw, 100vw", lazy=False, prioridad=True)}'
                     f'<figcaption>{esc(principal["pie"])}</figcaption></figure>')
        main_html = f"""    <section class="svc-hero" aria-labelledby="svc-titulo">
      <div class="container svc-hero__grid{'' if principal else ' svc-hero__grid--solo'}">
        <div class="svc-hero__texto">
          <nav class="migas" aria-label="Ruta"><a href="/">Inicio</a><span aria-hidden="true">/</span><a href="/servicios/">Servicios</a><span aria-hidden="true">/</span>{miga_padre}<span aria-current="page">{esc(p["nombre"])}</span></nav>
          <h1 class="svc-hero__titulo" id="svc-titulo">{esc(p["h1"])}</h1>
          <p class="svc-hero__lead">{esc(p["lead"])}</p>
          <div class="svc-hero__acciones">
            <a class="btn btn--gold btn--lg" data-wa="{p["wa"]}" data-wa-place="servicio-{p["slug"]}" href="{WA}" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg> Cotizar por WhatsApp</a>
            <a class="btn btn--outline btn--lg" href="/?cotizar={form}#cotizar">Llenar el formulario</a>
          </div>
          <p class="svc-hero__nota">Cotización formal por escrito</p>
        </div>{foto_hero}
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
        <h2 class="section-title reveal" id="svc-faq"><span class="eyebrow">Preguntas frecuentes</span> Lo que más nos preguntan de {esc(frase(p["nombre"]))}</h2>
        <div class="svc-faq__lista">
{preguntas}
        </div>
      </div>
    </section>

{cierre_cta(p["wa"], "servicio-" + p["slug"] + "-cierre", form)}

    <section class="section" aria-labelledby="svc-otros">
      <div class="container">
        <h2 class="section-title reveal" id="svc-otros"><span class="eyebrow">{esc(nombre_grupo[p["grupo"]])}</span> Servicios relacionados</h2>
        <ul class="svc-otros" role="list">
{otros}
        </ul>
      </div>
    </section>"""
        pagina = cabeza(p["titulo"], p["descripcion"], url, p["h1"], ga, v, ld) + cuerpo(main_html)
        cambio = escribir_si_cambia(f"{p['slug']}/index.html", pagina)
        if cambio:
            cambiadas.append(p["slug"])
        print("ok" if cambio else "sin cambios", "/" + p["slug"] + "/")

    # 3) /servicios/: todos los servicios por grupo
    url = f"{DOMINIO}/servicios/"
    titulo = "Servicios de construcción en Monterrey | NORTEA"
    descripcion = "Servicios de NORTEA en Monterrey: casas, locales, oficinas, naves, obra civil, tablaroca, Durock, acabados, proyecto ejecutivo, planos y estudios."
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Inicio", "item": f"{DOMINIO}/"},
            {"@type": "ListItem", "position": 2, "name": "Servicios", "item": url}]},
        {"@type": "ItemList", "name": "Servicios de NORTEA", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": p["h1"], "url": f"{DOMINIO}/{p['slug']}/"} for i, p in enumerate(paginas)]},
    ]}
    # Una tarjeta por servicio principal, con su foto; sus páginas secundarias van como enlaces dentro de la tarjeta.
    secciones = []
    for g in grupos:
        tarjetas = []
        mains = principales(paginas, g["id"])
        for p in mains:
            foto = (f'<div class="svc-tarjeta__foto">{img(p["fotos"][0], propios, "(min-width: 1000px) 30vw, (min-width: 640px) 45vw, 100vw")}</div>'
                    if p["fotos"] else "")
            subs = hijos.get(p["slug"], [])
            subs_html = ("" if not subs else
                         '<div class="svc-tarjeta__subs"><p>También:</p><ul role="list">'
                         + "".join(f'<li><a href="/{h["slug"]}/">{esc(h["nombre"])}</a></li>' for h in subs)
                         + "</ul></div>")
            tarjetas.append(
                f'          <li class="svc-tarjeta reveal"><a class="svc-tarjeta__enlace" href="/{p["slug"]}/">{foto}'
                f'<div class="svc-tarjeta__texto"><h3>{esc(p["nombre"])}</h3><p>{esc(p["lead"])}</p>'
                f'<span class="svc-tarjetas__ir">Ver servicio <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></span></div></a>'
                f'{subs_html}</li>')
        fondo = " section--light" if len(secciones) % 2 else ""
        secciones.append(f"""    <section class="section{fondo}" aria-labelledby="grupo-{g['id']}">
      <div class="container">
        <h2 class="section-title reveal" id="grupo-{g['id']}">{esc(g['nombre'])}</h2>
        <ul class="svc-tarjetas svc-tarjetas--{len(mains)}" role="list">
{chr(10).join(tarjetas)}
        </ul>
      </div>
    </section>""")
    main_html = f"""    <section class="svc-hero svc-hero--indice" aria-labelledby="svc-titulo">
      <div class="container">
        <nav class="migas" aria-label="Ruta"><a href="/">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">Servicios</span></nav>
        <h1 class="svc-hero__titulo" id="svc-titulo">Servicios de construcción en Monterrey</h1>
        <p class="svc-hero__lead">De la casa a la nave industrial: elige lo que necesitas y conoce cómo lo hacemos, con fotos de nuestras obras y respuestas a lo que más nos preguntan.</p>
        <div class="svc-hero__acciones">
          <a class="btn btn--gold btn--lg" data-wa="general" data-wa-place="servicios" href="{WA}" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg> Cotizar por WhatsApp</a>
          <a class="btn btn--outline btn--lg" href="/#cotizar">Llenar el formulario</a>
        </div>
      </div>
    </section>

{chr(10).join(secciones)}

{cierre_cta("general", "servicios-cierre", "")}"""
    if escribir_si_cambia("servicios/index.html", cabeza(titulo, descripcion, url, "Servicios de construcción en Monterrey", ga, v, ld) + cuerpo(main_html)):
        cambiadas.append("servicios")
        print("ok /servicios/")
    else:
        print("sin cambios /servicios/")

    escribir_sitemap(paginas, cambiadas)
    escribir_llms(datos)


def escribir_sitemap(paginas, cambiadas):
    """Conserva las entradas que no son de servicios y pone (o actualiza) /servicios/ y cada servicio."""
    hoy = datetime.date.today().isoformat()
    actual = leer("sitemap.xml")
    previas = dict(re.findall(r"<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>", actual))
    generadas = [("servicios", 0.9)] + [(p["slug"], 0.7 if p.get("padre") else 0.8) for p in paginas]
    propias = {f"{DOMINIO}/{s}/" for s, _ in generadas}

    def existe(loc):   # quita del sitemap las páginas que ya no existen (por ejemplo, un servicio que se renombró)
        ruta = loc.replace(DOMINIO, "").lstrip("/")
        return os.path.exists(os.path.join(RAIZ, ruta + "index.html" if (ruta == "" or ruta.endswith("/")) else ruta))
    otras = re.findall(r"  <url>[\s\S]*?</url>\n", actual)
    otras = [u for u in otras if re.search(r"<loc>([^<]+)</loc>", u).group(1) not in propias
             and existe(re.search(r"<loc>([^<]+)</loc>", u).group(1))]
    nuevas = []
    for slug, prioridad in generadas:
        loc = f"{DOMINIO}/{slug}/"
        fecha = hoy if (slug in cambiadas or loc not in previas) else previas[loc]
        nuevas.append(f"  <url>\n    <loc>{loc}</loc>\n    <lastmod>{fecha}</lastmod>\n    <priority>{prioridad}</priority>\n  </url>\n")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "".join(otras[:1]) + "".join(nuevas) + "".join(otras[1:]) + "</urlset>\n")
    escribir_si_cambia("sitemap.xml", xml)
    print("ok sitemap.xml")


def escribir_llms(datos):
    """Resumen del negocio en Markdown para asistentes de IA (propuesta llms.txt)."""
    z = datos["zonas"]
    lineas = [
        "# NORTEA Ingeniería y Construcción", "",
        "> Constructora en Monterrey, Nuevo León (México). Obra civil, construcción, remodelación y ampliación de casas "
        "(segundo y tercer piso), locales comerciales, oficinas y naves industriales, tablaroca y Durock, acabados, y proyecto "
        "ejecutivo: planos arquitectónicos, renders, levantamiento topográfico, mecánica de suelos, cálculo estructural y estudio "
        "hidrológico. Atiende a particulares, negocios, constructoras y despachos de arquitectura en Monterrey y su área "
        "metropolitana, en obra. Cotización formal por escrito.", "",
        f"Todos los servicios: {DOMINIO}/servicios/", "",
    ]
    hijos = hijos_de(datos["paginas"])
    for g in datos["grupos"]:
        lineas.append(f"## {g['nombre']}")
        for p in principales(datos["paginas"], g["id"]):
            lineas.append(f"- [{p['h1']}]({DOMINIO}/{p['slug']}/): {p['lead']}")
            for h in hijos.get(p["slug"], []):
                lineas.append(f"  - [{h['h1']}]({DOMINIO}/{h['slug']}/): {h['lead']}")
        lineas.append("")
    lineas += ["## Zona de servicio", ", ".join(z[:-1]) + " y " + z[-1] + " (Nuevo León, México).", "",
               "## Contacto",
               f"- Sitio: {DOMINIO}/",
               "- WhatsApp: +52 81 2034 8618 (https://wa.me/528120348618)",
               "- Horario: lunes a sábado, de 8:00 a 18:00",
               "- Correo: nortea.ic@gmail.com",
               "- Instagram: https://www.instagram.com/nortea.mx_/",
               f"- Formulario de cotización: {DOMINIO}/#cotizar", ""]
    escribir_si_cambia("llms.txt", "\n".join(lineas))
    print("ok llms.txt")


if __name__ == "__main__":
    sys.exit(main())
