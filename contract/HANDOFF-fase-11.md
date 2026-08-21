# Handoff — Fase 11 (playground de Numi para el superadmin)

Una consola nueva, **solo para el superadmin de plataforma**, donde se prueba a Numi contra una organización real y se ve exactamente qué costó cada turno. No es pantalla de cliente: ningún usuario de una organización la ve nunca.

El backend está hecho, mergeado a `main` y con el contrato regenerado. Todo vive bajo `/api/v1/admin/playground/*`, detrás de `requirePlatformAdmin` — **las lecturas también**, porque aquí lo que se lee son los datos de otro.

| Fase | Alcance | Estado |
| --- | --- | --- |
| **1** | Telemetría de cada turno (tokens, cacheo, latencia, herramientas) | ✅ hecha |
| **2** | Consola: elegir organización, suplantar rol, hablar, ver la traza | ✅ hecha |
| **3** | Otro modelo, otro prompt, ejecutar una tool suelta, comparar variantes | ✅ hecha |
| **4** | Conjunto de regresión y paneles (actividad, pulgares abajo, escrituras, RAG) | ✅ hecha |

---

## Antes de empezar

**Quién entra.** Ya existe `GET /api/v1/platform/me/platform-access` → `{ isPlatformAdmin }`. Es lo que decide si se ofrece la sección; el backend revalida en cada petición, así que un cliente que se mienta a sí mismo solo consigue un 403.

**El cliente tipado.** `pnpm api:gen` sobre el `openapi.json` nuevo. Hay 18 rutas nuevas y una docena de esquemas con prefijo `Playground*`.

**Cookies y CSRF, como siempre.** Las mutaciones llevan `x-csrf-token`. Nada nuevo.

---

## Lo que hay que entender antes de dibujar nada

### El playground corre el pipeline de verdad

No es una maqueta ni un endpoint paralelo: llama al **mismo** caso de uso que atiende a un cliente, con el mismo system prompt, las mismas herramientas y el mismo grounding. Lo que cambia lo cambia estrechando, nunca ampliando.

Esto importa para la UI porque significa que **lo que se ve en pantalla es lo que pasa en producción**. Si el catálogo dice que un VIEWER no ve `register_payment`, es que no lo ve.

### Solo lectura por defecto, y hay que quererlo para cambiarlo

Cada turno lleva `mode: 'read_only' | 'read_write'`. Por defecto `read_only`, y en ese modo la corrida **no ve una sola herramienta de escritura**.

`read_write` escribe de verdad en la organización del cliente: registra pagos, egresos, contactos. No es una simulación. La UI tiene que hacerlo evidente — un interruptor con estado visible, no una casilla escondida en un menú. Y la organización tiene que estar activa: si está suspendida, el backend responde `403 ORGANIZATION_SUSPENDED` y solo deja leer.

### Nada de claves por el cuerpo

Para correr con otro modelo se manda `{ provider, model }`. **Nunca una API key.** La clave la resuelve el servidor. Si ese proveedor no tiene clave configurada, el error dice qué variable de entorno falta — enséñalo tal cual, es accionable.

`GET /organizations/{orgId}/context` devuelve `testableProviders`: los proveedores que sí se pueden elegir. Si viene vacío, el selector de modelo se deshabilita y solo se corre con la credencial de la organización.

---

## Pantalla 1 — La consola

### Montarla

| Endpoint | Qué trae |
| --- | --- |
| `GET /admin/playground/organizations` | Lista paginada. Cada una con `writable` (si está activa) |
| `GET /admin/playground/organizations/{orgId}/context?role=&mode=` | Modelo activo, system prompt + huella, bloque de contexto, roles propios, proveedores probables |
| `GET /admin/playground/organizations/{orgId}/tools?role=&customRoleId=&mode=` | Catálogo de herramientas para ese rol y ese modo |

`/context` no depende del rol; `/tools` sí. Cuando el usuario cambia de rol o de modo, refresca **solo** el catálogo.

### Los controles

- **Organización** (buscador).
- **Rol a suplantar**: los cinco predefinidos, más los `customRoles` que devuelve `/context`. Un rol propio **reemplaza** los permisos del rol base, no se suma.
- **Modo**: solo lectura / lectura y escritura.
- **Modelo** (opcional): proveedor de `testableProviders` + identificador de modelo, texto libre con sugerencias.
- **System prompt** (opcional): un textarea con el prompt vigente precargado desde `/context`. Editarlo **no lo guarda en ningún sitio**; corre solo ese turno. Deja claro que es efímero.

### El catálogo de herramientas

Cada entrada trae `name`, `description`, `permission`, `kind` (`read` | `write`), `schema` (JSON Schema del input) y dos campos que son la gracia del panel:

- `offered`: si el modelo la vería en esta corrida.
- `withheld`: `'permission'` | `'read_only'` | `null` — **por qué** no la ve.

