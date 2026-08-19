# SYNC-STATUS — Backend → Frontend

**Fecha:** 2026-08-19 (contrato traído de `dev`, 103 paths) · **Estado del backend: V1 COMPLETO (Fases 0–8) + verticalización + config IA + chat Numi (A–D) + historial persistente + base de conocimiento + mensajes de voz + buscador global + onda de las notas de voz + informe de cuentas + idempotencia en todas las mutaciones de dinero + permisos por acción + planes, features y límites + consola de plataforma + catálogo público de planes y señal de acceso a la consola.**

## ⚠️ ROMPE — el estado de la organización salió de `PATCH /organizations/:orgId`

`UpdateOrganizationInput` **ya no acepta `status`**. Suspender o reactivar dejó de ser un campo
del formulario de empresa y pasó a `PUT /api/v1/admin/organizations/:orgId/status`, que es
superficie de superadmin de plataforma. Si lo seguís mandando, `tsc` falla al regenerar.

Ya está arreglado en `company-page.tsx`: el campo «Estado» se muestra ahora como lectura
(`StatusBadge`, con el tono de siempre) en vez de un `<select>` editable. **No lo quitéis de la
pantalla**: una organización que no está `ACTIVE` queda en **solo lectura**, y ese badge es la
explicación de por qué no se guarda nada.

Ese modo de solo lectura es nuevo y conviene contemplarlo: cualquier método que no sea de
lectura responde **`403 ORGANIZATION_SUSPENDED`**. Consultar y exportar la historia sigue
funcionando siempre — eso no se gatea nunca.

## 🆕 Qué puede hacer el usuario y qué incluye su plan — `GET /me/capabilities`

**`GET /api/v1/organizations/:orgId/me/capabilities`** · cualquier miembro autenticado, sin
permiso especial. Una llamada que responde de una vez las cuatro preguntas que la UI necesita
para decidir qué pintar:

```jsonc
{
  "organizationId": "…",
  "role": "ACCOUNTANT",                       // quién es
  "permissions": ["contacts.read", "payments.create", "…"],  // qué puede hacer
  "planCode": "PRO",                          // FREE · BASIC · PRO · ENTERPRISE
  "features": { "ai_byok": true, "custom_roles": false, "accounting": true,
                "bank_reconciliation": false, "approvals": false, "api_access": false },
  "limits":   { "max_contacts": 500, "max_users": 10, "max_branches": 3,
                "ai_messages_monthly": 2000, "voice_minutes_monthly": 120 },
  "period":   "2026-08",                      // YYYY-MM en la zona horaria de la organización
  "usage":    { "ai_messages_monthly": 431, "voice_minutes_monthly": 12 }
}
```

Dos convenciones que valen para todo el bloque:

- **Un límite en `null` es ilimitado**, no cero. Una feature ausente es `false`.
- `usage` solo existe para los límites que se acumulan por período (los de IA y voz). Los
  demás (`max_contacts`, `max_users`, `max_branches`) cuentan filas que existen ahora, así que
  el conteo lo tenéis vosotros en la propia lista.

Es la fuente para **esconder o deshabilitar** en vez de dejar que el usuario choque contra un
403. Pero el backend sigue validando: la UI decide qué mostrar, nunca qué se permite.

## 🆕 Dos errores nuevos, y por qué no son un 402

Un plan que no alcanza **no es `402 Payment Required`** — proxies y clientes lo tratan de forma
errática. Son dos casos distintos y la UI debería decir cosas distintas:

| Código | HTTP | Qué pasó | Salida |
| --- | --- | --- | --- |
| `FEATURE_NOT_AVAILABLE` | 403 | El plan no lo incluye | Mejorar de plan |
| `LIMIT_EXCEEDED` | 409 | Sí lo incluye, pero se acabó la cuota | Liberar algo, o mejorar |

Ambos traen `details` accionables, así que el mensaje puede ser concreto en vez de «no se pudo»:

```jsonc
// FEATURE_NOT_AVAILABLE
{ "error": { "code": "FEATURE_NOT_AVAILABLE", "message": "…",
             "details": { "feature": "accounting", "plan": "BASIC" } } }

// LIMIT_EXCEEDED
{ "error": { "code": "LIMIT_EXCEEDED", "message": "…",
             "details": { "limit": "max_contacts", "max": 500, "used": 500,
                          "plan": "PRO", "period": "2026-08" } } }
```

