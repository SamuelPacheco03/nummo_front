import { afterEach, beforeEach, vi } from 'vitest'
import type { To } from 'react-router'
import { cleanup } from '@testing-library/react'
import { runSettlementListSuite } from '@/test/settlement-list-suite'
import { PaymentsListPage } from './payments-list-page'

/** Tal como la manda el API: la pantalla la normaliza, y eso también se prueba. */
const FILA = {
  id: 'p1',
  payerContactId: 'c1',
  payerName: 'Ana Torres',
  receivedAt: '2026-08-05',
  amount: '350000',
  status: 'POSTED',
  purpose: 'RECEIVABLE',
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
  useBillingConcepts: () => ({ items: [] }),
}))
vi.mock('./hooks', () => ({
  usePayments: (_orgId: string, params: Record<string, unknown>) => {
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
  Page: PaymentsListPage,
  titulo: 'Pagos',
  buscarPor: /pagador/i,
  registrar: 'Registrar pago',
  vacio: /Todavía no has registrado pagos/,
  entidad: 'pagos',
  detalle: '/cartera/pagos/p1',
  // Un pago que entra no lo aprueba nadie: dos estados, no cuatro (§94.0).
  estados: [
    { valor: 'POSTED', etiqueta: 'Registrado' },
    { valor: 'REVERSED', etiqueta: 'Reversado' },
  ],
  proposito: 'ADVANCE',
  propositoFila: 'Abono a cuenta',
  campoFecha: 'receivedAt',
  claveContactoApi: 'payerContactId',
  ultimosParams: () => ultimosParams,
})
