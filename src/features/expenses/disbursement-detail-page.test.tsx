import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { runSettlementDetailSuite } from '@/test/settlement-detail-suite'
import { DisbursementDetailPage } from './disbursement-detail-page'

const m = vi.hoisted(() => ({
  revertir: vi.fn(),
  aprobar: vi.fn(),
  rechazar: vi.fn(),
  avisos: [] as { tono: string; texto: string }[],
  falla: false,
  reversado: false,
  estado: '' as string,
  sinCredito: false,
  sinAplicaciones: false,
  permisos: new Set<string>([
    'disbursements.reverse',
    'disbursements.allocate',
    'disbursements.approve',
  ]),
}))

const detalle = () => ({
  disbursement: {
    id: 'm1',
    supplierContactId: 'c1',
    purpose: 'ADVANCE',
    status: m.estado || (m.reversado ? 'REVERSED' : 'POSTED'),
    amount: '800000',
    disbursedAt: '2026-08-05',
    paymentMethodId: 'p1',
    reference: 'REF-9',
    notes: 'Con nota',
  },
  unallocated: { unallocatedAmount: m.sinCredito ? '0' : '500000' },
  allocations: m.sinAplicaciones
    ? []
    : [{ id: 'x1', expenseId: 'g1', allocatedAt: '2026-08-06', amount: '300000' }],
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
  return { ...real, useParams: () => ({ disbursementId: 'm1' }) }
})
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1' }),
}))
vi.mock('@/features/contacts/hooks', () => ({
  useContact: () => ({ contact: { displayName: 'Ana Torres' } }),
}))
vi.mock('@/features/masters/hooks', () => ({
  usePaymentMethods: () => ({ items: [{ id: 'p1', name: 'Transferencia' }] }),
}))
vi.mock('./hooks', () => ({
  useDisbursement: () => ({
    detail: m.falla ? undefined : detalle(),
    isPending: false,
    isError: m.falla,
    // Un fallo sin mensaje propio: lo que se lee es el texto de la pantalla.
    error: m.falla ? { code: 'NOT_FOUND' } : null,
  }),
  useReverseDisbursement: () => ({ mutateAsync: m.revertir, isPending: false }),
  useApproveDisbursement: () => ({ mutateAsync: m.aprobar, isPending: false }),
  useRejectDisbursement: () => ({ mutateAsync: m.rechazar, isPending: false }),
}))
vi.mock('./apply-supplier-advance-dialog', () => ({ ApplySupplierAdvanceDialog: () => null }))

beforeEach(() => {
  m.revertir.mockReset().mockResolvedValue({})
  m.aprobar.mockReset().mockResolvedValue({})
  m.rechazar.mockReset().mockResolvedValue({})
  m.avisos.length = 0
  m.falla = false
  m.reversado = false
  m.estado = ''
  m.sinCredito = false
  m.sinAplicaciones = false
  m.permisos = new Set([
    'disbursements.reverse',
    'disbursements.allocate',
    'disbursements.approve',
  ])
})
afterEach(cleanup)

runSettlementDetailSuite({
  Page: DisbursementDetailPage,
  noEncontrado: /No se encontró el egreso/,
  fecha: 'Fecha',
  aplicado: 'Aplicado a gastos',
  verLink: 'Ver gasto',
  hrefAplicacion: '/gastos/cxp/g1',
  revertirTitulo: 'Revertir egreso',
  revertido: 'Egreso reversado',
  revertir: () => m.revertir,
  avisos: () => m.avisos,
  conError: () => {
    m.falla = true
  },
  conReverso: () => {
    m.reversado = true
  },
  sinCredito: () => {
    m.sinCredito = true
  },
  sinAplicaciones: () => {
    m.sinAplicaciones = true
  },
  soloLectura: () => {
    m.permisos = new Set()
  },
})

/*
  Lo que las aprobaciones por umbral traen a esta cara y no a la de pagos: por
  encima del umbral no se mueve un peso hasta que alguien firma, así que un
  egreso puede existir sin haber movido nada.
*/
test('un egreso que espera aprobación no ofrece revertir ni repartir', () => {
  m.estado = 'PENDING_APPROVAL'
  render(
    <MemoryRouter initialEntries={['/ficha']}>
      <DisbursementDetailPage />
    </MemoryRouter>,
  )

  expect(screen.getByText('Espera aprobación')).toBeInTheDocument()
  // No hay movimiento que deshacer ni crédito que asignar: todavía no salió nada.
  expect(screen.queryByRole('button', { name: 'Revertir' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /aplicar anticipo/i })).not.toBeInTheDocument()
  // Y no va tachado: esperar no es lo mismo que estar anulado.
  expect(screen.getByText('$800.000,00')).not.toHaveClass('line-through')
})

test('un egreso que espera firma se aprueba o se rechaza desde su ficha', async () => {
  m.estado = 'PENDING_APPROVAL'
  render(
    <MemoryRouter initialEntries={['/ficha']}>
      <DisbursementDetailPage />
    </MemoryRouter>,
  )

  await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
  expect(m.aprobar).toHaveBeenCalledWith({ orgId: 'o1', id: 'm1' })
  expect(m.avisos.at(-1)?.texto).toBe('Egreso aprobado')
})

test('rechazar sin motivo no se manda: el motivo se guarda y no se borra', async () => {
  m.estado = 'PENDING_APPROVAL'
  render(
    <MemoryRouter initialEntries={['/ficha']}>
      <DisbursementDetailPage />
    </MemoryRouter>,
  )

  await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
  await userEvent.click(screen.getByRole('button', { name: 'Rechazar', hidden: false }))
  expect(m.rechazar).not.toHaveBeenCalled()

  await userEvent.type(screen.getByLabelText(/Motivo/), 'Falta la factura')
  await userEvent.click(screen.getAllByRole('button', { name: 'Rechazar' }).at(-1)!)
  expect(m.rechazar).toHaveBeenCalledWith({
    orgId: 'o1',
    id: 'm1',
    data: { reason: 'Falta la factura' },
  })
})

test('sin permiso de aprobar no se ofrece decidir', () => {
  m.estado = 'PENDING_APPROVAL'
  m.permisos = new Set(['disbursements.reverse'])
  render(
    <MemoryRouter initialEntries={['/ficha']}>
      <DisbursementDetailPage />
    </MemoryRouter>,
  )

  expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument()
  expect(screen.getByText(/Espera aprobación: no ha salido dinero/)).toBeInTheDocument()
})

test('un egreso rechazado se tacha, como el reversado', () => {
  m.estado = 'REJECTED'
  render(
    <MemoryRouter initialEntries={['/ficha']}>
      <DisbursementDetailPage />
    </MemoryRouter>,
  )

  expect(screen.getByText('Rechazado')).toBeInTheDocument()
  expect(screen.getByText('$800.000,00')).toHaveClass('line-through')
  expect(screen.queryByRole('button', { name: 'Revertir' })).not.toBeInTheDocument()
})