`used` es **lo ya gastado**, nunca «cuántos caben». `period` viaja solo en los límites que se
reinician por mes. Ojo con uno que no viene de un plan: `limit: "free_organizations"` es el tope
anti-abuso de organizaciones gratuitas por usuario, y falla igual que los demás a propósito —
no tenéis que distinguirlo.

## 🆕 `error.code` es un enum cerrado, y los dos payloads de plan tienen esquema

`ErrorResponse.error.code` sale del contrato como enum de diez valores —`VALIDATION`,
`NOT_FOUND`, `CONFLICT`, `UNAUTHENTICATED`, `FORBIDDEN`, `ORGANIZATION_SUSPENDED`,
`FEATURE_NOT_AVAILABLE`, `LIMIT_EXCEEDED`, `RATE_LIMITED`, `INTERNAL`—, así que un `switch`
sobre él puede ser exhaustivo y el compilador avisa si aparece uno nuevo.

`LimitExceededDetails` y `FeatureNotAvailableDetails` se publican como **esquemas con nombre**:
la forma de `error.details` deja de adivinarse en los dos casos donde importa.

## 🆕 El catálogo de planes — `GET /api/v1/plans`

Los planes en venta, en orden de presentación (`sortOrder`). **No es tenant-scoped y pide
sesión**: la app vive detrás del login y los precios no se publican a quien encuentre la URL.
Devuelve solo los públicos y no archivados —hoy Free, Básico y Pro; Empresa existe pero **no
está a la venta**—, cada uno con el catálogo completo de features y topes resueltos: lo que
anuncia la tabla es exactamente lo que aplican los guards.

**Ojo con `price`: `null` significa «consultar», no gratis.** Free llega con
`{ amount: "0.00", currency: "COP" }`; Básico y Pro siguen sin precio fijado y llegan en `null`
hasta que se definan desde la consola. La pantalla tiene que saber pintar ese caso.

## 🆕 ¿Esta cuenta administra la plataforma? — `GET /api/v1/me/platform-access`

`{ isPlatformAdmin: boolean }`. Endpoint propio y no un campo de `/auth/me`, para no hacer que
`auth` —el módulo del que dependen todos— dependa de `platform`. Se llama **en paralelo con
`/auth/me`** al arrancar.

Es **orientativo, no autorización**: sirve para no ofrecer un menú que va a fallar. Cada
petición a `/admin/*` lo vuelve a comprobar contra la tabla, así que un cliente que se mienta a
sí mismo solo consigue un 403. Y ningún rol de organización da acceso: ser OWNER de la tuya no
te hace superadmin.

## 🆕 El contrato nombra el permiso de cada ruta (`x-required-permission`)

Las 62 rutas que mutan datos salen anotadas con el permiso que exigen, derivado del router real
—no escrito a mano—, así que no puede quedar desfasado:

```jsonc
"post": { "operationId": "…", "x-required-permission": "payments.create" }
```

Con eso y el array `permissions` de `/me/capabilities` se puede gatear la UI sin mantener una
tabla propia de qué pide cada botón.

Un cambio de fondo detrás de esto: **el backend ya no autoriza por nombre de rol**, sino por
permiso. El rol siguió siendo el mismo paquete de siempre (`OWNER · ADMIN · ACCOUNTANT ·
OPERATOR · VIEWER`) y nada cambia hoy para el usuario, pero si en el front hay algún
`if (role === 'ACCOUNTANT')` conviene cambiarlo por el permiso: el día que existan roles
personalizados, el rol dejará de predecir lo que alguien puede hacer.

## 🆕 Consola de plataforma en `/api/v1/admin/*`

Superficie de **superadmin de plataforma**, no de organización: vive fuera del tenant y detrás
de su propio guard. No es un rol nuevo en el enum — meterlo ahí habría convertido la gestión de
miembros en una escalada de privilegios. El primer superadmin se da de alta por script.

| Ruta | Qué hace |
| --- | --- |
| `GET /admin/organizations` | Lista con su plan y su consumo |
| `GET /admin/organizations/:orgId` | Detalle, con entitlements y overrides negociados |
| `PUT /admin/organizations/:orgId/plan` | Mueve la organización de plan |
| `PUT /admin/organizations/:orgId/overrides` | Negocia features o topes para un cliente |
| `PUT /admin/organizations/:orgId/status` | Suspende o reactiva |
| `GET /admin/plans` · `PUT /admin/plans/:code` | Lista y guarda planes |

