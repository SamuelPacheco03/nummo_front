# HANDOFF — Cobranza por WhatsApp (backend fases 0–3, en `main`)

> **Estado del backend:** hecho, mergeado a `main` y **verificado de punta a punta contra
> la WhatsApp Cloud API real**. Un vencido de 8 días → escaneo → cola → worker → Meta →
> entregado en el teléfono del deudor. 880 tests verdes.
>
> **Contrato:** `contract/openapi.json` actualizado (153 rutas, 205 esquemas). Regenerá el
> cliente con `pnpm api:gen` antes de empezar.

## Qué hace esta función, en una frase

La organización configura una política y Nummo le escribe **al deudor** por WhatsApp
cuando su cuenta está por vencer o ya está en mora. El deudor **no tiene cuenta en Nummo**:
es un contacto con teléfono.

Eso último es lo que explica casi todo el diseño. No hay preferencias de usuario ni centro
de notificaciones aquí; hay una dirección, un consentimiento y una cola.

## Las tres pantallas que hay que construir

### 1. Política de cobranza — la principal

`GET` / `PUT /organizations/{orgId}/messaging/collection-policy`

| Campo                | Tipo             | Qué es                                    |
| -------------------- | ---------------- | ----------------------------------------- |
| `enabled`            | `boolean`        | El interruptor maestro                    |
| `quietStart`         | `"HH:mm"`        | Desde cuándo no se molesta                |
| `quietEnd`           | `"HH:mm"`        | Hasta cuándo                              |
| `dueSoonTemplateKey` | `string \| null` | Plantilla del aviso «por vencer»          |
| `overdueTemplateKey` | `string \| null` | Plantilla del aviso «vencido»             |
| `updatedAt`          | `string \| null` | `null` = nadie la ha tocado nunca         |

Cosas que el diseño de la pantalla tiene que reflejar, porque son reglas del backend y no
detalles:

- **Las horas de silencio aplazan, no cancelan.** Un aviso que cae a las 23:00 sale a la
  mañana siguiente. No lo presentes como «no se enviará».
- **La ventana puede cruzar la medianoche** (`22:00` → `07:00`) y es el caso normal. Un
  selector que asuma `inicio < fin` está mal.
- **Sin plantilla no hay aviso.** Si `overdueTemplateKey` es `null`, los vencidos no se
  avisan aunque `enabled` sea `true`. Merece un estado visible, no un campo vacío.
- El **cuándo** de los avisos «por vencer» no se configura aquí: sale de
  `dueReminderDays`, que ya existe en los ajustes de la organización y ya rige los avisos
  internos. Una sola cosa que configurar; no dupliques el control.

**Guardas:** `GET` pide `messaging.read`; `PUT` pide `messaging.settings.manage` **y** la
feature `whatsapp_outbound`. Es la única ruta del lote con feature, así que es la que
puede responder `FEATURE_NOT_AVAILABLE` (403) — ver «Errores de plan» abajo.

### 2. Historial de mensajes — la pantalla de «¿por qué no le llegó?»

`GET /organizations/{orgId}/messaging/messages` — paginado (`page`, `pageSize` hasta 100),
filtrable por `status` y `contactId`. Permiso `messaging.read`.

Cada fila trae `status`, `templateKey`, `address`, `contactId`, `skipReason`, `lastError`,
`entityType`/`entityId` (apunta a la cuenta por cobrar) y las cuatro marcas de tiempo:
`createdAt`, `sentAt`, `deliveredAt`, `readAt`.

**Los estados no son una barra de progreso lineal.** Son dos caminos:

```
QUEUED → SENT → DELIVERED → READ        (salió bien)
QUEUED → SKIPPED                        (no se envió, y hay motivo)
QUEUED → FAILED                         (se intentó y falló, y hay error)
```

`SKIPPED` **no es un error** y no debe pintarse en rojo: es «no se envió, a propósito».
Esta es la tabla que el usuario va a leer, así que traducí `skipReason` a lenguaje humano:

| `skipReason`             | Qué decirle al usuario                                            |
| ------------------------ | ----------------------------------------------------------------- |
| `consent_revoked`        | El destinatario pidió no recibir mensajes                         |
| `consent_required`       | Falta su consentimiento explícito (solo aplica a marketing)       |
| `template_unknown`       | La política nombra una plantilla que no existe                    |
| `template_not_approved`  | Meta todavía no aprobó la plantilla, o la pausó                   |
| `missing_parameters`     | A la plantilla le falta un dato que el escaneo no pudo armar      |
| `quota_exceeded`         | Se agotó el cupo del mes — es un `LIMIT_EXCEEDED`, ofrecé el plan |
| `channel_not_configured` | El canal no está montado en este despliegue                       |
| `no_whatsapp_account`    | La organización no tiene cuenta con la que enviar                 |

`deliveredAt` y `readAt` **solo se llenan cuando el webhook de Meta está dado de alta**.
Mientras no lo esté, todo se queda en `SENT` — y eso es correcto, no un fallo. La UI no
debería sugerir que el mensaje falló por quedarse ahí.

