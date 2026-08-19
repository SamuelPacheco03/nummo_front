import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { CapabilitiesDto, PublicPlan } from '@/api/generated/model'

const estado = vi.hoisted(() => ({
  capabilities: undefined as CapabilitiesDto | undefined,
  plans: [] as PublicPlan[],
  contactos: 0,
  miembros: 1,
  sedes: 1,
}))

vi.mock('./hooks', () => ({
  useCapabilities: () => ({
    capabilities: estado.capabilities,
    isLoading: false,
    isError: false,
  }),
  usePlans: () => ({
    plans: estado.plans,
    isLoading: false,
    isError: false,
    error: null,
  }),
}))
vi.mock('./use-limit-usage', async () => {
  const { limitLabel, isPeriodicLimit } = await import('./labels')
  return {
    useLimitUsage: () => ({
      period: estado.capabilities?.period,
      limits: [
        { key: 'max_contacts', label: limitLabel('max_contacts'), used: estado.contactos, max: estado.capabilities?.limits.max_contacts ?? null, periodic: false },
        { key: 'max_users', label: limitLabel('max_users'), used: estado.miembros, max: estado.capabilities?.limits.max_users ?? null, periodic: false },
        { key: 'ai_messages_monthly', label: limitLabel('ai_messages_monthly'), used: estado.capabilities?.usage.ai_messages_monthly ?? null, max: estado.capabilities?.limits.ai_messages_monthly ?? null, periodic: isPeriodicLimit('ai_messages_monthly') },
      ],
    }),
  }
})

const { PlanPage } = await import('./plan-page')

const SIN_FEATURES = {
  ai_byok: false,
  custom_roles: false,
  accounting: false,
  bank_reconciliation: false,
  approvals: false,
  api_access: false,
}

function plan(over: Partial<PublicPlan>): PublicPlan {
  return {
    code: 'FREE',
    name: 'Free',
    description: null,
    sortOrder: 0,
    price: { amount: '0.00', currency: 'COP' },
    features: SIN_FEATURES,
    limits: {
      max_contacts: 30,
      max_users: 1,
      max_branches: 1,
      ai_messages_monthly: 50,
      voice_minutes_monthly: 10,
    },
    ...over,
  }
}

function capacidades(over: Partial<CapabilitiesDto> = {}): CapabilitiesDto {
  return {
    organizationId: 'o1',
    role: 'OWNER',
    permissions: [],
    planCode: 'BASIC',
    features: SIN_FEATURES,
    limits: {
      max_contacts: 200,
      max_users: 3,
      max_branches: 1,
      ai_messages_monthly: 300,
      voice_minutes_monthly: 30,
    },
    period: '2026-08',
    usage: { ai_messages_monthly: 120, voice_minutes_monthly: 4 },
    ...over,
  }
}

afterEach(() => {
  estado.capabilities = undefined
  estado.plans = []
  estado.contactos = 0
  cleanup()
})

test('el consumo se lee contra el tope, con las dos cifras', () => {
  estado.capabilities = capacidades()
  estado.contactos = 180
  render(<PlanPage />)

  expect(screen.getByText('Básico')).toBeInTheDocument()
  expect(screen.getByText('180 de 200')).toBeInTheDocument()
  expect(screen.getByText('120 de 300')).toBeInTheDocument()
})

test('un tope en null es «sin límite», nunca cero', () => {
  estado.capabilities = capacidades({
    planCode: 'ENTERPRISE',
    limits: {
      max_contacts: null,
      max_users: null,
      max_branches: null,
      ai_messages_monthly: null,
      voice_minutes_monthly: null,
    },
  })
  estado.contactos = 4200
  render(<PlanPage />)

  expect(screen.getByText('4.200 de Sin límite')).toBeInTheDocument()
})

test('un precio en null es «consultar», no gratis', () => {
  // El plan gratuito trae 0.00; los que aún no tienen precio fijado llegan en
  // null, y pintarlos como cero prometería algo que nadie ha decidido.
  estado.capabilities = capacidades()
  estado.plans = [
    plan({ code: 'FREE', name: 'Free', price: { amount: '0.00', currency: 'COP' } }),
    plan({ code: 'BASIC', name: 'Básico', price: null }),
  ]
  render(<PlanPage />)

  expect(screen.getByText('$0 / mes')).toBeInTheDocument()
  expect(screen.getByText('Consultar')).toBeInTheDocument()
})

test('el plan contratado se distingue de los demás', () => {
  estado.capabilities = capacidades({ planCode: 'BASIC' })
  estado.plans = [plan({ code: 'FREE', name: 'Free' }), plan({ code: 'BASIC', name: 'Básico', price: null })]
  render(<PlanPage />)

  expect(within(screen.getByRole('group', { name: 'Básico' })).getByText('Tu plan')).toBeInTheDocument()
  expect(within(screen.getByRole('group', { name: 'Free' })).queryByText('Tu plan')).toBeNull()
})

test('las features que ningún plan incluye todavía no se listan', () => {
  // Existen como clave desde ya y se encenderán al construirse; anunciarlas hoy
  // como «✗» en las cuatro columnas es ruido que no compara nada.
  estado.capabilities = capacidades()
  estado.plans = [
    plan({ code: 'FREE', name: 'Free' }),
    plan({ code: 'PRO', name: 'Pro', features: { ...SIN_FEATURES, ai_byok: true } }),
  ]
  render(<PlanPage />)

  expect(screen.getAllByText('Usar tu propia llave de IA')).toHaveLength(2)
  expect(screen.queryByText('Conciliación bancaria')).not.toBeInTheDocument()
})
