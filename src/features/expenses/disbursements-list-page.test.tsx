import { afterEach, beforeEach, vi } from 'vitest'
import type { To } from 'react-router'
import { cleanup } from '@testing-library/react'
import { runSettlementListSuite } from '@/test/settlement-list-suite'
import { DisbursementsListPage } from './disbursements-list-page'

/** Tal como la manda el API: la pantalla la normaliza, y eso también se prueba. */
const FILA = {
  id: 'd1',
  supplierContactId: 'c1',
  supplierName: 'Ana Torres',
  disbursedAt: '2026-08-05',
  amount: '350000',
  status: 'POSTED',
  purpose: 'EXPENSE',
}

let ultimosParams: Record<string, unknown> | undefined

// Los permisos tienen su propia prueba: aquí se conceden todos para mirar la
// pantalla, que es lo que este archivo comprueba.
vi.mock('@/features/platform/permissions', () => ({ useCan: () => () => true }))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { defaultCurrency: 'COP' } }),
}))
// Las cifras de cabecera son de `/reports/cashflow` y tienen su propia pantalla:
// aquí solo hace falta que no pidan datos de verdad.
vi.mock('@/features/reports/hooks', () => ({
  defaultPeriod: () => ({ from: '2026-08-01', to: '2026-08-31' }),
  useCashflow: () => ({ report: undefined, isPending: false }),
}))
// El catálogo se cruza contra el id que trae la fila, para su icono: aquí basta
// con que exista y no salga a la red.
vi.mock('@/features/masters/hooks', () => ({
  useExpenseCategories: () => ({ items: [] }),
}))
vi.mock('./hooks', () => ({
  useDisbursements: (_orgId: string, params: Record<string, unknown>) => {
    ultimosParams = params
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
}))

vi.mock('react-router', async () => {
  const real = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...real,
    useNavigate: () => (to: To) => {
      window.__ultimaRuta = to
    },
  }
})

beforeEach(() => {
  ultimosParams = undefined
  window.__ultimaRuta = undefined
  window.__listaVacia = false
  window.__listaFalla = false
})
afterEach(cleanup)

runSettlementListSuite({
  Page: DisbursementsListPage,
  titulo: 'Egresos',
  buscarPor: /proveedor/i,
  registrar: 'Registrar egreso',
  vacio: /Todavía no has registrado egresos/,
  entidad: 'egresos',
  detalle: '/gastos/egresos/d1',
  // Con las aprobaciones por umbral, un egreso puede esperar firma o ser
  // rechazado: cuatro estados, no dos (§94.0, §47.4).
  estados: [
    { valor: 'PENDING_APPROVAL', etiqueta: 'Espera aprobación' },
    { valor: 'POSTED', etiqueta: 'Registrado' },
    { valor: 'REJECTED', etiqueta: 'Rechazado' },
    { valor: 'REVERSED', etiqueta: 'Reversado' },
  ],
  proposito: 'ADVANCE',
  propositoFila: 'Pago de gasto',
  campoFecha: 'disbursedAt',
  claveContactoApi: 'supplierContactId',
  ultimosParams: () => ultimosParams,
})
