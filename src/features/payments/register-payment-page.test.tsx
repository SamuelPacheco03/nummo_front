import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { runSettlementDrawerSuite } from '@/test/settlement-drawer-suite'
import { RegisterPaymentPage } from './register-payment-page'

const m = vi.hoisted(() => ({
  registrar: vi.fn(),
  avisos: [] as { tono: string; texto: string }[],
  query: 'payer=c1',
  cuentas: [
    { receivableId: 'a1', dueDate: '2026-05-05', balance: '300000', currency: 'COP', billingConceptId: 'k1', displayStatus: 'OVERDUE' },
    { receivableId: 'a2', dueDate: '2026-06-05', balance: '400000', currency: 'COP', billingConceptId: 'k1', displayStatus: 'OVERDUE' },
    { receivableId: 'a3', dueDate: '2026-07-05', balance: '200000', currency: 'COP', billingConceptId: 'k1', displayStatus: 'PENDING' },
    // Saldada: no admite más dinero y no debe ofrecerse.
    { receivableId: 'a4', dueDate: '2026-04-05', balance: '0', currency: 'COP', billingConceptId: 'k1', displayStatus: 'PAID' },
  ],
}))

vi.mock('sonner', () => ({
  toast: {
    success: (texto: string) => m.avisos.push({ tono: 'success', texto }),
    error: (texto: string) => m.avisos.push({ tono: 'error', texto }),
  },
}))
vi.mock('react-router', async () => {
  const real = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...real, useSearchParams: () => [new URLSearchParams(m.query), vi.fn()] }
})
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1' }),
}))
/*
  El selector real es un popover con búsqueda y lo suyo se prueba aparte. Aquí
  solo hace falta poder cambiar de contacto, para comprobar que el reparto del
  anterior no se queda pegado.
*/
vi.mock('@/components/contact-picker', () => ({
  ContactPicker: ({ onChange }: { onChange: (id: string | null) => void }) => (
    <button type="button" onClick={() => onChange('c2')}>
      Cambiar contacto
    </button>
  ),
}))
vi.mock('@/features/masters/hooks', () => ({
  // Dos de cada uno: con uno solo el formulario lo preselecciona y la prueba
  // dejaría de pasar por el camino que recorre una persona.
  usePaymentMethods: () => ({
    items: [
      { id: 'pm1', name: 'Transferencia' },
      { id: 'pm2', name: 'Efectivo' },
    ],
  }),
  useFinancialAccounts: () => ({
    items: [
      { id: 'fa1', name: 'Bancolombia' },
      { id: 'fa2', name: 'Caja' },
    ],
  }),
  useBillingConcepts: () => ({ items: [{ id: 'k1', name: 'Mensualidad' }] }),
}))
vi.mock('@/features/receivables/hooks', () => ({
  useReceivables: () => ({ items: m.cuentas }),
}))
vi.mock('./hooks', () => ({
  useRegisterPayment: () => ({ mutateAsync: m.registrar, isPending: false }),
}))

beforeEach(() => {
  m.registrar.mockReset().mockResolvedValue({ data: { payment: { id: 'p1' } } })
  m.avisos.length = 0
  m.query = 'payer=c1'
})
afterEach(cleanup)

runSettlementDrawerSuite({
  Page: RegisterPaymentPage,
  pregunta: '¿Qué cuentas cubre?',
  seleccionarTodas: 'Seleccionar todas',
  quitarTodas: 'Quitar todas',
  sobrante: /a favor del pagador/,
  completo: /Se aplica completo a 2 cuentas/,
  vencida: 'Vencida',
  claveItem: 'receivableId',
  registrar: () => m.registrar,
  avisos: () => m.avisos,
  conCuentaPreseleccionada: () => {
    m.query = 'payer=c1&aplicar=a2'
  },
})
