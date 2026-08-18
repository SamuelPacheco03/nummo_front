import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AgreementFormPage } from './agreement-form-page'

let rol = 'VIEWER'

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { defaultCurrency: 'COP' }, role: rol }),
}))
vi.mock('@/features/masters/hooks', () => ({ useBillingConcepts: () => ({ items: [] }) }))
vi.mock('@/features/config/hooks', () => ({ useBranches: () => ({ branches: [] }) }))
vi.mock('./hooks', () => ({
  useAgreement: () => ({ agreement: undefined, isPending: false }),
  useCreateAgreement: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateAgreement: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useInterestPolicies: () => ({ items: [] }),
}))

// El formulario de verdad monta el selector de contactos, que consulta al API.
const pintar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AgreementFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

afterEach(cleanup)

/*
  Un formulario que se abre para quien no puede guardarlo es una promesa falsa:
  se rellena entero y el 403 llega al final. Los permisos son un estado de
  pantalla (§45), no una sorpresa al enviar.
*/
test('un lector no recibe el formulario de acuerdo', () => {
  rol = 'VIEWER'
  pintar()
  expect(screen.getByText('No puedes gestionar acuerdos')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /crear acuerdo/i })).not.toBeInTheDocument()
})

test('un operador tampoco: los acuerdos son de quien lleva la cartera', () => {
  rol = 'OPERATOR'
  pintar()
  expect(screen.getByText('No puedes gestionar acuerdos')).toBeInTheDocument()
})

test('el contador sí lo recibe', async () => {
  rol = 'ACCOUNTANT'
  pintar()
  expect(await screen.findByRole('button', { name: /crear acuerdo/i })).toBeInTheDocument()
  expect(screen.queryByText('No puedes gestionar acuerdos')).not.toBeInTheDocument()
})
