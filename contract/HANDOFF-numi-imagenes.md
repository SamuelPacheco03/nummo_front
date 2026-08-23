<!--
  Copia literal de `HANDOFF-fase-15.md` del backend (nummo_api), commit c7c5617.

  Numi lee imágenes: el chat con foto, el BYOK de visión y el contador del plan.

  El nombre cambia a propósito: la numeración de fases del backend no es la de
  `context.md`, y un handoff se busca por lo que trae, no por su número.
-->

# Handoff — Fase 15 (Numi lee imágenes)

Se le puede mandar una foto a Numi —un comprobante, una factura, un recibo— y contesta
sobre lo que ve. La imagen queda archivada como documento.

Contrato: **177 rutas, 246 esquemas**. Regenera el cliente antes de nada.

---

## Tres puertas, y no son la misma

| Ruta | Para qué |
| --- | --- |
| `POST /assistant/chat/image` | Mandarle una foto a Numi **dentro de la conversación** |
| `POST /assistant/read-document` | Leer una imagen **sin conversar**: devuelve lo extraído y ya |
| `POST /documents` | Archivar un documento sin pedirle nada a Numi |

La del chat es la que necesita la pantalla de conversación. Las otras dos son para cuando
haya una pantalla de documentos, y no hacen falta para esto.

Permisos: las dos primeras piden `assistant.use` **y** `documents.write`; la tercera solo
`documents.write`. Leer un documento es `documents.read`, que lo tienen todos los roles;
escribir está al nivel de quien registra movimientos.

---

## Adjuntar una imagen en el chat

`POST /assistant/chat/image` es **multipart**, no JSON:

| Campo | |
| --- | --- |
| `image` | **Obligatorio.** JPEG, PNG, WebP o GIF |
| `message` | Opcional: lo que se escribió junto a la imagen |
| `sessionId` | Opcional, como en el chat normal |

Cuatro cosas que cambian cómo se construye la pantalla, y ninguna se deduce del esquema:

**Una imagen por mensaje.** El campo es uno solo. Para mandar tres, son tres mensajes.

**No hay versión que transmita.** El chat normal tiene `/chat/stream`; éste no. La
respuesta llega entera de una vez, y puede tardar —hay que leer la imagen antes de
contestar—. La UI necesita un estado de espera distinto del cursor que ya usa para el
texto que va llegando.

**No se puede adjuntar en un mensaje de texto normal.** `AssistantChatInput` es
`{ message, sessionId }` y no acepta `documentIds`: no hay forma de subir una imagen y
referenciarla después en otra pregunta. Cada imagen entra por su propio mensaje.

**El tope es de 10 MB** por defecto (`DOCUMENTS_MAX_MB`, configurable por despliegue).
Conviene comprimir en el cliente antes de subir: una foto de móvil moderna se pasa.

La respuesta trae `documentId`, `reply`, los dos ids de mensaje y **`alreadyFiled`**. Ese
último es el que sorprende: si esa misma imagen ya se había subido —se compara por
hash— no se archiva de nuevo y viene en `true`. No es un error; es que no había nada nuevo
que guardar.

## El historial

`ChatMessage` gana `documentIds` y `source` acepta `'image'`. Con eso la conversación se
puede repintar con la miniatura de lo que se mandó, en vez de un mensaje sin contexto.

La imagen se baja de `GET /documents/{id}/download`.

---

## El BYOK de visión

Tres rutas nuevas, calcadas de las de chat y voz:

| Método | Ruta |
| --- | --- |
| `PUT` | `/assistant/vision/providers/{provider}` |
| `DELETE` | `/assistant/vision/providers/{provider}` |
| `POST` | `/assistant/vision/providers/{provider}/activate` |

Todas con `assistant.settings.manage` y la feature `ai_byok`.

Y `GET /assistant/settings` ahora devuelve **tres bloques** — `providers`/`catalog` para el
chat, `voice` y `vision`— cada uno con su `activeProvider`, sus credenciales y su catálogo.
La pantalla de ajustes del asistente pasa de dos pestañas a tres, con la misma forma.

Como en los otros dos, **la clave nunca vuelve**: solo `apiKeyLast4`. No hay «editar la
clave», hay «reemplazarla», y el campo se muestra vacío con los cuatro dígitos al lado.

---

## En los planes

`vision_documents_monthly` es un **counter**, como los mensajes de IA y los de WhatsApp:
se acumula por mes y se reinicia al cambiar de periodo.

| Plan | Documentos al mes |
| --- | --- |
| FREE | 20 |
| BASIC | 100 |
| PRO | 600 |
| ENTERPRISE | sin tope |

Sale ya en `LimitMap` y en `UsageMap`, o sea en `capabilities`: la barra de consumo que
pinta la pantalla de plan lo recoge sin tocar nada, igual que los otros contadores.

Agotarlo devuelve **`LIMIT_EXCEEDED` (409)** con el tope, lo usado y el periodo en
`details`. Es momento de ofrecer el plan, no de mostrar un error.

Y lo mismo que en los otros: **con clave propia (`ai_byok`) no consume cuota**, porque los
tokens los paga la organización. Las dos preguntas son distintas y se evalúan por separado.

---

## Lo que devuelve la lectura

`DocumentExtraction` trae `kind`, `transcription`, `description`, `financial`,
`confidence` y dos banderas que merecen UI propia:

- **`unreadable`** — la imagen no se pudo leer (borrosa, cortada, a oscuras). Decírselo al
  usuario en vez de enseñar una extracción vacía.
- **`suspiciousInstructions`** — el texto de la imagen intentaba darle órdenes al
  asistente. Es una foto que alguien podría haber preparado para eso; el backend no la
  obedece, y la pantalla no debería presentarla como una lectura normal.

---

## Lo que no hay

- **Varias imágenes en un mensaje**, ni adjuntar a un mensaje de texto ya enviado.
- **Streaming** con imagen.
- **PDFs.** Solo los cuatro tipos de imagen; el `CHECK` de la tabla lo sostiene.
- **Una pantalla de documentos.** Los endpoints están (`POST /documents`, el detalle y la
  descarga) pero nadie los usa todavía fuera del chat.
