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