Los hooks ya están generados (`src/api/generated/endpoints/platform-admin/`) y la consola va
**en esta misma app, como ruta protegida** — se ofrece o no según `/me/platform-access`. Un
detalle al construirla: editar un plan **no cambia nada para nadie** hasta que se recalcula
explícitamente (`applyToExisting`) — es a propósito, permite subir un tope solo para quien entre
desde ahora sin tocar a los clientes actuales.

## 🆕 Idempotencia en todas las mutaciones de dinero — regenera con `pnpm api:gen`

Salió de una auditoría del backend. `POST /payments` y `POST /disbursements` ya aceptaban
`Idempotency-Key`; **ocho rutas más que también mueven dinero no lo hacían**, y un doble clic
o un reintento las duplicaba:

- `POST /financial-accounts/transfers`
- `POST /payments/:id/allocations` · `POST /payments/:id/reverse`
- `POST /disbursements/:id/allocations` · `POST /disbursements/:id/reverse`
- `POST /receivables/:id/adjustments` · `POST /receivables/:id/waivers`
- `POST /receivables/accrue-interest`

**No hay que cambiar nada para que sigan funcionando.** La cabecera es opcional: sin ella el
comportamiento es exactamente el de hoy. Lo que cambia es que ahora *se puede* mandar, y el
contrato lo declara (más un `409` cuando la misma clave llega con un cuerpo distinto).

Cómo mandarla, ya que orval no la pone en la firma —es un parámetro de cabecera opcional—
pero `customFetch` respeta las de `request`:

```ts
const transfer = usePostApiV1OrganizationsOrgIdFinancialAccountsTransfers({
  request: { headers: { 'idempotency-key': crypto.randomUUID() } },
})
```

La clave se genera **una vez por intento del usuario**, no por reintento: esa es justo la
gracia — reenviar la misma clave devuelve la respuesta original en vez de mover el dinero otra
vez. Vale la pena al menos en transferencias y reversas, que son las que más duelen duplicadas.

## 🆕 Cómo está cada cuenta — regenera con `pnpm api:gen`

- **`GET /api/v1/organizations/:orgId/reports/accounts?from&to`** → por cuenta:
  `accountId`, `name`, `accountType`, `currency`, `isActive`, `balance`, `inflow`,
  `outflow` y `movements`. Cualquier miembro autenticado.
- **`balance` es de siempre; `inflow`/`outflow`/`movements` son del período.** «Qué hay» y
  «qué se movió» son preguntas distintas y la pantalla necesita las dos: un saldo recortado a
  la ventana no significaría nada.
- Una cuenta **sin movimientos en el período sigue apareciendo**, con ceros. Existe y no se
  movió: eso es información, no una fila que sobra.
- Ordena por saldo, la más llena primero. La ventana usa la zona horaria de la organización,
  como el resto de reportes.

Nace porque el front no podía responderlo sin mentir: el saldo solo estaba agregado por
moneda, y las entradas y salidas habrían salido de sumar el libro de movimientos desde la
página visible.

## 🆕 La onda de las notas de voz viaja con el mensaje — regenera con `pnpm api:gen`

Responde al `contract/HANDOFF-audio-historial.md`. Requiere `pnpm db:migrate` (migración **0014**).

- **`ChatMessage`** gana `waveform: number[] | null` y `audioSeconds: number | null`. Solo viajan
  en los mensajes dictados; en los de Numi y en los escritos son `null`, como pediste.
- **`POST /assistant/chat/audio`** acepta `waveform` (JSON, 1–64 números de 0 a 1) y
  `audioSeconds` (> 0 y ≤ 600, se redondea a un decimal) como campos de texto del multipart.
  Se toman **tal cual**, sin recalcular.
- **Un valor malformado se ignora y se guarda `null`. Nunca hace fallar la petición** — hay un
  test de integración que fija exactamente eso: mismo estado y mismo mensaje de error mande lo
  que mande el cliente. Ya podéis encender el envío sin miedo (de hecho, ya está encendido).
- La onda es **independiente del audio**: si se purga la grabación, la forma se queda y una nota
  larga se sigue leyendo como larga.

## 🆕 Buscador global en un solo endpoint — regenera con `pnpm api:gen`

Responde al `contract/HANDOFF-buscador.md`. Los tres puntos que pedía están, y también
el endpoint único del §4.

