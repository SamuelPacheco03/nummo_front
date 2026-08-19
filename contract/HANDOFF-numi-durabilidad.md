# HANDOFF — Que un turno de Numi no se pierda (Frontend → Backend)

**Fecha:** 2026-08-19 · **Estado: pendiente.**

## El problema, en una frase

Un turno de Numi —el mensaje de quien pregunta, la llamada al modelo y la respuesta— vive hoy
**dentro de una petición HTTP**, así que cuando el móvil mata la página a mitad, muere con ella y
no queda rastro de nada.

Pasa más de lo que parece: en Android basta con salir de la app unos segundos mientras Numi
piensa. La persona vuelve, abre el chat y lo que dijo hace un minuto no está en ninguna parte.

## Qué se pierde exactamente

Hay dos pérdidas distintas y conviene separarlas, porque se arreglan con cosas distintas.

**1 · El turno en vuelo.** Si la app se va antes de que termine el turno, no se guarda ni la
pregunta ni la respuesta. El front ya guarda el hilo en el navegador (§32.3), así que **lo que la
persona escribió sí reaparece** al volver — pero como un mensaje que el servidor no conoce, y la
respuesta no llega nunca. La conversación queda coja de los dos lados: el cliente cree que
preguntó, el servidor no se enteró.

**2 · El audio se queda huérfano.** Esta es más sutil, porque **el audio sí está guardado**: el
contrato ya firma `hasAudio`, `waveform`, `audioSeconds` y
`GET /assistant/conversations/:id/messages/:messageId/audio`, y el front ya sabe pedirlo. Lo que
falta es el empalme: al grabar, el front pinta una burbuja con un id propio (`numi-7`) y un `blob:`
de esa página; el servidor la guarda con **su** UUID y no nos lo dice, porque ninguna de las dos
respuestas de chat devuelve ids. Cuando la página se recarga el `blob:` muere, y la nota queda con
su transcripción pero sin forma de saber qué audio del archivo le corresponde. Está ahí y no se
puede escuchar.

## Qué pedimos

Los tres primeros puntos son el 90 % del valor y no cambian la forma de ninguna respuesta salvo
para añadir campos. El resto se puede hacer después.

### 1 · Guardar el mensaje del usuario ANTES de llamar al modelo

Es el cambio más barato y el que más salva. El orden tiene que ser:

```
recibir → escribir el mensaje del usuario en la conversación → COMMIT
        → llamar al modelo → escribir la respuesta → COMMIT
```

Y no en una sola transacción que abarque los tres pasos: si el turno entero es atómico, un fallo
del modelo —o un cliente que se va— se lleva también la pregunta. **Lo que la persona dijo no
depende de que el modelo conteste.**

Con esto solo, el caso 1 deja de perder la mitad: la pregunta queda registrada aunque el resto se
caiga.

### 2 · No abortar el trabajo cuando el cliente se desconecta

Esto se escapa fácil porque suele venir activado por defecto. Que nadie escuche no es razón para
tirar el turno: el resultado va a la base de datos, no al socket. Revisar:

- que el handler no cancele al ver `req.aborted` / `request.signal.aborted`;
- que el `AbortSignal` de la petición **no** se esté pasando a la llamada del modelo ni a las
  consultas de base de datos (es el descuido más común: se propaga sin querer);
- que el proxy de delante no corte la petición al irse el cliente (en nginx,
  `proxy_ignore_client_abort on`).

Con 1 + 2, un turno empezado **siempre termina y siempre queda guardado**, aunque la app se haya
ido. Es lo que hace falta para que volver a abrir el chat sea suficiente.

### 3 · Devolver los ids que se acaban de crear

Dos campos nuevos en las respuestas de los dos endpoints de chat:

```jsonc
// POST /assistant/chat
{
  "sessionId": "…",
  "userMessageId": "uuid",       // ← nuevo
  "assistantMessageId": "uuid",  // ← nuevo
  "reply": "…"
}

// POST /assistant/chat/audio
{
  "sessionId": "…",
  "userMessageId": "uuid",       // ← nuevo: el de la nota de voz
  "assistantMessageId": "uuid",  // ← nuevo
  "transcript": "…",
  "reply": "…"
}
```

**Esto es lo que arregla el audio**, y lo arregla de raíz: el front etiqueta la burbuja con su id
del servidor en el mismo instante en que la manda, y a partir de ahí la nota se reproduce por el
endpoint de siempre, igual que cualquier otra del historial — antes y después de recargar.

La alternativa sería que el front adivine qué mensaje del servidor corresponde a cuál suyo
comparando marcas de tiempo. Eso es una heurística que falla en cuanto dos notas van seguidas, y
no la vamos a escribir: **el id lo tiene quien lo crea.**

### 4 · Cursor `after` en el listado de mensajes

`GET /assistant/conversations/:id/messages` acepta hoy `limit` y `before`, que sirven para subir
por el historial. Falta el otro sentido:

