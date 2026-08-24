<!--
  Copia literal de `HANDOFF-fase-12.md` del backend (nummo_api), commit 91c77ce.

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

Regenera el cliente antes de nada: el contrato pasó a **160 paths** (hoy va por **178**).

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
| `POST` | `/messaging/collection-reminders/run` | `messaging.send` | `whatsapp_outbound` |

`CollectionPolicy`: `enabled`, `quietStart`, `quietEnd`, `dueSoonTemplateKey`,
`overdueTemplateKey`, `overdueSummaryTemplateKey`, `sendDays`, `skipHolidays`, `updatedAt`.

Las horas de silencio son de la organización y en su zona horaria: fuera de esa ventana
no se le escribe a nadie. Es un requisito de decencia y de Meta, no una preferencia.

#### ROMPE — las formas de pago se fusionaron con las cuentas

`payment_instructions` **ya no existe**. Duplicaba `financial_accounts`: la misma cuenta
de Bancolombia había que teclearla dos veces —una para cuadrar la caja, otra para
publicársela al deudor— y las dos copias podían divergir hasta que alguien consignara al
número viejo. Lo que lo zanja es hacia dónde va el producto: cuando se le mande a Numi un
comprobante, registrar ese pago será atarlo a la cuenta donde entró.

**Qué desaparece del cliente generado:**

| Antes | Ahora |
| --- | --- |
| `GET/POST/PATCH/DELETE /payment-instructions` | Los endpoints de `/financial-accounts` de siempre |
| `usePaymentInstructions` | `useGetApiV1OrganizationsOrgIdFinancialAccounts` |
| `payment_instructions.read` | `financial_accounts.read` |
| `payment_instructions.manage` | `financial_accounts.publish` |
| `instruction.showInReminders` | `account.publishInReminders` |
| `instruction.preview` | `account.paymentPreview` |

**En `collection-policy-page.tsx`** (línea ~78) hay que cambiar el hook y el permiso; el
`sinFormasDePago` pasa a ser «ninguna cuenta con `publishInReminders`». Y en
`policy-fixture.ts`, añadir `paymentLink` — la respuesta lo trae siempre. La página
`payment-instructions-page.tsx` se convierte en la de cuentas, o se retira si ya hay una.

**La cuenta ahora lleva:**

```jsonc
{
  "accountType": "BANK",                    // o DIGITAL_WALLET, CASH, OTHER
  "paymentDetails": {                        // null en una caja
    "kind": "BANK",                          // BANK | WALLET, casa con accountType
    "bankName": "Bancolombia",
    "accountKind": "SAVINGS",
    "accountNumber": "123-456789-00",
    "holderName": "Distribuidora El Sol",
    "holderDocument": "NIT 900123456",
    "transferKeyKind": "PHONE",              // la llave va aquí, no en otra fila
    "transferKeyValue": "3105948908"
  },
  "paymentPreview": "Bancolombia ahorros 123-456789-00 a nombre de …",
  "publishInReminders": false,               // ← apagado por defecto
  "sortOrder": 0
}
```

Tres cosas que cambian cómo se pinta:

1. **Publicar viene apagado.** Crear una cuenta ya no la publica: son dos decisiones, y la
   segunda hay que pedirla explícitamente. Una caja chica no debe salir en los mensajes a
   los deudores porque alguien la creó.
2. **`paymentPreview` es el renglón exacto** que verá el deudor. Píntalo tal cual en la
   vista previa; si la armas por tu cuenta, las dos acabarán diciendo cosas distintas.
3. **Tocar `paymentDetails` o `publishInReminders` pide `financial_accounts.publish`**, un
   permiso más que el de crear cuentas. Solo en esas peticiones. Si el usuario no lo
   tiene, esos dos controles van deshabilitados aunque pueda editar la cuenta — decide a
   qué número consignan los clientes, y el deudor no puede notar un cambio.

**La llave dejó de ser un destino aparte.** Es un alias *a* una cuenta bancaria, así que
son dos campos de la cuenta. Ya no hay `kind: 'TRANSFER_KEY'`.

**El enlace de pago tampoco es una cuenta** —el dinero no vive en una URL—: es
`paymentLink` en la política de cobranza, uno solo, `https` obligatorio.

