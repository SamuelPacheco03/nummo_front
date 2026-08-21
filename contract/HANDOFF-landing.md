# HANDOFF — La página pública de Nummo (backend en `dev`)

> **Estado del backend:** hecho y mergeado a `dev` de `nummo-api`. 940 tests verdes.
> Tres endpoints públicos —precios, señales y Numi de preventa— y tres de consola.
>
> **Contrato:** `contract/openapi.json` **ya actualizado** (159 rutas, 223 esquemas).
> Corré `pnpm api:gen` antes de empezar.
>
> **El plan por fases** vive en `C:\Users\Samue\.claude\plans\landing-nummo-front.md`.
> Este documento es lo que el backend te debe: qué responde, qué exige y qué reglas suyas
> tiene que reflejar el diseño.

## Qué se construye, en una frase

La primera superficie de Nummo que alguien puede ver sin cuenta: una portada que vende, que
mide de dónde viene cada visita, y donde Numi contesta preguntas de preventa.

## Antes de escribir código: tres choques con `context.md`

El `CLAUDE.md` de este repo pide decirlos, no callarlos. Los tres son el mismo malentendido:
**el documento describe la consola, y una portada es otro medio.** La salida propuesta es
añadir un **`§97. La página pública`** que acote cada regla, no borrarla.

| Regla | Qué dice | Qué pide el diseño aprobado |
| --- | --- | --- |
| §3.1 Colores de marca | Azul `#2563EB` + teal/cian/índigo, «no reemplazarlos arbitrariamente» | Crema, verde bosque, menta y durazno |
| §11.1 (3) | Prohibidas las micro-etiquetas en mayúsculas con `letter-spacing` | Una por sección: «EL DESORDEN CUESTA», «TU ASISTENTE FINANCIERO»… |
| §11.1 (2) | Prohibido el icono dentro del cuadradito tintado | Los tres pasos de «Del movimiento a la acción» los usan |

Las dos de §11.1 salieron de criticar el Panel y **ahí siguen valiendo**: en una consola las
versalitas gritan y la pastilla es relleno. En una portada la etiqueta es lo que orienta la
lectura y el icono con superficie sostiene un paso numerado. Acotar, no derogar.

## Decisiones ya tomadas, con su porqué

- **La paleta se decide en un laboratorio, no en un mockup.** Cada candidata se prepara
  completa —claro **y** oscuro— y se mira sobre el hero real *y* sobre pantallas de consola
  (KPIs, tabla, burbuja de Numi). Una paleta que enamora en una portada puede ser ilegible en
  una tabla de cifras, y eso solo se ve mirándola ahí. Tres candidatas: `azul` (la actual, para
  comparar contra algo real), `bosque` (la de los mockups) y `bruma` (neutro cálido con el teal
  de marca en profundo).
- **Capa de paletas de ~18 ranuras crudas.** Hoy cada token semántico lleva su hex: una
  candidata serían 77 líneas × 2 modos. Con la capa, una paleta nueva es un objeto de 18
  valores en TypeScript — y el test de contraste y las muestras leen exactamente lo que se
  pinta, sin poder divergir.
- **Test de contraste AA por paleta y por modo.** El propio `context.md` registra que el teal
  da 2.4:1 como texto y que por eso existe `--success-strong`. Esa clase de hallazgo debe
  dejar de depender de que alguien se acuerde.
- **Se añade una serif** (candidata: Instrument Serif) vía `@fontsource`, self-hosted como las
  otras y cargada **solo en la entrada de la landing**. Pasa por §63.
- **Dos entradas, un repo.** `index.html` → landing (prerenderizada), `app.html` → consola
  (SPA + PWA con `basename: '/app'`). No pueden compartir router: `basename` hace que el router
  solo atienda `/app`. Verificado que la mudanza es barata: 55 enlaces internos van por el
  router, cero anclas absolutas, cero `redirect()` en loaders.
- **Sin librería de animación.** `IntersectionObserver` + CSS cubre revelados, la línea que se
  dibuja, el chat que se escribe y los contadores. `motion` son ~34 kB gzip justo donde el peso
  se paga. `prefers-reduced-motion` se prueba, no se asume.

---

## La página, sección por sección

El diseño aprobado son mockups que **no viajan con este documento**; pedilos si los
necesitás. Esto es lo que fijan, y basta para construir: fondo crema, tinta verde muy
oscura, acentos en menta y durazno, titulares grandes en grotesca apretada con las palabras
destacadas en serif cursiva, y mucho aire. Cada sección tiene **un** gesto, nunca dos.

