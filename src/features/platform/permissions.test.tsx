import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { CapabilitiesDto } from '@/api/generated/model'

const caps = vi.hoisted(() => ({ current: undefined as CapabilitiesDto | undefined }))
vi.mock('./hooks', () => ({
  useCapabilities: () => ({ capabilities: caps.current, isLoading: false, isError: false }),
}))

const { useCan } = await import('./permissions')

function Sonda() {
  const can = useCan()
  return (
    <ul>
      {(['payments.create', 'payments.reverse'] as const).map((p) => (
        <li key={p}>{`${p}: ${can(p) ? 'sí' : 'no'}`}</li>
      ))}
    </ul>
  )
}

afterEach(() => {
  caps.current = undefined
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
  caps.current = capacidades(['payments.create'])
  render(<Sonda />)

  expect(screen.getByText('payments.create: sí')).toBeInTheDocument()
  expect(screen.getByText('payments.reverse: no')).toBeInTheDocument()
})

test('mientras no hay capacidades no concede nada', () => {
  // El lado seguro: una acción que aparece un instante después no rompe nada;
  // una que se ofrece y responde 403, sí.
  render(<Sonda />)

  expect(screen.getByText('payments.create: no')).toBeInTheDocument()
  expect(screen.getByText('payments.reverse: no')).toBeInTheDocument()
})