#### ROMPE — «billetera digital» no es un método de pago

`METHOD_TYPES` pasa de cinco a cuatro: `CASH`, `BANK_TRANSFER`, `CARD`, `OTHER`. Pagar
desde un Nequi es una transferencia; la billetera es *dónde está* la plata —eso sigue
siendo un tipo de **cuenta**— y no *cómo se movió*. Si el selector de métodos lo lista a
mano, quítalo; los métodos ya creados con ese tipo se reclasificaron a `BANK_TRANSFER`.

#### ROMPE — el horario ya no se configura, lo pone la ley

La **Ley 2300 de 2023, art. 3** fija el horario de cobranza en Colombia y obliga a todo el
que adelante gestiones de cobro. No es una preferencia de la organización, así que dejó de
ser editable:

| Día | Franja |
| --- | --- |
| Lunes a viernes | 07:00 – 19:00 |
| Sábado | 08:00 – 15:00 |
| Domingo y festivos | **Ningún contacto** |

**`quietStart`, `quietEnd`, `sendDays` y `skipHolidays` ya no se pueden mandar en el PUT.**
Responden **422** con `details.reason = "SCHEDULE_FIXED_BY_LAW"`, `details.reference` con la
norma y `details.fields` con los campos rechazados. Ni para ampliar ni para **recortar**:
que un cliente quiera ser más estricto tampoco se acepta, porque «no configurable» tiene
que valer en las dos direcciones.

Si tu formulario los sigue mandando, el guardado entero falla. Los campos siguen en la
respuesta del GET —son la preferencia, que solo manda en países sin horario legal— pero
en Colombia no deciden nada.

Lo que hay que pintar viene resuelto en **`schedule`**:

```jsonc
"schedule": {
  "editable": false,
  "legalReference": "Ley 2300 de 2023, art. 3",
  "week": {
    "1": { "start": "07:00", "end": "19:00" },   // … 2..5 igual
    "6": { "start": "08:00", "end": "15:00" },
    "7": null                                     // domingo: no se contacta
  },
  "excludesHolidays": true,
  "maxRemindersPerReceivable": 3,
  "sendableRange": { "earliest": "08:00", "latest": "14:59" }
}
```

Con `editable: false`, la pantalla enseña la semana como **información** —no como
controles— y cita `legalReference`. Es mejor mostrarla que esconderla: explica por qué un
recordatorio no salió el domingo.

Los festivos se calculan del `locale`, no se listan: no hay endpoint de calendario ni nada
que configurar. Hoy solo hay calendario de Colombia.

#### ROMPE — tres recordatorios por cuenta por cobrar, y ni uno más

Esto sustituye al tope de «dos por semana» que estuvo un rato en el contrato. **Bórralo de
la cabeza**: ya no hay contador ni ventana deslizante.

Cada cuenta por cobrar pasa como mucho por tres etapas, **una sola vez cada una en toda su
vida**. Son tres campos nuevos y editables:

| Etapa | Cuándo | Campo | Cómo se apaga |
| --- | --- | --- | --- |
| Antes | N días antes del vencimiento | `daysBefore` (1–90) | `null` |
| El día | El día que vence | `remindOnDueDate` | `false` |
| Vencida | M días después | `daysAfter` (0–90) | `null` |

**Se configura el cuándo, nunca el cuántos.** No hay campo para pedir un cuarto aviso, y no
lo va a haber: no es un número que el backend comprueba, es que no existen más etapas.
`schedule.maxRemindersPerReceivable` viene en la respuesta y siempre vale `3` — úsalo para
el texto en vez de escribirlo a mano.

**El cambio que hay que explicar en pantalla:** antes el aviso de mora salía **cada día**
mientras la deuda existiera. Ahora sale **una vez y nunca más**. Si el cliente no paga,
Nummo se calla sobre esa cuenta. Es deliberado —la idea es recordar, no cobrar— pero es lo
bastante distinto de lo que la gente espera como para que la interfaz lo diga: algo del
tipo «un solo aviso de mora, X días después del vencimiento».

