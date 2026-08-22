# HANDOFF — WhatsApp: cobranza al deudor, plantillas y cuenta propia

> **Contrato:** `contract/openapi.json` — **160 rutas, 226 esquemas**. Regenerá el cliente
> con `pnpm api:gen` antes de empezar.
>
> **Estado del backend:** en `main`, verificado de punta a punta contra la WhatsApp Cloud
> API real: un vencido encolado por el escaneo, despachado por el worker y **entregado en
> el teléfono del deudor**.
>
> Todo lo de este documento está comprobado contra el código, no contra el recuerdo de
> quien lo escribió. Si algo no cuadra con `openapi.json`, manda el contrato.

## Qué hace esta función

La organización configura una política y Nummo le escribe **al deudor** por WhatsApp
cuando su cuenta está por vencer o ya está en mora. El deudor **no tiene cuenta en Nummo**:
es un contacto con un teléfono.

Eso explica casi todo el diseño. No hay preferencias de usuario ni centro de
notificaciones aquí: hay una dirección, un consentimiento y una cola.

---

## 1. Política de cobranza — la pantalla principal

`GET` / `PUT /organizations/{orgId}/messaging/collection-policy`

| Campo                       | Tipo             | Qué es                                      |
| --------------------------- | ---------------- | ------------------------------------------- |
| `enabled`                   | `boolean`        | El interruptor maestro                      |
| `quietStart`                | `"HH:mm"`        | Desde cuándo no se molesta                  |
| `quietEnd`                  | `"HH:mm"`        | Hasta cuándo                                |
| `dueSoonTemplateKey`        | `string \| null` | Aviso «por vencer»                          |
| `overdueTemplateKey`        | `string \| null` | Aviso de mora de **una** factura            |
| `overdueSummaryTemplateKey` | `string \| null` | Aviso de mora de **varias** facturas        |
| `updatedAt`                 | `string \| null` | `null` = nadie la ha tocado nunca           |

**Son tres selectores de plantilla, no dos.**

### El formato de las horas

`"HH:mm"` en las dos direcciones, y el contrato lo declara con el patrón
`^([01]\d|2[0-3]):[0-5]\d$` tanto al leer como al escribir. Va directo a un
`<input type="time">` y vuelve tal cual.

*(Hasta el 21 de agosto la lectura devolvía `"22:00:00"` y reenviarlo daba 422. Está
arreglado; si tu `openapi.json` es anterior, actualizalo.)*

### Reglas del backend que la pantalla tiene que reflejar

- **Las horas de silencio aplazan, no cancelan.** Un aviso que cae a las 23:00 sale a la
  mañana siguiente. No lo presentes como «no se enviará».
- **La ventana cruza la medianoche** (`22:00` → `07:00`) y ese es el caso normal. Un
  selector que asuma `inicio < fin` está mal.
- **Sin plantilla no hay aviso.** Si `overdueTemplateKey` es `null`, los vencidos no se
  avisan aunque `enabled` sea `true`. Merece un estado visible, no un campo vacío.
- **`overdueSummaryTemplateKey` es opcional y degrada bien**: si está en `null`, a un
  deudor con varias facturas se le manda la plantilla singular con el total agregado. No
  miente —su texto dice «tu saldo», no «tu factura»— y es preferible a no escribirle.
- El **cuándo** de los avisos «por vencer» no se configura aquí: sale de
  `dueReminderDays` de los ajustes de la organización (por defecto `[3, 1]`), que ya rige
  los avisos internos. Una sola cosa que configurar; no dupliques el control.

**Guardas:** `GET` → `messaging.read`. `PUT` → `messaging.settings.manage` **y** la feature
`whatsapp_outbound`.

---

## 2. Historial de mensajes — la pantalla de «¿por qué no le llegó?»

`GET /organizations/{orgId}/messaging/messages` — permiso `messaging.read`.
Parámetros: `page`, `pageSize` (máx. 100), `status`, `contactId`.

Campos de cada fila: `id`, `channel`, `address`, `contactId`, `purpose`, `templateKey`,
`status`, `skipReason`, `lastError`, `entityType`, `entityId`, `createdAt`, `sentAt`,
`deliveredAt`, `readAt`.

### `entityType` no es siempre lo mismo — esto rompe enlaces si se asume

| `entityType`   | `entityId` apunta a | Cuándo                              |
| -------------- | ------------------- | ----------------------------------- |
| `"receivable"` | Una cuenta por cobrar | Avisos «por vencer», y la mora de una sola factura |
| `"contact"`    | Un contacto         | El aviso de mora **agrupado**       |

El historial queda **mixto a propósito**: los avisos anteriores al agrupado siguen
apuntando a `receivable` y la historia no se reescribe. Ramificá por `entityType` antes de
construir el enlace; asumir «siempre una cuenta por cobrar» da un 404.

### Los estados no son una barra de progreso lineal