| # | Sección | Qué se mueve |
| --- | --- | --- |
| 1 | Nav flotante | Se vuelve translúcida con blur al bajar |
| 2 | Hero + mock del panel | Entrada escalonada; el panel entra con inclinación mínima; el aviso de Numi aparece con retardo |
| 3 | Ticker oscuro | Se desplaza en bucle |
| 4 | El desorden cuesta (antes/después) | Las tarjetas dispersas flotan apenas; las barras del panel «después» se llenan al entrar |
| 5 | Tu dinero tiene un ritmo | La línea del área se dibuja; el tooltip aparece; las pestañas cruzan series |
| 6 | Conoce a Numi | El hilo se escribe mensaje a mensaje, con indicador de escritura |
| 7 | Del movimiento a la acción (fondo oscuro) | Los tres pasos se encienden en secuencia |
| 8 | Un sistema que se adapta a ti | Las tres tarjetas revelan al entrar; la activa levanta |
| 9 | Precios | Las columnas entran escalonadas |
| 10 | CTA final + footer | La elipse se dibuja detrás del titular |

La sección de precios **no está en los mockups** y aquí sí va: es la razón de que exista
`/public/pricing` y de que se decidiera publicar la tarifa (ADR 0005 del backend).

«Recursos» del menú se queda fuera: no hay contenido todavía, y un enlace a una página vacía
cuesta más confianza de la que da tenerlo en la barra.
---

## 1. Los precios — `GET /api/v1/public/pricing`

Sin sesión. Cacheable cinco minutos (`Cache-Control: public, max-age=300`).

```jsonc
{
  "plans": [
    {
      "code": "FREE",
      "name": "Free",
      "description": "Para empezar: el ciclo completo de cartera, con topes bajos.",
      "price": { "amount": "0.00", "currency": "COP" },   // o null
      "features": [
        { "key": "whatsapp_outbound", "label": "Cobros por WhatsApp",
          "detail": "Recordatorios y avisos a tus clientes…", "included": false }
      ],
      "limits": [
        { "key": "max_contacts", "label": "Contactos", "value": 30, "unit": "contactos" }
      ]
    }
  ]
}
```

Reglas del backend que la pantalla tiene que reflejar, porque no son detalles:

- **`price: null` NO es gratis, es «consultar».** El plan gratuito trae `"0.00"`. Y hoy
  **solo FREE tiene precio publicado**: Básico y Pro llegan en `null` hasta que alguien los
  fije desde la consola de plataforma. La sección tiene que saber pintar eso sin que parezca
  un error ni un cero.
- **`value: null` en un tope es ilimitado; `0` es un tope real.** WhatsApp en el plan gratis
  viene a cero a propósito.
- **Las features llegan con `included: true|false`, no filtradas.** Es lo que permite pintar
  la matriz comparativa: una fila ausente no dice «no lo tiene», dice «no se sabe».
- **Lo que llega es lo publicable, y ya está filtrado.** El backend solo expone los planes
  públicos y, de cada uno, las claves que tienen copy. Si una función nueva no aparece, no es
  un bug: es que todavía no se anuncia. No la inventes en el front.
- Enterprise no sale. No está a la venta.

**Decisión abierta para la fase 2:** la landing no debería arrastrar TanStack Query por una
sola lectura. Dos salidas razonables —inlinear los precios en el prerender y refrescar en
cliente, o un hook mínimo sobre la función generada por Orval en vez del hook de Query— y
conviene elegir a la vista del peso real del bundle.

---

## 2. Las señales — `POST /api/v1/public/signals`

Sin sesión y **sin CSRF**: no autoriza nada, solo anota. Necesita `credentials: 'include'`
—que el mutator de Orval ya pone— porque la respuesta deja una cookie de visitante
first-party. **El front no la lee ni la necesita:** es `HttpOnly` y la escribe el servidor.
Esa cookie es lo que hace que un registro posterior se pueda atribuir a la campaña que lo
trajo, y por eso la atribución sobrevive a un bloqueador.

```jsonc
{
  "sessionId": "s-8f21…",        // 8–40 chars, opaco para el servidor
  "landingPath": "/",
  "referrer": "https://l.instagram.com/",
  "utm": { "source": "instagram", "campaign": "lanzamiento" },
  "events": [ /* 1 a 20 */ ]
}
```

El catálogo es **cerrado** y está discriminado por `name`:

| Evento | Campos | Cuándo |
| --- | --- | --- |
| `page_view` | `path` | Al cargar |
| `section_viewed` | `section` | Cuando la sección entra en pantalla |
| `demo_tab_selected` | `tab` | Al cambiar de pestaña en la demo |
| `cta_clicked` | `section`, `action` | Al pulsar una llamada a la acción |

```text
section : hero · automation · product_demo · numi · use_cases · integrations · pricing · final_cta
tab     : collections · finances · numi · whatsapp · reports
action  : signup · login · demo · contact
```

- **Un nombre fuera del catálogo tumba el lote entero con 422.** Es a propósito: una tabla de
  analítica que acepta cualquier cosa se convierte en basura en seis meses.
