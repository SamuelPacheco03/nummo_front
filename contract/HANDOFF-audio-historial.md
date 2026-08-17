# HANDOFF — Onda de las notas de voz (Frontend → Backend)

**Fecha:** 2026-08-17 · **Estado: bloqueado en el backend.** El frontend ya está terminado: calcula
la onda al grabar, la guarda con el mensaje en memoria y la dibuja en cuanto llegue del servidor.
Lo único que falta es **persistirla y devolverla**.

## El problema, en una frase

Una nota de voz del historial se ve como una barra plana hasta que la reproduces, porque la única
forma de conocer sus subidas y bajadas es **descargar el audio y decodificarlo**. Descargar treinta
audios para dibujar treinta ondas no es una opción, así que hoy el hilo enseña notas todas iguales.

La onda tiene que viajar **como dato del mensaje**, no dentro del audio.

## Qué pedimos

### 1 · Dos campos nuevos en `ChatMessage`

`GET /assistant/conversations/:id/messages` devuelve hoy `id`, `role`, `content`, `source`,
`hasAudio`, `createdAt`. Añadir, **solo cuando `source: "audio"`**:

| Campo | Tipo | Qué es |
| --- | --- | --- |
| `waveform` | `number[]` \| `null` | 32 valores de 0 a 1, dos decimales. El volumen medio de cada tramo del audio |
| `audioSeconds` | `number` \| `null` | Duración en segundos, un decimal |

```json
{
  "id": "…", "role": "user", "content": "cuánto me debe Ana Torres",
  "source": "audio", "hasAudio": true,
  "waveform": [0.12, 0.34, 0.81, 0.77, 0.45, 0.2, "… hasta 32"],
  "audioSeconds": 3.4,
  "createdAt": "2026-08-16T15:30:00.000Z"
}
```

**`null` es una respuesta válida** y el frontend ya la contempla: si no hay onda, dibuja la barra
plana de siempre. Nada se rompe mientras esto no exista — por eso no bloquea el despliegue.

### 2 · Aceptarlos al subir el audio

`POST /assistant/chat/audio` es `multipart/form-data` con `audio`, `sessionId` y `language`. Pedimos
aceptar dos campos de texto más:

| Campo | Ejemplo | Validación sugerida |
| --- | --- | --- |
| `waveform` | `"[0.12,0.34,0.81,…]"` (JSON) | Array de 1–64 números finitos en `[0,1]`. Si no cumple, **ignorar y guardar `null`** — nunca fallar la petición por esto |
| `audioSeconds` | `"3.4"` | Número `> 0` y `<= 600`. Si no cumple, ignorar |

**El cliente los calcula y el servidor los guarda tal cual**, sin recalcular. Es la opción barata:
el navegador ya tiene que decodificar el audio para dibujar la onda de la nota que acaba de
grabarse, así que le sale gratis; el backend necesitaría `ffmpeg` para llegar al mismo número.

Son **decoración**: el peor caso de un valor manipulado es una onda que no corresponde con el
audio de quien la mandó. No se usan para nada más — ni para cobrar, ni para autorizar, ni para
buscar. Aun así, validar el rango y el largo evita guardar basura.

> Si prefieres calcularlos en el servidor (una implementación, consistente para cualquier cliente
> futuro), el frontend no necesita ningún cambio: le basta con recibirlos. Dínoslo y quitamos el
> envío.

### 3 · Guardarlos junto al mensaje

Dos columnas en la tabla de mensajes (`waveform jsonb null`, `audio_seconds numeric null`), o el
equivalente que uses. **Son unos 130 bytes por nota**: 32 números de dos decimales.

Ojo con dos cosas que ya nos pasaron en otro sitio:

- Si un mensaje se borra o se purga su audio, **la onda puede quedarse**. Es lo que permite seguir
  viendo de un vistazo cuál fue larga y cuál corta aunque ya no se pueda reproducir.
- No los devuelvas en mensajes de Numi (`role: "assistant"`): no tienen audio y solo ensucian la
  respuesta.

## Qué ya está hecho de nuestro lado

- `features/assistant/waveform.ts` — calcula los 32 picos (RMS por tramo, normalizado) y la duración
  al grabar; redondea a dos decimales; valida lo que llega del servidor antes de dibujarlo.
- `AudioPlayer` acepta `peaks` y `seconds`: con ellos pinta la nota **sin tocar el audio**, y solo
  decodifica cuando faltan.
- `flattenMessagePages` ya lee `waveform` y `audioSeconds` del mensaje. Están detrás de un puente de
  tipos (`PendingAudioFields`) porque el contrato aún no los declara; **el día que estén en
  `openapi.json`, `pnpm api:gen` y se borra el puente**, sin más cambios.

**Lo único que no está encendido es el envío** (punto 2): mandar un campo que el backend todavía no
espera puede hacer que rechace la petición, y eso rompería los mensajes de voz que hoy funcionan.
Es una línea en `sendAudio` (`features/assistant/hooks.ts`), y se enciende en cuanto confirmes que
el endpoint los acepta.

## Por qué 32 valores

Es lo que cabe en el ancho de una burbuja de chat sin que las barras se conviertan en una mancha.
Más resolución no se ve; menos, y una nota de diez segundos pierde sus pausas. Si prefieres guardar
más y dejar que cada cliente resuma, el frontend sabe recortar — pero entonces manda siempre el
mismo número para que dos notas se puedan comparar de un vistazo.
