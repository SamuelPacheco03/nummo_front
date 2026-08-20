# HANDOFF — El flujo de Numi: la costura y el cierre del turno (Frontend → Backend)

**Fecha:** 2026-08-20 · **Estado: pendiente.**

Dos cosas del flujo de `POST /assistant/chat/stream` que se ven en el teléfono y que el
front no puede arreglar del todo por su cuenta. Ninguna cambia la forma de la respuesta:
una añade un evento y la otra es una cuestión de cuándo se manda el que ya existe.

---

## 1 · Las dos partes de un turno llegan pegadas

Cuando Numi consulta datos antes de contestar, el turno son **dos generaciones**: primero
dice lo que va a hacer, después consulta, después contesta. Las dos salen por el mismo
flujo como eventos `chunk` y **sin nada que las separe**, así que en la burbuja se leen
como una sola frase rota:

```
¡Déjame revisar tu situación actual con datos frescos para decirte qué es lo más
urgente!Con datos de hoy (20 de agosto), esto es lo más urgente:
```

Fíjense en `urgente!Con`: ni un espacio. No es cosa del modelo —dentro de una misma
respuesta no escribe así—, es la juntura entre la primera generación y la segunda.

### Qué pedimos

Un evento que marque el corte, para poder pintarlo como lo que es: dos párrafos.
Cualquiera de las dos formas nos sirve; la primera es la más barata.

```jsonc
// A) un evento propio entre las dos partes
event: segment
data: {}
```

```jsonc
// B) o el número de parte en cada chunk, que además dice de cuál viene cada trozo
event: chunk
data: { "text": "…", "segment": 0 }
```

Si en el medio pasa algo que se pueda contar —una consulta, un registro—, mandarlo
también sirve: con `{ "tool": "cartera" }` en ese evento podemos enseñar «revisando tu
cartera…» mientras dura, en vez de dejar la burbuja quieta.

**Lo que NO queremos** es que el backend meta el `\n\n` en el texto del último `chunk` de
la primera parte. Funcionaría, pero deja el corte escondido dentro de una cadena y no hay
forma de distinguirlo de un salto de línea que haya escrito el modelo.

### Mientras tanto

El front **adivina la costura** por la forma del texto: punto, cierre de exclamación o de
interrogación seguidos **de una mayúscula sin espacio en medio**. Se lee bien, pero es una
heurística y tiene su precio — hay que dejar fuera «S.A.S.» y «J.P. Rojas» para no partir
un nombre por la mitad. Con el marcador del punto anterior, esto se retira.

---

## 2 · `done` llega tarde, o el cuerpo tarda en cerrarse

El botón de **detener** se apaga cuando termina el turno, y el turno terminaba cuando se
acababa el cuerpo de la respuesta. En el teléfono se veía el botón puesto **unos segundos
sobre una respuesta ya terminada**, ofreciendo cortar algo que ya no se estaba escribiendo.

Del lado del front ya está corregido lo que era del front: al recibir `done` se suelta el
flujo y el turno se cierra ahí mismo, sin esperar a que la conexión se vaya. Con eso, lo
que quede de retraso es de este lado, y son dos preguntas concretas:

1. **¿`done` sale inmediatamente después del último `chunk`?** Si entre medias se guarda
   el mensaje, se calcula el título de la conversación o se apuntan métricas, eso es
   tiempo en el que la persona ya terminó de leer y la interfaz sigue diciendo que Numi
   escribe. Lo que haga falta guardar puede guardarse **antes** de mandar `done`, sí, pero
   lo que no sea imprescindible para el turno (título, métricas, avisos) va mejor después.

2. **¿El proxy está bufferizando el flujo?** Si delante hay nginx, hace falta
   `proxy_buffering off` y `X-Accel-Buffering: no` en la respuesta. Con buffering, los
   `chunk` llegan a ráfagas y el `done` puede quedarse retenido: desde el navegador se ve
   exactamente igual que si el backend tardara.

---

## 3 · Un evento que el contrato no cuenta

No es trabajo, es actualizar `openapi.json` para que lo escrito y lo que pasa digan lo
mismo. La descripción del endpoint habla de **tres** eventos (`chunk`, `done`, `error`),
y hay un cuarto: **`start`** con `{ sessionId }`, antes de la primera palabra. El front
depende de él —quien detiene el turno nunca llega a ver `done`, y sin ese `sessionId` su
siguiente mensaje abriría otra conversación—, así que conviene que esté firmado.

De paso: cuando `done` empiece a traer `userMessageId` y `assistantMessageId` (lo pedido
en `HANDOFF-numi-durabilidad.md` §3), que se documenten ahí mismo. El cliente ya los lee
si llegan y los ignora si no.