- **La deduplicación la hace el servidor, por sesión.** Reenviar el mismo lote responde
  `{ "accepted": 0 }` y **eso no es un error**: es lo que pasa cuando un observador de scroll
  dispara de más o un beacon reintenta. No lo trates como fallo ni lo reintentes.
- **`numi_asked` existe en el catálogo pero el cliente no puede emitirlo.** Lo escribe el
  endpoint que contesta. Si lo mandás, 422.
- Enviá por lotes con intervalo y con `navigator.sendBeacon` en `pagehide`, no evento a evento.

> **Aviso honesto:** las ocho secciones se fijaron **antes** de que la página existiera. Si al
> maquetar las secciones reales no calzan con esos nombres, se ajusta el catálogo del backend
> —una línea y una migración del `CHECK`— en vez de forzar nombres que mientan. Decilo y se
> cambia.

---

## 3. Numi de preventa — `POST /api/v1/public/numi`

```jsonc
// pide
{ "sessionId": "s-8f21…", "question": "¿Sirve para un colegio?" }   // 3–500 chars

// responde SIEMPRE 200
{ "answer": "…", "remaining": 5, "exhausted": false }
```

Es Numi, pero no es el del producto: contesta **solo** con la documentación pública y la
lista real de precios, sin herramientas y sin datos de nadie. No sabe quién sos y no puede
consultar nada tuyo; si le preguntan por su propio negocio, dirá que eso se ve dentro de la
cuenta.

- **Quedarse sin cuota no es un error.** Devuelve `200` con `exhausted: true` y un mensaje
  cordial. Un `429` en una portada es un widget roto para quien lo está leyendo. Cuando llega
  `exhausted`, **el sitio de la caja de texto lo ocupa el registro**, no un aviso de error.
- **`remaining` sirve para avisar antes del último turno**, no después. Son 6 por visitante
  y no se renuevan: es el empujón al registro, y así hay que contarlo.
- **Puede estar apagado.** Sin `MARKETING_NUMI_ENABLED=true` + credencial de plataforma +
  base de conocimiento, responde igual —200, `exhausted: true`— diciendo que por ahí todavía
  no atiende. **En desarrollo estará apagado por defecto**, así que ese es el estado que vas a
  ver primero y hay que diseñarlo, no tratarlo como un fallo de integración.
- Límite de 10 por minuto por IP, además de las cuotas. El widget no debería permitir mandar
  una segunda pregunta con la primera en vuelo.

---

## 4. La consola de marketing — existe, pero no es esto

`GET /api/v1/admin/marketing/{overview,funnel,sources}`, detrás de `requirePlatformAdmin` y
fuera de la superficie de tenant. Es el embudo por campaña hasta la organización que paga.
**No entra en la landing**: es una pantalla de `/plataforma` y va después. Se menciona para
que no sorprenda al regenerar el cliente.

## 5. Las trampas que ya conocemos

- **Mismo origen.** En desarrollo el proxy de Vite manda `/api` al 4010, así que la cookie de
  visitante es first-party sin trucos. En producción la landing, la app y la API viven en el
  mismo host (`/`, `/app`, `/api`): separar la portada a otro dominio rompería la atribución y
  obligaría a tocar CORS, que hoy acepta **un solo** origen.
- **El service worker.** Hoy su `scope` es `/` y con la portada ahí serviría una página
  cacheada con el precio viejo. En la fase 3: `id`, `start_url` y `scope` a `/app/`,
  `navigateFallback` a `app.html` con allowlist, y marketing fuera del precache.
- **Consentimiento antes que Clarity.** El banner por defecto no carga nada; Clarity entra
  solo con el sí. La medición propia no depende de ese sí para lo que importa, porque la parte
  que decide —el registro— la escribe el servidor.
- **Nada de testimonios ni logos de clientes.** No hay ninguno real todavía; entran cuando lo
  sean. Los mockups son referencia de diseño, no de contenido.
- **`theme-provider.tsx` tiene `#f8fafc` / `#0b1220` escritos a mano** para el `theme-color`.
  Al entrar la capa de paletas, eso pasa a salir de la paleta activa.

## 6. Antes de dar algo por terminado

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Y además:

- `pnpm build && pnpm preview` — única forma de probar el service worker de verdad.
- 360 / 768 / 1024 / 1440, y claro **y** oscuro. Un token declarado solo en `:root` es un bug.
- Mirar `dist/index.html` y confirmar que el titular está ahí **sin ejecutar JavaScript**: si
  no, el prerender no está haciendo su trabajo y Google y WhatsApp verán una página vacía.
- `context.md` en el mismo commit: §97 nueva, §3.1 con la nota de la paleta, §86.2 con la
  serif, §87.1 con `src/marketing/`.
