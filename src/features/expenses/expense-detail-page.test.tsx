import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { runAccountDetailSuite } from '@/test/account-detail-suite'
import { ExpenseDetailPage } from './expense-detail-page'

const m = vi.hoisted(() => ({
  cancelar: vi.fn(),
  castigar: vi.fn(),
  avisos: [] as { tono: string; texto: string }[],
  falla: false,
  cerrada: false,
  rol: 'OWNER',
}))

const detalle = () => ({
  expense: {
    id: 'a1',
    supplierContactId: 'c1',
    expenseCategoryId: 'k1',
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
    paidTotal: '600000',
    balance: '400000',
  },
})

vi.mock('sonner', () => ({
  toast: {
    success: (texto: string) => m.avisos.push({ tono: 'success', texto }),
    error: (texto: string) => m.avisos.push({ tono: 'error', texto }),
  },
}))
vi.mock('react-router', async () => {
  const real = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...real, useParams: () => ({ expenseId: 'a1' }) }
})
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', role: m.rol }),
}))
vi.mock('@/features/contacts/hooks', () => ({
  useContact: () => ({ contact: { displayName: 'Ana Torres' } }),
}))
vi.mock('@/features/masters/hooks', () => ({
  useExpenseCategories: () => ({ items: [{ id: 'k1', name: 'Mensualidad' }] }),
}))
vi.mock('./hooks', () => ({
  useExpense: () => ({
    detail: m.falla ? undefined : detalle(),
    isPending: false,
    isError: m.falla,
    // Un fallo sin mensaje propio: lo que se lee es el texto de la pantalla.
    error: m.falla ? { code: 'NOT_FOUND' } : null,
  }),
  useCancelExpense: () => ({ mutateAsync: m.cancelar, isPending: false }),
  useWriteOffExpense: () => ({ mutateAsync: m.castigar, isPending: false }),
}))

beforeEach(() => {
  m.cancelar.mockReset().mockResolvedValue({})
  m.castigar.mockReset().mockResolvedValue({})
  m.avisos.length = 0
  m.falla = false
  m.cerrada = false
  m.rol = 'OWNER'
})
afterEach(cleanup)

runAccountDetailSuite({
  Page: ExpenseDetailPage,
  noEncontrado: /No se encontró el gasto/,
  emitida: 'Emitido',
  registrar: 'Registrar egreso',
  registrarHref: '/gastos/egresos/nuevo?supplier=c1',
  cancelarItem: 'Cancelar gasto',
  cancelarTitulo: 'Cancelar gasto',
  cancelado: 'Gasto cancelado',
  castigarTitulo: 'Castigar gasto',
  castigado: 'Gasto castigado',
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
    m.rol = 'VIEWER'
  },
})
