import { formatDateHuman } from '@/lib/format'
import type { ChatMessage } from './types'

/**
 * Heurística de refresco tras un turno de chat.
 *
 * Numi no solo consulta: también registra operaciones (contactos, ingresos,
 * egresos, contratos, transferencias). El endpoint devuelve texto plano, sin
 * indicar si escribió, así que deducimos cuándo conviene refrescar las vistas.
 *
 * Dos señales, cualquiera basta:
 *  1. El usuario acaba de CONFIRMAR. Toda escritura es conversacional en dos
 *     pasos (resumen → "sí"), así que una afirmación es la antesala exacta de
 *     un registro.
 *  2. La respuesta habla en pasado de algo aplicado ("registré", "creé"…).
 *
 * Un falso positivo cuesta poco: `invalidateQueries()` solo re-consulta las
 * queries ACTIVAS (las montadas en la pantalla visible); el resto solo queda
 * marcado como obsoleto. Un falso negativo, en cambio, deja saldos viejos en
 * pantalla, y eso sí desorienta.
 */

/** minúsculas, sin acentos ni puntuación, espacios colapsados. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Frases con las que se acepta el resumen que propone Numi. */
const AFFIRMATIVE_PREFIXES = [
  'si',
  'sip',
  'sisi',
  'claro',
  'dale',
  'ok',
  'okey',
  'okay',
  'listo',
  'confirmo',
  'confirmado',
  'confirma',
  'confirmalo',
  'confirmar',
  'correcto',
  'exacto',
  'asi es',
  'adelante',
  'hazlo',
  'haslo',
  'hagalo',
  'procede',
  'proceder',
  'afirmativo',
  'de una',
  'de acuerdo',
  'por supuesto',
  'esta bien',
  'vale',
  'perfecto',
  'apruebo',
  'aprobado',
  'yes',
  'yep',
]

/** Palabras con las que Numi reporta algo YA aplicado. */
const APPLIED_MARKERS =
  /\b(registre|registrado|registrada|registrados|registradas|cree|creado|creada|guarde|guardado|guardada|transferi|transferido|transferida|abone|abonado|aplique|aplicado|aplicada|actualice|actualizado|actualizada|elimine|eliminado|eliminada)\b/

/**
 * ¿El mensaje es un "sí" al resumen de Numi? Se limita a mensajes cortos para
 * no confundir un "ok, pero explícame otra vez cómo funciona la mora" con una
 * confirmación.
 */
export function isConfirmation(userMessage: string): boolean {
  const text = normalize(userMessage)
  if (!text) return false
  if (text.split(' ').length > 8) return false
  return AFFIRMATIVE_PREFIXES.some((p) => text === p || text.startsWith(`${p} `))
}

/** ¿La respuesta anuncia una operación ya aplicada? */
export function mentionsAppliedChange(reply: string): boolean {
  return APPLIED_MARKERS.test(normalize(reply))
}

/** ¿Conviene invalidar el cache de TanStack Query tras este turno? */
export function shouldRefreshData(userMessage: string, reply: string): boolean {
  return isConfirmation(userMessage) || mentionsAppliedChange(reply)
}

/** Hora local corta para la marca de tiempo de cada burbuja. */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Marca de tiempo de una fila de la lista de conversaciones.
 *
 * Lo de hoy lleva hora y lo demás lleva fecha, que es la pregunta que se hace al
 * mirar una lista de chats: de hoy interesa cuándo, y de la semana pasada interesa
 * qué día. Reutiliza las dos piezas que ya existen en vez de inventar un formato.
 */
export function formatConversationStamp(iso: string, today: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  return sameDay ? formatTime(iso) : formatDateHuman(iso, today)
}

/** Cuánto silencio rompe una tanda de mensajes seguidos del mismo lado. */
const GROUP_GAP_MS = 5 * 60 * 1000

/**
 * Día local de una marca ISO, como `YYYY-MM-DD`.
 *
 * Recortar los diez primeros caracteres del ISO daría el día **en UTC**, y en Colombia
 * eso adelanta la fecha cinco horas: un mensaje de las 9 de la noche aparecería bajo el
 * separador de mañana. El día tiene que salir del reloj de quien lee.
 */
function localDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/** Un mensaje del hilo con lo que hay que dibujar alrededor. */
export interface ThreadRow {
  message: ChatMessage
  /** Etiqueta del día cuando cambia respecto al anterior; null mientras siga el mismo. */
  daySeparator: string | null
  /**
   * Sigue a otro del mismo lado y de hace poco. La cara de Numi no se repite en cada
   * burbuja de una misma respuesta: en un hilo largo, repetirla convierte la
   * conversación en una columna de avatares.
   */
  grouped: boolean
}

/**
 * Prepara el hilo para pintarlo: dónde va un separador de fecha y qué mensajes son
 * continuación del anterior.
 *
 * Es una función aparte y pura porque decide sobre la lista entera —cada fila depende
 * de la de antes—, y así se prueba sin montar nada.
 */
export function buildThreadRows(messages: ChatMessage[], today: Date = new Date()): ThreadRow[] {
  let lastDay = ''
  return messages.map((message, i) => {
    const day = localDay(message.at)
    const cambioDeDia = day !== lastDay
    lastDay = day

    const previo = i > 0 ? messages[i - 1] : undefined
    const cerca =
      previo !== undefined &&
      new Date(message.at).getTime() - new Date(previo.at).getTime() < GROUP_GAP_MS

    return {
      message,
      daySeparator: cambioDeDia ? capitalize(formatDateHuman(day, today)) : null,
      // Un separador de fecha corta la tanda: lo que queda debajo empieza de nuevo.
      grouped: !cambioDeDia && previo?.role === message.role && cerca,
    }
  })
}