- **`GET /api/v1/organizations/:orgId/search?q=&limit=`** → `{ q, hits: SearchHit[] }`.
  Una llamada en vez de cinco. `limit` es **por tipo** (por defecto 3, máximo 10), así
  que una lista ruidosa no tapa a las demás, y vienen **ya ordenados por relevancia**:
  `score` 3 exacto · 2 prefijo · 1 parcial · 0 casó por referencia, notas o monto.
  Desempata por tipo (el contacto antes que sus papeles) y luego por fecha. Cualquier
  miembro autenticado.
- Cada `SearchHit` trae `type`, `id`, `title`, `subtitle`, `contactId`, `amount`,
  `currency`, `date`, `status` y `score`: una fila se pinta sin pedir nada más.
- Los hits de contacto llevan además un bloque `contact` con `contactType`,
  `documentLabel`, `email`, `phone`, `isActive` y un `summary` con
  `receivableBalance`, `receivableOverdue`, `openReceivables` y `lastPaymentAt`. Eso es
  el §3: la ficha ya responde «¿cuánto me debe?» sin abrir nada. Un contacto sin
  movimiento reporta ceros, no ausencia.

### §2 — las listas de dinero ya traen el nombre

`receivables` y `expenses` incorporan `payerName` / `supplierName` a `ReceivableBalance`
y `ExpenseBalance`. `payments` y `disbursements` estrenan `PaymentListItem` y
`DisbursementListItem` (el mismo objeto de siempre + `payerName` / `supplierName`,
nullable porque el pago puede no tener contraparte). **El directorio de 100 contactos
sobra**, y con él el bug de la fila sin nombre cuando la organización pasa de 100.

Ojo: el cambio es solo en las **listas**. `POST` y el detalle siguen devolviendo
`Payment` / `Disbursement` sin nombre, que no lo necesitan.

### §1 — qué busca `q`

Ya buscaba por nombre de la contraparte en las cuatro listas (era la parte que
preocupaba). Se le añadió:

- **Monto exacto** cuando el término son solo dígitos: `180000` encuentra las cuentas de
  $180.000. En cartera y cuentas por pagar mira el importe original y el saldo; en pagos
  y egresos, el monto.
- **Notas** en cartera y cuentas por pagar (referencia y notas ya funcionaban en pagos y
  egresos).
- Y un arreglo: buscar **el nombre completo** (`Marilyn Bazán`) no encontraba al
  contacto, porque `/contacts` comparaba campo por campo y el nombre completo no es ni el
  nombre ni el apellido. Encontraba sus cuotas pero no a ella.

## 🆕 Mensajes de voz de Numi (audio → texto) — regenera con `pnpm api:gen`

Numi ya acepta **audios**. El backend los transcribe con un modelo de voz que se configura **por organización igual que el LLM** (BYOK, aparte del de chat) y el texto entra al **mismo flujo de chat de siempre**: mismas herramientas, mismos permisos por rol, mismo historial. Requiere que el backend haya corrido `pnpm db:migrate` (migración **0012**).

### Endpoints de audio (cualquier miembro)

Ambos son **`multipart/form-data`** con el archivo en el campo **`audio`** y aceptan un campo opcional `language` (ISO-639-1, p. ej. `es`). Como cualquier mutación, requieren `x-csrf-token`.

- `POST /api/v1/organizations/:orgId/assistant/transcribe` → `{ text, language, durationSeconds }`. **Solo transcribe.** Úsalo si quieres mostrar el texto para que el usuario lo **corrija antes de enviarlo** por el `/assistant/chat` normal.
- `POST /api/v1/organizations/:orgId/assistant/chat/audio` → `{ sessionId, transcript, reply }`. **Transcribe y responde en una sola llamada** (estilo WhatsApp). Acepta además `sessionId` para continuar una conversación.

> Recomendación: para operaciones de **escritura** conviene el flujo de dos pasos (transcribir → dejar corregir → enviar). Una transcripción equivocada que se ejecuta sin revisión cuesta deshacerla. Numi igual pide confirmación explícita antes de escribir.

### Historial: los mensajes dictados vienen marcados

`GET /assistant/conversations/:id/messages` ahora devuelve **`source`** en cada mensaje: `"text"` | `"audio"`, y **`hasAudio`**, que dice si el audio original sigue guardado.

- `source: "audio"` con `hasAudio: false` → solo queda la transcripción. El front pinta el ícono de micrófono en la burbuja.
- `source: "audio"` con `hasAudio: true` → el audio se puede reproducir: `GET /assistant/conversations/:id/messages/:messageId/audio` devuelve `{ url }`, una URL **firmada y temporal**. El front la pide al pulsar play (no al cargar el hilo, que serían N firmas para audios que nadie escucha) y la reutiliza unos minutos; si caduca, vuelve a pedirla.