Enseñar el porqué es la mitad del valor: «no aparece porque el rol no puede» y «no aparece porque estás en solo lectura» son dos bugs distintos y el catálogo los distingue.

`schema` puede venir `null` si un esquema no se pudo representar. No es un error: enseña la herramienta sin el formulario.

### El chat

`POST /admin/playground/chat` — Server-Sent Events sobre POST, igual que el chat del tenant. **Cinco** eventos:

| Evento | Cuerpo | Cuándo |
| --- | --- | --- |
| `start` | `{ sessionId }` | Antes de la primera palabra |
| `chunk` | `{ text }` | Por cada trozo |
| `trace` | La traza completa, o `null` | Al terminar, antes de `done` |
| `done` | `{ sessionId, reply, userMessageId, assistantMessageId, stopped }` | Una vez |
| `error` | `{ error: { code, message } }` | Si se rompió **después** del primer trozo |

Lo que falla **antes** del primer trozo —organización inexistente, suspendida, sin proveedor de IA, sin clave para ese modelo— vuelve como **JSON normal con su status**, no como flujo de eventos. Es la misma trampa que ya maneja el chat del tenant: mira el `content-type` antes de abrir el lector.

Para detener, aborta la petición. Lo ya escrito se guarda.

---

## Pantalla 2 — La traza (lo que pediste)

Llega en el evento `trace` y también por `GET /admin/playground/runs/{id}`. Esto es lo que trae y cómo enseñarlo:

**Cabecera**: `provider`, `model`, `source` (`BYOK` | `PLATFORM`), `finishReason`, `stepsUsed` / `maxSteps`.

**Tiempos** (`timings`, en ms): `totalMs`, `resolveMs` (resolver credencial), `contextMs` (leer contexto de la organización), `engineMs` (el modelo), `toolsMs` (dentro de `engineMs`), `persistMs` (archivar). Más `ttftMs`, el tiempo hasta la primera palabra. Una barra apilada cuenta la historia entera: si `toolsMs` se come el turno, el problema no es el modelo.

**Tokens** (`usage`): `input`, `output`, `cacheRead`, `cacheWrite`, `noCache`, `reasoning`.

> ⚠️ **`null` no es cero.** Un proveedor que no reporta cacheados manda `null`, y eso significa «no lo sé». Píntalo como «—» o «sin dato», nunca como 0: un cero ahí inventa un ahorro de caché que no ocurrió, y es exactamente el número que alguien va a mirar para decidir si el prompt cacheado sirve de algo.

**Coste**: `costMicroUsd`, en **micro-dólares** (1 USD = 1.000.000). Divide entre un millón para mostrarlo. Puede ser `null` si ese modelo no tiene precio configurado: enseña «sin precio configurado», no `$0`.

**Herramientas** (`tools`): por cada llamada, `name`, `args`, `output`, `ok`, `errorMessage`, `durationMs` y `startedAtMs` (offset desde el inicio del turno — sirve para dibujarlas en una línea de tiempo).

**Generaciones** (`generations`): normalmente una. **Dos cuando el grounding obligó a repetir** — el turno se contestó, se detectó una cifra sin respaldo y se reintentó. Los tokens del turno son la suma de las dos; si solo enseñas la primera, el coste sale a mitad de precio.

**Grounding**: `{ violated, retried, offenders }`. `offenders` son los montos en **centavos** que la respuesta dijo y ninguna herramienta devolvió.

**Prompt** (`detail`): `system`, `contextBlock`, `messages` y `toolNames`. Es lo que el modelo recibió, literal. Solo lo llevan las corridas del playground — de un turno de cliente se guardan medidas, no lo que preguntó.

Y `stopped` (lo paró el usuario, no es fallo) y `error` (`{ name, message }`).

---

## Pantalla 3 — Ejecutar una herramienta suelta

`POST /admin/playground/tools/{name}` con `{ organizationId, role, customRoleId?, mode, args }`.

Sirve para separar en un clic «la herramienta está rota» de «el modelo la llamó mal». El formulario se puede generar desde el `schema` del catálogo.

Un fallo de la herramienta responde **200 con `ok: false`** y el error dentro — no es un 500. Enseña `output`, `durationMs` y el error si lo hay.

Las de escritura exigen `mode: 'read_write'`, y sin `confirmed: true` en los argumentos devuelven su petición de confirmación, igual que se la devolverían al modelo. Eso también es útil de ver.

---

## Pantalla 4 — Comparar variantes

`POST /admin/playground/compare` con el mismo mensaje y de **2 a 4 variantes**, cada una con su `label` y su `model` y/o `system`.

Devuelve una entrada por variante con `reply`, `trace` y `error`. Vista de columnas: respuesta arriba, y debajo tokens, latencia y herramientas llamadas para comparar de un vistazo.

