import { afterEach, beforeEach, vi } from 'vitest'
import type { To } from 'react-router'
import { cleanup } from '@testing-library/react'
import { runAccountsListSuite } from '@/test/accounts-list-suite'
import { ReceivablesListPage } from './receivables-list-page'

const FILA = {
  receivableId: 'r1',
  payerContactId: 'c1',
  payerName: 'Ana Torres',
  billingConceptId: 'k1',
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
  useBillingConcepts: () => ({ items: [{ id: 'k1', name: 'Mensualidad' }] }),
}))
vi.mock('@/features/reports/hooks', () => ({
  useReceivablesSummary: () => ({
    summary: { totalOutstanding: '350000', overdueAmount: '350000', overdueCount: 1, pendingCount: 2, partialCount: 0 },
    isPending: false,
  }),
}))
vi.mock('./hooks', () => ({
  useReceivables: (_orgId: string, params: Record<string, unknown>) => {
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
  useGenerateReceivables: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAccrueInterest: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('./create-receivable-dialog', () => ({ CreateReceivableDialog: () => null }))

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
  Page: ReceivablesListPage,
  titulo: 'Cuentas por cobrar',
  contacto: 'Ana Torres',
  catalogo: 'Mensualidad',
  buscarPor: /pagador/i,
  vacio: /Todavía no tienes cuentas por cobrar/,
  entidad: 'cuentas por cobrar',
  detalle: '/cartera/cxc/r1',
  ultimosParams: () => ultimosParams,
  claveContacto: 'pagador',
})
