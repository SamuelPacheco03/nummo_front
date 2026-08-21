import type { StatusTone } from '@/components/ui/status-badge'
import type {
  MessageConsentSource,
  MessageConsentStatus,
  OutboundMessageStatus,
  WhatsAppTemplate,
} from '@/api/generated/model'

/* ---------- El estado de un mensaje ---------- */

/**
 * Los estados **no son una barra de progreso lineal**. Son dos caminos que
 * salen del mismo sitio:
 *
 * ```
 * QUEUED → SENT → DELIVERED → READ     (salió bien)
 * QUEUED → SKIPPED                     (no se envió, a propósito)
 * QUEUED → FAILED                      (se intentó y falló)
 * ```
 *
 * De ahí que `SKIPPED` sea `muted` y no `destructive`: **no es un error**. Es
 * «no se envió, y hay un motivo» —el destinatario pidió no recibir, la plantilla
 * no está aprobada, se acabó el cupo—. Pintarlo en rojo pondría al usuario a
 * buscar una avería que no existe, y de paso gastaría el rojo de §7, que aquí
 * solo le corresponde a `FAILED`.
 */
const STATUSES: Record<OutboundMessageStatus, { label: string; tone: StatusTone }> = {
  QUEUED: { label: 'En cola', tone: 'warning' },
  SENT: { label: 'Enviado', tone: 'success' },
  DELIVERED: { label: 'Entregado', tone: 'success' },
  READ: { label: 'Leído', tone: 'success' },
  SKIPPED: { label: 'No se envió', tone: 'muted' },
  FAILED: { label: 'Falló', tone: 'destructive' },
}

/** Para el filtro: en el orden de los dos caminos, no en el del enum. */
export const MESSAGE_STATUSES: OutboundMessageStatus[] = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'SKIPPED',
  'FAILED',
]

export function messageStatus(status: OutboundMessageStatus): {
  label: string
  tone: StatusTone
} {
  return STATUSES[status] ?? { label: status, tone: 'muted' }
}

/* ---------- Por qué no le llegó ---------- */

/**
 * La respuesta a «¿por qué no le llegó?», que es la pregunta con la que se entra
 * a esta pantalla. El backend manda una clave; aquí se dice en cristiano.
 *
 * Va sobre `string` y no sobre un enum porque **el contrato tipa `skipReason`
 * como cadena libre**: un motivo que el backend estrene tiene que poder
 * enseñarse: cae al pie de esta tabla con su clave a la vista, que es feo pero
 * honesto — mejor que una fila que no explica nada.
 */
const SKIP_REASONS: Record<string, string> = {
  consent_revoked: 'El destinatario pidió no recibir mensajes',
  consent_required: 'Falta su consentimiento explícito (solo aplica a marketing)',
  template_unknown: 'La política nombra una plantilla que no existe',
  template_not_approved: 'Meta todavía no aprobó la plantilla, o la pausó',
  missing_parameters: 'A la plantilla le falta un dato que el escaneo no pudo armar',
  quota_exceeded: 'Se agotó el cupo de mensajes del mes',
  channel_not_configured: 'El canal no está montado en este despliegue',
  no_whatsapp_account: 'La organización no tiene cuenta con la que enviar',
}

export function skipReasonLabel(reason: string): string {
  return SKIP_REASONS[reason] ?? reason
}

/**
 * `quota_exceeded` es el único motivo que **tiene arreglo desde aquí**: es el
 * mismo tope que cuenta `/config/plan`, así que la fila ofrece el plan en vez de
 * dejar al usuario con el diagnóstico en la mano (§45.5).
 */
export function skipReasonOffersPlan(reason: string | null): boolean {
  return reason === 'quota_exceeded'
}

/**
 * La marca de tiempo que vale la pena enseñar de un mensaje, con su palabra.
 *
 * **No es una barra de progreso**, así que no se pintan las cuatro fechas en
 * fila: se enseña la última que ocurrió de verdad. Un mensaje que se quedó en
 * `SENT` porque el webhook de Meta no está dado de alta dice «Enviado el 14 ago»
 * y no una línea con dos huecos, que se leería como media entrega.
 *
 * Se leen de la más avanzada a la más temprana, y `createdAt` siempre está.
 */
export function lastEvent(message: {
  createdAt: string
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
}): { label: string; at: string } {
  if (message.readAt) return { label: 'Leído el', at: message.readAt }
  if (message.deliveredAt) return { label: 'Entregado el', at: message.deliveredAt }
  if (message.sentAt) return { label: 'Enviado el', at: message.sentAt }
  return { label: 'En cola desde el', at: message.createdAt }
}