| Parámetro | Qué hace |
| --- | --- |
| `after` | Devuelve los mensajes **posteriores** a ese id, en orden natural |

Es lo que permite preguntar «¿qué hay nuevo desde el último que tengo?» al volver a la app, en vez
de recargar la conversación entera. Si de esta lista solo se hace el punto 1 y uno más, que sea
este.

### 5 · Idempotencia al enviar

Si el front reintenta un envío que quizá sí llegó —red mala, reintento manual—, no debe salir el
mensaje dos veces. Dos formas, cualquiera vale:

- **`Idempotency-Key`** en la cabecera, como ya hacen las diez rutas de dinero: misma clave y mismo
  cuerpo → se devuelve la respuesta original sin crear nada.
- **`clientMessageId`** en el cuerpo, único por conversación en base de datos.

La primera es preferible por consistencia con el resto del API, y el front ya tiene el patrón
montado (`lib/idempotency.ts`).

### 6 · El audio, a disco antes de transcribir

En `POST /assistant/chat/audio` el orden debería ser: recibir el archivo → guardarlo y crear el
mensaje con `hasAudio: true` → **después** transcribir. Si es al revés, un fallo de transcripción
—o un cliente que se va— se lleva por delante un audio que ya estaba subido y que no se puede
volver a pedir: se grabó una vez.

Un mensaje con audio y sin transcripción es un estado válido y recuperable (se puede transcribir
más tarde). Un audio perdido, no.

### 7 · Fase 2: el turno como trabajo, y avisar

Cuando 1–6 estén, el paso natural es dejar de esperar en la petición:

```
POST /assistant/chat  → 202 { sessionId, userMessageId, turnId, status: "pending" }
                        (un worker completa el turno y escribe la respuesta)
GET  /assistant/conversations/:id/messages?after=…   ← el del punto 4
```

Gana dos cosas además de la durabilidad: las respuestas largas dejan de pelearse con los timeouts
del móvil, y el turno se puede reintentar del lado del servidor.

Y si se quiere que la respuesta **llegue con la app cerrada**, eso es Web Push: claves VAPID,
`POST /push/subscriptions` para guardar la suscripción del navegador, y el worker mandando el push
al completar el turno. Es un proyecto aparte y solo tiene sentido después de esto, porque necesita
justamente que el turno se complete sin nadie delante. El front ya tiene service worker montado,
así que la base está.

## Qué ya está hecho de nuestro lado

- **El hilo se guarda en el navegador** (`nummo-numi`, últimos 50 mensajes): cerrar el panel, salir
  de la app o recargar ya no dejan la conversación en blanco. Lo que no puede hacer el
  almacenamiento local es inventarse una respuesta que el servidor nunca llegó a generar.
- **El turno es del hilo, no del panel:** cerrar el chat con una pregunta en el aire no cancela
  nada, y al volver a abrir sigue puesto el «escribiendo…».
- **El archivo de audio ya se consume:** `useMessageAudioLoader` pide la URL firmada al pulsar
  *play*, con caché de cinco minutos y reintento si el enlace caducó. En cuanto llegue el
  `userMessageId` del punto 3, las notas recién enviadas entran por ese mismo camino sin tocar
  nada más.
- **La onda y la duración ya viajan** al subir la nota (ver `HANDOFF-audio-historial.md`).

**Lo que no vamos a hacer aquí:** emparejar mensajes locales con mensajes del servidor por
aproximación. Es un parche que se rompe solo, y el dato correcto lo tiene el servidor.

## Cómo comprobar que quedó bien

Tres pruebas que no necesitan front:

1. **Cliente que se va a mitad.** Lanzar `POST /assistant/chat` y matar el cliente al segundo
   (`curl --max-time 1`). Después, `GET .../messages` debe traer **la pregunta y la respuesta**.
   Hoy no trae ninguna de las dos.
2. **Modelo que falla.** Forzar un error del proveedor de IA. `GET .../messages` debe traer la
   pregunta igualmente; el turno quedó a medias, no borrado.
3. **Doble envío.** Mandar dos veces con la misma `Idempotency-Key` y el mismo cuerpo: una sola
   pregunta en la conversación, y la segunda respuesta idéntica a la primera.

Para el audio: subir una nota, y comprobar que el `userMessageId` de la respuesta es el mismo id
que aparece en `GET .../messages` y que sirve en
`GET .../messages/:messageId/audio`.

## Sobre el contrato

Está congelado en `1.0.0` y **todo lo de arriba es aditivo**: campos opcionales nuevos en dos
respuestas, un parámetro de consulta nuevo, una cabecera opcional. Nada de esto rompe al front
actual, así que puede salir en una `1.1.0` y desplegarse antes de que aquí se toque una línea.

Cuando esté, aquí se regenera con `pnpm api:gen`.
