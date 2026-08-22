<!--
  Copia literal de `HANDOFF-fase-12.md` del backend (nummo_api), commit 0dbc02c.

  La versión que vivía aquí antes —la de `df3277e`— tenía siete errores
  comprobados contra el contrato: decía que BYO Meta era «fase 5, no lo
  diseñes» cuando ya son tres rutas reales, daba el historial como si
  `entityId` fuera siempre una cuenta por cobrar, se dejaba el tercer
  selector de plantilla, contaba 153/205 rutas en vez de 160/226, daba el
  cupo de ENTERPRISE por ilimitado, listaba una variable de más en las
  plantillas y omitía los avisos de cupo, el `source` del consentimiento y
  la mora agrupada.

  Se sustituye por la del backend en vez de corregirla a mano: el documento
  de origen se mantiene contra el código, y dos copias del mismo texto se
  separan a la primera corrección que solo se haga en una.
-->

# Handoff — Fase 12 (cobranza por WhatsApp, para el front)

El backend puede cobrarle a los clientes de una organización por WhatsApp: recordatorios
automáticos antes y después del vencimiento, con plantillas aprobadas por Meta,
consentimiento, horas de silencio y cuota por plan.

**Al front nunca se le entregó esta superficie**: el último handoff suyo fue el de la
identidad visual de las maestras. Este documento cubre la cobranza entera —no solo lo
último— más las tres cosas que se ajustaron después de revisarla.

Regenera el cliente antes de nada: el contrato pasó a **160 paths**.

---

## 1. Lo que hay que entender antes de pintar nada

Tres conceptos, y confundirlos lleva a una interfaz que miente:

**Cobrar por WhatsApp** (`whatsapp_outbound`) es la feature de plan que enciende el ciclo
de cobranza. Sin ella no hay pantalla que mostrar.

**El número desde el que sale** puede ser el de Nummo o el del negocio. Con el de Nummo,
cada mensaje **consume cuota del plan** (`whatsapp_messages_monthly`). Con el propio
—feature `whatsapp_byo`— los paga el cliente directamente a Meta y **no consume nada**.

**La plantilla** es lo que Meta aprueba. Un mensaje solo sale si su plantilla está
aprobada; el backend expone `canSend` ya calculado por eso mismo, para que el front no
deduzca esa regla por su cuenta.

---

## 2. Los endpoints

Todos bajo `/api/v1/organizations/{orgId}`. La columna «feature» es lo que devuelve
`403 FEATURE_NOT_AVAILABLE` cuando el plan no la incluye.

### Política de cobranza

| Método | Ruta | Permiso | Feature |
| --- | --- | --- | --- |
| `GET` | `/messaging/collection-policy` | `messaging.read` | |
| `PUT` | `/messaging/collection-policy` | `messaging.settings.manage` | `whatsapp_outbound` |

`CollectionPolicy`: `enabled`, `quietStart`, `quietEnd`, `dueSoonTemplateKey`,
`overdueTemplateKey`, `overdueSummaryTemplateKey`, `updatedAt`.

Las horas de silencio son de la organización y en su zona horaria: fuera de esa ventana
no se le escribe a nadie. Es un requisito de decencia y de Meta, no una preferencia.

**Dos plantillas para la mora, y la pantalla tiene que explicar por qué.** Un deudor
recibe **un solo aviso** con todo lo que debe, no uno por factura. `overdueTemplateKey` es
la que sale cuando debe una sola; `overdueSummaryTemplateKey`, cuando debe varias. Están
separadas porque Meta no pluraliza y «tienes 1 facturas vencidas» saldría tal cual.

Dejar vacía la de resumen es válido: se cae a la singular con el total. No es un error que
haya que forzar a corregir, pero sí conviene decir en la UI qué implica —el aviso pierde el
conteo—, porque la de resumen es la que se quiere en el caso normal.

### Consentimiento

| Método | Ruta | Permiso |
| --- | --- | --- |
| `GET` | `/messaging/consents` | `messaging.read` |
| `PUT` | `/messaging/consents` | `messaging.settings.manage` |

Quién aceptó recibir mensajes y quién dijo que no. **Se comprueba al encolar**, no al
enviar: si alguien se da de baja el lunes, lo que ya estaba en cola sale igual, y el
backend puede responder «quién autorizó esto y cuándo» sin decir «no sé».

### Historial de mensajes

| Método | Ruta | Permiso |
| --- | --- | --- |
| `GET` | `/messaging/messages` | `messaging.read` |

Lo que salió y lo que no, con su motivo. **Aquí aparece `quota_exceeded`**, que es cómo
se ve un recordatorio que no salió por falta de cupo.

**`entityType` viene mixto, a propósito.** Los avisos de mora nuevos apuntan al contacto
(`'contact'`) porque el mensaje ya no habla de una sola factura; los anteriores a la
agrupación siguen apuntando a `'receivable'`. La historia no se reescribe, así que el
enlace de cada fila depende de su `entityType` y hay que manejar los dos.

### Plantillas

| Método | Ruta | Permiso |
| --- | --- | --- |
| `GET` | `/whatsapp/templates` | `whatsapp.templates.read` |
| `POST` | `/whatsapp/templates` | `whatsapp.templates.manage` |
| `POST` | `/whatsapp/templates/sync` | `whatsapp.templates.manage` |
| `DELETE` | `/whatsapp/templates/{templateKey}` | `whatsapp.templates.manage` |

