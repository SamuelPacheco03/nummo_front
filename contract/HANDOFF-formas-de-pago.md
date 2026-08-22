<!--
  Copia literal de `HANDOFF-fase-14.md` del backend (nummo_api), commit 4247eb0.

  Se copia el documento de origen en vez de reescribirlo aquí: el original se
  mantiene contra el código, y dos copias del mismo texto se separan a la
  primera corrección que solo se haga en una.
-->

# Handoff — Fase 14 (dónde puede pagar quien debe)

El recordatorio ya no dice solo cuánto se debe: dice **dónde pagarlo**. Para eso hay un
catálogo nuevo por organización, y una pantalla que hay que construir.

Contrato: **169 rutas, 234 esquemas**. Regenera el cliente antes de nada.

---

## Por qué es un catálogo y no un par de campos

Cobrar en Colombia no tiene una sola forma. A una cuenta se consigna con tipo y número; a
una llave se transfiere sin saber el número; a un Nequi basta el celular; y a veces hay un
enlace de pago. Un formulario de «banco + número + link» dejaría fuera la mitad de los
casos reales, así que son **cinco formas y cada una tiene la suya**.

Va **por organización**, no por acuerdo ni por concepto. Lo decidió el esquema: una cuenta
por cobrar puede no tener acuerdo —las creadas a mano no lo tienen— y colgarlo de ahí
habría dejado sin datos de pago justo a esos cobros.

No confundir con `payment-methods`, que ya existe y es *cómo se registró* un pago que ya
entró. Esto es lo que se le dice al deudor.

---

## Los endpoints

Bajo `/api/v1/organizations/{orgId}`.

| Método | Ruta | Permiso |
| --- | --- | --- |
| `GET` | `/payment-instructions` | `payment_instructions.read` |
| `POST` | `/payment-instructions` | `payment_instructions.manage` |
| `PATCH` | `/payment-instructions/{id}` | `payment_instructions.manage` |
| `DELETE` | `/payment-instructions/{id}` | `payment_instructions.manage` |

**`payment_instructions.manage` es un permiso aparte, y a propósito.** No viaja con
`financial_accounts.manage` porque esto decide **a qué cuenta le llega la plata** de los
cobros que salen, y el deudor no tiene forma de notar un cambio. Lo tienen OWNER y ADMIN;
un ACCOUNTANT puede verlo y no cambiarlo. Cada cambio queda auditado con el antes y el
después.

El `GET` acepta `?includeArchived=true`. Por defecto no vienen las archivadas.

---

## El formulario: una unión por `kind`

`details` cambia de forma según el tipo. Es una `oneOf` discriminada por `kind`, así que
el formulario tiene que cambiar de campos al elegir:

| `kind` | Campos |
| --- | --- |
| `BANK_ACCOUNT` | `bankName`, `accountKind` (`SAVINGS` \| `CHECKING`), `accountNumber`, `holderName`, `holderDocument` (opcional) |
| `TRANSFER_KEY` | `bankName` (opcional), `keyKind` (`PHONE` \| `EMAIL` \| `DOCUMENT` \| `ALPHANUMERIC`), `keyValue` |
| `WALLET` | `provider`, `phone` |
| `PAYMENT_LINK` | `url` |
| `OTHER` | `text` |

Cómo nombrarlos en la UI, que es como los nombra quien va a llenar el formulario:
**Cuenta bancaria**, **Llave / Transfiya**, **Billetera (Nequi, Daviplata…)**, **Enlace de
pago** y **Otro**.

Dos detalles del formulario que no se deducen del esquema:

- **`holderDocument` es la cédula o el NIT**, y va porque el banco lo pide para confirmar a
  quién se le está consignando. Opcional, pero vale la pena empujarlo.
- **`accountKind` no es un adorno.** Consignar a «corriente» lo que es de ahorros rebota.

El `url` **solo acepta `https`** — devuelve `422` con `http`. Este enlace le pide dinero a
alguien.

---

## `preview`: úsalo, no lo rearmes

Cada instrucción vuelve con un campo `preview`:

```json
{
  "kind": "BANK_ACCOUNT",
  "preview": "Bancolombia ahorros 123-456789-00 a nombre de Distribuidora El Sol (NIT 900123456)",
  "showInReminders": true,
  "sortOrder": 0
}
```

Es **exactamente el renglón que verá el deudor**. Está en la respuesta para que la vista
previa de la pantalla no lo tenga que componer: si el front lo rearma por su cuenta, la
previa y el mensaje real acabarán diciendo cosas distintas de la misma cuenta.

---