```
QUEUED → SENT → DELIVERED → READ     (salió bien)
QUEUED → SKIPPED                     (no se envió, a propósito, y hay motivo)
QUEUED → FAILED                      (se intentó y falló, y hay error)
```

`SKIPPED` **no es un error** y no va en rojo. Traducí `skipReason` a lenguaje humano — los
ocho valores que el backend produce hoy:

| `skipReason`             | Qué decirle al usuario                                            |
| ------------------------ | ----------------------------------------------------------------- |
| `consent_revoked`        | El destinatario pidió no recibir mensajes                         |
| `consent_required`       | Falta su consentimiento explícito (solo aplica a marketing)       |
| `template_unknown`       | La política nombra una plantilla que no existe                    |
| `template_not_approved`  | Meta todavía no la aprobó, o la pausó                             |
| `missing_parameters`     | A la plantilla le falta un dato que el escaneo no pudo armar      |
| `quota_exceeded`         | Se agotó el cupo del mes — ofrecé la pantalla del plan            |
| `channel_not_configured` | El canal no está montado en este despliegue                       |
| `no_whatsapp_account`    | La organización no tiene cuenta con la que enviar                 |

`deliveredAt` y `readAt` **solo se llenan si el webhook de Meta está dado de alta** en ese
entorno. Mientras no lo esté, todo se queda en `SENT`, y eso es correcto. La UI no debería
sugerir que el mensaje falló por quedarse ahí.

---

## 3. Consentimiento

`GET` (`messaging.read`) y `PUT` (`messaging.settings.manage`) en
`/organizations/{orgId}/messaging/consents`.

El `PUT` recibe `address`, `channel` (default `WHATSAPP`), `status`, `source` y
`contactId` opcional.

- **Estados:** `UNKNOWN`, `GRANTED`, `REVOKED`.
- **Origen (`source`):** `IMPORTED`, `CONTRACT`, `REPLY`, `MANUAL` (default `MANUAL`). Es
  la respuesta a «¿y esto quién lo autorizó?», así que muéstralo en el listado.

**`UNKNOWN` deja pasar la cobranza.** A un cliente al que se le factura no se le pide
permiso para cobrarle; Meta solo exige consentimiento explícito para marketing y estas
plantillas son `UTILITY`. La regla exacta del backend es:

```ts
if (status === 'REVOKED') return false;
return purpose === 'UTILITY' || status === 'GRANTED';
```

Así que `UNKNOWN` **no** es un estado pendiente que haya que resolver, y presentarlo como
advertencia sería mentir. Solo `REVOKED` bloquea, y se comprueba **al encolar**.

---

## 4. El interruptor por acuerdo

`PATCH /organizations/{orgId}/billing-agreements/{id}` acepta `collectionReminders`, y el
`GET` lo devuelve. Tri-estado: `INHERIT` | `ON` | `OFF`.

Tri-estado y no booleano, y ahí está la gracia: `INHERIT` —el default— delega en la
política de la organización, mientras que `ON` y `OFF` deciden sobre *ese* cobro. Con un
booleano no habría forma de distinguir «este cliente pidió silencio» de «nadie lo ha
decidido», y al cambiar la política de la empresa se arrastraría a quien pidió que no.

En la UI: control de tres opciones, no un switch. El default tiene que decir de qué está
heredando («Según la política de la organización: activada»).

Un detalle que importa para el agrupado: lo que un acuerdo silenció **queda fuera antes de
sumar**, así que no contamina el total del aviso de mora.

---

## 5. Plantillas

`GET /organizations/{orgId}/whatsapp/templates` (`whatsapp.templates.read`) devuelve **las
de la plataforma y las de la organización**, juntas. Las de la plataforma vienen con
`organizationId: null`.

Catálogo de la plataforma:

| `templateKey`           | Cuándo                       | Variables                                         |
| ----------------------- | ---------------------------- | ------------------------------------------------- |
| `cobro_por_vencer`      | Antes del vencimiento        | `nombre`, `empresa`, `monto`, `fecha`             |
| `cobro_vencido`         | En mora, **una** factura     | `nombre`, `empresa`, `monto`, `fecha`             |
| `cobro_vencido_resumen` | En mora, **varias** facturas | `nombre`, `empresa`, `cantidad`, `monto`, `fecha` |

Las dos primeras están **aprobadas por Meta**. La tercera es más nueva y puede no estar
sincronizada todavía en un entorno dado: **no la des por hecha, mirá su `status`**. Cada
fila trae además `canSend`, que es la respuesta directa a «¿se puede usar?».

`{{empresa}}` va en el texto porque con la cuenta de plataforma el mensaje sale del número
de Nummo: sin eso el deudor recibe a un desconocido pidiéndole dinero.

### Quien usa la cuenta de plataforma ve las plantillas pero no las toca

`POST` (crear) y `DELETE` piden `whatsapp.templates.manage` **y** una cuenta propia de
Meta. Con la de plataforma responden **409** con `details.reason = "PLATFORM_ACCOUNT"`.