> Esta línea decía «el audio no se almacena». Dejó de ser cierto cuando el contrato incorporó `hasAudio` y el endpoint de reproducción; queda corregida. **Cableado en el front** (§32.1 de `context.md`).

**Cerrado.** La onda (`waveform`) y la duración (`audioSeconds`) ya viajan con cada nota de voz — ver «La onda de las notas de voz viaja con el mensaje» arriba. El front las calcula al grabar, las manda y las dibuja sin descargar el audio.

### Configuración del modelo de voz (OWNER/ADMIN)

`GET /assistant/settings` ahora trae un bloque **`voice`** además de la config de chat que ya conocías:

```
{
  activeProvider, providers[], catalog[],        // chat (sin cambios)
  voice: { activeProvider, providers[], catalog[] }  // transcripción (NUEVO)
}
```

- `voice.catalog`: `[{ provider, label, suggestedModels[] }]` — **`deepgram`** (`nova-3`, `nova-2`) y **`elevenlabs`** (`scribe_v1`, `scribe_v2`). Igual que en chat, `model` es **texto libre**; los sugeridos son solo para el dropdown.
- `voice.providers`: los configurados, enmascarados (`{ provider, model, apiKeyLast4, isActive, ... }`). La API key **nunca se devuelve**.
- `PUT /api/v1/organizations/:orgId/assistant/voice/providers/:provider` — body `{ model, apiKey, activate? }`.
- `POST /api/v1/organizations/:orgId/assistant/voice/providers/:provider/activate`
- `DELETE /api/v1/organizations/:orgId/assistant/voice/providers/:provider` (204)
- `:provider` ∈ `deepgram | elevenlabs`. **El proveedor de voz es independiente del de chat**: cada uno tiene su propio activo, y configurar uno no toca al otro.

### Qué hay que construir en el front

- **Grabador:** `MediaRecorder` produce `audio/webm` (Chrome/Edge/Android) o `audio/ogg` (Firefox); Safari graba en `audio/mp4`. Los tres están soportados — manda el `Blob` tal cual en el campo `audio`, sin convertir.
- **Ajustes:** en la pantalla "Asistente / IA", una segunda sección "Voz" con las mismas tarjetas que ya usas para el chat, alimentada por `voice.catalog` / `voice.providers`.
- **Errores esperados (422, con mensaje en español listo para mostrar):** formato no soportado, archivo vacío, **sin voz detectada** (silencio), audio demasiado largo (>4000 caracteres transcritos), supera 20 MB, y "los mensajes de voz no están configurados" si el admin no eligió proveedor.
- **429:** el endpoint de voz tiene su **propio limitador, más estricto** que el del chat de texto (10/min por IP por defecto), porque cada audio cuesta una transcripción **más** un turno de LLM.


## 💬 Chat de Numi (asistente) — consulta y registra

Numi (el asistente) responde, **consulta datos** y ahora **registra operaciones** por chat. **El contrato del endpoint no cambia** (mismo body/respuesta que antes): no hace falta `pnpm api:gen` por esta fase; es comportamiento nuevo detrás del mismo endpoint.

- `POST /api/v1/organizations/:orgId/assistant/chat` — body `{ message, sessionId? }` → `{ sessionId, reply }`. **Cualquier miembro**; requiere `x-csrf-token`. Guarda el `sessionId` y reenvíalo para continuar la conversación (memoria de ~3 turnos, server-side en Redis).
- Requiere que un admin haya configurado un **proveedor de IA activo** (ver sección BYOK abajo). Si no hay, responde con un mensaje claro pidiendo configurarlo.
- **Consultar:** buscar contactos; listar cuentas/métodos/conceptos/categorías/sedes; **cartera y cuentas por pagar** ítem por ítem; y reportes (flujo de caja, mensual, cartera/pagos, antigüedad, próximos a vencer, top deudores, ingresos por concepto, egresos por categoría).
- **Registrar (NUEVO):** crear contacto, registrar ingreso/pago (abono a cartera, venta/ingreso directo, anticipo), registrar egreso (a cuenta por pagar o gasto directo), crear contrato de cobro recurrente, crear gasto recurrente y transferir entre cuentas.
- **Confirmación:** toda operación de escritura es **conversacional en dos pasos** — Numi muestra un resumen (qué, cuánto, a quién, en qué cuenta) y **solo ejecuta tras un "sí" explícito** del usuario. Nada se aplica sin confirmación.
- **Permisos por rol:** las acciones se limitan al rol de quien escribe, igual que en la API. Crear contacto / registrar ingreso / registrar egreso → OWNER/ADMIN/ACCOUNTANT/OPERATOR. Crear contratos, gastos recurrentes y transferencias → OWNER/ADMIN/ACCOUNTANT. VIEWER solo consulta.
- **UX sugerida:** panel de chat que muestra `reply` y persiste `sessionId`; como Numi ya escribe, refresca las vistas afectadas (cartera, pagos, saldos, contactos) al terminar una conversación con registros, o invalida sus queries de TanStack Query.

