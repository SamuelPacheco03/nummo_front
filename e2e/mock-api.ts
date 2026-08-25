import type { Page } from '@playwright/test'

/**
 * **El API doblada, para poder mirar la app sin backend.**
 *
 * Existe por una carencia concreta: en el contenedor donde se desarrolla no hay
 * `nummo-api`, así que las pantallas se entregaban razonadas pero **nunca
 * vistas** — y dos veces seguidas se coló un problema de maquetación que un solo
 * vistazo habría cazado.
 *
 * No sustituye a los e2e de `flujo-maestro`: aquellos prueban el sistema entero
 * contra el backend de verdad. Esto es un espejo para **mirar**, así que sus
 * datos están elegidos para que las pantallas se vean llenas y realistas, no
 * para afirmar nada.
 *
 * Lo que no esté en la tabla se contesta con una página vacía en vez de fallar:
 * una pantalla a medio pintar por un 404 despista más que una lista sin filas.
 */

const ORG_ID = '11111111-1111-4111-8111-111111111111'

const ORG = {
  id: ORG_ID,
  name: 'Semillas de Alegría',
  legalName: 'Semillas de Alegría S.A.S.',
  taxId: '901234567-1',
  type: 'SCHOOL',
  status: 'ACTIVE',
  timezone: 'America/Bogota',
  locale: 'es-CO',
  defaultCurrency: 'COP',
  contactPhone: '+57 310 594 8908',
  contactEmail: 'cartera@semillasdealegria.co',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
}

const FEATURES = {
  ai_byok: true,
  custom_roles: true,
  accounting: true,
  bank_reconciliation: false,
  approvals: true,
  api_access: false,
  notifications_email: true,
  notifications_whatsapp: true,
  whatsapp_outbound: true,
  whatsapp_byo: true,
}

/** Todos: lo que se está mirando es la maqueta, y un permiso ausente la recorta. */
const PERMISOS = [
  'messaging.read', 'messaging.settings.manage', 'messaging.send',
  'whatsapp.templates.read', 'whatsapp.templates.manage', 'whatsapp.settings.read',
  'whatsapp.settings.manage', 'financial_accounts.read', 'financial_accounts.manage',
  'financial_accounts.publish', 'organization.manage', 'organization.members.read',
  'organization.roles.read', 'subscription.read', 'contacts.read', 'receivables.read',
  'payments.read', 'expenses.read', 'reports.read', 'notifications.read',
  'notifications.settings.manage', 'payment_methods.manage', 'billing_concepts.manage',
]

