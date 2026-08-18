import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { runSettlementDetailSuite } from '@/test/settlement-detail-suite'
import { DisbursementDetailPage } from './disbursement-detail-page'

const m = vi.hoisted(() => ({
  revertir: vi.fn(),
  avisos: [] as { tono: string; texto: string }[],
  falla: false,
  reversado: false,
  sinCredito: false,
  sinAplicaciones: false,
  rol: 'OWNER',
}))

const detalle = () => ({
  disbursement: {
    id: 'm1',
    supplierContactId: 'c1',
    purpose: 'ADVANCE',
    status: m.reversado ? 'REVERSED' : 'POSTED',
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
  useCurrentOrg: () => ({ orgId: 'o1', role: m.rol }),
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
}))
vi.mock('./apply-supplier-advance-dialog', () => ({ ApplySupplierAdvanceDialog: () => null }))

beforeEach(() => {
  m.revertir.mockReset().mockResolvedValue({})
  m.avisos.length = 0
  m.falla = false
  m.reversado = false
  m.sinCredito = false
  m.sinAplicaciones = false
  m.rol = 'OWNER'
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
    m.rol = 'VIEWER'
  },
})
