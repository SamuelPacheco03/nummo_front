import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { runApplyAdvanceSuite } from '@/test/apply-advance-suite'
import { ApplySupplierAdvanceDialog } from './apply-supplier-advance-dialog'

const m = vi.hoisted(() => ({
  aplicar: vi.fn(),
  avisos: [] as { tono: string; texto: string }[],
  vacia: false,
  gastos: [
    { expenseId: 'a1', dueDate: '2026-08-05', balance: '300000', currency: 'COP', displayStatus: 'OVERDUE' },
    { expenseId: 'a2', dueDate: '2026-09-05', balance: '400000', currency: 'COP', displayStatus: 'PENDING' },
    // Estos dos no se reparten: uno está saldado y el otro ya no debe nada.
    { expenseId: 'a3', dueDate: '2026-07-05', balance: '0', currency: 'COP', displayStatus: 'PARTIAL' },
    { expenseId: 'a4', dueDate: '2026-06-05', balance: '100000', currency: 'COP', displayStatus: 'PAID' },
  ],
}))

vi.mock('sonner', () => ({
  toast: {
    success: (texto: string) => m.avisos.push({ tono: 'success', texto }),
    error: (texto: string) => m.avisos.push({ tono: 'error', texto }),
  },
}))
vi.mock('./hooks', () => ({
  useExpenses: () => ({ items: m.vacia ? [] : m.gastos }),
  useApplyDisbursementAllocations: () => ({ mutateAsync: m.aplicar, isPending: false }),
}))

let cerrado = false

function Dialogo() {
  return (
    <ApplySupplierAdvanceDialog
      orgId="o1"
      disbursementId="m1"
      supplierId="c1"
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
  sinAsignar: /al menos un gasto/,
  vacio: /Este proveedor no tiene gastos abiertos/,
  claveItem: 'expenseId',
  aplicar: () => m.aplicar,
  avisos: () => m.avisos,
  vaciarListado: () => {
    m.vacia = true
  },
  cerrado: () => cerrado,
})