Ojo con el orden si pintas los tres juntos: con `daysAfter: 0` el aviso de mora sale el
mismo día del vencimiento y **gana** al de «vence hoy», porque se mira primero. No es un
error, pero la vista previa debería reflejarlo.

Estos campos **sí** son editables. Los que no lo son siguen siendo los del horario
(`quietStart`, `quietEnd`, `sendDays`, `skipHolidays`) — ver arriba.

#### ROMPE — activar la cobranza exige datos de contacto de la empresa

La organización gana **`contactPhone`** y **`contactEmail`** (los dos opcionales, pero al
menos uno hace falta). Están en `Organization`, `CreateOrganizationInput` y
`UpdateOrganizationInput`.

Encender la cobranza sin ninguno de los dos responde **422** con
`details.reason = "ORGANIZATION_CONTACT_REQUIRED"` y
`details.fields = ["contactPhone", "contactEmail"]`.

Por qué, para que el texto de la pantalla lo pueda explicar: **los avisos salen de un
número que no recibe respuestas.** El de la plataforma es compartido entre todos los
clientes de Nummo — si dos empresas tienen al mismo deudor y éste responde, no hay forma
de saber de quién es esa conversación. Así que el mensaje lleva un renglón que dice a
dónde escribir de verdad, como hace un banco con su «este número no recibe mensajes».

Solo se pide al **encender**. Cambiar una plantilla o la hora no lo exige.

Dónde ponerlo es decisión tuya, pero lo natural es el formulario de la empresa, y que la
pantalla de cobranza lo pida en línea cuando falte en vez de mandar al usuario a otra
sección a buscarlo.

#### La hora de envío: una sola, y acotada

`sendAt` es la hora local a la que salen los avisos. **Por defecto las 12:00.** Es una
hora, no una ventana — la ventana la pone la ley y dentro de ella solo queda elegir el
momento.

Y tiene que caer dentro de la franja **todos los días**, no solo hoy. En Colombia entre
semana se puede hasta las siete de la tarde pero el sábado cierra a las tres, así que el
rango real es **08:00–14:59**. Ese rango viene en la respuesta y hay que usarlo para
acotar el selector:

```jsonc
"schedule": {
  "sendableRange": { "earliest": "08:00", "latest": "14:59" },
  // …
}
```

`null` significa que no hay restricción que imponer. Fuera de rango, el `PUT` responde
**422** `SEND_TIME_OUT_OF_RANGE` con `earliest` y `latest` en `details`.

Ojo con las 15:00 en punto: **no** son válidas. La franja es `[inicio, fin)`, así que el
último minuto en que aún se envía es el 14:59. Si el selector va de hora en hora, el
último valor ofrecible es las 14:00.

Y no confundir con `reminderLocalTime` de los ajustes de notificaciones: aquél sigue
existiendo y sigue rigiendo los **avisos internos al equipo**. La cobranza ya no lo usa.

#### Qué pasa si el aviso cae en día no hábil

Dos de las tres etapas se recuperan y una no, y conviene no prometer lo contrario:

- **Antes** y **vencida** son ventanas abiertas: si el escaneo no corrió su día —domingo,
  festivo, worker caído— el aviso sale el siguiente día hábil.
- **El día que vence** no se recupera. Su texto dice «vence hoy» y mandarlo tarde sería
  falso, así que se pierde y lo recoge el de mora.

#### Lo que se arregló del contrato tras tu revisión

Los cuatro puntos eran correctos. Ya están en `openapi.json`:

- **`CollectionRemindersRun`** trae los ocho conteos: `before`, `onDue`, `overdue`,
  `queued`, `skipped`, `overdueDeferred`, `withoutPhone`, `sameDayDeferred`. Fuera
  `dueSoon`. La causa de que se quedara atrás tres veces era que ese DTO solo describía y
  nadie lo parseaba; ahora hay una comprobación de tipos que lo vuelve un error de
  compilación en el backend, así que no puede volver a pasar.
- **`UpdateCollectionPolicyInput`** ya no declara `quietStart`, `quietEnd`, `sendDays` ni
  `skipHolidays`. El esquema es `strict`, así que mandarlos es un `422` y no un descarte
  en silencio.
