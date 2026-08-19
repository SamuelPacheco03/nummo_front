import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AgreementFormPage } from './agreement-form-page'

let puedeGestionar = false

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { defaultCurrency: 'COP' } }),
}))
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => permiso === 'agreements.manage' && puedeGestionar,
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
test('sin el permiso de acuerdos no se recibe el formulario', () => {
  puedeGestionar = false
  pintar()
  expect(screen.getByText('No puedes gestionar acuerdos')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /crear acuerdo/i })).not.toBeInTheDocument()
})

test('con `agreements.manage` sí lo recibe', async () => {
  puedeGestionar = true
  pintar()
  expect(await screen.findByRole('button', { name: /crear acuerdo/i })).toBeInTheDocument()
  expect(screen.queryByText('No puedes gestionar acuerdos')).not.toBeInTheDocument()
})
