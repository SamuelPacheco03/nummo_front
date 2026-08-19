import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { runAccountDetailSuite } from '@/test/account-detail-suite'
import { ReceivableDetailPage } from './receivable-detail-page'

const m = vi.hoisted(() => ({
  cancelar: vi.fn(),
  castigar: vi.fn(),
  avisos: [] as { tono: string; texto: string }[],
  falla: false,
  cerrada: false,
  permisos: new Set<string>(['receivables.adjust', 'receivables.manage', 'payments.create']),
  mora: '0',
}))

const detalle = () => ({
  receivable: {
    id: 'a1',
    payerContactId: 'c1',
    billingConceptId: 'k1',
    state: 'OPEN',
    originalAmount: '1000000',
    currency: 'COP',
    dueDate: '2026-08-05',
    issueDate: '2026-07-05',
    notes: 'Con nota',
  },
  balance: {
    displayStatus: m.cerrada ? 'CANCELLED' : 'PARTIAL',
    originalAmount: '1000000',
    adjustmentsTotal: '0',
    interestTotal: m.mora,
    paidTotal: '600000',
    balance: '400000',
  },
  adjustments: [
    { id: 'j1', adjustmentType: 'DISCOUNT', amount: '-50000', reason: 'Por pronto pago', reversedAt: null },
  ],
})

vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => m.permisos.has(permiso),
}))
vi.mock('sonner', () => ({
  toast: {
    success: (texto: string) => m.avisos.push({ tono: 'success', texto }),
    error: (texto: string) => m.avisos.push({ tono: 'error', texto }),
  },
}))
vi.mock('react-router', async () => {
  const real = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...real, useParams: () => ({ receivableId: 'a1' }) }
})
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1' }),
}))
vi.mock('@/features/contacts/hooks', () => ({
  useContact: () => ({ contact: { displayName: 'Ana Torres' } }),
}))
vi.mock('@/features/masters/hooks', () => ({
  useBillingConcepts: () => ({ items: [{ id: 'k1', name: 'Mensualidad' }] }),
}))
vi.mock('./hooks', () => ({
  useReceivable: () => ({
    detail: m.falla ? undefined : detalle(),
    isPending: false,
    isError: m.falla,
    // Un fallo sin mensaje propio: lo que se lee es el texto de la pantalla.
    error: m.falla ? { code: 'NOT_FOUND' } : null,
  }),
  useAccruals: () => ({ accruals: [] }),
  useReverseAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCancelReceivable: () => ({ mutateAsync: m.cancelar, isPending: false }),
  useWriteOffReceivable: () => ({ mutateAsync: m.castigar, isPending: false }),
}))
vi.mock('./add-adjustment-dialog', () => ({ AddAdjustmentDialog: () => null }))
vi.mock('./waive-interest-dialog', () => ({ WaiveInterestDialog: () => null }))

beforeEach(() => {
  m.cancelar.mockReset().mockResolvedValue({})
  m.castigar.mockReset().mockResolvedValue({})
  m.avisos.length = 0
  m.falla = false
  m.cerrada = false
  m.permisos = new Set(['receivables.adjust', 'receivables.manage', 'payments.create'])
  m.mora = '0'
})
afterEach(cleanup)

runAccountDetailSuite({
  Page: ReceivableDetailPage,
  noEncontrado: /No se encontró la cuenta/,
  emitida: 'Emitida',
  registrar: 'Registrar pago',
  registrarHref: '/cartera/pagos/nuevo?payer=c1',
  cancelarItem: 'Cancelar cuenta',
  cancelarTitulo: 'Cancelar cuenta por cobrar',
  cancelado: 'Cuenta cancelada',
  castigarTitulo: 'Castigar cuenta por cobrar',
  castigado: 'Cuenta castigada',
  cancelar: () => m.cancelar,
  castigar: () => m.castigar,
  avisos: () => m.avisos,
  conError: () => {
    m.falla = true
  },
  cerrada: () => {
    m.cerrada = true
  },
  soloLectura: () => {
    m.permisos = new Set()
  },
})

/*
  Lo que solo existe de este lado: a un proveedor no se le cobran intereses, así
  que mora, causaciones y ajustes no tienen espejo y se prueban aquí.
*/
test('lista los ajustes de la cuenta', () => {
  render(
    <MemoryRouter initialEntries={['/ficha']}>
      <ReceivableDetailPage />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument()
  expect(screen.getByText('Descuento')).toBeInTheDocument()
  expect(screen.getByText('Por pronto pago')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reversar ajuste' })).toBeInTheDocument()
})

test('condonar la mora solo se ofrece cuando hay mora causada', async () => {
  const { default: userEvent } = await import('@testing-library/user-event')
  const user = userEvent.setup()
  m.mora = '25000'
  render(
    <MemoryRouter initialEntries={['/ficha']}>
      <ReceivableDetailPage />
    </MemoryRouter>,
  )

  expect(screen.getByText('Interés de mora')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Más' }))
  expect(screen.getByRole('menuitem', { name: 'Condonar mora' })).toBeInTheDocument()
})
