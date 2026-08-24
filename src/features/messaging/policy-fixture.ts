import type { CollectionPolicy, CollectionPolicySchedule } from '@/api/generated/model'

/**
 * El horario de cobranza **tal y como lo fija la Ley 2300 de 2023, art. 3**: no
 * es una preferencia de la organización, así que llega resuelto del backend y
 * aquí solo se reproduce para las pruebas.
 *
 * Los días van en ISO —1 es lunes, 7 domingo— y **el domingo es `null`**, que no
 * es lo mismo que una franja vacía: es «no se contacta».
 *
 * `sendableRange` no es el horario de un día: es la intersección de todos, porque
 * la hora elegida tiene que caber cualquier día de la semana.
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
    // Siempre 3, y viene en la respuesta para no escribirlo a mano en el texto:
    // no es un tope que se comprueba, es que no existen más etapas.
    maxRemindersPerReceivable: 3,
    /*
      La franja en la que se puede elegir la hora de envío, y sale más estrecha
      que cualquiera de los días: tiene que valer **todos**, y el sábado cierra a
      las tres. Es `[inicio, fin)`, así que las 15:00 NO son válidas — el último
      minuto que envía es el 14:59.
    */
    sendableRange: { earliest: '08:00', latest: '14:59' },
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
    // Las tres etapas por las que pasa una cuenta por cobrar, **una sola vez cada
    // una en toda su vida**. Se configura el cuándo, nunca el cuántos.
    daysBefore: 3,
    remindOnDueDate: true,
    // A propósito NO es 0: con `daysAfter: 0` la mora sale el mismo día del
    // vencimiento y le gana al aviso de «vence hoy», que es un caso aparte.
    daysAfter: 1,
    // El defecto del backend, y el mediodía cae dentro de la franja todos los días.
    sendAt: '12:00',
    /*
      El enlace de pago **no es una cuenta**: el dinero no vive en una URL. Es uno
      solo y va en la política, al lado de las cuentas publicadas y no dentro de
      ellas.
    */
    paymentLink: null,
    // Días ISO: 1 es lunes y 7 domingo. Lunes a sábado es el defecto del backend.
    sendDays: [1, 2, 3, 4, 5, 6],
    skipHolidays: true,
    schedule: horarioLegal(),
    updatedAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}
