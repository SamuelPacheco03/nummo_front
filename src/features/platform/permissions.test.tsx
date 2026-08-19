import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { CapabilitiesDto, OrganizationStatus } from '@/api/generated/model'

const caps = vi.hoisted(() => ({ current: undefined as CapabilitiesDto | undefined }))
const estado = vi.hoisted(() => ({ current: 'ACTIVE' as OrganizationStatus }))

vi.mock('./hooks', () => ({
  useCapabilities: () => ({ capabilities: caps.current, isLoading: false, isError: false }),
}))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { status: estado.current } }),
}))

const { useCan, useOrgReadOnly } = await import('./permissions')

const SONDAS = ['payments.create', 'payments.reverse', 'payments.read'] as const

function Sonda() {
  const can = useCan()
  const { isReadOnly } = useOrgReadOnly()
  return (
    <ul>
      <li>{`solo lectura: ${isReadOnly ? 'sí' : 'no'}`}</li>
      {SONDAS.map((p) => (
        <li key={p}>{`${p}: ${can(p) ? 'sí' : 'no'}`}</li>
      ))}
    </ul>
  )
}

afterEach(() => {
  caps.current = undefined
  estado.current = 'ACTIVE'
  cleanup()
})

function capacidades(permissions: CapabilitiesDto['permissions']): CapabilitiesDto {
  return {
    organizationId: 'o1',
    role: 'OPERATOR',
    permissions,
    planCode: 'FREE',
    features: {
      ai_byok: false,
      custom_roles: false,
      accounting: false,
      bank_reconciliation: false,
      approvals: false,
      api_access: false,
    },
    limits: {
      max_contacts: 30,
      max_users: 1,
      max_branches: 1,
      ai_messages_monthly: 50,
      voice_minutes_monthly: 10,
    },
    period: '2026-08',
    usage: { ai_messages_monthly: 0, voice_minutes_monthly: 0 },
  }
}

test('concede exactamente lo que trae `permissions`, no lo que sugiere el rol', () => {
  // Un OPERATOR de hoy sí registra pagos y no los reversa; lo que decide es la
  // lista, de modo que un rol personalizado con otra mezcla funciona sin tocar
  // una línea de pantalla.
  caps.current = capacidades(['payments.create', 'payments.read'])
  render(<Sonda />)

  expect(screen.getByText('payments.create: sí')).toBeInTheDocument()
  expect(screen.getByText('payments.reverse: no')).toBeInTheDocument()
})

test('mientras no hay capacidades no concede nada', () => {
  // El lado seguro: una acción que aparece un instante después no rompe nada;
  // una que se ofrece y responde 403, sí.
  render(<Sonda />)

  expect(screen.getByText('payments.create: no')).toBeInTheDocument()
  expect(screen.getByText('payments.read: no')).toBeInTheDocument()
})

test('suspendida: se sigue leyendo todo y no se escribe nada', () => {
  // Lo que el backend hace en `requireTenant`: bloquea lo que no es un GET. La
  // UI lo refleja **antes** del intento, para que no haya que chocar con un 403
  // por cada botón.
  caps.current = capacidades(['payments.create', 'payments.reverse', 'payments.read'])
  estado.current = 'SUSPENDED'
  render(<Sonda />)

  expect(screen.getByText('solo lectura: sí')).toBeInTheDocument()
  expect(screen.getByText('payments.read: sí')).toBeInTheDocument()
  expect(screen.getByText('payments.create: no')).toBeInTheDocument()
  expect(screen.getByText('payments.reverse: no')).toBeInTheDocument()
})

test('archivada cuenta igual que suspendida', () => {
  caps.current = capacidades(['payments.create'])
  estado.current = 'ARCHIVED'
  render(<Sonda />)

  expect(screen.getByText('solo lectura: sí')).toBeInTheDocument()
  expect(screen.getByText('payments.create: no')).toBeInTheDocument()
})
