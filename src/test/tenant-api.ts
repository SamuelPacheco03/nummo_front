/**
 * La organización y sus capacidades, para los tests que montan una pantalla
 * completa sobre `fetch`.
 *
 * Existe porque tres archivos del asistente repetían el mismo par —lista de
 * organizaciones y capacidades— y cada uno se enteraba por su cuenta cuando el
 * contrato añadía un campo. Lo que la app pide al entrar es siempre lo mismo;
 * lo que cambia entre pruebas es qué contesta el endpoint del turno.
 */

export const ORG_ID = '11111111-1111-4111-8111-111111111111'

/**
 * `status` no es decorativo: una organización que no está activa queda en solo
 * lectura y `useCan` apaga toda escritura (§45.4).
 */
export const ORG = {
  organization: { id: ORG_ID, name: 'Demo', type: 'GENERIC', status: 'ACTIVE' },
  role: 'OWNER',
}

/** Un OWNER de un plan sin topes: lo que no se esté probando, que no estorbe. */
export const CAPABILITIES = {
  organizationId: ORG_ID,
  role: 'OWNER',
  permissions: [
    'assistant.use',
    'assistant.settings.read',
    'assistant.settings.manage',
    'subscription.read',
    'subscription.manage',
  ],
  planCode: 'PRO',
  features: {
    ai_byok: true,
    custom_roles: true,
    accounting: false,
    bank_reconciliation: false,
    approvals: false,
    api_access: false,
    notifications_email: false,
    notifications_whatsapp: false,
  },
  limits: {
    max_contacts: null,
    max_users: null,
    max_branches: null,
    ai_messages_monthly: null,
    voice_minutes_monthly: null,
  },
  period: '2026-08',
  usage: { ai_messages_monthly: 0, voice_minutes_monthly: 0 },
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Lo que la app pide nada más entrar: token CSRF, organizaciones y capacidades.
 * Devuelve `null` si la URL no es ninguna de las tres, para que quien llame siga
 * con lo suyo.
 *
 * **Las capacidades van antes que la lista** a propósito: su URL también empieza
 * por `/api/v1/organizations`, así que el orden inverso las serviría como si
 * fueran la lista y todo permiso saldría negado.
 */
export function tenantApiResponse(url: string): Response | null {
  if (url.includes('/auth/csrf')) return json({ csrfToken: 'tok' })
  if (url.includes('/me/capabilities')) return json(CAPABILITIES)
  if (url.includes('/api/v1/organizations')) return json([ORG])
  return null
}