function plantilla(over: Record<string, unknown> = {}) {
  return {
    id: 't1', organizationId: null, templateKey: 'cobro_vencido',
    name: 'cobro_vencido',  // el nombre en Meta; la UI enseña displayName displayName: 'Vencida — solo recordatorio',
    purpose: 'El aviso de mora de una sola cuenta.',
    language: 'es', category: 'UTILITY', status: 'APPROVED', canSend: true,
    parameterNames: ['nombre', 'monto', 'dias'],
    rejectedReason: null, lastSyncedAt: '2026-08-20T10:00:00Z', createdAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}

const TEMPLATES = [
  plantilla({ id: 't1', templateKey: 'cobro_por_vencer', displayName: 'Por vencer', purpose: 'Avisa de una cuenta que está por vencer.', parameterNames: ['nombre', 'monto', 'fecha'] }),
  plantilla({ id: 't2', templateKey: 'cobro_por_vencer_v2', displayName: 'Por vencer — dice dónde pagar', purpose: 'Avisa de una cuenta por vencer y dice dónde pagarla.', parameterNames: ['nombre', 'monto', 'fecha', 'como_pagar'] }),
  plantilla({ id: 't3', templateKey: 'cobro_por_vencer_resumen_v2', displayName: 'Varias por vencer', purpose: 'Varias cuentas por vencer, con el total.', parameterNames: ['nombre', 'monto', 'cuantas', 'como_pagar'] }),
  plantilla({ id: 't4', templateKey: 'cobro_vencido_v2', displayName: 'Vencida — dice dónde pagar', purpose: 'El aviso de mora de una sola cuenta, con los datos de pago.', parameterNames: ['nombre', 'monto', 'dias', 'como_pagar'] }),
  plantilla({ id: 't5', templateKey: 'cobro_vencido_resumen_v2', displayName: 'Varias vencidas', purpose: 'Varias cuentas vencidas, con el saldo total.', parameterNames: ['nombre', 'monto', 'cuantas', 'como_pagar'], status: 'PENDING', canSend: false }),
]

const CUENTAS = [
  {
    id: 'a1', branchId: null, name: 'Bancolombia principal', accountType: 'BANK',
    currency: 'COP', openingBalance: '0.00', openingBalanceDate: '2026-01-01',
    paymentDetails: { kind: 'BANK', bankName: 'Bancolombia', accountKind: 'SAVINGS', accountNumber: '123-456789-00', holderName: 'Semillas de Alegría S.A.S.', holderDocument: 'NIT 901234567', transferKeyKind: 'PHONE', transferKeyValue: '3105948908' },
    paymentPreview: 'Bancolombia ahorros 123-456789-00 a nombre de Semillas de Alegría S.A.S.',
    publishInReminders: true, sortOrder: 0, isActive: true,
    createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'a2', branchId: null, name: 'Caja general', accountType: 'CASH',
    currency: 'COP', openingBalance: '250000.00', openingBalanceDate: '2026-01-01',
    paymentDetails: null, paymentPreview: null, publishInReminders: false,
    sortOrder: 1, isActive: true,
    createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-08-01T10:00:00Z',
  },
]

const POLICY = {
  enabled: true, quietStart: '22:00', quietEnd: '07:00',
  dueSoonTemplateKey: 'cobro_por_vencer_v2',
  dueSoonSummaryTemplateKey: 'cobro_por_vencer_resumen_v2',
  overdueTemplateKey: 'cobro_vencido_v2',
  overdueSummaryTemplateKey: null,
  sendAt: '12:00', paymentLink: 'https://pagos.semillasdealegria.co',
  daysBefore: 3, remindOnDueDate: true, daysAfter: 1,
  sendDays: [1, 2, 3, 4, 5, 6], skipHolidays: true,
  schedule: {
    editable: false, legalReference: 'Ley 2300 de 2023, art. 3',
    week: {
      '1': { start: '07:00', end: '19:00' }, '2': { start: '07:00', end: '19:00' },
      '3': { start: '07:00', end: '19:00' }, '4': { start: '07:00', end: '19:00' },
      '5': { start: '07:00', end: '19:00' }, '6': { start: '08:00', end: '15:00' },
      '7': null,
    },
    excludesHolidays: true, maxRemindersPerReceivable: 3,
    sendableRange: { earliest: '08:00', latest: '14:59' },
  },
  updatedAt: '2026-08-20T10:00:00Z',
}

/** Una página vacía con la forma que espera `normalize()`. */
const VACIO = { data: [], page: 1, pageSize: 20, total: 0, totalPages: 1 }

function pagina(items: unknown[]) {
  return { data: items, page: 1, pageSize: 20, total: items.length, totalPages: 1 }
}

/** Ruta → cuerpo. La primera que casa gana, así que van de lo específico a lo general. */
const RUTAS: [RegExp, unknown][] = [
  [/\/auth\/me$/, { id: 'u1', email: 'demo@nummo.app', fullName: 'Samuel Pacheco', isPlatformAdmin: false }],
  [/\/organizations$/, [{ organization: ORG, role: 'OWNER' }]],
  [/\/me\/capabilities$/, {
    organizationId: ORG_ID, role: 'OWNER', permissions: PERMISOS, planCode: 'PRO',
    features: FEATURES,
    limits: { max_contacts: 1500, max_users: 10, max_branches: 5, ai_messages_monthly: 1500, voice_minutes_monthly: 150, vision_documents_monthly: 600, whatsapp_messages_monthly: 1500 },
    period: '2026-08',
    usage: { ai_messages_monthly: 212, voice_minutes_monthly: 8, vision_documents_monthly: 31, whatsapp_messages_monthly: 6 },
  }],
  [/\/messaging\/collection-policy$/, POLICY],
  // Este NO viene paginado: el contrato lo declara como { templates: [...] }.
  [/\/whatsapp\/templates/, { templates: TEMPLATES }],
  [/\/financial-accounts/, pagina(CUENTAS)],
  [/\/organizations\/[^/]+$/, ORG],
  [/\/branches/, pagina([{ id: 'b1', name: 'Sede principal', isActive: true }])],
]

/**
 * Intercepta el API del inquilino. Se llama **antes** de navegar.
 *
 * El flujo de eventos en vivo se corta en seco: una conexión que no termina deja
 * a Playwright esperando y la captura sale en blanco.
 */
export async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.includes('/stream') || url.pathname.endsWith('/events')) {
      return route.abort()
    }
    if (route.request().method() !== 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }

    const encontrada = RUTAS.find(([re]) => re.test(url.pathname))
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(encontrada ? encontrada[1] : VACIO),
    })
  })
}
