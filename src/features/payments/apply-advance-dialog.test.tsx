import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { runApplyAdvanceSuite } from '@/test/apply-advance-suite'
import { ApplyAdvanceDialog } from './apply-advance-dialog'

const m = vi.hoisted(() => ({
  aplicar: vi.fn(),
  avisos: [] as { tono: string; texto: string }[],
  vacia: false,
  cuentas: [
    { receivableId: 'a1', dueDate: '2026-08-05', balance: '300000', currency: 'COP', displayStatus: 'OVERDUE' },
    { receivableId: 'a2', dueDate: '2026-09-05', balance: '400000', currency: 'COP', displayStatus: 'PENDING' },
    // Estas dos no se reparten: una está saldada y la otra ya no debe nada.
    { receivableId: 'a3', dueDate: '2026-07-05', balance: '0', currency: 'COP', displayStatus: 'PARTIAL' },
    { receivableId: 'a4', dueDate: '2026-06-05', balance: '100000', currency: 'COP', displayStatus: 'PAID' },
  ],
}))

vi.mock('sonner', () => ({
  toast: {
    success: (texto: string) => m.avisos.push({ tono: 'success', texto }),
    error: (texto: string) => m.avisos.push({ tono: 'error', texto }),
  },
}))
vi.mock('@/features/receivables/hooks', () => ({
  useReceivables: () => ({ items: m.vacia ? [] : m.cuentas }),
}))
vi.mock('./hooks', () => ({
  useApplyAllocations: () => ({ mutateAsync: m.aplicar, isPending: false }),
}))

let cerrado = false

function Dialogo() {
  return (
    <ApplyAdvanceDialog
      orgId="o1"
      paymentId="m1"
      payerId="c1"
      available="500000"
      open
      onOpenChange={(open) => {
        if (!open) cerrado = true
      }}
    />
  )
}

beforeEach(() => {
  m.aplicar.mockReset().mockResolvedValue({})
  m.avisos.length = 0
  m.vacia = false
  cerrado = false
})
afterEach(cleanup)

runApplyAdvanceSuite({
  Dialog: Dialogo,
  sinAsignar: /al menos una cuenta/,
  vacio: /Este pagador no tiene cuentas abiertas/,
  claveItem: 'receivableId',
  aplicar: () => m.aplicar,
  avisos: () => m.avisos,
  vaciarListado: () => {
    m.vacia = true
  },
  cerrado: () => cerrado,
})