## 🆕 Reportes de egresos con nombre + Numi más informativo (regenera con `pnpm api:gen`)

- **Nuevos endpoints de reportes** (simetría con cartera):
  - `GET /api/v1/organizations/:orgId/reports/top-creditors?limit=` → `[{ supplierContactId, displayName, overdueBalance, overdueCount }]` — a quién le debes más (proveedores por saldo vencido).
  - `GET /api/v1/organizations/:orgId/reports/upcoming-payables?days=&limit=` → `[{ expenseId, supplierContactId, displayName, dueDate, balance, displayStatus }]` — cuentas por pagar próximas a vencer, con nombre. Ventana en la zona horaria de la organización.
- **Numi responde más completo:** las consultas de cartera/pagar ahora incluyen el **nombre** del pagador/proveedor (antes solo montos), y `get_report` soporta además `top_creditors` y `upcoming_payables`. Sin cambios en el endpoint del chat.

## 🆕 Base de conocimiento / soporte (RAG) — Numi responde "cómo funciona la plataforma"

Numi gana soporte: responde dudas de cómo usar Nummo desde una base de conocimiento (curada, en español) guardada como vectores (Postgres + pgvector, embeddings Voyage). Regenera con `pnpm api:gen`.

- **Nuevo endpoint:** `GET /api/v1/organizations/:orgId/knowledge/search?q=<texto>&limit=<n>` → `[{ title, heading, content, score }]` (más relevantes primero). **Cualquier miembro** autenticado. Útil si quieres un buscador de ayuda en el front además del chat.
- En el chat, Numi usa esto automáticamente (tool `search_knowledge`) para preguntas de plataforma/soporte y responde solo con lo recuperado; el endpoint del chat no cambia.
- Requiere configuración global en el backend (no BYOK): `VOYAGE_API_KEY` y una base con la extensión pgvector, más ingestar el corpus. Si no está configurado, el endpoint responde con un error claro ("La base de conocimiento no está configurada").

## 🆕 Historial de conversaciones de Numi (persistente + scroll infinito)

Numi ahora **guarda todas las conversaciones** (antes solo memoria efímera). El front puede listarlas y cargar mensajes con scroll estilo WhatsApp. Regenera con `pnpm api:gen`.

- `POST /api/v1/organizations/:orgId/assistant/chat` — sin cambios de shape; el `sessionId` que devuelve **es el id de la conversación** (guárdalo y reenvíalo para continuar; si expira la memoria, el backend rehidrata solo).
- `GET /api/v1/organizations/:orgId/assistant/conversations?limit=&cursor=` → `{ items: [{ id, title, messageCount, lastMessageAt, createdAt, updatedAt }], nextCursor }` — mis conversaciones, más recientes primero. Para la siguiente página, reenvía `nextCursor` como `cursor`.
- `GET /api/v1/organizations/:orgId/assistant/conversations/:id/messages?limit=&before=` → `{ items: [{ id, role, content, createdAt }], nextCursor }` — mensajes del **más nuevo al más antiguo**. Para **cargar más viejos al hacer scroll hacia arriba**, reenvía `nextCursor` como `before` (keyset, sin OFFSET). Solo el dueño de la conversación puede verla (si no, 404).
- **Privadas por usuario** y se **guardan siempre**. Requiere que el backend haya corrido `pnpm db:migrate` (migración 0011).
- **UX sugerida:** lista de chats (como WhatsApp) desde el primer endpoint; al abrir uno, cargar la última página de mensajes y, al hacer scroll arriba, pedir la siguiente con `before`. Invierte cada página para mostrar del más viejo (arriba) al más nuevo (abajo).

## 🔁 Paginación de listas (unificada)

