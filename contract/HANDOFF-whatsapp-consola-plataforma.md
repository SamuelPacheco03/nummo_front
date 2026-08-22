<!--
  Copia literal de `HANDOFF-fase-13.md` del backend (nummo_api), commit 4247eb0.

  Se copia el documento de origen en vez de reescribirlo aquí, por lo mismo
  que la copia de la fase 12: el original se mantiene contra el código, y dos
  copias del mismo texto se separan a la primera corrección que solo se haga
  en una.
-->

# Handoff — Fase 13 (la consola de plataforma del canal de WhatsApp)

Va a la **consola de superadmin** (`/admin`), no a la de un cliente. Es la otra mitad de
lo que la Fase 12 entregó: aquélla es lo que ve una organización de su cobranza, ésta es
lo que ve Nummo del canal entero.

Todo bajo `requirePlatformAdmin`, **fuera** de `requireTenant`: aquí no hay `orgId`, y no
lo hay porque estas dos cosas no son de nadie en particular.

Contrato: **167 rutas, 231 esquemas**. Regenera el cliente antes de nada.

---

## Por qué existe esto

Dos cosas del canal se rompían sin que nadie se enterara, y las dos tienen el mismo
patrón: el fallo pasa en un sitio y el síntoma aparece en otro.

**La cola de webhooks.** Es la única tabla del canal sin dueño — cuando Meta entrega algo
todavía no se sabe de qué organización es — y no la miraba nadie. Si Meta cambia de
versión o el gateway se cae, se va llenando de fallos mientras lo que el cliente ve es
«mis mensajes se quedan en enviado». Nadie ata una cosa con la otra.

**Las plantillas de la plataforma.** Son de Nummo y las comparten todos los clientes. Si
Meta pausa una, se cae la cobranza de todos a la vez, y la única señal eran los mensajes
saltados repartidos por el historial de cada uno.

---

## Pantalla 1 — La cola de entrantes

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/admin/whatsapp/inbound-events/health` | Conteo por estado |
| `GET` | `/admin/whatsapp/inbound-events` | Listado, `?status=`, paginado |
| `POST` | `/admin/whatsapp/inbound-events/retry` | Reencola **todas** las fallidas |
| `POST` | `/admin/whatsapp/inbound-events/{id}/retry` | Reencola una |

`health` devuelve **siempre los tres estados**, incluso en cero:

```json
{ "PENDING": 0, "PROCESSED": 1284, "FAILED": 3 }
```

Píntalos los tres. Un «FAILED: —» hace dudar de si es que no hay o es que no se pudo
contar, y esta pantalla existe justamente para quitar esa duda.

**`FAILED` creciendo es la alarma.** No es «algunos webhooks raros»: significa que Meta
está mandando algo que este despliegue ya no sabe leer. Merece destacarse, no ser una
columna más.

### Cada fila, y lo que deliberadamente no trae

```json
{
  "id": "…", "phoneNumberId": "PNID", "status": "FAILED",
  "attempts": 5, "lastError": "boom",
  "shape": { "fields": ["messages"], "entries": 1 },
  "receivedAt": "…", "availableAt": "…", "processedAt": null
}
```

**No viene el cuerpo del webhook, y no es un olvido.** El payload crudo de Meta lleva
teléfonos de deudores: gente que ni siquiera es usuaria de Nummo. `shape` responde la
pregunta que de verdad se hace quien mira esto —«¿qué clase de evento dejó de
parsear?»— sin regalar datos personales de un tercero. No pidas el payload; no va a
existir.

`shape.fields` son los `field` de Meta: `messages`, `message_template_status_update`.
Sirven para leer la tabla de un vistazo: si todos los fallidos son del mismo campo, el
problema está en ese camino y no en el canal entero.

### El reencolado

Reinicia los intentos a cero, a propósito: quien pulsa el botón es porque arregló lo que
lo rompía, y dejarlo con los intentos gastados lo haría fallar otra vez sin llegar a
procesarse. En la UI conviene decirlo — «vuelve a intentarlo desde cero» — porque un
`attempts: 5` que pasa a `0` sin explicación parece que se perdió información.

**Solo alcanza a lo `FAILED`.** Pedir el reintento de una ya procesada responde **404**:
desde fuera, «no existe» y «no era reencolable» son la misma respuesta útil. No ofrezcas
el botón en filas que no estén fallidas.

El masivo devuelve `{ "requeued": 3 }`. Nada de esto envía ni procesa: devuelve a la cola,
y de vaciarla se encarga el worker en su siguiente vuelta (cada 15 segundos por defecto).
El estado no cambia a `PROCESSED` al instante.

---

## Pantalla 2 — Las plantillas de la plataforma

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/admin/whatsapp/templates` | Las de Nummo, con lo que dice Meta |
| `POST` | `/admin/whatsapp/templates/sync` | Empuja el catálogo y trae el estado |

Devuelve el mismo `WhatsAppTemplate` que ya conoces de la Fase 12, pero **solo las de la
plataforma** — todas con `organizationId: null`. Hoy son tres: `cobro_por_vencer`,
`cobro_vencido` y `cobro_vencido_resumen`.

Lo que hay que mirar de cada una es `status` y `canSend`. Usa `canSend`, que ya viene
calculado; no lo deduzcas del `status`.

El sync devuelve qué hizo:

```json
{ "created": [], "alreadyThere": ["cobro_por_vencer", "cobro_vencido"], "failed": [] }
```

**Es idempotente y conviene decirlo en la UI**, porque el instinto es no tocar un botón
que habla con Meta. Lo que ya existe se refleja en vez de recrearse: recrear gastaría
cupo de creación —100 por hora y por WABA— para recibir un rechazo por nombre duplicado.

`created` no significa «lista para usar»: lo nuevo queda `PENDING` hasta que Meta lo
revise, de minutos a horas. Y una plantilla que falla no detiene a las demás — sale en
`failed` con su motivo, así que ese array merece pintarse aunque casi siempre esté vacío.

Es el mismo trabajo que hace `pnpm wa:templates:sync` en la terminal de un despliegue.
Las dos puertas llaman al mismo caso de uso.

---

## Errores que esta superficie sí devuelve

`WHATSAPP_NOT_CONFIGURED` con un `details.missing` que nombra la variable que falta
(`WHATSAPP_GATEWAY_URL / WHATSAPP_GATEWAY_KEY`, `WHATSAPP_WABA_ID`…). Sale del sync y del
mensaje de prueba cuando el despliegue no tiene el canal montado.

Muéstralo tal cual: quien lo lee es quien puede arreglarlo, y el nombre de la variable es
justo lo que necesita.

---

## Lo que no hay, y no conviene diseñar

- **Ver el contenido de los mensajes de un cliente.** Los agregados y los motivos son
  operativos; los cuerpos y los destinatarios son datos de un tercero. Si algún día hace
  falta para soporte, será una acción auditada y no una pantalla.
- **La calificación de calidad del número.** Importa —con la WABA compartida un cliente
  pesado degrada el envío de todos— pero hoy no existe: la librería no parsea ese evento
  de Meta y el gateway no expone el endpoint. Es trabajo en tres repos.
- **Una vista global de la cola de salientes.** «Cuántos mensajes llevan atascados en
  `QUEUED`» sigue sin poder responderse desde plataforma.
- **Borrar entregas de la cola.** Solo se purgan las procesadas, y lo hace el worker.