## Tres reglas del backend que cambian la pantalla

**Los textos se guardan en una sola línea.** Acaban dentro de un parámetro de plantilla de
WhatsApp, y Meta rechaza el envío entero si lleva saltos de línea, tabuladores o más de
cuatro espacios seguidos. El backend los normaliza al entrar —`"  El   Sol "` se guarda
como `"El Sol"`—, así que no hace falta validarlo en el cliente, pero sí conviene no
ofrecer un `textarea` donde no cabe un salto de línea.

**`showInReminders: false` la deja en el catálogo sin publicarla.** Sirve para la cuenta
que solo usa un cliente grande, o para la caja de la oficina: existe, pero no se le enseña
a un deudor. Merece ser un interruptor visible, no algo escondido en un menú.

**En el recordatorio caben tres.** Con dos o tres el renglón se lee; con seis es un muro
que nadie termina. Entran las publicables por `sortOrder` y el resto se queda fuera. Si la
pantalla deja configurar más de tres publicables, conviene decirlo ahí mismo — el backend
lo registra pero no tiene dónde avisarle al usuario.

**`DELETE` archiva, no borra.** Un recordatorio que ya salió nombró esa cuenta, y quien
mire ese mensaje mañana tiene que poder saber a dónde se le pidió que pagara. Desaparece
del listado y de los recordatorios; sigue estando con `includeArchived`.

---

## Lo que cambió en el mensaje

Las plantillas de cobranza ganaron dos variables: `{{concepto}}` y `{{como_pagar}}`. El
texto pasa de

> Tu saldo de $120.000 venció el 12 de agosto y sigue pendiente.

a

> Tu **Arriendo** de $120.000 venció el 12 de agosto y sigue pendiente.
> **Para pagar: Bancolombia ahorros 123-456789-00 a nombre de Distribuidora El Sol o Nequi 3105948908.**

Dos cosas para la pantalla de plantillas y la de política:

- **Hay dos juegos de plantillas, no una vieja y una nueva.** Uno dice solo lo que se
  debe; el otro añade dónde pagarlo. El primero no está superado: hay quien no quiere
  publicar su cuenta en un WhatsApp que sale del número de Nummo y prefiere que el deudor
  le escriba. La organización elige, y la pantalla tiene que dejar clara esa diferencia.

  | Clave | Se lee como |
  | --- | --- |
  | `cobro_por_vencer` | Por vencer — solo recordatorio |
  | `cobro_vencido` | Vencida — solo recordatorio |
  | `cobro_vencido_resumen` | Varias vencidas — solo recordatorio |
  | `cobro_por_vencer_con_pago` | Por vencer — con datos de pago |
  | `cobro_vencido_con_pago` | Vencida — con datos de pago |
  | `cobro_vencido_resumen_con_pago` | Varias vencidas — con datos de pago |

  Las de «con datos de pago» están en `PENDING` hasta que Meta las apruebe; las otras
  siguen aprobadas y enviando, así que **no hay corte**. Mira `canSend`.

- **Cada plantilla trae ahora `displayName` y `purpose`.** Úsalos: `templateKey` es un
  identificador y `name` lo restringe Meta a minúsculas y guiones bajos. Ninguno de los
  dos sirve para que alguien elija en una pantalla — `purpose` es literalmente la frase
  que explica cuándo tomar ésta y no la otra.
- **El renglón nunca va vacío.** Una variable sin valor hace que Meta rechace el envío
  entero, así que cuando no hay nada configurado el mensaje dice «Para pagar: comunícate
  con nosotros». Es cierto y es útil — y es lo que evitó tener que duplicar cada plantilla
  en una versión con datos de pago y otra sin ellos.

Eso da una buena razón para enlazar desde la pantalla de política a la de formas de pago:
mientras esté vacía, todos los recordatorios de esa organización dicen «comunícate con
nosotros».

---

## Lo que no hay, y no conviene diseñar

- **Cuentas distintas por concepto o por acuerdo.** El hueco está pensado pero no
  construido: hoy el catálogo es de la organización entera.
- **Enlaces por deuda.** El enlace es fijo por organización. Uno por cuenta por cobrar
  exigiría que el cliente tenga pasarela con referencias y que Nummo sepa construir la URL.
- **Botón de pago en WhatsApp.** Meta solo admite un sufijo variable sobre una URL base
  fija, y con la cuenta compartida esa base es la misma para todos los clientes: el enlace
  de cada uno no cabe en un botón. Por eso va en el cuerpo del mensaje.
- **Ver quién cambió una cuenta.** Queda auditado, pero no hay endpoint que lo exponga.
