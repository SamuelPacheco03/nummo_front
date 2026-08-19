import { expect, test } from 'vitest'
import { allowedQuickActions } from './quick-actions'
import type { Permission } from '@/features/platform/permissions'

const conceder = (...permisos: Permission[]) => (p: Permission) => permisos.includes(p)

test('cada acción se ofrece con el permiso de su endpoint, no con el de al lado', () => {
  const soloPagos = allowedQuickActions(conceder('payments.create'))

  expect(soloPagos.map((a) => a.to)).toEqual(['/cartera/pagos/nuevo'])
})

test('sin ninguno de los permisos no queda ninguna acción', () => {
  expect(allowedQuickActions(() => false)).toHaveLength(0)
})

test('registrar un egreso no depende de poder registrar un pago', () => {
  // Eran el mismo predicado (`canEditContacts`) y el contrato los separa:
  // `payments.create` no es `disbursements.create`.
  const soloEgresos = allowedQuickActions(conceder('disbursements.create'))

  expect(soloEgresos.map((a) => a.to)).toEqual(['/gastos/egresos/nuevo'])
})