Las listas del backend aceptan de forma consistente `q` (búsqueda), `sort` y `order`. Los valores válidos de `sort` dependen de cada lista (p. ej. receivables: `dueDate | balance | originalAmount`; los maestros: `name | createdAt`). Regenera el cliente para tomar los enums nuevos: `pnpm api:gen`.

## 🤖 Configuración del asistente IA (BYOK) — para construir la pantalla de ajustes

El dueño/administrador elige **proveedor + modelo + su API key** (BYOK). Endpoints nuevos, solo **OWNER/ADMIN** (regenera con `pnpm api:gen`). La API key **se guarda cifrada y NUNCA se devuelve** — solo `apiKeyLast4` (últimos 4 caracteres).

- `GET /api/v1/organizations/:orgId/assistant/settings` → `{ activeProvider, providers[], catalog[] }`
  - `catalog`: `[{ provider, label, suggestedModels[] }]` — los 4 proveedores (`anthropic`, `openai`, `google`, `deepseek`) con etiqueta y modelos sugeridos. **`model` es texto libre**; los sugeridos son solo para el dropdown.
  - `providers`: los configurados, enmascarados: `{ provider, model, apiKeyLast4, isActive, createdAt, updatedAt }`.
  - `activeProvider`: proveedor activo o `null`.
- `PUT /api/v1/organizations/:orgId/assistant/providers/:provider` — body `{ model, apiKey, activate? }`. Crea/actualiza la credencial. El **primer** proveedor configurado queda activo automáticamente; usa `activate: true` para cambiar el activo. Devuelve la credencial enmascarada.
- `POST /api/v1/organizations/:orgId/assistant/providers/:provider/activate` — marca ese proveedor como activo.
- `DELETE /api/v1/organizations/:orgId/assistant/providers/:provider` — elimina la credencial (204).
- `:provider` ∈ `anthropic | openai | google | deepseek`. Las mutaciones requieren `x-csrf-token`.

**UX sugerida:** pantalla "Asistente / IA" en Configuración → una tarjeta por proveedor (desde `catalog`) con su estado (configurado/activo), campo de modelo (con sugerencias) y campo de API key **write-only** (mostrar `•••• {last4}` si ya existe), más botones "Activar" y "Eliminar". Nota: el **chat aún no existe**; esto es solo la configuración para cuando se construya.

## 🆕 Verticalización: tiendas, finanzas personales y montos únicos

El sistema ya no sirve solo para colegios. Cambios nuevos — regenera el cliente con `pnpm api:gen`:

- **Tipo de organización** — `organizations.type` = `SCHOOL | SHOP | PERSONAL | GENERIC` (default `GENERIC`). `POST /organizations` y `PATCH /organizations/:orgId` aceptan `type`; el objeto `Organization` lo devuelve.
- **Plantillas de datos maestros** — `POST /api/v1/organizations/:orgId/apply-template` (OWNER/ADMIN, **idempotente**). Crea conceptos, categorías, métodos de pago y cuentas por defecto según el vertical. Body `{ "type"?: ... }` para forzar un vertical; si se omite, usa el `type` de la organización. Responde `{ billingConcepts, expenseCategories, paymentMethods, financialAccounts }` (cuántos creó; re-llamar devuelve ceros). **Flujo sugerido:** al crear la org el usuario elige el tipo → el front llama `apply-template` → ya hay datos para empezar a operar.
- **Gasto de negocio vs. personal** — `expense_categories.scope` = `BUSINESS | PERSONAL` (default `BUSINESS`). Create/Update lo aceptan; list/get lo devuelven. Sirve para separar "gastos del negocio" de los "gastos personales del dueño" (p. ej. un filtro o reporte por `scope`).
- **Ingresos y egresos ÚNICOS (no recurrentes)** — ya estaban soportados y funcionan para tiendas/personal:
  - **Venta / ingreso directo:** `POST /payments` con `purpose: "DIRECT_INCOME"` + `directBillingConceptId` (sin cuenta por cobrar; `payerContactId` opcional → cliente anónimo).
  - **Gasto / egreso directo:** `POST /disbursements` con `purpose: "DIRECT_EXPENSE"` + `directExpenseCategoryId` (sin cuenta por pagar; `supplierContactId` opcional).
  - Ambos entran en flujo de caja, saldos de cuenta, movimientos e `income-by-concept` / `expenses-by-category`.

