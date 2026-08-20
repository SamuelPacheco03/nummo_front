import { afterEach, beforeEach, vi } from 'vitest'
import type { To } from 'react-router'
import { cleanup } from '@testing-library/react'
import { runAccountsListSuite } from '@/test/accounts-list-suite'
import { ExpensesListPage } from './expenses-list-page'

const FILA = {
  expenseId: 'e1',
  supplierContactId: 'c1',
  supplierName: 'Ana Torres',
  expenseCategoryId: 'g1',
  dueDate: '2026-08-05',
  originalAmount: '350000',
  balance: '350000',
  paidTotal: '0',
  currency: 'COP',
  displayStatus: 'OVERDUE',
}

let ultimosParams: Record<string, unknown> | undefined

// Los permisos tienen su propia prueba: aquí se conceden todos para mirar
// la pantalla, que es lo que este archivo comprueba.
vi.mock('@/features/platform/permissions', () => ({ useCan: () => () => true }))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { defaultCurrency: 'COP' } }),
}))
vi.mock('@/features/masters/hooks', () => ({
  useExpenseCategories: () => ({ items: [{ id: 'g1', name: 'Mensualidad' }] }),
}))
vi.mock('@/features/reports/hooks', () => ({
  usePayablesSummary: () => ({
    summary: { totalOutstanding: '350000', overdueAmount: '350000', overdueCount: 1 },
    isPending: false,
  }),
}))
vi.mock('./hooks', () => ({
  useExpenses: (_orgId: string, params: Record<string, unknown>) => {
    // La pantalla pide además una página de un elemento por cada ficha, solo
    // para contar (§21.2). Lo que se comprueba aquí es el listado que se ve.
    if (Number(params.pageSize) > 1) ultimosParams = params
    const vacia = window.__listaVacia || window.__listaFalla
    return {
      items: vacia ? [] : [FILA],
      total: vacia ? 0 : 1,
      totalPages: 1,
      isPending: false,
      isError: Boolean(window.__listaFalla),
      error: window.__listaFalla ? new Error('Falla del servidor') : null,
      isFetching: false,
    }
  },
  useGenerateExpenses: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('./create-expense-dialog', () => ({ CreateExpenseDialog: () => null }))

vi.mock('react-router', async () => {
  const real = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...real, useNavigate: () => (to: To) => { window.__ultimaRuta = to } }
})

beforeEach(() => {
  ultimosParams = undefined
  window.__ultimaRuta = undefined
  window.__listaVacia = false
  window.__listaFalla = false
})
afterEach(cleanup)

runAccountsListSuite({
  Page: ExpensesListPage,
  titulo: 'Cuentas por pagar',
  contacto: 'Ana Torres',
  catalogo: 'Mensualidad',
  buscarPor: /proveedor/i,
  vacio: /Todavía no tienes cuentas por pagar/,
  entidad: 'cuentas por pagar',
  detalle: '/gastos/cxp/e1',
  ultimosParams: () => ultimosParams,
  claveContacto: 'proveedor',
})