/**
 * A qué cuenta pertenecía el aviso, para poder ir a ella desde el historial.
 *
 * **`entityType` llega como cadena libre** —el contrato no publica un enum—, así
 * que esto es un puente y está escrito para retirarse solo: lo que no reconoce
 * no enlaza a ninguna parte en vez de componer una ruta inventada. Es el mismo
 * criterio que `notificationRoute` (§95.16), y por el mismo motivo: las rutas se
 * declaran en un solo sitio (§87.5).
 *
 * Hoy la cobranza solo persigue cuentas por cobrar, que es lo que dice el
 * handoff; el día que el contrato publique el enum, esto se tipa contra él.
 */
export function relatedAccountPath(message: {
  entityType: string | null
  entityId: string | null
}): string | null {
  if (!message.entityType || !message.entityId) return null
  const kind = message.entityType.toLowerCase().replace(/s$/, '')
  return kind === 'receivable' ? `/cartera/cxc/${message.entityId}` : null
}

/* ---------- Consentimiento ---------- */

/**
 * Tres estados, y el que importa entender es `UNKNOWN`.
 *
 * **`UNKNOWN` deja pasar la cobranza.** A un cliente al que se le factura no se
 * le pide permiso para cobrarle: Meta solo exige consentimiento explícito para
 * `MARKETING`, y estas plantillas son `UTILITY`. Así que no es un estado
 * pendiente que haya que resolver, y presentarlo como advertencia —ámbar, «Sin
 * confirmar», un botón de «pedir permiso»— sería mentir sobre lo que hace el
 * sistema.
 *
 * Por eso va en `success` y se llama «Puede recibir»: dice **el efecto**, que es
 * lo que alguien viene a comprobar, y no el estado interno del registro.
 * `REVOKED` es el único que bloquea, y se comprueba al encolar.
 */
const CONSENTS: Record<MessageConsentStatus, { label: string; tone: StatusTone; hint: string }> = {
  UNKNOWN: {
    label: 'Puede recibir',
    tone: 'success',
    hint: 'Nadie ha dicho lo contrario. La cobranza sale igual: son mensajes de servicio, no publicidad.',
  },
  GRANTED: {
    label: 'Puede recibir',
    tone: 'success',
    hint: 'Dio su consentimiento explícito.',
  },
  REVOKED: {
    label: 'Pidió no recibir',
    tone: 'destructive',
    hint: 'No se le encola ningún mensaje mientras siga así.',
  },
}

export function consentStatus(status: MessageConsentStatus): {
  label: string
  tone: StatusTone
  hint: string
} {
  return CONSENTS[status] ?? { label: status, tone: 'muted', hint: '' }
}

/** De dónde salió el consentimiento que hay guardado. */
const CONSENT_SOURCES: Record<MessageConsentSource, string> = {
  IMPORTED: 'Importado',
  CONTRACT: 'Del contrato',
  REPLY: 'Lo respondió él',
  MANUAL: 'Puesto a mano',
}

export function consentSourceLabel(source: MessageConsentSource): string {
  return CONSENT_SOURCES[source] ?? source
}

/* ---------- Plantillas ---------- */

/**
 * Los `status` vienen del catálogo de Meta y el contrato los tipa como cadena
 * libre: son suyos, no nuestros, y la lista crece cuando ellos quieran.
 *
 * Lo que de verdad decide si se puede enviar **no es esta tabla**: es `canSend`,
 * que lo firma el backend. Aquí solo se traduce lo que se enseña.
 */
const TEMPLATE_STATUSES: Record<string, { label: string; tone: StatusTone }> = {
  APPROVED: { label: 'Aprobada', tone: 'success' },
  PENDING: { label: 'En revisión', tone: 'warning' },
  REJECTED: { label: 'Rechazada', tone: 'destructive' },
  PAUSED: { label: 'Pausada por Meta', tone: 'warning' },
  DISABLED: { label: 'Deshabilitada', tone: 'muted' },
}

export function templateStatus(template: WhatsAppTemplate): { label: string; tone: StatusTone } {
  return (
    TEMPLATE_STATUSES[template.status] ?? {
      label: template.status,
      tone: template.canSend ? 'success' : 'muted',
    }
  )
}

/**
 * Una plantilla de la plataforma sirve a todas las organizaciones; una propia es
 * de esta. `organizationId` en `null` es lo primero.
 */
export function isPlatformTemplate(template: WhatsAppTemplate): boolean {
  return template.organizationId == null
}
