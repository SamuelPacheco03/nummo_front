import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { CapabilitiesDto } from '@/api/generated/model'

const estado = vi.hoisted(() => ({
  capabilities: undefined as CapabilitiesDto | undefined,
  contactos: 0,
  miembros: 0,
  sedes: 0,
}))

vi.mock('./hooks', () => ({
  useCapabilities: () => ({ capabilities: estado.capabilities }),
}))
vi.mock('@/features/contacts/hooks', () => ({
  useContacts: () => ({ total: estado.contactos, isLoading: false }),
}))
vi.mock('@/features/config/hooks', () => ({
  useMembers: () => ({ members: Array(estado.miembros).fill({}), isLoading: false }),
  useBranches: () => ({ branches: Array(estado.sedes).fill({}), isLoading: false }),
}))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1' }),
}))

const { useLimitUsage } = await import('./use-limit-usage')
const { LIMIT_KEYS } = await import('./labels')

function capacidades(): CapabilitiesDto {
  return {
    organizationId: 'o1',
    role: 'OWNER',
    permissions: [],
    planCode: 'PRO',
    features: {
      ai_byok: false,
      custom_roles: false,
      accounting: false,
      bank_reconciliation: false,
      approvals: false,
      api_access: false,
      notifications_email: false,
      notifications_whatsapp: false,
      whatsapp_outbound: true,
      whatsapp_byo: false,
    },
    limits: {
      max_contacts: 1500,
      max_users: 10,
      max_branches: 5,
      ai_messages_monthly: 1500,
      voice_minutes_monthly: 150,
      whatsapp_messages_monthly: 1000,
    },
    period: '2026-08',
    usage: {
      ai_messages_monthly: 0,
      voice_minutes_monthly: 0,
      whatsapp_messages_monthly: 37,
    },
  }
}

beforeEach(() => {
  estado.capabilities = capacidades()
  estado.contactos = 57
  estado.miembros = 2
  estado.sedes = 1
})
afterEach(() => vi.clearAllMocks())

test('se pinta un medidor por cada tope del contrato, sin dejarse ninguno', () => {
  /*
    El fallo que esto vigila: la lista de medidores se escribía a mano aparte de
    `LIMIT_KEYS`, así que el cupo de cobranza llegó al contrato y a las tarjetas
    de plan y en «Plan y consumo» no aparecía por ninguna parte.
  */
  const { result } = renderHook(() => useLimitUsage())
  expect(result.current.limits.map((l) => l.key)).toEqual([...LIMIT_KEYS])
})

test('el cupo de cobranza trae su consumo, no un hueco', () => {
  const { result } = renderHook(() => useLimitUsage())
  const cupo = result.current.limits.find((l) => l.key === 'whatsapp_messages_monthly')

  expect(cupo).toMatchObject({ used: 37, max: 1000, periodic: true })
  expect(cupo?.label).not.toBe('whatsapp_messages_monthly')
})

test('los aforos cuentan filas y las cuotas leen el consumo del servidor', () => {
  const { result } = renderHook(() => useLimitUsage())
  const por = (key: string) => result.current.limits.find((l) => l.key === key)

  // Aforo: lo cuenta la propia lista, y no se reinicia solo.
  expect(por('max_contacts')).toMatchObject({ used: 57, max: 1500, periodic: false })
  // Cuota: la lleva el servidor, que es donde se cobra.
  expect(por('ai_messages_monthly')).toMatchObject({ used: 0, periodic: true })
})

test('sin capacidades todavía, los topes van en null y no en cero', () => {
  // Un tope en cero diría «no te queda nada»; en null es «todavía no lo sé».
  estado.capabilities = undefined
  const { result } = renderHook(() => useLimitUsage())

  expect(result.current.limits).toHaveLength(LIMIT_KEYS.length)
  expect(result.current.limits.every((l) => l.max === null)).toBe(true)
  expect(result.current.period).toBeUndefined()
})
