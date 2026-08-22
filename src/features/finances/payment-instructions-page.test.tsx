import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { PaymentInstruction } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  instrucciones: [] as PaymentInstruction[],
  crear: vi.fn(),
  actualizar: vi.fn(),
  archivar: vi.fn(),
  avisos: [] as string[],
  permisos: new Set<string>(),
}))

vi.mock('sonner', () => ({
  toast: { success: (t: string) => m.avisos.push(t), error: (t: string) => m.avisos.push(t) },
}))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: {} }),
}))
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => m.permisos.has(permiso),
  useFeature: () => true,
}))
vi.mock('./hooks', () => ({
  usePaymentInstructions: () => ({
    instructions: m.instrucciones,
    isPending: false,
    isError: false,
    error: null,
  }),
  useCreatePaymentInstruction: () => ({ mutateAsync: m.crear, isPending: false }),
  useUpdatePaymentInstruction: () => ({ mutateAsync: m.actualizar, isPending: false }),
  useArchivePaymentInstruction: () => ({ mutateAsync: m.archivar, isPending: false }),
}))

const { PaymentInstructionsPage } = await import('./payment-instructions-page')

function cuenta(over: Partial<PaymentInstruction> = {}): PaymentInstruction {
  return {
    id: 'p1',
    kind: 'BANK_ACCOUNT',
    label: null,
    details: {
      kind: 'BANK_ACCOUNT',
      bankName: 'Bancolombia',
      accountKind: 'SAVINGS',
      accountNumber: '123-456789-00',
      holderName: 'Distribuidora El Sol',
      holderDocument: null,
    },
    preview: 'Bancolombia ahorros 123-456789-00 a nombre de Distribuidora El Sol',
    showInReminders: true,
    sortOrder: 0,
    archivedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}

const pintar = () =>
  render(
    <MemoryRouter>
      <PaymentInstructionsPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.instrucciones = [cuenta()]
  m.crear = vi.fn().mockResolvedValue({})
  m.actualizar = vi.fn().mockResolvedValue({})
  m.archivar = vi.fn().mockResolvedValue({})
  m.avisos = []
  m.permisos = new Set(['payment_instructions.read', 'payment_instructions.manage'])
})
afterEach(cleanup)

test('se enseña el `preview` del backend, no uno rearmado aquí', () => {
  /*
    Es exactamente el renglón que verá el deudor. Componerlo en el front haría que
    la vista previa y el mensaje real acabaran diciendo cosas distintas de la
    misma cuenta.
  */
  pintar()
  expect(
    screen.getByText('Bancolombia ahorros 123-456789-00 a nombre de Distribuidora El Sol'),
  ).toBeInTheDocument()
})

test('vacío avisa de lo que está pasando ahora mismo en los mensajes', () => {
  m.instrucciones = []
  pintar()
  expect(screen.getByText(/comunícate con nosotros/)).toBeInTheDocument()
})

test('con todas despublicadas también avisa: guardadas no es lo mismo que publicadas', () => {
  m.instrucciones = [cuenta({ showInReminders: false })]
  pintar()
  expect(screen.getByText(/Ninguna sale en los recordatorios/)).toBeInTheDocument()
})

test('por encima de tres publicadas se dice cuáles no van a salir', () => {
  // El backend se queda con las primeras por orden y no tiene dónde avisarlo.
  m.instrucciones = [1, 2, 3, 4, 5].map((n) => cuenta({ id: `p${n}`, showInReminders: true }))
  pintar()

  expect(screen.getByText(/En el recordatorio solo caben 3/)).toBeInTheDocument()
  expect(screen.getByText(/las 2 últimas/)).toBeInTheDocument()
})

test('con tres justas no sobra el aviso', () => {
  m.instrucciones = [1, 2, 3].map((n) => cuenta({ id: `p${n}`, showInReminders: true }))
  pintar()
  expect(screen.queryByText(/solo caben 3/)).not.toBeInTheDocument()
})

test('publicar es un interruptor a la vista, no algo en un menú', async () => {
  pintar()
  await userEvent.click(screen.getByRole('checkbox', { name: /Sale en los recordatorios/ }))

  expect(m.actualizar).toHaveBeenCalledWith({
    orgId: 'o1',
    id: 'p1',
    data: { showInReminders: false },
  })
})

test('archivar avisa de que lo ya enviado no cambia', async () => {
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Archivar/ }))

  const dialogo = screen.getByRole('dialog')
  expect(within(dialogo).getByText(/Los mensajes que ya salieron no cambian/)).toBeInTheDocument()

  await userEvent.click(within(dialogo).getByRole('button', { name: 'Archivar' }))
  expect(m.archivar).toHaveBeenCalledWith({ orgId: 'o1', id: 'p1' })
})

test('sin permiso de escritura se lee y no se toca', () => {
  m.permisos = new Set(['payment_instructions.read'])
  pintar()

  expect(screen.getByText(/Bancolombia ahorros/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Añadir/ })).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: /Sale en los recordatorios/ })).toBeDisabled()
})

test('sin permiso de lectura sale el candado', () => {
  m.permisos = new Set()
  pintar()
  expect(screen.getByText('No puedes ver esto')).toBeInTheDocument()
})
