import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ReportsResultsPage } from './reports-results-page'

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { defaultCurrency: 'COP' } }),
}))

const vacio = { isPending: false, isError: false, error: null, refetch: vi.fn() }

vi.mock('./hooks', () => ({
  defaultPeriod: () => ({ from: '2026-08-01', to: '2026-08-17' }),
  useCashflow: () => ({ ...vacio, isError: true, error: new Error('Falla del servidor'), report: undefined }),
  useCashflowMonthly: () => ({ ...vacio, items: [] }),
  useAccountsReport: () => ({ ...vacio, accounts: [] }),
  useIncomeByConcept: () => ({ ...vacio, items: [] }),
  useExpensesByCategory: () => ({ ...vacio, items: [] }),
  useReceivablesSummary: () => ({ ...vacio, summary: undefined }),
  usePayablesSummary: () => ({ ...vacio, summary: undefined }),
  useReceivablesAging: () => ({ ...vacio, buckets: [] }),
  usePayablesAging: () => ({ ...vacio, buckets: [] }),
  useRecurringCommitment: () => ({
    ...vacio, monthlyIncome: 0, monthlyExpense: 0, netMonthly: 0, activeAgreements: [], activeSchedules: [],
  }),
}))

afterEach(cleanup)

test('un informe que falló no se pinta con ceros', () => {
  render(
    <MemoryRouter>
      <ReportsResultsPage />
    </MemoryRouter>,
  )

  /*
    Con el backend caído esta pantalla enseñaba «$0» en las seis cifras: no
    parecía rota, parecía un negocio sin movimiento. En una consola financiera
    eso no es un hueco de diseño, es una respuesta falsa.
  */
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el informe')
  expect(screen.queryByText(/^\$/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
})