El listado incluye las de la plataforma —son las que la organización puede usar aunque no
sean suyas—. **Crear y borrar exige cuenta propia de Meta**: en la cuenta compartida, una
organización podría agotarle a las demás el cupo de creación o dejar un nombre bloqueado
30 días.

Usa `canSend` del propio recurso para decidir si una plantilla se puede elegir. No lo
deduzcas del `status`.

### Cuenta propia de Meta — **nuevo**

| Método | Ruta | Permiso | Feature |
| --- | --- | --- | --- |
| `GET` | `/whatsapp/account` | `whatsapp.settings.read` | `whatsapp_byo` |
| `PUT` | `/whatsapp/account` | `whatsapp.settings.manage` | `whatsapp_byo` |
| `DELETE` | `/whatsapp/account` | `whatsapp.settings.manage` | `whatsapp_byo` |

`WhatsAppAccountState`: `{ connected, account }`. Cuando `connected: false`, la
organización envía por la cuenta de Nummo y consume cuota.

`WhatsAppAccount`: `phoneNumberId`, `phoneNumberLabel`, `accessTokenLast4`, `wabaId`,
`hasAppSecret`, `updatedAt`.

**El token nunca vuelve.** Solo sus últimos cuatro caracteres, que sirven para reconocer
cuál está puesto y no para escribirle a nadie. Lo mismo con el `appSecret`: solo
`hasAppSecret`. Si la pantalla necesita mostrar el token completo, la respuesta es que no
se puede — hay que volver a pedirlo.

Dos errores propios que conviene manejar:

- **`409 CONFLICT`** al conectar un número que ya reclamó otra organización. El número es
  único en todo Nummo, porque es lo que identifica de quién es un webhook entrante.
- **`404 NOT_FOUND`** al desconectar cuando no había cuenta propia.

Y díselo al usuario al desconectar: **no apaga la cobranza**, la devuelve a la cuenta de
Nummo — y con ella vuelve a consumir cuota del plan.

---

## 3. Notificaciones: dos tipos nuevos y una categoría nueva

`whatsapp_quota.warning` (al 80%) y `whatsapp_quota.exhausted` (al agotarse). Ambos con
`used` y `max` en el payload, y `deepLink` a `/configuracion/plan`.

No le llegan a todo el mundo: solo a quien tiene `messaging.settings.manage`, que es
quien puede hacer algo al respecto —subir de plan o conectar cuenta propia—. `exhausted`
va con prioridad `HIGH` y `warning` con `NORMAL`; ambas por in-app y push.

Van en la categoría **`ACCOUNT`**, que es nueva. Es aditiva al enum, así que un cliente
que no la conozca no se rompe — pero si la pantalla de preferencias agrupa por categoría,
hay que añadir su sección o quedarán tipos sin agrupar.

`ACCOUNT` existe por una razón concreta que conviene respetar en la UI: bajo
`RECEIVABLES`, **quien silenciara los avisos de cobranza se perdería justo el que dice que
la cobranza va a parar**.

---

## 4. Lo que se ajustó al revisar, y afecta al front

**`whatsapp_byo` estaba anunciada y no existía.** La página pública decía «conecta la
cuenta de Meta de tu negocio» y no había endpoint. Ahora sí lo hay. Si la landing ya
mostraba esa línea, a partir de ahora es verdad.

**Cuatro permisos del catálogo no los exigía nadie.** Salían igual en
`/me/capabilities`, así que el front podía pintar un botón con ellos y no protegían nada.
Dos eran los de la cuenta propia y ya están en uso; los otros dos siguen declarados por
delante de su superficie:

- `messaging.send` — **no hay envío manual**. No pintes un botón «enviar mensaje»: todo lo
  que sale lo encola el job de cobranza.
- `subscription.read` — el plan se lee dentro de `me/capabilities`, no por un endpoint.

**El cupo ahora avisa.** Antes se agotaba en silencio.

---

## 5. Los cuatro estados que la pantalla tiene que saber contar

Es lo que más fácil se hace mal, porque son cuatro cosas distintas que se parecen:

| Situación | Cómo se ve | Qué decirle al usuario |
| --- | --- | --- |
| El plan no incluye cobranza | `403` `FEATURE_NOT_AVAILABLE`, `details.feature` | «Está en el plan X» |
| Sin permiso | `403` `FORBIDDEN` | No ofrecer la pantalla |
| Cupo agotado | mensajes con `quota_exceeded` + notificación | «No saldrán hasta el próximo periodo» |
| Sin cuenta ni plantillas | `connected: false`, `canSend: false` | Guiar al alta, no mostrar error |

El tercero es el importante: **un recordatorio que no salió no es un error**, es un
`SKIPPED` con su motivo. Si la interfaz lo pinta como fallo, el usuario intentará
reintentarlo y no hay nada que reintentar hasta el mes que viene.

---

## 6. El consumo, para pintar la barra

`GET /organizations/{orgId}/me/capabilities` trae `limits.whatsapp_messages_monthly` y
`usage.whatsapp_messages_monthly`, más `period` (el mes **en la zona horaria de la
organización**, que no tiene por qué ser la del navegador).

Un límite en `null` es «sin tope». Con cuenta propia conectada, el consumo deja de subir:
esos mensajes no pasan por la cuota.

---

## 7. Lo que el backend no hace, y no conviene prometer en la UI

- **No hay recargas de cupo.** Agotado es agotado hasta el próximo periodo. Los paquetes
  necesitan pasarela de pago, que no existe.
- **No hay envío manual.** No hay «escríbele a este cliente ahora».
- **No hay conversación entrante.** El webhook recibe estados de entrega y bajas; no hay
  bandeja de respuestas.