### 3. Consentimiento

`GET` (permiso `messaging.read`) y `PUT` (`messaging.settings.manage`) en
`/organizations/{orgId}/messaging/consents`.

Tres estados: `UNKNOWN`, `GRANTED`, `REVOKED`. Y la regla que hay que entender antes de
diseñar la pantalla: **`UNKNOWN` deja pasar los mensajes de cobranza.** A un cliente al
que se le factura no se le pide permiso para cobrarle; Meta solo exige consentimiento
explícito para marketing, y estas plantillas son `UTILITY`. Así que `UNKNOWN` no es un
estado pendiente que haya que resolver, y presentarlo como una advertencia sería mentir.

`REVOKED` sí bloquea, y se comprueba **al encolar**, no al enviar.

## El interruptor por acuerdo

`PATCH /organizations/{orgId}/billing-agreements/{id}` gana el campo
`collectionReminders`, tri-estado: `INHERIT` | `ON` | `OFF`.

Tri-estado y no un booleano, y esa es toda la gracia: `INHERIT` —el default— delega en la
política de la organización, mientras que `ON` y `OFF` son decisiones sobre *ese* cobro.
Con un booleano no habría forma de distinguir «este cliente pidió silencio» de «nadie lo
ha decidido», y al cambiar la política de la empresa se arrastraría a quien había pedido
que no.

En la UI: un control de tres opciones, no un switch. El default tiene que decir de qué
está heredando («Según la política de la organización: activada»).

## Plantillas

`GET /organizations/{orgId}/whatsapp/templates` (`whatsapp.templates.read`) devuelve las
que la organización puede usar: **las de la plataforma y las suyas**.

Hay dos platform templates ya **aprobadas por Meta** y son las que la política nombra:

| `templateKey`      | Cuándo             | Variables                              |
| ------------------ | ------------------ | -------------------------------------- |
| `cobro_por_vencer` | Antes del vencimiento | `nombre`, `empresa`, `monto`, `fecha`, `dias` |
| `cobro_vencido`    | En mora            | `nombre`, `empresa`, `monto`, `fecha`, `dias` |

Los `status` posibles vienen del catálogo de Meta (`APPROVED`, `PENDING`, `REJECTED`,
`PAUSED`, `DISABLED`…). Solo con `APPROVED` se puede enviar.

`POST` (crear) y `DELETE` piden `whatsapp.templates.manage`, y **crear exige que la
organización tenga cuenta propia de Meta** — con la cuenta de plataforma una organización
podría agotar el cupo de 100 creaciones/hora de todas las demás. Eso llega en la fase 5
(BYO Meta), así que **por ahora el alta de plantillas propias no tiene a quién servirle**:
construí primero la lectura, y dejá el botón de crear para después.

`POST .../templates/sync` (`whatsapp.templates.manage`) contrasta el estado guardado
contra lo que dice Meta ahora. Es el botón «actualizar estado» de esa pantalla.

## Errores de plan, que aquí sí aparecen

- **`FEATURE_NOT_AVAILABLE` (403)** — el plan no incluye `whatsapp_outbound`. En FREE está
  apagada; BASIC y arriba la traen. Es el momento de ofrecer el upgrade, no un error.
- **`LIMIT_EXCEEDED` (409)** — se acabó el cupo mensual (`whatsapp_messages_monthly`: 200
  en BASIC, 1500 en PRO, ilimitado en ENTERPRISE). Los `details` traen el tope, lo usado y
  el período.

Los dos llevan `details` accionables. Un plan que no alcanza **no es un 402**.

## Lo que este canal NO tiene, a propósito

**No hay opt-out ni pie de «responde STOP» en las plantillas.** Es una decisión de
producto tomada y no un olvido: Nummo es el cobrador, y darle al deudor un botón para
silenciar el cobro vaciaría la función. Meta solo lo exige en `MARKETING`, y estas son
`UTILITY`. No agregues ese texto ni un control equivalente en la UI.

## Lo que todavía no existe (no lo diseñes)

- **Enviar un mensaje suelto a mano.** El permiso `messaging.send` existe en el catálogo
  pero **ninguna ruta lo usa todavía**. No hay endpoint.
- **Conectar la cuenta de Meta de la organización** (BYO) — fase 5.
- **Hablar con Numi por WhatsApp** — fase 6.
- **WhatsApp como canal de las notificaciones internas del equipo** — fase 4. Es distinto
  de esto: aquel destinatario es un miembro con cuenta, éste es un deudor.

## Por dónde empezar

1. `pnpm api:gen` — el cliente tipado sale solo del contrato nuevo.
2. **La pantalla de política** es la que desbloquea todo lo demás: sin ella activada, no
   hay mensajes que listar.
3. **El historial** después, que es donde el usuario va a vivir cuando algo no llegue.
4. Consentimiento y el tri-estado del acuerdo al final: son ajustes finos sobre algo que
   ya funciona.

Cualquier duda del contrato, `contract/openapi.json` manda — el backend lo genera desde
los routers reales y cada endpoint sale anotado con `x-required-permission`.