## ✅ Completado: página de registro (`/register`)
El alta de cuentas es **registro público** (decidido). **Implementado en el front** (commit `4de5437`): pantalla `/register`, `AuthLayout` compartido con login, enlaces de ida y vuelta login↔registro, pista en el modal "Agregar miembro" y tests. Lo pedido, ya cubierto:

- ✅ `POST /api/v1/auth/register` — body `{ email, password, fullName }` (password **mín. 8**), con `x-csrf-token` automático. Devuelve **201** con el `User`.
- ✅ **No** inicia sesión automáticamente: tras el 201 redirige a **login** con el email precargado + toast.
- ✅ Recién registrado el usuario **no tiene organización** → no ve datos hasta que un **owner lo agregue** en "Agregar miembro" por su email (nota visible en la propia pantalla).
- ✅ Flujo completo: persona se registra en `/register` → le pasa su email al owner → el owner la agrega y le asigna rol.
- ✅ Enlace **"¿No tienes cuenta? Regístrate"** en el login y pista de registro en el modal "Agregar miembro".
- ✅ **Rate-limit** (429) manejado con mensaje amable (vía `getErrorMessage`).

## Aviso
El contrato `openapi.json` sigue en **v1.0.0** y hoy trae **103 paths / 127 operaciones**. Regenera tu cliente:

```bash
pnpm api:gen
```

(Apunta a `./contract/openapi.json` o, con el back corriendo, a `http://localhost:4010/openapi.json`.)

- **Back corriendo:** `http://localhost:4010` (en `nummo-api`: `pnpm dev` + `pnpm seed`; DB en Docker).
- **Login demo:** `demo@nummo.app` / `Demo1234!`
- **Docs interactivos:** `http://localhost:4010/docs` (Scalar).

## Handoffs disponibles (léelos por área)
`HANDOFF-fase-0..9.md` en esta carpeta. Resumen de lo que ya puedes construir:

| Área | Endpoints base | Handoff |
|---|---|---|
| Auth + sesión (cookie HttpOnly + CSRF) | `/auth/*` | 1 |
| Organizaciones, sedes, miembros, settings | `/organizations/*` | 1 |
| Contactos (+ relaciones) y maestros | `/contacts`, `/billing-concepts`, `/expense-categories`, `/payment-methods`, `/financial-accounts` | 2 |
| Cartera (cobros recurrentes) | `/billing-agreements`, `/receivables`, `/interest-policies` | 3 |
| Pagos (abono/anticipo/reversión, Idempotency-Key) | `/payments` | 4 |
| Mora automática (causar, condonar, accruals) | `/receivables/accrue-interest`, `/receivables/{id}/waivers`, `/receivables/{id}/accruals` | 5 |
| Gastos y egresos | `/expense-schedules`, `/expenses`, `/disbursements` | 6 |
| Caja: transferencias, saldos, movimientos | `/financial-accounts/balances`, `/financial-accounts/transfers`, `/financial-movements` | 7 |
| Reportes (dashboard) | `/reports/{cashflow,receivables-summary,payables-summary,top-debtors,upcoming-receivables,income-by-concept,expenses-by-category}` | 7 |
| Endurecimiento (ops) | `GET /health`, `GET /metrics` | 8 |

## Cambios importantes de Fase 8 para el front
- **Rate limit en login/register**: maneja **HTTP 429** (`{ error: { code: 'RATE_LIMITED' } }`) con mensaje amable/backoff.
- **413** si el body supera 1 MB.
- Recuerda: `x-csrf-token` en cada mutación y **re-pedir el token tras login/logout** (session-bound); cliente con `credentials: 'include'`; dinero como **string decimal**.

## Datos demo listos (tras `pnpm seed`)
Org "Jardín Infantil Demo" con: contactos + relación, cartera con **mora causada** y un **abono** (PARTIAL), un **gasto** con egreso parcial, una **transferencia** Caja→Banco, y saldos/movimientos/reportes cuadrando. Ideal para el dashboard.

## Qué falta (lado front — tu Fase 8)
Cuando termines las pantallas de negocio: **E2E Playwright** del flujo maestro (cliente → acuerdo → mensualidad → abono → mora → condonar; gasto recurrente → egreso; transferencia; y que el **dashboard cuadre** con los movimientos) + **QA responsive** 360/390/768/1024/1440 + **accesibilidad** (foco, labels, contraste).

## Sincronización a futuro
El contrato ya no cambiará salvo ajustes puntuales. Si el backend hace un cambio, se copiará `openapi.json` aquí y se actualizará este archivo — vuelve a correr `pnpm api:gen`.
