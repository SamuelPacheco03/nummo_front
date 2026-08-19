import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

const m = vi.hoisted(() => ({
  guardar: vi.fn(),
  avisos: [] as string[],
  umbral: null as string | null,
  feature: true,
  permisos: new Set<string>(['organization.manage']),
}))

vi.mock('sonner', () => ({
  toast: { success: (t: string) => m.avisos.push(t), error: (t: string) => m.avisos.push(t) },
}))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { defaultCurrency: 'COP' } }),
}))
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => m.permisos.has(permiso),
  useFeature: () => m.feature,
}))
vi.mock('./hooks', () => ({
  useOrgSettings: () => ({
    settings: { disbursementApprovalThreshold: m.umbral },
    isPending: false,
    isError: false,
    error: null,
  }),
  useUpdateApprovalPolicy: () => ({ mutateAsync: m.guardar, isPending: false }),
}))

const { ApprovalPolicyPage } = await import('./approval-policy-page')

const pintar = () =>
  render(
    <MemoryRouter>
      <ApprovalPolicyPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.guardar = vi.fn().mockResolvedValue({})
  m.avisos = []
  m.umbral = null
  m.feature = true
  m.permisos = new Set(['organization.manage'])
})
afterEach(cleanup)

test('vacío apaga la política: es «sin umbral», no «umbral cero»', async () => {
  // Un cero haría pasar por aprobación hasta el café.
  m.umbral = '5000000'
  pintar()
  await userEvent.clear(screen.getByLabelText(/Monto a partir del cual/))
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: { disbursementApprovalThreshold: null },
  })
  expect(m.avisos.at(-1)).toBe('Aprobaciones desactivadas')
})

test('el umbral vigente se dice con su moneda', () => {
  m.umbral = '5000000'
  pintar()

  expect(screen.getByText('$5.000.000,00')).toBeInTheDocument()
})

test('sin la feature se explica y no se puede guardar', () => {
  m.feature = false
  pintar()

  expect(screen.getByText(/Las aprobaciones son de un plan superior/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
})

test('dice lo que cambia al ponerlo, que es lo que no se ve venir', () => {
  pintar()

  expect(screen.getByText(/no sale dinero hasta que alguien/)).toBeInTheDocument()
  expect(screen.getByText(/quien lo registró no puede aprobarlo/)).toBeInTheDocument()
})
