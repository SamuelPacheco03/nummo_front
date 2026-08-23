import type { CollectionPolicy, CollectionPolicySchedule } from '@/api/generated/model'

/**
 * El horario de cobranza **tal y como lo fija la Ley 2300 de 2023, art. 3**: no
 * es una preferencia de la organización, así que llega resuelto del backend y
 * aquí solo se reproduce para las pruebas.
 *
 * Los días van en ISO —1 es lunes, 7 domingo— y **el domingo es `null`**, que no
 * es lo mismo que una franja vacía: es «no se contacta».
 *
 * Ojo con los tres números de cadencia: solo el máximo diario sale de la ley.
 * `maxContactsPerWindow` y `minDaysBetweenContacts` son decisión de producto —más
 * estricta que la norma— y ningún texto de la interfaz debe atribuírselos a ella.
 */
export function horarioLegal(over: Partial<CollectionPolicySchedule> = {}): CollectionPolicySchedule {
  return {
    editable: false,
    legalReference: 'Ley 2300 de 2023, art. 3',
    week: {
      '1': { start: '07:00', end: '19:00' },
      '2': { start: '07:00', end: '19:00' },
      '3': { start: '07:00', end: '19:00' },
      '4': { start: '07:00', end: '19:00' },
      '5': { start: '07:00', end: '19:00' },
      '6': { start: '08:00', end: '15:00' },
      '7': null,
    },
    excludesHolidays: true,
    maxContactsPerWindow: 2,
    windowDays: 7,
    minDaysBetweenContacts: 3,
    ...over,
  }
}

/**
 * Una política de cobranza para pruebas, **una sola vez para las dos pantallas**
 * que la necesitan: la de configuración y la sección del acuerdo. Duplicada se
 * quedaba coja de un lado a cada campo nuevo del contrato, que es exactamente lo
 * que acaba de pasar con `dueSoonSummaryTemplateKey`.
 */
export function politicaDeCobranza(over: Partial<CollectionPolicy> = {}): CollectionPolicy {
  return {
    enabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
    dueSoonTemplateKey: 'cobro_por_vencer',
    dueSoonSummaryTemplateKey: 'cobro_por_vencer_resumen',
    overdueTemplateKey: 'cobro_vencido',
    overdueSummaryTemplateKey: 'cobro_vencido_resumen',
    // Días ISO: 1 es lunes y 7 domingo. Lunes a sábado es el defecto del backend.
    sendDays: [1, 2, 3, 4, 5, 6],
    skipHolidays: true,
    schedule: horarioLegal(),
    updatedAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}
