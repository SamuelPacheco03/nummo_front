# SYNC-STATUS — Backend → Frontend

**Fecha:** 2026-08-16 · **Estado del backend: V1 COMPLETO (Fases 0–8) + verticalización + config IA + chat Numi (A–D) + historial persistente + base de conocimiento + mensajes de voz.**

## 🆕 Mensajes de voz de Numi (audio → texto) — regenera con `pnpm api:gen`

Numi ya acepta **audios**. El backend los transcribe con un modelo de voz que se configura **por organización igual que el LLM** (BYOK, aparte del de chat) y el texto entra al **mismo flujo de chat de siempre**: mismas herramientas, mismos permisos por rol, mismo historial. Requiere que el backend haya corrido `pnpm db:migrate` (migración **0012**).

### Endpoints de audio (cualquier miembro)

Ambos son **`multipart/form-data`** con el archivo en el campo **`audio`** y aceptan un campo opcional `language` (ISO-639-1, p. ej. `es`). Como cualquier mutación, requieren `x-csrf-token`.

- `POST /api/v1/organizations/:orgId/assistant/transcribe` → `{ text, language, durationSeconds }`. **Solo transcribe.** Úsalo si quieres mostrar el texto para que el usuario lo **corrija antes de enviarlo** por el `/assistant/chat` normal.
- `POST /api/v1/organizations/:orgId/assistant/chat/audio` → `{ sessionId, transcript, reply }`. **Transcribe y responde en una sola llamada** (estilo WhatsApp). Acepta además `sessionId` para continuar una conversación.

> Recomendación: para operaciones de **escritura** conviene el flujo de dos pasos (transcribir → dejar corregir → enviar). Una transcripción equivocada que se ejecuta sin revisión cuesta deshacerla. Numi igual pide confirmación explícita antes de escribir.

### Historial: los mensajes dictados vienen marcados

`GET /assistant/conversations/:id/messages` ahora devuelve **`source`** en cada mensaje: `"text"` | `"audio"`. Úsalo para pintar un ícono de micrófono en la burbuja al recargar la conversación. El contenido guardado es la **transcripción** (el audio no se almacena).

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
El backend terminó todas sus fases. El contrato `openapi.json` está **congelado como v1.0.0** con **73 endpoints**. Regenera tu cliente:

```bash
pnpm api:gen
```

(Apunta a `./contract/openapi.json` o, con el back corriendo, a `http://localhost:4010/openapi.json`.)

- **Back corriendo:** `http://localhost:4010` (en `nummo-api`: `pnpm dev` + `pnpm seed`; DB en Docker).
- **Login demo:** `demo@nummo.app` / `Demo1234!`
- **Docs interactivos:** `http://localhost:4010/docs` (Scalar).

## Handoffs disponibles (léelos por área)
`HANDOFF-fase-0..8.md` en esta carpeta. Resumen de lo que ya puedes construir:

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