- **Las descripciones** del `GET`, el `PUT` y el de «enviar ahora» están reescritas. Ya no
  contradicen esto.
- **El `422` está declarado** con `details` tipado.

Para el error de la hora:

```ts
import type { CollectionPolicyErrorDetails } from '@/api/generated/model'

// Unión discriminada por `reason`.
if (details?.reason === 'SEND_TIME_OUT_OF_RANGE') {
  `Esa hora no se puede. El rango es ${details.earliest}–${details.latest}.`
}
```

Un `422` **sin** `reason` es un fallo de esquema normal, con las incidencias de Zod en
`details` como en el resto de la API.

Y los límites de `daysBefore` (1–90) y `daysAfter` (0–90) ahora también salen en la
respuesta, no solo en la entrada.

#### Las cuatro plantillas, y por qué son cuatro

Un deudor recibe **un solo aviso** con todo lo que debe, no uno por factura. Como Meta no
pluraliza —«tienes 1 facturas vencidas» saldría tal cual— cada momento tiene su singular y
su plural:

| Campo | Cuándo sale |
| --- | --- |
| `dueSoonTemplateKey` | Una sola cuenta por vencer |
| `dueSoonSummaryTemplateKey` | Varias por vencer — **nuevo** |
| `overdueTemplateKey` | Una sola vencida |
| `overdueSummaryTemplateKey` | Varias vencidas |

Dejar vacía una de resumen es válido: cae a la singular con el total, y no miente porque
el texto dice «saldo pendiente» y no «tu factura». No es un error que haya que forzar a
corregir, pero sí conviene decir en la UI qué implica — el aviso pierde el conteo.

#### «Enviar ahora»

Los recordatorios salen solos a la **hora local de la organización** y **una sola vez al
día** (`reminderLocalTime` de los ajustes de notificaciones, por defecto `08:00`, el mismo
que ya rige los avisos internos). Sin este botón, activar la cobranza a las once significa
que el primer aviso sale mañana, y eso se siente roto.

`POST /messaging/collection-reminders/run` devuelve conteos:

```json
{ "before": 0, "onDue": 0, "overdue": 1, "queued": 1, "skipped": 0,
  "overdueDeferred": 0, "withoutPhone": 0, "sameDayDeferred": 0 }
```

Cuatro cosas que cambian cómo se pinta:

1. **Pulsarlo dos veces no duplica nada.** No hace falta deshabilitar el botón «por si
   acaso» ni avisar de que ya se pulsó. En la segunda pulsación verás **todo en cero** —el
   aviso ya quedó registrado y la consulta ni lo devuelve— y eso **no es un error**:
   significa «ya estaba dicho».
2. **Encola, no envía.** El worker despacha después. El `200` no debe prometer «enviado»;
   la fila aparece en `QUEUED` y pasa a `SENT` en segundos.
3. **`withoutPhone`, `overdueDeferred` y `sameDayDeferred` merecen mostrarse.** Son la
   respuesta a «pedí avisar a treinta y salieron doce». Un cero sin explicación parece un
   fallo del sistema. Los tres primeros conteos —`before`, `onDue`, `overdue`— son cuántos
   se miraron en cada etapa, no cuántos salieron: eso es `queued`.
4. **No mira el calendario, pero sí la hora y las etapas.** El día lo eligió quien lo
   pulsó, así que funciona un domingo. Un disparo a las nueve de la noche encola para la
   mañana siguiente, y el botón **adelanta** el aviso que ya tocaba — no añade uno más.

Responde **409** `COLLECTION_POLICY_DISABLED` si la cobranza está apagada: el botón solo
tiene sentido con la política activada.

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
- **No hay envío manual a un cliente concreto.** No existe «escríbele a este cliente
  ahora». Lo que sí existe es disparar **la pasada completa** de recordatorios sin esperar
  a la hora (ver «Enviar ahora»): decide el escaneo a quién le toca, no la pantalla. El
  permiso `messaging.send` ya está, así que el día que se quiera lo individual no hará
  falta tocar la autorización.
- **No hay conversación entrante.** El webhook recibe estados de entrega y bajas; no hay
  bandeja de respuestas.
