import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { runSettlementDetailSuite } from '@/test/settlement-detail-suite'
import { PaymentDetailPage } from './payment-detail-page'

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
  payment: {
    id: 'm1',
    payerContactId: 'c1',
    purpose: 'ADVANCE',
    status: m.reversado ? 'REVERSED' : 'POSTED',
    amount: '800000',
    receivedAt: '2026-08-05',
    paymentMethodId: 'p1',
    reference: 'REF-9',
    notes: 'Con nota',
  },
  unallocated: { unallocatedAmount: m.sinCredito ? '0' : '500000' },
  allocations: m.sinAplicaciones
    ? []
    : [{ id: 'x1', receivableId: 'r1', allocatedAt: '2026-08-06', amount: '300000' }],
})

vi.mock('sonner', () => ({
  toast: {
    success: (texto: string) => m.avisos.push({ tono: 'success', texto }),
    error: (texto: string) => m.avisos.push({ tono: 'error', texto }),
  },
}))
vi.mock('react-router', async () => {
  const real = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...real, useParams: () => ({ paymentId: 'm1' }) }
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
  usePayment: () => ({
    detail: m.falla ? undefined : detalle(),
    isPending: false,
    isError: m.falla,
    // Un fallo sin mensaje propio: lo que se lee es el texto de la pantalla.
    error: m.falla ? { code: 'NOT_FOUND' } : null,
  }),
  useReversePayment: () => ({ mutateAsync: m.revertir, isPending: false }),
}))
vi.mock('./apply-advance-dialog', () => ({ ApplyAdvanceDialog: () => null }))

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
  Page: PaymentDetailPage,
  noEncontrado: /No se encontró el pago/,
  fecha: 'Recibido',
  aplicado: 'Aplicado a cuentas',
  verLink: 'Ver cuenta',
  hrefAplicacion: '/cartera/cxc/r1',
  revertirTitulo: 'Revertir pago',
  revertido: 'Pago reversado',
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