**Siempre corre en solo lectura y no hay campo para cambiarlo**: dos variantes que escribieran registrarían la operación dos veces. Dilo en la UI para que nadie lo busque.

Cada variante se lleva su propio fallo: si una no tiene clave, esa columna muestra el error y **las otras contestan igual**.

---

## Pantalla 5 — El conjunto de regresión

Es lo que convierte esto en instrumento: «¿este cambio de prompt rompió algo que ayer funcionaba?».

| Endpoint | Qué hace |
| --- | --- |
| `GET·POST /admin/playground/cases` | Listar y guardar casos |
| `GET /admin/playground/cases/draft?traceId=` | Prellenar un caso con lo que se preguntó en una corrida |
| `PUT·DELETE /admin/playground/cases/{id}` | Editar y archivar |
| `POST /admin/playground/cases/run` | Correr el conjunto |
| `GET /admin/playground/cases/suites` | Las últimas corridas: cuántos pasaron de cuántos |
| `GET /admin/playground/cases/runs?suiteId=` | El detalle de una corrida |

Un caso es: mensaje, rol, organización y **expectativas**:

- `expectedTools` / `forbiddenTools` — herramientas que debió o no debió llamar.
- `mustMention` / `mustNotMention` — frases (se comparan sin acentos ni mayúsculas).
- `mustBeGrounded` — por defecto `true`.

El resultado de cada caso trae `passed` y `failures`, una línea legible por expectativa incumplida («no llamó a list_receivables», «menciona «no tengo», que no debía»). Enséñalas tal cual, están escritas para leerse.

`POST /cases/run` acepta `model` y `system`: correr el conjunto entero con el prompt nuevo es el flujo que justifica la pantalla. Va **en serie**, así que con veinte casos tarda; enseña progreso o al menos un spinner honesto. El botón de guardar caso debería estar en la traza de cualquier corrida — «esto salió mal, que no vuelva a pasar» es el camino real.

---

## Pantalla 6 — Los paneles

| Endpoint | Panel |
| --- | --- |
| `GET /admin/playground/stats?from=&to=&organizationId=&origin=` | Actividad por día + histograma de herramientas |
| `GET /admin/playground/feedback?feedback=down` | Respuestas puntuadas |
| `GET /admin/playground/writes?conversationId=` | Qué dejó escrito una corrida |
| `POST /admin/playground/knowledge` | Qué devuelve la base de conocimiento, con score |

**Actividad**: por día, `turns`, `p50Ms`, `p95Ms`, tokens, `groundingViolations` y `failures`; más `tools` (llamadas, fallos, duración media) y `totals` con `cacheHitRate`. La ventana de fechas es **obligatoria** (`from`/`to`, formato `YYYY-MM-DD`, en UTC): sin ella es 422. Filtra por `origin` (`user` | `playground`) para separar los turnos reales de las pruebas — por defecto vienen mezclados, y casi siempre se quiere `user`.

**Pulgares abajo**: la única señal de calidad que da el producto. Cada entrada trae la respuesta **y la pregunta que la provocó** (`userMessage`). El botón que importa es «volver a correrla en el playground»: coge `userMessage` y `organizationId` y abre el chat con eso precargado.

**Escrituras**: lo que una corrida registró, sacado de sus trazas. **No hay reversa masiva y no la va a haber**: deshacer movimientos financieros en bloque es una operación de dinero, y las reversas ya existen una a una con su auditoría. Esta pantalla dice qué revisar y enlaza a la entidad; el botón de reversa es el de siempre.

**Base de conocimiento**: los trozos que devuelve una consulta con su `score`. Es para ajustar el RAG. Si no hay `VOYAGE_API_KEY` responde 422 con un mensaje claro.

---

## Errores, en un párrafo

Los de siempre, con el mismo sobre `{ error: { code, message } }`:

- `403 FORBIDDEN` — no es superadmin (o el rol suplantado no puede usar esa herramienta).
- `403 ORGANIZATION_SUSPENDED` — se pidió escribir en una organización que no está activa.
- `404 NOT_FOUND` — organización, traza, caso o herramienta que no existe.
- `422 VALIDATION` — cuerpo inválido, sin proveedor de IA configurado, sin clave para el proveedor pedido, conjunto vacío, base de conocimiento sin configurar.
- `429 RATE_LIMITED` — 60 turnos por minuto. Es una consola, pero cada turno es una llamada pagada.

---

## Lo que **no** hay que construir

- **Reversa masiva de escrituras.** Explicado arriba.
- **Un formulario para pegar API keys.** El backend no las acepta y no las va a aceptar.
- **Nada de esto en la UI del tenant.** Un cliente no ve el playground ni sabe que existe. Sus conversaciones de prueba tampoco aparecen en su historial: el backend las marca con `origin: 'playground'` y las filtra en la lista, en la búsqueda y en el acceso por id. Eso ya está resuelto, no hay nada que hacer en el front.