Es deliberado: con la WABA compartida, una organización creando plantillas podría agotar
el cupo de 100 creaciones/hora de todas las demás. Así que para un cliente sin cuenta
propia esa pantalla es de **solo lectura, sin botón de crear** — y ve las de cobranza, su
texto y su estado, que es lo que necesita para entender qué se manda en su nombre.

`POST .../templates/sync` (`whatsapp.templates.manage`) contrasta el estado guardado con
lo que dice Meta ahora. Es el botón «actualizar estado».

---

## 6. Cuenta propia de Meta (BYO) — **esto ya existe**

| Ruta                                       | Permiso                    | Feature        |
| ------------------------------------------ | -------------------------- | -------------- |
| `GET /organizations/{orgId}/whatsapp/account`    | `whatsapp.settings.read`   | `whatsapp_byo` |
| `PUT /organizations/{orgId}/whatsapp/account`    | `whatsapp.settings.manage` | `whatsapp_byo` |
| `DELETE /organizations/{orgId}/whatsapp/account` | `whatsapp.settings.manage` | `whatsapp_byo` |

El `PUT` recibe `phoneNumberId`, `phoneNumberLabel`, `accessToken`, `wabaId`, `appSecret`.

El `GET` devuelve `{ connected, account }`, y `account` trae `phoneNumberId`,
`phoneNumberLabel`, **`accessTokenLast4`**, `wabaId`, **`hasAppSecret`**, `updatedAt`.

**Los secretos nunca vuelven.** Solo los cuatro últimos caracteres del token y un booleano
para el app secret. La UI tiene que estar diseñada para eso: no hay «editar el token», hay
«reemplazarlo», y el campo se muestra vacío con el `…last4` al lado como referencia.

Disponible desde **PRO**. En FREE y BASIC la feature está apagada → `FEATURE_NOT_AVAILABLE`.

---

## 7. Aviso de cupo — dos tipos nuevos en el centro de notificaciones

`whatsapp_quota.warning` (al cruzar el 80%) y `whatsapp_quota.exhausted` (al agotarse).

Categoría `ACCOUNT`, canales in-app + push, dirigidos a quien tenga
`messaging.settings.manage`. `exhausted` es de prioridad `HIGH`.

Existen porque quedarse sin cupo dejaba el recordatorio en `SKIPPED` y nadie lo miraba: en
cobranza ese es el peor fallo posible — el cliente cree que está cobrando y se entera
cuando el dinero no llega. **El aviso lleva los números y tiene que llevar a la pantalla
del plan**; uno que obliga a ir a buscarlos es uno que se pospone.

---

## Errores de plan

- **`FEATURE_NOT_AVAILABLE` (403)** — el plan no incluye la feature. Momento de ofrecer el
  upgrade, no un error.
- **`LIMIT_EXCEEDED` (409)** — se acabó el cupo del mes. Los `details` traen el tope, lo
  usado y el período.

Un plan que no alcanza **no es un 402**. Valores sembrados hoy:

| Plan       | `whatsapp_outbound` | `whatsapp_byo` | `whatsapp_messages_monthly` |
| ---------- | ------------------- | -------------- | --------------------------- |
| FREE       | ✗                   | ✗              | 0                           |
| BASIC      | ✓                   | ✗              | 200                         |
| PRO        | ✓                   | ✓              | 1 500                       |
| ENTERPRISE | ✓                   | ✓              | 10 000                      |

Ninguno es ilimitado.

---

## Lo que este canal NO tiene, a propósito

**No hay opt-out ni pie de «responde STOP» en las plantillas.** Es una decisión de producto
tomada, no un olvido: Nummo es el cobrador, y darle al deudor un botón para silenciar el
cobro vaciaría la función. Meta solo lo exige en `MARKETING` y estas son `UTILITY`. No
agregues ese texto ni un control equivalente.

## Lo que de verdad no existe todavía

- **Enviar un mensaje suelto a mano.** El permiso `messaging.send` está en el catálogo pero
  **ninguna ruta lo usa**. No hay endpoint. Verificado.
- **Hablar con Numi por WhatsApp** (fase 6).
- **WhatsApp como canal de las notificaciones internas del equipo** (fase 4). Es distinto
  de todo esto: aquel destinatario es un miembro con cuenta, éste es un deudor.

---

## Por dónde empezar

1. `pnpm api:gen`.
2. **Política de cobranza** — desbloquea todo lo demás: sin ella activada no hay mensajes
   que listar. Ojo con el formato de horas.
3. **Historial** — donde el usuario va a vivir cuando algo no llegue. Ramificá por
   `entityType`.
4. **Plantillas en solo lectura** — es lo que le da sentido a los selectores de la política.
5. Consentimiento, el tri-estado del acuerdo y los avisos de cupo.
6. **BYO Meta** al final: es la única pantalla que maneja secretos y la que menos gente ve.
